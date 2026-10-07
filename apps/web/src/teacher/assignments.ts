import type { Exam } from '../exams/types'

/**
 * An assignment belongs to ONE exam and may hold three kinds of thing.
 *
 * The completion rule is the one worth stating: a question counts as done
 * when the student has an attempt on it dated at or after the moment it was
 * assigned. Anything earlier was practice they had already done, and
 * counting it would hand back a week that arrives pre-ticked. Links and
 * printed worksheets cannot be observed at all, so those are self-reported -
 * and a self-report against a QUESTION is ignored rather than honoured, so
 * the two sources can never disagree about the same tick.
 *
 * Mirrors supabase/homework.sql and services/api/app/homework.py; the rule
 * is implemented in all three and commented in all three.
 */
const KEY = 'prep.assignments'

export type ItemKind = 'question' | 'worksheet' | 'link'

export interface AssignmentItem {
  id: string
  kind: ItemKind
  questionId?: string
  worksheetId?: string
  url?: string
  title?: string
  expectedMinutes?: number
  /** Which day of the week this is for; a week of work, not one sitting. */
  dayIndex?: number
  required: boolean
}

export interface Assignment {
  id: string
  studentId: string
  exam: Exam
  title: string
  note?: string
  assignedAt: string
  dueAt?: string
  items: AssignmentItem[]
  archived?: boolean
}

export interface Attempt {
  questionId: string
  createdAt: string
  correct: boolean
}

function read(): Assignment[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Assignment[]) : []
  } catch {
    return []
  }
}

function write(all: Assignment[]): void {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function assignmentsFor(studentId: string): Assignment[] {
  return read()
    .filter((a) => a.studentId === studentId && !a.archived)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

export function saveAssignment(a: Omit<Assignment, 'id' | 'assignedAt'>): Assignment {
  const made: Assignment = {
    ...a,
    id: `a-${Date.now().toString(36)}`,
    assignedAt: new Date().toISOString(),
  }
  write([...read(), made])
  return made
}

export function archive(id: string): void {
  write(read().map((a) => (a.id === id ? { ...a, archived: true } : a)))
}

export interface ItemStatus {
  item: AssignmentItem
  done: boolean
  source: 'attempt' | 'self-reported' | 'none'
  correct?: boolean
}

export interface Progress {
  statuses: ItemStatus[]
  done: number
  total: number
  percent: number
  /** Assigned questions they answered wrong - what to reteach. */
  missed: string[]
}

export function progressFor(
  assignment: Assignment,
  attempts: Attempt[],
  selfReported: Record<string, boolean>,
): Progress {
  const since = Date.parse(assignment.assignedAt)
  const inWindow = new Map<string, Attempt>()
  for (const at of attempts) {
    if (Date.parse(at.createdAt) < since) continue
    inWindow.set(at.questionId, at)
  }

  const statuses: ItemStatus[] = assignment.items.map((item) => {
    if (item.kind === 'question') {
      const hit = item.questionId ? inWindow.get(item.questionId) : undefined
      // Answering is the work; being right is a separate axis, reported
      // below as misses. A student who got it wrong did the homework.
      return hit
        ? { item, done: true, source: 'attempt', correct: hit.correct }
        : { item, done: false, source: 'none' }
    }
    return selfReported[item.id]
      ? { item, done: true, source: 'self-reported' }
      : { item, done: false, source: 'none' }
  })

  const required = statuses.filter((s) => s.item.required)
  const done = required.filter((s) => s.done).length
  return {
    statuses,
    done,
    total: required.length,
    percent: required.length ? Math.round((done / required.length) * 100) : 0,
    missed: statuses
      .filter((s) => s.source === 'attempt' && s.correct === false)
      .map((s) => s.item.questionId ?? '')
      .filter(Boolean),
  }
}
