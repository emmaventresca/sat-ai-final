/**
 * Student-produced response: the student types a number.
 *
 * 27% of the real SAT maths section has no answer choices, and grading has
 * to be as forgiving as the real thing and no more. The exam accepts a
 * fraction or a decimal, and accepts a decimal truncated OR rounded at the
 * width of the box - 15/17 is .8823 truncated and .8824 rounded, and both
 * are right.
 *
 * The obvious implementation is a tolerance of one unit in the last place,
 * and it is wrong in the way that matters: it marks 1.4 correct against a
 * key of 1.5. Rounding and truncating to the key's own precision is the
 * rule, and it is the rule because it is what the box does.
 */
const EXACT = 1e-9
const CLEAN = /[\s,$%]/g

export const MAX_LEN = 7

export function value(raw: unknown): number | null {
  const s = String(raw ?? '').replace(CLEAN, '')
  if (!s) return null
  const frac = /^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/.exec(s)
  if (frac) {
    const b = Number(frac[2])
    return b === 0 ? null : Number(frac[1]) / b
  }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null
}

export function matches(raw: unknown, keys: readonly string[] | undefined): boolean {
  const g = value(raw)
  if (g === null) return false
  for (const k of keys ?? []) {
    const ks = String(k).trim()
    const v = value(ks)
    if (v === null) continue
    if (Math.abs(g - v) <= Math.max(Math.abs(v), 1) * EXACT) return true
    if (ks.includes('/')) continue
    const dp = ks.includes('.') ? ks.split('.')[1].length : 0
    if (!dp) continue
    const scale = 10 ** dp
    if (Math.abs(Math.round(g * scale) / scale - v) <= EXACT) return true
    if (Math.abs(Math.trunc(g * scale) / scale - v) <= EXACT) return true
  }
  return false
}

/**
 * The named error a typed value came from, where we anticipated it.
 *
 * This is what keeps the diagnosis working without choices: a four-choice
 * item tags each wrong letter, a grid-in tags each wrong VALUE, so typing
 * 4.5 because you stopped at feet is still read as stopping early rather
 * than recorded as a blank miss.
 */
export function diagnose(
  raw: unknown, misconceptions: Record<string, string> | undefined,
): { value: string; family: string } | null {
  const g = value(raw)
  if (g === null) return null
  for (const [key, family] of Object.entries(misconceptions ?? {})) {
    const v = value(key)
    if (v !== null && Math.abs(g - v) <= Math.max(Math.abs(v), 1) * 1e-6) {
      return { value: key, family }
    }
  }
  return null
}
