import type { Exam } from '../exams/types'
import { Practice } from '../practice/Practice'

/**
 * The student's front door for ONE exam.
 *
 * Knows nothing about the other test: it is handed an exam and everything
 * below it is scoped to that bank, so there is no place for the other
 * exam's content to leak in.
 */
export function ExamHome({ exam }: { exam: Exam }) {
  return <Practice exam={exam} />
}
