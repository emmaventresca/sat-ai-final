import type { Tier } from '../exams/types'
import { progress } from '../practice/mastery'
import type { Exam } from '../exams/types'

/**
 * The game layer: experience, rank, streak.
 *
 * None of it changes what a student practises - the ranking engine already
 * decides that, from the band model and what they are missing. This is about
 * whether they come back tomorrow, which is the single biggest variable in
 * whether any of the rest of it matters.
 *
 * Experience is weighted by level because effort should be what earns it. A
 * student grinding Easy questions they already know should not out-rank one
 * fighting through Hard, or the scoreboard quietly teaches the wrong habit.
 */
const XP: Record<Tier, number> = { F: 4, E: 6, M: 10, H: 16, X: 24 }

// A wrong answer still earns, at a third. Attempting a Hard question and
// missing it is worth more than dodging it, and a system that pays nothing
// for a miss teaches students to stay where it is safe.
const MISS_SHARE = 1 / 3

export interface Rank {
  level: number
  title: string
  xp: number
  /** Into the current level. */
  into: number
  /** Needed to finish the current level. */
  span: number
}

const TITLES = [
  'Wanderer', 'Pathfinder', 'Scout', 'Ranger', 'Outrider',
  'Warden', 'Sentinel', 'Loremaster', 'Champion',
]

/** Levels get longer as they go: 60, 150, 270, 420 … */
function xpForLevel(level: number): number {
  return 30 * level * (level + 1)
}

export function rankOf(exam: Exam): Rank {
  const attempts = progress().attempts.filter((a) => a.exam === exam)
  const xp = attempts.reduce((n, a) => {
    const base = XP[a.difficulty] ?? 6
    return n + Math.round(a.correct ? base : base * MISS_SHARE)
  }, 0)

  let level = 1
  while (xpForLevel(level) <= xp && level < 60) level += 1
  const floor = level > 1 ? xpForLevel(level - 1) : 0
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))],
    xp,
    into: xp - floor,
    span: xpForLevel(level) - floor,
  }
}

/**
 * Days in a row, counting today or yesterday as still alive.
 *
 * Yesterday counts because a streak that dies at midnight punishes someone
 * who studies in the evening and then has a morning lesson - which is most
 * of them.
 */
export function streakOf(exam: Exam): number {
  const days = new Set(
    progress().attempts.filter((a) => a.exam === exam).map((a) => a.at.slice(0, 10)),
  )
  if (!days.size) return 0
  const day = (n: number) =>
    new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
  let start = days.has(day(0)) ? 0 : days.has(day(1)) ? 1 : -1
  if (start < 0) return 0
  let count = 0
  while (days.has(day(start + count))) count += 1
  return count
}

/** Questions answered today, for the small daily goal. */
export function todayCount(exam: Exam): number {
  const today = new Date().toISOString().slice(0, 10)
  return progress().attempts
    .filter((a) => a.exam === exam && a.at.startsWith(today)).length
}

export const DAILY_GOAL = 12
