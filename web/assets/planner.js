// ---------------------------------------------------------------------------
// Lesson planner - the teacher portal's chat.
//
// Talks to tools/planner_server.py on localhost, which proxies to the
// teacher's own Claude session. Teacher-only and local by design: no API key,
// nothing leaves the machine, and students never reach it.
//
// The planner answers two kinds of request. "Plan me an hour on circles for a
// student going 1000 to 1300" returns structure, strategy and timing. "Give my
// student hard circle questions" returns a proposal with a machine-readable
// block, which the teacher approves before it becomes a real assignment - the
// model never writes to a student's account directly.
// ---------------------------------------------------------------------------

import { escapeHtml as esc, renderText } from './mathfmt.js?v=1ca24ebc7b';

const PLANNER = 'http://localhost:8791';

export const plannerState = { messages: [], busy: false, pending: null, error: null };

export async function plannerHealthy() {
  try {
    const r = await fetch(`${PLANNER}/health`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

/**
 * Send a message to the planner.
 *
 * `onStart` fires before the request so the caller can paint the pending state.
 * Without it the UI only redraws once the whole call returns, which on a
 * planning request is one to three minutes of the page looking dead - you
 * click Send and nothing happens.
 */
export async function sendToPlanner(text, focus, onStart) {
  plannerState.messages.push({ role: 'user', content: text });
  plannerState.busy = true;
  plannerState.error = null;
  plannerState.startedAt = Date.now();
  if (onStart) onStart();
  try {
    const r = await fetch(`${PLANNER}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: plannerState.messages, focus }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `planner returned ${r.status}`);
    plannerState.messages.push({ role: 'assistant', content: data.reply });
    plannerState.pending = data.assignment ?? null;
  } catch (e) {
    plannerState.error = e.message;
  } finally {
    plannerState.busy = false;
    plannerState.startedAt = null;
  }
}

/** Subtype slug -> the name a teacher would say. Set once the data loads. */
export const subtypeNames = {};

export function setSubtypeNames(map) {
  Object.assign(subtypeNames, map);
}

/**
 * Replace bare subtype slugs with their plain names.
 *
 * The planner cites slugs because that is how the data is keyed, but
 * "read-center-radius-standard-form" is not how a teacher reads a lesson plan.
 */
function humanizeSlugs(line) {
  return line.replace(/`?\b([a-z0-9]+(?:-[a-z0-9]+){2,})\b`?/g, (m, slug) =>
    subtypeNames[slug] ? subtypeNames[slug] : m);
}

/**
 * Light markdown for the reply: headings, bold, lists, and fenced blocks.
 *
 * The ```json block is dropped. It is the machine-readable assignment, already
 * parsed and shown as the approval card above - printing it again dumps a wall
 * of ids and quoting into the middle of a lesson plan.
 */
export function renderPlan(md) {
  const out = [];
  let list = null, code = null;
  const flush = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };

  let fenceLang = '';
  for (const raw of String(md ?? '').split('\n')) {
    if (raw.trim().startsWith('```')) {
      if (code === null) {
        flush();
        code = [];
        fenceLang = raw.trim().slice(3).trim().toLowerCase();
      } else {
        // The JSON payload belongs to the approval card, not the transcript.
        if (fenceLang !== 'json') {
          out.push(`<pre class="plan-code">${esc(code.join('\n'))}</pre>`);
        }
        code = null;
        fenceLang = '';
      }
      continue;
    }
    if (code !== null) { code.push(raw); continue; }

    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h4 class="plan-h">${renderText(humanizeSlugs(h[2]))}</h4>`); continue; }
    if (/^[-*]\s+/.test(line)) {
      (list ??= []).push(`<li>${renderText(humanizeSlugs(line.replace(/^[-*]\s+/, '')))}</li>`);
      continue;
    }
    const n = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (n) { (list ??= []).push(`<li>${renderText(humanizeSlugs(n[2]))}</li>`); continue; }
    flush();
    out.push(`<p>${renderText(humanizeSlugs(line))}</p>`);
  }
  flush();
  if (code && fenceLang !== 'json') {
    out.push(`<pre class="plan-code">${esc(code.join('\n'))}</pre>`);
  }
  return out.join('');
}

/**
 * Split a reply into units, when it is a multi-week course.
 *
 * The planner emits "## Unit N: title (45 min)" headings; each becomes a panel
 * the teacher can open on its own rather than scrolling one long document.
 * Anything before the first unit is the course overview.
 */
export function splitUnits(md) {
  const text = String(md ?? '');
  const re = /^##\s*Unit\s*(\d+)\s*:\s*(.+?)\s*(?:\((\d+)\s*min\))?\s*$/gim;
  const marks = [...text.matchAll(re)];
  if (marks.length < 2) return null;
  const units = marks.map((m, i) => ({
    n: Number(m[1]),
    title: m[2],
    minutes: m[3] ? Number(m[3]) : null,
    body: text.slice(m.index + m[0].length,
                     i + 1 < marks.length ? marks[i + 1].index : text.length).trim(),
  }));
  return { intro: text.slice(0, marks[0].index).trim(), units };
}

export const STARTERS = [
  'Build a four-week course, four hours a week, on circles and geometry for a ' +
    'student at 1000 aiming for 1300. One unit per session.',
  'Plan a one-hour lesson on circles for a student at 1000 aiming for 1300. ' +
    'Separate the geometry ones from the graph ones and tell me where Desmos is the fast route.',
  'My student keeps missing transitions. What is the overarching structure ' +
    'I should teach, and what practice should follow it?',
  'Give this student hard systems-of-equations work, focused on the ones that ' +
    'ask for x+y rather than x.',
  'What should I teach first to move a 1150 student to 1300? Rank by points per hour.',
];


// ---------------------------------------------------------------------------
// Live agent feed
//
// Polled rather than loaded once, so a run that starts misbehaving surfaces
// while it is still running. Falls back to the static data/agent_feed.json
// when the local helper is not up, so the tab still works - it just stops
// being live.
// ---------------------------------------------------------------------------

export async function fetchAgentFeed() {
  try {
    const r = await fetch(`${PLANNER}/agents`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) return { ...(await r.json()), live: true };
  } catch { /* helper not running */ }
  try {
    const r = await fetch('../data/agent_feed.json', { cache: 'no-store' });
    if (r.ok) return { ...(await r.json()), live: false };
  } catch { /* no feed yet */ }
  return { runs: [], summary: {}, live: false };
}

/** Alert ids already shown, so the same one does not pop twice. */
const SEEN_KEY = 'satai.seenAlerts';

function seen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) ?? []); }
  catch { return new Set(); }
}

export function alertKey(run, alert) {
  return `${run.id}:${alert.text.slice(0, 60)}`;
}

/** Alerts that have appeared since the last time the dashboard looked. */
export function newAlerts(feed) {
  const already = seen();
  const out = [];
  for (const r of feed.runs ?? []) {
    for (const a of r.alerts ?? []) {
      const k = alertKey(r, a);
      if (!already.has(k)) out.push({ run: r, alert: a, key: k });
    }
  }
  return out;
}

export function markSeen(keys) {
  const all = seen();
  for (const k of keys) all.add(k);
  // Keep the list from growing without bound.
  localStorage.setItem(SEEN_KEY, JSON.stringify([...all].slice(-400)));
}

/**
 * A desktop notification, so a bad run is caught even when the dashboard is
 * not the focused tab. Permission is only ever requested after the teacher
 * clicks the bell - asking on page load is the behaviour everyone blocks.
 */
export async function enableDesktopAlerts() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function desktopAlertsOn() {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function popDesktop(items) {
  if (!desktopAlertsOn()) return;
  for (const { run, alert } of items.slice(0, 3)) {
    try {
      new Notification('SAT platform — agent needs a look', {
        body: `${run.kind}: ${alert.text}`.slice(0, 180),
        tag: alertKey(run, alert),
      });
    } catch { /* notification blocked */ }
  }
}
