import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question, Tier } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadBodies, loadIndex, type QuestionRef } from '../lib/bank'
import { difficultyLabel } from '../lesson/types'
import { accuracy, seenIds } from './mastery'
import { Round } from './Round'
import { dueNow, rank, type Bands, type Ranked } from './engine'

const ROUND = 10

/**
 * Browse a bank and practise it: section, then recognition, then level.
 *
 * The ladder runs Foundations - Easy - Medium - Hard - Super hard, and the
 * ends are ours rather than the exam's. Foundations is the skill underneath
 * with the test wrapped off, for a student whom the exam's own easiest tier
 * two ends are ours. Foundations is the skill underneath with the test
 * wrapped off, for a student the exam's own easiest tier is already failing.
 * Super hard is above the hardest the exam asks, for a
 * student who has run out of Hard. Neither is hidden: a level a student
 * cannot see is a level they cannot ask for.
 */
export function Practice({ exam }: { exam: Exam }) {
  const [bank, setBank] = useState<QuestionRef[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [section, setSection] = useState<string>('')
  const [subtype, setSubtype] = useState<string | null>(null)
  const [round, setRound] = useState<Question[] | null>(null)
  const [bands, setBands] = useState<Bands | null>(null)
  const [targets, setTargets] = useState<Record<string, number | undefined>>({})

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/misconceptions.json`)
      .then((r) => r.json())
      .then((blob: { families?: { slug: string; label: string }[] }) => {
        if (!live) return
        setLabels(Object.fromEntries((blob.families ?? []).map((f) => [f.slug, f.label])))
      })
      .catch(() => undefined)
    // The band table is SAT-only: it comes from the official raw-to-scaled
    // conversions, and we have no equivalent for the ACT. Rather than invent
    // one, the ACT ranks on what it can measure and says so on screen.
    if (exam === 'sat') {
      void fetch(`${import.meta.env.BASE_URL}data/bands.json`)
        .then((r) => r.json())
        .then((b: Bands) => live && setBands(b))
        .catch(() => undefined)
    } else {
      setBands(null)
    }
    try {
      const saved = localStorage.getItem(`prep.targets.${exam}`)
      setTargets(saved ? (JSON.parse(saved) as Record<string, number>) : {})
    } catch {
      setTargets({})
    }
    return () => { live = false }
  }, [exam])

  // Switching exam must drop everything below it. A recognition slug from
  // one bank means nothing in the other, and a stale one would silently
  // produce an empty round.
  useEffect(() => { setSection(''); setSubtype(null); setRound(null) }, [exam])

  const spec = examSpec(exam)
  const inSection = useMemo(
    () => bank.filter((q) => !section || q.section === section),
    [bank, section],
  )

  const recognitions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const q of inSection) {
      if (!q.subtype) continue
      const entry = map.get(q.subtype) ?? { name: q.subtypeName || q.subtype, count: 0 }
      entry.count += 1
      map.set(q.subtype, entry)
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [inSection])

  async function start(tier: Tier) {
    const pool = inSection.filter((q) => q.subtype === subtype && q.difficulty === tier)
    const seen = seenIds(exam)
    // Unseen first. A round that re-serves what they just did tests memory.
    const sorted = [...pool].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)))
    if (!sorted.length) return
    // Bodies are fetched here, for these ten, rather than up front for the
    // whole bank.
    setRound(await loadBodies(exam, sorted.slice(0, ROUND).map((q) => q.id)))
  }

  if (round) {
    return (
      <div className="wrap">
        <Round questions={round} onDone={() => setRound(null)}
          misconceptionLabel={(slug) => labels[slug] ?? readable(slug)} />
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1>{spec.label} Practice</h1>
          <p className="who">{bank.length} questions</p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to="/review">Review mistakes</Link>
          <Link className="btn-sm" to="/homework">Homework</Link>
          <Link className="btn-sm" to="/">Switch test</Link>
        </div>
      </div>

      <div className="row tight" style={{ marginBottom: 14 }}>
        <button className={section === '' ? 'btn-primary' : 'btn-sm'}
          onClick={() => { setSection(''); setSubtype(null) }}>All</button>
        {spec.sections.map((s) => (
          <button key={s.id} className={section === s.id ? 'btn-primary' : 'btn-sm'}
            onClick={() => { setSection(s.id); setSubtype(null) }}>{s.label}</button>
        ))}
      </div>

      {subtype ? (
        <Levels exam={exam} bank={inSection} subtype={subtype}
          onBack={() => setSubtype(null)} onStart={start} />
      ) : (
        <>
          <Next exam={exam} bank={inSection} bands={bands} targets={targets}
            onPick={(r) => { setSubtype(r.subtype) }} />
          <h2>Everything else</h2>
          {recognitions.map(([slug, meta]) => (
            <button key={slug} className="tile" onClick={() => setSubtype(slug)}>
              <div className="t">{meta.name}</div>
              <div className="d">{meta.count} questions here</div>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

/**
 * What to study next, rather than a list to browse.
 *
 * This is the difference between an adaptive tool and a question bank. The
 * ranking multiplies four things, and each one kills a different failure:
 * how likely they are to miss it, how often the exam asks it, whether their
 * target needs that tier at all, and whether the tier below is going in yet.
 */
function Next({
  exam, bank, bands, targets, onPick,
}: {
  exam: Exam
  bank: QuestionRef[]
  bands: Bands | null
  targets: Record<string, number | undefined>
  onPick: (r: Ranked) => void
}) {
  const ranked = useMemo(
    () => rank(exam, bank, bands, targets, 6), [exam, bank, bands, targets],
  )
  const due = useMemo(() => dueNow(exam, bank).slice(0, 4), [exam, bank])
  if (!ranked.length) return null

  return (
    <>
      {due.length > 0 && (
        <>
          <h2>Due for another look</h2>
          {due.map((r) => (
            <button key={`${r.subtype}|${r.tier}`} className="tile due"
              onClick={() => onPick(r)}>
              <div className="t">{r.name}</div>
              <div className="d">
                {difficultyLabel(r.tier)} &middot; you were at{' '}
                {r.accuracy === null ? '—' : `${Math.round(r.accuracy * 100)}%`}
              </div>
            </button>
          ))}
        </>
      )}

      <h2>Where your marks are</h2>
      {!bands && (
        <p className="tiny muted" style={{ marginTop: -6 }}>
          Ordered by what you are missing and how often it comes up. The ACT
          has no published raw-to-scale table here, so unlike the SAT this is
          not weighted by your target.
        </p>
      )}
      {ranked.map((r) => (
        <button key={`${r.subtype}|${r.tier}`} className="tile" onClick={() => onPick(r)}>
          <div className="t">{r.name}</div>
          <div className="d">
            {difficultyLabel(r.tier)} &middot; {r.pool} questions
            {r.accuracy !== null && ` · ${Math.round(r.accuracy * 100)}% so far`}
          </div>
        </button>
      ))}
    </>
  )
}

function Levels({
  exam, bank, subtype, onBack, onStart,
}: {
  exam: Exam
  bank: QuestionRef[]
  subtype: string
  onBack: () => void
  onStart: (tier: Tier) => void
}) {
  const pool = bank.filter((q) => q.subtype === subtype)
  const name = pool[0]?.subtypeName || subtype
  const tiers = examSpec(exam).tiers

  return (
    <>
      <div className="spread" style={{ marginBottom: 12 }}>
        <button className="btn-sm" onClick={onBack}>&larr; All question types</button>
      </div>
      <h1>{name}</h1>
      <p className="muted small">
        Start where it pays and move up when you are ready. Everything you have
        practised stays here.
      </p>
      <div className="levels">
        {tiers.map((t) => {
          const n = pool.filter((q) => q.difficulty === t).length
          const acc = accuracy(exam, subtype, t)
          const kind = t === 'F' ? 'foundation' : t === 'X' ? 'stretch' : 'open'
          return (
            <button key={t} className={`level ${kind}`} disabled={!n}
              onClick={() => void onStart(t)}>
              <span className="level-t">{difficultyLabel(t)}</span>
              <span className="level-d">
                {n ? `${n} questions` : 'none yet'}
                {acc !== null ? ` · ${Math.round(acc * 100)}% so far` : ''}
              </span>
              {t === 'F' && (
                <span className="level-note">
                  The skill underneath, without the test wrapped around it.
                </span>
              )}
              {t === 'X' && (
                <span className="level-note">
                  Harder than the exam goes, for the last few marks.
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function readable(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
