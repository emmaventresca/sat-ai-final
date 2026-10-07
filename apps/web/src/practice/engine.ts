import type { Exam, Question, Tier } from '../exams/types'
import { cellKey, progress, type Cell } from './mastery'

/**
 * What to study next, and when to see it again.
 *
 * Two ideas carried over from the vanilla app, both of which are the point of
 * the whole thing:
 *
 *   The BAND MODEL stops over-teaching. A student at 1000 aiming at 1300 does
 *   not need Hard questions - the official conversion tables say the points
 *   are in Easy and Medium, and an hour spent on Hard is an hour not spent
 *   where their marks actually are. So each tier carries a weight derived
 *   from the target, and a tier the target does not require scores zero.
 *
 *   REACHABILITY stops the opposite failure. When a target needs only part of
 *   a tier, those points should come from recognitions the student is already
 *   close in, not from their worst one. Hard is earned by proving Medium in
 *   the SAME recognition - being fluent at bare systems says nothing about
 *   whether the word-problem version is reachable.
 *
 * Both are measured at the RECOGNITION, never the skill. "Systems of two
 * linear equations" covers solving a bare system, translating a story into
 * one, and finding the constant that makes it have no solution; a student can
 * be fluent at one and lost at another, and averaging those gives a number
 * that names no action.
 */

export interface Bands {
  sections: Record<string, { targets: BandTarget[] }>
}

interface BandTarget {
  target: number
  band_weight: Partial<Record<Tier, number>>
}

export interface StudentTargets {
  /** Target per section, e.g. { rw: 650, math: 700 } or { composite: 32 }. */
  [section: string]: number | undefined
}

const PRIOR: Record<string, number> = { F: 0.15, E: 0.25, M: 0.45, H: 0.65, X: 0.8 }
// Leitner intervals in days. A miss drops to box 1 and comes back inside the
// session, because the thing to fix is fresh then and gone tomorrow.
const BOX_DAYS = [0, 1, 3, 7, 21, 60]

/**
 * The weight each tier carries for a target.
 *
 * Interpolation is deliberately absent: the table is published at ten-point
 * steps and the nearest row is the honest answer. Smoothing between them
 * would invent precision the conversion tables do not have.
 */
export function bandWeights(
  bands: Bands | null, section: string, target: number | undefined,
): Partial<Record<Tier, number>> {
  const rows = bands?.sections?.[section]?.targets
  // No table for this exam. Every tier counts equally rather than pretending
  // to a precision we do not have - see the note in Practice about ACT.
  if (!rows?.length || !target) return { F: 1, E: 1, M: 1, H: 1, X: 1 }
  let best = rows[0]
  for (const row of rows) {
    if (Math.abs(row.target - target) < Math.abs(best.target - target)) best = row
  }
  // Our own tiers are not on the exam, so the table says nothing about them.
  // Foundations tracks Easy, Stretch tracks Hard.
  const w = best.band_weight
  return { ...w, F: w.E ?? 0, X: w.H ?? 0 }
}

/** Probability the student misses this cell next, smoothed toward the prior. */
export function pMiss(cell: Cell | undefined, tier: Tier): number {
  const prior = PRIOR[tier] ?? 0.5
  if (!cell?.seen) return prior
  const w = 3
  const accuracy = (cell.correct + (1 - prior) * w) / (cell.seen + w)
  return Math.max(0.02, Math.min(0.98, 1 - accuracy))
}

/**
 * How reachable a tier is in this recognition.
 *
 * Without this the engine sends a student who is shaky everywhere straight at
 * Hard questions, because Hard-weighted content scores well on frequency -
 * which is exactly the over-teaching the band model exists to prevent.
 */
export function reachability(
  exam: Exam, unit: string, tier: Tier, mastery: Record<string, Cell>,
): number {
  const below: Partial<Record<Tier, Tier>> = { M: 'E', H: 'M', X: 'H' }
  const under = below[tier]
  if (!under) return 1                                   // F and E need nothing
  const cell = mastery[cellKey(exam, unit, under)]
  if (!cell?.seen) return 0.25                           // unproven, not barred
  const acc = cell.correct / cell.seen
  // Strong evidence settles the tiers below it: a student at 85% over five
  // or more does not have to grind the lower rung to be allowed up.
  if (cell.seen >= 5 && acc >= 0.85) return 1
  return Math.max(0.25, Math.min(1, acc))
}

export function isDue(cell: Cell | undefined, now = new Date()): boolean {
  if (!cell?.dueAt) return true
  return Date.parse(cell.dueAt) <= now.getTime()
}

/** Leitner. A miss always drops straight back to box one. */
export function nextReview(cell: Cell | undefined, correct: boolean, now = new Date()) {
  const box = correct ? Math.min(5, (cell?.box ?? 1) + 1) : 1
  const due = new Date(now)
  if (correct) due.setDate(due.getDate() + BOX_DAYS[box])
  else due.setMinutes(due.getMinutes() + 10)
  return { box, dueAt: due.toISOString() }
}

export interface Ranked {
  subtype: string
  name: string
  section: string
  tier: Tier
  value: number
  pool: number
  seen: number
  accuracy: number | null
  due: boolean
}

/**
 * What to work on next, ranked.
 *
 *     value = P(miss) x how often the exam asks it x band weight x reachability
 *
 * Each term kills a different failure. Without P(miss) it drills what they
 * already know; without frequency it spends an hour on something the test
 * asks twice a year; without the band weight it teaches Hard to a student
 * who needs Easy; without reachability it teaches Hard to a student who has
 * not got Medium.
 */
export function rank(
  exam: Exam,
  bank: Question[],
  bands: Bands | null,
  targets: StudentTargets,
  limit = 12,
): Ranked[] {
  const { mastery } = progress()
  const cells = new Map<string, { pool: Question[]; q: Question }>()
  for (const q of bank) {
    if (!q.subtype) continue
    const key = `${q.subtype}|${q.difficulty}`
    const entry = cells.get(key)
    if (entry) entry.pool.push(q)
    else cells.set(key, { pool: [q], q })
  }

  const out: Ranked[] = []
  for (const [, { pool, q }] of cells) {
    const subtype = q.subtype as string
    const tier = q.difficulty
    const weight = bandWeights(bands, q.section, targets[q.section])[tier] ?? 0
    if (weight <= 0.02) continue                         // not on their list

    const cell = mastery[cellKey(exam, subtype, tier)]
    const due = isDue(cell)
    const reach = reachability(exam, subtype, tier, mastery)
    // How often the real test asks this, where we measured it. Pool size is
    // a poor stand-in but it is the only signal the ACT bank carries.
    const frequency = Math.min(pool.length, 40) / 40
    const value = pMiss(cell, tier) * frequency * weight * reach * (due ? 1 : 0.15)

    out.push({
      subtype, name: q.subtypeName || subtype, section: q.section, tier,
      value, pool: pool.length,
      seen: cell?.seen ?? 0,
      accuracy: cell?.seen ? cell.correct / cell.seen : null,
      due,
    })
  }
  return out.sort((a, b) => b.value - a.value).slice(0, limit)
}

/** Cells whose review has come round again. */
export function dueNow(exam: Exam, bank: Question[]): Ranked[] {
  const { mastery } = progress()
  const seen = new Set(
    Object.keys(mastery).filter((k) => k.startsWith(`${exam}|`) && mastery[k].seen > 0),
  )
  const out: Ranked[] = []
  for (const key of seen) {
    const [, unit, tier] = key.split('|')
    const cell = mastery[key]
    if (!isDue(cell)) continue
    const pool = bank.filter((q) => q.subtype === unit && q.difficulty === tier)
    if (!pool.length) continue
    out.push({
      subtype: unit, name: pool[0].subtypeName || unit, section: pool[0].section,
      tier: tier as Tier, value: pMiss(cell, tier as Tier), pool: pool.length,
      seen: cell.seen, accuracy: cell.correct / cell.seen, due: true,
    })
  }
  return out.sort((a, b) => b.value - a.value)
}
