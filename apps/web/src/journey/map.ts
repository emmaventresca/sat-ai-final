import type { Exam, Question, Tier } from '../exams/types'
import { cellKey, progress } from '../practice/mastery'

/**
 * The bank, laid out as a route rather than a list.
 *
 * A hundred and eighty recognitions in one column is not a curriculum, it is
 * an inventory - and an inventory is the most discouraging thing you can put
 * in front of someone who already feels behind. The same content grouped
 * into eight chapters, each a handful of legs, each leg four or five stops,
 * is the same work and a completely different proposition: you can see where
 * you are, what is next, and that the end exists.
 *
 * The order is not arbitrary either. Within a leg the stages run in the
 * order the exam leans on them, so the first thing a student meets is the
 * thing that pays most.
 */

export interface Stage {
  subtype: string
  name: string
  /** Questions available, by tier. */
  pool: Partial<Record<Tier, number>>
  total: number
  /** How often the real exam asks it, where we measured that. */
  frequency: number
  seen: number
  accuracy: number | null
  /** Enough evidence, going in well enough, to call it done. */
  cleared: boolean
}

export interface Leg {
  skill: string
  name: string
  stages: Stage[]
  /** A wording trial drawn from this leg's recognitions. */
  trial: Trial | null
  cleared: number
}

export interface Trial {
  id: string
  /** The wording families this leg actually contains, worst-known first. */
  families: string[]
  subtypes: string[]
  questions: number
}

export interface Chapter {
  id: string
  name: string
  section: string
  legs: Leg[]
  stages: number
  cleared: number
}

export interface SkillMeta {
  skill_cd: string
  skill_name: string
  domain_name: string
  section: string
}

// A recognition is "cleared" at five attempts and 80%. Five because fewer
// cannot distinguish luck from understanding; 80% because the point is to
// move on when it is going in, not to grind to perfection on something the
// exam asks four times.
const CLEAR_SEEN = 5
const CLEAR_ACC = 0.8

/** Wording families worth setting a trial on. "direct" is the baseline. */
const TRIAL_FAMILIES = [
  'must_be_true', 'not_except', 'which_expression',
  'work_backwards', 'in_context', 'compare',
]

const SECTION_LABEL: Record<string, string> = {
  math: 'Math', english: 'English', reading: 'Reading', science: 'Science',
  rw: 'Reading & Writing',
}

/**
 * How a bank divides into chapters and legs.
 *
 * The two exams are shaped differently and forcing one scheme on both
 * produces a bad map for whichever loses. The SAT's skills carry a published
 * DOMAIN - Algebra, Advanced Math - which is the natural chapter, with the
 * skill as the leg beneath it. The ACT has no equivalent layer, but it has
 * four whole sections that a student thinks about separately, so the section
 * is the chapter and the content domain is the leg.
 *
 * Either way the stage is the recognition, which is the unit everything else
 * in this app is keyed on.
 */
function grouping(exam: Exam, q: Question, meta: SkillMeta | undefined) {
  if (exam === 'act') {
    return {
      chapter: SECTION_LABEL[q.section] ?? q.section,
      leg: q.skill || SECTION_LABEL[q.section] || q.section,
    }
  }
  return {
    chapter: meta?.domain_name ?? q.skill,
    leg: meta?.skill_name ?? q.skill,
  }
}

export function buildJourney(
  exam: Exam, bank: Question[], skills: SkillMeta[],
): Chapter[] {
  const { mastery } = progress()
  const metaOf = new Map(skills.map((s) => [s.skill_cd, s]))

  // skill -> subtype -> questions
  const bySkill = new Map<string, Map<string, Question[]>>()
  for (const q of bank) {
    if (!q.subtype) continue
    const skill = bySkill.get(q.skill) ?? new Map<string, Question[]>()
    const stage = skill.get(q.subtype) ?? []
    stage.push(q)
    skill.set(q.subtype, stage)
    bySkill.set(q.skill, skill)
  }

  const chapters = new Map<string, Chapter>()
  for (const [skillCd, subtypes] of bySkill) {
    const meta = metaOf.get(skillCd)
    const sample = [...subtypes.values()][0][0]
    const { chapter: domain, leg: legName } = grouping(exam, sample, meta)
    const section = meta?.section ?? sample.section

    const stages: Stage[] = [...subtypes.entries()].map(([subtype, qs]) => {
      const pool: Partial<Record<Tier, number>> = {}
      for (const q of qs) pool[q.difficulty] = (pool[q.difficulty] ?? 0) + 1
      let seen = 0
      let correct = 0
      for (const tier of ['F', 'E', 'M', 'H', 'X'] as Tier[]) {
        const cell = mastery[cellKey(exam, subtype, tier)]
        if (cell?.seen) {
          seen += cell.seen
          correct += cell.correct
        }
      }
      const accuracy = seen ? correct / seen : null
      return {
        subtype,
        name: qs[0].subtypeName || subtype,
        pool,
        total: qs.length,
        frequency: qs.length,
        seen,
        accuracy,
        cleared: seen >= CLEAR_SEEN && (accuracy ?? 0) >= CLEAR_ACC,
      }
    }).sort((a, b) => b.frequency - a.frequency)

    const legStages = stages.map((s) => s.subtype)
    const trialQs = bank.filter(
      (q) => q.subtype && legStages.includes(q.subtype)
        && q.phrasing && q.phrasing !== 'direct',
    )
    const families = [...new Set(trialQs.map((q) => q.phrasing as string))]
      .filter((f) => TRIAL_FAMILIES.includes(f))

    const leg: Leg = {
      skill: skillCd,
      name: legName,
      stages,
      // A trial needs enough questions to be a test rather than a coin flip.
      trial: trialQs.length >= 4 && families.length
        ? { id: `${skillCd}-trial`, families, subtypes: legStages, questions: trialQs.length }
        : null,
      cleared: stages.filter((s) => s.cleared).length,
    }

    const chapter = chapters.get(domain) ?? {
      id: domain, name: domain, section, legs: [], stages: 0, cleared: 0,
    }
    chapter.legs.push(leg)
    chapters.set(domain, chapter)
  }

  for (const chapter of chapters.values()) {
    chapter.legs.sort((a, b) => b.stages.length - a.stages.length)
    chapter.stages = chapter.legs.reduce((n, l) => n + l.stages.length, 0)
    chapter.cleared = chapter.legs.reduce((n, l) => n + l.cleared, 0)
  }

  // Sections stay together, and within a section the biggest chapter leads -
  // which is also the one carrying the most marks.
  return [...chapters.values()].sort(
    (a, b) => a.section.localeCompare(b.section) || b.stages - a.stages,
  )
}

/** Questions for one leg's wording trial. */
export function trialQuestions(
  bank: Question[], trial: Trial, limit = 10,
): Question[] {
  const pool = bank.filter(
    (q) => q.subtype && trial.subtypes.includes(q.subtype)
      && q.phrasing && q.phrasing !== 'direct',
  )
  // Spread across the families rather than ten of whichever is commonest:
  // the trial is asking whether they can read the FRAME, so it has to show
  // them more than one.
  const byFamily = new Map<string, Question[]>()
  for (const q of pool) {
    const list = byFamily.get(q.phrasing as string) ?? []
    list.push(q)
    byFamily.set(q.phrasing as string, list)
  }
  const out: Question[] = []
  let round = 0
  while (out.length < limit && round < 20) {
    let added = false
    for (const list of byFamily.values()) {
      const q = list[round]
      if (q) {
        out.push(q)
        added = true
      }
      if (out.length >= limit) break
    }
    if (!added) break
    round += 1
  }
  return out
}
