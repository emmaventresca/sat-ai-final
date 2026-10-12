import type { Exam, Question, Tier } from '../exams/types'
import type { Attempt } from '../practice/mastery'
import { missGroups, relatedSets, type MissGroup } from './groups'

/**
 * A set drawn from what a student has actually been getting wrong lately.
 *
 * The Review screen already grouped mistakes well, but it asked the student
 * to choose: which recognition, then which of three practice sets. That is a
 * fine screen for someone who already knows what they want to work on, and
 * it is the wrong screen for the far more common moment - a student with
 * twenty spare minutes who knows only that they are not getting better.
 *
 * So this builds the set for them. Worst recognition first, the exact
 * questions they missed at the front (because re-sitting the one that beat
 * you is the single highest-yield question available), then twins built to
 * catch the same named error, then a cousin or two for width.
 *
 * Capped at twenty. Past that it stops being a session and becomes homework,
 * and a student who does not finish a set learns that sets do not get
 * finished.
 */
export const SET_MIN = 10
export const SET_MAX = 20

/** How recent is recent. Older misses are the Review screen's job. */
const WINDOW_DAYS = 21

export interface LessonLink {
  subtype: string
  name: string
  /** What this recognition keeps costing them. */
  why: string
  misses: number
}

export interface RecentPlan {
  /** Ready to sit, in order. */
  questions: Question[]
  /** The recognitions it covers, worst first. */
  groups: MissGroup[]
  /** Pages worth reading before or after, most useful first. */
  lessons: LessonLink[]
  /** How many misses the plan was drawn from. */
  from: number
  /** Misses we could not build practice for, because the bank is thin. */
  thin: string[]
}

function withinWindow(at: string, now: number): boolean {
  const t = Date.parse(at)
  return Number.isFinite(t) && now - t <= WINDOW_DAYS * 86400000
}

/**
 * Build the set.
 *
 * Takes from each group in turn rather than draining the worst one first:
 * twenty questions on the single recognition they are worst at is a set that
 * confirms they are bad at it, and three recognitions worked properly is a
 * set that moves a score.
 */
export function recentPlan(
  exam: Exam,
  attempts: readonly Attempt[],
  bank: readonly Question[],
  now: number = Date.now(),
): RecentPlan {
  const recent = attempts.filter(
    (a) => a.exam === exam && !a.correct && withinWindow(a.at, now),
  )
  const groups = missGroups(recent, bank).slice(0, 5)
  if (!groups.length) {
    return { questions: [], groups: [], lessons: [], from: 0, thin: [] }
  }

  // Per group: the misses themselves, then twins, then cousins.
  const queues = groups.map((g) => {
    const sets = relatedSets(g, bank, attempts, SET_MAX)
    const seen = new Set<string>()
    const queue: Question[] = []
    for (const q of [...sets.again, ...sets.twins, ...sets.cousins]) {
      if (seen.has(q.id)) continue
      seen.add(q.id)
      queue.push(q)
    }
    return { group: g, queue, at: 0 }
  })

  const picked: Question[] = []
  const used = new Set<string>()
  // Round-robin, weighted by how often each recognition is going wrong: a
  // group with nine misses gets more of the set than one with two, without
  // ever taking all of it.
  while (picked.length < SET_MAX) {
    let took = false
    for (const q of queues) {
      const share = Math.max(1, Math.round(q.group.count / 3))
      for (let i = 0; i < share && picked.length < SET_MAX; i++) {
        const next = q.queue[q.at]
        if (!next) break
        q.at += 1
        if (used.has(next.id)) continue
        used.add(next.id)
        picked.push(next)
        took = true
      }
    }
    if (!took) break
  }

  const thin = queues
    .filter((q) => q.queue.length < 3)
    .map((q) => q.group.title)

  return {
    questions: picked,
    groups,
    lessons: lessonsFor(groups),
    from: recent.length,
    thin,
  }
}

/**
 * What to read, and why.
 *
 * The "why" is built from the student's own record rather than from the
 * lesson - "you have missed this nine times, six of them picking the
 * contrast word" is a reason to open a page, and "learn about transitions"
 * is not.
 */
export function lessonsFor(groups: readonly MissGroup[]): LessonLink[] {
  return groups
    .filter((g) => g.subtype)
    .map((g) => {
      const top = g.topFamilies[0]
      const tier = TIER_WORD[g.worstTier]
      const why = top
        ? `${g.count} missed, ${top.n} of them the same way — ${top.name.toLowerCase()}`
        : `${g.count} missed, mostly at ${tier}`
      return { subtype: g.subtype as string, name: g.title, why, misses: g.count }
    })
    .slice(0, 4)
}

const TIER_WORD: Record<Tier, string> = {
  F: 'Foundations', E: 'Easy', M: 'Medium', H: 'Hard', X: 'Challenge',
}

/** Enough to be worth offering. Below this the banner stays quiet. */
export function worthOffering(plan: RecentPlan): boolean {
  return plan.questions.length >= SET_MIN
}
