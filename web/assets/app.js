// ---------------------------------------------------------------------------
// Student app.
//
// Screens: sign-in -> setup (where are you, where are you going) -> home ->
// lesson or practice. Everything a student sees is filtered through the same
// two ideas as the rest of the project: show what their target requires, and
// do not teach what they have already shown they know.
// ---------------------------------------------------------------------------

import { makeStore, configured } from './store.js?v=1ca24ebc7b';
import { scoreItem, selectRound, updateMastery, bandWeights, TIERS, promotionOffer, availableTiers, streakAt } from './engine.js?v=1ca24ebc7b';
import { buildLesson, focusTier, rankLessons } from './lessons.js?v=1ca24ebc7b';
import { renderText as md, renderBody, renderHtml, renderStimulus, escapeHtml as esc } from './mathfmt.js?v=1ca24ebc7b';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const store = makeStore();

const state = {
  profile: null, mastery: {}, attempts: [], fingerprints: [],
  bands: null, skills: {}, lessons: [],
  screen: 'loading', lesson: null, round: null,
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const totalScore = (p) => (p?.current_rw ?? 0) + (p?.current_math ?? 0);
const targetTotal = (p) => (p?.target_rw ?? 0) + (p?.target_math ?? 0);

function ctx() {
  return {
    bands: state.bands, skills: state.skills, mastery: state.mastery,
    subtypes: state.subtypes, subtypesOf: state.subtypesOf,
    student: state.profile ?? {}, fingerprints: state.fingerprints,
    unlocked: state.unlocked ?? {}, now: new Date(),
  };
}

function accuracyFor(skill_cd, tier) {
  const c = state.mastery[`${skill_cd}|${tier}`];
  return c && c.seen ? c.correct / c.seen : null;
}

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------

function screenSignIn(message = '') {
  const local = !configured();
  app.innerHTML = `
  <div class="center"><div class="card">
    <h1>SAT Practice</h1>
    <p class="muted small">Lessons and practice built around the questions you
      actually miss, at the level you are actually working at.</p>
    ${message ? `<div class="banner">${esc(message)}</div>` : ''}
    ${local ? `
      <div class="banner">No account backend is configured, so this runs in
        local mode: your progress is saved in this browser only.</div>
      <div class="field"><label for="nm">Your name</label>
        <input id="nm" placeholder="Jordan" autocomplete="name"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn-primary grow" id="go">Start</button>
      </div>
    ` : `
      <div class="field"><label for="em">Email</label>
        <input id="em" type="email" autocomplete="email"></div>
      <div class="field"><label for="pw">Password</label>
        <input id="pw" type="password" autocomplete="current-password"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn-primary grow" id="in">Sign in</button>
        <button id="up">Create account</button>
      </div>
    `}
    <p class="err" id="err" hidden></p>
  </div></div>`;

  const err = (m) => { const e = $('#err'); e.textContent = m; e.hidden = false; };

  if (local) {
    const start = async () => {
      const name = $('#nm').value.trim();
      if (!name) return err('Please enter a name.');
      state.profile = await store.startLocal({ full_name: name });
      await boot();
    };
    $('#go').onclick = start;
    $('#nm').onkeydown = (e) => { if (e.key === 'Enter') start(); };
  } else {
    $('#in').onclick = async () => {
      try {
        await store.signIn($('#em').value.trim(), $('#pw').value);
        await boot();
      } catch (e) { err(e.message ?? 'Could not sign in.'); }
    };
    $('#up').onclick = async () => {
      try {
        await store.signUp($('#em').value.trim(), $('#pw').value);
        await boot();
      } catch (e) { err(e.message ?? 'Could not create the account.'); }
    };
  }
}

function screenSetup() {
  const p = state.profile ?? {};
  app.innerHTML = `
  <div class="center"><div class="card">
    ${previewBanner()}
    <h1>Where are you now?</h1>
    <p class="muted small">Your most recent practice test, and what you are aiming
      at. These two numbers decide everything the app shows you, and you can
      change them whenever you want.</p>

    <h2>Most recent scores</h2>
    <div class="row">
      <div class="field grow"><label for="crw">Reading &amp; Writing</label>
        <input id="crw" type="number" min="200" max="800" step="10" value="${p.current_rw ?? ''}" placeholder="500"></div>
      <div class="field grow"><label for="cm">Math</label>
        <input id="cm" type="number" min="200" max="800" step="10" value="${p.current_math ?? ''}" placeholder="460"></div>
    </div>

    <h2>Target</h2>
    <div class="row">
      <div class="field grow"><label for="trw">Reading &amp; Writing</label>
        <input id="trw" type="number" min="200" max="800" step="10" value="${p.target_rw ?? ''}" placeholder="650"></div>
      <div class="field grow"><label for="tm">Math</label>
        <input id="tm" type="number" min="200" max="800" step="10" value="${p.target_math ?? ''}" placeholder="650"></div>
    </div>

    <div class="row" style="margin-top:16px">
      <button class="btn-primary grow" id="save">Save and start</button>
    </div>
    <p class="err" id="err" hidden></p>
  </div></div>`;

  $('#save').onclick = async () => {
    const n = (id) => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? v : null; };
    const patch = { current_rw: n('#crw'), current_math: n('#cm'),
                    target_rw: n('#trw'), target_math: n('#tm') };
    if (Object.values(patch).some((v) => v === null)) {
      const e = $('#err'); e.textContent = 'Please fill in all four scores.'; e.hidden = false; return;
    }
    if (patch.target_rw < patch.current_rw || patch.target_math < patch.current_math) {
      const e = $('#err');
      e.textContent = 'Each target should be at or above your current score.';
      e.hidden = false; return;
    }
    state.profile = await store.saveProfile(patch);
    state.screen = 'home';
    render();
  };
}

/** Shown on every screen in preview mode, so it is never mistaken for live. */
function previewBanner() {
  if (store.mode !== 'preview') return '';
  const who = state.profile?.full_name ?? 'this student';
  return `<div class="banner preview-banner">Student view &mdash; this is
    ${esc(who)}'s app as they see it. Nothing here is saved, and their progress
    is not affected.</div>`;
}

function screenHome() {
  const p = state.profile;
  const withSkill = state.lessons.filter((l) => l.skill_cd && state.skills[l.skill_cd]);
  const ranked = rankLessons(withSkill, ctx(), scoreItem);
  // Triage is band-specific and changes as the student's target moves, so it
  // leads on its own. The rest of the cross-cutting strategy sits together
  // below it rather than pushing the skill lessons off the screen.
  const pinned = state.lessons.filter((l) => l.pinned);
  const lead = pinned.filter((l) => l.type === 'triage');
  const strategy = pinned.filter((l) => l.type !== 'triage');

  const mathW = bandWeights(state.bands, 'math', p.target_math);
  const rwW = bandWeights(state.bands, 'rw', p.target_rw);
  const plan = (w) => TIERS.filter((t) => (w[t] ?? 0) > 0.02).join(' + ') || 'E';

  const done = state.attempts.length;
  const right = state.attempts.filter((a) => a.correct).length;

  app.innerHTML = `<div class="wrap">
    ${previewBanner()}
    <div class="top">
      <div><h1>SAT Practice</h1>
        <p class="who">${esc(p.full_name ?? p.email ?? 'Signed in')}${
          store.mode === 'local' ? ' &middot; local mode' : ''}</p></div>
      <div class="row tight">
        <button class="btn-sm" id="settings">Scores</button>
        ${store.mode === 'preview' ? '' : '<button class="btn-sm" id="out">Sign out</button>'}
      </div>
    </div>

    <div class="card">
      <div class="scores">
        <div class="score"><div class="l">Reading &amp; Writing</div>
          <div class="n">${p.current_rw}</div><div class="g">goal ${p.target_rw}</div></div>
        <div class="score"><div class="l">Math</div>
          <div class="n">${p.current_math}</div><div class="g">goal ${p.target_math}</div></div>
        <div class="score"><div class="l">Total</div>
          <div class="n">${totalScore(p)}</div><div class="g">goal ${targetTotal(p)}</div></div>
      </div>
      <p class="small muted" style="margin:14px 0 0">
        To hit your target you need to win the
        <strong>${esc(plan(rwW))}</strong> tiers in Reading &amp; Writing and
        <strong>${esc(plan(mathW))}</strong> in Math.
        ${(mathW.H ?? 0) <= 0.02
          ? 'Hard math questions are not on your list &mdash; guess and move on.'
          : `You need about ${Math.round((mathW.H ?? 0) * 100)}% of the Hard math tier.`}
      </p>
      ${done ? `<div class="bar good"><i style="width:${Math.round(right / done * 100)}%"></i></div>
        <p class="tiny muted" style="margin:6px 0 0">${right} of ${done} correct so far</p>` : ''}
    </div>

    ${openAssignments().length ? `<h2>Set by your teacher</h2>
      ${openAssignments().map((a) => assignmentTile(a)).join('')}` : ''}

    ${lead.length ? `<h2>Start here</h2>
      ${lead.map((l) => tile(l, null)).join('')}` : ''}

    ${strategy.length ? `<h2>Strategy and test intuition</h2>
      ${strategy.map((l) => tile(l, null)).join('')}` : ''}

    <h2>Your lessons, in the order that pays</h2>
    ${ranked.length
      ? ranked.map(({ lesson }) => tile(lesson, focusTier(lesson, ctx()))).join('')
      : '<div class="card empty">No lessons available yet.</div>'}
  </div>`;

  const out = $('#out');
  if (out) out.onclick = async () => { await store.signOut(); location.reload(); };
  $('#settings').onclick = () => { state.screen = 'setup'; render(); };
  for (const el of document.querySelectorAll('[data-assignment]')) {
    el.onclick = () => startAssignment(el.dataset.assignment);
  }
  for (const el of document.querySelectorAll('[data-lesson]')) {
    el.onclick = () => {
      state.lesson = el.dataset.lesson;
      state.screen = 'lesson';
      render();
    };
  }
}

/** Assignments not yet finished, newest first. */
function openAssignments() {
  return (state.assignments ?? []).filter((a) => !a.completed_at);
}

/** The items an assignment covers: explicit ids first, else its filter. */
export function assignedItems(a, items) {
  const f = a.filter ?? {};
  if (f.item_ids?.length) {
    const want = new Set(f.item_ids);
    const hit = items.filter((i) => want.has(i.id));
    if (hit.length) return hit;
  }
  const subs = new Set(f.subtypes ?? []);
  return items.filter((i) =>
    (!subs.size || subs.has(i.subtype)) &&
    (!f.difficulty || i.difficulty === f.difficulty));
}

function assignmentTile(a) {
  const n = assignedItems(a, state.items).length;
  const f = a.filter ?? {};
  return `<button class="tile assigned" data-assignment="${esc(String(a.id))}">
    <div class="t">${esc(a.title ?? 'Assigned practice')}</div>
    <div class="d">${n ? `${n} question${n === 1 ? '' : 's'}` : 'No questions available yet'}
      ${f.difficulty ? ` &middot; ${esc(f.difficulty)} tier` : ''}</div>
    ${f.notes || a.notes ? `<div class="d" style="margin-top:6px">${esc(f.notes ?? a.notes)}</div>` : ''}
    <div class="meta"><span class="badge on">Assigned</span>
      ${(f.subtypes ?? []).slice(0, 3).map((sl) =>
        `<span class="badge">${esc(state.subtypeInfo?.[sl]?.name ?? sl)}</span>`).join('')}</div>
  </button>`;
}

function tile(lesson, tier) {
  const skill = state.skills[lesson.skill_cd];
  const acc = tier ? accuracyFor(lesson.skill_cd, tier) : null;
  const badge = tier ? `<span class="badge ${tier.toLowerCase()}">Focus: ${tier}</span>` : '';
  const seen = acc === null
    ? '<span class="badge">Not started</span>'
    : `<span class="badge ${acc >= 0.85 ? 'e' : acc >= 0.6 ? 'm' : 'on'}">${Math.round(acc * 100)}% at ${tier}</span>`;
  return `<button class="tile" data-lesson="${esc(lesson.id)}">
    <div class="t">${esc(lesson.title)}</div>
    <div class="d">${esc(lesson.subtitle ?? skill?.domain_name ?? '')}</div>
    <div class="meta">${badge}${tier ? seen : ''}
      ${lesson.type !== 'lesson' ? `<span class="badge">${esc(lesson.type)}</span>` : ''}</div>
  </button>`;
}

function screenLesson() {
  const source = state.lessons.find((l) => l.id === state.lesson);
  const built = buildLesson(source, ctx());
  const tier = built.focus;
  const skill = state.skills[source.skill_cd];

  app.innerHTML = `<div class="wrap">
    ${previewBanner()}
    <div class="row" style="margin-bottom:14px">
      <button class="btn-sm" id="back">&larr; All lessons</button>
    </div>
    <h1>${esc(built.title)}</h1>
    <p class="muted small">${esc(built.subtitle ?? '')}</p>

    ${source.skill_cd ? `<div class="card flat" style="margin-top:12px">
      <div class="spread">
        <div><strong>Your focus here: ${esc(tier)}</strong>
          <div class="tiny muted">${esc(tierExplanation(source, tier))}</div></div>
        <span class="badge ${tier.toLowerCase()}">${esc(tier)}</span>
      </div>
    </div>` : ''}

    <h2>Lesson</h2>
    ${built.sections.map((s) => `
      <div class="section">
        <h3>${md(s.heading)}
          ${s.tier ? `<span class="badge ${s.tier.toLowerCase()}">${s.tier}</span>` : ''}
          ${s.when ? '<span class="badge on">For you</span>' : ''}
        </h3>
        ${renderBody(s.body)}
      </div>`).join('')}

    ${built.hidden ? `<p class="tiny muted" style="margin-top:14px">
      ${built.hidden} section${built.hidden === 1 ? '' : 's'} hidden &mdash; either
      written for a different score range, or covering material your target does
      not ask you to win. They appear as your scores change.</p>` : ''}

    ${skill ? `<h2>Practice</h2>
    <div class="card">
      ${levelPicker(source, tier)}
    </div>` : ''}
  </div>`;

  $('#back').onclick = () => { state.screen = 'home'; render(); };
  for (const b of document.querySelectorAll('[data-tier]')) {
    b.onclick = () => startRound(source.skill_cd, b.dataset.tier);
  }
  window.scrollTo(0, 0);
}

const TIER_NAME = { E: 'Easy', M: 'Medium', H: 'Hard' };

/**
 * Choose a level.
 *
 * The app still points at the tier it thinks pays, but every tier already
 * reached stays on offer - coming back for more practice is a choice, not a
 * demotion - and the next one up is always there to try. Progress at each
 * level is kept separately, so nothing is lost by moving on.
 */
function levelPicker(lesson, recommended) {
  const unit = lesson.skill_cd;
  const { unlocked, tryable } = availableTiers(unit, ctx());
  const btn = (t, kind) => {
    const cell = state.mastery[`${unit}|${t}`];
    const acc = cell?.seen ? Math.round((cell.correct / cell.seen) * 100) : null;
    const n = state.items.filter((i) => i.skill_cd === unit && i.difficulty === t).length;
    return `<button class="level ${kind}" data-tier="${t}" ${n ? '' : 'disabled'}>
      <span class="level-t">${TIER_NAME[t]}</span>
      <span class="level-d">${n ? `${n} questions` : 'none yet'}${
        acc !== null ? ` &middot; ${acc}% so far` : ''}</span>
      ${t === recommended ? '<span class="level-tag">Suggested</span>' : ''}
      ${kind === 'try' ? '<span class="level-tag try">Try it</span>' : ''}
    </button>`;
  };
  return `
    <p class="small muted">Start where it pays, and move up when you are ready.
      Everything you have practised stays here &mdash; come back any time.</p>
    <div class="levels">
      ${unlocked.map((t) => btn(t, 'open')).join('')}
      ${tryable ? btn(tryable, 'try') : ''}
    </div>`;
}

function tierExplanation(lesson, tier) {
  const skill = state.skills[lesson.skill_cd];
  if (!skill) return '';
  const section = skill.section === 'rw' ? 'Reading & Writing' : 'Math';
  const acc = accuracyFor(lesson.skill_cd, tier);
  if (acc === null) return `You have not practiced this skill yet, so start at ${tier}.`;
  if (acc < 0.85) return `You are at ${Math.round(acc * 100)}% on ${tier} here. Secure it before moving up.`;
  return `Your ${section} target does not require anything above ${tier} in this skill.`;
}

// ---------------------------------------------------------------------------
// practice
// ---------------------------------------------------------------------------

/**
 * Practise an assignment. The set is what the teacher approved, so it is used
 * as given rather than re-ranked - the engine chooses what to study when
 * nobody has chosen for the student, not instead of them.
 */
function startAssignment(id) {
  const a = (state.assignments ?? []).find((x) => String(x.id) === String(id));
  if (!a) return;
  const items = assignedItems(a, state.items);
  if (!items.length) {
    alert('No questions are available for this assignment yet.');
    return;
  }
  state.round = {
    items: items.slice(0, 40), at: 0, answers: [],
    startedAt: Date.now(), assignment: a,
  };
  state.screen = 'practice';
  render();
}

function startRound(skill_cd, tier) {
  // A chosen tier is honoured as chosen. The engine ranks within it rather
  // than overriding it - the student asked for this level.
  const pool = state.items.filter((i) => i.skill_cd === skill_cd && i.difficulty === tier);
  const ranked = selectRound(pool, ctx(), { size: window.CONFIG.ROUND_SIZE, maxPerSkill: 99 });
  state.round = {
    items: (ranked.length ? ranked : pool).slice(0, window.CONFIG.ROUND_SIZE),
    at: 0, answers: [], startedAt: Date.now(), tier,
  };
  if (!state.round.items.length) {
    state.round = null;
    alert('No practice items are loaded for this skill yet.');
    return;
  }
  state.screen = 'practice';
  render();
}

function screenPractice() {
  const r = state.round;
  if (r.at >= r.items.length) return screenResult();

  const item = r.items[r.at];
  const picked = r.answers[r.at];
  const revealed = picked !== undefined;
  const correctNow = picked === item.answer;

  app.innerHTML = `<div class="wrap${item.figure || item.table ? ' wide' : ''}">
    ${previewBanner()}
    <div class="spread" style="margin-bottom:12px">
      <button class="btn-sm" id="quit">&larr; Back</button>
      <span class="tiny muted">${r.at + 1} of ${r.items.length}
        &middot; <span class="badge ${item.difficulty.toLowerCase()}">${item.difficulty}</span></span>
    </div>
    <div class="bar thin"><i style="width:${Math.round(r.at / r.items.length * 100)}%"></i></div>

    <div class="card" style="margin-top:14px">
      ${item.stimulus ? `<div class="stim">${renderStimulus(item.stimulus)}</div>` : ''}
      <div class="q">${renderStimulus(item.stem)}</div>
      ${item.choices.map((c, i) => {
        const key = 'ABCD'[i];
        let cls = 'choice';
        if (revealed) {
          if (key === item.answer) cls += ' right';
          else if (key === picked) cls += ' wrong';
        } else if (key === picked) cls += ' picked';
        return `<button class="${cls}" data-key="${key}" ${revealed ? 'disabled' : ''}>
          <span class="k">${key}</span><span class="ctext">${renderHtml(c)}</span></button>`;
      }).join('')}
      ${revealed ? explanation(item, picked, correctNow) : ''}
    </div>

    ${revealed ? `<div class="row" style="margin-top:12px">
      <button class="btn-primary grow" id="next">
        ${r.at + 1 === r.items.length ? 'Finish' : 'Next question'}</button>
    </div>` : ''}
  </div>`;

  $('#quit').onclick = () => {
    const back = state.round?.assignment ? 'home' : 'lesson';
    state.round = null; state.screen = back; render();
  };
  for (const b of document.querySelectorAll('.choice')) {
    b.onclick = () => answer(b.dataset.key);
  }
  const n = $('#next');
  if (n) n.onclick = () => { r.at++; render(); };
  window.scrollTo(0, 0);
}

async function answer(key) {
  const r = state.round;
  const item = r.items[r.at];
  const correct = key === item.answer;
  r.answers[r.at] = key;

  const cellKey = `${item.skill_cd}|${item.difficulty}`;
  const cell = updateMastery(state.mastery[cellKey], correct);
  state.mastery[cellKey] = cell;

  const row = { content_id: item.id, correct, chosen: key,
                ms: Date.now() - (r.itemStart ?? r.startedAt) };
  state.attempts.unshift({ ...row, created_at: new Date().toISOString() });

  // A miss whose wrong choice is tagged becomes a fingerprint, so practice
  // feeds the same pattern detection as an uploaded Bluebook result. Three
  // transition-logic misses surface the trap card whether they happened here
  // or on a real test.
  const family = !correct ? item.misconceptions?.[key] : null;
  let fingerprint = null;
  if (family) {
    fingerprint = {
      test_label: 'Practice', module: null, question_no: null,
      skill_cd: item.skill_cd, difficulty: item.difficulty,
      chosen: key, correct_answer: item.answer, misconception: family,
    };
    state.fingerprints.unshift({ ...fingerprint, created_at: new Date().toISOString() });
  }

  render();
  try {
    await store.saveMastery(cellKey, cell);
    await store.logAttempt(row);
    if (fingerprint) await store.addFingerprints([fingerprint]);
  } catch { /* queued by the store */ }
}

/**
 * What to show once an answer is revealed.
 *
 * College Board writes a separate paragraph for each wrong choice, explaining
 * the specific error that produces it. Shown whole, a student who picked B
 * reads four paragraphs hunting for the one about B. Shown split, they are told
 * why *their* answer was wrong first, then why the right one is right - which
 * is the difference between being corrected and being diagnosed.
 *
 * These are College Board's own words, not ours. Items without a per-choice
 * structure fall back to the whole rationale rather than to anything invented.
 */
function explanation(item, picked, correct) {
  const parts = item.per_choice;
  if (!parts) {
    return `<div class="why">${renderHtml(item.rationale ?? '')}</div>`;
  }
  const family = !correct ? item.misconceptions?.[picked] : null;
  const named = family ? state.misconceptions?.[family] : null;
  const mine = !correct && parts[picked] ? `
    <div class="why why-yours">
      <div class="why-h">Why ${esc(picked)} is wrong</div>
      ${named ? `<p class="why-name">${md(named.label)}</p>` : ''}
      ${renderHtml(parts[picked])}
    </div>` : '';
  return `${mine}
    <div class="why">
      <div class="why-h">${correct ? 'Why that is right' : `Why ${esc(item.answer)} is right`}</div>
      ${renderHtml(parts.correct ?? item.rationale ?? '')}
    </div>
    ${otherChoices(item, picked)}`;
}

/** The remaining wrong choices, folded away - available, not shouting. */
function otherChoices(item, picked) {
  const parts = item.per_choice ?? {};
  const rest = ['A', 'B', 'C', 'D']
    .filter((k) => k !== item.answer && k !== picked && parts[k]);
  if (!rest.length) return '';
  return `<details class="why-more">
    <summary>Why the other choices are wrong</summary>
    ${rest.map((k) => `<div class="why-alt">
      <div class="why-h">${esc(k)}</div>${renderHtml(parts[k])}</div>`).join('')}
  </details>`;
}

function screenResult() {
  const r = state.round;
  const unit = r.items[0]?.subtype ?? r.items[0]?.skill_cd;
  const poolAt = unit ? state.items.filter((i) =>
    (i.subtype ?? i.skill_cd) === unit && i.difficulty === r.tier).length : 0;
  const offer = unit && r.tier ? promotionOffer(unit, r.tier, ctx(), poolAt) : null;
  if (r.assignment && !r.assignment.completed_at) {
    r.assignment.completed_at = new Date().toISOString();
    store.completeAssignment(r.assignment.id).catch(() => {});
  }
  const right = r.items.filter((it, i) => r.answers[i] === it.answer).length;
  const pct = Math.round(right / r.items.length * 100);

  app.innerHTML = `<div class="wrap">${previewBanner()}
    <div class="card" style="text-align:center">
    <h1>${right} of ${r.items.length}</h1>
    <div class="bar good" style="max-width:280px;margin:14px auto"><i style="width:${pct}%"></i></div>
    <p class="muted small">${
      pct >= 85 ? 'Strong. This tier is close to secure &mdash; the next round will move you up.'
      : pct >= 60 ? 'Solid. The ones you missed are back in the queue and will come round again soon.'
      : 'Worth slowing down here. Reread the lesson before the next round.'}</p>
    ${offer ? `<div class="promote">
      <div class="promote-t">That is ${esc(offer.reason)}.</div>
      <p class="small">Ready for ${esc(TIER_NAME[offer.to])}? Your
        ${esc(TIER_NAME[offer.from])} progress is saved either way, and you can
        come back to it whenever you want.</p>
      <div class="row" style="justify-content:center">
        <button class="btn-primary" id="level-up">Try ${esc(TIER_NAME[offer.to])}</button>
        <button id="stay">Stay on ${esc(TIER_NAME[offer.from])}</button>
      </div>
    </div>` : ''}
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn-primary" id="again">Another round</button>
      <button id="lesson">Back to the lesson</button>
      <button id="home">All lessons</button>
    </div>
  </div></div>`;

  const up = $('#level-up');
  if (up) up.onclick = async () => {
    const key = `${unit}|${offer.to}`;
    state.unlocked = { ...(state.unlocked ?? {}), [key]: new Date().toISOString() };
    try { await store.unlock(key); } catch { /* kept locally regardless */ }
    startRound(r.items[0].skill_cd, offer.to);
  };
  const stay = $('#stay');
  if (stay) stay.onclick = () => startRound(r.items[0].skill_cd, r.tier);

  const src = state.lessons.find((l) => l.id === state.lesson);
  $('#again').onclick = () => (r.assignment
    ? startAssignment(r.assignment.id)
    : startRound(src.skill_cd, r.tier ?? focusTier(src, ctx())));
  $('#lesson').onclick = () => { state.round = null; state.screen = 'lesson'; render(); };
  $('#home').onclick = () => { state.round = null; state.screen = 'home'; render(); };
}

// ---------------------------------------------------------------------------

function render() {
  const s = state.screen;
  if (s === 'signin') return screenSignIn();
  if (s === 'setup') return screenSetup();
  if (s === 'lesson') return screenLesson();
  if (s === 'practice') return screenPractice();
  return screenHome();
}

async function loadData() {
  const [bands, skills, lessons, items, misc, subtax, subcounts] = await Promise.all([
    fetch('../data/bands.json').then((r) => r.json()),
    fetch('../data/skills.json').then((r) => r.json()),
    fetch('../data/lessons.json').then((r) => r.json()),
    // Our own CC BY items. The College Board pool is deliberately not loaded:
    // it cannot be served to students (docs/LICENSING.md section 4).
    fetch('../data/practice.json').then((r) => r.json()).catch(() => ({ items: [] })),
    fetch('../data/misconceptions.json').then((r) => r.json()).catch(() => ({ families: [] })),
    fetch('../data/subtypes.json').then((r) => r.json()).catch(() => ({ skills: {} })),
    fetch('../data/subtype_counts.json').then((r) => r.json()).catch(() => ({ subtypes: {} })),
  ]);
  state.misconceptions = Object.fromEntries((misc.families ?? []).map((f) => [f.slug, f]));
  // Subtype metadata: the engine keys mastery on it, and the lesson view names
  // the recognition a student is practising.
  state.subtypes = subcounts.subtypes ?? {};
  state.subtypeInfo = {};
  state.subtypesOf = {};
  for (const [skill, v] of Object.entries(subtax.skills ?? {})) {
    for (const st of v.subtypes ?? []) {
      state.subtypeInfo[st.slug] = { ...st, skill };
      const cd = st.skill_cd ?? state.subtypes[st.slug]?.skill;
    }
  }
  for (const [slug, c] of Object.entries(state.subtypes)) {
    const sk = Object.values(state.skills).find((s) => s.skill_name === c.skill);
    if (!sk) continue;
    (state.subtypesOf[sk.skill_cd] ??= []).push({ ...c, slug });
  }
  state.bands = bands;
  state.skills = Object.fromEntries(skills.skills.map((s) => [s.skill_cd, s]));
  state.lessons = lessons.lessons;
  state.items = items.items ?? [];
}

async function boot() {
  app.innerHTML = '<div class="center"><p class="muted"><span class="spin"></span> Loading…</p></div>';
  try {
    await loadData();
    const session = await store.session();
    if (!session) { state.screen = 'signin'; return render(); }

    state.profile = await store.profile();
    if (!state.profile) { state.screen = 'signin'; return render(); }

    [state.mastery, state.attempts, state.fingerprints, state.assignments] =
      await Promise.all([
        store.mastery(), store.attempts(), store.fingerprints(),
        store.myAssignments().catch(() => []),
      ]);

    state.screen = state.profile.target_rw && state.profile.target_math ? 'home' : 'setup';
    render();
  } catch (e) {
    app.innerHTML = `<div class="center"><div class="card">
      <h1>Something went wrong</h1><p class="err">${esc(e.message ?? e)}</p></div></div>`;
  }
}

boot();
