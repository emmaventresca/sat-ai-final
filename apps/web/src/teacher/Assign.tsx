import { useEffect, useMemo, useState } from 'react'
import { EXAM_IDS, examSpec } from '../exams/registry'
import type { Exam, Question, Tier } from '../exams/types'
import { loadBank } from '../lib/bank'
import { difficultyLabel } from '../lesson/types'
import { addStudent, roster, setAccess, type Student } from './roster'
import { assignmentsFor, progressFor, saveAssignment, type AssignmentItem } from './assignments'
import { makeWorksheet } from './worksheetApi'

/**
 * Assign from either bank, to one student, without ever mixing the two.
 *
 * The exam is chosen first and everything below it is scoped to that bank -
 * the question picker, the worksheet, the recognitions in the filter. That
 * is not a nicety: an assignment holding SAT and ACT ids would be
 * unanswerable, since the student practises from one bank and half the ids
 * would simply not be there.
 *
 * A student only offers the exams they are actually sitting. A teacher who
 * has to remember which of their students is an ACT student is a teacher who
 * will eventually assign the wrong one.
 */
export function Assign() {
  const [students, setStudents] = useState<Student[]>(roster())
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? '')
  const [exam, setExam] = useState<Exam>('sat')
  const [bank, setBank] = useState<Question[]>([])
  const [subtype, setSubtype] = useState<string>('')
  const [tier, setTier] = useState<Tier | ''>('')
  const [chosen, setChosen] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [links, setLinks] = useState<{ title: string; url: string }[]>([])
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [days, setDays] = useState(7)
  const [note, setNote] = useState<string | null>(null)
  const [making, setMaking] = useState(false)

  const student = students.find((s) => s.id === studentId)
  const allowed = EXAM_IDS.filter((id) => student?.access[id])

  useEffect(() => {
    let live = true
    void loadBank(exam).then((b) => live && setBank(b))
    return () => { live = false }
  }, [exam])

  // Picking is scoped to the chosen exam, so clearing on a switch is not
  // tidiness - a leftover SAT id in an ACT assignment is the exact failure
  // this screen exists to prevent.
  useEffect(() => { setChosen([]); setSubtype(''); setTier('') }, [exam])

  const subtypes = useMemo(() => {
    const seen = new Map<string, string>()
    for (const q of bank) {
      if (q.subtype && !seen.has(q.subtype)) {
        seen.set(q.subtype, q.subtypeName || q.subtype)
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [bank])

  const matching = useMemo(
    () => bank.filter((q) =>
      (!subtype || q.subtype === subtype) && (!tier || q.difficulty === tier)),
    [bank, subtype, tier],
  )

  function toggle(id: string) {
    setChosen((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function buildWorksheet() {
    if (!chosen.length) return
    setMaking(true)
    setNote(null)
    try {
      const packet = await makeWorksheet(exam, chosen, title || 'Practice')
      openPrintable(packet.worksheet_html, `${title || 'Worksheet'} — student`)
      openPrintable(packet.answer_key_html, `${title || 'Worksheet'} — answer key`)
      setNote(`Worksheet and answer key opened for ${packet.question_count} questions.`)
    } catch (e) {
      setNote(String((e as Error).message ?? e))
    } finally {
      setMaking(false)
    }
  }

  function assign() {
    if (!student || !chosen.length) return
    const items: AssignmentItem[] = chosen.map((id, i) => ({
      id: `i-${i}`,
      kind: 'question',
      questionId: id,
      // Spread across the week rather than dumped on day one; "a healthy
      // week's worth" is not the same as "everything on Monday".
      dayIndex: Math.floor((i / chosen.length) * Math.max(1, days - 2)),
      required: true,
    }))
    links.forEach((l, i) => items.push({
      id: `l-${i}`, kind: 'link', url: l.url, title: l.title,
      dayIndex: Math.min(days - 1, i), required: true,
    }))
    const due = new Date()
    due.setDate(due.getDate() + days)
    saveAssignment({
      studentId: student.id, exam,
      title: title || `${examSpec(exam).label} practice`,
      note: undefined, dueAt: due.toISOString(), items,
    })
    setNote(`Assigned ${items.length} item${items.length === 1 ? '' : 's'} to ${student.name}.`)
    setChosen([]); setLinks([])
    setStudents(roster())
  }

  return (
    <div className="wrap wide">
      <div className="top">
        <div><h1>Assign</h1><p className="who">Either bank, one student at a time</p></div>
      </div>

      <div className="card">
        <div className="row tight">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Choose a student…</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-sm" onClick={() => {
            const name = prompt('Student name')
            if (!name) return
            const made = addStudent(name)
            setStudents(roster()); setStudentId(made.id)
          }}>Add student</button>
        </div>

        {student && (
          <div className="row tight" style={{ marginTop: 10 }}>
            <span className="tiny muted">Sitting:</span>
            {EXAM_IDS.map((id) => (
              <label key={id} className="tiny" style={{ marginRight: 10 }}>
                <input type="checkbox" checked={student.access[id]}
                  onChange={(e) => {
                    setAccess(student.id, id, e.target.checked)
                    setStudents(roster())
                  }} /> {examSpec(id).label}
              </label>
            ))}
          </div>
        )}
      </div>

      {!allowed.length && student && (
        <p className="small" style={{ color: 'var(--flag)' }}>
          {student.name} is not down for either test yet. Tick one above.
        </p>
      )}

      {allowed.length > 0 && (
        <>
          <div className="row tight" style={{ margin: '14px 0' }}>
            {allowed.map((id) => (
              <button key={id} className={id === exam ? 'btn-primary' : 'btn-sm'}
                onClick={() => setExam(id)}>{examSpec(id).label}</button>
            ))}
          </div>

          <div className="card">
            <div className="row tight">
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
                <option value="">Every question type</option>
                {subtypes.map(([slug, name]) =>
                  <option key={slug} value={slug}>{name}</option>)}
              </select>
              <select value={tier} onChange={(e) => setTier(e.target.value as Tier | '')}>
                <option value="">Every level</option>
                {examSpec(exam).tiers.map((t) =>
                  <option key={t} value={t}>{difficultyLabel(t)}</option>)}
              </select>
              <span className="tiny muted">{matching.length} match</span>
            </div>

            <ol className="peek" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {matching.slice(0, 60).map((q) => (
                <li key={q.id}>
                  <label>
                    <input type="checkbox" checked={chosen.includes(q.id)}
                      onChange={() => toggle(q.id)} />{' '}
                    <span className={`badge ${q.difficulty.toLowerCase()}`}>
                      {difficultyLabel(q.difficulty)}
                    </span>{' '}
                    {q.stem.replace(/\$[^$]*\$/g, '…').slice(0, 96)}
                  </label>
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <strong>Reading, videos, anything off the platform</strong>
            <div className="row tight" style={{ marginTop: 8 }}>
              <input placeholder="Khan Academy: systems of equations"
                value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
              <input placeholder="https://…" value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)} />
              <button className="btn-sm" onClick={() => {
                if (!linkUrl.trim()) return
                setLinks([...links, { title: linkTitle || linkUrl, url: linkUrl }])
                setLinkTitle(''); setLinkUrl('')
              }}>Add</button>
            </div>
            {links.length > 0 && (
              <ul className="peek">
                {links.map((l, i) => <li key={i}>{l.title}</li>)}
              </ul>
            )}
            <p className="tiny muted" style={{ marginTop: 8 }}>
              We cannot see whether a link was opened, so the student ticks
              these off themselves. Platform questions are counted from their
              attempts.
            </p>
          </div>

          <div className="card">
            <div className="row tight">
              <input placeholder="Title for this week" value={title}
                onChange={(e) => setTitle(e.target.value)} />
              <label className="tiny">Due in
                <input type="number" min={1} max={28} value={days}
                  style={{ width: 64, marginLeft: 6 }}
                  onChange={(e) => setDays(Number(e.target.value) || 7)} /> days
              </label>
            </div>
            <div className="row tight" style={{ marginTop: 10 }}>
              <button className="btn-primary" disabled={!student || !chosen.length}
                onClick={assign}>
                Assign {chosen.length + links.length} item
                {chosen.length + links.length === 1 ? '' : 's'}
              </button>
              <button className="btn-sm" disabled={!chosen.length || making}
                onClick={() => void buildWorksheet()}>
                {making ? 'Building…' : 'Worksheet + answer key'}
              </button>
            </div>
            {note && <p className="small" style={{ marginTop: 10 }}>{note}</p>}
          </div>

          {student && <Assigned studentId={student.id} />}
        </>
      )}
    </div>
  )
}

/** What this student already has, and how far they have got. */
function Assigned({ studentId }: { studentId: string }) {
  const list = assignmentsFor(studentId)
  if (!list.length) return null
  return (
    <>
      <h2>Already assigned</h2>
      {list.map((a) => {
        const p = progressFor(a, [], {})
        return (
          <div className="card" key={a.id}>
            <div className="spread">
              <div>
                <strong>{a.title}</strong>
                <div className="tiny muted">
                  {examSpec(a.exam).label} · {a.items.length} items
                  {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <span className="badge on">{p.done}/{p.total}</span>
            </div>
            <div className="bar thin"><i style={{ width: `${p.percent}%` }} /></div>
          </div>
        )
      })}
    </>
  )
}

/** Open a generated document in its own tab, ready to print. */
function openPrintable(html: string, title: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><title>${title}</title>${html}`)
  w.document.close()
}
