import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Exam } from '../exams/types'
import { examSpec } from '../exams/registry'
import { loadIndex, type QuestionRef } from '../lib/bank'
import { buildJourney, type Chapter, type Leg, type Region, type SkillMeta } from './map'
import { StageView } from './Stage'
import { WorldMap } from './WorldMap'
import { DAILY_GOAL, rankOf, streakOf, todayCount } from './quest'

/**
 * The map, not the inventory.
 *
 * Four levels, because the test has four and flattening any of them loses
 * something a student uses: the REGION is how they think about tonight ("I
 * am doing maths"), the REALM is how the score report breaks down, the PATH
 * is what a lesson is about, and the STOP is the thing they are actually
 * getting wrong.
 *
 * The game layer on top changes nothing about what gets practised - the
 * ranking engine decides that from the band model - and everything about
 * whether they come back tomorrow, which is the variable that makes the rest
 * of it matter at all.
 *
 * Nothing is locked. The route says what the sensible order IS, which is a
 * different thing from refusing to let anyone leave it.
 */
export function Journey({ exam }: { exam: Exam }) {
  const [bank, setBank] = useState<QuestionRef[]>([])
  const [skills, setSkills] = useState<SkillMeta[]>([])
  const [openRealm, setOpenRealm] = useState<string | null>(null)
  const [stage, setStage] = useState<{ leg: Leg; subtype: string } | null>(null)
  const [trialLeg, setTrialLeg] = useState<Leg | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let live = true
    void loadIndex(exam).then((b) => live && setBank(b))
    void fetch(`${import.meta.env.BASE_URL}data/skills.json`)
      .then((r) => r.json())
      .then((b: { skills?: SkillMeta[] }) => live && setSkills(b.skills ?? []))
      .catch(() => undefined)
    return () => { live = false }
  }, [exam])

  useEffect(() => { setOpenRealm(null); setStage(null); setTrialLeg(null) }, [exam])

  const regions = useMemo(
    () => (bank.length ? buildJourney(exam, bank, skills) : []),
    [exam, bank, skills, version],
  )
  const realms = useMemo(() => regions.flatMap((r) => r.chapters), [regions])

  const rank = useMemo(() => rankOf(exam), [exam, version])
  const streak = useMemo(() => streakOf(exam), [exam, version])
  const today = useMemo(() => todayCount(exam), [exam, version])

  if (stage || trialLeg) {
    return (
      <StageView exam={exam} bank={bank}
        leg={stage?.leg ?? (trialLeg as Leg)}
        subtype={stage?.subtype ?? null}
        onBack={() => { setStage(null); setTrialLeg(null); setVersion((v) => v + 1) }} />
    )
  }

  const cleared = regions.reduce((n, r) => n + r.cleared, 0)
  const all = regions.reduce((n, r) => n + r.stages, 0)

  return (
    <div className="wrap wide journey">
      <div className="top">
        <div>
          <h1>{examSpec(exam).label}: the long road</h1>
          <p className="who">
            {cleared} of {all} stops behind you. Start anywhere &mdash; the
            route is advice, not a gate.
          </p>
        </div>
        <div className="row tight">
          <Link className="btn-sm" to="/review">Review mistakes</Link>
          <Link className="btn-sm" to="/homework">Homework</Link>
          <Link className="btn-sm" to="/">Switch test</Link>
        </div>
      </div>

      <div className="questbar">
        <div className="qb-rank">
          <div className="qb-level">{rank.level}</div>
          <div>
            <div className="qb-title">{rank.title}</div>
            <div className="qb-xp">{rank.xp} XP</div>
            <div className="qb-track">
              <i style={{ width: `${(rank.into / rank.span) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="qb-stat">
          <div className="qb-n">{streak}</div>
          <div className="qb-l">day{streak === 1 ? '' : 's'} running</div>
        </div>
        <div className="qb-stat">
          <div className="qb-n">{today}<span className="qb-of">/{DAILY_GOAL}</span></div>
          <div className="qb-l">today</div>
          <div className="qb-track small">
            <i style={{ width: `${Math.min(100, (today / DAILY_GOAL) * 100)}%` }} />
          </div>
        </div>
      </div>

      <WorldMap chapters={realms} openId={openRealm}
        onPick={(id) => setOpenRealm(openRealm === id ? null : id)} />

      {regions.map((region) => (
        <section className="region" key={region.id}>
          <div className="region-head">
            <h2>{region.name}</h2>
            <span className="region-count">
              {region.cleared}/{region.stages} stops
            </span>
          </div>
          {region.chapters.map((chapter) => (
            <RealmCard key={chapter.id} chapter={chapter}
              open={openRealm === chapter.id}
              onToggle={() => setOpenRealm(openRealm === chapter.id ? null : chapter.id)}
              onStage={(leg, subtype) => setStage({ leg, subtype })}
              onTrial={(leg) => setTrialLeg(leg)} />
          ))}
        </section>
      ))}
    </div>
  )
}

function RealmCard({
  chapter, open, onToggle, onStage, onTrial,
}: {
  chapter: Chapter
  open: boolean
  onToggle: () => void
  onStage: (leg: Leg, subtype: string) => void
  onTrial: (leg: Leg) => void
}) {
  const pct = chapter.stages ? (chapter.cleared / chapter.stages) * 100 : 0
  const state = pct >= 100 ? 'done' : pct > 0 ? 'under-way' : 'ahead'

  return (
    <div className={`realm-card ${state}`} id={`realm-${chapter.id}`}>
      <button className="realm-head" onClick={onToggle} aria-expanded={open}>
        <span className="realm-seal">{pct >= 100 ? '★' : chapter.legs.length}</span>
        <span className="realm-body">
          <span className="realm-t">{chapter.name}</span>
          <span className="realm-d">
            {chapter.legs.length} path{chapter.legs.length === 1 ? '' : 's'} &middot;{' '}
            {chapter.cleared} of {chapter.stages} stops
          </span>
          <span className="qb-track"><i style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="realm-chevron">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="realm-paths">
          {chapter.legs.map((leg) => (
            <div className="path" key={leg.skill}>
              <div className="path-name">
                {leg.name}
                <span className="path-count">{leg.cleared}/{leg.stages.length}</span>
              </div>
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
                      {s.cleared && <span className="stop-seal">✓</span>}
                    </button>
                  </li>
                ))}
                {leg.trial && (
                  <li>
                    <button className="stop trial" onClick={() => onTrial(leg)}>
                      <span className="stop-dot" aria-hidden="true" />
                      <span className="stop-body">
                        <span className="stop-t">Trial &mdash; reading the question</span>
                        <span className="stop-d">
                          {leg.trial.families.length} ways these get asked
                        </span>
                      </span>
                      <span className="stop-seal">⚔</span>
                    </button>
                  </li>
                )}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export type { Region }
