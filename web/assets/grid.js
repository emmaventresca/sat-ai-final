// ---------------------------------------------------------------------------
// Student-produced response
//
// 27% of the real math section has no answer choices: the student types a
// number into a box. The bank had none of them, which meant a quarter of the
// section was unpractised - and not the easy quarter. A grid-in removes
// everything a student leans on. You cannot eliminate, you cannot backsolve,
// you cannot recognise the right-looking form. You have to produce it.
//
// Grading has to be as forgiving as the real thing and no more. The exam
// accepts a fraction or a decimal, and accepts a decimal truncated or rounded
// at the width of the box: .8823 and .8824 are both 15/17. A student who did
// the work right and wrote it a different way has not got it wrong, and an
// app that marks them wrong teaches them to distrust a correct answer.
// ---------------------------------------------------------------------------

/** The exam's own entry limits: six characters, seven with a minus sign. */
export const MAX_LEN = 7;

const CLEAN = /[\s,$%]/g;

/** A typed entry as a number, or null if it is not one. */
export function value(raw) {
  const s = String(raw ?? '').replace(CLEAN, '');
  if (!s) return null;
  const frac = /^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/.exec(s);
  if (frac) {
    const b = Number(frac[2]);
    return b === 0 ? null : Number(frac[1]) / b;
  }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null;
}

const EXACT = 1e-9;

/**
 * Does a typed entry match one of the acceptable answers?
 *
 * A decimal key is a *rendering* of the true value at the width of the box,
 * so an entry matches it when rounding or truncating the entry to that many
 * places reproduces the key. Both, because the exam accepts either: 15/17 is
 * .8823 truncated and .8824 rounded.
 *
 * It is tempting to write this as a tolerance of one unit in the last place,
 * and that is wrong in a way that matters - it makes 1.4 match a key of 1.5,
 * marking a wrong answer correct.
 */
export function matches(raw, keys) {
  const g = value(raw);
  if (g === null) return false;
  for (const k of keys ?? []) {
    const ks = String(k).trim();
    const v = value(ks);
    if (v === null) continue;
    if (Math.abs(g - v) <= Math.max(Math.abs(v), 1) * EXACT) return true;
    if (ks.includes('/')) continue;           // a fraction key is exact
    const dp = ks.includes('.') ? ks.split('.')[1].length : 0;
    if (!dp) continue;
    const scale = Math.pow(10, dp);
    const rounded = Math.round(g * scale) / scale;
    const truncated = Math.trunc(g * scale) / scale;
    if (Math.abs(rounded - v) <= EXACT || Math.abs(truncated - v) <= EXACT) {
      return true;
    }
  }
  return false;
}

/**
 * The named error a wrong entry came from, if we anticipated it.
 *
 * This is what keeps the diagnosis working without choices. A four-choice
 * item tags each wrong letter; a grid-in tags each wrong *value*, so typing
 * 4.5 because you stopped at feet is still recognised as stopping early
 * rather than recorded as a blank miss.
 */
export function diagnose(raw, item) {
  const g = value(raw);
  if (g === null) return null;
  for (const [key, slug] of Object.entries(item.misconceptions ?? {})) {
    const v = value(key);
    if (v !== null && Math.abs(g - v) <= Math.max(Math.abs(v), 1) * 1e-6) {
      return { value: key, family: slug };
    }
  }
  return null;
}

export function isGrid(item) {
  return item?.format === 'grid' || (Array.isArray(item?.keys) && !item?.choices);
}
