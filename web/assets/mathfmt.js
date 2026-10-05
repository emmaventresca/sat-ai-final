// ---------------------------------------------------------------------------
// Text rendering: light markdown plus $...$ maths, typeset with KaTeX.
//
// Order matters. Maths is pulled out *first*, before escaping and before the
// markdown pass, because LaTeX is full of characters both of those would
// mangle - braces, backslashes, carets, underscores, and asterisks that are not
// emphasis.
// ---------------------------------------------------------------------------

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Inline markdown. Runs only on non-maths text. */
function markdown(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Typeset one expression, wrapped in a chip.
 *
 * The chip is the thing that makes maths readable inside a sentence: it keeps
 * an equation together as one visual unit instead of letting it dissolve into
 * the surrounding prose, and it never breaks across a line.
 */
function typeset(latex, display = false) {
  const cls = display ? 'mth mth-block' : 'mth';
  if (typeof katex === 'undefined') {
    return `<span class="${cls}">${escapeHtml(latex)}</span>`;
  }
  try {
    const html = katex.renderToString(latex, {
      displayMode: display, throwOnError: false, strict: false,
    });
    return `<span class="${cls}">${html}</span>`;
  } catch {
    // A malformed expression should show as plain text, not blank the line.
    return `<span class="${cls}">${escapeHtml(latex)}</span>`;
  }
}

// $$...$$ first so the single-dollar pattern cannot split it in half.
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/** Render one line of lesson or item text to HTML. */
export function renderText(s) {
  const text = String(s ?? '');
  let out = '';
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    out += markdown(text.slice(last, m.index));
    out += m[1] !== undefined ? typeset(m[1], true) : typeset(m[2], false);
    last = m.index + m[0].length;
  }
  return out + markdown(text.slice(last));
}

/**
 * Render a lesson section body. Lines starting "- " become a list, everything
 * else a paragraph.
 */
export function renderBody(lines) {
  const out = [];
  let list = null;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      (list ??= []).push(`<li>${renderText(line.slice(2))}</li>`);
    } else {
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
      out.push(`<p>${renderText(line)}</p>`);
    }
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('');
}

/**
 * Render pre-sanitized HTML that may contain $...$ maths.
 *
 * Item text arrives from tools/sanitize.py already reduced to a whitelisted
 * subset, so it is inserted as HTML rather than escaped - otherwise the SVG
 * figures and data tables would show as angle brackets. Maths is still
 * typeset, but only in the text between tags: a `$` inside an attribute
 * (a `d="M0 0"` path, say) must be left alone.
 */
export function renderHtml(html) {
  const text = String(html ?? '');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) { out += mathOnly(text.slice(i)); break; }
    out += mathOnly(text.slice(i, lt));
    const gt = text.indexOf('>', lt);
    if (gt === -1) { out += text.slice(lt); break; }
    out += text.slice(lt, gt + 1);          // tag, verbatim
    i = gt + 1;
  }
  return out;
}

/** Typeset $...$ but leave the surrounding text exactly as it is. */
function mathOnly(s) {
  let out = '';
  let last = 0;
  for (const m of s.matchAll(MATH)) {
    out += s.slice(last, m.index);
    out += m[1] !== undefined ? typeset(m[1], true) : typeset(m[2], false);
    last = m.index + m[0].length;
  }
  return out + s.slice(last);
}


// ---------------------------------------------------------------------------
// Item stimulus
//
// Authored items store their passage as plain text with real line breaks,
// which HTML collapses into one run-on block - a cross-text pair ran together
// as a single paragraph, and a system of equations lost the break between its
// two lines. Four shapes occur and each needs its own treatment:
//
//   Text 1 / Text 2   a labelled heading, then its passage, clearly separated
//   notes             the lead-in, then the bullets as a list
//   tables            pipe-delimited rows, rendered as a real <table>
//   bare equations    each on its own centred line, not inline in a sentence
//   prose             blank lines are paragraph breaks
//
// Tables matter more than they look. A data question asks the student to read
// a row against a column; flattened to "Wet | 182 | 176" on its own line, that
// comparison is work the display should have done. Markdown's separator row is
// optional here because authored items write tables both ways.
//
// Content that already carries HTML (the figures and tables) is passed
// through untouched.
// ---------------------------------------------------------------------------

const TEXT_LABEL = /^\s*(Text\s*\d+|Passage\s*\d+)\s*:?\s*$/i;
const BULLET = /^\s*[-\u2022*]\s+/;
const BARE_MATH = /^\s*\$[^$]+\$\s*$/;
const TABLE_ROW = /\|/;
const TABLE_RULE = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;
const CAPTION = /^[^.!?]{3,70}$/;

/** Split one pipe row into cells, tolerating optional outer pipes. */
function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

/**
 * A run of pipe rows as a table. The first row is the header when it carries
 * no digits of its own, which is how a label row ("Season type | Bare soil")
 * tells itself apart from a data row that happens to come first.
 *
 * `caption` arrives already rendered, since it was lifted back out of the
 * paragraph stream.
 */
function renderTable(rows, caption) {
  const body = rows.filter((r) => !TABLE_RULE.test(r)).map(cells);
  if (body.length < 2) return '';
  const wide = Math.max(...body.map((r) => r.length));
  const headed = !/\d/.test(body[0].join(' ')) || rows.some((r) => TABLE_RULE.test(r));
  const pad = (r) => r.concat(Array(Math.max(0, wide - r.length)).fill(''));
  const tr = (r, tag) => `<tr>${pad(r).map((c) =>
    `<${tag}>${renderText(c)}</${tag}>`).join('')}</tr>`;
  const head = headed ? `<thead>${tr(body[0], 'th')}</thead>` : '';
  const rest = headed ? body.slice(1) : body;
  return `<figure class="stim-figure">
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    <table class="stim-table">${head}
      <tbody>${rest.map((r) => tr(r, 'td')).join('')}</tbody>
    </table>
  </figure>`;
}

export function renderStimulus(raw) {
  const text = String(raw ?? '');
  if (!text) return '';
  if (text.includes('<')) return renderHtml(text);     // already markup

  const out = [];
  let list = null;
  const flushList = () => {
    if (list) { out.push(`<ul class="stim-notes">${list.join('')}</ul>`); list = null; }
  };

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { flushList(); continue; }

    if (TABLE_ROW.test(t)) {
      flushList();
      const rows = [];
      while (i < lines.length && TABLE_ROW.test(lines[i].trim())) rows.push(lines[i++]);
      i--;
      // A short caption line immediately above the table belongs to it.
      const prev = out[out.length - 1];
      let caption = null;
      const m = prev && /^<p>(.*)<\/p>$/.exec(prev);
      if (m && CAPTION.test(m[1].replace(/<[^>]+>/g, ''))) {
        caption = m[1];
        out.pop();
      }
      const html = renderTable(rows, caption);
      if (html) { out.push(html); continue; }
      if (caption) out.push(prev);
      for (const r of rows) out.push(`<p>${renderText(r.trim())}</p>`);
      continue;
    }

    if (TEXT_LABEL.test(t)) {
      flushList();
      out.push(`<div class="stim-label">${renderText(t.replace(/:$/, ''))}</div>`);
      continue;
    }
    if (BULLET.test(t)) {
      (list ??= []).push(`<li>${renderText(t.replace(BULLET, ''))}</li>`);
      continue;
    }
    flushList();
    if (BARE_MATH.test(t)) {
      out.push(`<div class="stim-eq">${renderText(t)}</div>`);
      continue;
    }
    out.push(`<p>${renderText(t)}</p>`);
  }
  flushList();
  return out.join('');
}

// ---------------------------------------------------------------------------
// Figures
//
// Some questions are reading tasks: find week 3 on the bar graph, read the
// vertex off the parabola. Describing the picture in prose ("week 3 reaches
// the 10th gridline") does not test that - it does the reading for the
// student and leaves them arithmetic. So those items carry a `figure` spec
// and we draw it.
//
// The specs are deliberately small - bar, scatter, line - because that is
// what the exam actually shows, and because a spec we can read is a spec we
// can check against the answer key.
// ---------------------------------------------------------------------------

const esc = escapeHtml;
const PAD = { l: 52, r: 14, t: 14, b: 42 };
const W = 560, H = 300;

const nice = (n) => (Math.round(n * 100) / 100).toString();

function axes(spec, xs, ys) {
  const { x_label, y_label } = spec;
  const out = [];
  for (const t of ys) {
    out.push(`<line class="grid" x1="${PAD.l}" y1="${t.p}" x2="${W - PAD.r}" y2="${t.p}"/>`);
    out.push(`<text x="${PAD.l - 8}" y="${t.p + 4}" text-anchor="end">${esc(t.label)}</text>`);
  }
  out.push(`<line class="ax" x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}"/>`);
  out.push(`<line class="ax" x1="${PAD.l}" y1="${H - PAD.b}" x2="${W - PAD.r}" y2="${H - PAD.b}"/>`);
  // When the data straddles zero, the x-axis is a line through the middle and
  // the student reads "below the axis" off it.
  if (spec.zero_y != null) {
    out.push(`<line class="ax" x1="${PAD.l}" y1="${spec.zero_y}" x2="${W - PAD.r}" y2="${spec.zero_y}"/>`);
  }
  if (spec.zero_x != null) {
    out.push(`<line class="ax" x1="${spec.zero_x}" y1="${PAD.t}" x2="${spec.zero_x}" y2="${H - PAD.b}"/>`);
  }
  for (const t of xs) {
    out.push(`<text x="${t.p}" y="${H - PAD.b + 18}" text-anchor="middle">${esc(t.label)}</text>`);
  }
  if (x_label) {
    out.push(`<text x="${(PAD.l + W - PAD.r) / 2}" y="${H - 6}" text-anchor="middle">${esc(x_label)}</text>`);
  }
  if (y_label) {
    out.push(`<text transform="translate(13 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)" text-anchor="middle">${esc(y_label)}</text>`);
  }
  return out.join('');
}

/** Ticks from a range, at a step that divides it into readable gridlines. */
function ticks(min, max, step) {
  const s = step || (max - min) / 5;
  const out = [];
  for (let v = min; v <= max + 1e-9; v += s) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function barChart(spec) {
  const cats = spec.categories ?? [];
  const vals = spec.values ?? [];
  const max = spec.y_max ?? Math.max(...vals, 1);
  const min = Math.min(0, spec.y_min ?? 0);
  const y = (v) => H - PAD.b - ((v - min) / (max - min)) * (H - PAD.b - PAD.t);
  const span = (W - PAD.l - PAD.r) / Math.max(cats.length, 1);
  const bw = Math.min(span * 0.56, 64);
  const yt = ticks(min, max, spec.y_step).map((v) => ({ p: y(v), label: nice(v) }));
  const xt = cats.map((c, i) => ({ p: PAD.l + span * (i + 0.5), label: c }));
  const bars = vals.map((v, i) => {
    const cx = PAD.l + span * (i + 0.5);
    const top = Math.min(y(v), y(0)), h = Math.abs(y(v) - y(0));
    return `<rect class="chart-bar" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${h}" rx="3"/>`;
  }).join('');
  return axes(spec, xt, yt) + bars;
}

function pointChart(spec, kind) {
  const pts = (spec.points ?? []).map(([a, b]) => [Number(a), Number(b)]);
  const xsv = pts.map((p) => p[0]), ysv = pts.map((p) => p[1]);
  const x0 = spec.x_min ?? Math.min(0, ...xsv), x1 = spec.x_max ?? Math.max(...xsv, 1);
  const y0 = spec.y_min ?? Math.min(0, ...ysv), y1 = spec.y_max ?? Math.max(...ysv, 1);
  const X = (v) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.b - PAD.t);
  const yt = ticks(y0, y1, spec.y_step).map((v) => ({ p: Y(v), label: nice(v) }));
  const xt = ticks(x0, x1, spec.x_step).map((v) => ({ p: X(v), label: nice(v) }));
  let body = '';
  if (kind === 'line' || kind === 'curve') {
    const sorted = [...pts].sort((a, b) => a[0] - b[0]);
    body += `<polyline class="ln" points="${sorted.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')}"/>`;
  }
  // A sampled curve is one object, not a set of readings: no point markers.
  if (kind !== 'curve') {
    body += pts.map((p) => `<circle class="pt" cx="${X(p[0])}" cy="${Y(p[1])}" r="4"/>`).join('');
  }
  return axes({
    ...spec,
    zero_y: y0 < 0 && y1 > 0 ? Y(0) : null,
    zero_x: x0 < 0 && x1 > 0 ? X(0) : null,
  }, xt, yt) + body;
}

/**
 * Draw an item's figure. Returns '' for anything we do not recognise, so an
 * unknown spec degrades to no picture rather than to a broken one.
 */
export function renderFigure(spec) {
  if (!spec || typeof spec !== 'object') return '';
  let body = '';
  if (spec.type === 'bar') body = barChart(spec);
  else if (spec.type === 'curve') body = pointChart(spec, 'curve');
  else if (spec.type === 'scatter' || spec.type === 'line') body = pointChart(spec, spec.type);
  else return '';
  return `<figure class="stim-figure">
    ${spec.caption ? `<figcaption>${esc(spec.caption)}</figcaption>` : ''}
    <svg class="stim-chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${esc(spec.alt ?? spec.caption ?? 'chart')}">${body}</svg>
  </figure>`;
}
