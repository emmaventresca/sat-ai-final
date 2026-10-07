import { useEffect, useMemo, useState } from 'react'
import type { Exam, Question, Tier } from '../exams/types'
import { loadBodies, type QuestionRef } from '../lib/bank'
import { examSpec } from '../exams/registry'
import { difficultyLabel } from '../lesson/types'
import { renderBody } from '../lesson/math'
import { Round } from '../practice/Round'
import { accuracy } from '../practice/mastery'
import { trialRefs, type Leg } from './map'

interface SubLesson {
  subtype: string
  title: string
  subtitle?: string
  sections: { heading: string; body: string[] }[]
}

/**
 * A stop on the route: learn it, then practise it.
 *
 * Teaching first is the whole point of the reorganisation. The old screen
 * dropped a student straight into questions on a recognition nobody had
 * named for them, which is how practice becomes guessing. Every recognition
 * already has a written page - how to spot it, the method, where Desmos
 * helps, what it is built to catch - and it was sitting unused.
 *
 * The trial at the end of a leg is the other half. Having learnt four
 * related recognitions, the student meets them worded the ways the exam
 * actually words them - "which must be true", "EXCEPT", "which expression" -
 * because knowing the method and recognising the frame are different skills
 * and the second one is where a plateau usually is.
 */
export function StageView({
  exam, bank, leg, subtype, onBack,
}: {
  exam: Exam
  bank: QuestionRef[]
  leg: Leg
  subtype: string | null
  onBack: () => void
}) {
  const [lesson, setLesson] = useState<SubLesson | null>(null)
  const [round, setRound] = useState<Question[] | null>(null)
  const [fetching, setFetching] = useState(false)
  const trial = subtype === null

  /** Bodies are fetched when a round starts, not when the page opens. */
  async function begin(ids: string[]) {
    if (!ids.length || fetching) return
    setFetching(true)
    try {
      setRound(await loadBodies(exam, ids))
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (!subtype) return
    let live = true
    // One page, not all 183. The slug is the filename, same rule the bank
    // chunks use, so the two can never disagree about how it is spelled.
    const file = subtype.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    void fetch(`${import.meta.env.BASE_URL}data/lessons/${file}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((l: SubLesson | null) => { if (live) setLesson(l) })
      .catch(() => { if (live) setLesson(null) })
    return () => { live = false }
  }, [subtype])

  const stage = leg.stages.find((s) => s.subtype === subtype)
  const pool = useMemo(
    () => bank.filter((q) => q.subtype === subtype),
    [bank, subtype],
  )

  if (round) {
    return (
      <div className="wrap">
        <Round questions={round} onDone={() => { setRound(null); onBack() }} />
      </div>
    )
  }

  if (trial) {
    const questions = leg.trial ? trialRefs(bank, leg.trial) : []
    return (
      <div className="wrap journey">
        <button className="btn-sm" onClick={onBack}>&larr; Back to the map</button>
        <div className="trial-card">
          <div className="trial-k">Trial</div>
          <h1>Reading the question</h1>
          <p className="lead">
            You have the methods for {leg.name.toLowerCase()}. This is the
            other half: the same content, worded the ways the real test words
            it. Knowing how to solve it and spotting what is being asked are
            different skills, and the second one is usually where the plateau
            is.
          </p>
          <ul className="trial-ways">
            {(leg.trial?.families ?? []).map((f) => (
              <li key={f}><strong>{readable(f)}</strong> &mdash; {FAMILY_NOTE[f] ?? ''}</li>
            ))}
          </ul>
          <button className="btn-primary" disabled={!questions.length || fetching}
            onClick={() => void begin(questions.map((q) => q.id))}>
            {fetching ? 'Loading…'
              : questions.length ? `Begin — ${questions.length} questions`
              : 'Not enough questions yet'}
          </button>
        </div>
      </div>
    )
  }

  const tiers = examSpec(exam).tiers.filter((t) => (stage?.pool[t] ?? 0) > 0)

  return (
    <div className="wrap journey">
      <button className="btn-sm" onClick={onBack}>&larr; Back to the map</button>

      <div className="stage-card">
        <div className="stage-k">{leg.name}</div>
        <h1>{stage?.name ?? lesson?.title ?? subtype}</h1>
        {lesson?.subtitle && <p className="lead">{lesson.subtitle}</p>}

        {/* Named, because a student should know they are being taught before
            they are tested. The groundwork tier sits directly under it, so
            the two read as one move: here is the thing, here is the easiest
            version of it. */}
        <h2 className="stage-lesson-h">Mini lesson and foundations</h2>

        {lesson?.sections.map((s) => (
          <section className="stage-sec" key={s.heading}>
            <h3>{s.heading}</h3>
            <div dangerouslySetInnerHTML={{ __html: renderBody(s.body) }} />
          </section>
        ))}
        {/* No full page for this recognition yet, but the bank knows what
            it tests - and one true sentence beats a placeholder saying
            there is nothing here. */}
        {!lesson && stage?.tests && (
          <section className="stage-sec">
            <h3>What this one tests</h3>
            <p>{stage.tests}</p>
          </section>
        )}
        {!lesson && !stage?.tests && (
          <p className="muted small">
            No written page for this one yet &mdash; the questions are below.
          </p>
        )}
      </div>

      <h2>Now try it</h2>
      <p className="tiny muted" style={{ marginTop: -6 }}>
        Five levels, and nothing is locked. Foundations is the skill
        underneath with the test wrapped off; Super hard is beyond anything
        the exam asks. Start where the method above left you.
      </p>
      <div className="levels">
        {tiers.map((t) => {
          const n = stage?.pool[t] ?? 0
          const acc = accuracy(exam, subtype as string, t)
          const kind = t === 'F' ? 'foundation' : t === 'X' ? 'stretch' : 'open'
          return (
            <button key={t} className={`level ${kind}`} disabled={fetching}
              onClick={() => void begin(
                pool.filter((q) => q.difficulty === t).slice(0, 10).map((q) => q.id),
              )}>
              <span className="level-t">{difficultyLabel(t as Tier)}</span>
              <span className="level-rung" aria-hidden="true">
                {'◆'.repeat(RUNG[t] ?? 1)}
              </span>
              <span className="level-d">
                {n} question{n === 1 ? '' : 's'}
                {acc !== null ? ` · ${Math.round(acc * 100)}%` : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** How many pips a level shows. The ladder should be visible at a glance. */
const RUNG: Record<string, number> = { F: 1, E: 2, M: 3, H: 4, X: 5 }

const FAMILY_NOTE: Record<string, string> = {
  must_be_true: 'you are testing claims, not solving',
  not_except: 'the one that does NOT work is the answer',
  which_expression: 'you are picking a form, not a number',
  work_backwards: 'try the choices rather than deriving it',
  in_context: 'the maths is done; say what it means',
  compare: 'two quantities, and the question is the gap',
}

function readable(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
