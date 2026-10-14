import { useMemo } from 'react'
import type { Exam } from '../exams/types'
import type { Region, Terrain } from './map'
import { realBackdrops, THEME } from './backdrops'
import { HERO } from './places'
import './atlas.css'

/**
 * The journey as an atlas: one surveyed plate per world.
 *
 * Emma's reference was a hotel page whose hero is a real nautical chart -
 * soundings, a compass rose, a scale bar - with a plate-numbered photograph
 * laid over it and a caption written by a person. The transferable idea is
 * not the chart itself; it is that the page behaves like a DOCUMENT someone
 * surveyed rather than a dashboard someone configured.
 *
 * So each world gets a plate: its own photograph, a roman numeral, a
 * measured rule showing how far along the route the student is, and a
 * caption in the product's own voice. The six plates read as one atlas
 * because they share the furniture, not because they share a colour.
 *
 * A world with no photograph yet does not get a blank frame. It says the
 * plate is unmade, which is true and is the same discipline the rest of the
 * app uses about evidence.
 */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

export function Atlas({ regions, exam, onOpen }: {
  regions: Region[]
  exam: Exam
  onOpen: (regionId: string) => void
}) {
  if (!regions.length) return null
  return (
    <section className="atlas" aria-label="The atlas">
      <header className="atlas-head">
        <span className="atlas-rail" aria-hidden="true">THE ATLAS</span>
        <h2>{exam.toUpperCase()} &mdash; {regions.length} lands</h2>
        <p>
          Every recognition on the test, surveyed and laid out as a route.
          The plates are in the order you walk them.
        </p>
      </header>
      {regions.map((region, i) => (
        <Plate key={region.id} region={region} n={i} onOpen={onOpen} />
      ))}
    </section>
  )
}

function Plate({ region, n, onOpen }: {
  region: Region
  n: number
  onOpen: (id: string) => void
}) {
  const terrain = region.terrain as Terrain
  const art = useMemo(() => realBackdrops(terrain), [terrain])
  // The same plate the land itself opens on. Taking art[0] instead meant
  // the card promised "Waikiki Beach - where this land begins" and then the
  // land began somewhere else, which makes the caption a lie and the card
  // picture a stranger to the one behind the hotspots.
  const want = HERO[terrain]
  const hero = art.find((x) => x.scene === want) ?? art[0]
  const pct = region.stages ? (region.cleared / region.stages) * 100 : 0
  const theme = THEME[terrain]

  return (
    <article className={`plate plate-${terrain}`}>
      <div className="plate-figure">
        {hero
          ? <img className="plate-img" src={hero.src} alt="" loading="lazy" />
          : <div className="plate-unmade">
              <span>Plate {ROMAN[n] ?? n + 1} is unmade</span>
              <em>No photograph for this land yet</em>
            </div>}
        <span className="plate-no" aria-hidden="true">
          PLATE {ROMAN[n] ?? n + 1}
        </span>
      </div>

      <div className="plate-body">
        <span className="plate-kind">{theme.section}</span>
        <h3>{theme.name}</h3>
        {hero && (
          <p className="plate-caption">
            {prettyScene(hero.scene)} &mdash; where this land begins.
          </p>
        )}

        {/* The measured rule: ticks for every stop, filled to where they
            have actually got to. A bar would say the same thing without
            saying it is a survey. */}
        <div className="plate-rule" role="img"
          aria-label={`${region.cleared} of ${region.stages} stops cleared`}>
          <span className="plate-rule-fill" style={{ width: `${pct}%` }} />
          <span className="plate-ticks" aria-hidden="true">
            {Array.from({ length: Math.min(region.stages, 40) }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </div>
        <p className="plate-count">
          <strong>{region.cleared}</strong> of {region.stages} stops
          {region.left > 0 && <> &middot; {region.left} questions left</>}
        </p>

        <button className="plate-go" onClick={() => onOpen(region.id)}>
          Adventure through this land
          <span aria-hidden="true"> &rarr;</span>
        </button>
      </div>
    </article>
  )
}

function prettyScene(slug: string): string {
  return slug.split('-')
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase())
}
