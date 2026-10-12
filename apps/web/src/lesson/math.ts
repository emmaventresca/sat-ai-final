// ---------------------------------------------------------------------------
// Lesson text, tables and figures.
//
// The ideas here are the ones web/assets/mathfmt.js proved out on the printed
// packet, ported rather than imported: maths is pulled out of the text first,
// before escaping and before the markdown pass, because LaTeX is full of the
// characters both of those would mangle.
//
// What changes for the lesson layer is scale. The packet was read at arm's
// length on paper; this is read from the back of a room on a shared screen, so
// the charts are drawn on a bigger canvas with heavier strokes and larger
// labels. An SVG is scaled to fit its column, which means legibility is set by
// the ratio of text to viewBox, not by any pixel size - a 11px label on a 560
// wide chart stays small however large the screen is.
// ---------------------------------------------------------------------------

import katex from 'katex'

const ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] || c)
}

/** Inline markdown. Runs only on non-maths text. */
function markdown(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

/**
 * Typeset one expression, wrapped in a chip.
 *
 * The chip keeps an equation together as one visual unit instead of letting it
 * dissolve into the surrounding prose, and it never breaks across a line.
 */
function typeset(latex: string, display: boolean): string {
  const cls = display ? 'lsn-math lsn-math-block' : 'lsn-math'
  try {
    const html = katex.renderToString(latex, {
      displayMode: display, throwOnError: false, strict: false,
    })
    return `<span class="${cls}">${html}</span>`
  } catch {
    // A malformed expression should show as plain text, not blank the line.
    return `<span class="${cls}">${escapeHtml(latex)}</span>`
  }
}

// $$...$$ first so the single-dollar pattern cannot split it in half.
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

/** Render one line of lesson or item text to HTML. */
export function renderText(s: unknown): string {
  const text = String(s ?? '')
  let out = ''
  let last = 0
  for (const m of text.matchAll(MATH)) {
    const at = m.index ?? 0
    out += markdown(text.slice(last, at))
    out += m[1] !== undefined ? typeset(m[1], true) : typeset(m[2] || '', false)
    last = at + m[0].length
  }
  return out + markdown(text.slice(last))
}

/**
 * A section body. Lines starting "- " become a list, everything else a
 * paragraph - one idea per block is the whole point of the present mode, and
 * the planner already writes its bodies as short separate lines.
 */
export function renderBody(lines: readonly string[]): string {
  const out: string[] = []
  let list: string[] | null = null
  const flush = () => {
    if (list) { out.push(`<ul class="lsn-list">${list.join('')}</ul>`); list = null }
  }
  for (const line of lines) {
    const t = line.trim()
    if (!t) { flush(); continue }
    if (t.startsWith('- ')) {
      if (!list) list = []
      list.push(`<li>${renderText(t.slice(2))}</li>`)
    } else {
      flush()
      out.push(`<p>${renderText(t)}</p>`)
    }
  }
  flush()
  return out.join('')
}

/**
 * Pre-sanitized HTML that may contain $...$ maths.
 *
 * Item text arrives from tools/sanitize.py already reduced to a whitelisted
 * subset, so it is inserted as HTML rather than escaped - otherwise the SVG
 * figures and data tables would show as angle brackets. Maths is typeset only
 * in the text between tags: a `$` inside an attribute (a `d="M0 0"` path, say)
 * must be left alone.
 */
export function renderHtml(html: unknown): string {
  const text = String(html ?? '')
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]

    // Maths wins over markup, and it has to: a less-than sign is the most
    // common operator on this test and also the character that opens a tag.
    // Scanning for tags first meant `$5.0 < m \le 6.0$` hit the `<`, found
    // no closing `>`, and dumped the rest of the choice out as raw LaTeX -
    // which is exactly what a student saw on three of four answer choices.
    if (ch === '$') {
      const m = matchMath(text, i)
      if (m) {
        out += m.html
        i = m.end
        continue
      }
    }

    if (ch === '<') {
      // Only a real tag opens here. A bare `<` between numbers is an
      // operator and belongs in the text, escaped.
      if (TAG_START.test(text.slice(i, i + 2))) {
        const gt = text.indexOf('>', i)
        if (gt === -1) { out += escapeHtml(text.slice(i)); break }
        out += text.slice(i, gt + 1)
        i = gt + 1
        continue
      }
      out += '&lt;'
      i += 1
      continue
    }

    // An escaped dollar outside maths is a currency symbol, not a delimiter.
    if (ch === '\\' && text[i + 1] === '$') {
      out += '$'
      i += 2
      continue
    }

    // Plain text up to the next thing that needs a decision.
    let j = i
    while (j < text.length && text[j] !== '<' && text[j] !== '$'
      && !(text[j] === '\\' && text[j + 1] === '$')) j += 1
    out += text.slice(i, j)
    i = j
  }
  return out
}

const TAG_START = /^<[/!?a-zA-Z]/

/**
 * A maths span starting at `at`, or null if the dollar is just a dollar.
 *
 * Currency is the reason this returns null rather than guessing: the bank is
 * full of "$68" and "$1,500", and typesetting those produces nonsense. A run
 * only counts as maths when it closes on the same line.
 */
function matchMath(text: string, at: number): { html: string; end: number } | null {
  if (text.startsWith('$$', at)) {
    const close = text.indexOf('$$', at + 2)
    if (close !== -1) {
      return { html: typeset(text.slice(at + 2, close), true), end: close + 2 }
    }
  }
  const nl = text.indexOf('\n', at)
  const close = closingDollar(text, at + 1)
  if (close === -1 || close === at + 1) return null
  if (nl !== -1 && nl < close) return null
  return { html: typeset(text.slice(at + 1, close), false), end: close + 1 }
}

/**
 * The next REAL closing dollar, skipping escaped ones.
 *
 * A money amount inside maths is written `$\$12{,}000$` - a span whose first
 * character is an escaped dollar. Searching naively for the next `$` lands on
 * that escape, closes the span one character in, and leaves the rest of the
 * sentence to be swallowed by the following span. On screen that turned
 * "a budget of $12,000 for trees and benches" into a run of italic LaTeX, on
 * 53 items across both banks.
 */
function closingDollar(text: string, from: number): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] !== '$') continue
    // Count the backslashes immediately before it: an odd number means this
    // dollar is escaped, an even number means the backslashes are themselves
    // escaped and the dollar is real.
    let slashes = 0
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) slashes += 1
    if (slashes % 2 === 0) return i
  }
  return -1
}

// ---------------------------------------------------------------------------
// Stimulus
//
// Authored items store their passage as plain text with real line breaks,
// which HTML collapses into one run-on block. Four shapes occur:
//
//   Text 1 / Text 2   a labelled heading, then its passage
//   notes             the lead-in, then the bullets as a list
//   tables            pipe-delimited rows, rendered as a real <table>
//   bare equations    each on its own centred line
//
// Tables matter more than they look. A data question asks the student to read
// a row against a column; flattened to "Wet | 182 | 176" that comparison is
// work the display should have done. Markdown's separator row is optional
// because authored items write tables both ways.
// ---------------------------------------------------------------------------

const TEXT_LABEL = /^\s*(Text\s*\d+|Passage\s*\d+)\s*:?\s*$/i
const BULLET = /^\s*[-•*]\s+/
const BARE_MATH = /^\s*\$[^$]+\$\s*$/
const TABLE_ROW = /\|/
const TABLE_RULE = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/
const CAPTION = /^[^.!?]{3,70}$/

/**
 * A roman-numeral option list, written on one line.
 *
 * "I. ... II. ... III. ..." is the standard shape of a must-be-true question,
 * and authored items write it as a single paragraph because that is how it
 * arrives from the model. Rendered as one line the student has to find the
 * boundaries themselves, mid-question, which is work the display should have
 * done — and the answer choices ("I and III only") are unreadable against a
 * wall of text.
 *
 * Only splits when there are at least two numerals in sequence, so a sentence
 * that happens to start with "I." is left alone.
 */
const ROMAN_RUN = /(?:^|\s)(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+/g

function splitRomanList(line: string): string[] | null {
  const marks = [...line.matchAll(ROMAN_RUN)]
  if (marks.length < 2) return null
  const want = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  // They have to be in order from the start: "I, II" inside prose is not a
  // list, and a run beginning at III is a coincidence.
  if (!marks.every((m, i) => m[1] === want[i])) return null
  const out: string[] = []
  for (let i = 0; i < marks.length; i++) {
    const from = (marks[i].index ?? 0) + marks[i][0].length
    const to = i + 1 < marks.length ? marks[i + 1].index : line.length
    out.push(`${marks[i][1]}. ${line.slice(from, to).trim()}`)
  }
  return out
}

function cells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
}

/**
 * A run of pipe rows as a table. The first row is the header when it carries
 * no digits of its own, which is how a label row ("Season | Bare soil") tells
 * itself apart from a data row that happens to come first.
 */
function renderTable(rows: string[], caption: string | null): string {
  const body = rows.filter((r) => !TABLE_RULE.test(r)).map(cells)
  if (body.length < 2) return ''
  const first = body[0]
  const wide = Math.max(...body.map((r) => r.length))
  const headed = !/\d/.test(first.join(' ')) || rows.some((r) => TABLE_RULE.test(r))
  const pad = (r: string[]) => r.concat(Array(Math.max(0, wide - r.length)).fill(''))
  const tr = (r: string[], tag: 'th' | 'td') =>
    `<tr>${pad(r).map((c) => `<${tag}>${renderText(c)}</${tag}>`).join('')}</tr>`
  const head = headed ? `<thead>${tr(first, 'th')}</thead>` : ''
  const rest = headed ? body.slice(1) : body
  return `<figure class="lsn-figure">
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}
    <table class="lsn-table">${head}
      <tbody>${rest.map((r) => tr(r, 'td')).join('')}</tbody>
    </table>
  </figure>`
}

export function renderStimulus(raw: unknown): string {
  const text = String(raw ?? '')
  if (!text) return ''
  if (text.includes('<')) return renderHtml(text)       // already markup

  const out: string[] = []
  let list: string[] | null = null
  const flush = () => {
    if (list) { out.push(`<ul class="lsn-list">${list.join('')}</ul>`); list = null }
  }

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = (lines[i] || '').trim()
    if (!t) { flush(); continue }

    if (TABLE_ROW.test(t)) {
      flush()
      const rows: string[] = []
      while (i < lines.length && TABLE_ROW.test((lines[i] || '').trim())) {
        rows.push(lines[i] || '')
        i++
      }
      i--
      // A short caption line immediately above the table belongs to it.
      const prev = out[out.length - 1]
      let caption: string | null = null
      const m = prev ? /^<p>([\s\S]*)<\/p>$/.exec(prev) : null
      if (m && CAPTION.test((m[1] || '').replace(/<[^>]+>/g, ''))) {
        caption = m[1] || null
        out.pop()
      }
      const html = renderTable(rows, caption)
      if (html) { out.push(html); continue }
      if (caption && prev) out.push(prev)
      for (const r of rows) out.push(`<p>${renderText(r.trim())}</p>`)
      continue
    }

    if (TEXT_LABEL.test(t)) {
      flush()
      out.push(`<div class="lsn-stim-label">${renderText(t.replace(/:$/, ''))}</div>`)
      continue
    }
    if (BULLET.test(t)) {
      if (!list) list = []
      list.push(`<li>${renderText(t.replace(BULLET, ''))}</li>`)
      continue
    }
    const roman = splitRomanList(t)
    if (roman) {
      flush()
      out.push(`<ul class="lsn-roman">${
        roman.map((r) => `<li>${renderText(r)}</li>`).join('')
      }</ul>`)
      continue
    }
    flush()
    out.push(BARE_MATH.test(t)
      ? `<div class="lsn-eq">${renderText(t)}</div>`
      : `<p>${renderText(t)}</p>`)
  }
  flush()
  return out.join('')
}

// ---------------------------------------------------------------------------
// Figures
//
// Some questions are reading tasks: find week 3 on the bar graph, read the
// vertex off the parabola. Describing the picture in prose does the reading
// for the student and leaves them arithmetic, so those items carry a spec and
// we draw it. The specs stay small - bar, line, scatter, curve - because that
// is what the exam shows, and because a spec we can read is one we can check
// against the answer key.
// ---------------------------------------------------------------------------

interface FigureBase {
  caption?: string
  alt?: string
  x_label?: string
  y_label?: string
  x_step?: number
  y_step?: number
  y_min?: number
  y_max?: number
}

export interface BarFigure extends FigureBase {
  type: 'bar'
  categories?: string[]
  values?: number[]
}

export interface PointFigure extends FigureBase {
  type: 'line' | 'scatter' | 'curve'
  points?: [number, number][]
  x_min?: number
  x_max?: number
}

export type FigureSpec = BarFigure | PointFigure

/** `Question.figure` is `unknown` in the exam types, so the gate lives here. */
export function isFigureSpec(value: unknown): value is FigureSpec {
  if (!value || typeof value !== 'object') return false
  const t = (value as { type?: unknown }).type
  return t === 'bar' || t === 'line' || t === 'scatter' || t === 'curve'
}

type Tick = { p: number; label: string }

// Sized for a room, not a page: wider canvas, bigger type inside the viewBox.
const PAD = { l: 72, r: 20, t: 20, b: 60 }
const W = 680
const H = 380

const nice = (n: number) => (Math.round(n * 100) / 100).toString()

function axes(
  spec: FigureBase & { zero_x?: number | null; zero_y?: number | null },
  xs: Tick[],
  ys: Tick[],
): string {
  const out: string[] = []
  for (const t of ys) {
    out.push(`<line class="g" x1="${PAD.l}" y1="${t.p}" x2="${W - PAD.r}" y2="${t.p}"/>`)
    out.push(`<text x="${PAD.l - 10}" y="${t.p + 6}" text-anchor="end">${escapeHtml(t.label)}</text>`)
  }
  out.push(`<line class="a" x1="${PAD.l}" y1="${PAD.t}" x2="${PAD.l}" y2="${H - PAD.b}"/>`)
  out.push(`<line class="a" x1="${PAD.l}" y1="${H - PAD.b}" x2="${W - PAD.r}" y2="${H - PAD.b}"/>`)
  // When the data straddles zero, the x-axis is a line through the middle and
  // the student reads "below the axis" off it.
  if (spec.zero_y != null) {
    out.push(`<line class="a" x1="${PAD.l}" y1="${spec.zero_y}" x2="${W - PAD.r}" y2="${spec.zero_y}"/>`)
  }
  if (spec.zero_x != null) {
    out.push(`<line class="a" x1="${spec.zero_x}" y1="${PAD.t}" x2="${spec.zero_x}" y2="${H - PAD.b}"/>`)
  }
  for (const t of xs) {
    out.push(`<text x="${t.p}" y="${H - PAD.b + 26}" text-anchor="middle">${escapeHtml(t.label)}</text>`)
  }
  if (spec.x_label) {
    out.push(`<text class="lab" x="${(PAD.l + W - PAD.r) / 2}" y="${H - 10}" text-anchor="middle">${escapeHtml(spec.x_label)}</text>`)
  }
  if (spec.y_label) {
    out.push(`<text class="lab" transform="translate(19 ${(PAD.t + H - PAD.b) / 2}) rotate(-90)" text-anchor="middle">${escapeHtml(spec.y_label)}</text>`)
  }
  return out.join('')
}

/** Ticks from a range, at a step that divides it into readable gridlines. */
function ticks(min: number, max: number, step?: number): number[] {
  const span = max - min
  const s = step && step > 0 ? step : (span > 0 ? span / 5 : 1)
  const out: number[] = []
  for (let v = min, n = 0; v <= max + 1e-9 && n < 40; v += s, n++) {
    out.push(Math.round(v * 1e6) / 1e6)
  }
  return out
}

function barChart(spec: BarFigure): string {
  const cats = spec.categories ?? []
  const vals = spec.values ?? []
  const max = spec.y_max ?? Math.max(...vals, 1)
  const min = Math.min(0, spec.y_min ?? 0)
  const y = (v: number) => H - PAD.b - ((v - min) / (max - min || 1)) * (H - PAD.b - PAD.t)
  const span = (W - PAD.l - PAD.r) / Math.max(cats.length, 1)
  const bw = Math.min(span * 0.56, 78)
  const yt = ticks(min, max, spec.y_step).map((v) => ({ p: y(v), label: nice(v) }))
  const xt = cats.map((c, i) => ({ p: PAD.l + span * (i + 0.5), label: c }))
  const bars = vals.map((v, i) => {
    const cx = PAD.l + span * (i + 0.5)
    const top = Math.min(y(v), y(0))
    const h = Math.abs(y(v) - y(0))
    return `<rect class="bar" x="${cx - bw / 2}" y="${top}" width="${bw}" height="${h}" rx="4"/>`
  }).join('')
  return axes(spec, xt, yt) + bars
}

function pointChart(spec: PointFigure, kind: 'line' | 'scatter' | 'curve'): string {
  const pts = (spec.points ?? []).map(([a, b]) => [Number(a), Number(b)] as const)
  const xsv = pts.map((p) => p[0])
  const ysv = pts.map((p) => p[1])
  const x0 = spec.x_min ?? Math.min(0, ...xsv)
  const x1 = spec.x_max ?? Math.max(...xsv, 1)
  const y0 = spec.y_min ?? Math.min(0, ...ysv)
  const y1 = spec.y_max ?? Math.max(...ysv, 1)
  const X = (v: number) => PAD.l + ((v - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r)
  const Y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0 || 1)) * (H - PAD.b - PAD.t)
  const yt = ticks(y0, y1, spec.y_step).map((v) => ({ p: Y(v), label: nice(v) }))
  const xt = ticks(x0, x1, spec.x_step).map((v) => ({ p: X(v), label: nice(v) }))

  let body = ''
  if (kind === 'line' || kind === 'curve') {
    const sorted = [...pts].sort((a, b) => a[0] - b[0])
    body += `<polyline class="ln" points="${sorted.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')}"/>`
  }
  // A sampled curve is one object, not a set of readings: no point markers.
  if (kind !== 'curve') {
    body += pts.map((p) => `<circle class="pt" cx="${X(p[0])}" cy="${Y(p[1])}" r="6"/>`).join('')
  }
  return axes({
    ...spec,
    zero_y: y0 < 0 && y1 > 0 ? Y(0) : null,
    zero_x: x0 < 0 && x1 > 0 ? X(0) : null,
  }, xt, yt) + body
}

/**
 * Draw an item's figure. Returns '' for anything unrecognised, so an unknown
 * spec degrades to no picture rather than to a broken one.
 */
const DRAWN = /^<(svg|figure|table|img)\b/i

interface TableSpec {
  type: 'table'
  title?: string
  columns: string[]
  rows: (string | number | null)[][]
}

function isTableSpec(spec: unknown): spec is TableSpec {
  const s = spec as TableSpec
  return Boolean(s) && typeof s === 'object' && s.type === 'table'
    && Array.isArray(s.columns) && Array.isArray(s.rows)
}

/**
 * A table spec as a real table.
 *
 * Rendered rather than flattened: a data question asks the student to read a
 * row against a column, and "Wet | 182 | 176" makes that comparison their
 * work instead of the display's.
 */
function renderSpecTable(spec: TableSpec): string {
  const cell = (v: string | number | null) =>
    v === null || v === undefined ? '' : escapeHtml(String(v))
  return `<figure class="lsn-figure">
    ${spec.title ? `<figcaption>${escapeHtml(spec.title)}</figcaption>` : ''}
    <table class="lsn-table">
      <thead><tr>${spec.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${spec.rows.map((r) =>
        `<tr>${r.map((v) => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </figure>`
}

export function renderFigure(spec: unknown): string {
  // ---------------------------------------------------------------------
  // Already-drawn displays.
  //
  // The ACT bank ships its figures as finished SVG, drawn by that project's
  // own chart and diagram renderers - which is right, because they know
  // about apparatus diagrams and cross-sections and cycles that this module
  // has never heard of. 2,129 of them.
  //
  // They arrived as strings, this function only understood chart SPECS, and
  // a string fell through to `return ''`. So every ACT Science question that
  // said "Table 1 shows..." rendered no table: unanswerable, silently, for
  // the whole section. The fix is to pass them through.
  //
  // Only markup that starts as a display is allowed, so a stray string
  // cannot inject anything: the content is ours, written by our own tools,
  // and this keeps it that way even if a future bank is less careful.
  // ---------------------------------------------------------------------
  if (typeof spec === 'string') {
    const markup = spec.trim()
    return DRAWN.test(markup) ? `<figure class="lsn-figure">${markup}</figure>` : ''
  }

  // A data table is a display too, and the single commonest one in the ACT
  // Science section. It was falling through the same gap.
  if (isTableSpec(spec)) return renderSpecTable(spec)

  if (!isFigureSpec(spec)) return ''
  const body = spec.type === 'bar'
    ? barChart(spec)
    : pointChart(spec, spec.type)
  return `<figure class="lsn-figure">
    ${spec.caption ? `<figcaption>${escapeHtml(spec.caption)}</figcaption>` : ''}
    <svg class="lsn-chart" viewBox="0 0 ${W} ${H}" role="img"
      aria-label="${escapeHtml(spec.alt ?? spec.caption ?? 'chart')}">${body}</svg>
  </figure>`
}
