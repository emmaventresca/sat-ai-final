import type { Exam, Question, Tier } from '../exams/types'
import { nextReview } from './engine'

/**
 * What the student has done, and what they got wrong.
 *
 * Recorded at BOTH levels - the skill and the recognition inside it -
 * because both are real units of progress. The skill drives what to study
 * next; the recognition drives its own lesson and the review screen.
 * Recording only the skill is what once left every recognition reading "not
 * started" no matter how much a student practised it.
 *
 * Keyed by exam as well, since an SAT subtype and an ACT subtopic can share
 * a name and must never share a cell.
 */
const KEY = 'prep.progress'

export interface Attempt {
  exam: Exam
  questionId: string
  /** Milliseconds on the question. Blank where we could not observe it. */
  ms?: number
  subtype: string | null
  skill: string
  difficulty: Tier
  chosen: string
  correct: boolean
  misconception?: string | null
  at: string
}

export interface Cell {
  seen: number
  correct: number
  streak: number
  /** Leitner box, 1-5. A miss always drops it back to 1. */
  box: number
  /** When this cell is worth seeing again. */
  dueAt: string
}

interface Store {
  attempts: Attempt[]
  mastery: Record<string, Cell>
}

function read(): Store {
  const empty: Store = { attempts: [], mastery: {} }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Store> | null
    if (!parsed || typeof parsed !== 'object') return empty
    // Both halves are checked rather than cast. A stored object missing
    // `mastery` - an older schema, a half-written record, anything hand-set
    // during testing - used to flow straight through and throw somewhere far
    // away, in buildJourney, taking the whole app down to a white screen. A
    // store we cannot read is a store we have no progress from; that is
    // recoverable, and a blank app is not.
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      mastery: parsed.mastery && typeof parsed.mastery === 'object'
        ? parsed.mastery
        : {},
    }
  } catch {
    return empty
  }
}

function write(s: Store): void {
  // Attempts are the record the review screen reads; trimming the oldest
  // keeps the store bounded without losing anything recent enough to teach
  // from.
  localStorage.setItem(KEY, JSON.stringify({ ...s, attempts: s.attempts.slice(-4000) }))
}

export const cellKey = (exam: Exam, unit: string, tier: Tier) => `${exam}|${unit}|${tier}`

const EMPTY: Cell = { seen: 0, correct: 0, streak: 0, box: 1, dueAt: '' }

export function progress(): Store {
  return read()
}

export function record(
  q: Question, chosen: string, correct: boolean, ms?: number,
): Attempt {
  const store = read()
  const attempt: Attempt = {
    exam: q.exam,
    questionId: q.id,
    subtype: q.subtype,
    skill: q.skill,
    difficulty: q.difficulty,
    chosen,
    correct,
    misconception: correct ? null : q.misconceptions?.[chosen] ?? null,
    ms,
    at: new Date().toISOString(),
  }
  store.attempts.push(attempt)

  for (const unit of [q.skill, q.subtype].filter(Boolean) as string[]) {
    const key = cellKey(q.exam, unit, q.difficulty)
    const cell = store.mastery[key] ?? EMPTY
    store.mastery[key] = {
      seen: cell.seen + 1,
      correct: cell.correct + (correct ? 1 : 0),
      streak: correct ? cell.streak + 1 : 0,
      ...nextReview(cell, correct),
    }
  }
  write(store)
  return attempt
}

export function accuracy(exam: Exam, unit: string, tier: Tier): number | null {
  const cell = read().mastery[cellKey(exam, unit, tier)]
  return cell?.seen ? cell.correct / cell.seen : null
}

/** Ids already attempted, so a round can prefer questions they have not seen. */
export function seenIds(exam: Exam): Set<string> {
  return new Set(read().attempts.filter((a) => a.exam === exam).map((a) => a.questionId))
}
