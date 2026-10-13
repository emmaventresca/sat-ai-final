import type { Exam, Question, Tier } from '../exams/types'
import { cellKey, progress } from '../practice/mastery.ts'

/**
 * When to offer a student the next rung.
 *
 * A streak is the right signal - it says "this is going in now", which is
 * what you want to know - but one number for every level is wrong at both
 * ends, and wrong in the way that wastes the most time.
 *
 * If a student's true accuracy is 80%, the chance of ten straight is 10.7%.
 * At Foundations that means roughly forty questions before the offer fires,
 * which is precisely the trap of sitting through a hundred and fifty easy
 * ones. At Hard, ten in a row is twenty minutes of long questions to prove
 * something five already proved.
 *
 * So the threshold scales with how much ONE correct answer tells you. A
 * Foundations question right tells you little on its own and takes twenty
 * seconds; a Hard one tells you a great deal and takes two minutes.
 *
 * Reading questions get one fewer at every rung, because a passage question
 * is sixty to ninety seconds where the equivalent maths question is twenty -
 * the same streak costs three times the lesson.
 */
const STREAK: Record<Tier, number> = { F: 5, E: 8, M: 10, H: 5, X: 4 }

const VERBAL = new Set(['rw', 'english', 'reading'])

export function streakNeeded(tier: Tier, section: string): number {
  const base = STREAK[tier] ?? 8
  return VERBAL.has(section) ? Math.max(3, base - 1) : base
}

const NEXT: Partial<Record<Tier, Tier>> = { F: 'E', E: 'M', M: 'H', H: 'X' }

/**
 * Levels a student has to finish rather than streak out of.
 *
 * A thin Hard cell is not a grind, it is the whole of what the exam offers
 * at the top of that recognition - and a student aiming at 1550 needs every
 * one of them. Streaking out of eight Hard questions to "save time" saves
 * nothing and costs the four they never saw.
 */
const EXHAUST = new Set<Tier>(['H', 'X'])
const EXHAUST_UNDER = 10

export interface Offer {
  from: Tier
  to: Tier
  streak: number
  /** Questions waiting at the next level. */
  waiting: number
}

/**
 * Has this student earned the offer?
 *
 * An OFFER, never a move. Nothing here is locked, and a student who wants to
 * stay and get ten more right is allowed to - the app's job is to notice
 * that they are ready, not to decide for them.
 */
export function promotionFor(
  exam: Exam, subtype: string, tier: Tier, section: string, bank: { difficulty: Tier }[],
): Offer | null {
  const to = NEXT[tier]
  if (!to) return null
  const cell = progress().mastery[cellKey(exam, subtype, tier)]
  const needed = streakNeeded(tier, section)
  if (!cell || cell.streak < needed) return null

  // At the top of the ladder a thin cell has to be finished, not streaked
  // out of: a student chasing the last marks needs every Hard question
  // there is, and there are only ever a handful.
  const here = bank.filter((q) => q.difficulty === tier).length
  if (EXHAUST.has(tier) && here < EXHAUST_UNDER && cell.seen < here) return null
  const waiting = bank.filter((q) => q.difficulty === to).length
  // Offering a level with nothing in it is worse than not offering: the
  // student accepts and lands on an empty page.
  if (!waiting) return null
  return { from: tier, to, streak: cell.streak, waiting }
}

/** Was that run long enough, counting only this round? */
export function runInRound(results: readonly boolean[]): number {
  let run = 0
  for (let i = results.length - 1; i >= 0 && results[i]; i--) run += 1
  return run
}

/** Questions at one level of one recognition. */
export function atTier(bank: Question[], subtype: string, tier: Tier): Question[] {
  return bank.filter((q) => q.subtype === subtype && q.difficulty === tier)
}

export interface Remaining {
  total: number
  attempted: number
  left: number
  /** Added since this student last practised the recognition. */
  fresh: number
}

/**
 * What is still unanswered here.
 *
 * A student who moves up a level has not finished the one below, and the
 * app should say so rather than quietly closing it. The bar fills to what
 * they have actually done; the number says what is left.
 *
 * `fresh` is the other half. The bank grows, and someone who worked through
 * a recognition last month should be told that there are new ones rather
 * than having to notice the count went up.
 */
export function remainingIn(
  refs: { id: string; added?: string }[],
  attemptedIds: ReadonlySet<string>,
  since: string | null,
): Remaining {
  let attempted = 0
  let fresh = 0
  for (const ref of refs) {
    if (attemptedIds.has(ref.id)) {
      attempted += 1
      continue
    }
    if (ref.added && since && ref.added > since) fresh += 1
  }
  return {
    total: refs.length,
    attempted,
    left: refs.length - attempted,
    fresh,
  }
}

/** When this student last answered anything in this recognition. */
export function lastTouched(exam: Exam, subtype: string): string | null {
  const hits = progress().attempts.filter(
    (a) => a.exam === exam && a.subtype === subtype,
  )
  return hits.length ? hits[hits.length - 1].at.slice(0, 10) : null
}

/**
 * The order a round serves questions in.
 *
 * New questions first, then ones never attempted, then the rest. Putting
 * new ones at the front is what makes a bank edit visible the same day: a
 * teacher adds twenty questions in the morning and the student meets them
 * that evening instead of after the other hundred and fifty.
 */
export function serveOrder<T extends { id: string; added?: string }>(
  refs: T[], attemptedIds: ReadonlySet<string>, since: string | null,
): T[] {
  const bucket = (r: T) => {
    if (!attemptedIds.has(r.id) && r.added && since && r.added > since) return 0
    if (!attemptedIds.has(r.id)) return 1
    return 2
  }
  return [...refs].sort((a, b) => bucket(a) - bucket(b) || a.id.localeCompare(b.id))
}

/**
 * Is Challenge open yet?
 *
 * Challenge is above anything the exam asks, and it is only worth a
 * student's time once the hardest thing the exam DOES ask is behind them.
 * Opening it early is how a student aiming at 1500 spends an evening on
 * questions beyond the test while real Hard questions sit unanswered.
 *
 * The gate is every Hard question in the recognition answered CORRECTLY at
 * least once - not merely met. The caller passes resolved ids, not attempted
 * ones (Stage.tsx), because a question the student missed and never came
 * back to is the opposite of evidence they are ready for the tier above it.
 * Missing it and moving on must not read as completing it.
 *
 * It is not a streak and it is not a percentage: a missed Hard question stays
 * on the list until it is fixed, and fixing it is what opens the tier.
 *
 * This is the one locked thing in the app, and it locks forward rather than
 * back: nothing a student has already reached is ever taken away.
 */
export interface Gate {
  open: boolean
  /** Hard questions in this recognition not yet answered correctly. */
  hardLeft: number
  hardTotal: number
}

export function challengeGate(
  refs: readonly { id: string; difficulty: Tier }[],
  clearedIds: ReadonlySet<string>,
): Gate {
  const hard = refs.filter((q) => q.difficulty === 'H')
  const left = hard.filter((q) => !clearedIds.has(q.id)).length
  return {
    // A recognition with no Hard questions at all cannot gate on them -
    // that would lock Challenge forever on exactly the thin recognitions
    // where it is the only thing left to do.
    open: hard.length === 0 || left === 0,
    hardLeft: left,
    hardTotal: hard.length,
  }
}
