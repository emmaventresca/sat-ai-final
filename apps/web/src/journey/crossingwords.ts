/**
 * What the curtain says on the way into a lesson.
 *
 * Kept apart from the component partly so it can be tested without a DOM,
 * and partly because this is the copy - the one thing in the transition a
 * person will actually read, and the thing most likely to want changing.
 *
 * Nothing here borrows from a franchise: these are plain travelling words.
 */

/** Said on the way in. Varied so the fourth stop of a session is not the first. */
export const SETTING_OUT = [
  'Let the adventure begin',
  'The way opens',
  'Onward, traveller',
  'A new stretch of road',
  'Here begins the next stage',
]

/** Said when picking a journey back up, which is a different feeling. */
export const RETURNING = [
  'Back to the road',
  'Where you left off',
  'The road is still there',
]

export type Crossing = 'start' | 'resume'

/** The button that opens the curtain. Setting out, and coming back. */
export const BEGIN = [
  'Huzzah!',
  'Ready to begin!',
  'Commence!',
  'Set out!',
]

export const BEGIN_AGAIN = [
  'Back to it!',
  'Onward!',
  'Pick up the trail',
]

/**
 * Seeded by the place rather than random.
 *
 * Re-entering the same stop says the same thing. A line that changes while
 * the student has not moved reads as a glitch, and the point of the beat is
 * that it feels like a place.
 */
function hash(seed: string, salt: number): number {
  let h = salt
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

export function thresholdWords(kind: Crossing, seed: string): string {
  const pool = kind === 'resume' ? RETURNING : SETTING_OUT
  return pool[hash(seed, 0) % pool.length]
}

/**
 * The word on the button.
 *
 * Salted differently from the line above it, so the pairing varies instead
 * of the same line always arriving with the same button - five lines times
 * four buttons reads as more than five openings.
 */
export function beginWords(kind: Crossing, seed: string): string {
  const pool = kind === 'resume' ? BEGIN_AGAIN : BEGIN
  return pool[hash(seed, 7919) % pool.length]
}
