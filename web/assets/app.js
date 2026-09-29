// ---------------------------------------------------------------------------
// Student app.
//
// Screens: sign-in -> setup (where are you, where are you going) -> home ->
// lesson or practice. Everything a student sees is filtered through the same
// two ideas as the rest of the project: show what their target requires, and
// do not teach what they have already shown they know.
// ---------------------------------------------------------------------------

import { makeStore, configured } from './store.js';
import { scoreItem, selectRound, updateMastery, bandWeights, TIERS } from './engine.js';
import { buildLesson, focusTier, rankLessons } from './lessons.js';
import { renderText as md, renderBody, renderHtml, escapeHtml as esc } from './mathfmt.js';

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
    student: state.profile ?? {}, fingerprints: state.fingerprints, now: new Date(),
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

function screenHome() {
  const p = state.profile;
  const withSkill = state.lessons.filter((l) => l.skill_cd && state.skills[l.skill_cd]);
  const ranked = rankLessons(withSkill, ctx(), scoreItem);
  const pinned = state.lessons.filter((l) => l.pinned);

  const mathW = bandWeights(state.bands, 'math', p.target_math);
  const rwW = bandWeights(state.bands, 'rw', p.target_rw);
  const plan = (w) => TIERS.filter((t) => (w[t] ?? 0) > 0.02).join(' + ') || 'E';

  const done = state.attempts.length;
  const right = state.attempts.filter((a) => a.correct).length;

  app.innerHTML = `<div class="wrap">
    <div class="top">
      <div><h1>SAT Practice</h1>
        <p class="who">${esc(p.full_name ?? p.email ?? 'Signed in')}${
          store.mode === 'local' ? ' &middot; local mode' : ''}</p></div>
      <div class="row tight">
        <button class="btn-sm" id="settings">Scores</button>
        <button class="btn-sm" id="out">Sign out</button>
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

    ${pinned.length ? `<h2>Start here</h2>
      ${pinned.map((l) => tile(l, null)).join('')}` : ''}

    <h2>Your lessons, in the order that pays</h2>
    ${ranked.length
      ? ranked.map(({ lesson }) => tile(lesson, focusTier(lesson, ctx()))).join('')
      : '<div class="card empty">No lessons available yet.</div>'}
  </div>`;

  $('#out').onclick = async () => { await store.signOut(); location.reload(); };
  $('#settings').onclick = () => { state.screen = 'setup'; render(); };
  for (const el of document.querySelectorAll('[data-lesson]')) {
    el.onclick = () => {
      state.lesson = el.dataset.lesson;
      state.screen = 'lesson';
      render();
    };
  }
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
      <p class="small muted">Questions drawn from this skill at the level you are
        working at. ${esc(skill.bank_total ?? 0)} official items exist for it.</p>
      <button class="btn-primary" id="practice">Practice ${esc(tier)} questions</button>
    </div>` : ''}
  </div>`;

  $('#back').onclick = () => { state.screen = 'home'; render(); };
  const pb = $('#practice');
  if (pb) pb.onclick = () => startRound(source.skill_cd, tier);
  window.scrollTo(0, 0);
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

function startRound(skill_cd, tier) {
  const pool = state.items.filter((i) => i.skill_cd === skill_cd);
  const chosen = selectRound(pool, ctx(), { size: window.CONFIG.ROUND_SIZE, maxPerSkill: 99 });
  const fallback = pool.filter((i) => i.difficulty === tier);
  state.round = {
    items: (chosen.length ? chosen : fallback).slice(0, window.CONFIG.ROUND_SIZE),
    at: 0, answers: [], startedAt: Date.now(),
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

  app.innerHTML = `<div class="wrap${item.figure || item.table ? ' wide' : ''}">
    <div class="spread" style="margin-bottom:12px">
      <button class="btn-sm" id="quit">&larr; Back</button>
      <span class="tiny muted">${r.at + 1} of ${r.items.length}
        &middot; <span class="badge ${item.difficulty.toLowerCase()}">${item.difficulty}</span></span>
    </div>
    <div class="bar thin"><i style="width:${Math.round(r.at / r.items.length * 100)}%"></i></div>

    <div class="card" style="margin-top:14px">
      ${item.stimulus ? `<div class="stim">${renderHtml(item.stimulus)}</div>` : ''}
      <div class="q">${renderHtml(item.stem)}</div>
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
      ${revealed ? `<div class="why">${renderHtml(item.rationale ?? '')}</div>` : ''}
    </div>

    ${revealed ? `<div class="row" style="margin-top:12px">
      <button class="btn-primary grow" id="next">
        ${r.at + 1 === r.items.length ? 'Finish' : 'Next question'}</button>
    </div>` : ''}
  </div>`;

  $('#quit').onclick = () => { state.round = null; state.screen = 'lesson'; render(); };
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

  render();
  try {
    await store.saveMastery(cellKey, cell);
    await store.logAttempt(row);
  } catch { /* queued by the store */ }
}

function screenResult() {
  const r = state.round;
  const right = r.items.filter((it, i) => r.answers[i] === it.answer).length;
  const pct = Math.round(right / r.items.length * 100);

  app.innerHTML = `<div class="wrap"><div class="card" style="text-align:center">
    <h1>${right} of ${r.items.length}</h1>
    <div class="bar good" style="max-width:280px;margin:14px auto"><i style="width:${pct}%"></i></div>
    <p class="muted small">${
      pct >= 85 ? 'Strong. This tier is close to secure &mdash; the next round will move you up.'
      : pct >= 60 ? 'Solid. The ones you missed are back in the queue and will come round again soon.'
      : 'Worth slowing down here. Reread the lesson before the next round.'}</p>
    <div class="row" style="justify-content:center;margin-top:16px">
      <button class="btn-primary" id="again">Another round</button>
      <button id="lesson">Back to the lesson</button>
      <button id="home">All lessons</button>
    </div>
  </div></div>`;

  const src = state.lessons.find((l) => l.id === state.lesson);
  $('#again').onclick = () => startRound(src.skill_cd, focusTier(src, ctx()));
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
  const [bands, skills, lessons, items] = await Promise.all([
    fetch('../data/bands.json').then((r) => r.json()),
    fetch('../data/skills.json').then((r) => r.json()),
    fetch('../data/lessons.json').then((r) => r.json()),
    fetch('../data/items.json').then((r) => r.json()).catch(() => ({ items: [] })),
  ]);
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

    [state.mastery, state.attempts, state.fingerprints] = await Promise.all([
      store.mastery(), store.attempts(), store.fingerprints(),
    ]);

    state.screen = state.profile.target_rw && state.profile.target_math ? 'home' : 'setup';
    render();
  } catch (e) {
    app.innerHTML = `<div class="center"><div class="card">
      <h1>Something went wrong</h1><p class="err">${esc(e.message ?? e)}</p></div></div>`;
  }
}

boot();
