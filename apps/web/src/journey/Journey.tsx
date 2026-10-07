import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam, Question } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadBank } from '../lib/bank'
import { buildJourney, type Chapter, type Leg, type SkillMeta } from './map'
import { StageView } from './Stage'

/**
 * The route, not the inventory.
 *
 * A hundred and eighty recognitions in one column is the most discouraging
 * thing you can put in front of someone who already feels behind. The same
 * content as eight chapters, each a few legs, each leg four or five stops,
 * is the same work and a completely different proposition: you can see where
 * you are, what comes next, and that there is an end.
 *
 * Nothing is locked. A student who wants to jump to the last chapter may -
 * the map says what the sensible order IS, which is a different thing from
 * refusing to let them deviate from it.
 */
export function Journey({ exam }: { exam: Exam }) {
  const [bank, setBank] = useState<Question[]>([])
  const [skills, setSkills] = useState<SkillMeta[]>([])
  const [openChapter, setOpenChapter] = useState<string | null>(null)
  const [stage, setStage] = useState<{ leg: Leg; subtype: string } | null>(null)
  const [trialLeg, setTrialLeg] = useState<Leg | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let live = true
    void loadBank(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then((r) => r.json())
      .then((b: { skills?: SkillMeta[] }) => live && setSkills(b.skills ?? []))
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  useEffect(() => { setOpenChapter(null); setStage(null); setTrialLeg(null) }, [exam])

  const chapters = useMemo(
    () => (bank.length ? buildJourney(exam, bank, skills) : []),
    [exam, bank, skills, version],
  )

  if (stage || trialLeg) {
    return (
      <StageView exam={exam} bank={bank}
        leg={stage?.leg ?? (trialLeg as Leg)}
        subtype={stage?.subtype ?? null}
        onBack={() => { setStage(null); setTrialLeg(null); setVersion((v) => v + 1) }} />
    )
  }

  const spec = examSpec(exam)
  const done = chapters.reduce((n, c) => n + c.cleared, 0)
  const all = chapters.reduce((n, c) => n + c.stages, 0)

  return (
    <div className="wrap journey">
      <div className="top">
        <div>
          <h1>{spec.label}: the long way round</h1>
          <p className="who">
            {all} stops, {done} behind you. Start anywhere &mdash; the order is
            advice, not a gate.
          </p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to="/review">Review mistakes</Link>
          <Link className="btn-sm" to="/homework">Homework</Link>
          <Link className="btn-sm" to="/">Switch test</Link>
        </div>
      </div>

      <div className="bar good journey-overall">
        <i style={{ width: `${all ? (done / all) * 100 : 0}%` }} />
      </div>

      <div className="road">
        {chapters.map((c, i) => (
          <ChapterCard key={c.id} chapter={c} index={i}
            open={openChapter === c.id}
            onToggle={() => setOpenChapter(openChapter === c.id ? null : c.id)}
            onStage={(leg, subtype) => setStage({ leg, subtype })}
            onTrial={(leg) => setTrialLeg(leg)} />
        ))}
      </div>
    </div>
  )
}

function ChapterCard({
  chapter, index, open, onToggle, onStage, onTrial,
}: {
  chapter: Chapter
  index: number
  open: boolean
  onToggle: () => void
  onStage: (leg: Leg, subtype: string) => void
  onTrial: (leg: Leg) => void
}) {
  const pct = chapter.stages ? (chapter.cleared / chapter.stages) * 100 : 0
  const state = pct >= 100 ? 'done' : pct > 0 ? 'under-way' : 'ahead'

  return (
    <section className={`chapter ${state}`}>
      <button className="chapter-head" onClick={onToggle} aria-expanded={open}>
        <span className="chapter-n">{romanise(index + 1)}</span>
        <span className="chapter-body">
          <span className="chapter-t">{chapter.name}</span>
          <span className="chapter-d">
            {chapter.legs.length} leg{chapter.legs.length === 1 ? '' : 's'} &middot;{' '}
            {chapter.cleared} of {chapter.stages} stops cleared
          </span>
          <span className="bar thin"><i style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="chapter-chevron">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="chapter-legs">
          {chapter.legs.map((leg) => (
            <div className="leg" key={leg.skill}>
              <div className="leg-name">{leg.name}</div>
              <ol className="stops">
                {leg.stages.map((s) => (
                  <li key={s.subtype}>
                    <button className={`stop ${s.cleared ? 'cleared' : s.seen ? 'started' : ''}`}
                      onClick={() => onStage(leg, s.subtype)}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">{s.name}</span>
                        <span className="stop-d">
                          {s.total} question{s.total === 1 ? '' : 's'}
                          {s.accuracy !== null && ` · ${Math.round(s.accuracy * 100)}%`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {leg.trial && (
                  <li>
                    <button className="stop trial" onClick={() => onTrial(leg)}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">Trial: reading the question</span>
                        <span className="stop-d">
                          {leg.trial.families.length} ways these get asked
                        </span>
                      </span>
                    </button>
                  </li>
                )}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function romanise(n: number): string {
  const table: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let left = n
  for (const [value, sign] of table) {
    while (left >= value) {
      out += sign
      left -= value
    }
  }
  return out
}
