import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question } from '../exams/types'
import { loadBodies, loadIndex } from '../lib/bank'
import { progress } from '../practice/mastery'
import { Round } from '../practice/Round'
import { difficultyLabel } from '../lesson/types'
import {
  errorLog, fixed, grouped, noteFor, open as openOnly, saveNote,
  type SkillLabel,
  type ErrorEntry, type TopicGroup,
} from './log'

/**
 * Every mistake, until it is fixed.
 *
 * The screen exists because an accuracy percentage throws away the only
 * genuinely useful thing a student produces: WHERE it went wrong. "72% on
 * Percentages" tells nobody what to do on Tuesday. "Four open, three of them
 * working backward to the original whole" does.
 *
 * Three things a student can do here, and the order matters:
 *
 *   re-solve   the question itself, again, until it is right
 *   write      what went wrong, in their own words
 *   read       which recognitions keep producing mistakes
 *
 * A mistake leaves the open list only by being answered correctly. There is
 * no dismiss button, deliberately: a list you can clear without fixing
 * anything becomes a list nobody trusts.
 */
export function ErrorLog({ exam }: { exam: Exam }) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [skills, setSkills] = useState<Record<string, SkillLabel>>({})
  const [round, setRound] = useState<Question[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'open' | 'fixed'>('open')
  const [version, setVersion] = useState(0)
  const [noting, setNoting] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((bank) => {
      if (!live) return
      const map: Record<string, string> = {}
      for (const q of bank) {
        if (q.subtype && !map[q.subtype]) map[q.subtype] = q.subtypeName || q.subtype
      }
      setNames(map)
    })
    // Skill codes are what the bank stores; names are what a student can
    // read. Without this the log headed its groups "Q.B." and "Q.F.".
    void fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then((r) => r.json())
      .then((b: { skills?: (SkillLabel & { skill_cd: string })[] }) => {
        if (!live) return
        const map: Record<string, SkillLabel> = {}
        for (const s of b.skills ?? []) {
          map[s.skill_cd] = { skill_name: s.skill_name, domain_name: s.domain_name }
        }
        setSkills(map)
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  const log = useMemo(
    () => errorLog(progress().attempts, exam), [exam, version, round],
  )
  const stillOpen = openOnly(log)
  const done = fixed(log)
  const shown = tab === 'open' ? stillOpen : done
  // Grouped on whichever tab is showing, so the tree always matches the
  // list underneath it rather than describing the other one.
  const tree = useMemo(() => grouped(shown, names, skills), [shown, names, skills])
  const [openSkills, setOpenSkills] = useState<Set<string>>(new Set())
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set())

  async function solve(ids: string[]) {
    if (!ids.length || busy) return
    setBusy(true)
    try {
      setRound(await loadBodies(exam, ids))
    } finally {
      setBusy(false)
    }
  }

  if (round) {
    return (
      <div className="wrap">
        <Round questions={round}
          verdict={(right, total) => right === total
            ? 'All of them. Those come off the open list.'
            : `${right} of ${total}. The ones still wrong stay open — that is `
              + 'the list doing its job.'}
          onDone={() => { setRound(null); setVersion((v) => v + 1) }} />
      </div>
    )
  }

  return (
    <div className="wrap wide journey">
      <div className="top">
        <div>
          <h1>Error log</h1>
          <p className="who">
            {stillOpen.length
              ? `${stillOpen.length} still open, ${done.length} fixed. `
                + 'A question leaves this list by being answered right.'
              : done.length
                ? `All ${done.length} fixed. Nothing open.`
                : 'Nothing here yet — mistakes land here automatically.'}
          </p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to={`/${exam}`}>Back to the map</Link>
          <Link className="btn-sm" to={`/${exam}/mistakes`}>Practise recent</Link>
        </div>
      </div>

      {stillOpen.length > 0 && (
        <div className="card">
          <button className="btn-primary" disabled={busy}
            onClick={() => void solve(stillOpen.slice(0, 20).map((e) => e.questionId))}>
            {busy ? 'Loading…' : `Re-solve ${Math.min(20, stillOpen.length)} open`}
          </button>
          <p className="tiny muted" style={{ margin: '9px 0 0' }}>
            The exact questions you got wrong, in the order they bit you.
          </p>
        </div>
      )}

      <div className="row tight" style={{ marginTop: 22 }}>
        <button className={tab === 'open' ? 'btn-primary' : 'btn-sm'}
          onClick={() => setTab('open')}>Open ({stillOpen.length})</button>
        <button className={tab === 'fixed' ? 'btn-primary' : 'btn-sm'}
          onClick={() => setTab('fixed')}>Fixed ({done.length})</button>
      </div>

      <div className="err-tree">
        {tree.map((g) => {
          const isOpen = openSkills.has(g.skill)
          return (
            <section className="err-skill" key={g.skill}>
              <button className="err-skill-head" aria-expanded={isOpen}
                onClick={() => setOpenSkills((was) => {
                  const next = new Set(was)
                  if (next.has(g.skill)) next.delete(g.skill); else next.add(g.skill)
                  return next
                })}>
                <span className="err-caret">{isOpen ? '\u2212' : '+'}</span>
                <span className="err-skill-t">
                  {g.name}
                  {g.domain && <em className="err-skill-d">{g.domain}</em>}
                </span>
                <span className="err-skill-n">
                  {g.open > 0 && <b className="et-open">{g.open} open</b>}
                  {g.fixed > 0 && <span className="et-fixed">{g.fixed} fixed</span>}
                </span>
              </button>

              {isOpen && (
                <div className="err-topic-list">
                  {g.topics.map((t) => (
                    <Topic key={t.key} topic={t}
                      open={openTopics.has(t.key)}
                      busy={busy}
                      onToggle={() => setOpenTopics((was) => {
                        const next = new Set(was)
                        if (next.has(t.key)) next.delete(t.key); else next.add(t.key)
                        return next
                      })}
                      onSolveAll={() => void solve(
                        t.entries.filter((e) => !e.fixedAt).map((e) => e.questionId))}
                      renderEntry={(e) => (
                        <Entry key={e.questionId} entry={e} name={t.name} busy={busy}
                          onSolve={() => void solve([e.questionId])}
                          noting={noting === e.questionId}
                          draft={draft}
                          onNote={() => {
                            setNoting(e.questionId)
                            setDraft(noteFor(e.questionId)?.text ?? '')
                          }}
                          onDraft={setDraft}
                          onSave={() => {
                            saveNote(e.questionId, draft)
                            setNoting(null)
                            setVersion((v) => v + 1)
                          }}
                          onCancel={() => setNoting(null)} />
                      )} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
        {!tree.length && (
          <p className="small muted">
            {tab === 'open'
              ? 'Nothing open. Everything you have missed has been re-solved.'
              : 'Nothing fixed yet.'}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * One recognition inside a skill.
 *
 * Collapsed by default. A student opening the log wants to see the SHAPE of
 * the problem first - which skills, how many - and only then the individual
 * questions. Showing forty rows immediately buries the shape under them.
 */
function Topic({
  topic, open, busy, onToggle, onSolveAll, renderEntry,
}: {
  topic: TopicGroup
  open: boolean
  busy: boolean
  onToggle: () => void
  onSolveAll: () => void
  renderEntry: (e: ErrorEntry) => React.ReactNode
}) {
  return (
    <div className="err-topic-group">
      <div className="err-topic-head">
        <button className="err-topic-toggle" aria-expanded={open} onClick={onToggle}>
          <span className="err-caret">{open ? '\u2212' : '+'}</span>
          <span className="et-t">{topic.name}</span>
          <span className="et-n">
            {topic.open > 0 && <b className="et-open">{topic.open} open</b>}
            {topic.fixed > 0 && <span className="et-fixed">{topic.fixed} fixed</span>}
          </span>
        </button>
        {topic.open > 0 && (
          <button className="btn-sm" disabled={busy} onClick={onSolveAll}>
            Re-solve {topic.open}
          </button>
        )}
      </div>
      {open && (
        <div className="err-list">{topic.entries.map(renderEntry)}</div>
      )}
    </div>
  )
}

function Entry({
  entry, name, busy, onSolve, noting, draft, onNote, onDraft, onSave, onCancel,
}: {
  entry: ErrorEntry
  name: string
  busy: boolean
  onSolve: () => void
  noting: boolean
  draft: string
  onNote: () => void
  onDraft: (s: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const wrong = entry.attempts.filter((a) => !a.correct).length
  return (
    <div className={`err-row ${entry.fixedAt ? 'is-fixed' : ''}`}>
      <div className="err-main">
        <div className="err-t">{name}</div>
        <div className="err-d">
          <span className={`badge ${entry.difficulty.toLowerCase()}`}>
            {difficultyLabel(entry.difficulty as never)}
          </span>
          {' '}
          {wrong === 1 ? 'missed once' : `missed ${wrong} times`}
          {entry.retries > 0 && ` · ${entry.retries} retr${entry.retries === 1 ? 'y' : 'ies'}`}
          {entry.family && ` · ${entry.family.replace(/-/g, ' ')}`}
          {entry.fixedAt && ` · fixed ${entry.fixedAt.slice(0, 10)}`}
        </div>
        {entry.note && !noting && (
          <div className="err-note">
            <span className="err-note-k">Your note</span>
            {entry.note.text}
          </div>
        )}
        {noting && (
          <div className="err-note-edit">
            <textarea value={draft} autoFocus rows={3}
              placeholder="What went wrong? What will you do differently?"
              onChange={(ev) => onDraft(ev.target.value)} />
            <div className="row tight">
              <button className="btn-sm" onClick={onSave}>Save note</button>
              <button className="btn-sm" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div className="row tight err-acts">
        <button className="btn-sm" disabled={busy} onClick={onSolve}>
          {entry.fixedAt ? 'Again' : 'Re-solve'}
        </button>
        {!noting && (
          <button className="btn-sm" onClick={onNote}>
            {entry.note ? 'Edit note' : 'Add note'}
          </button>
        )}
      </div>
    </div>
  )
}
