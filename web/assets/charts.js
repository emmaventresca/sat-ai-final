// ---------------------------------------------------------------------------
// Charts for the teacher panel.
//
// Everything here is one series - questions answered per day, accuracy per
// week - so the colour job is sequential: a single hue, no legend (the title
// already says what is plotted), and text in ink tokens rather than the series
// colour.
//
// Mark specs are fixed: columns capped at 24px with a 4px rounded cap and a
// square baseline, hairline solid gridlines one step off the surface, a 2px
// surface gap between neighbours, and a hover/focus tooltip on every column
// with a hit target larger than the mark. Each chart also renders a table
// view, so no value is reachable only by hovering.
// ---------------------------------------------------------------------------

import { escapeHtml as esc } from './mathfmt.js';

const HUE = '#7c5cff';
const GRID = '#e6ddfb';
const INK_MUTED = '#8f88ad';

/**
 * Clean axis ticks: 0, then round steps up to the maximum.
 *
 * `integer` keeps counts on whole numbers - a chart of questions answered should
 * never label its axis 0, 0.25, 0.5.
 */
function ticks(max, { count = 4, integer = true } = {}) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  if (integer) step = Math.max(1, Math.round(step));
  const out = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/**
 * A column chart for one series over time.
 *
 * @param rows   [{ label, value, sub }]  sub is extra tooltip detail
 * @param opts   { id, height, format, emphasis }
 */
export function columnChart(rows, opts = {}) {
  const { id, format = (v) => v, unit = '' } = opts;

  // A landscape coordinate system in px-like units, with the aspect preserved.
  // (An earlier version used a 100-wide viewBox with preserveAspectRatio="none",
  // which stretched the geometry and left the columns floating off the baseline.)
  const W = 640, H = 220;
  const PAD_L = 34, PAD_R = 10, PAD_T = 22, PAD_B = 30;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const max = Math.max(...rows.map((r) => r.value), 0);
  const tk = ticks(max, { integer: opts.integer !== false });
  const top = tk[tk.length - 1] || 1;
  const band = plotW / Math.max(rows.length, 1);
  // Cap the column and let the band's leftover be air; 2px of that is the gap.
  const barW = Math.max(3, Math.min(band - 2, 24));
  const y = (v) => PAD_T + plotH - (v / top) * plotH;

  // Label only the extreme, never every column.
  const peak = rows.reduce((a, b, i) => (b.value > rows[a].value ? i : a), 0);

  const grid = tk.map((t) => `
    <line x1="${PAD_L}" y1="${y(t)}" x2="${W - PAD_R}" y2="${y(t)}"
          stroke="${GRID}" stroke-width="1" />
    <text x="${PAD_L - 7}" y="${y(t) + 3.5}" text-anchor="end"
          font-size="10" fill="${INK_MUTED}">${esc(String(t))}</text>`).join('');

  const bars = rows.map((r, i) => {
    const cx = PAD_L + band * i + band / 2;
    const h = r.value > 0 ? Math.max((plotH * r.value) / top, 2) : 0;
    const bx = cx - barW / 2;
    const by = PAD_T + plotH - h;
    return `
      <g class="col" tabindex="0" role="listitem"
         data-label="${esc(r.label)}" data-value="${esc(format(r.value) + unit)}"
         data-sub="${esc(r.sub ?? '')}">
        <rect x="${cx - band / 2}" y="${PAD_T}" width="${band}" height="${plotH}"
              fill="transparent" class="hit" />
        ${h > 0 ? `<rect x="${bx}" y="${by}" width="${barW}" height="${h}"
              rx="${Math.min(4, h / 2)}" fill="${HUE}" class="col-bar" />` : ''}
      </g>`;
  }).join('');

  const peakLabel = rows[peak]?.value > 0 ? `
    <text x="${PAD_L + band * peak + band / 2}" y="${y(rows[peak].value) - 7}"
          text-anchor="middle" font-size="11" font-weight="700" fill="#5b5480"
          >${esc(format(rows[peak].value) + unit)}</text>` : '';

  // Thin the axis labels so they never collide. The final label is only drawn
  // when it is far enough from the last regular one - forcing it unconditionally
  // printed "9/28" and "9/29" on top of each other.
  const every = Math.max(1, Math.ceil(rows.length / 8));
  const last = rows.length - 1;
  const showLast = last % every >= Math.ceil(every / 2);
  const xlabels = rows.map((r, i) => (i % every === 0 || (i === last && showLast)) ? `
    <text x="${PAD_L + band * i + band / 2}" y="${H - 10}" text-anchor="middle"
          font-size="10" fill="${INK_MUTED}">${esc(r.axis ?? r.label)}</text>` : '').join('');

  return `
  <div class="chart" data-chart="${esc(id)}">
    <svg viewBox="0 0 ${W} ${H}" role="list" aria-label="${esc(opts.title ?? 'chart')}"
         class="chart-svg">
      ${grid}
      <line x1="${PAD_L}" y1="${PAD_T + plotH}" x2="${W - PAD_R}" y2="${PAD_T + plotH}"
            stroke="${GRID}" stroke-width="1.5" />
      ${bars}${peakLabel}${xlabels}
    </svg>
    <div class="tip" hidden></div>
  </div>`;
}

/** Wire hover and keyboard focus. Call after the chart is in the DOM. */
export function mountCharts(root = document) {
  for (const chart of root.querySelectorAll('.chart')) {
    const tip = chart.querySelector('.tip');
    const show = (g) => {
      // textContent throughout: labels are data, not markup.
      tip.replaceChildren();
      const v = document.createElement('div');
      v.className = 'tip-v';
      v.textContent = g.dataset.value;
      const l = document.createElement('div');
      l.className = 'tip-l';
      l.textContent = g.dataset.label;
      tip.append(v, l);
      if (g.dataset.sub) {
        const s = document.createElement('div');
        s.className = 'tip-s';
        s.textContent = g.dataset.sub;
        tip.append(s);
      }
      const box = chart.getBoundingClientRect();
      const r = g.getBoundingClientRect();
      tip.hidden = false;
      const left = r.left - box.left + r.width / 2;
      tip.style.left = `${Math.max(4, Math.min(box.width - 4, left))}px`;
      chart.classList.add('active');
      g.classList.add('on');
    };
    const hide = (g) => {
      tip.hidden = true;
      chart.classList.remove('active');
      g?.classList.remove('on');
    };
    for (const g of chart.querySelectorAll('.col')) {
      g.addEventListener('pointerenter', () => show(g));
      g.addEventListener('focus', () => show(g));
      g.addEventListener('pointerleave', () => hide(g));
      g.addEventListener('blur', () => hide(g));
    }
  }
}

/** The table view every chart ships with, so nothing is hover-only. */
export function chartTable(rows, { columns, caption }) {
  return `<details class="tableview">
    <summary>${esc(caption ?? 'Show the numbers')}</summary>
    <table><thead><tr>${columns.map((c) => `<th${c.num ? ' class="num"' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${columns.map((c) =>
      `<td${c.num ? ' class="num"' : ''}>${esc(String(c.get(r)))}</td>`).join('')}</tr>`).join('')}
    </tbody></table></details>`;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const DAY = 864e5;
const iso = (d) => d.toISOString().slice(0, 10);

/** Attempts -> one row per day for the last `days`, including empty days. */
export function byDay(attempts, days = 30) {
  const buckets = new Map();
  for (const a of attempts) {
    const k = iso(new Date(a.created_at));
    const b = buckets.get(k) ?? { n: 0, right: 0 };
    b.n++; if (a.correct) b.right++;
    buckets.set(k, b);
  }
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today - i * DAY);
    const b = buckets.get(iso(d)) ?? { n: 0, right: 0 };
    out.push({
      key: iso(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      axis: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      value: b.n,
      correct: b.right,
      accuracy: b.n ? b.right / b.n : null,
      sub: b.n ? `${b.right} correct (${Math.round(b.right / b.n * 100)}%)` : 'no practice',
    });
  }
  return out;
}

/** Attempts -> one row per ISO week (Monday start) for the last `weeks`. */
export function byWeek(attempts, weeks = 8) {
  const monday = (d) => {
    const x = new Date(d); x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  const buckets = new Map();
  for (const a of attempts) {
    const k = iso(monday(new Date(a.created_at)));
    const b = buckets.get(k) ?? { n: 0, right: 0, days: new Set() };
    b.n++; if (a.correct) b.right++;
    b.days.add(iso(new Date(a.created_at)));
    buckets.set(k, b);
  }
  const out = [];
  const thisWeek = monday(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek - i * 7 * DAY);
    const b = buckets.get(iso(d)) ?? { n: 0, right: 0, days: new Set() };
    const end = new Date(d.getTime() + 6 * DAY);
    out.push({
      key: iso(d),
      label: `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      axis: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      range: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      value: b.n,
      correct: b.right,
      activeDays: b.days.size,
      accuracy: b.n ? b.right / b.n : null,
      sub: b.n ? `${b.right} correct (${Math.round(b.right / b.n * 100)}%) over ${b.days.size} day${b.days.size === 1 ? '' : 's'}` : 'no practice',
    });
  }
  return out;
}

/** Consecutive days with practice, counting back from today. */
export function streak(attempts) {
  const days = new Set(attempts.map((a) => iso(new Date(a.created_at))));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Today not being done yet should not break a streak, so start from yesterday
  // unless today already has practice.
  let n = 0;
  let start = days.has(iso(today)) ? 0 : 1;
  for (let i = start; ; i++) {
    if (!days.has(iso(new Date(today - i * DAY)))) break;
    n++;
  }
  return n;
}
