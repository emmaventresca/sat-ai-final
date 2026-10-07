// The two exams are kept apart on purpose.
//
// A student practising SAT Transitions should never be handed an ACT comma
// question by accident: the sections are different, the scoring is different,
// the taxonomies were derived from different banks, and a question that is
// Hard on one says nothing about the other. So `Exam` is not a flag passed
// around - it selects a whole content set, and the student pages for each are
// separate routes with separate banks.
//
// What IS shared is the shape of a question and the teacher who assigns it.
// That is the entire overlap, and it is enough to give one teacher portal.

export type Exam = 'sat' | 'act'

export type Tier = 'F' | 'E' | 'M' | 'H' | 'X'

export interface Question {
  id: string
  exam: Exam
  section: string
  /** Skill code (SAT) or domain (ACT). */
  skill: string
  /** The recognition inside the skill. */
  subtype: string | null
  subtypeName?: string | null
  difficulty: Tier
  format: 'mc' | 'grid'
  stimulus?: string | null
  stem: string
  figure?: unknown
  choices?: string[]
  /** Multiple choice. */
  answer?: string
  /** Student-produced response: every acceptable form. */
  keys?: string[]
  explanation?: string
  /** Per choice (or per typed value) explanations. */
  perChoice?: Record<string, string>
  /** Per choice (or per typed value) misconception slugs. */
  misconceptions?: Record<string, string>
}

export interface ExamSection {
  id: string
  label: string
  questions: number
  score: [number, number]
}

export interface ExamSpec {
  label: string
  sections: ExamSection[]
  total_score: [number, number]
  /** Everything we offer, including the tiers that are ours rather than the exam's. */
  tiers: Tier[]
  /** The tiers the real test actually labels. */
  exam_tiers: Tier[]
  bank: string
  taxonomy: string
  bands: string | null
}

/** Which exams a student has been given access to. */
export interface StudentAccess {
  sat: boolean
  act: boolean
}
