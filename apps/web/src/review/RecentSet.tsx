import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Exam, Question } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadBodies, loadIndex } from '../lib/bank'
import { progress } from '../practice/mastery'
import { Round } from '../practice/Round'
import { recentPlan, SET_MAX, type RecentPlan } from './recent'

/**
 * Practise what you have been getting wrong, without having to decide what
 * that is.
 *
 * The full Review screen is better for a student who already knows what they
 * want to work on. This is for the far commoner moment: twenty spare minutes
 * and no idea where to spend them. One button, a set already built, and the
 * pages worth reading listed underneath with the student's own record as the
 * reason to open them.
 */
export function Recent({ exam }: { exam: Exam }) {
  const nav = useNavigate()
  const [bodies, setBodies] = useState<Question[]>([])
  const [round, setRound] = useState<Question[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    void loadIndex(exam).then(async (index) => {
      if (!live) return
      // Only the recognitions they are missing need their bodies fetched,
      // which is a few dozen questions rather than the whole bank.
      const attempts = progress().attempts
      const wanted = new Set(
        attempts.filter((a) => a.exam === exam && !a.correct)
          .map((a) => a.questionId),
      )
      const subtypes = new Set(
        index.filter((q) => wanted.has(q.id)).map((q) => q.subtype),
      )
      const ids = index
        .filter((q) => q.subtype && subtypes.has(q.subtype))
        .map((q) => q.id)
        .slice(0, 900)
      const got = ids.length ? await loadBodies(exam, ids) : []
      if (live) { setBodies(got); setLoading(false) }
    }).catch(() => live && setLoading(false))
    return () => { live = false }
  }, [exam])

  const plan: RecentPlan = useMemo(
    () => recentPlan(exam, progress().attempts, bodies),
    [exam, bodies, round],
  )

  if (round) {
    return (
      <div className="wrap">
        <Round questions={round}
          verdict={(right, total) => total && right / total >= 0.7
            ? 'Better than last time you met these. That is the whole point of the set.'
            : 'These are the ones that keep costing you. Read the pages below before the next round.'}
          onDone={() => setRound(null)} />
      </div>
    )
  }

  return (
    <div className="wrap wide journey">
      <div className="top">
        <div>
          <h1>Practice recent mistakes</h1>
          <p className="who">
            {loading
              ? 'Looking at what you have been missing…'
              : plan.from
                ? `Drawn from ${plan.from} miss${plan.from === 1 ? '' : 'es'} in the last three weeks.`
                : 'Nothing missed in the last three weeks — come back after a round.'}
          </p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to={`/${exam}`}>Back to the map</Link>
          <Link className="btn-sm" to="/review">All mistakes</Link>
        </div>
      </div>

      {!loading && plan.questions.length > 0 && (
        <div className="card recent-set">
          <h2 style={{ marginTop: 0 }}>Your set</h2>
          <p className="small">
            {plan.questions.length} questions across{' '}
            {plan.groups.length} recognition{plan.groups.length === 1 ? '' : 's'}.
            The ones that actually beat you come first — re-sitting a question
            you got wrong is the single most useful thing in here — then
            questions built to catch the same mistake with different numbers.
          </p>
          <button className="btn-primary"
            onClick={() => setRound(plan.questions.slice(0, SET_MAX))}>
            Start — {plan.questions.length} questions
          </button>
          {plan.thin.length > 0 && (
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Thin on practice for {plan.thin.join(', ')} — the bank does not
              have many of those yet, so the set leans on the others.
            </p>
          )}
        </div>
      )}

      {!loading && plan.groups.length > 0 && (
        <>
          <h2>What keeps going wrong</h2>
          <div className="recent-groups">
            {plan.groups.map((g) => (
              <div className="recent-group" key={g.key}>
                <div className="rg-n">{g.count}</div>
                <div className="rg-body">
                  <div className="rg-t">{g.title}</div>
                  <div className="rg-d">
                    {g.topFamilies.length
                      ? g.topFamilies.slice(0, 2)
                          .map((f) => `${f.name.toLowerCase()} (${f.n})`)
                          .join(' · ')
                      : 'no single pattern yet'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2>Worth reading</h2>
          <p className="tiny muted" style={{ marginTop: -4 }}>
            Each of these is the written page for a recognition you are
            losing. The reason is your own record, not ours.
          </p>
          <div className="recent-lessons">
            {plan.lessons.map((l) => (
              <button className="recent-lesson" key={l.subtype}
                onClick={() => nav(`/${exam}?stop=${encodeURIComponent(l.subtype)}`)}>
                <span className="rl-t">{l.name}</span>
                <span className="rl-d">{l.why}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && !plan.questions.length && plan.from > 0 && (
        <div className="card">
          <p className="small">
            You have misses on record, but not enough practice in the bank for
            those recognitions yet to build a full set. {' '}
            <Link to="/review">All mistakes</Link> will still show them.
          </p>
        </div>
      )}

      {!loading && !plan.from && (
        <div className="card">
          <p className="small">
            Nothing to practise here yet, which is a good problem.{' '}
            <Link to={`/${exam}`}>Go and get some wrong.</Link>
          </p>
          <p className="tiny muted" style={{ margin: 0 }}>
            Everything you miss turns up here for three weeks, with a set
            already built and the pages worth reading underneath.
          </p>
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 20 }}>
        {examSpec(exam).label} only — the two tests never mix.
      </p>
    </div>
  )
}
