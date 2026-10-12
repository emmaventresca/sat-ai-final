import type { Exam } from '../exams/types'
import { type Terrain } from './map'
import { backdropFor } from './backdrops'
import { QuestScene } from './QuestScenes'
import { VoyageScene } from './VoyageScenes'
import { ParksScene } from './ParksPosters'
import { FairPoster } from './FairPosters'
import { AlpinePoster } from './AlpinePosters'
import { TropicPoster } from './TropicPosters'
import { WORLDS } from './art'
import { atmosphereDefs, scatter, softRidge, treeRidge } from './atmosphere'
import { FairScene } from './FairScenes'
import { PeaksScene } from './PeaksScenes'
import { TropicScene } from './TropicScenes'
import { ParkScene } from './ParkScenes'
import { CliffsScene, OceanScene } from './CoastScenes'

/**
 * The land behind a question, painted rather than assembled.
 *
 * Three earlier versions of this were hard-edged polygon stacks and all three
 * read as coloured blocks. The palette was never the problem. A landscape
 * reads as painted because of EDGES and AIR: nothing has a mathematical
 * boundary, distance drains contrast and pulls colour toward the sky, and a
 * ridgeline is a thousand trees rather than five points.
 *
 * So every layer here goes through a turbulence displacement that breaks its
 * edge, a blur that grows with distance, and a haze pass in the sky's own
 * colour. The near layers are drawn as hundreds of small irregular firs. The
 * clouds are turbulence shaped into wisps rather than ellipses.
 *
 * Each world keeps its own character through its palette, how dense and tall
 * its treeline is, how far the ridges rise, and whether it has water to
 * reflect into - not through a different set of polygons.
 */
export const VARIANTS = 10

export function QuestionScene({
  exam, section, seed,
}: {
  exam: Exam
  section: string
  seed: string
}) {
  const art = backdropFor(exam, section, seed)

  // Real artwork when it exists. The drawn scene is a PLACEHOLDER and is
  // labelled as one - nothing here quietly substitutes a gradient for a
  // painting, because that is how you ship forty placeholders believing
  // they are art.
  if (!art.placeholder) {
    return (
      <img className={`scene scene-art scene-${art.terrain}`} src={art.src}
        alt="" aria-hidden="true" decoding="async" loading="eager" />
    )
  }
  return <Poster terrain={art.terrain} slot={art.slot - 1} />
}

/**
 * All six worlds, as flat poster illustration.
 *
 * The old painterly `Scene` is gone from the question screen entirely. It
 * was trying to fake a painting with vector shapes, which is a losing bet at
 * any palette; these are trying to be posters, which is a thing vector is
 * genuinely good at.
 */
export function Poster({ terrain, slot }: { terrain: Terrain; slot: number }) {
  switch (terrain) {
    case 'cliffs': return <QuestScene slot={slot} />
    case 'ocean': return <VoyageScene slot={slot} />
    case 'park': return <ParksScene slot={slot} />
    case 'fair': return <FairPoster slot={slot} />
    case 'peaks': return <AlpinePoster slot={slot} />
    default: return <TropicPoster slot={slot} />
  }
}

/** A stable 0..9 from any string, so a question is the same place each time. */
export function variantOf(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % VARIANTS
}

const W = 1440
const H = 820

/** How each world is shaped, beyond its colours. */
interface Shape {
  /** How high the far range rises, as a fraction of the frame. */
  rise: number
  /** Treeline height at the near layers. 0 means bare - ice, desert, sea. */
  trees: number
  /** Where the ground meets sky. */
  horizon: number
}

/**
 * Worlds that draw their own subject rather than leaning on the generic
 * ridge stack. All six, now - the stack survives only as the near foreground
 * band underneath them.
 */
const DRAWS_ITS_OWN = new Set<Terrain>([
  'peaks', 'tropic', 'park', 'cliffs', 'ocean', 'fair',
])

const SHAPE: Record<Terrain, Shape> = {
  cliffs: { rise: 0.30, trees: 26, horizon: 0.62 },
  ocean: { rise: 0.13, trees: 14, horizon: 0.54 },
  park: { rise: 0.26, trees: 46, horizon: 0.66 },
  fair: { rise: 0.14, trees: 30, horizon: 0.64 },
  peaks: { rise: 0.40, trees: 0, horizon: 0.70 },
  tropic: { rise: 0.20, trees: 34, horizon: 0.60 },
}

export function Scene({ terrain, variant, placeholderFor }: {
  terrain: Terrain; variant: number; placeholderFor?: string
}) {
  const w = WORLDS[terrain]
  const s = SHAPE[terrain]
  const v = ((variant % VARIANTS) + VARIANTS) % VARIANTS
  const id = `${terrain}${v}`
  const seed = v * 131 + terrain.length * 29

  const horizon = H * s.horizon
  const sx = W * (0.2 + ((v * 0.11 + 0.17) % 0.64))
  const sy = horizon - H * (0.04 + ((v * 7) % 9) / 100)
  const hasWater = w.waterAt > 0
  const skyHaze = w.sky[w.sky.length - 2]?.[1] ?? w.sky[0][1]

  // Four depths. Each is blurrier, hazier and lower in contrast than the one
  // in front of it - which is the whole of atmospheric perspective.
  const layers = [
    { d: softRidge(horizon - H * s.rise * 0.5, W, H * s.rise, seed + 1),
      fill: `url(#f${id})`, blur: 2, haze: 0.62, o: 0.95 },
    { d: softRidge(horizon - H * s.rise * 0.22, W, H * s.rise * 0.6, seed + 2),
      fill: `url(#m${id})`, blur: 1, haze: 0.34, o: 1 },
    { d: s.trees
        ? treeRidge(horizon - 18, W, H * 0.05, s.trees * 0.8, seed + 3)
        : softRidge(horizon - 18, W, H * 0.06, seed + 3),
      fill: `url(#m${id})`, blur: 1, haze: 0.16, o: 1 },
    { d: s.trees
        ? treeRidge(horizon + 26, W, H * 0.035, s.trees, seed + 4)
        : softRidge(horizon + 26, W, H * 0.04, seed + 4),
      fill: `url(#n${id})`, blur: 0, haze: 0, o: 1 },
  ]

  return (
    <svg className={`scene scene-${terrain}`} viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {atmosphereDefs(id, skyHaze)}
        <linearGradient id={`k${id}`} x1="0" y1="0" x2="0" y2="1">
          {w.sky.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={`s${id}`}>
          <stop offset="0%" stopColor={w.sunCore} />
          <stop offset="26%" stopColor={w.sun} stopOpacity=".88" />
          <stop offset="100%" stopColor={w.sun} stopOpacity="0" />
        </radialGradient>
        {(['f', 'm', 'n'] as const).map((k, i) => {
          const pair = [w.far, w.mid, w.near][i]
          return (
            <linearGradient key={k} id={`${k}${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={pair[0]} />
              <stop offset="100%" stopColor={pair[1]} />
            </linearGradient>
          )
        })}
        <linearGradient id={`w${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={w.water[0]} stopOpacity=".66" />
          <stop offset="100%" stopColor={w.water[1]} stopOpacity=".95" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <rect x="0" y={horizon} width={W} height={H - horizon} />
        </clipPath>
      </defs>

      {placeholderFor && <title>Placeholder for {placeholderFor}</title>}
      <rect width={W} height={H} fill={`url(#k${id})`} />

      {/* The sun, and light bleeding into the air around it. */}
      <circle cx={sx} cy={sy} r={H * 0.42} fill={`url(#s${id})`} />
      <circle cx={sx} cy={sy} r={46} fill={w.sunCore} opacity=".92"
        filter={`url(#soft${id})`} />

      {/* Cloud. Turbulence shaped into wisps - the single thing that reads as
          painted from across a room, and the thing ellipses never managed. */}
      <g filter={`url(#wisp${id})`} opacity=".5">
        {Array.from({ length: 5 }, (_, i) => {
          const cy = 60 + ((v * 37 + i * 97) % Math.max(1, horizon - 140))
          const cx = ((v * 211 + i * 331) % W)
          return (
            <ellipse key={i} cx={cx} cy={cy} rx={190 + ((i * 71) % 180)}
              ry={12 + (i % 3) * 7} fill={i % 2 ? w.ray : w.sunCore}
              opacity={0.5 - i * 0.06} />
          )
        })}
      </g>

      {/* Peaks get drawn summits rather than a soft ridgeline. A mountain
          reads because of its faces - one turned to the light, one turned
          away, one between - and no amount of colour makes a single soft
          silhouette do that. */}
      {terrain === 'peaks' && (
        <g filter={`url(#org${id}2)`}>
          <PeaksScene v={v} y={horizon} w={W} h={H} />
        </g>
      )}
      {terrain === 'tropic' && <TropicScene v={v} y={horizon} w={W} h={H} />}
      {terrain === 'park' && (
        <g filter={`url(#org${id}2)`}>
          <ParkScene v={v} y={horizon} w={W} h={H} />
        </g>
      )}
      {terrain === 'cliffs' && (
        <g filter={`url(#org${id}2)`}>
          <CliffsScene v={v} y={horizon} w={W} h={H} />
        </g>
      )}
      {terrain === 'ocean' && <OceanScene v={v} y={horizon} w={W} h={H} />}

      {/* The land. Everything behind the near layer is blurred and hazed. */}
      <g>
        {(DRAWS_ITS_OWN.has(terrain) ? layers.slice(3) : layers).map((l, i) => (
          <g key={i}>
            <path d={l.d} fill={l.fill} opacity={l.o}
              filter={`url(#org${id}${Math.min(2, i)})`} />
            {l.haze > 0 && (
              <path d={l.d} fill={`url(#haze${id})`} opacity={l.haze}
                filter={`url(#org${id}${Math.min(2, i)})`} />
            )}
          </g>
        ))}
      </g>

      {hasWater && (
        <>
          <g clipPath={`url(#c${id})`} opacity=".4"
            filter={`url(#soft${id})`}>
            <g transform={`translate(0 ${horizon * 2}) scale(1 -1)`}>
              {layers.slice(0, 3).map((l, i) => (
                <path key={i} d={l.d} fill={l.fill} />
              ))}
            </g>
          </g>
          <rect x="0" y={horizon} width={W} height={H - horizon}
            fill={`url(#w${id})`} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse key={i} cx={sx - i * 26} cy={horizon + 34 + i * 58}
              rx={150 + i * 70} ry={2.4} fill={w.sunCore}
              opacity={0.3 - i * 0.042} filter={`url(#soft${id})`} />
          ))}
        </>
      )}

      {/* The fair is a BUILT place, not a landscape. A boardwalk receding to
          a vanishing point puts the student on it rather than looking at a
          picture of it, and the lamps are drawn as beads on real edges
          rather than as a glow layer - a blurry yellow blob over a building
          reads as a filter, not as electric light. */}
      {terrain === 'fair' && <FairScene v={v} y={horizon} w={W} h={H} />}

      {/* The near bank: scattered rock and tuft, almost black. Detail at the
          bottom of frame is what the eye reads as "I am standing here". */}
      <g fill={w.frame} opacity=".92">
        {(terrain === 'fair' ? [] : scatter(H - 120, W, 26, seed + 9)).map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.5}
            filter={`url(#org${id}2)`} />
        ))}
      </g>

      {/* A vignette, so whatever sits on top always wins. */}
      <rect width={W} height={H} fill={`url(#vig${id})`} />
      <defs>
        <radialGradient id={`vig${id}`} cx="50%" cy="40%" r="76%">
          <stop offset="46%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".34" />
        </radialGradient>
      </defs>
    </svg>
  )
}
