import { useEffect, useState } from 'react'
import { EXAM_IDS, examSpec } from '../exams/registry'
import type { Exam, Question } from '../exams/types'
import { loadBank } from '../lib/bank'
import { Lesson } from '../lesson/render'
import { exportBothPdfs, exportLessonPdf } from '../lesson/pdf'
import { fromPlanner } from '../lesson/fromPlanner'
import type { LessonMode, LessonPlan } from '../lesson/types'
import { ask, plannerUp, sessionsOf, type PlannerMessage } from './plannerApi'

/**
 * Ask for a lesson, get a lesson - not a wall of chat.
 *
 * The planner returns structure and judgement plus a fenced spec. The spec is
 * rendered; the prose around it is kept because that is where the planner
 * explains its choices, but the spec is never shown raw. Seeing JSON in a
 * chat window was the single thing that made this feature feel unfinished.
 */
export function Planner() {
  const [exam, setExam] = useState<Exam>('sat')
  const [bank, setBank] = useState<Question[]>([])
  const [up, setUp] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<PlannerMessage[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [mode, setMode] = useState<LessonMode>('present')

  useEffect(() => {
    void plannerUp().then(setUp)
  }, [])

  useEffect(() => {
    let live = true
    void loadBank(exam).then((b) => live && setBank(b))
    return () => {
      live = false
    }
  }, [exam])

  async function send() {
    const body = text.trim()
    if (!body || busy) return
    const next: PlannerMessage[] = [...messages, { role: 'user', content: body }]
    setMessages(next)
    setText('')
    setBusy(true)
    setError(null)
    try {
      const out = await ask(next, { exam })
      setMessages([...next, { role: 'assistant', content: out.reply }])
      if (out.lesson) {
        const converted = sessionsOf(out.lesson).map((s) => fromPlanner(s, bank, exam))
        setPlans(converted.map((c) => c.plan))
        setMissing(converted.flatMap((c) => c.missing))
      }
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap wide">
      <div className="top">
        <div>
          <h1>Plan a lesson</h1>
          <p className="who">
            {up === false
              ? 'The planner is not running on this machine'
              : `Grounded in the ${examSpec(exam).label} bank (${bank.length} questions)`}
          </p>
        </div>
        <div className="row tight">
          {EXAM_IDS.map((id) => (
            <button key={id} className={id === exam ? 'btn-primary' : 'btn-sm'}
              onClick={() => { setExam(id); setPlans([]); setMissing([]) }}>
              {examSpec(id).label}
            </button>
          ))}
        </div>
      </div>

      {up === false && (
        <div className="card">
          <p className="small">
            Start it with <code>python3 tools/planner_server.py</code>. It runs
            against your own Claude session, so nothing leaves this machine and
            students never reach it.
          </p>
        </div>
      )}

      {messages.filter((m) => m.role === 'assistant' && m.content).map((m, i) => (
        <div className="card" key={i}><p className="small">{m.content}</p></div>
      ))}

      {error && <p className="bad-text small">{error}</p>}
      {missing.length > 0 && (
        <p className="small" style={{ color: 'var(--flag)' }}>
          {missing.length} question{missing.length === 1 ? '' : 's'} the planner
          named {missing.length === 1 ? 'is' : 'are'} not in the bank, so{' '}
          {missing.length === 1 ? 'it was' : 'they were'} left out rather than
          shown blank.
        </p>
      )}

      <div className="plan-ask">
        <textarea value={text} disabled={busy || up === false}
          placeholder={`Plan a lesson on circles for a student at 1200 aiming at 1400`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send()
          }} />
        <button className="btn-primary" onClick={() => void send()}
          disabled={busy || up === false}>
          {busy ? 'Working…' : 'Send'}
        </button>
      </div>
      <p className="tiny muted">
        Ninety minutes unless you say otherwise. Cmd/Ctrl+Enter sends.
      </p>

      {plans.map((plan, i) => (
        <div key={i} style={{ marginTop: 22 }}>
          <div className="row tight" style={{ marginBottom: 10 }}>
            <button className={mode === 'present' ? 'btn-primary' : 'btn-sm'}
              onClick={() => setMode('present')}>Screen-share view</button>
            <button className={mode === 'teacher' ? 'btn-primary' : 'btn-sm'}
              onClick={() => setMode('teacher')}>Teacher view</button>
            <button className="btn-sm" onClick={() => void exportLessonPdf(plan, mode)}>
              PDF of this view
            </button>
            <button className="btn-sm" onClick={() => void exportBothPdfs(plan)}>
              Both PDFs
            </button>
          </div>
          <Lesson plan={plan} mode={mode} />
        </div>
      ))}
    </div>
  )
}
