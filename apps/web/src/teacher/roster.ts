import type { Exam } from '../exams/types'

/**
 * The roster, and which exams each student is actually sitting.
 *
 * Access is per exam rather than a flag on the student, because the common
 * case is a student who starts on one and adds the other - and because the
 * assign screen must never offer a bank the student is not studying. A
 * teacher who has to remember which of their students is an ACT student is
 * a teacher who will eventually assign the wrong one.
 *
 * Stored locally for now. The Supabase tables exist (supabase/homework.sql)
 * and this is the shape they return, so swapping the backing store does not
 * change anything above it.
 */
const KEY = 'prep.roster'

export interface Student {
  id: string
  name: string
  email?: string
  access: Record<Exam, boolean>
  /** Target per exam, since a 1400 and a 32 are not the same number. */
  target: Partial<Record<Exam, number>>
}

function read(): Student[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Student[]) : []
  } catch {
    return []
  }
}

function write(students: Student[]): void {
  localStorage.setItem(KEY, JSON.stringify(students))
}

export function roster(): Student[] {
  return read().sort((a, b) => a.name.localeCompare(b.name))
}

export function addStudent(name: string, email?: string): Student {
  const student: Student = {
    id: `s-${Date.now().toString(36)}`,
    name: name.trim(),
    email: email?.trim() || undefined,
    // Nothing by default. Access is a decision, and defaulting it to both
    // would quietly put every new student in front of two question banks.
    access: { sat: false, act: false },
    target: {},
  }
  write([...read(), student])
  return student
}

export function setAccess(id: string, exam: Exam, on: boolean): void {
  write(read().map((s) => (s.id === id ? { ...s, access: { ...s.access, [exam]: on } } : s)))
}

export function setTarget(id: string, exam: Exam, target: number | undefined): void {
  write(
    read().map((s) =>
      s.id === id ? { ...s, target: { ...s.target, [exam]: target } } : s,
    ),
  )
}

export function removeStudent(id: string): void {
  write(read().filter((s) => s.id !== id))
}
