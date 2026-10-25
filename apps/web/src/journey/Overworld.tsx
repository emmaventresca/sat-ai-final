import { useEffect, useRef, useState } from 'react'
import type { Region, Terrain } from './map'
import { standingOf, worldFor, type Landmark } from './overworldPlaces'
import './overworld.css'

/**
 * The world map: the level above the lands.
 *
 * Clicking a landmark does not cut to the land. The frame pushes toward
 * the point that was clicked - transform-origin set to the landmark, so
 * the camera moves to where the eye already is - and hands over at the top
 * of the move. That is the whole trick for making a change of scale read
 * as travel rather than as a page swap, and it is the same move as the
 * overture's, one level down.
 *
 * It degrades to a plain cut under prefers-reduced-motion, and it degrades
 * to nothing at all for an exam with no world plate: Journey still renders
 * the atlas underneath, so a section without art is a section that looks
 * the way it did last week rather than a section with a hole in it.
 */
export function Overworld({ exam, regions, onOpen }: {
  exam: string
  regions: Region[]
  onOpen: (regionId: string) => void
}) {
  const world = worldFor(exam)
  const [flying, setFlying] = useState<Landmark | null>(null)
  const [reached, setReached] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  if (!world) return null

  const here = regions
    .map((r) => ({ region: r, at: world.lands[r.terrain as Terrain] }))
    .filter((p): p is { region: Region; at: Landmark } => Boolean(p.at))
  if (!here.length) return null

  const travel = (region: Region, at: Landmark) => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { onOpen(region.id); return }
    setFlying(at)
    timer.current = setTimeout(() => {
      onOpen(region.id)
      setFlying(null)
    }, 720)
  }

  return (
    <section className={`ow ${flying ? 'ow-flying' : ''}`}
      aria-label={`${world.name}: the lands of the ${exam.toUpperCase()}`}>
      <div className="ow-frame"
        style={flying
          ? { transformOrigin: `${flying.x}% ${flying.y}%` }
          : undefined}>
        <img className="ow-plate"
          src={`${import.meta.env.BASE_URL}${world.plate}`} alt="" />
        <div className="ow-sky" aria-hidden="true" />

        {here.map(({ region, at }) => {
          const standing = standingOf(region.cleared, region.stages)
          return (
            <button key={region.id}
              className={`ow-mark ow-${standing} ow-${at.side ?? 'right'}`}
              style={{ left: `${at.x}%`, top: `${at.y}%` }}
              onClick={() => travel(region, at)}
              onMouseEnter={() => setReached(region.id)}
              onMouseLeave={() => setReached(null)}
              onFocus={() => setReached(region.id)}
              onBlur={() => setReached(null)}
              aria-label={`${at.name}. ${region.name}. `
                + `${region.cleared} of ${region.stages} stops walked.`}>
              <span className="ow-pin" aria-hidden="true">
                <i /><em />
              </span>
              <span className="ow-label" aria-hidden="true">{at.name}</span>
              <span className={`ow-card ${reached === region.id ? 'on' : ''}`}>
                <span className="ow-kind">{region.name}</span>
                <span className="ow-name">{at.name}</span>
                <span className="ow-note">{at.note}</span>
                <span className="ow-rule" aria-hidden="true">
                  <i style={{
                    width: region.stages
                      ? `${(region.cleared / region.stages) * 100}%` : '0%',
                  }} />
                </span>
                <span className="ow-count">
                  {region.cleared} of {region.stages} stops
                  {region.left ? ` · ${region.left} questions left` : ''}
                </span>
              </span>
            </button>
          )
        })}

        {/* One docked panel for narrow screens.
            
            A card centred on its own pin overflows the frame as soon as
            the pin is near an edge - at 74% across, half of it is off the
            picture, which is where "0 of 72 stops · 3490 questions lef"
            came from. Phones get a single panel docked to the frame, the
            way a map application does it; the per-pin cards are desktop
            only, where there is room beside the pin. */}
        {(() => {
          const sel = here.find((p) => p.region.id === reached) ?? here[0]
          if (!sel) return null
          return (
            <div className={`ow-detail ${reached ? 'on' : ''}`} aria-hidden="true">
              <span className="ow-kind">{sel.region.name}</span>
              <span className="ow-name">{sel.at.name}</span>
              <span className="ow-note">{sel.at.note}</span>
              <span className="ow-rule">
                <i style={{
                  width: sel.region.stages
                    ? `${(sel.region.cleared / sel.region.stages) * 100}%` : '0%',
                }} />
              </span>
              <span className="ow-count">
                {sel.region.cleared} of {sel.region.stages} stops
              </span>
            </div>
          )
        })()}

        <div className="ow-cartouche">
          <p className="ow-eyebrow">The world</p>
          <h2>{world.name}</h2>
          <p className="ow-sub">
            {here.length} lands. Choose one and go in.
          </p>
        </div>

        <svg className="ow-compass" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="38" />
          <path d="M50 6 L57 47 L50 94 L43 47 Z" />
          <path d="M6 50 L47 43 L94 50 L47 57 Z" className="ow-compass-dim" />
          <text x="50" y="15" textAnchor="middle">N</text>
        </svg>
      </div>
    </section>
  )
}
