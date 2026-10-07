import { useCallback, useEffect, useMemo, useState } from 'react'
import { examSpec } from '../exams/registry'
import type { Question } from '../exams/types'
import { difficultyLabel } from '../lesson/types'
import { loadBank } from '../lib/bank'
import { QuestionCard } from '../practice/QuestionCard'
import { progress, record } from '../practice/mastery'
import {
  assignmentsFor, progressFor,
  type Assignment, type AssignmentItem, type Attempt, type ItemStatus,
} from '../teacher/assignments'
import { roster } from '../teacher/roster'
import { selfReports, setSelfReport, type SelfReports } from './selfReports'

/**
 * What has been set, and what is left.
 *
 * Nothing on this screen is ticked by hand except the things that genuinely
 * cannot be observed. A platform question is done because the student
 * answered it and mastery recorded the attempt - so the only way to clear it
 * is to do it, and the teacher's view and the student's view are reading the
 * same evidence rather than two tallies that can drift apart.
 *
 * An assignment is a week, not a sitting, so the items open grouped by day.
 * A flat list of twenty questions reads as one enormous evening; the same
 * twenty under four headings reads as four short ones, which is what was
 * actually set.
 */
export function Homework() {
  // TODO: replace with real auth. There is no sign-in yet, so "me" is simply
  // the first student on the roster - enough to build and demo the screen,
  // and wrong the moment two students share a browser.
  const me = roster()[0]

  const [openId, setOpenId] = useState<string | null>(null)
  const [ticks, setTicks] = useState<SelfReports>(selfReports)
  // Attempts are read from mastery rather than tracked here, so answering a
  // question in another tab still counts. Bumped after every answer.
  const [answered, setAnswered] = useState(0)

  const attempts = useMemo<Attempt[]>(
    () =>
      progress().attempts.map((a) => ({
        questionId: a.questionId,
        // mastery stamps `at`; the completion rule reads `createdAt`.
        createdAt: a.at,
        correct: a.correct,
      })),
    [answered],
  )

  const list = useMemo(() => (me ? assignmentsFor(me.id) : []), [me])
  const open = list.find((a) => a.id === openId) ?? null

  const onAnswered = useCallback(() => setAnswered((n) => n + 1), [])
  const onTick = useCallback((itemId: string, done: boolean) => {
    setTicks(setSelfReport(itemId, done))
  }, [])

  if (!me) {
    return (
      <div className="wrap">
        <h1>Homework</h1>
        <p className="empty">No students on the roster yet.</p>
      </div>
    )
  }

  if (open) {
    return (
      <AssignmentView assignment={open} attempts={attempts} ticks={ticks}
        onBack={() => setOpenId(null)} onAnswered={onAnswered} onTick={onTick} />
    )
  }

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1>Homework</h1>
          <p className="who">{me.name}</p>
        </div>
      </div>

      {!list.length && <p className="empty">Nothing set right now.</p>}

      {list.map((a) => {
        const p = progressFor(a, attempts, ticks)
        return (
          <button key={a.id} className="tile assigned" onClick={() => setOpenId(a.id)}>
            <div className="spread">
              <div>
                <div className="t">{a.title}</div>
                <div className="d">
                  {examSpec(a.exam).label}
                  {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <span className={`badge${p.total && p.done === p.total ? ' on' : ''}`}>
                {p.done}/{p.total}
              </span>
            </div>
            <div className={`bar thin${p.total && p.done === p.total ? ' good' : ''}`}>
              <i style={{ width: `${p.percent}%` }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AssignmentView({
  assignment, attempts, ticks, onBack, onAnswered, onTick,
}: {
  assignment: Assignment
  attempts: Attempt[]
  ticks: SelfReports
  onBack: () => void
  onAnswered: () => void
  onTick: (itemId: string, done: boolean) => void
}) {
  const [bank, setBank] = useState<Question[] | null>(null)

  useEffect(() => {
    let live = true
    void loadBank(assignment.exam).then((b) => { if (live) setBank(b) })
    return () => { live = false }
  }, [assignment.exam])

  const p = progressFor(assignment, attempts, ticks)
  const byId = new Map(p.statuses.map((s) => [s.item.id, s]))
  const days = groupByDay(assignment.items)
  const finished = p.total > 0 && p.done === p.total

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1>{assignment.title}</h1>
          <p className="who">
            {examSpec(assignment.exam).label}
            {assignment.dueAt
              ? ` · due ${new Date(assignment.dueAt).toLocaleDateString()}`
              : ''}
          </p>
        </div>
        <button className="btn-sm" onClick={onBack}>All homework</button>
      </div>

      <div className="card">
        <div className="spread">
          <strong>{p.done} of {p.total} done</strong>
          <span className={`badge${finished ? ' on' : ''}`}>{p.percent}%</span>
        </div>
        <div className={`bar${finished ? ' good' : ''}`}><i style={{ width: `${p.percent}%` }} /></div>
        {finished && (
          <p className="small" style={{ marginTop: 10 }}>
            That is everything for this one. Nothing left to hand in.
          </p>
        )}
      </div>

      {assignment.note && <p className="small">{assignment.note}</p>}

      {days.map(([day, items]) => (
        <section key={day} style={{ marginTop: 18 }}>
          <h2>Day {day + 1}</h2>
          {items.map((item) => (
            <ItemRow key={item.id} item={item}
              status={byId.get(item.id)} bank={bank}
              onAnswered={onAnswered} onTick={onTick} />
          ))}
        </section>
      ))}
    </div>
  )
}

function ItemRow({
  item, status, bank, onAnswered, onTick,
}: {
  item: AssignmentItem
  status: ItemStatus | undefined
  bank: Question[] | null
  onAnswered: () => void
  onTick: (itemId: string, done: boolean) => void
}) {
  const [showing, setShowing] = useState(false)
  const done = status?.done ?? false

  if (item.kind === 'question') {
    const question = bank?.find((q) => q.id === item.questionId)
    return (
      <div className="card">
        <div className="spread">
          <div>
            <strong>{item.title ?? 'Practice question'}</strong>
            <div className="tiny muted">
              {question ? `${difficultyLabel(question.difficulty)} · ` : ''}
              {done
                ? status?.correct === false
                  ? 'Done — you got this one wrong, worth a second look'
                  : 'Done'
                : item.required ? 'Not done yet' : 'Optional'}
            </div>
          </div>
          {done
            ? <span className="badge on">Done</span>
            : <button className="btn-primary" disabled={!question}
                onClick={() => setShowing(true)}>
                {bank ? 'Answer' : 'Loading…'}
              </button>}
        </div>

        {showing && question && (
          <div style={{ marginTop: 12 }}>
            <QuestionCard question={question}
              onAnswer={(chosen, correct) => {
                // Recording is the whole act: completion is derived from the
                // attempt, so there is nothing else to mark.
                record(question, chosen, correct)
                onAnswered()
              }} />
          </div>
        )}

        {bank && !question && (
          <p className="tiny muted">
            This question is not in the current bank — tell your teacher.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="spread">
        <div>
          {item.url
            ? <a href={item.url} target="_blank" rel="noreferrer">
                {item.title ?? item.url}
              </a>
            : <strong>{item.title ?? 'Worksheet'}</strong>}
          <div className="tiny muted">
            {item.kind === 'link' ? 'Off the platform' : 'Printed worksheet'}
            {item.expectedMinutes ? ` · about ${item.expectedMinutes} min` : ''}
            {item.required ? '' : ' · optional'}
          </div>
        </div>
        <label className="tiny" style={{ marginBottom: 0 }}>
          <input type="checkbox" checked={done}
            onChange={(e) => onTick(item.id, e.target.checked)} /> Mark as done
        </label>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        We cannot see this one, so it counts on your word.
      </p>
    </div>
  )
}

/** Day order, with anything undated treated as day one. */
function groupByDay(items: AssignmentItem[]): [number, AssignmentItem[]][] {
  const days = new Map<number, AssignmentItem[]>()
  for (const item of items) {
    const day = item.dayIndex ?? 0
    const bucket = days.get(day)
    if (bucket) bucket.push(item)
    else days.set(day, [item])
  }
  return [...days.entries()].sort((a, b) => a[0] - b[0])
}
