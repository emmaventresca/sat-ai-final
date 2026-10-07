// ---------------------------------------------------------------------------
// Student app.
//
// Screens: sign-in -> setup (where are you, where are you going) -> home ->
// lesson or practice. Everything a student sees is filtered through the same
// two ideas as the rest of the project: show what their target requires, and
// do not teach what they have already shown they know.
// ---------------------------------------------------------------------------

import { makeStore, configured } from './store.js?v=ec0e17d405';
import { scoreItem, selectRound, updateMastery, bandWeights, TIERS, promotionOffer, availableTiers, streakAt } from './engine.js?v=ec0e17d405';
import { buildLesson, focusTier, rankLessons } from './lessons.js?v=ec0e17d405';
import {
  missGroups, missCount, reinforcementSet, generatorAvailable, generateMore,
  familyName,
  relatedSets,
} from './review.js?v=ec0e17d405';
import { isGrid, matches as gridMatches, diagnose as gridDiagnose, MAX_LEN } from './grid.js?v=ec0e17d405';
import { renderText as md, renderBody, renderHtml, renderStimulus, renderFigure, escapeHtml as esc } from './mathfmt.js?v=ec0e17d405';

const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
const store = makeStore();

const state = {
  profile: null, mastery: {}, attempts: [], fingerprints: [],
  reviewGroup: null, reviewTab: 'missed', reviewGen: null,
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
    // Review joins attempts back to the items that produced them.
    items: state.items, attempts: state.attempts,
    misconceptions: state.misconceptions,
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

    ${mainTabs('lessons')}

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
  wireMainTabs();
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
        `<span class="badge name">${esc(state.subtypeInfo?.[sl]?.name ?? sl)}</span>`).join('')}</div>
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

// ---------------------------------------------------------------------------
// review
//
// The mistakes, kept and organised. A wrong answer is the most useful thing a
// student produces and it used to vanish when the round ended.
// ---------------------------------------------------------------------------

const TIER_WORD = { F: 'Foundations', E: 'Easy', M: 'Medium', H: 'Hard', X: 'Stretch' };

/**
 * The two places a student works: what to learn, and what they got wrong.
 *
 * Review used to be a card buried under the score panel, which made it feel
 * like a notification rather than somewhere you go. It is half the app - a
 * wrong answer is the most useful thing a student produces - so it gets
 * equal billing.
 */
function mainTabs(active) {
  const n = missCount(ctx());
  return `<div class="tabs" role="tablist">
    <button class="tab ${active === 'lessons' ? 'on' : ''}" data-tab="lessons"
      role="tab" aria-selected="${active === 'lessons'}">Lessons</button>
    <button class="tab ${active === 'review' ? 'on' : ''}" data-tab="review"
      role="tab" aria-selected="${active === 'review'}">Review mistakes${
        n ? ` <span class="tab-n">${n}</span>` : ''}</button>
  </div>`;
}

function wireMainTabs() {
  for (const b of document.querySelectorAll('[data-tab]')) {
    b.onclick = () => {
      state.reviewGroup = null;
      state.screen = b.dataset.tab === 'review' ? 'review' : 'home';
      render();
    };
  }
}

/** The home-screen entry point. Absent until there is something to review. */
function reviewCard() {
  const groups = missGroups(ctx());
  if (!groups.length) return '';
  const n = missCount(ctx());
  const top = groups.slice(0, 3);
  return `<button class="tile review" id="review">
    <div class="t">Review your mistakes</div>
    <div class="d">${n} missed question${n === 1 ? '' : 's'}, sorted by what keeps
      catching you. Each one comes with ten more to lock it in.</div>
    <div class="meta">${top.map((g) =>
      `<span class="badge on name">${esc(g.title)} &middot; ${g.count}</span>`).join('')}
      ${groups.length > 3 ? `<span class="badge">+${groups.length - 3} more</span>` : ''}</div>
  </button>`;
}

function screenReview() {
  const groups = missGroups(ctx());
  const p = state.profile;
  app.innerHTML = `<div class="wrap">
    ${previewBanner()}
    <div class="top">
      <div><h1>SAT Practice</h1>
        <p class="who">${esc(p?.full_name ?? p?.email ?? 'Signed in')}${
          store.mode === 'local' ? ' &middot; local mode' : ''}</p></div>
      <div class="row tight">
        <button class="btn-sm" id="settings">Scores</button>
      </div>
    </div>
    ${mainTabs('review')}
    <h2 style="margin-top:0">Your mistakes</h2>
    <p class="muted">Grouped by the kind of question, then by the specific wrong
      move inside it. Worst first &mdash; this list is about you, not about what
      the test asks most.</p>

    ${groups.length ? groups.map((g) => `
      <button class="tile" data-group="${esc(g.key)}">
        <div class="t">${esc(g.title)}</div>
        <div class="d">${esc(g.skill_name)}${g.section
          ? ` &middot; ${g.section === 'rw' ? 'Reading &amp; Writing' : 'Math'}` : ''}</div>
        <div class="meta">
          <span class="badge on">${g.count} missed</span>
          ${TIERS.filter((t) => g.tiers[t]).map((t) =>
            `<span class="badge ${t.toLowerCase()}">${g.tiers[t]} at ${TIER_WORD[t]}</span>`).join('')}
        </div>
        ${g.topFamilies.length ? `<div class="d" style="margin-top:8px">Usually:
          ${g.topFamilies.slice(0, 2).map((f) =>
            `${esc(f.name)}${f.n > 1 ? ` (${f.n}&times;)` : ''}`).join(', ')}</div>` : ''}
      </button>`).join('')
      : '<div class="card empty">Nothing missed yet. Come back after some practice.</div>'}
  </div>`;

  wireMainTabs();
  $('#settings').onclick = () => { state.screen = 'setup'; render(); };
  for (const b of document.querySelectorAll('[data-group]')) {
    b.onclick = () => { state.reviewGroup = b.dataset.group; state.reviewTab = 'missed'; render(); };
  }
  window.scrollTo(0, 0);
}

function screenReviewGroup() {
  const g = missGroups(ctx()).find((x) => x.key === state.reviewGroup);
  if (!g) { state.reviewGroup = null; return screenReview(); }
  const sets = relatedSets(g, ctx());
  const tab = state.reviewTab ?? 'missed';
  const lesson = g.subtype ? state.subLessons?.[g.subtype] : null;
  const gen = state.reviewGen ?? {};

  const TABS = [
    ['missed', `What you missed`, g.count],
    ['again', 'Sit them again', sets.again.length],
    ['twins', 'Questions like these', sets.twins.length],
    ['cousins', 'The same skill, another angle', sets.cousins.length],
  ];

  app.innerHTML = `<div class="wrap">
    ${previewBanner()}
    <div class="spread" style="margin-bottom:12px">
      <button class="btn-sm" id="back">&larr; All mistakes</button>
      ${lesson ? '<button class="btn-sm" id="teach">Read the lesson</button>' : ''}
    </div>
    <h1>${esc(g.title)}</h1>
    <p class="muted">${g.count} missed${g.skill_name ? ` in ${esc(g.skill_name)}` : ''}.</p>

    ${g.topFamilies.length ? `<div class="card">
      <h2 style="margin-top:0">What goes wrong</h2>
      ${g.topFamilies.map((f) => {
        // `label` is written to the student. `when` is an instruction to the
        // item author and is deliberately not shown here.
        const fam = state.misconceptions?.[f.slug];
        return `<div class="fam">
          <div class="fam-h"><strong>${esc(familyName(f.slug, ctx()))}</strong>
            <span class="badge on">${f.n}&times;</span></div>
          ${fam?.label ? `<p class="small">${esc(fam.label)}</p>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="tabs" role="tablist">
      ${TABS.map(([k, label, n]) => `<button class="tab ${tab === k ? 'on' : ''}"
        data-rtab="${k}" role="tab" aria-selected="${tab === k}">${label}${
          n ? ` <span class="tab-n plain">${n}</span>` : ''}</button>`).join('')}
    </div>

    ${tab === 'missed' ? g.misses.map((m) => reviewCardFor(m)).join('')
      : practiceTab(g, sets, tab, gen)}
  </div>`;

  $('#back').onclick = () => { state.reviewGroup = null; render(); };
  const t = $('#teach');
  if (t) t.onclick = () => {
    state.lesson = `sub:${g.subtype}`; state.screen = 'lesson'; render();
  };
  for (const b of document.querySelectorAll('[data-rtab]')) {
    b.onclick = () => { state.reviewTab = b.dataset.rtab; state.reviewGen = null; render(); };
  }
  const p = $('#practice');
  if (p) p.onclick = () => startReinforcement(g, tab);
  const more = $('#more');
  if (more) more.onclick = () => writeMore(g, Number(more.dataset.n), tab);
  window.scrollTo(0, 0);
}

/**
 * One of the three practice tabs.
 *
 * Each says plainly what it is and what it is for, because the difference
 * between them is the whole point: sitting the same question again is not
 * the same as sitting one that goes wrong the same way.
 */
function practiceTab(g, sets, tab, gen) {
  const COPY = {
    again: {
      items: sets.again,
      what: 'The questions you got wrong, exactly as they were.',
      why: 'Worth doing once you have read why. If you can now get them right '
         + 'for the right reason, the next tab is where the real test is.',
      short: 0,
    },
    twins: {
      items: sets.twins,
      what: 'Same question type, and built to catch the same mistake'
          + (g.topFamilies.length
              ? ` (${esc(g.topFamilies.slice(0, 2)
                  .map((f) => familyName(f.slug, ctx()).toLowerCase()).join(', '))})`
              : '') + '.',
      why: 'The closest thing to the question you missed, with everything '
         + 'else changed. This is the one that tells you whether it stuck.',
      short: sets.shortTwins,
    },
    cousins: {
      items: sets.cousins,
      what: 'Same question type, coming at it from a different direction.',
      why: 'Once the twins are going in, these check that you have the '
         + 'recognition rather than one worked pattern.',
      short: sets.shortCousins,
    },
  }[tab];
  if (!COPY) return '';

  const n = COPY.items.length;
  return `<div class="card">
    <p class="small"><strong>${COPY.what}</strong></p>
    <p class="small muted">${COPY.why}</p>
    <div class="row tight" style="margin-top:12px">
      <button class="btn-primary" id="practice" ${n ? '' : 'disabled'}>
        ${n ? `Practise ${Math.min(10, n)} question${n === 1 ? '' : 's'}`
            : 'Nothing written yet'}</button>
      ${COPY.short ? `<button class="btn ghost" id="more" data-n="${COPY.short}" ${
        gen.busy ? 'disabled' : ''}>${gen.busy
          ? '<span class="spin"></span> Writing\u2026'
          : `Write ${COPY.short} more`}</button>` : ''}
    </div>
    ${gen.error ? `<p class="small bad-text" style="margin:10px 0 0">${esc(gen.error)}</p>` : ''}
    ${gen.added ? `<p class="small" style="margin:10px 0 0">Added ${gen.added}
      new question${gen.added === 1 ? '' : 's'}.</p>` : ''}
    ${n ? `<ol class="peek">${COPY.items.slice(0, 5).map((i) =>
      `<li><span class="badge ${i.difficulty.toLowerCase()}">${
        TIER_WORD[i.difficulty]}</span> ${esc(plainStem(i))}</li>`).join('')}
      ${n > 5 ? `<li class="muted">and ${n - 5} more</li>` : ''}</ol>` : ''}
  </div>`;
}

/** A stem as one short line, for a preview list. */
function plainStem(item) {
  const t = String(item.stem ?? '').replace(/\$[^$]*\$/g, '\u2026')
    .replace(/\s+/g, ' ').trim();
  return t.length > 110 ? `${t.slice(0, 108)}\u2026` : t;
}

/** One missed question, with what they picked and why it was wrong. */
function reviewCardFor(m) {
  const i = m.item;
  const fam = m.family ? state.misconceptions?.[m.family] : null;
  const choice = (key) => i.choices['ABCD'.indexOf(key)];
  return `<div class="card">
    <div class="meta" style="margin-bottom:10px">
      <span class="badge ${i.difficulty.toLowerCase()}">${TIER_WORD[i.difficulty]}</span>
      ${m.family ? `<span class="badge on name">${esc(familyName(m.family, ctx()))}</span>` : ''}
    </div>
    ${i.stimulus || i.figure ? `<div class="stim">${
      renderStimulus(i.stimulus)}${renderFigure(i.figure)}</div>` : ''}
    <div class="q">${renderStimulus(i.stem)}</div>
    <div class="choice wrong"><b>${esc(m.attempt.chosen)}</b>
      <span>${renderStimulus(choice(m.attempt.chosen) ?? '')}</span></div>
    <div class="choice right"><b>${esc(i.answer)}</b>
      <span>${renderStimulus(choice(i.answer) ?? '')}</span></div>
    ${i.per_choice?.[m.attempt.chosen] ? `<p class="small muted" style="margin-top:10px">
      <strong>Why yours was wrong.</strong> ${renderStimulus(i.per_choice[m.attempt.chosen])}</p>` : ''}
    ${i.explanation ? `<p class="small" style="margin-top:8px">${renderStimulus(i.explanation)}</p>` : ''}
  </div>`;
}

/** A round from one of the review tabs, in the order the engine thinks pays. */
function startReinforcement(g, tab = 'twins') {
  const sets = relatedSets(g, ctx());
  const items = (sets[tab === 'missed' ? 'twins' : tab] ?? []).slice(0, 10);
  if (!items.length) return;
  state.round = {
    items, at: 0, answers: [], startedAt: Date.now(),
    tier: g.worstTier, reviewGroup: g.key, reviewTab: tab,
  };
  state.screen = 'practice';
  render();
}

/**
 * Ask the local generator for the questions the bank cannot field.
 *
 * Only works where tools/planner_server.py is running. Rather than silently
 * serving repeats as if they were new, a student without it is told the bank
 * is out.
 */
async function writeMore(g, n, kind = 'twins') {
  state.reviewGen = { busy: true };
  render();
  try {
    if (!(await generatorAvailable())) {
      throw new Error('The question writer is not running on this machine, so '
        + 'no new questions can be written right now. Everything already in '
        + 'your bank is still available above.');
    }
    const fresh = await generateMore(g, ctx(), n, kind);
    const have = new Set(state.items.map((i) => i.id));
    const added = fresh.filter((i) => !have.has(i.id));
    state.items = state.items.concat(added);
    state.reviewGen = { busy: false, added: added.length };
  } catch (e) {
    state.reviewGen = { busy: false, error: String(e.message ?? e) };
  }
  render();
}

function screenLesson() {
  const subSlug = String(state.lesson ?? '').startsWith('sub:')
    ? state.lesson.slice(4) : null;
  const source = subSlug
    ? state.subLessons[subSlug]
    : state.lessons.find((l) => l.id === state.lesson);
  if (!source) { state.screen = 'home'; return render(); }
  const built = buildLesson(source, ctx());
  const tier = built.focus;
  const unit = source.subtype ?? source.skill_cd;
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

    ${skill && !subSlug ? subtypeList(source.skill_cd) : ''}
  </div>`;

  $('#back').onclick = () => { state.screen = 'home'; render(); };
  for (const b of document.querySelectorAll('[data-tier]')) {
    b.onclick = () => startRound(unit, b.dataset.tier);
  }
  for (const b of document.querySelectorAll('[data-sublesson]')) {
    b.onclick = () => {
      state.lesson = `sub:${b.dataset.sublesson}`;
      state.screen = 'lesson';
      render();
    };
  }
  window.scrollTo(0, 0);
}

const TIER_NAME = { F: 'Foundations', E: 'Easy', M: 'Medium', H: 'Hard', X: 'Stretch' };

/**
 * The recognitions inside a skill, each with its own progress.
 *
 * This is where a diagnosis becomes actionable: "you are fine on bare systems,
 * you are losing the ones that ask for x+y" only helps if the student can open
 * the second one on its own.
 */
function subtypeList(skill_cd) {
  const subs = (state.subtypesOf?.[skill_cd] ?? [])
    .map((c) => ({ ...c, lesson: state.subLessons?.[c.slug] }))
    .filter((c) => c.lesson)
    .sort((a, b) => (b.count_total ?? 0) - (a.count_total ?? 0));
  if (!subs.length) return '';

  const row = (c) => {
    let seen = 0, correct = 0;
    for (const t of TIERS) {
      const cell = state.mastery[`${c.slug}|${t}`];
      if (cell?.seen) { seen += cell.seen; correct += cell.correct; }
    }
    const acc = seen ? Math.round((correct / seen) * 100) : null;
    const n = state.items.filter((i) => i.subtype === c.slug).length;
    return `<button class="tile sub" data-sublesson="${esc(c.slug)}">
      <div class="t">${esc(c.lesson.title)}</div>
      <div class="d">${c.count_total ?? 0} on the real test${
        n ? ` &middot; ${n} here to practise` : ' &middot; none written yet'}</div>
      <div class="meta">
        ${acc === null ? '<span class="badge">Not started</span>'
          : `<span class="badge ${acc >= 85 ? 'e' : acc >= 60 ? 'm' : 'on'}">${acc}% of ${seen}</span>`}
      </div>
    </button>`;
  };
  return `<h2>The kinds of question inside this skill</h2>
    <p class="small muted" style="margin:-4px 0 10px">Each one is recognised and
      solved differently. Your progress is tracked separately for each.</p>
    ${subs.map(row).join('')}`;
}

/**
 * Choose a level.
 *
 * The app still points at the tier it thinks pays, but every tier already
 * reached stays on offer - coming back for more practice is a choice, not a
 * demotion - and the next one up is always there to try. Progress at each
 * level is kept separately, so nothing is lost by moving on.
 */
/** How many questions exist for a unit at one level. */
function tierItems(unit, tier) {
  return state.items.filter((i) =>
    (i.subtype === unit || i.skill_cd === unit) && i.difficulty === tier).length;
}

const foundationItems = (unit) => tierItems(unit, 'F');

function levelPicker(lesson, recommended) {
  const unit = lesson.subtype ?? lesson.skill_cd;
  const { unlocked, tryable, challenge, foundation, foundationSuggested,
          stretch, stretchEarned } = availableTiers(unit, ctx());
  const btn = (t, kind) => {
    const cell = state.mastery[`${unit}|${t}`];
    const acc = cell?.seen ? Math.round((cell.correct / cell.seen) * 100) : null;
    const n = state.items.filter((i) =>
      (i.subtype === unit || i.skill_cd === unit) && i.difficulty === t).length;
    return `<button class="level ${kind}" data-tier="${t}" ${n ? '' : 'disabled'}>
      <span class="level-t">${TIER_NAME[t]}</span>
      <span class="level-d">${n ? `${n} questions` : 'none yet'}${
        acc !== null ? ` &middot; ${acc}% so far` : ''}</span>
      ${t === recommended ? '<span class="level-tag">Suggested</span>' : ''}
      ${kind === 'try' ? '<span class="level-tag try">Try it</span>' : ''}
      ${kind.startsWith('foundation') ? `<span class="level-tag foundation">${
        kind.endsWith('on') ? 'Start here' : 'Groundwork'}</span>` : ''}
      ${kind.startsWith('stretch') ? `<span class="level-tag stretch">${
        kind.endsWith('earned') ? 'You are ready' : 'Beyond the test'}</span>` : ''}
      ${kind === 'challenge' ? '<span class="level-tag challenge">Challenge</span>' : ''}
      ${kind === 'challenge' ? `<span class="level-note">Only try once you have
        completed Easy and Medium.</span>` : ''}
      ${kind.startsWith('foundation') ? `<span class="level-note">The skill
        underneath, without the test wrapped around it. Not exam questions
        &mdash; the thing they assume you can already do.</span>` : ''}
      ${kind.startsWith('stretch') ? `<span class="level-note">Harder than the
        exam goes. For the last few marks, once Hard is reliable.</span>` : ''}
    </button>`;
  };
  return `
    <p class="small muted">Start where it pays, and move up when you are ready.
      Everything you have practised stays here &mdash; come back any time.</p>
    <div class="levels">
      ${foundationItems(unit) ? btn(foundation,
        foundationSuggested ? 'foundation on' : 'foundation') : ''}
      ${unlocked.map((t) => btn(t, 'open')).join('')}
      ${tryable ? btn(tryable, 'try') : ''}
      ${challenge ? btn(challenge, 'challenge') : ''}
      ${tierItems(unit, stretch) ? btn(stretch,
        stretchEarned ? 'stretch earned' : 'stretch') : ''}
    </div>`;
}

function tierExplanation(lesson, tier) {
  const skill = state.skills[lesson.skill_cd];
  if (!skill) return '';
  const section = skill.section === 'rw' ? 'Reading & Writing' : 'Math';
  const acc = accuracyFor(lesson.subtype ?? lesson.skill_cd, tier);
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

/**
 * A round at one level.
 *
 * `unit` is a skill code or a subtype slug - the same two things mastery is
 * keyed on. Opening the Transitions lesson should practise all of
 * Transitions; opening "expectation, then surprise" should practise only
 * that, or the recognition lesson is decoration.
 */
function startRound(unit, tier) {
  // A chosen tier is honoured as chosen. The engine ranks within it rather
  // than overriding it - the student asked for this level.
  const pool = state.items.filter((i) =>
    (i.subtype === unit || i.skill_cd === unit) && i.difficulty === tier);
  const ranked = selectRound(pool, ctx(), { size: window.CONFIG.ROUND_SIZE, maxPerSkill: 99 });
  state.round = {
    items: (ranked.length ? ranked : pool).slice(0, window.CONFIG.ROUND_SIZE),
    at: 0, answers: [], startedAt: Date.now(), tier, unit,
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
  const grid = isGrid(item);
  const correctNow = grid ? gridMatches(picked, item.keys) : picked === item.answer;

  app.innerHTML = `<div class="wrap${item.figure || item.table ? ' wide' : ''}">
    ${previewBanner()}
    <div class="spread" style="margin-bottom:12px">
      <button class="btn-sm" id="quit">&larr; Back</button>
      <span class="tiny muted">${r.at + 1} of ${r.items.length}
        &middot; <span class="badge ${item.difficulty.toLowerCase()}">${item.difficulty}</span></span>
    </div>
    <div class="bar thin"><i style="width:${Math.round(r.at / r.items.length * 100)}%"></i></div>

    <div class="card" style="margin-top:14px">
      ${item.stimulus || item.figure ? `<div class="stim">${
        renderStimulus(item.stimulus)}${renderFigure(item.figure)}</div>` : ''}
      <div class="q">${renderStimulus(item.stem)}</div>
      ${grid ? gridEntry(item, picked, revealed, correctNow)
        : (item.choices ?? []).map((c, i) => {
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
    const back = state.round?.reviewGroup ? 'review'
      : state.round?.assignment ? 'home' : 'lesson';
    state.round = null; state.screen = back; render();
  };
  for (const b of document.querySelectorAll('.choice')) {
    b.onclick = () => answer(b.dataset.key);
  }
  const box = $('#grid-in');
  if (box) {
    box.focus();
    const send = () => { if (box.value.trim()) answer(box.value.trim()); };
    $('#grid-go').onclick = send;
    box.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } };
  }
  const n = $('#next');
  if (n) n.onclick = () => { r.at++; render(); };
  window.scrollTo(0, 0);
}

async function answer(key) {
  const r = state.round;
  const item = r.items[r.at];
  const grid = isGrid(item);
  const correct = grid ? gridMatches(key, item.keys) : key === item.answer;
  r.answers[r.at] = key;

  // Mastery is recorded at both levels, because both are real units of
  // progress. The skill drives the home ranking; the recognition drives its
  // own lesson, its promotion streak and the review screen. Recording only
  // the skill is what left every subtype reading "Not started" no matter how
  // much the student practised it.
  const units = [item.skill_cd, item.subtype].filter(Boolean);
  const cells = {};
  for (const u of units) {
    const k = `${u}|${item.difficulty}`;
    cells[k] = updateMastery(state.mastery[k], correct);
    state.mastery[k] = cells[k];
  }
  const cellKey = `${item.skill_cd}|${item.difficulty}`;
  const cell = cells[cellKey];

  const row = { content_id: item.id, correct, chosen: key,
                ms: Date.now() - (r.itemStart ?? r.startedAt) };
  state.attempts.unshift({ ...row, created_at: new Date().toISOString() });

  // A miss whose wrong choice is tagged becomes a fingerprint, so practice
  // feeds the same pattern detection as an uploaded Bluebook result. Three
  // transition-logic misses surface the trap card whether they happened here
  // or on a real test.
  // A grid-in has no letters, so the diagnosis is keyed on the value typed.
  // Without this a wrong entry would be recorded as an untagged miss and the
  // review screen would have nothing to say about it.
  const family = correct ? null
    : grid ? gridDiagnose(key, item)?.family ?? null
    : item.misconceptions?.[key];
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
    for (const [k, c] of Object.entries(cells)) await store.saveMastery(k, c);
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
  if (isGrid(item)) return gridExplanation(item, picked, correct);
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

/**
 * The entry box for a student-produced response.
 *
 * Deliberately not an input that validates as you type. The exam gives you a
 * box and no feedback until you move on, and a field that goes green early
 * hands back the confirmation the format is designed to withhold.
 */
function gridEntry(item, typed, revealed, correct) {
  if (revealed) {
    return `<div class="grid-row">
      <div class="grid-box ${correct ? 'right' : 'wrong'}">${esc(typed)}</div>
      ${correct ? '' : `<div class="grid-ans">Answer:
        <strong>${esc(String(item.keys?.[0] ?? ''))}</strong>${
        (item.keys ?? []).length > 1
          ? ` <span class="tiny muted">(or ${(item.keys ?? []).slice(1)
              .map((k) => esc(String(k))).join(', ')})</span>` : ''}</div>`}
    </div>`;
  }
  return `<div class="grid-row">
    <input id="grid-in" class="grid-box" type="text" inputmode="decimal"
      maxlength="${MAX_LEN}" autocomplete="off" spellcheck="false"
      aria-label="Your answer" placeholder="&mdash;">
    <button class="btn-primary" id="grid-go">Check</button>
  </div>
  <p class="tiny muted" style="margin:8px 0 0">No choices &mdash; type the
    value. A fraction or a decimal is fine${item.any_of
      ? ', and more than one answer is correct here, so give one'
      : ''}. No units, no commas.</p>`;
}

/** The same diagnosis a four-choice item gets, keyed on the value typed. */
function gridExplanation(item, typed, correct) {
  const parts = item.per_choice ?? {};
  const hit = correct ? null : gridDiagnose(typed, item);
  const named = hit ? state.misconceptions?.[hit.family] : null;
  const mine = hit && parts[hit.value] ? `
    <div class="why why-yours">
      <div class="why-h">Where ${esc(String(typed))} comes from</div>
      ${named ? `<p class="why-name">${md(named.label)}</p>` : ''}
      ${renderHtml(parts[hit.value])}
    </div>` : (!correct ? `
    <div class="why why-yours">
      <div class="why-h">Not quite</div>
      <p class="small">That is not one of the values this question can produce.
        Work back through the method below and find where yours diverged.</p>
    </div>` : '');
  const others = Object.keys(item.misconceptions ?? {})
    .filter((v) => v !== hit?.value && parts[v]);
  return `${mine}
    <div class="why">
      <div class="why-h">${correct ? 'Why that is right' : 'How to get there'}</div>
      ${renderHtml(parts.correct ?? '')}
    </div>
    ${others.length ? `<details class="why-more">
      <summary>Values students often land on instead</summary>
      ${others.map((v) => `<div class="why-alt">
        <div class="why-h">${esc(v)}</div>${renderHtml(parts[v])}</div>`).join('')}
    </details>` : ''}`;
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
  // Promotion belongs to whatever the student chose to practise, which the
  // round recorded. Falling back to the first item's subtype would promote a
  // skill-wide round on the strength of one recognition.
  const unit = r.unit ?? r.items[0]?.subtype ?? r.items[0]?.skill_cd;
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
      <button id="lesson">${r.reviewGroup
        ? 'Back to your mistakes' : 'Back to the lesson'}</button>
      <button id="home">All lessons</button>
    </div>
  </div></div>`;

  const up = $('#level-up');
  if (up) up.onclick = async () => {
    const key = `${unit}|${offer.to}`;
    state.unlocked = { ...(state.unlocked ?? {}), [key]: new Date().toISOString() };
    try { await store.unlock(key); } catch { /* kept locally regardless */ }
    startRound(unit, offer.to);
  };
  const stay = $('#stay');
  if (stay) stay.onclick = () => startRound(unit, r.tier);

  const src = state.lessons.find((l) => l.id === state.lesson);
  // A review round came from a mistake, not from a lesson, so "another round"
  // means ten more of that mistake - and there may be no lesson to go back to.
  const group = r.reviewGroup
    ? missGroups(ctx()).find((g) => g.key === r.reviewGroup) : null;
  $('#again').onclick = () => {
    state.round = null;
    if (group) return startReinforcement(group, r.reviewTab ?? 'twins');
    if (r.assignment) return startAssignment(r.assignment.id);
    if (r.unit) return startRound(r.unit, r.tier);
    if (src) return startRound(src.skill_cd, r.tier ?? focusTier(src, ctx()));
    state.screen = 'home'; render();
  };
  $('#lesson').onclick = () => {
    state.round = null;
    state.screen = r.reviewGroup ? 'review' : 'lesson';
    render();
  };
  $('#home').onclick = () => { state.round = null; state.screen = 'home'; render(); };
}

// ---------------------------------------------------------------------------

function render() {
  const s = state.screen;
  if (s === 'signin') return screenSignIn();
  if (s === 'setup') return screenSetup();
  if (s === 'lesson') return screenLesson();
  if (s === 'practice') return screenPractice();
  if (s === 'review') return state.reviewGroup ? screenReviewGroup() : screenReview();
  return screenHome();
}

async function loadData() {
  const [bands, skills, lessons, sublessons, items, misc, subtax, subcounts] =
    await Promise.all([
    fetch('../data/bands.json?v=051738a6fd').then((r) => r.json()),
    fetch('../data/skills.json?v=051738a6fd').then((r) => r.json()),
    fetch('../data/lessons.json?v=051738a6fd').then((r) => r.json()),
    fetch('../data/subtype_lessons.json?v=051738a6fd').then((r) => r.json())
      .catch(() => ({ lessons: [] })),
    // Our own CC BY items. The College Board pool is deliberately not loaded:
    // it cannot be served to students (docs/LICENSING.md section 4).
    fetch('../data/practice.json?v=051738a6fd').then((r) => r.json()).catch(() => ({ items: [] })),
    fetch('../data/misconceptions.json?v=051738a6fd').then((r) => r.json()).catch(() => ({ families: [] })),
    fetch('../data/subtypes.json?v=051738a6fd').then((r) => r.json()).catch(() => ({ skills: {} })),
    fetch('../data/subtype_counts.json?v=051738a6fd').then((r) => r.json()).catch(() => ({ subtypes: {} })),
  ]);
  state.misconceptions = Object.fromEntries((misc.families ?? []).map((f) => [f.slug, f]));
  state.bands = bands;
  state.skills = Object.fromEntries(skills.skills.map((s) => [s.skill_cd, s]));
  state.lessons = lessons.lessons;

  // Subtype metadata: the engine keys mastery on it, and the lesson view names
  // the recognition a student is practising. Built after state.skills, since
  // the counts name their skill in prose and have to be joined back to a code.
  state.subtypes = subcounts.subtypes ?? {};
  state.subtypeInfo = {};
  for (const [skill, v] of Object.entries(subtax.skills ?? {})) {
    for (const st of v.subtypes ?? []) state.subtypeInfo[st.slug] = { ...st, skill };
  }
  state.subtypesOf = {};
  for (const [slug, c] of Object.entries(state.subtypes)) {
    const sk = Object.values(state.skills).find((s) => s.skill_name === c.skill);
    if (!sk) continue;
    (state.subtypesOf[sk.skill_cd] ??= []).push({ ...c, slug });
  }

  // One lesson per recognition, so what the diagnosis names is what the
  // student can open. Keyed by subtype, shown inside the skill's lesson.
  state.subLessons = {};
  for (const l of sublessons.lessons ?? []) state.subLessons[l.subtype] = l;
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
