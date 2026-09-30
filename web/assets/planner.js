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

import { escapeHtml as esc, renderText } from './mathfmt.js';

const PLANNER = 'http://localhost:8791';

export const plannerState = { messages: [], busy: false, pending: null, error: null };

export async function plannerHealthy() {
  try {
    const r = await fetch(`${PLANNER}/health`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch { return false; }
}

export async function sendToPlanner(text, focus) {
  plannerState.messages.push({ role: 'user', content: text });
  plannerState.busy = true;
  plannerState.error = null;
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
  }
}

/** Light markdown for the reply: headings, bold, lists, and fenced blocks. */
export function renderPlan(md) {
  const out = [];
  let list = null, code = null;
  const flush = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };

  for (const raw of String(md ?? '').split('\n')) {
    if (raw.trim().startsWith('```')) {
      if (code === null) { flush(); code = []; }
      else { out.push(`<pre class="plan-code">${esc(code.join('\n'))}</pre>`); code = null; }
      continue;
    }
    if (code !== null) { code.push(raw); continue; }

    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); out.push(`<h4 class="plan-h">${renderText(h[2])}</h4>`); continue; }
    if (/^[-*]\s+/.test(line)) { (list ??= []).push(`<li>${renderText(line.replace(/^[-*]\s+/, ''))}</li>`); continue; }
    const n = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (n) { (list ??= []).push(`<li>${renderText(n[2])}</li>`); continue; }
    flush();
    out.push(`<p>${renderText(line)}</p>`);
  }
  flush();
  if (code) out.push(`<pre class="plan-code">${esc(code.join('\n'))}</pre>`);
  return out.join('');
}

export const STARTERS = [
  'Plan a one-hour lesson on circles for a student at 1000 aiming for 1300. ' +
    'Separate the geometry ones from the graph ones and tell me where Desmos is the fast route.',
  'My student keeps missing transitions. What is the overarching structure ' +
    'I should teach, and what practice should follow it?',
  'Give this student hard systems-of-equations work, focused on the ones that ' +
    'ask for x+y rather than x.',
  'What should I teach first to move a 1150 student to 1300? Rank by points per hour.',
];
