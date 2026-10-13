import type { Exam } from '../exams/types'
import type { Attempt } from '../practice/mastery'

/**
 * What changed this week, per student.
 *
 * The teacher's real time sink is not marking - it is working out what to
 * teach next, per student, from a pile of numbers that describe the whole
 * term rather than the week. A term average barely moves, so it cannot
 * answer "what happened since Tuesday", which is the only question that
 * decides the next session.
 *
 * So everything here is a COMPARISON of two windows, and the discipline
 * that makes it trustworthy is refusing to report movement that is not
 * there. A recognition that went from 1-of-2 to 2-of-3 has not improved by
 * 17 points; it has been answered five times. Both windows need real
 * evidence before a change is claimed, and anything below that is reported
 * as "not enough to tell" rather than quietly rounded into a trend.
 *
 * Nothing here is stored. It is derived from the attempt log each time, so
 * it can never drift from what the student actually did.
 */

const DAY = 86400000

/** Attempts needed in EACH window before a change is called a change. */
export const ENOUGH_EACH = 4

/** Percentage points of movement worth a teacher's attention. */
export const NOTABLE = 10

export interface Movement {
  subtype: string
  name: string
  beforeSeen: number
  afterSeen: number
  before: number
  after: number
  /** Percentage points, positive is better. */
  delta: number
}

export interface Habit {
  slug: string
  now: number
  before: number
}

export interface Digest {
  exam: Exam
  days: number
  /** No attempts at all in the window. The most important thing to say. */
  quiet: boolean
  answered: number
  answeredBefore: number
  minutes: number
  accuracy: number | null
  accuracyBefore: number | null
  improved: Movement[]
  slipped: Movement[]
  /** Errors that got worse, or appeared, this week. */
  habits: Habit[]
  /** Recognitions met this week for the first time. */
  newlyMet: string[]
  /** Mistakes still not fixed. */
  unfixed: number
}

export function digestFor(
  exam: Exam,
  attempts: readonly Attempt[],
  names: Record<string, string> = {},
  days = 7,
  now = Date.now(),
): Digest {
  const mine = attempts.filter((a) => a.exam === exam)
  const cut = now - days * DAY
  const prevCut = now - 2 * days * DAY

  const at = (a: Attempt) => new Date(a.at).getTime()
  const week = mine.filter((a) => at(a) >= cut)
  const prior = mine.filter((a) => at(a) >= prevCut && at(a) < cut)

  const rate = (list: readonly Attempt[]) =>
    list.length ? list.filter((a) => a.correct).length / list.length : null

  // Movement, recognition by recognition, but only where both windows
  // carry enough attempts to mean anything.
  const improved: Movement[] = []
  const slipped: Movement[] = []
  const subs = new Set<string>()
  for (const a of [...week, ...prior]) if (a.subtype) subs.add(a.subtype)

  for (const sub of subs) {
    const now7 = week.filter((a) => a.subtype === sub)
    const then7 = prior.filter((a) => a.subtype === sub)
    if (now7.length < ENOUGH_EACH || then7.length < ENOUGH_EACH) continue
    const after = rate(now7) as number
    const before = rate(then7) as number
    const delta = (after - before) * 100
    if (Math.abs(delta) < NOTABLE) continue
    const m: Movement = {
      subtype: sub,
      name: names[sub] ?? sub,
      beforeSeen: then7.length,
      afterSeen: now7.length,
      before,
      after,
      delta,
    }
    ;(delta > 0 ? improved : slipped).push(m)
  }
  improved.sort((a, b) => b.delta - a.delta)
  slipped.sort((a, b) => a.delta - b.delta)

  // Errors rising. A named error is worth saying out loud the week it
  // starts, because that is when it is cheapest to unteach.
  const count = (list: readonly Attempt[]) => {
    const m = new Map<string, number>()
    for (const a of list) {
      if (a.correct || !a.misconception) continue
      m.set(a.misconception, (m.get(a.misconception) ?? 0) + 1)
    }
    return m
  }
  const nowErr = count(week)
  const thenErr = count(prior)
  const habits: Habit[] = [...nowErr.entries()]
    .map(([slug, n]) => ({ slug, now: n, before: thenErr.get(slug) ?? 0 }))
    .filter((h) => h.now >= 2 && h.now > h.before)
    .sort((a, b) => (b.now - b.before) - (a.now - a.before) || b.now - a.now)

  // Recognitions met for the first time this week.
  const everBefore = new Set(
    mine.filter((a) => at(a) < cut).map((a) => a.subtype).filter(Boolean) as string[])
  const newlyMet = [...new Set(
    week.map((a) => a.subtype).filter((s): s is string => Boolean(s)))]
    .filter((s) => !everBefore.has(s))
    .map((s) => names[s] ?? s)

  // Still wrong, never since answered right.
  const best = new Map<string, boolean>()
  for (const a of mine) {
    best.set(a.questionId, (best.get(a.questionId) ?? false) || a.correct)
  }
  let unfixed = 0
  for (const ok of best.values()) if (!ok) unfixed += 1

  return {
    exam,
    days,
    quiet: week.length === 0,
    answered: week.length,
    answeredBefore: prior.length,
    minutes: Math.round(
      week.reduce((n, a) => n + (a.ms ?? 0), 0) / 60000),
    accuracy: rate(week),
    accuracyBefore: rate(prior),
    improved,
    slipped,
    habits,
    newlyMet,
    unfixed,
  }
}

/** One line a teacher can read without opening anything. */
export function headline(d: Digest): string {
  if (d.quiet) {
    return d.answeredBefore > 0
      ? `Nothing this week, after ${d.answeredBefore} last week.`
      : 'No practice yet.'
  }
  const vs = d.answeredBefore > 0
    ? `, against ${d.answeredBefore} last week`
    : ''
  const acc = d.accuracy === null ? '' : ` at ${Math.round(d.accuracy * 100)}%`
  return `${d.answered} questions${acc}${vs}.`
}
