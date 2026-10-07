import { useMemo, useState } from 'react'
import type { Question } from '../exams/types'
import { QuestionCard } from './QuestionCard'
import { record } from './mastery'

/**
 * A round of questions, one at a time.
 *
 * Deliberately no timer and no score until the end. The thing being
 * practised is the recognition, and a clock turns that into a different
 * exercise - one the student will get on test day anyway, and which teaches
 * nothing about the question type on the screen now.
 */
export function Round({
  questions, onDone, misconceptionLabel,
}: {
  questions: Question[]
  onDone: () => void
  misconceptionLabel?: (slug: string) => string
}) {
  const [at, setAt] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [answered, setAnswered] = useState(false)

  const question = questions[at]
  const right = useMemo(() => results.filter(Boolean).length, [results])

  if (!question) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>{right} of {results.length}</h1>
        <div className="bar good" style={{ maxWidth: 280, margin: '14px auto' }}>
          <i style={{ width: `${results.length ? (right / results.length) * 100 : 0}%` }} />
        </div>
        <p className="muted small">
          {results.length && right / results.length >= 0.85
            ? 'Strong. This level is close to secure.'
            : results.length && right / results.length >= 0.6
              ? 'Solid. The ones you missed will come round again.'
              : 'Worth slowing down here. Read the method before the next round.'}
        </p>
        <button className="btn-primary" onClick={onDone}>Done</button>
      </div>
    )
  }

  return (
    <>
      <div className="spread" style={{ marginBottom: 12 }}>
        <button className="btn-sm" onClick={onDone}>&larr; Back</button>
        <span className="tiny muted">
          {at + 1} of {questions.length} &middot;{' '}
          <span className={`badge ${question.difficulty.toLowerCase()}`}>
            {question.difficulty}
          </span>
        </span>
      </div>
      <div className="bar thin">
        <i style={{ width: `${(at / questions.length) * 100}%` }} />
      </div>

      <QuestionCard key={question.id} question={question}
        misconceptionLabel={misconceptionLabel}
        onAnswer={(chosen, correct, ms) => {
          record(question, chosen, correct, ms)
          setResults((r) => [...r, correct])
          setAnswered(true)
        }} />

      {answered && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn-primary grow" onClick={() => { setAt(at + 1); setAnswered(false) }}>
            {at + 1 === questions.length ? 'Finish' : 'Next question'}
          </button>
        </div>
      )}
    </>
  )
}
