import type { Tier } from '../exams/types'
import { tierGem, tierCorrectCount, tierGemColor } from './tierGems'
import { Gem } from './Gem'
import type { Exam } from '../exams/types'

/**
 * Show tier gem progress for a skill.
 *
 * Displays four gems (E/M/H/X), each showing:
 * - Earned (filled) if the student got 10 correct at that tier
 * - Progress (N/10) if working toward it
 * - Empty if not started
 */
export function TierGemDisplay({
  exam, skill, tiers = ['E', 'M', 'H', 'X'],
}: {
  exam: Exam
  skill: string
  tiers?: Tier[]
}) {
  const tierLabels: Record<Tier, string> = {
    F: 'Foundation',
    E: 'Easy',
    M: 'Medium',
    H: 'Hard',
    X: 'Challenge',
  }

  return (
    <div className="tier-gems">
      {tiers.map((tier) => {
        const state = tierGem(exam, skill, tier)
        const correct = tierCorrectCount(exam, skill, tier)
        const color = tierGemColor(tier)
        const isEarned = state === 'earned'

        return (
          <div key={tier} className="tier-gem-item" title={tierLabels[tier]}>
            <Gem state={state} hue={color} size={20} />
            <span className="tier-gem-progress">
              {isEarned ? '✓' : `${correct}/10`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
