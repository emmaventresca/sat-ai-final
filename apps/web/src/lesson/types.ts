// ---------------------------------------------------------------------------
// The lesson plan.
//
// This is the shape the planner's `{"kind": "lesson"}` block becomes once the
// portal has joined it to real items - see the SYSTEM prompt in
// tools/planner_server.py. The planner supplies structure and judgement; the
// prose that makes a lesson useful (tells, methods, traps, verified questions)
// comes from the platform's own data, so every factual line stays traceable to
// the corpus.
//
// Two rules are encoded here rather than left to the renderer:
//
//   * A lesson with no stated duration is an hour. The teacher asked for that
//     default explicitly, and a plan that silently runs 43 minutes is a plan
//     she finds out about mid-session.
//   * The answers live in their own branch of the tree. Present mode does not
//     filter them out, it never receives them - a student-facing screen that
//     leaks the key because somebody added a field is a failure mode worth
//     designing away rather than remembering.
// ---------------------------------------------------------------------------

import type { Exam, Tier } from '../exams/types'
import type { FigureSpec } from './math'

/** An hour unless the teacher says otherwise. */
export const DEFAULT_DURATION = 60

const TIER_LABEL: Record<Tier, string> = {
  F: 'Foundations', E: 'Easy', M: 'Medium', H: 'Hard', X: 'Challenge',
}

const TIER_RANK: Record<Tier, number> = { F: 0, E: 1, M: 2, H: 3, X: 4 }

export function difficultyLabel(tier: Tier): string {
  return TIER_LABEL[tier] ?? tier
}

export function difficultyRank(tier: Tier): number {
  return TIER_RANK[tier] ?? 2
}

/**
 * One question as the lesson shows it.
 *
 * Category and difficulty are carried inline rather than looked up at render
 * time: on a shared screen the student should be able to see what a question
 * is testing and how hard it is meant to be without the teacher narrating it.
 */
export interface LessonQuestion {
  id: string
  /** Subtype name where there is one, otherwise the skill. Shown on the chip. */
  category: string
  difficulty: Tier
  format: 'mc' | 'grid'
  stimulus?: string | null
  stem: string
  figure?: FigureSpec | null
  choices?: string[]
  /** Teacher-only. Absent in anything handed to present mode. */
  answer?: LessonAnswer
}

export interface LessonAnswer {
  /** The letter for multiple choice, the accepted value(s) for a grid-in. */
  value: string
  /** One or two lines on why - enough to say it out loud without reading. */
  why?: string
  /** The wrong turn this item is built to catch. */
  trap?: string
}

export interface LessonSection {
  heading: string
  minutes: number
  /** Lines; a line starting "- " becomes a bullet. */
  body: string[]
  /** Questions worked in this section, in the order they are worked. */
  questionIds?: string[]
  /** Teacher-only talking points: what to say, what to ask, what to watch for. */
  prompts?: string[]
}

export interface LessonPlan {
  title: string
  subtitle?: string
  /** SAT and ACT content never mix; this selects the whole content set. */
  exam: Exam
  /** Minutes. Omitted means {@link DEFAULT_DURATION}. */
  duration?: number
  sections: LessonSection[]
  questions: LessonQuestion[]
  /** Teacher-only, read before the session starts. */
  teacherNotes?: string[]
  /** Shown to everyone at the end - what the student leaves with. */
  closing?: string
}

export type LessonMode = 'present' | 'teacher'

export function lessonDuration(plan: LessonPlan): number {
  return plan.duration && plan.duration > 0 ? plan.duration : DEFAULT_DURATION
}

export interface SectionSlot extends LessonSection {
  /** Minutes elapsed when this section starts and ends. */
  from: number
  to: number
}

export interface LessonTiming {
  /** What the lesson claims to be. */
  duration: number
  /** What the sections actually add up to. */
  planned: number
  /** Sections with their place on the clock. */
  slots: SectionSlot[]
  /** Minutes over (positive) or under (negative). Zero when it adds up. */
  drift: number
}

/**
 * Lay the sections out on the clock.
 *
 * A mismatch is surfaced, never corrected. Rescaling the blocks to fit would
 * hide a planning error behind plausible-looking numbers, and the teacher is
 * the one who knows whether to cut a block or run long.
 */
export function lessonTiming(plan: LessonPlan): LessonTiming {
  const duration = lessonDuration(plan)
  let clock = 0
  const slots = plan.sections.map((s) => {
    const from = clock
    clock += Math.max(0, s.minutes || 0)
    return { ...s, from, to: clock }
  })
  return { duration, planned: clock, slots, drift: clock - duration }
}

/** The questions a section works, in the order the section names them. */
export function sectionQuestions(
  plan: LessonPlan,
  section: LessonSection,
): LessonQuestion[] {
  const byId = new Map(plan.questions.map((q) => [q.id, q]))
  return (section.questionIds ?? [])
    .map((id) => byId.get(id))
    .filter((q): q is LessonQuestion => q !== undefined)
}

/**
 * Questions no section claimed, easiest first.
 *
 * The packet's worksheet promised increasing difficulty and delivered it by
 * sorting; a leftover pool that opens on the hardest item does the opposite of
 * what a warm-up is for.
 */
export function unassignedQuestions(plan: LessonPlan): LessonQuestion[] {
  const claimed = new Set(plan.sections.flatMap((s) => s.questionIds ?? []))
  return plan.questions
    .filter((q) => !claimed.has(q.id))
    .sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty))
}

/**
 * Strip everything the student must not see.
 *
 * Call this once at the boundary - when a plan crosses from the teacher's
 * screen to the shared one - rather than trusting every component downstream
 * to check the mode.
 */
export function forStudent(plan: LessonPlan): LessonPlan {
  return {
    ...plan,
    teacherNotes: undefined,
    sections: plan.sections.map(({ prompts: _prompts, ...rest }) => rest),
    questions: plan.questions.map(({ answer: _answer, ...rest }) => rest),
  }
}
