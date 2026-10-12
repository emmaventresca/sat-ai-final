import { useEffect, useMemo, useState } from 'react'
import type { Exam, Question, Tier } from '../exams/types'
import { loadBodies, type QuestionRef } from '../lib/bank'
import { examSpec } from '../exams/registry'
import { difficultyLabel } from '../lesson/types'
import { renderBody } from '../lesson/math'
import { Round } from '../practice/Round'
import { accuracy, progress } from '../practice/mastery'
import { quizRefs, trialRefs, type Leg } from './map'
import {
  challengeGate, lastTouched, promotionFor, remainingIn, serveOrder, streakNeeded,
} from './promotion'
import { gemFor, lastQuiz, QUIZ_PASS, recordQuiz } from './gems'
import { resolved as resolvedIds } from '../errors/log'
import { groupedBySection, passageRound, shapeOf } from './passages'
import { Gem } from './Gem'
import { Rungs } from './Icons'
import { WorkedExample } from './Worked'
import { makeMore, plannerUp } from '../teacher/plannerApi'

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
export type StageMode = 'stage' | 'trial' | 'quiz'

export function StageView({
  exam, bank, leg, subtype, mode, onBack,
}: {
  exam: Exam
  bank: QuestionRef[]
  leg: Leg
  subtype: string | null
  mode: StageMode
  onBack: () => void
}) {
  const [lesson, setLesson] = useState<SubLesson | null>(null)
  const [round, setRound] = useState<Question[] | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)
  const [fetching, setFetching] = useState(false)
  const [scored, setScored] = useState<{ right: number; total: number } | null>(null)
  /**
   * Making more questions when a level has been worked dry.
   *
   * The bank is finite and lumpy - forty questions at Medium and four at
   * Challenge in the same recognition - so running out is normal rather than
   * exceptional, and the honest answer is to write more of exactly the thing
   * they ran out of.
   *
   * Only offered when the local authoring server is actually up. A button
   * that fails is worse than no button, and this one needs a machine that
   * can run the model.
   */
  const [canMake, setCanMake] = useState(false)
  const [making, setMaking] = useState<Tier | null>(null)
  const [madeNote, setMadeNote] = useState<string | null>(null)

  useEffect(() => { void plannerUp().then(setCanMake) }, [])

  async function makeFor(t: Tier) {
    setMaking(t)
    setMadeNote(null)
    const res = await makeMore(exam, {
      skill_cd: leg.skill, subtype, difficulty: t, n: 8,
    })
    setMaking(null)
    setMadeNote(res.made
      ? `Wrote ${res.made} new ${difficultyLabel(t).toLowerCase()} question`
        + `${res.made === 1 ? '' : 's'}. Reload to see them.`
      : `Could not make more: ${res.error ?? 'nothing was written'}`)
  }

  /**
   * Answered CORRECTLY, not merely met.
   *
   * A missed question is not finished - it is the most useful thing in the
   * bank to come back to - so it keeps counting as left, and `serveOrder`
   * puts it back in front of the student rather than retiring it.
   */
  const attempted = useMemo(
    () => resolvedIds(progress().attempts.filter((a) => a.exam === exam)),
    [exam, round],
  )

  /** Bodies are fetched when a round starts, not when the page opens. */
  async function begin(refs: QuestionRef[], at: Tier | null = null) {
    if (!refs.length || fetching) return
    setFetching(true)
    setTier(at)
    try {
      setRound(await loadBodies(exam, refs.map((q) => q.id)))
    } finally {
      setFetching(false)
    }
  }

  /**
   * Ten questions, newest first.
   *
   * The ordering is what makes a bank edit visible the same evening: a
   * teacher writes twenty questions in the morning and the student meets
   * them tonight, rather than after the hundred and fifty they have not got
   * to yet.
   */
  function pick(refs: QuestionRef[], subtypeFor: string, n = 10): QuestionRef[] {
    // Reading and Science hang many questions off one passage, so a round
    // there takes passages WHOLE. Serving those one question at a time means
    // reading a fresh passage for every question - four minutes of reading
    // for forty seconds of question, and nothing like the real section,
    // where you read once and then answer ten.
    if (groupedBySection(section)) return passageRound(refs, attempted, n)
    return serveOrder(refs, attempted, lastTouched(exam, subtypeFor)).slice(0, n)
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
  /**
   * The section this recognition belongs to.
   *
   * The MAJORITY, not the first question. 41 ACT questions sit in a subtype
   * whose other questions are in a different section, and reading the
   * section off `pool[0]` meant two stray maths items in a 70-question
   * Reading recognition turned passage-grouped serving off for the whole
   * thing - silently, because nothing about a wrong section throws.
   */
  const gate = useMemo(
    () => challengeGate(pool, attempted), [pool, attempted],
  )

  const section = useMemo(() => {
    const tally = new Map<string, number>()
    for (const q of pool) tally.set(q.section, (tally.get(q.section) ?? 0) + 1)
    let best = bank[0]?.section ?? ''
    let most = 0
    for (const [sec, n] of tally) if (n > most) { best = sec; most = n }
    return best
  }, [pool, bank])

  if (round) {
    const quiz = mode === 'quiz'
    return (
      <div className="wrap">
        <Round questions={round}
          verdict={quiz ? quizVerdict : undefined}
          offer={!quiz && subtype && tier
            ? (run) =>
                // The streak has to have happened HERE. The stored one can be
                // carried in from last week, and "ten in a row" meaning five
                // tonight and five on Tuesday is not the signal we claimed.
                run >= streakNeeded(tier, section)
                  ? promotionFor(exam, subtype, tier, section, pool)
                  : null
            : undefined}
          onAccept={(to) => {
            if (!subtype) return
            setRound(null)
            void begin(pick(pool.filter((q) => q.difficulty === to), subtype), to)
          }}
          onDone={(right, total) => {
            if (quiz) {
              recordQuiz(exam, leg.skill, right, total)
              setScored({ right, total })
              setRound(null)
              return
            }
            setRound(null)
            onBack()
          }} />
      </div>
    )
  }

  if (mode === 'quiz') {
    const earned = gemFor(exam, leg.skill, leg.cleared === leg.stages.length)
    const questions = leg.quiz ? quizRefs(bank, leg.quiz) : []
    const sat = lastQuiz(exam, leg.skill)
    return (
      <div className="wrap journey">
        <button className="btn-sm" onClick={onBack}>&larr; Back to the map</button>
        <div className="trial-card quiz-card">
          <h1>The {leg.name} quiz</h1>

          {scored ? (
            <>
              <p className="lead">
                {scored.right} of {scored.total}.{' '}
                {scored.total && scored.right / scored.total >= QUIZ_PASS
                  ? 'That is the quiz passed, and the gem is polished.'
                  : 'Not quite the gem this time, and nothing is lost by it — '
                    + 'the questions you missed are the useful part.'}
              </p>
              <Gem state={gemFor(exam, leg.skill, leg.cleared === leg.stages.length)}
                hue={['#534AB7', '#7F77DD']} size={56}
                title="Your gem for this path" />
            </>
          ) : (
            <>
              <p className="lead">
                {earned === 'none'
                  ? `All ${leg.stages.length} recognitions on this path, mixed and `
                    + 'out of order. Nothing announces which one is coming — which '
                    + 'is the whole exercise, and the one thing practising them a '
                    + 'stop at a time cannot rehearse.'
                  : earned === 'earned'
                    ? 'You have the gem already — clearing every stop earned it. '
                      + 'This is for a better one: the same recognitions, mixed '
                      + 'and out of order, the way the real test gives them to you.'
                    : 'You have already polished this one. Sitting it again is '
                      + 'still one of the better things you can do with twenty '
                      + 'minutes — it is the fastest way to find out what has '
                      + 'gone quiet since.'}
              </p>
              {sat && <p className="tiny muted">Last sat {sat}.</p>}
              <button className="btn-primary" disabled={!questions.length || fetching}
                onClick={() => void begin(questions)}>
                {fetching ? 'Loading…'
                  : questions.length
                    ? `Begin — ${questions.length} questions`
                    : 'Not enough questions yet'}
              </button>
              <p className="tiny muted" style={{ marginTop: 10 }}>
                {Math.round(QUIZ_PASS * 100)}% polishes the gem. Below that
                nothing is taken away, and you can come back to it any time.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'trial') {
    const questions = leg.trial ? trialRefs(bank, leg.trial) : []
    return (
      <div className="wrap journey">
        <button className="btn-sm" onClick={onBack}>&larr; Back to the map</button>
        <div className="trial-card">
          <h1>Trial: reading the question</h1>
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
            onClick={() => void begin(questions)}>
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
        <h1>{stage?.name ?? lesson?.title ?? subtype}</h1>
        <p className="stage-where">{leg.name}</p>
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

      {subtype && <WorkedExample exam={exam} subtype={subtype} pool={pool} />}

      <h2>Now try it</h2>
      <p className="tiny muted" style={{ marginTop: -6 }}>
        Foundations is the skill underneath with the test wrapped off.
        Challenge is beyond anything the exam asks, so it opens once you have
        worked through every Hard question here &mdash; there is no point
        spending an evening past the test while real Hard questions sit
        unanswered. Start where the method above left you.
      </p>
      <div className="levels">
        {tiers.map((t) => {
          const n = stage?.pool[t] ?? 0
          const acc = accuracy(exam, subtype as string, t)
          const kind = t === 'F' ? 'foundation' : t === 'X' ? 'stretch' : 'open'

            const here = pool.filter((q) => q.difficulty === t)
            const rest = remainingIn(here, attempted, lastTouched(exam, subtype as string))
            // Challenge is the one locked thing in the app. It shows its
            // count either way - a student should see that the questions
            // exist and what opens them, not find an empty space.
            const locked = t === 'X' && !gate.open
            return (
            <button key={t} className={`level ${kind} ${locked ? 'locked' : ''}`}
              disabled={fetching || locked}
              aria-disabled={locked}
              title={locked
                ? `Opens when all ${gate.hardTotal} Hard questions here are done`
                : undefined}
              onClick={() => void begin(pick(here, subtype as string), t)}>
              <span className="level-t">{difficultyLabel(t as Tier)}</span>
              <span className="level-rung">
                <Rungs n={RUNG[t] ?? 1} />
              </span>
              {/* The bar fills to what they have ACTUALLY answered, and the
                  line underneath says what is left. Moving up a level does
                  not finish the one below, and a screen that showed only a
                  percentage let a student believe it did. */}
              {rest.attempted > 0 && (
                <span className="level-bar">
                  <i style={{ width: `${(rest.attempted / rest.total) * 100}%` }} />
                </span>
              )}
              <span className="level-d">
                {rest.left === 0
                  ? `all ${n} done`
                  : rest.attempted === 0
                    ? `${n} question${n === 1 ? '' : 's'}`
                    : `${rest.left} of ${n} left`}
                {acc !== null ? ` · ${Math.round(acc * 100)}%` : ''}
              </span>
              {/* On a passage section, say how much reading this is. "Two
                  passages, 14 questions" is a different commitment from
                  "14 questions", and the student should know which one they
                  are agreeing to before they start. */}
              {groupedBySection(section) && rest.left > 0 && (() => {
                const shape = shapeOf(here, attempted, 10)
                return shape.passages > 0 ? (
                  <span className="level-shape">
                    {shape.passages} passage{shape.passages === 1 ? '' : 's'}
                    {' · '}{shape.questions} question
                    {shape.questions === 1 ? '' : 's'} a round
                  </span>
                ) : null
              })()}
              {rest.fresh > 0 && !locked && (
                <span className="level-new">{rest.fresh} new</span>
              )}
              {locked && (
                <span className="level-lock">
                  {gate.hardLeft} Hard left to open
                </span>
              )}
            </button>
            )
        })}
      </div>

      {/* Levels this student has worked dry, with an offer to write more of
          exactly that. They go into the shared bank, not a private stash:
          the next person to reach this recognition gets them too. */}
      {canMake && subtype && (() => {
        const dry = tiers.filter((t) => {
          const here = pool.filter((q) => q.difficulty === t)
          if (!here.length) return false
          if (t === 'X' && !gate.open) return false
          return remainingIn(here, attempted,
            lastTouched(exam, subtype as string)).left === 0
        })
        if (!dry.length && !madeNote) return null
        return (
          <div className="make-more">
            {dry.length > 0 && (
              <>
                <p className="tiny muted">
                  Worked dry here. New questions are written into the shared
                  bank, so everyone gets them &mdash; it takes a minute or two.
                </p>
                <div className="row tight">
                  {dry.map((t) => (
                    <button key={t} className="btn-sm" disabled={making !== null}
                      onClick={() => void makeFor(t as Tier)}>
                      {making === t
                        ? `Writing ${difficultyLabel(t as Tier).toLowerCase()}…`
                        : `Make more ${difficultyLabel(t as Tier).toLowerCase()}`}
                    </button>
                  ))}
                </div>
              </>
            )}
            {madeNote && <p className="tiny" style={{ marginTop: 8 }}>{madeNote}</p>}
          </div>
        )
      })()}
    </div>
  )
}

/**
 * What to say after a unit quiz.
 *
 * Never "you failed". A quiz below the bar costs a student nothing they had -
 * the gem they earned by clearing the stops is still theirs - and the thing
 * that actually helps is pointing at the misses, not at the number.
 */
function quizVerdict(right: number, total: number): string {
  if (!total) return ''
  const share = right / total
  if (share >= QUIZ_PASS) {
    return 'Passed, and mixed up like that it counts for more than any single '
      + 'stop. The gem is polished.'
  }
  if (share >= 0.6) {
    return 'Close. Mixed order is harder than any one stop, and the ones you '
      + 'missed are a shorter list than it feels like — Review has them.'
  }
  return 'Worth going back to the stops before sitting this again. Nothing is '
    + 'lost by it, and the misses are in Review.'
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
