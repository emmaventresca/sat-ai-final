import { useMemo, useState } from 'react'
import type { Exam, Tier } from '../exams/types'
import type { Chapter, Leg, Region, Stage, Terrain } from './map'
import { backdrop, realBackdrops } from './backdrops'
import { fallbackSpot, HERO, ROUTE, SPOTS } from './places'
import { innerMapFor, siteArt, type MapPlace } from './innermap'
import { VIBE, VIBE_NAME, type Vibe } from './Hubs'
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
  /** Where it sits ON the photograph, as percentages. */
  x: number
  y: number
  /** The scene slug you arrive at, where one is authored. */
  into?: string
  /** What this place is called in this photograph. */
  place: string
}

/**
 * Anchor each pod to its feature in the photograph.
 *
 * Authored coordinates first, because a label on the actual valley is the
 * entire point; the ring is only what happens when nobody has looked at that
 * picture yet.
 */
function anchor<T extends { key: string; name: string }>(
  items: T[], terrain: Terrain, authored: boolean,
): (T & { x: number; y: number; into?: string; place: string })[] {
  const table = SPOTS[terrain] ?? {}
  return items.map((it, i) => {
    const spot = authored ? table[it.name] : undefined
    const at = spot ?? fallbackSpot(i, items.length, it.name)
    return { ...it, x: at.x, y: at.y, into: spot?.into, place: at.name }
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
  /**
   * The place this skill sits on, which is also the plate you stand on
   * once you walk into it. Bound by position in the land's own leg order,
   * so Moonlit Lake is the same skill every visit.
   */
  const site: MapPlace | null = useMemo(() => {
    if (!domain || !skill) return null
    const map = innerMapFor(domain.name)
    const i = domain.legs.findIndex((l) => l.skill === skill.skill)
    return i < 0 ? null : map.places[i % map.places.length]
  }, [domain, skill])
  const vibe: Vibe = (domain && VIBE[domain.name]) || 'valley'

  const pods = useMemo<Pod[]>(() => {
    if (skill) {
      return anchor(skill.stages.map((st: Stage) => ({
        key: st.subtype,
        name: st.name,
        sub: st.tests || `${st.total} questions`,
        cleared: st.cleared ? 1 : 0,
        total: 1,
        left: st.left,
      })), region.terrain as Terrain, false)
    }
    if (domain) {
      // On the drawn map the skills take its own named places, in walking
      // order. A ring of pods over a picture is not a map; standing on
      // Cedar Lake and Old Chapel Ruins is.
      const map = innerMapFor(domain.name)
      return domain.legs.map((leg, i) => {
        const at = map.places[i % map.places.length]
        return {
          key: leg.skill,
          name: leg.name,
          sub: `${leg.stages.length} question type${leg.stages.length === 1 ? '' : 's'}`,
          cleared: leg.cleared,
          total: leg.stages.length,
          left: leg.left,
          x: at.x,
          y: at.y,
          place: at.name,
        }
      })
    }
    return anchor(region.chapters.map((c: Chapter) => ({
      key: c.id,
      name: c.name,
      sub: VIBE_NAME[VIBE[c.name] ?? 'valley'],
      cleared: c.cleared,
      total: c.stages,
      left: c.left,
    })), region.terrain as Terrain, true)
  }, [region, domain, skill])

  const art = useMemo(() => realBackdrops(region.terrain as Terrain), [region.terrain])
  /**
   * The photograph you are standing in.
   *
   * At the top it is the land's first picture. Inside a domain it is the
   * picture that domain's hotspot said it leads to - a DIFFERENT photograph,
   * not a crop, because zooming a backdrop gets you blur and cutting to a
   * closer view of that country is what makes the move feel like arriving.
   */
  const [arrived, setArrived] = useState<string | null>(null)
  const inner = domain ? innerMapFor(domain.name) : null
  const hero = useMemo(() => {
    if (arrived) {
      const b = backdrop(region.terrain as Terrain,
        Math.max(0, art.findIndex((x) => x.scene === arrived)))
      if (!b.placeholder && b.scene === arrived) return b
      const found = art.find((x) => x.scene === arrived)
      if (found) return found
    }
    // The land opens on the picture its hotspots were authored against.
    const want = HERO[region.terrain as Terrain]
    return art.find((x) => x.scene === want) ?? art[0]
  }, [arrived, art, region.terrain])

  /** Where the zoom is heading, so the photograph grows toward the place. */
  const [zoomAt, setZoomAt] = useState<{ x: number; y: number } | null>(null)

  function onPod(p: Pod) {
    if (skill) { onPractise(skill, p.key, null); return }
    // Grow the picture toward the spot that was clicked, then arrive.
    setZoomAt({ x: p.x, y: p.y })
    window.setTimeout(() => {
      if (domain) setSkillId(p.key)
      else { setDomainId(p.key); if (p.into) setArrived(p.into) }
      setZoomAt(null)
    }, 420)
  }

  function back() {
    if (skill) { setSkillId(null); return }
    if (domain) { setDomainId(null); setArrived(null); return }
    onExit()
  }

  const title = skill?.name ?? domain?.name ?? region.name
  // "4 four lands" was the first version of this line. The count is already
  // printed, so the noun must not carry one too.
  const standing = skill ? 'question types' : domain ? 'skills in this land' : 'lands'

  return (
    <div className={`land land-${vibe}`}>
      {/* The sheet everything sits on: a warm wash, grain, and a handled
          edge, multiplied over the photograph so the road and the labels
          are printed on the same paper rather than floating above it. */}
      {/* The wash belongs over a photograph, not over artwork that is
          already a map - it would only muddy someone else's drawing. */}
      {!inner && <div className="land-paper" aria-hidden="true" />}
      <svg className="land-grain" aria-hidden="true">
        <filter id="land-grain-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4"
            stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#land-grain-f)" />
      </svg>
      <div className="land-vignette" aria-hidden="true" />
      <div className="land-scrim" aria-hidden="true" />

      <header className="land-top">
        <button className="land-back" onClick={back}>
          &larr; {skill
            ? domain?.name
            : domain
              ? `Back to ${region.name}`
              : 'Back to the adventure map'}
        </button>
        <nav className="land-crumbs" aria-label="Where you are">
          <button className={!domain ? 'on' : ''}
            onClick={() => { setDomainId(null); setSkillId(null); setArrived(null) }}>
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
        {inner && !skill && (
          <p className="land-motto">
            {inner.title} &mdash; <em>{inner.motto}</em>
          </p>
        )}
        {site && <p className="land-motto land-at">{site.name}</p>}
        <p>
          {pods.length} {standing}
          {skill
            ? ` · ${skill.stages.filter((s: Stage) => s.cleared).length} of ${skill.stages.length} cleared`
            : domain
              ? ` · ${domain.cleared} of ${domain.stages} stops cleared`
              : ` · ${region.cleared} of ${region.stages} stops cleared`}
        </p>
      </div>

      <div className="land-stage">
      {site ? (
        <img className={`land-bg land-drawn${zoomAt ? ' zooming' : ''}`}
          src={`${import.meta.env.BASE_URL}${siteArt(site.slug)}`} alt={site.name}
          key={site.slug}
          style={zoomAt ? { transformOrigin: `${zoomAt.x}% ${zoomAt.y}%` } : undefined} />
      ) : inner ? (
        <img className={`land-bg land-drawn${zoomAt ? ' zooming' : ''}`}
          src={`${import.meta.env.BASE_URL}${inner.src}`} alt={inner.title}
          key={inner.src}
          style={zoomAt ? { transformOrigin: `${zoomAt.x}% ${zoomAt.y}%` } : undefined} />
      ) : hero && (
        <img className={`land-bg${zoomAt ? ' zooming' : ''}`} src={hero.src} alt=""
          key={hero.src}
          style={zoomAt
            ? { transformOrigin: `${zoomAt.x}% ${zoomAt.y}%` }
            : undefined} />
      )}
      <div className={`land-field${zoomAt ? ' zooming' : ''}`}>
        {/* The road, but only where there is a journey to describe.
            Inside a single question type the boxes are five ways of asking
            the same thing, not stops on a route - a line threading them
            invents an order that does not exist, and at this depth it
            looped back over the artwork besides. */}
        {!skill && (
          <Route pods={pods}
            along={!domain
              ? ROUTE[region.terrain as Terrain]
              : inner
                ? [inner.entry, ...pods.map((p) => [p.x, p.y] as [number, number]),
                   inner.exit]
                : undefined} />
        )}

        {pods.map((p) => (!domain ? (
          /* On the land itself the marker sits ON its feature - the meadow,
             the ridge - so clicking the valley is clicking the valley. */
          <button key={p.key} className={`spot${p.cleared >= p.total ? ' done' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onPod(p)}>
            <span className="spot-pin" aria-hidden="true">
              <i /><em />
            </span>
            <span className="spot-plate">
              <strong>{p.place}</strong>
              <em>{p.name}</em>
              <span className="spot-n">{p.cleared}/{p.total}</span>
            </span>
          </button>
        ) : (
          <button key={p.key} className={`pod${p.cleared >= p.total ? ' done' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onPod(p)}>
            <span className="pod-art"><Ring done={p.cleared} total={p.total} /></span>
            <span className="pod-body">
              {/* The site first: on a map you go to Moonlit Lake, and the
                  work is what you do when you get there. */}
              {!skill && p.place !== p.name && (
                <span className="pod-place">{p.place}</span>
              )}
              <strong>{p.name}</strong>
              <em>{p.sub}</em>
              <span className="pod-n">
                {skill ? (p.cleared ? 'cleared' : `${p.left} left`) : `${p.cleared}/${p.total}`}
              </span>
            </span>
          </button>
        )))}
      </div>
      </div>
    </div>
  )
}

/**
 * The dotted route through the pods, in order, with direction.
 *
 * Drawn in its own SVG at viewBox 100x100 so it shares the pods' percentage
 * coordinates exactly: anything pixel-based would drift the moment the
 * window changed, and the line would stop meeting the places it connects.
 */
/**
 * A path that wanders between the places instead of cornering at them.
 *
 * Straight segments made the route a zigzag of hard angles, which reads as
 * a diagram laid over the country rather than a track worn across it.
 * Catmull-Rom through the same points gives a line that leans into each
 * turn and passes exactly through every place, which is what a path does.
 */
function meander(ps: Pod[]): string {
  const d = [`M ${ps[0].x.toFixed(2)} ${ps[0].y.toFixed(2)}`]
  for (let i = 0; i < ps.length - 1; i++) {
    const p0 = ps[i - 1] ?? ps[i]
    const p1 = ps[i]
    const p2 = ps[i + 1]
    const p3 = ps[i + 2] ?? p2
    // A looser tension than the usual 6 gives the line more swing between
    // places, which is the difference between a route and a ruler.
    const k = 4.2
    d.push(`C ${(p1.x + (p2.x - p0.x) / k).toFixed(2)} ${(p1.y + (p2.y - p0.y) / k).toFixed(2)}, `
      + `${(p2.x - (p3.x - p1.x) / k).toFixed(2)} ${(p2.y - (p3.y - p1.y) / k).toFixed(2)}, `
      + `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`)
  }
  return d.join(' ')
}

function Route({ pods, along }: { pods: Pod[]; along?: [number, number][] }) {
  if (pods.length < 2) return null
  // An authored road beats a line between the places: it knows the valley
  // floor is passable and the cliff is not.
  const pts: Pod[] = along
    ? along.map(([x, y], i) => ({ ...pods[0], key: `w${i}`, x, y }))
    : pods
  const d = meander(pts)
  return (
    <svg className="land-route" viewBox="0 0 100 100" preserveAspectRatio="none"
      aria-hidden="true">
      <defs>
        <marker id="land-arrow" viewBox="0 0 10 10" refX="7" refY="5"
          markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9 z" fill="rgba(255,232,170,.95)" />
        </marker>
      </defs>
      {/* Two strokes, the way a printed map draws a road: a dark casing so
          the line survives pale pasture, and light dashes over it so it
          survives dark woodland. One stroke only ever works on half a
          photograph - the first version vanished into the trees. */}
      <path d={d} className="land-route-case" />
      <path d={d} className="land-route-line" />
      {/* Arrowheads on each leg rather than one at the end, so direction is
          readable wherever the eye lands. */}
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1]
        return (
          <path key={p.key} className="land-route-arrow"
            d={`M ${p.x.toFixed(2)} ${p.y.toFixed(2)} L ${((p.x + q.x) / 2).toFixed(2)} `
              + `${((p.y + q.y) / 2).toFixed(2)}`}
            markerEnd="url(#land-arrow)" />
        )
      })}
      <circle cx={pts[0].x} cy={pts[0].y} r="1.5" className="land-route-start" />
    </svg>
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
