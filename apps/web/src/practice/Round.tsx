import { useEffect, useMemo, useRef, useState } from 'react'
import type { Question, Tier } from '../exams/types'
import { QuestionCard } from './QuestionCard'
import { record } from './mastery'
import { runInRound, type Offer } from '../journey/promotion'
import { QuestionScene } from '../journey/Scene'
import '../journey/scene.css'

/**
 * A round of questions, one at a time.
 *
 * Score is still held back to the end - the thing being practised is the
 * recognition, not the running total.
 *
 * The clock is here but OFF by default, behind a show/hide button. Both
 * states are needed and they are different exercises: untimed is how you
 * learn to see a question type, timed is how you learn to survive the real
 * paper. Defaulting to hidden keeps the first one the normal case.
 *
 * Everything the navigator shows is kept PER INDEX rather than appended as
 * you go, because the student can move backwards. An appended list cannot
 * survive answering question four, going back to two, and answering that:
 * the result lands in the wrong slot and every later mark is wrong too.
 */
export function Round({
  questions, onDone, misconceptionLabel, offer, onAccept, verdict,
}: {
  questions: Question[]
  /** Called with the score, so a quiz can decide what it earned. */
  onDone: (right: number, total: number) => void
  misconceptionLabel?: (slug: string) => string
  /**
   * Has this run earned the next level? Asked after each answer, with the
   * current run of correct ones. The caller owns the rule; this just asks.
   */
  offer?: (run: number) => Offer | null
  onAccept?: (tier: Tier) => void
  /** What to say at the end, where the caller knows better than the default. */
  verdict?: (right: number, total: number) => string
}) {
  const [at, setAt] = useState(0)
  /** Per index: true right, false wrong, null not answered. */
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    () => questions.map(() => null),
  )
  /** Marked to come back to. Independent of whether it was answered. */
  const [flags, setFlags] = useState<boolean[]>(() => questions.map(() => false))
  /** Milliseconds spent on each question, summed across every visit. */
  const [times, setTimes] = useState<number[]>(() => questions.map(() => 0))
  const [showClock, setShowClock] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const enteredAt = useRef(Date.now())
  const roundStart = useRef(Date.now())
  /**
   * The order answers actually happened in, for the promotion offer.
   *
   * `answers` is indexed by position, which is what the navigator needs and
   * exactly what a "three in a row" rule must not use - going back to fix an
   * early question would read as a run it never was.
   */
  const [sequence, setSequence] = useState<boolean[]>([])
  const answered = answers[at] !== null
  // Once declined, it stays declined for the round. A student who said no at
  // five correct does not want to be asked again at six.
  const [waved, setWaved] = useState(false)


  const question = questions[at]
  const right = useMemo(() => answers.filter((a) => a === true).length, [answers])
  const done = useMemo(() => answers.filter((a) => a !== null).length, [answers])
  const next = !waved && answered && offer ? offer(runInRound(sequence)) : null

  // Bank the time spent here whenever the student moves, so a question that
  // is visited three times reports the total of the three.
  function goTo(i: number) {
    const spent = Date.now() - enteredAt.current
    setTimes((t) => t.map((ms, n) => (n === at ? ms + spent : ms)))
    enteredAt.current = Date.now()
    setAt(i)
  }

  // One tick a second, and only while the clock is on screen.
  useEffect(() => {
    if (!showClock) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [showClock])

  if (!question) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>{right} of {done}</h1>
        <div className="bar good" style={{ maxWidth: 280, margin: '14px auto' }}>
          <i style={{ width: `${done ? (right / done) * 100 : 0}%` }} />
        </div>
        <p className="muted small">
          {verdict
            ? verdict(right, done)
            : done && right / done >= 0.85
              ? 'Strong. This level is close to secure.'
              : done && right / done >= 0.6
                ? 'Solid. The ones you missed will come round again.'
                : 'Worth slowing down here. Read the method before the next round.'}
        </p>
        {questions.length - done > 0 && (
          <p className="muted small">
            {questions.length - done} left unanswered &mdash;{' '}
            {questions.length - done === 1 ? 'it' : 'they'} will come round again.
          </p>
        )}
        <button className="btn-primary" onClick={() => onDone(right, done)}>
          Done
        </button>
      </div>
    )
  }

  return (
    <>
      {/* The country the question is in, changing as they go. A backdrop
          rather than a picture: all the contrast stays in the card. */}
      <QuestionScene exam={question.exam} section={question.section}
        seed={question.id} />
      <div className="scene-scrim" aria-hidden="true" />
      <div className="spread" style={{ marginBottom: 12 }}>
        <button className="btn-sm" onClick={() => onDone(right, done)}>
          &larr; Back
        </button>
        <span className="tiny muted">
          {at + 1} of {questions.length} &middot;{' '}
          <span className={`badge ${question.difficulty.toLowerCase()}`}>
            {question.difficulty}
          </span>
        </span>
        <span className="round-tools">
          {showClock && (
            <span className="clock" aria-live="off">
              <span title="Time on this question">
                {clock(times[at] + (now - enteredAt.current))}
              </span>
              <span className="clock-sep">/</span>
              <span className="clock-total" title="Total time this round">
                {clock(now - roundStart.current)}
              </span>
            </span>
          )}
          <button className="btn-tool" onClick={() => {
            setNow(Date.now())
            setShowClock((v) => !v)
          }}>
            {showClock ? 'Hide clock' : 'Show clock'}
          </button>
          <button
            className={`btn-tool flag${flags[at] ? ' on' : ''}`}
            aria-pressed={flags[at]}
            onClick={() => setFlags((f) => f.map((v, n) => (n === at ? !v : v)))}>
            {flags[at] ? 'Flagged' : 'Flag'}
          </button>
        </span>
      </div>
      <div className="bar thin">
        <i style={{ width: `${(at / questions.length) * 100}%` }} />
      </div>

      {/* Coming back to a question already answered.
          The card resets on revisit, so without this line it looks as though
          the answer did not save and the student answers it again - which is
          ignored, which looks broken twice over. Say what happened instead. */}
      {answered && (
        <p className={`revisit ${answers[at] ? 'right' : 'wrong'}`}>
          You already answered this one &mdash;{' '}
          {answers[at] ? 'you got it right' : 'you got it wrong'}. It is
          recorded; answering again here changes nothing.
        </p>
      )}

      <QuestionCard key={question.id} question={question}
        misconceptionLabel={misconceptionLabel}
        onAnswer={(chosen, correct, ms) => {
          // Revisiting a question must not record a second attempt: the
          // student has already met it, and a second row would double-count
          // it everywhere downstream - mastery, the error log, the teacher's
          // numbers.
          if (answers[at] !== null) return
          record(question, chosen, correct, ms)
          setAnswers((a) => a.map((v, n) => (n === at ? correct : v)))
          setSequence((r) => [...r, correct])
        }} />

      {/* The offer, mid-round, where the evidence for it just happened.
          Waiting until the end would put it on a results screen the student
          is already leaving - and the point is that they are hot NOW. */}
      {next && (
        <div className="offer">
          <strong>{next.streak} in a row.</strong>{' '}
          That is enough &mdash; {next.waiting} question
          {next.waiting === 1 ? '' : 's'} waiting at the next level.
          <div className="row tight" style={{ marginTop: 8 }}>
            <button className="btn-primary" onClick={() => onAccept?.(next.to)}>
              Move up
            </button>
            <button className="btn-sm" onClick={() => setWaved(true)}>
              Stay here
            </button>
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn-next" disabled={at === 0}
          onClick={() => goTo(at - 1)}>
          <span aria-hidden="true">&larr; </span>Previous
        </button>
        {at + 1 === questions.length ? (
          <button className={answered ? 'btn-primary' : 'btn-next'}
            style={{ marginLeft: 'auto' }}
            onClick={() => onDone(right, done)}>
            Finish
          </button>
        ) : (
          <button className={answered ? 'btn-primary' : 'btn-next'}
            style={{ marginLeft: 'auto' }}
            onClick={() => goTo(at + 1)}>
            Next<span aria-hidden="true"> &rarr;</span>
          </button>
        )}
      </div>

      {/* The navigator. Every question, what happened to it, and a way back
          to any of them - which is the whole point of letting a student skip
          in the first place. */}
      <ol className="navstrip" aria-label="Questions in this round">
        {questions.map((q, i) => {
          const state = answers[i] === true ? 'right'
            : answers[i] === false ? 'wrong'
              : 'open'
          return (
            <li key={q.id}>
              <button
                className={`nav-q ${state}${flags[i] ? ' flagged' : ''}${i === at ? ' here' : ''}`}
                aria-current={i === at ? 'true' : undefined}
                title={`Question ${i + 1}: ${LABEL[state]}${flags[i] ? ', flagged' : ''}`}
                onClick={() => goTo(i)}>
                {i + 1}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="tiny muted navkey">
        {right} right &middot; {done - right} wrong &middot;{' '}
        {questions.length - done} unanswered
        {flags.some(Boolean) && <> &middot; {flags.filter(Boolean).length} flagged</>}
      </p>
    </>
  )
}

const LABEL: Record<string, string> = {
  right: 'answered correctly',
  wrong: 'answered incorrectly',
  open: 'not answered yet',
}

/** m:ss, which is how long a question takes. Hours would be a bug. */
function clock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
