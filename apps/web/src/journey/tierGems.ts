/**
 * Tier gems: track progress toward 10 correct at each difficulty level.
 *
 * When a student gets 10 correct answers at Easy, Medium, Hard, or Challenge,
 * they earn a gem at that tier. The gem appears on the skill pod and in the
 * progress summary. Each tier has a distinct color from the forest palette.
 */

import type { Exam } from '../exams/types'
import type { Tier } from '../exams/types'

const KEY = 'prep.tier_gems'

export type TierGemState = 'none' | 'earned'

interface TierGemStore {
  /** `exam|skill|tier` -> earned state */
  gems: Record<string, TierGemState>
  /** `exam|skill|tier` -> count of correct answers */
  correct: Record<string, number>
}

function read(): TierGemStore {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TierGemStore) : { gems: {}, correct: {} }
  } catch {
    return { gems: {}, correct: {} }
  }
}

function write(s: TierGemStore): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

const tierKey = (exam: Exam, skill: string, tier: Tier) => `${exam}|${skill}|${tier}`

/**
 * Record a correct answer at a tier. Returns true if this answer earns a gem.
 */
export function recordCorrect(exam: Exam, skill: string, tier: Tier): boolean {
  const store = read()
  const id = tierKey(exam, skill, tier)
  const current = store.correct[id] ?? 0

  if (current < 10) {
    store.correct[id] = current + 1
    write(store)

    // Gem earned at exactly 10 correct
    if (current + 1 === 10) {
      store.gems[id] = 'earned'
      write(store)
      return true
    }
  }
  return false
}

/**
 * Get gem state for a tier.
 */
export function tierGem(exam: Exam, skill: string, tier: Tier): TierGemState {
  return read().gems[tierKey(exam, skill, tier)] ?? 'none'
}

/**
 * Get correct count toward next gem.
 */
export function tierCorrectCount(exam: Exam, skill: string, tier: Tier): number {
  return read().correct[tierKey(exam, skill, tier)] ?? 0
}

/**
 * Tier gem colors from forest palette.
 * Easy (gold), Medium (silver), Hard (bronze), Challenge (amethyst).
 */
export const TIER_GEM_COLORS: Record<Tier, [string, string]> = {
  F: ['#b57d37', '#d9a93f'],      // Foundation - gold
  E: ['#b57d37', '#d9a93f'],      // Easy - gold
  M: ['#999999', '#c0c0c0'],      // Medium - silver
  H: ['#8B4513', '#CD7F32'],      // Hard - bronze
  X: ['#9370DB', '#BA55D3'],      // Challenge - amethyst
}

export function tierGemColor(tier: Tier): [string, string] {
  return TIER_GEM_COLORS[tier]
}
