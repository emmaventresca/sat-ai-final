import { useEffect, useMemo, useState } from 'react'
import type { Exam, Question } from '../exams/types'
import { EXAM_IDS, examSpec } from '../exams/registry'
import { loadBank } from '../lib/bank'
import { difficultyLabel } from '../lesson/types'
import { duration, metricsFor } from './metrics'
import type { Student } from './roster'
import { examTone } from './tone'

/**
 * One student, in detail.
 *
 * Accuracy alone is the least useful number on this page, so it is not the
 * only one: volume, time, pace, consistency and where the misses cluster all
 * sit beside it. They were already in the attempt log and nothing was
 * reading them.
 */
export function StudentDetail({ student }: { student: Student }) {
  const sitting = EXAM_IDS.filter((id) => student.access[id])
  const [exam, setExam] = useState<Exam>(sitting[0] ?? 'sat')
  const [names, setNames] = useState<Record<string, string>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    void loadBank(exam).then((bank: Question[]) => {
      if (!live) return
      const map: Record<string, string> = {}
      for (const q of bank) {
        if (q.subtype && !map[q.subtype]) map[q.subtype] = q.subtypeName || q.subtype
      }
      setNames(map)
    })
    void fetch(`${import.meta.env.BASE_URL}data/misconceptions.json`)
      .then((r) => r.json())
      .then((b: { families?: { slug: string; label: string }[] }) => {
        if (live) setLabels(Object.fromEntries((b.families ?? []).map((f) => [f.slug, f.label])))
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  const m = useMemo(() => metricsFor(exam, names), [exam, names])
  const trend = m.prev7 ? Math.round(((m.last7 - m.prev7) / m.prev7) * 100) : null

  return (
    <div className={`brush ${examTone(student.access)}`}>
      <div className="spread">
        <div>
          <h2 style={{ marginTop: 0 }}>{student.name}</h2>
          <p className="tiny muted">
            Sitting {sitting.map((id) => examSpec(id).label).join(' and ') || 'nothing yet'}
          </p>
        </div>
        {sitting.length > 1 && (
          <div className="row tight">
            {sitting.map((id) => (
              <button key={id} className={id === exam ? 'btn-primary' : 'btn-sm'}
                onClick={() => setExam(id)}>{examSpec(id).label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="stat-row">
        <Stat n={m.answered} of="questions answered" />
        <Stat n={m.accuracy === null ? '—' : `${Math.round(m.accuracy * 100)}%`} of="correct" />
        <Stat n={duration(m.seconds || null)} of="time on question" />
        <Stat n={duration(m.medianSeconds)} of="typical question" />
        <Stat n={m.activeDays} of="days practised" />
        <Stat n={m.last7} of="this week"
          note={trend === null ? undefined : `${trend > 0 ? '+' : ''}${trend}% on last`} />
      </div>

      {m.answered === 0 ? (
        <p className="small muted">Nothing practised on this test yet.</p>
      ) : (
        <>
          <h3>By level</h3>
          <table><thead><tr>
            <th>Level</th><th className="num">Answered</th><th className="num">Correct</th><th>Accuracy</th>
          </tr></thead><tbody>
            {Object.entries(m.byTier)
              .sort(([a], [b]) => 'FEMHX'.indexOf(a) - 'FEMHX'.indexOf(b))
              .map(([tier, s]) => (
                <tr key={tier}>
                  <td><span className={`badge ${tier.toLowerCase()}`}>
                    {difficultyLabel(tier as never)}</span></td>
                  <td className="num">{s.seen}</td>
                  <td className="num">{s.correct}</td>
                  <td><div className="bar thin" style={{ margin: 0 }}>
                    <i style={{ width: `${(s.correct / s.seen) * 100}%` }} /></div></td>
                </tr>
              ))}
          </tbody></table>

          {m.weakest.length > 0 && (
            <>
              <h3>What they are losing</h3>
              <table><thead><tr>
                <th>Question type</th><th className="num">Seen</th><th className="num">Accuracy</th>
              </tr></thead><tbody>
                {m.weakest.map((w) => (
                  <tr key={w.subtype}>
                    <td>{w.name}</td>
                    <td className="num">{w.seen}</td>
                    <td className="num">{Math.round(w.accuracy * 100)}%</td>
                  </tr>
                ))}
              </tbody></table>
            </>
          )}

          {m.errors.length > 0 && (
            <>
              <h3>How they go wrong</h3>
              {m.errors.map((e) => (
                <div className="fam" key={e.slug}>
                  <div className="fam-h">
                    <strong>{readable(e.slug)}</strong>
                    <span className="badge on">{e.count}&times;</span>
                  </div>
                  {labels[e.slug] && <p className="small">{labels[e.slug]}</p>}
                </div>
              ))}
            </>
          )}

          <details className="tableview">
            <summary>The last {m.recent.length} questions they answered</summary>
            <table><thead><tr>
              <th>When</th><th>Question type</th><th>Level</th><th>Result</th><th className="num">Time</th>
            </tr></thead><tbody>
              {m.recent.map((a, i) => (
                <tr key={`${a.questionId}-${i}`}>
                  <td className="muted small">{new Date(a.at).toLocaleString()}</td>
                  <td>{a.subtype ? names[a.subtype] ?? a.subtype : a.skill}</td>
                  <td><span className={`badge ${a.difficulty.toLowerCase()}`}>
                    {a.difficulty}</span></td>
                  <td>{a.correct
                    ? <span className="badge e">correct</span>
                    : <span className="badge on">{readable(a.misconception ?? 'missed')}</span>}</td>
                  <td className="num">{a.ms ? duration(Math.round(a.ms / 1000)) : '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </details>
        </>
      )}
    </div>
  )
}

function Stat({ n, of, note }: { n: number | string; of: string; note?: string }) {
  return (
    <div className="stat">
      <div className="stat-n">{n}</div>
      <div className="stat-l">{of}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

function readable(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
