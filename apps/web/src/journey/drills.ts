import type { Exam } from '../exams/types'
import type { QuestionRef } from '../lib/bank'
import type { Attempt } from '../practice/mastery'

/**
 * Drilling the mistake rather than the topic.
 *
 * The bank tags every wrong answer with the error that produces it, which
 * nothing else in this space has. That makes a question possible that a
 * topic-level app cannot ask: not "what are you bad at" but "what do you
 * keep DOING".
 *
 * A student who keeps picking the complement - "not" for "is", "less" for
 * "greater" - does not need six more hard questions. They need six questions
 * engineered so that the complement is sitting there as a choice, across
 * different topics, until they stop reaching for it. Spreading the drill
 * across topics is the point: the error is the thing being practised, and
 * meeting it six times inside one recognition teaches that recognition
 * instead.
 */

/** Below this, a trap is a coincidence rather than a habit. */
export const HABIT = 3

export interface Trap {
  slug: string
  /** Times this error has been the recorded reason for a wrong answer. */
  hits: number
  /** Of all their wrong answers, the share this error accounts for. */
  share: number
  /** When it last caught them. */
  last: string
  /** Questions in the bank whose wrong answers are built on it. */
  available: number
}

export function traps(exam: Exam, attempts: readonly Attempt[],
  bank: readonly QuestionRef[]): Trap[] {
  const wrong = attempts.filter(
    (a) => a.exam === exam && !a.correct && a.misconception)
  if (!wrong.length) return []

  const hits = new Map<string, { n: number; last: string }>()
  for (const a of wrong) {
    const slug = a.misconception as string
    const cur = hits.get(slug) ?? { n: 0, last: a.at }
    cur.n += 1
    if (a.at > cur.last) cur.last = a.at
    hits.set(slug, cur)
  }

  const supply = new Map<string, number>()
  for (const q of bank) {
    for (const t of q.traps ?? []) supply.set(t, (supply.get(t) ?? 0) + 1)
  }

  return [...hits.entries()]
    .map(([slug, v]) => ({
      slug,
      hits: v.n,
      share: v.n / wrong.length,
      last: v.last,
      available: supply.get(slug) ?? 0,
    }))
    // A habit we can actually drill: seen enough times, and the bank has
    // questions that punish it. Offering a drill with nothing behind it is
    // worse than not offering one.
    .filter((t) => t.hits >= HABIT && t.available > 0)
    .sort((a, b) => b.hits - a.hits || b.share - a.share)
}

/**
 * Questions that punish one error, spread across as many topics as possible.
 *
 * Round-robin over recognitions rather than taking the first N: the error is
 * what is being practised, and six questions from one recognition would
 * teach the recognition instead.
 */
export function drillFor(
  slug: string,
  bank: readonly QuestionRef[],
  attempted: ReadonlySet<string>,
  n = 8,
): QuestionRef[] {
  const pools = new Map<string, QuestionRef[]>()
  for (const q of bank) {
    if (!(q.traps ?? []).includes(slug)) continue
    const key = q.subtype ?? q.skill
    const list = pools.get(key) ?? []
    list.push(q)
    pools.set(key, list)
  }
  // Unseen questions first inside each recognition, so a drill is new work.
  for (const list of pools.values()) {
    list.sort((a, b) =>
      Number(attempted.has(a.id)) - Number(attempted.has(b.id)))
  }

  const order = [...pools.values()]
  const out: QuestionRef[] = []
  for (let round = 0; out.length < n; round++) {
    let added = false
    for (const list of order) {
      if (round >= list.length) continue
      out.push(list[round])
      added = true
      if (out.length >= n) break
    }
    if (!added) break
  }
  return out
}
