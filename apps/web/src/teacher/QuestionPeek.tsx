import { useState } from 'react'
import type { Question } from '../exams/types'
import { renderFigure, renderHtml, renderStimulus } from '../lesson/math'
import { difficultyLabel } from '../lesson/types'

/**
 * A question, read before it is set.
 *
 * Assigning from a one-line stem is assigning blind: two questions in the
 * same recognition at the same level can be a thirty-second check and a
 * four-minute slog, and the only way to tell is to look at them. So the
 * picker opens them.
 *
 * The answer is behind a toggle rather than shown or hidden for good. A
 * teacher scanning twenty questions wants the stems; a teacher deciding
 * whether one is too hard wants the working - and the same person wants
 * both within a minute of each other.
 */
export function QuestionPeek({
  question, onClose,
}: {
  question: Question
  onClose: () => void
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const grid = question.format === 'grid'
  const specs = question.figures?.length
    ? question.figures
    : question.figure ? [question.figure] : []

  return (
    <div className="peek-panel">
      <div className="spread peek-head">
        <div className="row tight">
          <span className={`badge ${question.difficulty.toLowerCase()}`}>
            {difficultyLabel(question.difficulty)}
          </span>
          {question.subtypeName && (
            <span className="badge name">{question.subtypeName}</span>
          )}
          {question.phrasing && question.phrasing !== 'direct' && (
            <span className="badge">{readable(question.phrasing)}</span>
          )}
          {grid && <span className="badge">types the answer</span>}
        </div>
        <div className="row tight">
          <label className="tiny peek-toggle">
            <input type="checkbox" checked={showAnswer}
              onChange={(e) => setShowAnswer(e.target.checked)} />{' '}
            Show answer
          </label>
          <button className="btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>

      {Boolean(question.stimulus || specs.length) && (
        <div className="stim" dangerouslySetInnerHTML={{
          __html: renderStimulus(question.stimulus)
            + specs.map((s) => renderFigure(s)).join(''),
        }} />
      )}
      <div className="q" dangerouslySetInnerHTML={{
        __html: renderStimulus(question.stem),
      }} />

      {grid ? (
        <div className="grid-row">
          <div className="grid-box">{showAnswer ? (question.keys ?? []).join('  or  ') : '—'}</div>
        </div>
      ) : (
        (question.choices ?? []).map((choice, i) => {
          const key = 'ABCDEFGH'[i]
          const right = showAnswer && key === question.answer
          return (
            <div key={key} className={`choice peek-choice${right ? ' right' : ''}`}>
              <span className="k">{key}</span>
              <span className="ctext" dangerouslySetInnerHTML={{ __html: renderHtml(choice) }} />
            </div>
          )
        })
      )}

      {showAnswer && (
        <>
          <div className="why">
            <div className="why-h">
              {grid
                ? `Answer: ${(question.keys ?? []).join(' or ')}`
                : `Answer: ${question.answer}`}
            </div>
            <div dangerouslySetInnerHTML={{
              __html: renderHtml(question.perChoice?.correct ?? question.explanation ?? ''),
            }} />
          </div>
          {wrongOnes(question).length > 0 && (
            <details className="why-more">
              <summary>What each wrong one catches</summary>
              {wrongOnes(question).map(([key, why]) => (
                <div className="why-alt" key={key}>
                  <div className="why-h">
                    {key}
                    {question.misconceptions?.[key] && (
                      <span className="badge on" style={{ marginLeft: 8 }}>
                        {readable(question.misconceptions[key])}
                      </span>
                    )}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: renderHtml(why) }} />
                </div>
              ))}
            </details>
          )}
        </>
      )}
    </div>
  )
}

function wrongOnes(q: Question): [string, string][] {
  return Object.entries(q.perChoice ?? {})
    .filter(([key]) => key !== 'correct' && key !== q.answer)
}

function readable(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
