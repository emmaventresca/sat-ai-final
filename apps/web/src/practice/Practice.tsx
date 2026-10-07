import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question, Tier } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadBank } from '../lib/bank'
import { difficultyLabel } from '../lesson/types'
import { accuracy, seenIds } from './mastery'
import { Round } from './Round'

const ROUND = 10

/**
 * Browse a bank and practise it: section, then recognition, then level.
 *
 * The ladder runs Foundations - Easy - Medium - Hard - Stretch, and the two
 * ends are ours rather than the exam's. Foundations is the skill underneath
 * with the test wrapped off, for a student whom the exam's own easiest tier
 * is already failing. Stretch is above the hardest the exam asks, for a
 * student who has run out of Hard. Neither is hidden: a level a student
 * cannot see is a level they cannot ask for.
 */
export function Practice({ exam }: { exam: Exam }) {
  const [bank, setBank] = useState<Question[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [section, setSection] = useState<string>('')
  const [subtype, setSubtype] = useState<string | null>(null)
  const [round, setRound] = useState<Question[] | null>(null)

  useEffect(() => {
    let live = true
    void loadBank(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/misconceptions.json`)
      .then((r) => r.json())
      .then((blob: { families?: { slug: string; label: string }[] }) => {
        if (!live) return
        setLabels(Object.fromEntries((blob.families ?? []).map((f) => [f.slug, f.label])))
      })
      .catch(() => undefined)
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

  function start(tier: Tier) {
    const pool = inSection.filter((q) => q.subtype === subtype && q.difficulty === tier)
    const seen = seenIds(exam)
    // Unseen first. A round that re-serves what they just did tests memory.
    const sorted = [...pool].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)))
    if (sorted.length) setRound(sorted.slice(0, ROUND))
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
          <h2>What do you want to work on?</h2>
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

function Levels({
  exam, bank, subtype, onBack, onStart,
}: {
  exam: Exam
  bank: Question[]
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
              onClick={() => onStart(t)}>
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
