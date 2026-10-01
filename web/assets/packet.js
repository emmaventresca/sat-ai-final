// ---------------------------------------------------------------------------
// The teaching packet.
//
// The planner returns a lesson SPEC - which subtypes, in what order, for how
// many minutes, with which questions - and this renders it. The prose that
// makes a packet useful comes from the platform's own data rather than from
// the model: spot-it cues are the subtype's tell, the moves are its method and
// Desmos route, the trap is its trap, and the worksheet is real verified items
// with their own explanations.
//
// That split matters. Asking a model to write all of it each time is slower,
// drifts between runs, and can describe a question that does not exist. Asking
// it only for structure and judgement keeps every factual line traceable to
// the corpus.
// ---------------------------------------------------------------------------

import { renderText, escapeHtml as esc } from './mathfmt.js?v=1ca24ebc7b';
import { renderStimulus } from './mathfmt.js?v=1ca24ebc7b';

const LETTERS = 'ABCD';
const TIER = { E: 'Easy', M: 'Medium', H: 'Hard' };

const bullets = (text) => String(text ?? '')
  .split(/(?:\.\s+(?=[A-Z])|\n|;\s+)/)
  .map((s) => s.trim().replace(/\.$/, ''))
  .filter((s) => s.length > 12)
  .slice(0, 5);

/** A lesson spec -> a printable packet. `data` carries subtypes and items. */
export function renderPacket(spec, data) {
  const { subtypeInfo = {}, items = [] } = data;
  const byId = new Map(items.map((i) => [i.id, i]));
  const blocks = (spec.blocks ?? []).map((b) => ({
    ...b,
    info: subtypeInfo[b.subtype] ?? null,
    questions: (b.items ?? []).map((id) => byId.get(id)).filter(Boolean),
  }));

  const total = blocks.reduce((n, b) => n + (b.minutes ?? 0), 0);
  let clock = 0;
  const schedule = blocks.map((b) => {
    const from = clock; clock += b.minutes ?? 0;
    return { ...b, from, to: clock };
  });

  const allQuestions = schedule.flatMap((b) => b.questions);

  return `
<article class="packet">
  <header class="packet-head">
    <div class="packet-kicker">SAT &middot; ${esc(String(spec.minutes ?? total))}-minute lesson</div>
    <h1 class="packet-title">${esc(spec.title ?? 'Lesson')}</h1>
    ${spec.subtitle ? `<p class="packet-sub">${esc(spec.subtitle)}</p>` : ''}
    ${spec.student ? `<p class="packet-sub">Written for a student at
      <strong>${esc(String(spec.student.from))}</strong> aiming for
      <strong>${esc(String(spec.student.to))}</strong>.</p>` : ''}
  </header>

  ${spec.opening ? `<section class="packet-note">
    <h3>How to open</h3><p>${renderText(spec.opening)}</p></section>` : ''}

  <section class="packet-section">
    <h2>How to run the ${esc(String(spec.minutes ?? total))} minutes</h2>
    <table class="packet-table"><thead><tr>
      <th>Time</th><th>Block</th><th class="num">Questions</th>
    </tr></thead><tbody>
      ${schedule.map((b) => `<tr>
        <td class="num">${b.from}&ndash;${b.to}</td>
        <td>${esc(b.info?.name ?? b.subtype)}</td>
        <td class="num">${b.questions.length || '&mdash;'}</td>
      </tr>`).join('')}
    </tbody></table>
  </section>

  <section class="packet-section">
    <h2>Part 1 &middot; The playbook</h2>
    ${schedule.map((b, i) => renderBlock(b, i + 1)).join('')}
  </section>

  ${spec.checklist?.length ? `<section class="packet-checklist">
    <h3>Before every hard question</h3>
    <ul>${spec.checklist.map((c) => `<li>${renderText(c)}</li>`).join('')}</ul>
  </section>` : ''}

  ${allQuestions.length ? `<section class="packet-section packet-break">
    <h2>Part 2 &middot; Worksheet</h2>
    <p class="packet-sub">In increasing difficulty. Answers and full
      explanations follow.</p>
    ${allQuestions.map((q, i) => renderQuestion(q, i + 1)).join('')}
  </section>

  <section class="packet-section packet-break">
    <h2>Part 3 &middot; Answer key</h2>
    <table class="packet-table"><thead><tr>
      <th class="num">#</th><th>Answer</th><th>Tests</th><th>Level</th>
    </tr></thead><tbody>
      ${allQuestions.map((q, i) => `<tr>
        <td class="num">${i + 1}</td><td><strong>${esc(q.answer)}</strong></td>
        <td>${esc(subtypeInfo[q.subtype]?.name ?? q.subtype ?? '')}</td>
        <td>${esc(TIER[q.difficulty] ?? q.difficulty)}</td>
      </tr>`).join('')}
    </tbody></table>
    ${allQuestions.map((q, i) => renderSolution(q, i + 1)).join('')}
  </section>` : `<section class="packet-note">
    <h3>Worksheet</h3>
    <p>No questions were attached to this lesson. The blocks above name the
       subtypes to author items for.</p></section>`}

  ${spec.closing ? `<section class="packet-note">
    <h3>How to close</h3><p>${renderText(spec.closing)}</p></section>` : ''}
</article>`;
}

function renderBlock(b, n) {
  const info = b.info;
  const spot = bullets(info?.tell);
  const moves = bullets(info?.method);
  return `
  <div class="packet-block">
    <div class="packet-block-head">
      <span class="packet-num">${n}</span>
      <h3>${esc(info?.name ?? b.subtype)}</h3>
      ${b.minutes ? `<span class="packet-min">${b.minutes} min</span>` : ''}
    </div>
    ${b.why ? `<p class="packet-why">${renderText(b.why)}</p>` : ''}
    <div class="packet-cols">
      ${spot.length ? `<div><div class="packet-label">Spot it</div>
        <ul>${spot.map((s) => `<li>${renderText(s)}</li>`).join('')}</ul></div>` : ''}
      ${moves.length ? `<div><div class="packet-label">Your moves</div>
        <ul>${moves.map((s) => `<li>${renderText(s)}</li>`).join('')}</ul></div>` : ''}
    </div>
    ${info?.desmos && info.desmos !== 'None' ? `<p class="packet-desmos">
      <strong>Desmos.</strong> ${renderText(info.desmos)}</p>` : ''}
    ${info?.trap ? `<p class="packet-trap"><strong>Classic trap.</strong>
      ${renderText(info.trap)}</p>` : ''}
    ${b.teach ? `<p class="packet-teach"><strong>In the block.</strong>
      ${renderText(b.teach)}</p>` : ''}
    ${info?.count_total ? `<p class="packet-seen">On the real test:
      ${info.count_total} questions of this type
      (${info.count_e} easy &middot; ${info.count_m} medium &middot; ${info.count_h} hard)</p>` : ''}
  </div>`;
}

function renderQuestion(q, n) {
  return `
  <div class="packet-q">
    <div class="packet-q-num">${n}<span class="packet-q-tier">${esc(q.difficulty)}</span></div>
    <div class="packet-q-body">
      ${q.stimulus ? `<div class="packet-stim">${renderStimulus(q.stimulus)}</div>` : ''}
      <div class="packet-stem">${renderStimulus(q.stem)}</div>
      <ol class="packet-choices">
        ${q.choices.map((c) => `<li>${renderStimulus(c)}</li>`).join('')}
      </ol>
    </div>
  </div>`;
}

function renderSolution(q, n) {
  const pc = q.per_choice ?? {};
  const wrong = LETTERS.slice(0, q.choices.length).split('')
    .filter((L) => L !== q.answer && pc[L]);
  return `
  <div class="packet-sol">
    <div class="packet-label">${n}. Answer ${esc(q.answer)}</div>
    ${pc.correct ? `<div class="packet-sol-body">${renderStimulus(stripTags(pc.correct))}</div>` : ''}
    ${wrong.length ? `<ul class="packet-sol-wrong">
      ${wrong.map((L) => `<li><strong>${esc(L)}.</strong>
        ${renderStimulus(stripTags(pc[L]))}</li>`).join('')}
    </ul>` : ''}
  </div>`;
}

/** Explanations are stored wrapped in <p>; the packet supplies its own. */
function stripTags(html) {
  return String(html ?? '').replace(/<\/?p[^>]*>/gi, '').trim();
}
