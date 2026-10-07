import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question, Tier } from '../exams/types'
import { loadSubtypes } from '../lib/bank'
import { renderFigure, renderStimulus } from '../lesson/math'
import { QuestionCard } from '../practice/QuestionCard'
import { progress, record } from '../practice/mastery'
import {
  REINFORCE_N, examsWithMisses, familyName, missGroups, relatedSets,
  type MissGroup, type Miss, type RelatedSets,
} from './groups'

const TIER_WORD: Record<Tier, string> = {
  F: 'Foundations', E: 'Easy', M: 'Medium', H: 'Hard', X: 'Super hard',
}
const TIERS: Tier[] = ['F', 'E', 'M', 'H', 'X']

type Tab = 'again' | 'twins' | 'cousins'

/**
 * The taxonomy as the student is allowed to see it.
 *
 * `when` is an instruction to whoever writes the items - "assign this when the
 * distractor is the value from an earlier step" - and reads as an accusation
 * if it ever reaches a student. Only `label` crosses this boundary, so only
 * `label` is kept.
 */
interface Family { slug: string; label: string }

function useMisconceptions(): Record<string, string> {
  const [labels, setLabels] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true
    fetch(`${import.meta.env.BASE_URL}data/misconceptions.json`)
      .then((r) => (r.ok ? r.json() : { families: [] }))
      .then((blob: { families?: Family[] }) => {
        if (!live) return
        const out: Record<string, string> = {}
        for (const f of blob.families ?? []) if (f.slug && f.label) out[f.slug] = f.label
        setLabels(out)
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [])
  return labels
}

/**
 * The mistakes screen.
 *
 * Which exam is being reviewed comes from the attempts, not from the URL: a
 * miss already knows which test it happened on, and asking the student to
 * pick a test before showing them anything would be a question the data can
 * answer. A student with misses on both gets a switch, never a merged list -
 * an SAT subtype and an ACT subtopic can share a name and must never share a
 * row.
 */
export function Review() {
  // Re-read when a practice session ends. Reading once per mount meant a
  // student could sit ten twins, get three wrong, and come back to a group
  // that still showed the old count - which reads as the screen not working.
  const [refresh, setRefresh] = useState(0)
  const store = useMemo(() => progress(), [refresh])
  const exams = useMemo(() => examsWithMisses(store.attempts), [store])
  const [exam, setExam] = useState<Exam | null>(null)
  const [bank, setBank] = useState<Question[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const labels = useMisconceptions()

  const current = exam ?? exams[0] ?? null

  useEffect(() => {
    if (!current) return
    let live = true
    setBank(null)
    // Only the recognitions this student has actually missed. Review is by
    // definition a narrow slice of the bank, so loading the whole thing to
    // show it would be the one place the split buys the least and costs the
    // most.
    const missed = [...new Set(
      store.attempts.filter((a) => a.exam === current && !a.correct)
        .map((a) => a.subtype),
    )]
    loadSubtypes(current, missed)
      .then((b) => { if (live) setBank(b) })
      .catch((e: unknown) => { if (live) setError(String((e as Error).message ?? e)) })
    return () => { live = false }
  }, [current])

  const groups = useMemo(
    () => (bank && current
      ? missGroups(store.attempts.filter((a) => a.exam === current), bank)
      : []),
    [bank, current, store],
  )

  if (!current) {
    return (
      <div className="wrap">
        <Header />
        <div className="card empty">Nothing missed yet. Come back after some practice.</div>
      </div>
    )
  }
  if (error) return <div className="wrap"><Header /><p className="bad-text">{error}</p></div>
  if (!bank) return <div className="wrap"><Header /><p className="muted">Loading&hellip;</p></div>

  const open = groups.find((g) => g.key === openKey) ?? null
  if (open) {
    return (
      <Group group={open} bank={bank} attempts={store.attempts}
        onPractised={() => setRefresh((n) => n + 1)}
        labels={labels} onBack={() => setOpenKey(null)} />
    )
  }

  return (
    <div className="wrap">
      <Header />
      <h2 style={{ marginTop: 0 }}>Your mistakes</h2>
      <p className="muted">
        Grouped by the kind of question, then by the specific wrong move inside
        it. Worst first &mdash; this list is about you, not about what the test
        asks most.
      </p>

      {exams.length > 1 && (
        <div className="tabs" role="tablist">
          {exams.map((e) => (
            <button key={e} className={`tab ${e === current ? 'on' : ''}`}
              role="tab" aria-selected={e === current}
              onClick={() => { setExam(e); setOpenKey(null) }}>
              {e.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {groups.length ? groups.map((g) => (
        <button key={g.key} className="tile" onClick={() => setOpenKey(g.key)}>
          <div className="t">{g.title}</div>
          <div className="d">{g.skill}</div>
          <div className="meta">
            <span className="badge on">{g.count} missed</span>
            {TIERS.filter((t) => g.tiers[t]).map((t) => (
              <span key={t} className={`badge ${t.toLowerCase()}`}>
                {g.tiers[t]} at {TIER_WORD[t]}
              </span>
            ))}
          </div>
          {g.topFamilies.length > 0 && (
            <div className="d" style={{ marginTop: 8 }}>
              Usually: {g.topFamilies.slice(0, 2)
                .map((f) => `${f.name}${f.n > 1 ? ` (${f.n}×)` : ''}`).join(', ')}
            </div>
          )}
        </button>
      )) : (
        <div className="card empty">
          Nothing missed on the {current.toUpperCase()} yet.
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="top">
      <div>
        <h1>Review</h1>
        <p className="who">The questions you got wrong, and what to do about them</p>
      </div>
      <Link className="btn-sm" to="/">Home</Link>
    </div>
  )
}

function Group({
  group, bank, attempts, labels, onBack, onPractised,
}: {
  group: MissGroup
  bank: Question[]
  attempts: ReturnType<typeof progress>['attempts']
  labels: Record<string, string>
  onBack: () => void
  onPractised: () => void
}) {
  const [tab, setTab] = useState<Tab>('twins')
  const [running, setRunning] = useState<Question[] | null>(null)
  const sets = useMemo(() => relatedSets(group, bank, attempts), [group, bank, attempts])
  const label = (slug: string) => labels[slug] ?? familyName(slug)

  if (running) {
    return <Session items={running} label={label}
      onDone={() => { setRunning(null); onPractised() }} />
  }

  return (
    <div className="wrap">
      <div className="spread" style={{ marginBottom: 12 }}>
        <button className="btn-sm" onClick={onBack}>&larr; All mistakes</button>
      </div>
      <h1>{group.title}</h1>
      {/* The heading above already names the recognition, which is the
          useful part. The skill was being shown as its CODE - "3 missed in
          H.D.." , trailing double stop and all - so it is simply dropped. */}
      <p className="muted">
        {group.count} missed at this question type
      </p>

      {group.topFamilies.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>What goes wrong</h2>
          {group.topFamilies.map((f) => (
            <div key={f.slug} className="fam">
              <div className="fam-h">
                <strong>{f.name}</strong>
                <span className="badge on">{f.n}&times;</span>
              </div>
              {labels[f.slug] && <p className="small">{labels[f.slug]}</p>}
            </div>
          ))}
        </div>
      )}

      <h2>What you missed</h2>
      {group.misses.map((m) => (
        <MissedCard key={`${m.question.id}-${m.at}`} miss={m} label={label} />
      ))}

      <h2>Practise it</h2>
      <div className="tabs" role="tablist">
        {(['again', 'twins', 'cousins'] as Tab[]).map((k) => (
          <button key={k} className={`tab ${tab === k ? 'on' : ''}`}
            role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
            <span className="tab-n plain">{sets[k].length}</span>
          </button>
        ))}
      </div>
      <PracticeTab group={group} sets={sets} tab={tab}
        onStart={(items) => setRunning(items)} />
    </div>
  )
}

const TAB_LABEL: Record<Tab, string> = {
  again: 'Sit them again',
  twins: 'Questions like these',
  cousins: 'The same skill, another angle',
}

/**
 * One of the three practice tabs.
 *
 * Each says plainly what it is and what it is for, because the difference
 * between them is the whole point: sitting the same question again is not the
 * same as sitting one that goes wrong the same way.
 */
function PracticeTab({
  group, sets, tab, onStart,
}: {
  group: MissGroup
  sets: RelatedSets
  tab: Tab
  onStart: (items: Question[]) => void
}) {
  const named = group.topFamilies.slice(0, 2)
    .map((f) => f.name.toLowerCase()).join(', ')

  const copy: Record<Tab, { what: string; why: string; short: number }> = {
    again: {
      what: 'The questions you got wrong, exactly as they were.',
      why: 'Worth doing once you have read why. If you can now get them right '
        + 'for the right reason, the next tab is where the real test is.',
      short: 0,
    },
    twins: {
      what: `Same question type, and built to catch the same mistake${named ? ` (${named})` : ''}.`,
      why: 'The closest thing to the question you missed, with everything else '
        + 'changed. This is the one that tells you whether it stuck.',
      short: sets.shortTwins,
    },
    cousins: {
      what: 'Same question type, coming at it from a different direction.',
      why: 'Once the twins are going in, these check that you have the '
        + 'recognition rather than one worked pattern.',
      short: sets.shortCousins,
    },
  }

  const items = sets[tab]
  const { what, why, short } = copy[tab]
  const n = Math.min(REINFORCE_N, items.length)

  return (
    <div className="card">
      <p className="small"><strong>{what}</strong></p>
      <p className="small muted">{why}</p>
      <div className="row tight" style={{ marginTop: 12 }}>
        <button className="btn-primary" disabled={!n}
          onClick={() => onStart(items.slice(0, REINFORCE_N))}>
          {n ? `Practise ${n} question${n === 1 ? '' : 's'}` : 'Nothing written yet'}
        </button>
      </div>
      {/* The shortfall is stated rather than papered over with repeats
          presented as new; the bank is what it is. */}
      {short > 0 && (
        <p className="tiny muted" style={{ marginTop: 10 }}>
          The bank is {short} short of a full set of {REINFORCE_N} here.
        </p>
      )}
      {items.length > 0 && (
        <ol className="peek">
          {items.slice(0, 5).map((q) => (
            <li key={q.id}>
              <span className={`badge ${q.difficulty.toLowerCase()}`}>
                {TIER_WORD[q.difficulty]}
              </span>
              {plainStem(q)}
            </li>
          ))}
          {items.length > 5 && <li className="muted">and {items.length - 5} more</li>}
        </ol>
      )}
    </div>
  )
}

/** A stem as one short line, for a preview list. */
function plainStem(q: Question): string {
  const text = String(q.stem ?? '').replace(/\$[^$]*\$/g, '…')
    .replace(/\s+/g, ' ').trim()
  return text.length > 110 ? `${text.slice(0, 108)}…` : text
}

/** One missed question, with what they picked and what was right. */
function MissedCard({ miss, label }: { miss: Miss; label: (slug: string) => string }) {
  const q = miss.question
  const choice = (key: string) => (q.choices ?? [])['ABCDEFGH'.indexOf(key)] ?? ''
  const grid = q.format === 'grid'
  const right = grid ? (q.keys ?? [])[0] ?? '' : q.answer ?? ''

  return (
    <div className="card">
      <div className="meta" style={{ marginBottom: 10 }}>
        <span className={`badge ${q.difficulty.toLowerCase()}`}>{TIER_WORD[q.difficulty]}</span>
        {miss.family && <span className="badge on name">{familyName(miss.family)}</span>}
      </div>
      {Boolean(q.stimulus || q.figure) && (
        <div className="stim" dangerouslySetInnerHTML={{
          __html: renderStimulus(q.stimulus) + renderFigure(q.figure),
        }} />
      )}
      <div className="q" dangerouslySetInnerHTML={{ __html: renderStimulus(q.stem) }} />

      <div className="choice wrong">
        <span className="k">{grid ? 'You' : miss.attempt.chosen}</span>
        <span className="ctext" dangerouslySetInnerHTML={{
          __html: renderStimulus(grid ? miss.attempt.chosen : choice(miss.attempt.chosen)),
        }} />
      </div>
      <div className="choice right">
        <span className="k">{grid ? 'Answer' : right}</span>
        <span className="ctext" dangerouslySetInnerHTML={{
          __html: renderStimulus(grid ? right : choice(right)),
        }} />
      </div>

      {miss.family && (
        <div className="why why-yours">
          <div className="why-h">Why yours was wrong</div>
          <p className="why-name">{label(miss.family)}</p>
          {q.perChoice?.[miss.attempt.chosen] && (
            <div dangerouslySetInnerHTML={{
              __html: renderStimulus(q.perChoice[miss.attempt.chosen]),
            }} />
          )}
        </div>
      )}
      {q.explanation && (
        <div className="why">
          <div className="why-h">How to get there</div>
          <div dangerouslySetInnerHTML={{ __html: renderStimulus(q.explanation) }} />
        </div>
      )}
    </div>
  )
}

/**
 * A round from one of the tabs.
 *
 * Answers are recorded the same way any other practice is, so a question
 * re-sat here counts towards mastery and, if it goes wrong again, comes back
 * to this screen as a fresh miss.
 */
function Session({
  items, label, onDone,
}: {
  items: Question[]
  label: (slug: string) => string
  onDone: () => void
}) {
  const [at, setAt] = useState(0)
  const [answered, setAnswered] = useState(false)
  const question = items[at]

  if (!question) {
    return (
      <div className="wrap">
        <div className="card empty">
          <p>That is the set.</p>
          <button className="btn-primary" onClick={onDone}>Back to the mistake</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="spread" style={{ marginBottom: 12 }}>
        <button className="btn-sm" onClick={onDone}>&larr; Stop</button>
        <span className="tiny muted">{at + 1} of {items.length}</span>
      </div>
      <div className="bar">
        <i style={{ width: `${((at + (answered ? 1 : 0)) / items.length) * 100}%` }} />
      </div>
      <QuestionCard question={question} misconceptionLabel={label}
        onAnswer={(chosen, correct) => {
          record(question, chosen, correct)
          setAnswered(true)
        }} />
      {answered && (
        <button className="btn-primary" onClick={() => { setAt(at + 1); setAnswered(false) }}>
          {at + 1 < items.length ? 'Next question' : 'Finish'}
        </button>
      )}
    </div>
  )
}
