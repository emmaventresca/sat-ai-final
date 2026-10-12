import { useEffect, useMemo, useState } from 'react'
import { EXAM_IDS, examSpec } from '../exams/registry'
import type { Exam, Question, Tier } from '../exams/types'
import { loadBodies, loadIndex, type QuestionRef } from '../lib/bank'
import { difficultyLabel } from '../lesson/types'
import { addStudent, roster, setAccess, type Student } from './roster'
import { buildJourney, type SkillMeta } from '../journey/map'
import { QuestionPeek } from './QuestionPeek'
import {
  assignmentsFor, progressFor, saveAssignment,
  type Assignment, type AssignmentItem,
} from './assignments'
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
  const [bank, setBank] = useState<QuestionRef[]>([])
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
  const [skills, setSkills] = useState<SkillMeta[]>([])
  const [phrasing, setPhrasing] = useState('')

  const student = students.find((s) => s.id === studentId)
  const allowed = EXAM_IDS.filter((id) => student?.access[id])

  /**
   * Questions this student has already been set.
   *
   * Assigning the same question twice is worse than it sounds: the second
   * copy arrives already complete, because completion counts any attempt
   * after the assignment was made and the first one produced exactly that.
   * So it reads as homework they have done without doing it, and the
   * teacher's progress number is wrong in the flattering direction.
   *
   * Scoped to the student, not globally - two students should get the same
   * good question, and often should get it in the same week.
   */
  const alreadySet = useMemo(() => {
    const out = new Set<string>()
    if (!student) return out
    for (const a of assignmentsFor(student.id)) {
      for (const item of a.items) {
        if (item.questionId) out.add(item.questionId)
      }
    }
    return out
  }, [student, note])

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then((r) => r.json())
      .then((b: { skills?: SkillMeta[] }) => live && setSkills(b.skills ?? []))
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  // Picking is scoped to the chosen exam, so clearing on a switch is not
  // tidiness - a leftover SAT id in an ACT assignment is the exact failure
  // this screen exists to prevent.
  useEffect(() => { setChosen([]); setSubtype(''); setTier('') }, [exam])

  /**
   * The question types, grouped the way the student's map groups them.
   *
   * A flat select of 183 is not a chooser, it is a wall - you cannot find
   * anything in it without already knowing the exact name. The same list
   * under its chapter and leg headings is scannable, and it matches what the
   * student sees, so "the circle ones" means the same thing on both sides.
   */
  const grouped = useMemo(() => {
    if (!bank.length) return []
    // Flattened to one group per skill, labelled with the whole path -
    // section, domain, skill - because an optgroup can only nest one deep
    // and "Algebra · Linear equations" alone does not say which test
    // section it is in.
    return buildJourney(exam, bank, skills).flatMap((region) =>
      region.chapters.flatMap((chapter) =>
        chapter.legs.map((leg) => ({
          label: `${region.name} · ${chapter.name} · ${leg.name}`,
          stages: leg.stages.map((st) => [st.subtype, st.name, st.total] as const),
        }))))
  }, [exam, bank, skills])

  const [showUsed, setShowUsed] = useState(false)
  const [peek, setPeek] = useState<Question | null>(null)
  const [peekId, setPeekId] = useState<string | null>(null)

  const eligible = useMemo(
    () => bank.filter((q) =>
      (!subtype || q.subtype === subtype)
      && (!tier || q.difficulty === tier)
      && (!phrasing || q.phrasing === phrasing)),
    [bank, subtype, tier, phrasing],
  )
  const matching = useMemo(
    () => (showUsed ? eligible : eligible.filter((q) => !alreadySet.has(q.id))),
    [eligible, showUsed, alreadySet],
  )
  const hidden = eligible.length - matching.length

  /** The wording families this bank actually contains. */
  const phrasings = useMemo(() => {
    const seen = new Map<string, number>()
    for (const q of bank) {
      if (q.phrasing) seen.set(q.phrasing, (seen.get(q.phrasing) ?? 0) + 1)
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1])
  }, [bank])

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
                {grouped.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.stages.map(([slug, name, n]) => (
                      <option key={slug} value={slug}>{name} ({n})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select value={tier} onChange={(e) => setTier(e.target.value as Tier | '')}>
                <option value="">Every level</option>
                {examSpec(exam).tiers.map((t) =>
                  <option key={t} value={t}>{difficultyLabel(t)}</option>)}
              </select>
              <select value={phrasing} onChange={(e) => setPhrasing(e.target.value)}>
                <option value="">Any wording</option>
                {phrasings.map(([fam, n]) => (
                  <option key={fam} value={fam}>{readableFamily(fam)} ({n})</option>
                ))}
              </select>
              <span className="tiny muted">
                {matching.length} to choose from
                {hidden > 0 && !showUsed && `, ${hidden} already set`}
              </span>
            </div>

            {(hidden > 0 || showUsed) && (
              /* A button rather than a tick box. This is a mode - "show me
                 what I have already given them" - and it was a checkbox so
                 small and so quiet that it read as a stray mark. */
              <div style={{ marginTop: 10 }}>
                <button className={`btn-sm${showUsed ? ' on' : ''}`}
                  aria-pressed={showUsed}
                  onClick={() => setShowUsed(!showUsed)}>
                  {showUsed
                    ? 'Hide questions already assigned'
                    : `Questions assigned in the past to ${student?.name ?? 'this student'}`
                      + ` (${hidden})`}
                </button>
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  {showUsed
                    ? 'These are already set. Assigning one again is a'
                      + ' deliberate re-test, not an accident.'
                    : 'Hidden so the same question is not set twice by mistake.'}
                </p>
              </div>
            )}

            <ol className="peek" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {matching.slice(0, 60).map((q) => (
                <li key={q.id}>
                  <span className={`pick-row${alreadySet.has(q.id) ? ' muted' : ''}`}>
                    <input type="checkbox" checked={chosen.includes(q.id)}
                      onChange={() => toggle(q.id)}
                      aria-label={`Select ${q.id}`} />{' '}
                    {alreadySet.has(q.id) && (
                      <span className="badge" title="already assigned">set</span>
                    )}{' '}
                    <span className={`badge ${q.difficulty.toLowerCase()}`}>
                      {difficultyLabel(q.difficulty)}
                    </span>{' '}
                    {/* The stem opens the question rather than ticking it.
                        Assigning from one line is assigning blind: two
                        questions in the same recognition at the same level
                        can be thirty seconds and four minutes apart. */}
                    <button className={`peek-open${peekId === q.id ? ' on' : ''}`}
                      onClick={() => {
                        if (peekId === q.id) { setPeekId(null); setPeek(null); return }
                        // One question's body, fetched when it is opened.
                        setPeekId(q.id)
                        void loadBodies(exam, [q.id]).then(([body]) => {
                          if (body) setPeek(body)
                        })
                      }}>
                      {q.teaser}
                    </button>
                  </span>
                </li>
              ))}
            </ol>

            {/* Outside the scrolling list on purpose. A whole question inside
                a 280px scroll box is a question nobody can read. */}
            {peek && peekId === peek.id && (
              <QuestionPeek question={peek}
                onClose={() => { setPeek(null); setPeekId(null) }} />
            )}
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

          {student && (
            <Assigned student={student} bank={bank}
              onChanged={() => setNote(`Re-assigned to ${student.name}.`)} />
          )}
        </>
      )}
    </div>
  )
}

/**
 * Everything this student has been set, and how far they got.
 *
 * Re-assigning is a button rather than a thing that happens by accident. The
 * default is that a question you have already set does not come back - a
 * repeat arrives already complete, because completion counts any attempt
 * after the assignment was made and the first copy produced exactly that, so
 * it reads as homework they did without doing it. But deliberately setting
 * the same questions again is a real move: it is how you check a reteach
 * landed, and the only way to tell the two apart is who decided.
 */
function Assigned({
  student, bank, onChanged,
}: {
  student: Student
  bank: QuestionRef[]
  onChanged: () => void
}) {
  const list = assignmentsFor(student.id)
  const [openId, setOpenId] = useState<string | null>(null)
  if (!list.length) return null

  const byId = new Map(bank.map((q) => [q.id, q]))

  function reassign(a: Assignment, questionIds: string[]) {
    if (!questionIds.length) return
    saveAssignment({
      studentId: a.studentId,
      exam: a.exam,
      title: `${a.title} — again`,
      dueAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      items: questionIds.map((id, i) => ({
        id: `r-${i}`, kind: 'question', questionId: id,
        dayIndex: Math.floor(i / 3), required: true,
      })),
    })
    onChanged()
  }

  return (
    <>
      <h2>Already assigned</h2>
      {list.map((a) => {
        const p = progressFor(a, [], {})
        const questions = a.items
          .map((i) => i.questionId)
          .filter((id): id is string => Boolean(id))
        const open = openId === a.id
        return (
          <div className="card" key={a.id}>
            <div className="spread">
              <div>
                <strong>{a.title}</strong>
                <div className="tiny muted">
                  {examSpec(a.exam).label} &middot; {a.items.length} items
                  &middot; set {new Date(a.assignedAt).toLocaleDateString()}
                  {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="row tight">
                <span className="badge on">{p.done}/{p.total}</span>
                <button className="btn-sm"
                  onClick={() => setOpenId(open ? null : a.id)}>
                  {open ? 'Hide' : 'What was set'}
                </button>
              </div>
            </div>
            <div className="bar thin"><i style={{ width: `${p.percent}%` }} /></div>

            {open && (
              <>
                <ol className="peek">
                  {a.items.map((item) => {
                    const status = p.statuses.find((s) => s.item.id === item.id)
                    const q = item.questionId ? byId.get(item.questionId) : undefined
                    return (
                      <li key={item.id}>
                        <span className={`badge ${status?.done
                          ? (status.correct === false ? 'on' : 'e') : ''}`}>
                          {status?.done
                            ? (status.correct === false ? 'wrong' : 'done')
                            : 'not yet'}
                        </span>{' '}
                        {item.kind === 'question'
                          ? (q ? q.teaser : item.questionId)
                          : item.title ?? item.url}
                        {item.questionId && (
                          <button className="link-btn"
                            onClick={() => reassign(a, [item.questionId as string])}>
                            set again
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ol>
                <div className="row tight" style={{ marginTop: 10 }}>
                  <button className="btn-sm"
                    onClick={() => reassign(a, questions)}>
                    Set the whole thing again
                  </button>
                  <button className="btn-sm"
                    onClick={() => reassign(a, p.missed)}
                    disabled={!p.missed.length}>
                    Set just the {p.missed.length} they got wrong
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

function readableFamily(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/** Open a generated document in its own tab, ready to print. */
function openPrintable(html: string, title: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><title>${title}</title>${html}`)
  w.document.close()
}
