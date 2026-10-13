import type { Exam } from '../exams/types'
import type { Chapter, Leg, Region, Stage } from './map'
import type { Attempt } from '../practice/mastery'

/**
 * Where a student left off, so coming back costs one click.
 *
 * A student who practised last night and opens the app tonight should not
 * have to remember which of 182 recognitions they were on, then find it
 * through three levels of map. The app already knows: the attempt log is in
 * timestamp order and every attempt carries its recognition.
 *
 * Deliberately skips a recognition that is already CLEARED. "Resume" that
 * drops you somewhere finished is worse than no button - it costs the click
 * and gives nothing back - so it walks back through the log until it finds
 * something with work left, and reports nothing if there is none.
 */
export interface Resume {
  leg: Leg
  stage: Stage
  chapter: Chapter
  region: Region
  /** ISO date of the last attempt here. */
  at: string
  /** Attempts made in this recognition, ever. */
  seen: number
  /** Of its questions, how many are still unanswered. */
  left: number
}

export function resumeFor(
  exam: Exam,
  regions: readonly Region[],
  attempts: readonly Attempt[],
): Resume | null {
  if (!regions.length) return null

  // Index the map once: subtype -> where it lives.
  const where = new Map<string, { leg: Leg; stage: Stage; chapter: Chapter; region: Region }>()
  for (const region of regions) {
    for (const chapter of region.chapters) {
      for (const leg of chapter.legs) {
        for (const stage of leg.stages) {
          where.set(stage.subtype, { leg, stage, chapter, region })
        }
      }
    }
  }

  const mine = attempts.filter((a) => a.exam === exam && a.subtype)
  const counts = new Map<string, number>()
  for (const a of mine) {
    counts.set(a.subtype as string, (counts.get(a.subtype as string) ?? 0) + 1)
  }

  // Newest first. The log is appended in order, so walking it backwards is
  // walking back through time.
  for (let i = mine.length - 1; i >= 0; i--) {
    const sub = mine[i].subtype as string
    const spot = where.get(sub)
    if (!spot) continue                    // a recognition the bank dropped
    if (spot.stage.cleared) continue       // finished: sending them back is a dead click
    if (spot.stage.left <= 0) continue     // nothing unanswered left to serve
    return {
      ...spot,
      at: mine[i].at,
      seen: counts.get(sub) ?? 0,
      left: spot.stage.left,
    }
  }
  return null
}

/** "yesterday", "3 days ago" - a date a student can feel. */
export function sinceWords(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const days = Math.floor((now - then) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
