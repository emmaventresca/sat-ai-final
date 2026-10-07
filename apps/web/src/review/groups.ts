// ---------------------------------------------------------------------------
// Review - the mistakes, organised.
//
// A wrong answer is the most useful thing a student produces, and until now it
// vanished the moment the round ended. This module keeps it: every miss joined
// back to the question type it came from and the named error that caused it,
// so "I keep getting transitions wrong" becomes "you pick contrast when the
// sentence is adding a second reason, nine times now".
//
// Two levels, because they answer different questions:
//
//   subtype          what kind of question keeps beating you
//   misconception    the specific wrong move you keep making inside it
//
// Nothing here touches React or the DOM, so the grouping and the three
// practice sets can be exercised on their own.
// ---------------------------------------------------------------------------

import type { Exam, Question, Tier } from '../exams/types'
import type { Attempt } from '../practice/mastery'

export const REINFORCE_N = 10

/** Worst first. A miss at Hard is a different problem from a miss at Easy. */
const TIER_ORDER: Tier[] = ['X', 'H', 'M', 'E', 'F']

export interface Miss {
  attempt: Attempt
  question: Question
  /** The named error their choice was built to catch, if the item names one. */
  family: string | null
  at: string
}

export interface FamilyCount {
  slug: string
  n: number
  name: string
}

export interface MissGroup {
  key: string
  exam: Exam
  subtype: string | null
  skill: string
  title: string
  count: number
  lastAt: string | null
  misses: Miss[]
  tiers: Partial<Record<Tier, number>>
  worstTier: Tier
  topFamilies: FamilyCount[]
}

export interface RelatedSets {
  again: Question[]
  twins: Question[]
  cousins: Question[]
  /** What we would have to write to fill each list. */
  shortTwins: number
  shortCousins: number
}

/**
 * A readable name for a misconception family.
 *
 * The taxonomy carries `label` (what to tell the student) and `when` (how to
 * assign it when authoring). Neither is a title, and `when` is an instruction
 * to an item writer that no student should ever be shown. So the heading is
 * the slug, made readable.
 */
export function familyName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * Every miss, newest first, joined to its question.
 *
 * Attempts outlive the bank: an item can be rewritten or dropped between
 * sessions, and the attempt row still refers to it. Those are skipped rather
 * than rendered as a blank card. The exam is checked on the way through as
 * well, so an SAT attempt can never be joined to an ACT item that happens to
 * carry the same id.
 */
export function misses(attempts: readonly Attempt[], bank: readonly Question[]): Miss[] {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const out: Miss[] = []
  for (const attempt of attempts) {
    if (attempt.correct) continue
    const question = byId.get(attempt.questionId)
    if (!question || question.exam !== attempt.exam) continue
    out.push({
      attempt,
      question,
      family: attempt.misconception ?? question.misconceptions?.[attempt.chosen] ?? null,
      at: attempt.at,
    })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * Misses grouped by question type, each with its own breakdown of errors.
 *
 * Ordered by how often the student misses it, not by how often the real test
 * asks it. This screen is about them; the home screen already argues about
 * what pays.
 */
export function missGroups(
  attempts: readonly Attempt[],
  bank: readonly Question[],
): MissGroup[] {
  const groups = new Map<string, MissGroup>()

  for (const miss of misses(attempts, bank)) {
    const q = miss.question
    const key = q.subtype ?? q.skill
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        exam: q.exam,
        subtype: q.subtype,
        skill: q.skill,
        title: q.subtypeName ?? q.subtype ?? q.skill ?? key,
        count: 0,
        lastAt: null,
        misses: [],
        tiers: {},
        worstTier: 'E',
        topFamilies: [],
      }
      groups.set(key, group)
    }
    group.misses.push(miss)
    group.tiers[q.difficulty] = (group.tiers[q.difficulty] ?? 0) + 1
  }

  for (const group of groups.values()) {
    group.count = group.misses.length
    group.lastAt = group.misses[0]?.at ?? null

    const counted = new Map<string, number>()
    for (const miss of group.misses) {
      if (miss.family) counted.set(miss.family, (counted.get(miss.family) ?? 0) + 1)
    }
    group.topFamilies = [...counted.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([slug, n]) => ({ slug, n, name: familyName(slug) }))

    // Where they are losing them, which is where reinforcement should sit.
    group.worstTier = TIER_ORDER.find((t) => group.tiers[t]) ?? 'E'
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)),
  )
}

/** Which exams the student has misses in, so the screen can offer a switch. */
export function examsWithMisses(attempts: readonly Attempt[]): Exam[] {
  const found = new Set<Exam>()
  for (const a of attempts) if (!a.correct) found.add(a.exam)
  return (['sat', 'act'] as Exam[]).filter((e) => found.has(e))
}

/**
 * The three things a student can usefully do with a group of mistakes.
 *
 *   again    the exact questions they got wrong, to sit again
 *   twins    same recognition AND built to catch the same error - the
 *            closest thing to "that question, with different numbers"
 *   cousins  same recognition, a different angle on it
 *
 * The split matters. Re-sitting the same question tests memory as much as
 * understanding, and ten unrelated questions from the same skill is what
 * made the old "more practice" button feel like busywork. The useful middle
 * is a question that goes wrong the same way.
 */
export function relatedSets(
  group: MissGroup,
  bank: readonly Question[],
  attempts: readonly Attempt[],
  n: number = REINFORCE_N,
): RelatedSets {
  const wanted = new Set(group.topFamilies.map((f) => f.slug))
  const missedIds = new Set(group.misses.map((m) => m.question.id))
  const seen = new Set(attempts.filter((a) => a.exam === group.exam).map((a) => a.questionId))

  const pool = bank.filter(
    (q) =>
      q.exam === group.exam &&
      (group.subtype ? q.subtype === group.subtype : q.skill === group.skill) &&
      !missedIds.has(q.id),
  )

  const catches = (q: Question) =>
    Object.values(q.misconceptions ?? {}).some((f) => wanted.has(f))

  const atWorst = (q: Question) => (q.difficulty === group.worstTier ? -1 : 1)

  const rank = (a: Question, b: Question) =>
    Number(seen.has(a.id)) - Number(seen.has(b.id)) // unseen first
    || atWorst(a) - atWorst(b)
    || a.id.localeCompare(b.id)

  const twins = pool.filter(catches).sort(rank)
  const cousins = pool.filter((q) => !catches(q)).sort(rank)

  return {
    again: group.misses.map((m) => m.question),
    twins: twins.slice(0, n),
    cousins: cousins.slice(0, n),
    shortTwins: Math.max(0, n - twins.length),
    shortCousins: Math.max(0, n - cousins.length),
  }
}
