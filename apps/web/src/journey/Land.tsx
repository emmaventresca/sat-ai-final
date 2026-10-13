import { useMemo, useState } from 'react'
import type { Exam, Tier } from '../exams/types'
import type { Chapter, Leg, Region, Stage } from './map'
import { realBackdrops } from './backdrops'
import { Vignette, VIBE, VIBE_NAME, type Vibe } from './Hubs'
import './land.css'

/**
 * A land, on its own page, zoomed into one level at a time.
 *
 * The first map tried to show every recognition at once: 111 icons in
 * serpentine rows, which is a spreadsheet with a compass drawn on it.
 * Nothing was anywhere for a reason.
 *
 * A section is four domains; a domain is a handful of skills; a skill is a
 * handful of recognitions. That is already a map with three zoom levels in
 * it, and the College Board drew it, not us. So you stand in a land, see its
 * settlements, walk into one, and find the smaller places inside it - and
 * the thing you are looking at is never more than about seven pods, which is
 * the number a person can actually scan.
 *
 * Depth is the whole point. A list of 111 topics tells a student nothing
 * about where they are; walking down into "Algebra, then linear functions,
 * then reading slope off a graph" tells them exactly where they are and what
 * the thing above it was.
 */
export interface Pod {
  key: string
  name: string
  sub: string
  cleared: number
  total: number
  left: number
  /** Where it sits on the land, as percentages. */
  x: number
  y: number
}

/** Seeded, so a land is the same country every time it is opened. */
function seeded(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (Math.abs(h) % 10000) / 10000
}

/**
 * Scatter pods around the land without letting any two collide.
 *
 * A ring rather than a grid: a grid is the spreadsheet again, and a ring
 * reads as places arranged around a valley. The seeded jitter keeps it from
 * looking like a clock face.
 */
function place<T extends { key: string }>(items: T[]): (T & { x: number; y: number })[] {
  const n = items.length
  return items.map((it, i) => {
    if (n === 1) return { ...it, x: 50, y: 52 }
    const t = i / n
    const angle = t * Math.PI * 2 - Math.PI / 2
    const wobble = (seeded(it.key) - 0.5) * 0.18
    const rx = 31 + wobble * 22
    const ry = 25 + wobble * 16
    return {
      ...it,
      x: 50 + Math.cos(angle) * rx,
      y: 50 + Math.sin(angle) * ry,
    }
  })
}

export function Land({ region, exam, onExit, onPractise }: {
  region: Region
  exam: Exam
  onExit: () => void
  onPractise: (leg: Leg, subtype: string, tier: Tier | null) => void
}) {
  const [domainId, setDomainId] = useState<string | null>(null)
  const [skillId, setSkillId] = useState<string | null>(null)

  const domain = region.chapters.find((c) => c.id === domainId) ?? null
  const skill = domain?.legs.find((l) => l.skill === skillId) ?? null
  const vibe: Vibe = (domain && VIBE[domain.name]) || 'valley'

  const pods = useMemo<Pod[]>(() => {
    if (skill) {
      return place(skill.stages.map((st: Stage) => ({
        key: st.subtype,
        name: st.name,
        sub: st.tests || `${st.total} questions`,
        cleared: st.cleared ? 1 : 0,
        total: 1,
        left: st.left,
      })))
    }
    if (domain) {
      return place(domain.legs.map((leg) => ({
        key: leg.skill,
        name: leg.name,
        sub: `${leg.stages.length} question type${leg.stages.length === 1 ? '' : 's'}`,
        cleared: leg.cleared,
        total: leg.stages.length,
        left: leg.left,
      })))
    }
    return place(region.chapters.map((c: Chapter) => ({
      key: c.id,
      name: c.name,
      sub: VIBE_NAME[VIBE[c.name] ?? 'valley'],
      cleared: c.cleared,
      total: c.stages,
      left: c.left,
    })))
  }, [region, domain, skill])

  const art = useMemo(() => realBackdrops(region.terrain as never), [region.terrain])
  const hero = art[Math.min(art.length - 1, domain ? 2 : 0)]

  function onPod(p: Pod) {
    if (skill) { onPractise(skill, p.key, null); return }
    if (domain) { setSkillId(p.key); return }
    setDomainId(p.key)
  }

  const title = skill?.name ?? domain?.name ?? region.name
  // "4 four lands" was the first version of this line. The count is already
  // printed, so the noun must not carry one too.
  const standing = skill ? 'question types' : domain ? 'skills in this land' : 'lands'

  return (
    <div className={`land land-${vibe}`}>
      {hero && <img className="land-bg" src={hero.src} alt="" />}
      <div className="land-scrim" aria-hidden="true" />

      <header className="land-top">
        <button className="land-back" onClick={() => {
          if (skill) setSkillId(null)
          else if (domain) setDomainId(null)
          else onExit()
        }}>
          &larr; {skill ? domain?.name : domain ? region.name : 'Back to the map'}
        </button>
        <nav className="land-crumbs" aria-label="Where you are">
          <button className={!domain ? 'on' : ''}
            onClick={() => { setDomainId(null); setSkillId(null) }}>
            {region.name}
          </button>
          {domain && (
            <>
              <span aria-hidden="true">/</span>
              <button className={!skill ? 'on' : ''} onClick={() => setSkillId(null)}>
                {domain.name}
              </button>
            </>
          )}
          {skill && (<><span aria-hidden="true">/</span><button className="on">{skill.name}</button></>)}
        </nav>
        <span className="land-exam">{exam.toUpperCase()}</span>
      </header>

      <div className="land-title">
        <h1>{title}</h1>
        <p>
          {pods.length} {standing}
          {skill
            ? ` · ${skill.stages.filter((s: Stage) => s.cleared).length} of ${skill.stages.length} cleared`
            : domain
              ? ` · ${domain.cleared} of ${domain.stages} stops cleared`
              : ` · ${region.cleared} of ${region.stages} stops cleared`}
        </p>
      </div>

      <div className="land-field">
        {pods.map((p) => (
          <button key={p.key} className={`pod${p.cleared >= p.total ? ' done' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onPod(p)}>
            <span className="pod-art">
              {!domain
                ? <Vignette vibe={VIBE[p.name] ?? 'valley'} />
                : <Ring done={p.cleared} total={p.total} />}
            </span>
            <span className="pod-body">
              <strong>{p.name}</strong>
              <em>{p.sub}</em>
              <span className="pod-n">
                {skill
                  ? (p.cleared ? 'cleared' : `${p.left} left`)
                  : `${p.cleared}/${p.total}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Progress as a ring, because a pod is round and a bar would fight it. */
function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="pod-ring" aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="pod-ring-bg" />
      <circle cx="32" cy="32" r={r} className="pod-ring-fg"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 32 32)" />
      <text x="32" y="37" className="pod-ring-t">{done}</text>
    </svg>
  )
}
