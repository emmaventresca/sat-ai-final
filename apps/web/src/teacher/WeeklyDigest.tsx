import { useMemo, useState } from 'react'
import type { Exam } from '../exams/types'
import { progress } from '../practice/mastery'
import { digestFor, headline, type Movement } from './digest'

/**
 * What changed this week, at the top of the student's page.
 *
 * Placed first on purpose. Everything below it describes the whole term and
 * barely moves week to week, which is true and useless when you are deciding
 * what to do in the next session. This is the part a teacher reads standing
 * up, and it is written to be read in about fifteen seconds.
 *
 * It says "not enough to tell" rather than inventing a trend, and it says a
 * quiet week out loud. A report that always finds something to say is one
 * nobody checks against reality twice.
 */
export function WeeklyDigest({ exam, names }: {
  exam: Exam
  names: Record<string, string>
}) {
  const [days, setDays] = useState(7)
  const d = useMemo(
    () => digestFor(exam, progress().attempts, names, days),
    [exam, names, days])

  return (
    <section className={`digest${d.quiet ? ' quiet' : ''}`}>
      <div className="digest-top">
        <div>
          <h3>What changed{days === 7 ? ' this week' : ` in ${days} days`}</h3>
          <p className="digest-head">{headline(d)}</p>
        </div>
        <div className="row tight">
          {[7, 14, 30].map((n) => (
            <button key={n} className={`btn-sm${days === n ? ' on' : ''}`}
              onClick={() => setDays(n)}>{n}d</button>
          ))}
        </div>
      </div>

      {d.quiet ? (
        <p className="digest-none">
          {d.answeredBefore > 0
            ? 'The thing to ask about is why it stopped.'
            : 'Nothing to report until they start.'}
        </p>
      ) : (
        <div className="digest-grid">
          <Stat n={d.answered} of="answered"
            note={d.answeredBefore
              ? `${sign(d.answered - d.answeredBefore)} on last week`
              : undefined} />
          <Stat n={d.accuracy === null ? '—' : `${Math.round(d.accuracy * 100)}%`}
            of="accuracy"
            note={d.accuracyBefore !== null && d.accuracy !== null
              ? `${sign(Math.round((d.accuracy - d.accuracyBefore) * 100))} points`
              : 'no week before'} />
          <Stat n={d.minutes} of="minutes" />
          <Stat n={d.unfixed} of="still wrong"
            note={d.unfixed ? 'never since answered right' : 'nothing outstanding'} />
        </div>
      )}

      {d.slipped.length > 0 && (
        <Moves title="Went backwards" tone="down" rows={d.slipped} />
      )}
      {d.improved.length > 0 && (
        <Moves title="Moved" tone="up" rows={d.improved} />
      )}

      {d.habits.length > 0 && (
        <div className="digest-block">
          <h4>Errors on the rise</h4>
          <ul className="digest-habits">
            {d.habits.slice(0, 3).map((h) => (
              <li key={h.slug}>
                <strong>{readable(h.slug)}</strong>
                <span>
                  {h.now}&times; this week
                  {h.before > 0 ? `, ${h.before} the week before` : ', new'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.newlyMet.length > 0 && (
        <p className="digest-new">
          <strong>First time on:</strong> {d.newlyMet.slice(0, 6).join(', ')}
          {d.newlyMet.length > 6 && ` and ${d.newlyMet.length - 6} more`}
        </p>
      )}

      {!d.quiet && !d.improved.length && !d.slipped.length && (
        <p className="digest-none">
          Nothing moved far enough to call it a change. A recognition needs
          four attempts in each week and ten points of movement before it is
          news rather than noise.
        </p>
      )}
    </section>
  )
}

function Moves({ title, tone, rows }: {
  title: string; tone: 'up' | 'down'; rows: Movement[]
}) {
  return (
    <div className="digest-block">
      <h4>{title}</h4>
      <ul className={`digest-moves ${tone}`}>
        {rows.slice(0, 4).map((m) => (
          <li key={m.subtype}>
            <span className="digest-move-n">{m.name}</span>
            <span className="digest-move-d">
              {Math.round(m.before * 100)}% &rarr; {Math.round(m.after * 100)}%
              <em> ({m.beforeSeen} then, {m.afterSeen} now)</em>
            </span>
            <span className="digest-move-x">{sign(Math.round(m.delta))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ n, of, note }: { n: number | string; of: string; note?: string }) {
  return (
    <div className="digest-stat">
      <strong>{n}</strong>
      <span className="digest-stat-l">{of}</span>
      {note && <span className="digest-stat-n">{note}</span>}
    </div>
  )
}

const sign = (n: number) => (n > 0 ? `+${n}` : String(n))

function readable(slug: string): string {
  const s = slug.replace(/[-_]/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
