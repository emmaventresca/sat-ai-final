import { useMemo, useState } from 'react'
import type { Exam } from '../exams/types'
import { errorLog, byTopic, open as openErrors } from '../errors/log'
import { progress } from '../practice/mastery'
import { saveAssignment } from './assignments'

/**
 * Set a student their own mistakes as homework.
 *
 * The most useful assignment available, and the one a teacher could not make
 * before: not "twenty more Percentages questions" but "the four you got
 * wrong, again". Everything here is already on the student's error log - this
 * only turns it into something with a due date on it.
 *
 * It assigns OPEN errors only. A question they have already come back and
 * fixed is not homework, and putting it in the list would teach them that
 * fixing something does not get it off the list.
 */
export function AssignErrors({
  studentId, exam, names, onDone,
}: {
  studentId: string
  exam: Exam
  names: Record<string, string>
  onDone: () => void
}) {
  const log = useMemo(
    () => errorLog(progress().attempts, exam), [exam],
  )
  const still = openErrors(log)
  const topics = useMemo(() => byTopic(log, names), [log, names])
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(topics.filter((t) => t.open).map((t) => t.key)),
  )
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  const chosen = still.filter((e) => picked.has(`${e.skill}|${e.subtype ?? ''}`))

  function toggle(key: string) {
    setPicked((was) => {
      const next = new Set(was)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function assign() {
    if (!chosen.length) return
    saveAssignment({
      studentId,
      exam,
      title: `Fix ${chosen.length} open mistake${chosen.length === 1 ? '' : 's'}`,
      note: note.trim() || undefined,
      items: chosen.map((e) => ({
        id: `err-${e.questionId}`,
        kind: 'question' as const,
        questionId: e.questionId,
        // Named by recognition rather than by id, so the student's homework
        // list reads like work rather than like a database.
        title: names[e.subtype ?? ''] ?? e.subtype ?? e.skill,
        required: true,
      })),
    })
    setSaved(true)
    setTimeout(onDone, 900)
  }

  if (!still.length) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Nothing open</h3>
        <p className="small muted" style={{ margin: 0 }}>
          Every mistake on record has been re-solved. There is nothing here to
          set.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Set their own mistakes</h3>
      <p className="small">
        {still.length} still open. Pick the recognitions worth revisiting
        &mdash; already-fixed questions are left out on purpose.
      </p>

      <div className="err-topics" style={{ marginTop: 12 }}>
        {topics.filter((t) => t.open > 0).map((t) => (
          <label className={`err-pick ${picked.has(t.key) ? 'on' : ''}`} key={t.key}>
            <input type="checkbox" checked={picked.has(t.key)}
              onChange={() => toggle(t.key)} />
            <span className="et-body">
              <span className="et-t">{t.name}</span>
              <span className="et-d">{t.skill}</span>
            </span>
            <b className="et-open">{t.open}</b>
          </label>
        ))}
      </div>

      <label className="login-f" style={{ marginTop: 14 }}>
        <span>A line for them (optional)</span>
        <input value={note} placeholder="Read your note before you re-try each one."
          onChange={(e) => setNote(e.target.value)} />
      </label>

      <button className="btn-primary" disabled={!chosen.length || saved}
        onClick={assign}>
        {saved ? 'Assigned' : `Assign ${chosen.length} question${chosen.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}
