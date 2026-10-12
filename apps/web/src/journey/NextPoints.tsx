import { useEffect, useMemo, useState } from 'react'
import type { Exam } from '../exams/types'
import { examSpec } from '../exams/registry'
import { progress } from '../practice/mastery'
import { loadIndex } from '../lib/bank'
import { scoreGaps, gapLine, type SubtypeCount, type Gap } from './gaps'

/**
 * The ranked list of what is costing this student marks.
 *
 * Deliberately short. Twenty gaps is the score report again - true, complete
 * and useless on a Tuesday evening. Five is a week of work.
 */
const SHOW = 5

export function NextPoints({ exam, onOpen }: {
  exam: Exam
  onOpen?: (subtype: string) => void
}) {
  const [counts, setCounts] = useState<Record<string, SubtypeCount> | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const [left, setLeft] = useState<Record<string, number>>({})
  const [all, setAll] = useState(false)

  useEffect(() => {
    let live = true
    void fetch(`${import.meta.env.BASE_URL}data/subtype_counts.json`)
      .then((r) => r.json())
      .then((b) => live && setCounts(b.subtypes ?? b))
      .catch(() => undefined)
    void loadIndex(exam).then((bank) => {
      if (!live) return
      const n: Record<string, string> = {}
      const l: Record<string, number> = {}
      for (const q of bank) {
        if (!q.subtype) continue
        if (!n[q.subtype]) n[q.subtype] = q.subtypeName || q.subtype
        l[q.subtype] = (l[q.subtype] ?? 0) + 1
      }
      setNames(n)
      setLeft(l)
    })
    return () => { live = false }
  }, [exam])

  const report = useMemo(() => {
    if (!counts) return null
    return scoreGaps(exam, examSpec(exam), progress().attempts, counts, names, left)
  }, [exam, counts, names, left])

  if (!report) return null

  const solid = report.gaps.filter((g) => !g.thin && g.missedPerTest > 0)
  const thin = report.gaps.filter((g) => g.thin)

  if (!solid.length) {
    return (
      <section className="nextpts">
        <h2>Your next points</h2>
        <p className="tiny muted">
          {report.gaps.length === 0
            ? 'Nothing measured yet. Answer a round and this fills in.'
            : `Not enough evidence yet — a recognition needs about five `
              + `attempts before a percentage means anything. ${thin.length} `
              + `started, ${report.untested} not yet opened.`}
        </p>
      </section>
    )
  }

  const shown = all ? solid : solid.slice(0, SHOW)
  return (
    <section className="nextpts">
      <div className="spread">
        <h2>Your next points</h2>
        <span className="nextpts-head" title="Estimated, assuming the section scales evenly">
          about {Math.round(report.headroom)} points on the table
        </span>
      </div>
      <p className="tiny muted" style={{ marginTop: -4 }}>
        Ranked by questions missed on a real test &mdash; how often the exam
        asks it, times how often you get it wrong. The point figures are an
        estimate; the ranking is not.
      </p>

      <ol className="gaplist">
        {shown.map((g) => <GapRow key={g.subtype} g={g} onOpen={onOpen} />)}
      </ol>

      {solid.length > SHOW && (
        <button className="btn-sm" onClick={() => setAll(!all)}>
          {all ? 'Show the top five' : `All ${solid.length} costing you marks`}
        </button>
      )}

      {(thin.length > 0 || report.untested > 0) && (
        <p className="tiny muted" style={{ marginTop: 10 }}>
          {thin.length} more started but under five attempts, and{' '}
          {report.untested} never opened. Those are unknown rather than
          strong &mdash; a recognition you have not met cannot be ranked.
        </p>
      )}
    </section>
  )
}

function GapRow({ g, onOpen }: { g: Gap; onOpen?: (subtype: string) => void }) {
  const pct = Math.round(g.accuracy * 100)
  return (
    <li className="gap">
      <div className="gap-main">
        <strong className="gap-t">{g.name}</strong>
        <span className="gap-d">{gapLine(g)}</span>
        <span className="gap-bar">
          <i style={{ width: `${pct}%` }} className={pct < 50 ? 'bad' : pct < 75 ? 'mid' : 'ok'} />
        </span>
      </div>
      <div className="gap-side">
        <span className="gap-pts" title="Estimated scaled points">
          ~{Math.round(g.points)}
        </span>
        <span className="gap-pts-l">points</span>
        {onOpen && (
          <button className="btn-sm" onClick={() => onOpen(g.subtype)}>
            Work on it
          </button>
        )}
      </div>
    </li>
  )
}
