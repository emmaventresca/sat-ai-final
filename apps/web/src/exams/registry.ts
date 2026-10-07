import spec from '../../../../packages/schema/exams.json'
import type { Exam, ExamSpec } from './types'

const EXAMS = spec.exams as unknown as Record<Exam, ExamSpec>

export const EXAM_IDS = Object.keys(EXAMS) as Exam[]

export function examSpec(exam: Exam): ExamSpec {
  const found = EXAMS[exam]
  if (!found) throw new Error(`unknown exam: ${exam}`)
  return found
}

export function isExam(value: string | undefined): value is Exam {
  return value === 'sat' || value === 'act'
}

/**
 * The exams a student can actually open.
 *
 * A student with one exam never sees a switcher - showing a toggle with a
 * single option is noise, and showing one with an exam they are not studying
 * is an invitation to practise the wrong test.
 */
export function openExams(access: { sat: boolean; act: boolean }): Exam[] {
  return EXAM_IDS.filter((id) => access[id])
}
