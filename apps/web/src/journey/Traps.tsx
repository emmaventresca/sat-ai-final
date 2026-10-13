import { useEffect, useMemo, useState } from 'react'
import type { Exam, Question } from '../exams/types'
import { loadBodies, loadIndex, type QuestionRef } from '../lib/bank'
import { progress, seenIds } from '../practice/mastery'
import { drillFor, traps, type Trap } from './drills'

/**
 * "What you keep doing", and a drill that punishes exactly that.
 *
 * The companion to the gap list: that one says which recognitions are
 * costing marks, this one says which MISTAKE is, across all of them. A
 * student can be losing twenty points to one habit spread over nine topics,
 * which no topic-level report can show.
 */
export function Traps({ exam, onDrill }: {
  exam: Exam
  onDrill: (questions: Question[], label: string) => void
}) {
  const [bank, setBank] = useState<QuestionRef[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/misconceptions.json`)
      .then((r) => r.json())
      .then((b: { families?: { slug: string; name?: string; when?: string }[] }) => {
        if (!live) return
        const m: Record<string, string> = {}
        for (const f of b.families ?? []) m[f.slug] = f.when || f.name || f.slug
        setNames(m)
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  const found = useMemo(
    () => traps(exam, progress().attempts, bank), [exam, bank])

  if (!found.length) return null

  async function run(t: Trap) {
    setBusy(t.slug)
    const refs = drillFor(t.slug, bank, seenIds(exam), 8)
    const bodies = await loadBodies(exam, refs.map((r) => r.id))
    setBusy(null)
    if (bodies.length) onDrill(bodies, readable(t.slug))
  }

  return (
    <section className="traps">
      <h2>What you keep doing</h2>
      <p className="tiny muted" style={{ marginTop: -4 }}>
        Not a topic &mdash; a habit. These are the specific wrong moves behind
        your misses, counted across every recognition. A drill mixes topics on
        purpose: the mistake is the thing being practised.
      </p>
      <ul className="trap-list">
        {found.slice(0, 3).map((t) => (
          <li className="trap" key={t.slug}>
            <div className="trap-main">
              <strong className="trap-t">{readable(t.slug)}</strong>
              <span className="trap-d">
                {names[t.slug] ?? 'A recurring wrong move.'}
              </span>
              <span className="trap-n">
                {t.hits} times &middot; {Math.round(t.share * 100)}% of your
                wrong answers &middot; {t.available} questions punish it
              </span>
            </div>
            <button className="btn-primary" disabled={busy !== null}
              onClick={() => void run(t)}>
              {busy === t.slug ? 'Building…' : 'Drill it'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function readable(slug: string): string {
  const s = slug.replace(/[-_]/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
