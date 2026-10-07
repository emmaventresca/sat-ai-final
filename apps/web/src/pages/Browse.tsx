import { Navigate, useParams } from 'react-router-dom'
import { isExam } from '../exams/registry'
import { Practice } from '../practice/Practice'

/**
 * The flat list, kept for when a student knows exactly what they want.
 *
 * It is no longer the front door - that is the map - but "I need the
 * quadratic ones, now" is a real need and a route is cheaper than making
 * someone navigate a journey to reach it.
 */
export function Browse() {
  const { exam } = useParams()
  if (!isExam(exam)) return <Navigate to="/" replace />
  return <Practice exam={exam} />
}
