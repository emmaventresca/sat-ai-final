import { useEffect, useRef, useState } from 'react'
import type { Question } from '../exams/types'
import { renderFigure, renderHtml, renderStimulus } from '../lesson/math'
import { MAX_LEN, diagnose, matches } from './grid'
import { Annotatable } from './Annotatable'
import { loadEliminated, saveEliminated } from './annotate'

/**
 * One question, answered.
 *
 * The same component for both exams and both formats. Multiple choice gets
 * buttons; a student-produced response gets a box, because the point of that
 * format is that there is nothing to eliminate and nothing to recognise -
 * offering four empty letters would hand back exactly what the format takes
 * away.
 *
 * Nothing is revealed until the student commits. The exam gives no feedback
 * until you move on, and a field that goes green as you type returns the
 * confirmation the format is designed to withhold.
 */
export function QuestionCard({
  question, onAnswer, misconceptionLabel,
}: {
  question: Question
  onAnswer: (chosen: string, correct: boolean) => void
  misconceptionLabel?: (slug: string) => string
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  // The exam's answer eliminator, off by default and remembered per
  // question. A student who rules two choices out and then loses the marks
  // has to redo the thinking, which is exactly why the real test keeps them
  // on screen.
  const [eliminating, setEliminating] = useState(false)
  const [crossed, setCrossed] = useState<string[]>(() => loadEliminated(question.id))
  const box = useRef<HTMLInputElement>(null)
  const grid = question.format === 'grid'

  useEffect(() => {
    setPicked(null)
    setTyped('')
    setCrossed(loadEliminated(question.id))
    if (grid) box.current?.focus()
  }, [question.id, grid])

  function toggleCrossed(key: string) {
    const next = crossed.includes(key)
      ? crossed.filter((k) => k !== key)
      : [...crossed, key]
    setCrossed(next)
    saveEliminated(question.id, next)
  }

  const revealed = picked !== null
  const correct = revealed
    ? grid ? matches(picked, question.keys) : picked === question.answer
    : false

  function commit(value: string) {
    if (revealed || !value.trim()) return
    const ok = grid ? matches(value, question.keys) : value === question.answer
    setPicked(value)
    onAnswer(value, ok)
  }

  const hit = revealed && !correct && grid
    ? diagnose(picked, question.misconceptions) : null
  const family = revealed && !correct
    ? (grid ? hit?.family : question.misconceptions?.[picked ?? '']) : null

  return (
    <div className="card">
      {Boolean(question.stimulus || question.figure) && (
        <Annotatable className="stim" questionId={question.id} part="stimulus"
          html={renderStimulus(question.stimulus) + renderFigure(question.figure)} />
      )}
      <Annotatable className="q" questionId={question.id} part="stem"
        html={renderStimulus(question.stem)} />

      {!grid && !revealed && (
        <div className="row tight" style={{ margin: '4px 0 10px' }}>
          <button className={`btn-sm${eliminating ? ' on' : ''}`}
            aria-pressed={eliminating}
            onClick={() => setEliminating(!eliminating)}>
            {eliminating ? 'Done crossing out' : 'Cross out answers'}
          </button>
        </div>
      )}

      {grid ? (
        <>
          <div className="grid-row">
            {revealed ? (
              <>
                <div className={`grid-box ${correct ? 'right' : 'wrong'}`}>{picked}</div>
                {!correct && (
                  <div className="grid-ans">
                    Answer: <strong>{(question.keys ?? [])[0]}</strong>
                    {(question.keys ?? []).length > 1 && (
                      <span className="tiny muted">
                        {' '}(or {(question.keys ?? []).slice(1).join(', ')})
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <input ref={box} className="grid-box" type="text" inputMode="decimal"
                  maxLength={MAX_LEN} autoComplete="off" spellCheck={false}
                  aria-label="Your answer" placeholder="—"
                  value={typed} onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commit(typed) }} />
                <button className="btn-primary" onClick={() => commit(typed)}>Check</button>
              </>
            )}
          </div>
          {!revealed && (
            <p className="tiny muted" style={{ marginTop: 8 }}>
              No choices — type the value. A fraction or a decimal is fine. No
              units, no commas.
            </p>
          )}
        </>
      ) : (
        (question.choices ?? []).map((choice, i) => {
          const key = 'ABCDEFGH'[i]
          const out = crossed.includes(key)
          let cls = 'choice'
          if (out) cls += ' struck'
          if (revealed) {
            if (key === question.answer) cls += ' right'
            else if (key === picked) cls += ' wrong'
          }
          return (
            <div className="choice-row" key={key}>
              <button className={cls} disabled={revealed || out}
                onClick={() => commit(key)}>
                <span className="k">{key}</span>
                <span className="ctext" dangerouslySetInnerHTML={{ __html: renderHtml(choice) }} />
              </button>
              {eliminating && !revealed && (
                <button className="strike-btn"
                  aria-label={out ? `Restore ${key}` : `Cross out ${key}`}
                  onClick={() => toggleCrossed(key)}>
                  {out ? key : <s>{key}</s>}
                </button>
              )}
            </div>
          )
        })
      )}

      {revealed && (
        <Explanation question={question} picked={picked ?? ''} correct={correct}
          family={family ?? null} gridValue={hit?.value}
          misconceptionLabel={misconceptionLabel} />
      )}
    </div>
  )
}

function Explanation({
  question, picked, correct, family, gridValue, misconceptionLabel,
}: {
  question: Question
  picked: string
  correct: boolean
  family: string | null
  gridValue?: string
  misconceptionLabel?: (slug: string) => string
}) {
  const parts = question.perChoice ?? {}
  // A grid-in's explanations are keyed by the VALUE typed, not a letter.
  const mineKey = question.format === 'grid' ? gridValue : picked
  const mine = !correct && mineKey ? parts[mineKey] : undefined

  return (
    <>
      {!correct && (
        <div className="why why-yours">
          <div className="why-h">
            {question.format === 'grid' ? `Where ${picked} comes from` : `Why ${picked} is wrong`}
          </div>
          {family && misconceptionLabel && (
            <p className="why-name">{misconceptionLabel(family)}</p>
          )}
          {mine
            ? <div dangerouslySetInnerHTML={{ __html: renderHtml(mine) }} />
            : <p className="small">
                That is not one of the values this question can produce. Work
                back through the method below and find where yours diverged.
              </p>}
        </div>
      )}
      <div className="why">
        <div className="why-h">
          {correct ? 'Why that is right' : 'How to get there'}
        </div>
        <div dangerouslySetInnerHTML={{
          __html: renderHtml(parts.correct ?? question.explanation ?? ''),
        }} />
      </div>
    </>
  )
}
