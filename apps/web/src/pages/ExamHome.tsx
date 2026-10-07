import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadBank } from '../lib/bank'

/**
 * The student's front page for ONE exam.
 *
 * Deliberately knows nothing about the other test. It is handed an exam and
 * loads that bank; there is no switch inside it and no place for the other
 * exam's content to leak in.
 */
export function ExamHome({ exam }: { exam: Exam }) {
  const spec = examSpec(exam)
  const [bank, setBank] = useState<Question[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    loadBank(exam)
      .then((b) => live && setBank(b))
      .catch((e: unknown) => live && setError(String((e as Error).message ?? e)))
    return () => {
      live = false
    }
  }, [exam])

  if (error) return <div className="wrap"><p className="bad-text">{error}</p></div>
  if (!bank) return <div className="wrap"><p className="muted">Loading&hellip;</p></div>

  const bySection = spec.sections.map((s) => ({
    ...s,
    count: bank.filter((q) => q.section === s.id).length,
  }))

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1>{spec.label} Practice</h1>
          <p className="who">{bank.length} questions</p>
        </div>
        <Link className="btn-sm" to="/">Switch test</Link>
      </div>
      {bySection.map((s) => (
        <div key={s.id} className="card">
          <strong>{s.label}</strong>
          <div className="tiny muted">
            {s.count} questions here &middot; {s.questions} on the real test
          </div>
        </div>
      ))}
    </div>
  )
}
