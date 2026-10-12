import { Route, Routes } from 'react-router-dom'
import type { Exam } from '../exams/types'
import { Journey } from '../journey/Journey'
import { Recent } from '../review/RecentSet'
import { ErrorLog } from '../errors/ErrorLog'

/**
 * The student's front door for ONE exam.
 *
 * Knows nothing about the other test: it is handed an exam and everything
 * below it is scoped to that bank, so there is no place for the other
 * exam's content to leak in. That includes the mistakes screen - an SAT
 * student practising their misses should never be handed an ACT question.
 */
export function ExamHome({ exam }: { exam: Exam }) {
  return (
    <Routes>
      <Route index element={<Journey exam={exam} />} />
      <Route path="mistakes" element={<Recent exam={exam} />} />
      <Route path="errors" element={<ErrorLog exam={exam} />} />
      <Route path="*" element={<Journey exam={exam} />} />
    </Routes>
  )
}
