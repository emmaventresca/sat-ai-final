import type { Exam, Tier } from '../exams/types'
import type { QuestionRef } from '../lib/bank'
import { cellKey, progress } from '../practice/mastery.ts'
import { lastTouched, remainingIn } from './promotion.ts'
import { resolved as resolvedIds } from '../errors/log.ts'

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
  /** One line on what it tests, where the bank carries one. */
  tests?: string
  /** Questions available, by tier. */
  pool: Partial<Record<Tier, number>>
  total: number
  /** How often the real exam asks it, where we measured that. */
  frequency: number
  seen: number
  accuracy: number | null
  /** Enough evidence, going in well enough, to call it done. */
  cleared: boolean
  /** Questions in this recognition the student has never answered. */
  left: number
  /** Of those, ones added since they last worked on it. */
  fresh: number
}

export interface Leg {
  skill: string
  name: string
  stages: Stage[]
  /** Unanswered questions across the whole path, and new ones among them. */
  left: number
  fresh: number
  /** A wording trial drawn from this leg's recognitions. */
  trial: Trial | null
  /** The unit quiz for the path, where there is enough to draw one from. */
  quiz: UnitQuiz | null
  cleared: number
}

/**
 * The unit quiz at the end of a path.
 *
 * Not a gate. Clearing every stop earns the gem on its own - a student at
 * 85% across four recognitions has already proved the thing, and making them
 * sit a quiz to collect a reward they have earned is the busywork this whole
 * reorganisation was for.
 *
 * What it earns is a BETTER gem, because it is a harder exercise than any of
 * the stops: the recognitions arrive mixed and out of order, which is the one
 * thing practising them a stop at a time cannot rehearse. On the real test
 * nobody announces which recognition is coming.
 *
 * And it never closes. Sitting it again two months later is one of the better
 * uses of twenty minutes a student has, so a path with its gem already
 * polished still offers it.
 */
export interface UnitQuiz {
  id: string
  /** The recognitions it draws across. */
  subtypes: string[]
  /** How many it will ask. */
  questions: number
}

/** Below this a "quiz" is a handful of questions from two stops. */
export const QUIZ_MIN_STAGES = 2
export const QUIZ_LENGTH = 12

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
  left: number
  fresh: number
}

/**
 * The top level: the section of the test.
 *
 * Four levels, because the test has four and flattening any of them loses
 * something a student actually uses. The section is how they think about
 * their day ("I am doing maths tonight"); the domain is how the score report
 * is broken down; the skill is what a lesson is about; and the recognition
 * is the thing they are actually getting wrong. Collapsing section into
 * domain was what put Algebra and Craft & Structure in one undifferentiated
 * column.
 */
export interface Region {
  id: string
  name: string
  terrain: Terrain
  chapters: Chapter[]
  stages: number
  cleared: number
  left: number
  fresh: number
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
export const CLEAR_SEEN = 5
export const CLEAR_ACC = 0.8

/**
 * Is this recognition cleared, right now, according to the store?
 *
 * Exported so that nothing else has to restate the rule. A celebration
 * that fires on its own idea of "finished" is worse than no celebration:
 * it tells a student they have cleared something the map still shows as
 * open. One definition, read straight from the store, used by both.
 */
export function clearedNow(exam: Exam, subtype: string): boolean {
  const mastery = progress().mastery
  let seen = 0
  let correct = 0
  for (const tier of ['F', 'E', 'M', 'H', 'X'] as Tier[]) {
    const cell = mastery[cellKey(exam, subtype, tier)]
    if (cell?.seen) {
      seen += cell.seen
      correct += cell.correct
    }
  }
  return seen >= CLEAR_SEEN && (seen ? correct / seen : 0) >= CLEAR_ACC
}

/** Wording families worth setting a trial on. "direct" is the baseline. */
const TRIAL_FAMILIES = [
  'must_be_true', 'not_except', 'which_expression',
  'work_backwards', 'in_context', 'compare',
]

export const SECTION_LABEL: Record<string, string> = {
  // "English", not "Reading & Writing". It is what the section gets called
  // out loud, and it is the other half of a pair with Math.
  math: 'Math', english: 'English', reading: 'Reading', science: 'Science',
  rw: 'English',
}

/**
 * The order the realms are walked in.
 *
 * Not by size, which is what the code did before and which put Data &
 * Problem-Solving first because it has the most recognitions. A curriculum
 * has an order - algebra before advanced, ideas before conventions - and
 * where a realm is not named here it falls to the end rather than being
 * silently dropped.
 */
const REALM_ORDER = [
  'Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis',
  'Geometry and Trigonometry',
  'Information and Ideas', 'Craft and Structure', 'Expression of Ideas',
  'Standard English Conventions',
]

/**
 * Which country a section is drawn as.
 *
 * Six, because the two exams have six sections between them and a student
 * crossing between them should know where they are before reading a word.
 * They are keyed by exam AND section: the ACT's maths is not the SAT's, and
 * giving them the same picture would be the one place this app implies the
 * two tests are interchangeable.
 */
export type Terrain = 'cliffs' | 'ocean' | 'park' | 'fair' | 'peaks' | 'tropic'

const TERRAIN_BY_EXAM: Record<Exam, Record<string, Terrain>> = {
  sat: { math: 'cliffs', rw: 'ocean' },
  act: {
    math: 'tropic',      // Hawaii by way of Miami, 1986
    english: 'peaks',    // high altitude, thin air
    reading: 'fair',     // a world's fair at dusk
    science: 'park',     // Sequoia, Sedona, Yellowstone
  },
}

export function terrainFor(exam: Exam, section: string): Terrain {
  return TERRAIN_BY_EXAM[exam]?.[section] ?? 'cliffs'
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
function grouping(exam: Exam, q: QuestionRef, meta: SkillMeta | undefined) {
  if (exam === 'act') {
    // The ACT's own reporting categories - Algebra, Geometry, Functions,
    // Craft & Structure, Interpretation of Data - are the realms. Filing
    // every ACT skill under one chapter named after the section gave each
    // region exactly one chapter, which is why the ACT map drew a single
    // dot and no route at all: there was nowhere to travel to.
    const skill = q.skill || SECTION_LABEL[q.section] || q.section
    return { chapter: skill, leg: skill }
  }
  return {
    chapter: meta?.domain_name ?? q.skill,
    leg: meta?.skill_name ?? q.skill,
  }
}

export function buildJourney(
  exam: Exam, bank: QuestionRef[], skills: SkillMeta[],
): Region[] {
  const { mastery, attempts } = progress()
  /**
   * What counts as DONE: answered correctly, not merely met.
   *
   * This used to be every question the student had attempted, which meant a
   * stop reporting "all 21 done" when six of those were wrong. That is the
   * one place the app was flattering somebody rather than telling them where
   * they stand, and a missed question is exactly the one worth coming back
   * to.
   */
  const attempted = resolvedIds(attempts.filter((a) => a.exam === exam))
  const metaOf = new Map(skills.map((s) => [s.skill_cd, s]))

  // skill -> subtype -> questions
  const bySkill = new Map<string, Map<string, QuestionRef[]>>()
  for (const q of bank) {
    if (!q.subtype) continue
    const skill = bySkill.get(q.skill) ?? new Map<string, QuestionRef[]>()
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
    /**
     * Which section this skill belongs to: the MAJORITY of its questions,
     * not one sample.
     *
     * Reading it off `sample` put the entire ACT Science section inside
     * Reading and made it vanish from the map. Science subtypes carry two or
     * three questions mis-filed as reading upstream, and if one of those
     * happens to be the first question of the first subtype, the whole skill
     * - 47 questions - inherits the wrong section. Nothing throws; a quarter
     * of the test just disappears.
     */
    const section = meta?.section ?? (() => {
      const tally = new Map<string, number>()
      for (const qs of subtypes.values()) {
        for (const q of qs) tally.set(q.section, (tally.get(q.section) ?? 0) + 1)
      }
      let best = sample.section
      let most = 0
      for (const [sec, n] of tally) if (n > most) { best = sec; most = n }
      return best
    })()

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
      const rest = remainingIn(qs, attempted, lastTouched(exam, subtype))
      return {
        subtype,
        left: rest.left,
        fresh: rest.fresh,
        name: qs[0].subtypeName || subtype,
        tests: qs.find((q) => q.tests)?.tests,
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
      quiz: stages.length >= QUIZ_MIN_STAGES
        ? {
            id: `${skillCd}-quiz`,
            subtypes: legStages,
            questions: Math.min(QUIZ_LENGTH, stages.reduce((n, s) => n + s.total, 0)),
          }
        : null,
      cleared: stages.filter((s) => s.cleared).length,
      left: stages.reduce((n, s) => n + s.left, 0),
      fresh: stages.reduce((n, s) => n + s.fresh, 0),
    }

    const chapter = chapters.get(domain) ?? {
      id: domain, name: domain, section, legs: [],
      stages: 0, cleared: 0, left: 0, fresh: 0,
    }
    chapter.legs.push(leg)
    chapters.set(domain, chapter)
  }

  for (const chapter of chapters.values()) {
    chapter.legs.sort((a, b) => b.stages.length - a.stages.length)
    chapter.stages = chapter.legs.reduce((n, l) => n + l.stages.length, 0)
    chapter.cleared = chapter.legs.reduce((n, l) => n + l.cleared, 0)
    chapter.left = chapter.legs.reduce((n, l) => n + l.left, 0)
    chapter.fresh = chapter.legs.reduce((n, l) => n + l.fresh, 0)
  }

  // Sections stay together, and within a section the biggest domain leads -
  // which is also the one carrying the most marks.
  const rank = (name: string) => {
    const at = REALM_ORDER.indexOf(name)
    return at === -1 ? REALM_ORDER.length : at
  }
  const ordered = [...chapters.values()].sort(
    (a, b) => rank(a.name) - rank(b.name) || b.stages - a.stages,
  )

  const regions = new Map<string, Region>()
  for (const chapter of ordered) {
    const region = regions.get(chapter.section) ?? {
      id: chapter.section,
      name: SECTION_LABEL[chapter.section] ?? chapter.section,
      terrain: terrainFor(exam, chapter.section),
      chapters: [], stages: 0, cleared: 0, left: 0, fresh: 0,
    }
    region.chapters.push(chapter)
    region.stages += chapter.stages
    region.cleared += chapter.cleared
    region.left += chapter.left
    region.fresh += chapter.fresh
    regions.set(chapter.section, region)
  }
  // The order the test is actually sat in. The SAT opens with Reading and
  // Writing; the ACT runs English, Math, Reading, Science. Leading with
  // maths was our habit, not the exam's, and the map is supposed to be the
  // shape of the day they are preparing for.
  const order = exam === 'act'
    ? ['english', 'math', 'reading', 'science']
    : ['rw', 'math']
  const place = (id: string) => {
    const at = order.indexOf(id)
    return at === -1 ? order.length : at
  }
  return [...regions.values()].sort((a, b) => place(a.id) - place(b.id))
}

/**
 * Which questions a leg's wording trial should use.
 *
 * Refs, not bodies: the caller fetches only what it is about to show, which
 * for a trial is ten questions rather than a whole leg.
 */
export function trialRefs(
  bank: QuestionRef[], trial: Trial, limit = 10,
): QuestionRef[] {
  const pool = bank.filter(
    (q) => q.subtype && trial.subtypes.includes(q.subtype)
      && q.phrasing && q.phrasing !== 'direct',
  )
  // Spread across the families rather than ten of whichever is commonest:
  // the trial is asking whether they can read the FRAME, so it has to show
  // them more than one.
  const byFamily = new Map<string, QuestionRef[]>()
  for (const q of pool) {
    const list = byFamily.get(q.phrasing as string) ?? []
    list.push(q)
    byFamily.set(q.phrasing as string, list)
  }
  const out: QuestionRef[] = []
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

/**
 * Which questions a unit quiz should ask.
 *
 * Round-robin across the path's recognitions, so no two in a row come from
 * the same stop. That interleaving is the exercise: practising a recognition
 * at its own stop tells a student which method to reach for before they have
 * read anything, and the test never does them that favour.
 *
 * Medium first, then the tiers either side. A quiz made of Foundations
 * questions says nothing, and one made of Hard ones says nothing either -
 * both of them fail students who are actually fine.
 */
export function quizRefs(
  bank: QuestionRef[], quiz: UnitQuiz, limit = QUIZ_LENGTH,
): QuestionRef[] {
  const WEIGHT: Record<string, number> = { M: 0, H: 1, E: 2, X: 3, F: 4 }
  const byStage = new Map<string, QuestionRef[]>()
  for (const q of bank) {
    if (!q.subtype || !quiz.subtypes.includes(q.subtype)) continue
    const list = byStage.get(q.subtype) ?? []
    list.push(q)
    byStage.set(q.subtype, list)
  }
  for (const list of byStage.values()) {
    list.sort((a, b) =>
      (WEIGHT[a.difficulty] ?? 9) - (WEIGHT[b.difficulty] ?? 9)
      || a.id.localeCompare(b.id))
  }

  // Walk the stops in the order the path lists them so the draw is stable:
  // a quiz that reshuffles every render is a quiz a student cannot resume.
  const order = quiz.subtypes.filter((s) => byStage.has(s))
  const out: QuestionRef[] = []
  for (let round = 0; out.length < limit && round < 40; round += 1) {
    let added = false
    for (const subtype of order) {
      const q = byStage.get(subtype)?.[round]
      if (!q) continue
      out.push(q)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
  }
  return out
}
