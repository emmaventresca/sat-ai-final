/**
 * Whether this student has seen the world open before.
 *
 * Named `overtureState` rather than `overture` because `Overture.tsx` sits
 * beside it and macOS cannot tell the two apart - the same case collision
 * that cost this project a white screen when `digest.ts` met `Digest.tsx`.
 *
 * The full opening runs once. A cinematic that plays every single login
 * stops being an arrival and becomes a toll - the brief says as much, and
 * anyone who has sat through an unskippable splash screen on the fourth
 * visit already knows it. So: the whole thing on the first journey in, and
 * a short settle on every one after.
 */
const KEY = 'prep.overture.seen'

export type Overture = 'full' | 'short' | 'none'

export function overtureFor(reduced: boolean): Overture {
  if (reduced) return 'none'
  try {
    return localStorage.getItem(KEY) ? 'short' : 'full'
  } catch {
    // Private browsing, or storage refused. Erring towards the short one:
    // a student who cannot be remembered should not be shown the long
    // version every time.
    return 'short'
  }
}

export function markOvertureSeen(): void {
  try {
    localStorage.setItem(KEY, new Date().toISOString())
  } catch {
    /* nothing to do - see above */
  }
}

/** For testing the long version again without clearing the whole store. */
export function forgetOverture(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function prefersReduced(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The beats, in milliseconds from the start.
 *
 * Kept as data rather than scattered through the component so the whole
 * shape of the sequence can be read at once - and so the short version is
 * demonstrably the same cut with the forest removed, not a second
 * implementation that drifts from the first.
 */
export interface Beats {
  /** The forest push-in starts. */
  forest: number
  /** The vista begins to take over. */
  vista: number
  /** The title settles in. */
  title: number
  /** Everything fades and the app takes the screen. */
  out: number
  /** Total length. */
  end: number
}

export const BEATS: Record<Exclude<Overture, 'none'>, Beats> = {
  full:  { forest: 260, vista: 2750, title: 3500, out: 5250, end: 5900 },
  short: { forest: -1,  vista: 0,    title: 320,  out: 1500, end: 2050 },
}
