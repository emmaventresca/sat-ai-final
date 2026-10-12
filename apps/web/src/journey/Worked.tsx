import { useEffect, useState } from 'react'
import type { Exam, Question, Tier } from '../exams/types'
import { loadBodies, type QuestionRef } from '../lib/bank'
import { renderFigure, renderHtml, renderStimulus } from '../lesson/math'
import { difficultyLabel } from '../lesson/types'

/**
 * Two questions, already solved, before the student is asked to solve any.
 *
 * The written page explains the recognition in prose and then the screen
 * ends. That is a lesson a student reads, agrees with, and cannot use - the
 * gap between "you are looking for the point where the two expressions are
 * equal" and recognising that sentence inside an actual question is the whole
 * difficulty, and prose cannot cross it.
 *
 * Nothing here is authored. Every item in the bank already carries a written
 * explanation and, where the item names one, the wrong turn it was built to
 * catch - all of it verified, all of it ours. It was simply never shown
 * anywhere except after a student had already got the question wrong, which
 * is the one moment it helps least.
 *
 * The working stays folded until asked for. An example with the answer
 * already on screen is read as a paragraph; an example with a fold in it gets
 * a guess first, and a guess is what makes the answer stick.
 */
export function WorkedExample({
  exam, subtype, pool,
}: {
  exam: Exam
  subtype: string
  pool: QuestionRef[]
}) {
  const [shown, setShown] = useState<Question[]>([])

  useEffect(() => {
    let live = true
    setShown([])
    const ids = choose(pool).map((q) => q.id)
    if (!ids.length) return
    void loadBodies(exam, ids)
      .then((qs) => { if (live) setShown(qs) })
      .catch(() => undefined)
    return () => { live = false }
  }, [exam, subtype, pool])

  if (!shown.length) return null

  return (
    <section className="worked">
      <h2>Two, already walked</h2>
      <p className="tiny muted" style={{ marginTop: -4 }}>
        Read the question, decide what you would do, then open the working.
        Guessing first is what makes it stick.
      </p>
      {shown.map((q, i) => (
        <Example key={q.id} q={q} n={i + 1} />
      ))}
    </section>
  )
}

/**
 * The easiest one, and one rung up.
 *
 * Two at the same level teaches the numbers; two a rung apart teaches that
 * the recognition survives the question getting harder, which is the thing
 * a student does not believe until they have seen it.
 */
function choose(pool: QuestionRef[]): QuestionRef[] {
  const LADDER: Tier[] = ['F', 'E', 'M', 'H', 'X']
  const byTier = new Map<Tier, QuestionRef[]>()
  for (const q of pool) {
    const list = byTier.get(q.difficulty) ?? []
    list.push(q)
    byTier.set(q.difficulty, list)
  }
  const stocked = LADDER.filter((t) => byTier.get(t)?.length)
  if (!stocked.length) return []
  const first = byTier.get(stocked[0])![0]
  const up = stocked[1] ? byTier.get(stocked[1])![0] : byTier.get(stocked[0])![1]
  return up && up.id !== first.id ? [first, up] : [first]
}

function Example({ q, n }: { q: Question; n: number }) {
  const [open, setOpen] = useState(false)
  const figures = q.figures?.length ? q.figures : q.figure ? [q.figure] : []
  const answer = q.format === 'grid' ? (q.keys ?? []).join('  or  ') : q.answer ?? ''
  const why = q.perChoice?.[answer] ?? q.perChoice?.correct ?? q.explanation ?? ''
  const trapKey = Object.keys(q.misconceptions ?? {})[0]
  const trap = trapKey ? q.perChoice?.[trapKey] : ''

  return (
    <article className={`worked-card ${open ? 'open' : ''}`}>
      <div className="worked-head">
        <span className="worked-n">{n}</span>
        <span className={`badge ${q.difficulty.toLowerCase()}`}>
          {difficultyLabel(q.difficulty)}
        </span>
      </div>

      {q.stimulus && (
        <div className="worked-stim"
          dangerouslySetInnerHTML={{ __html: renderStimulus(q.stimulus) }} />
      )}
      {figures.map((spec, i) => (
        <div className="worked-fig" key={i}
          dangerouslySetInnerHTML={{ __html: renderFigure(spec) }} />
      ))}
      <div className="worked-stem"
        dangerouslySetInnerHTML={{ __html: renderHtml(q.stem) }} />

      {q.choices?.length ? (
        <ol className="worked-choices">
          {q.choices.map((c, i) => (
            <li key={i} className={open && letter(i) === answer ? 'right' : ''}>
              <span className="worked-letter">{letter(i)}</span>
              <span dangerouslySetInnerHTML={{ __html: renderHtml(c) }} />
            </li>
          ))}
        </ol>
      ) : null}

      {open ? (
        <div className="worked-why">
          <h4>{answer ? `The answer is ${answer}` : 'The working'}</h4>
          {why && <div dangerouslySetInnerHTML={{ __html: renderHtml(why) }} />}
          {trap && (
            <div className="worked-trap">
              <h4>The wrong turn this one is set for</h4>
              <div dangerouslySetInnerHTML={{ __html: renderHtml(trap) }} />
            </div>
          )}
          <button className="btn-sm" onClick={() => setOpen(false)}>
            Fold it back up
          </button>
        </div>
      ) : (
        <button className="btn-sm worked-open" onClick={() => setOpen(true)}>
          Show the working
        </button>
      )}
    </article>
  )
}

function letter(i: number): string {
  return 'ABCDEFGH'[i] ?? String(i + 1)
}
