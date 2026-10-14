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

/**
 * Seeded by the place rather than random.
 *
 * Re-entering the same stop says the same thing. A line that changes while
 * the student has not moved reads as a glitch, and the point of the beat is
 * that it feels like a place.
 */
export function thresholdWords(kind: Crossing, seed: string): string {
  const pool = kind === 'resume' ? RETURNING : SETTING_OUT
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
