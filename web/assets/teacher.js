// ---------------------------------------------------------------------------
// Teacher dashboard.
//
// The question a teacher actually has is not "how much practice has this
// student done" - it is "what should I do with them on Thursday". So the
// roster leads with the gap to target and the single weakest skill, and the
// student page leads with a ranked list of what to work on, computed by the
// same engine the student's own app uses.
//
// Read-only by design. Row-level security allows a teacher to read their
// roster's rows but not write practice on their behalf, so there is nothing
// here that could fake a student's history.
// ---------------------------------------------------------------------------

import { makeStore, configured } from './store.js';
import { scoreItem, bandWeights, TIERS } from './engine.js';
import { focusTier, rankLessons } from './lessons.js';
import { escapeHtml as esc, renderText as md } from './mathfmt.js';
import { columnChart, chartTable, mountCharts, byDay, byWeek, streak } from './charts.js';
import { PREVIEW_KEY } from './store.js';
import { plannerState, plannerHealthy, sendToPlanner, renderPlan, STARTERS }
  from './planner.js';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const store = makeStore();

const state = { me: null, roster: [], student: null, detail: null,
                bands: null, skills: {}, lessons: [] };

const pct = (n) => `${Math.round(n * 100)}%`;
const total = (p) => (p?.current_rw ?? 0) + (p?.current_math ?? 0);
const targetTotal = (p) => (p?.target_rw ?? 0) + (p?.target_math ?? 0);

/** Relative time, in both directions: review dates are in the future. */
function when(iso) {
  if (!iso) return 'never';
  const ms = new Date(iso) - Date.now();
  const days = Math.round(Math.abs(ms) / 864e5);
  if (days === 0) return ms > 0 ? 'today' : 'today';
  if (ms > 0) return days === 1 ? 'tomorrow' : `in ${days} days`;
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

// ---------------------------------------------------------------------------

/** Per-skill, per-tier accuracy for one student, from their mastery rows. */
function skillTable(mastery) {
  const rows = [];
  for (const [key, cell] of Object.entries(mastery)) {
    const [skill_cd, tier] = key.split('|');
    if (!cell.seen) continue;
    rows.push({ skill_cd, tier, seen: cell.seen, correct: cell.correct,
                accuracy: cell.correct / cell.seen, box: cell.box, due_at: cell.due_at });
  }
  return rows.sort((a, b) => a.accuracy - b.accuracy);
}

function ctxFor(student, mastery, fingerprints) {
  return { bands: state.bands, skills: state.skills, mastery,
           student, fingerprints, now: new Date() };
}

// ---------------------------------------------------------------------------

function screenSignIn(message = '') {
  app.innerHTML = `<div class="center"><div class="card">
    <h1>Teacher</h1>
    <p class="muted small">Sign in to see your students' progress.</p>
    ${!configured() ? `<div class="banner">No backend is configured, so there is
      no roster to show. Add your Supabase keys to <code>assets/config.js</code>
      and run <code>supabase/schema.sql</code>.</div>` : ''}
    ${message ? `<div class="banner">${esc(message)}</div>` : ''}
    <div class="field"><label for="em">Email</label>
      <input id="em" type="email" autocomplete="email"></div>
    <div class="field"><label for="pw">Password</label>
      <input id="pw" type="password" autocomplete="current-password"></div>
    <div class="row" style="margin-top:14px">
      <button class="btn-primary grow" id="in">Sign in</button></div>
    <p class="err" id="err" hidden></p>
  </div></div>`;

  $('#in').onclick = async () => {
    try { await store.signIn($('#em').value.trim(), $('#pw').value); await boot(); }
    catch (e) { const x = $('#err'); x.textContent = e.message; x.hidden = false; }
  };
}

function screenRoster() {
  const rows = state.roster;
  app.innerHTML = `<div class="wrap">
    <div class="top">
      <div><h1>Your students</h1>
        <p class="who">${esc(state.me.full_name ?? state.me.email ?? '')}</p></div>
      <div class="row tight">
        <button class="btn-sm" id="refresh">Refresh</button>
        <button class="btn-sm" id="out">Sign out</button></div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab on" id="tab-roster" role="tab" aria-selected="true">Students</button>
      <button class="tab" id="tab-plan" role="tab" aria-selected="false">Plan a lesson</button>
      <button class="tab" id="tab-agents" role="tab" aria-selected="false">Agents${
        agentAlertCount() ? ` <span class="pill">${agentAlertCount()}</span>` : ''}</button>
    </div>

    ${rows.length ? `<div class="card">
      <table>
        <thead><tr>
          <th>Student</th><th class="num">Now</th><th class="num">Goal</th>
          <th class="num">Gap</th><th class="num">Answered</th>
          <th class="num">Accuracy</th><th>Assigned</th><th>Weakest</th><th>Last seen</th>
        </tr></thead>
        <tbody>${rows.map((r) => {
          const gap = targetTotal(r.profile) - total(r.profile);
          const weak = r.weakest;
          return `<tr data-student="${esc(r.profile.id)}" style="cursor:pointer">
            <td><strong>${esc(r.profile.full_name ?? r.profile.email ?? 'Student')}</strong></td>
            <td class="num">${total(r.profile) || '&mdash;'}</td>
            <td class="num">${targetTotal(r.profile) || '&mdash;'}</td>
            <td class="num">${gap > 0 ? `+${gap}` : '&mdash;'}</td>
            <td class="num">${r.answered}</td>
            <td class="num">${r.answered ? pct(r.accuracy) : '&mdash;'}</td>
            <td>${assignedCell(r.assigned)}</td>
            <td>${weak ? `${esc(state.skills[weak.skill_cd]?.skill_name ?? weak.skill_cd)}
                 <span class="badge ${weak.tier.toLowerCase()}">${weak.tier}</span>
                 ${pct(weak.accuracy)}` : '<span class="muted">&mdash;</span>'}</td>
            <td class="muted small">${esc(when(r.lastSeen))}</td>
          </tr>`; }).join('')}</tbody>
      </table>
    </div>` : `<div class="card empty">
      <p>No students on your roster yet.</p>
      <p class="small">Add rows to the <code>roster</code> table linking your
        teacher id to each student id.</p></div>`}
  </div>`;

  $('#out').onclick = async () => { await store.signOut(); location.reload(); };
  $('#refresh').onclick = boot;
  $('#tab-plan').onclick = () => screenPlanner();
  $('#tab-agents').onclick = () => screenAgents();
  for (const tr of document.querySelectorAll('[data-student]')) {
    tr.onclick = () => openStudent(tr.dataset.student);
  }
}

/** How much of what a teacher set has actually been done. */
function assignedCell(list) {
  const all = list ?? [];
  if (!all.length) return '<span class="muted">&mdash;</span>';
  const done = all.filter((a) => a.completed_at).length;
  const cls = done === all.length ? 'e' : done ? 'm' : 'on';
  return `<span class="badge ${cls}">${done}/${all.length} done</span>`;
}

function screenStudent() {
  const { profile, mastery, attempts, fingerprints } = state.detail;
  const ctx = ctxFor(profile, mastery, fingerprints);
  const rows = skillTable(mastery);
  const answered = attempts.length;
  const right = attempts.filter((a) => a.correct).length;

  const ranked = rankLessons(
    state.lessons.filter((l) => l.skill_cd && state.skills[l.skill_cd]), ctx, scoreItem
  ).slice(0, 6);

  const mathW = bandWeights(state.bands, 'math', profile.target_math ?? 600);
  const rwW = bandWeights(state.bands, 'rw', profile.target_rw ?? 600);
  const plan = (w) => TIERS.filter((t) => (w[t] ?? 0) > 0.02).join(' + ') || 'E';

  const days = byDay(attempts, 30);
  const weeks = byWeek(attempts, 8);
  const activeDays = days.filter((d) => d.value > 0).length;
  const last7 = days.slice(-7).reduce((n, d) => n + d.value, 0);
  const prev7 = days.slice(-14, -7).reduce((n, d) => n + d.value, 0);
  const trend = prev7 ? Math.round((last7 - prev7) / prev7 * 100) : null;
  const run = streak(attempts);

  app.innerHTML = `<div class="wrap wide">
    <div class="row" style="margin-bottom:14px">
      <button class="btn-sm" id="back">&larr; All students</button></div>
    <h1>${esc(profile.full_name ?? profile.email ?? 'Student')}</h1>

    <div class="tabs" role="tablist">
      <button class="tab on" id="tab-progress" role="tab" aria-selected="true">Progress</button>
      <button class="tab" id="tab-view" role="tab" aria-selected="false">Student view</button>
    </div>

    <div class="card">
      <div class="scores">
        <div class="score"><div class="l">Reading &amp; Writing</div>
          <div class="n">${profile.current_rw ?? '—'}</div>
          <div class="g">goal ${profile.target_rw ?? '—'}</div></div>
        <div class="score"><div class="l">Math</div>
          <div class="n">${profile.current_math ?? '—'}</div>
          <div class="g">goal ${profile.target_math ?? '—'}</div></div>
        <div class="score"><div class="l">Answered</div>
          <div class="n">${answered}</div>
          <div class="g">${answered ? pct(right / answered) + ' correct' : 'no practice yet'}</div></div>
      </div>
      <p class="small muted" style="margin:14px 0 0">
        Their plan: <strong>${esc(plan(rwW))}</strong> in Reading &amp; Writing,
        <strong>${esc(plan(mathW))}</strong> in Math.
        ${(mathW.H ?? 0) <= 0.02
          ? 'The Hard math tier is not required at their target, so the app does not serve it.'
          : `They need about ${pct(mathW.H)} of the Hard math tier.`}</p>
    </div>

    ${(state.detail.assigned ?? []).length ? `<h2>What you assigned</h2>
    <div class="card">
      <table><thead><tr>
        <th>Assignment</th><th>Focus</th><th class="num">Questions</th>
        <th>Set</th><th>Status</th>
      </tr></thead><tbody>${state.detail.assigned.map((a) => {
        const f = a.filter ?? {};
        const subs = (f.subtypes ?? []).map((sl) =>
          state.subtypeNames?.[sl] ?? sl).join(', ');
        return `<tr>
          <td><strong>${esc(a.title ?? 'Assigned practice')}</strong>
            ${f.notes ? `<div class="tiny muted">${esc(f.notes.slice(0, 110))}</div>` : ''}</td>
          <td class="small">${esc(subs || '&mdash;')}
            ${f.difficulty ? `<span class="badge ${f.difficulty.toLowerCase()}">${esc(f.difficulty)}</span>` : ''}</td>
          <td class="num">${(f.item_ids ?? []).length || '&mdash;'}</td>
          <td class="small muted">${esc(when(a.created_at))}</td>
          <td>${a.completed_at
            ? `<span class="badge e">Done ${esc(when(a.completed_at))}</span>`
            : '<span class="badge on">Not started</span>'}</td>
        </tr>`; }).join('')}</tbody></table>
    </div>` : ''}

    <h2>Practice by day</h2>
    <div class="card">
      <div class="kpis">
        <div class="kpi"><div class="kpi-n">${last7}</div>
          <div class="kpi-l">questions this week</div>
          ${trend === null ? '' : `<div class="kpi-d ${trend >= 0 ? 'up' : 'down'}">
            ${trend >= 0 ? '+' : ''}${trend}% vs last week</div>`}</div>
        <div class="kpi"><div class="kpi-n">${activeDays}</div>
          <div class="kpi-l">days practiced of the last 30</div></div>
        <div class="kpi"><div class="kpi-n">${run}</div>
          <div class="kpi-l">day streak</div></div>
      </div>
      ${columnChart(days, { id: 'days', title: 'Questions answered per day, last 30 days' })}
      ${chartTable(days.filter((d) => d.value > 0).reverse(), {
        caption: 'Show the daily numbers',
        columns: [
          { label: 'Day', get: (r) => r.label },
          { label: 'Answered', num: true, get: (r) => r.value },
          { label: 'Correct', num: true, get: (r) => r.correct },
          { label: 'Accuracy', num: true, get: (r) => r.accuracy === null ? '—' : pct(r.accuracy) },
        ] })}
    </div>

    <h2>By week</h2>
    <div class="card">
      ${columnChart(weeks, { id: 'weeks', title: 'Questions answered per week, last 8 weeks' })}
      <table style="margin-top:14px"><thead><tr>
        <th>Week</th><th class="num">Answered</th><th class="num">Accuracy</th>
        <th class="num">Days active</th><th>Consistency</th>
      </tr></thead><tbody>${weeks.slice().reverse().map((w) => `<tr>
        <td>${esc(w.range)}</td>
        <td class="num">${w.value || '—'}</td>
        <td class="num">${w.accuracy === null ? '—' : pct(w.accuracy)}</td>
        <td class="num">${w.activeDays || '—'}</td>
        <td><div class="bar thin ${w.activeDays >= 4 ? 'good' : ''}" style="margin:0">
          <i style="width:${Math.round(w.activeDays / 7 * 100)}%"></i></div></td>
      </tr>`).join('')}</tbody></table>
    </div>

    <h2>What to work on next</h2>
    <div class="card">
      <p class="small muted">Ranked by the same engine the student's app uses:
        how likely they are to miss it, how often it appears, and whether their
        target requires that tier.</p>
      ${ranked.length ? `<table><thead><tr>
        <th>Skill</th><th>Focus</th><th class="num">Their accuracy</th><th class="num">Value</th>
      </tr></thead><tbody>${ranked.map(({ lesson, value }) => {
        const tier = focusTier(lesson, ctx);
        const cell = mastery[`${lesson.skill_cd}|${tier}`];
        const acc = cell?.seen ? cell.correct / cell.seen : null;
        return `<tr>
          <td>${esc(lesson.title)}</td>
          <td><span class="badge ${tier.toLowerCase()}">${tier}</span></td>
          <td class="num">${acc === null ? '<span class="muted">not started</span>' : pct(acc)}</td>
          <td class="num muted">${value.toFixed(4)}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="muted small">Nothing to rank yet.</p>'}
    </div>

    <h2>Skill by skill</h2>
    <div class="card">
      ${rows.length ? `<table><thead><tr>
        <th>Skill</th><th>Tier</th><th class="num">Seen</th>
        <th class="num">Accuracy</th><th>Progress</th><th>Next review</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${esc(state.skills[r.skill_cd]?.skill_name ?? r.skill_cd)}</td>
        <td><span class="badge ${r.tier.toLowerCase()}">${r.tier}</span></td>
        <td class="num">${r.seen}</td>
        <td class="num">${pct(r.accuracy)}</td>
        <td><div class="bar thin ${r.accuracy >= 0.85 ? 'good' : ''}" style="margin:0">
          <i style="width:${Math.round(r.accuracy * 100)}%"></i></div></td>
        <td class="muted small">${new Date(r.due_at) <= Date.now()
          ? '<strong>due now</strong>' : esc(when(r.due_at))}</td>
      </tr>`).join('')}</tbody></table>`
      : '<p class="muted small">No practice recorded yet.</p>'}
    </div>

    ${fingerprints.length ? `<h2>From their practice tests</h2>
    <div class="card">
      <p class="small muted">Skills they missed on a Bluebook test. The question
        text is never stored &mdash; only which skill, at what difficulty.</p>
      <table><thead><tr><th>Test</th><th>Skill</th><th>Tier</th><th>Pattern</th></tr></thead>
      <tbody>${fingerprints.slice(0, 25).map((f) => `<tr>
        <td class="small">${esc(f.test_label ?? '')}</td>
        <td>${esc(state.skills[f.skill_cd]?.skill_name ?? f.skill_cd)}</td>
        <td><span class="badge ${(f.difficulty ?? 'm').toLowerCase()}">${esc(f.difficulty ?? '')}</span></td>
        <td class="small muted">${esc(f.misconception ?? '')}</td>
      </tr>`).join('')}</tbody></table>
    </div>` : ''}
  </div>`;

  $('#back').onclick = () => { state.detail = null; screenRoster(); };
  $('#tab-view').onclick = () => screenStudentView();
  mountCharts(app);
  window.scrollTo(0, 0);
}

/**
 * Show what this student sees, by loading the actual student app in an iframe.
 *
 * Deliberately not a re-implementation. A second rendering of the lesson list
 * would drift from the real one the first time either changed, and then the
 * teacher would be looking at something no student sees. The iframe runs the
 * same code with a PreviewStore, whose writes go nowhere.
 */
function screenStudentView() {
  const { profile, mastery, attempts, fingerprints } = state.detail;

  // Same-origin sessionStorage hands the seed to the iframe. It is this
  // student's own data, which the teacher is already authorised to read.
  sessionStorage.setItem(PREVIEW_KEY, JSON.stringify({
    profile, mastery, attempts, fingerprints,
  }));

  app.innerHTML = `<div class="wrap wide">
    <div class="row" style="margin-bottom:14px">
      <button class="btn-sm" id="back">&larr; All students</button></div>
    <h1>${esc(profile.full_name ?? profile.email ?? 'Student')}</h1>

    <div class="tabs" role="tablist">
      <button class="tab" id="tab-progress" role="tab" aria-selected="false">Progress</button>
      <button class="tab on" id="tab-view" role="tab" aria-selected="true">Student view</button>
    </div>

    <div class="banner">This is their app exactly as they see it, seeded with
      their real scores and progress. You can click through lessons and answer
      practice questions &mdash; <strong>nothing is saved</strong> and their own
      progress is untouched.</div>

    <div class="card flat viewport">
      <iframe id="studentview" title="Student view"
              src="index.html?preview=1"
              referrerpolicy="no-referrer"></iframe>
    </div>

    <p class="tiny muted">Their target drives what appears here. Change it on the
      Progress tab and this view changes with it.</p>
  </div>`;

  $('#back').onclick = () => { state.detail = null; screenRoster(); };
  $('#tab-progress').onclick = () => screenStudent();
  window.scrollTo(0, 0);
}

/** How many runs are currently flagged - drives the badge on the tab. */
function agentAlertCount() {
  return (state.agentFeed?.runs ?? []).filter((r) => r.alerts?.length).length;
}

const AGENT_KIND = {
  author: 'Writing items', verify: 'Checking items',
  adjudicate: 'Settling disagreements', classify: 'Classifying',
};

/**
 * Agent runs, newest first, with anything flagged pulled to the top.
 *
 * These agents fail quietly: a stale allowlist rejects everything, a call
 * errors with an empty message and 219 untested items get filed as quality
 * failures. Every one of those happened here and was found by accident. This
 * is where they surface instead.
 */
function screenAgents() {
  const feed = state.agentFeed ?? { runs: [], summary: {} };
  const flagged = feed.runs.filter((r) => r.alerts?.length);
  const clean = feed.runs.filter((r) => !r.alerts?.length);

  const card = (r) => {
    const label = (k) => k.replace(/_/g, ' ').replace(/\s-\s/g, ' \u2014 ');
    const c = Object.entries(r.counts ?? {})
      .map(([k, v]) => `<span class="badge">${esc(label(k))} ${v}</span>`).join('');
    const m = r.meta ?? {};
    const what = [m.subtype ?? m.skill, m.difficulty, m.model]
      .filter(Boolean).map(esc).join(' &middot; ');
    return `<div class="agent-run ${r.alerts?.length ? 'flagged' : ''}">
      <div class="spread">
        <div><strong>${esc(AGENT_KIND[r.kind] ?? r.kind ?? 'run')}</strong>
          ${what ? `<div class="tiny muted">${what}</div>` : ''}</div>
        <div class="tiny muted">${esc(when(new Date((r.started_at ?? 0) * 1000).toISOString()))}
          ${r.seconds != null ? ` &middot; ${Math.round(r.seconds)}s` : ''}</div>
      </div>
      ${c ? `<div class="meta" style="margin-top:8px">${c}</div>` : ''}
      ${(r.alerts ?? []).map((a) => `<div class="agent-alert ${esc(a.level)}">
        ${esc(a.text)}</div>`).join('')}
    </div>`;
  };

  app.innerHTML = `<div class="wrap wide">
    <div class="top">
      <div><h1>Agents</h1>
        <p class="who">Every batch the system runs, and anything that looks wrong</p></div>
      <div class="row tight">
        <button class="btn-sm" id="refresh">Refresh</button>
        <button class="btn-sm" id="out">Sign out</button></div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab" id="tab-roster" role="tab">Students</button>
      <button class="tab" id="tab-plan" role="tab">Plan a lesson</button>
      <button class="tab on" id="tab-agents" role="tab" aria-selected="true">Agents</button>
    </div>

    ${flagged.length ? `<h2>Needs a look</h2>
      <div class="card">${flagged.map(card).join('')}</div>`
      : `<div class="card"><p class="small muted" style="margin:0">
          Nothing flagged. ${feed.runs.length} run${feed.runs.length === 1 ? '' : 's'} recorded.</p></div>`}

    ${clean.length ? `<h2>Recent runs</h2>
      <div class="card">${clean.slice(0, 25).map(card).join('')}</div>` : ''}

    <p class="tiny muted">Rebuild this with
      <code>python3 tools/build_agent_feed.py</code> after a batch.</p>
  </div>`;

  $('#out').onclick = async () => { await store.signOut(); location.reload(); };
  $('#refresh').onclick = boot;
  $('#tab-roster').onclick = () => screenRoster();
  $('#tab-plan').onclick = () => screenPlanner();
  window.scrollTo(0, 0);
}

/**
 * The lesson planner. Grounded in the project's own analysis - the subtype
 * taxonomy, the band model, the misconception families and the verified item
 * bank - so a plan names real recognitions rather than giving generic advice.
 *
 * An assignment it proposes is never written to a student's account directly.
 * The teacher approves it first; the model only ever drafts.
 */
async function screenPlanner(note) {
  const up = await plannerHealthy();
  const students = state.roster.map((r) => r.profile);

  app.innerHTML = `<div class="wrap wide">
    <div class="top">
      <div><h1>Plan a lesson</h1>
        <p class="who">Grounded in your own subtype taxonomy, band model and item bank</p></div>
      <div class="row tight"><button class="btn-sm" id="out">Sign out</button></div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab" id="tab-roster" role="tab" aria-selected="false">Students</button>
      <button class="tab on" id="tab-plan" role="tab" aria-selected="true">Plan a lesson</button>
      <button class="tab" id="tab-agents" role="tab">Agents${
        agentAlertCount() ? ` <span class="pill">${agentAlertCount()}</span>` : ''}</button>
    </div>

    ${up ? '' : `<div class="plan-offline">
      <strong>The planner is not running.</strong> It is a local helper that uses
      your own Claude session, so there is no API key and nothing leaves this
      machine. Start it with:
      <div style="margin-top:8px"><code>python3 tools/planner_server.py</code></div>
      then reload this tab.</div>`}

    <div class="plan-wrap" style="margin-top:14px">
      <div class="plan-thread" id="thread">
        ${plannerState.messages.length ? plannerState.messages.map((m) => `
          <div class="plan-msg ${m.role === 'user' ? 'you' : 'bot'}">
            <div class="who">${m.role === 'user' ? 'You' : 'Planner'}</div>
            ${m.role === 'user' ? `<p>${esc(m.content)}</p>` : renderPlan(m.content)}
          </div>`).join('') : `
          <div class="plan-msg bot">
            <div class="who">Planner</div>
            <p>Tell me what you are teaching, who it is for, and how long you
               have. I know the 181 question subtypes, what each score target
               actually requires, and which practice items exist.</p>
          </div>`}
        ${plannerState.busy ? `<div class="plan-msg bot"><div class="who">Planner</div>
          <p class="muted"><span class="spin"></span> Thinking…</p></div>` : ''}
        ${plannerState.error ? `<p class="err">${esc(plannerState.error)}</p>` : ''}
      </div>

      ${plannerState.pending ? `<div class="plan-approve">
        <div class="t">Proposed assignment: ${esc(plannerState.pending.title ?? 'Untitled')}</div>
        <p class="small" style="margin:0 0 4px">
          ${esc((plannerState.pending.subtypes ?? []).join(', '))}
          ${plannerState.pending.difficulty ? `· ${esc(plannerState.pending.difficulty)} tier` : ''}
          ${plannerState.pending.item_ids?.length ? `· ${plannerState.pending.item_ids.length} items` : ''}
        </p>
        ${plannerState.pending.notes ? `<p class="small muted" style="margin:0 0 10px">
          ${esc(plannerState.pending.notes)}</p>` : ''}
        <div class="row">
          <select id="assign-to" style="max-width:260px">
            ${students.map((p) => `<option value="${esc(p.id)}">
              ${esc(p.full_name ?? p.email ?? 'Student')}</option>`).join('')}
          </select>
          <button class="btn-primary" id="approve"
            ${students.length ? '' : 'disabled'}>Approve and assign</button>
          <button id="discard">Discard</button>
        </div>
        ${students.length ? '' : '<p class="tiny muted" style="margin:8px 0 0">No students on your roster yet.</p>'}
      </div>` : ''}

      ${note ? `<p class="small" style="color:#0b7a55;font-weight:700">${esc(note)}</p>` : ''}

      ${plannerState.messages.length ? '' : `<div class="plan-starters">
        ${STARTERS.map((s, i) => `<button data-starter="${i}">${esc(s)}</button>`).join('')}
      </div>`}

      <div class="plan-ask">
        <textarea id="ask" placeholder="Plan a one-hour lesson on…"
          ${up ? '' : 'disabled'}></textarea>
        <button class="btn-primary" id="send" ${up && !plannerState.busy ? '' : 'disabled'}>Send</button>
      </div>
      <p class="tiny muted">Runs on your machine against your own Claude
        session. Nothing here is visible to students, and an assignment only
        reaches them after you approve it.</p>
    </div>
  </div>`;

  const thread = $('#thread');
  if (thread) thread.scrollTop = thread.scrollHeight;

  $('#out').onclick = async () => { await store.signOut(); location.reload(); };
  $('#tab-roster').onclick = () => screenRoster();
  $('#tab-agents').onclick = () => screenAgents();

  const send = async (text) => {
    if (!text?.trim()) return;
    await sendToPlanner(text.trim());
    screenPlanner();
  };
  $('#send').onclick = () => send($('#ask').value);
  $('#ask').onkeydown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send($('#ask').value);
  };
  for (const b of document.querySelectorAll('[data-starter]')) {
    b.onclick = () => send(STARTERS[Number(b.dataset.starter)]);
  }
  const disc = $('#discard');
  if (disc) disc.onclick = () => { plannerState.pending = null; screenPlanner(); };
  const ok = $('#approve');
  if (ok) ok.onclick = async () => {
    const p = plannerState.pending;
    try {
      await store.createAssignment({
        student_id: $('#assign-to').value,
        title: p.title ?? 'Assigned practice',
        filter: { subtypes: p.subtypes ?? [], difficulty: p.difficulty ?? null,
                  item_ids: p.item_ids ?? [] },
      });
      plannerState.pending = null;
      screenPlanner('Assigned. It will appear in their account.');
    } catch (e) {
      plannerState.error = e.message;
      screenPlanner();
    }
  };
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------

async function openStudent(id) {
  const row = state.roster.find((r) => r.profile.id === id);
  app.innerHTML = '<div class="center"><p class="muted"><span class="spin"></span> Loading…</p></div>';
  state.detail = { profile: row.profile, mastery: row.mastery,
                   attempts: row.attempts, fingerprints: row.fingerprints,
                   assigned: row.assigned ?? [] };
  screenStudent();
}

async function loadData() {
  const [bands, skills, lessons, subtax, agentFeed] = await Promise.all([
    fetch('../data/bands.json').then((r) => r.json()),
    fetch('../data/skills.json').then((r) => r.json()),
    fetch('../data/lessons.json').then((r) => r.json()),
    fetch('../data/subtypes.json').then((r) => r.json()).catch(() => ({ skills: {} })),
    fetch('../data/agent_feed.json').then((r) => r.json())
      .catch(() => ({ runs: [], summary: {} })),
  ]);
  state.bands = bands;
  state.skills = Object.fromEntries(skills.skills.map((s) => [s.skill_cd, s]));
  state.lessons = lessons.lessons;
  state.agentFeed = agentFeed;
  state.subtypeNames = {};
  for (const v of Object.values(subtax.skills ?? {})) {
    for (const st of v.subtypes ?? []) state.subtypeNames[st.slug] = st.name;
  }
}

/** Pull each student's rows. RLS decides what comes back, not this code. */
async function loadRoster() {
  const students = await store.roster();
  const out = [];
  for (const profile of students) {
    const { mastery, attempts, fingerprints } = await store.studentData(profile.id);
    const assigned = (await store.assignments().catch(() => []))
      .filter((a) => String(a.student_id) === String(profile.id));
    const weakest = skillTable(mastery).filter((r) => r.seen >= 3)[0] ?? null;
    out.push({
      profile, mastery, attempts, fingerprints, assigned,
      answered: attempts.length,
      accuracy: attempts.length ? attempts.filter((x) => x.correct).length / attempts.length : 0,
      lastSeen: attempts[0]?.created_at ?? null,
      weakest,
    });
  }
  return out.sort((x, y) =>
    (targetTotal(y.profile) - total(y.profile)) - (targetTotal(x.profile) - total(x.profile)));
}

async function boot() {
  app.innerHTML = '<div class="center"><p class="muted"><span class="spin"></span> Loading…</p></div>';
  try {
    await loadData();
    const session = await store.session();
    if (!session) return screenSignIn();

    state.me = await store.profile();
    if (!state.me) return screenSignIn('No profile found for this account.');

    // Local mode has no roles; it shows the one student on this device so the
    // dashboard can be seen working before a backend exists.
    if (configured() && state.me.role !== 'teacher') {
      return screenSignIn('That account is not a teacher account.');
    }

    state.roster = await loadRoster();
    screenRoster();
  } catch (e) {
    app.innerHTML = `<div class="center"><div class="card">
      <h1>Something went wrong</h1><p class="err">${esc(e.message ?? e)}</p></div></div>`;
  }
}

boot();
