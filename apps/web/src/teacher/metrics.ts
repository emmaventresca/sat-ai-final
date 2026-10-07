import type { Exam } from '../exams/types'
import { progress, type Attempt } from '../practice/mastery'

/**
 * What a teacher actually needs to know about a student.
 *
 * Accuracy on its own is the least useful number here. A student at 80% in
 * nine minutes and a student at 80% in forty need different lessons, and a
 * student who answered forty questions last week and none this week needs a
 * different conversation again. So: volume, time, pace, consistency, and
 * where the misses cluster - all of which the attempt log already holds and
 * nothing was reading.
 */
export interface Metrics {
  exam: Exam
  answered: number
  correct: number
  accuracy: number | null
  /** Total time on question, in seconds. */
  seconds: number
  /** Median seconds per question. The median, because one abandoned tab
   *  sitting open for an hour wrecks a mean and tells you nothing. */
  medianSeconds: number | null
  activeDays: number
  lastSeen: string | null
  /** Answered in the last seven days, and the seven before that. */
  last7: number
  prev7: number
  byTier: Record<string, { seen: number; correct: number }>
  bySection: Record<string, { seen: number; correct: number }>
  /** Recognitions they are losing, worst first. */
  weakest: { subtype: string; name: string; seen: number; accuracy: number }[]
  /** Named errors, most frequent first. */
  errors: { slug: string; count: number }[]
  /** How they do by wording family - the axis topic alone cannot show. */
  byPhrasing: { phrasing: string; seen: number; accuracy: number }[]
  recent: Attempt[]
}

const DAY = 86400000

export function metricsFor(
  exam: Exam,
  names: Record<string, string> = {},
  phrasingOf: Record<string, string> = {},
): Metrics {
  const attempts = progress().attempts.filter((a) => a.exam === exam)
  const answered = attempts.length
  const correct = attempts.filter((a) => a.correct).length

  const times = attempts.map((a) => a.ms).filter((n): n is number => typeof n === 'number')
  // Anything over ten minutes is a tab left open, not thinking. Counting it
  // would make the pace number useless in exactly the common case.
  const real = times.filter((ms) => ms > 500 && ms < 10 * 60000).sort((a, b) => a - b)

  const days = new Set(attempts.map((a) => a.at.slice(0, 10)))
  const now = Date.now()
  const since = (from: number, to: number) =>
    attempts.filter((a) => {
      const t = Date.parse(a.at)
      return t > now - from * DAY && t <= now - to * DAY
    }).length

  const byTier: Metrics['byTier'] = {}
  const bySection: Metrics['bySection'] = {}
  const bySubtype = new Map<string, { seen: number; correct: number }>()
  const errors = new Map<string, number>()
  const byPhrasing = new Map<string, { seen: number; correct: number }>()

  for (const a of attempts) {
    const tier = (byTier[a.difficulty] ??= { seen: 0, correct: 0 })
    tier.seen += 1
    tier.correct += a.correct ? 1 : 0
    if (a.subtype) {
      const s = bySubtype.get(a.subtype) ?? { seen: 0, correct: 0 }
      s.seen += 1
      s.correct += a.correct ? 1 : 0
      bySubtype.set(a.subtype, s)
    }
    if (a.misconception) errors.set(a.misconception, (errors.get(a.misconception) ?? 0) + 1)
    const fam = phrasingOf[a.questionId]
    if (fam) {
      const p = byPhrasing.get(fam) ?? { seen: 0, correct: 0 }
      p.seen += 1
      p.correct += a.correct ? 1 : 0
      byPhrasing.set(fam, p)
    }
  }

  return {
    exam,
    answered,
    correct,
    accuracy: answered ? correct / answered : null,
    seconds: Math.round(real.reduce((n, ms) => n + ms, 0) / 1000),
    medianSeconds: real.length ? Math.round(real[Math.floor(real.length / 2)] / 1000) : null,
    activeDays: days.size,
    lastSeen: attempts.length ? attempts[attempts.length - 1].at : null,
    last7: since(7, 0),
    prev7: since(14, 7),
    byTier,
    bySection,
    weakest: [...bySubtype.entries()]
      // Three is the fewest that can mean anything. Below it a single
      // unlucky question would top the list of what to reteach.
      .filter(([, s]) => s.seen >= 3)
      .map(([subtype, s]) => ({
        subtype, name: names[subtype] ?? subtype,
        seen: s.seen, accuracy: s.correct / s.seen,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8),
    errors: [...errors.entries()]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    byPhrasing: [...byPhrasing.entries()]
      // Two is too few to mean anything, and "direct" is most of the bank -
      // it is the baseline the others are read against, so it stays.
      .filter(([, s]) => s.seen >= 2)
      .map(([phrasing, s]) => ({ phrasing, seen: s.seen, accuracy: s.correct / s.seen }))
      .sort((a, b) => a.accuracy - b.accuracy),
    recent: attempts.slice(-25).reverse(),
  }
}

/**
 * "4m 12s", or "—".
 *
 * Seconds below a minute rather than rounding to "0m": a total of thirty
 * seconds is a real fact about a student who has barely started, and showing
 * it as zero reads as the column being broken.
 */
export function duration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m ${seconds % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
