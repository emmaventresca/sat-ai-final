import type { Exam, ExamSpec } from '../exams/types'
import type { Attempt } from '../practice/mastery'

/**
 * What the next fifty points are actually made of.
 *
 * A student grinding at 1450 does not need more questions. They need the ten
 * recognitions that are costing them the marks, and that is a diagnosis
 * nobody can do at topic level: "Algebra 72%" is four hundred questions wide
 * and tells you nothing about what to do on Tuesday.
 *
 * Two numbers, and the order matters:
 *
 *   MISSED PER TEST is model-free. How often the real exam asks this
 *   recognition, times how often this student gets it wrong. Both halves are
 *   measured - the frequency from the College Board sample we classified,
 *   the accuracy from their own attempts - so this number is as good as the
 *   evidence behind it and nothing else.
 *
 *   POINTS is an ESTIMATE and is labelled as one wherever it is shown. It
 *   assumes a section's scaled range is spread evenly over its questions,
 *   which is not how either test actually scales - the curve is flatter in
 *   the middle and steeper at the top. It is here because "costs you about
 *   30 points" is the sentence that makes a student act, and "0.42 questions
 *   per test" is not. Ranking uses missed-per-test, so the estimate never
 *   decides the order.
 *
 * A recognition the student has barely touched is reported as thin rather
 * than as a gap. Two attempts at 0% is not evidence of a weakness, it is
 * evidence of two attempts, and sending someone to grind their "worst"
 * recognition on that basis is how a diagnosis loses trust.
 */

/** Below this many attempts, accuracy is noise rather than a measurement. */
export const ENOUGH = 5

export interface SubtypeCount {
  slug: string
  skill: string
  section: string
  count_total: number
  section_total: number
}

export interface Gap {
  subtype: string
  name: string
  skill: string
  section: string
  /** Attempts this student has made here. */
  seen: number
  /** Of those, how many were right. */
  right: number
  accuracy: number
  /** How often the real exam asks this, in questions per test. */
  perTest: number
  /** perTest x (1 - accuracy). The number the ranking uses. */
  missedPerTest: number
  /** Estimated scaled points, assuming the section scales evenly. */
  points: number
  /** Too few attempts to call this a weakness yet. */
  thin: boolean
  /** Questions in the bank they have not answered here. */
  left: number
}

export interface GapReport {
  gaps: Gap[]
  /** Recognitions never attempted at all - unknown, not strong. */
  untested: number
  /** Sum of `points` over the non-thin gaps. */
  headroom: number
}

/**
 * Rank a student's recognitions by what they are costing.
 *
 * `counts` is data/subtype_counts.json; `names` maps slug to a readable name.
 */
export function scoreGaps(
  exam: Exam,
  spec: ExamSpec,
  attempts: readonly Attempt[],
  counts: Record<string, SubtypeCount>,
  names: Record<string, string>,
  bankBySubtype: Record<string, number> = {},
): GapReport {
  const mine = attempts.filter((a) => a.exam === exam && a.subtype)

  const tally = new Map<string, { seen: number; right: number }>()
  for (const a of mine) {
    const t = tally.get(a.subtype as string) ?? { seen: 0, right: 0 }
    t.seen += 1
    if (a.correct) t.right += 1
    tally.set(a.subtype as string, t)
  }

  const bySection = new Map(spec.sections.map((s) => [s.id, s]))
  const gaps: Gap[] = []

  for (const [slug, t] of tally) {
    const meta = counts[slug]
    if (!meta) continue
    const section = bySection.get(meta.section)
    if (!section || !meta.section_total) continue

    const accuracy = t.right / t.seen
    // Share of the section, turned into questions on one real test.
    const perTest = (meta.count_total / meta.section_total) * section.questions
    const missedPerTest = perTest * (1 - accuracy)
    const perQuestion = (section.score[1] - section.score[0]) / section.questions

    gaps.push({
      subtype: slug,
      name: names[slug] ?? slug,
      skill: meta.skill,
      section: meta.section,
      seen: t.seen,
      right: t.right,
      accuracy,
      perTest,
      missedPerTest,
      points: missedPerTest * perQuestion,
      thin: t.seen < ENOUGH,
      left: bankBySubtype[slug] ?? 0,
    })
  }

  // Worst first, by the measured number rather than the estimated one. Thin
  // evidence sinks below solid evidence regardless of how bad it looks.
  gaps.sort((a, b) =>
    Number(a.thin) - Number(b.thin)
    || b.missedPerTest - a.missedPerTest
    || b.perTest - a.perTest)

  const solid = gaps.filter((g) => !g.thin)
  return {
    gaps,
    untested: Object.keys(counts).filter(
      (s) => counts[s] && !tally.has(s)
        && bySection.has(counts[s].section)).length,
    headroom: solid.reduce((n, g) => n + g.points, 0),
  }
}

/** The sentence a student should read. Deliberately blunt about evidence. */
export function gapLine(g: Gap): string {
  const asks = g.perTest >= 1
    ? `about ${Math.round(g.perTest)} question${Math.round(g.perTest) === 1 ? '' : 's'} a test`
    : `roughly 1 question every ${Math.max(2, Math.round(1 / g.perTest))} tests`
  return `${Math.round(g.accuracy * 100)}% on ${g.seen}, and the exam asks it ${asks}`
}
