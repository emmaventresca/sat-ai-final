import type { Chapter, Terrain } from './map'

/**
 * The realms, drawn as a place rather than listed as rows.
 *
 * A list says "here are 181 things you have not done". A map says "you are
 * here, and that is where you are going" - the same information, and the
 * difference between the two is whether a student opens it twice.
 *
 * Drawn as SVG with no images: it has to survive a school network that
 * blocks everything, scale to any width, and stay legible in a printed
 * packet. Layered ridgelines, a road threading the realms, and a marker on
 * the one in progress.
 */
const W = 1000
const H = 460

/**
 * Two worlds, drawn differently.
 *
 * Maths is highland: cliffs, moss and bracken under a weather front, the
 * greens and burnt oranges of a Scottish autumn. English is coastal: open
 * water, headlands, a long horizon.
 *
 * Not decoration. A student bounces between the two sections constantly, and
 * a glance at the colour tells them which one they are in before they have
 * read a word - which is the same reason the teacher's roster is colour
 * coded and the student's practice screens are not.
 */
export function WorldMap({
  chapters, openId, onPick, terrain,
}: {
  chapters: Chapter[]
  openId: string | null
  onPick: (id: string) => void
  terrain: Terrain
}) {
  const t = PALETTE[terrain]
  // Realms sit along a route that rises as it goes, so progress reads as
  // travel rather than as a column.
  const nodes = chapters.map((c, i) => {
    const t = chapters.length > 1 ? i / (chapters.length - 1) : 0.5
    return {
      chapter: c,
      // Inset enough that the first and last labels are not clipped: the
      // label is wider than the dot and the dot is what the maths placed.
      x: 115 + t * (W - 230),
      y: 340 - Math.sin(t * Math.PI * 1.55) * 78 - t * 52,
      // Alternating sides, so two neighbouring labels never collide.
      above: i % 2 === 0,
    }
  })

  const road = nodes.map((n, i) => {
    if (!i) return `M ${n.x} ${n.y}`
    const prev = nodes[i - 1]
    const mx = (prev.x + n.x) / 2
    return `C ${mx} ${prev.y}, ${mx} ${n.y}, ${n.x} ${n.y}`
  }).join(' ')

  const doneUpTo = nodes.findIndex((n) => n.chapter.cleared < n.chapter.stages)
  const reached = doneUpTo === -1 ? nodes.length - 1 : doneUpTo

  return (
    <svg className="worldmap" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label="Your route through the test">
      <defs>
        <linearGradient id={`sky-${terrain}`} x1="0" y1="0" x2="0" y2="1">
          {t.sky.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <linearGradient id={`far-${terrain}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.far[0]} />
          <stop offset="100%" stopColor={t.far[1]} />
        </linearGradient>
        <linearGradient id={`mid-${terrain}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.mid[0]} />
          <stop offset="100%" stopColor={t.mid[1]} />
        </linearGradient>
        <linearGradient id={`near-${terrain}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.near[0]} />
          <stop offset="100%" stopColor={t.near[1]} />
        </linearGradient>
        <radialGradient id={`glow-${terrain}`}>
          <stop offset="0%" stopColor={t.glow} stopOpacity="0.95" />
          <stop offset="100%" stopColor={t.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#sky-${terrain})`} />
      {/* Weather: heavy banks low in the frame, the way a storm sits over a
          ridge. Painted clouds read as smudges at this size. */}
      <ellipse cx="220" cy="54" rx="340" ry="62" fill={t.cloud} opacity=".62" />
      <ellipse cx="640" cy="30" rx="380" ry="54" fill={t.cloud} opacity=".5" />
      <ellipse cx="880" cy="92" rx="260" ry="40" fill={t.cloud} opacity=".4" />
      <circle cx="800" cy="186" r="150" fill={`url(#glow-${terrain})`} />

      {/* Water. On the coast it is most of the frame; inland it is the loch
          at the foot of the cliffs. */}
      <rect x="0" y={H * t.waterTop} width={W} height={H} fill={t.water} opacity=".62" />
      {terrain === 'ocean' && WAVES.map((i) => (
        <path key={i} d={waves(H * t.waterTop + 26 + i * 30, 7 - i)}
          fill="none" stroke="#dcecf6" strokeWidth="1.6" opacity={0.3 - i * 0.05} />
      ))}

      <path d={ridge(0.55, 9, t.farHeight, 1)} fill={`url(#far-${terrain})`} opacity=".8" />
      {/* Spires on the skyline. Highland gets rock teeth; the coast gets
          fewer, lower headlands, because a seascape with alpine peaks in it
          reads as neither. */}
      {(terrain === 'cliffs' ? SPIRES : HEADLANDS).map(([x, base, h], i) => (
        <path key={i}
          d={`M ${x} ${base} l ${h * 0.17} ${-h} l ${h * 0.1} ${h * 0.34}
              l ${h * 0.12} ${-h * 0.56} l ${h * 0.2} ${h * 1.22} z`}
          fill={t.rock} opacity=".92" />
      ))}
      <path d={ridge(0.7, 6, t.midHeight, 2)} fill={`url(#mid-${terrain})`} />
      <path d={ridge(0.86, 5, t.nearHeight, 3)} fill={`url(#near-${terrain})`} />

      <path d={road} className="map-road-shadow" />
      <path d={road} className="map-road" />

      {nodes.map((n, i) => {
        const c = n.chapter
        const done = c.stages > 0 && c.cleared >= c.stages
        const here = i === reached
        const state = done ? 'done' : i < reached ? 'part' : here ? 'here' : 'ahead'
        return (
          <g key={c.id} className={`realm ${state} ${openId === c.id ? 'open' : ''}`}
            transform={`translate(${n.x} ${n.y})`}
            onClick={() => onPick(c.id)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onPick(c.id) }}>
            {here && <circle r="30" className="realm-halo" />}
            <circle r="15" className="realm-dot" />
            <text y="5" className="realm-n">{roman(i + 1)}</text>
            <text y={n.above ? -30 : 42} className="realm-label">{short(c.name)}</text>
            <text y={n.above ? -15 : 57} className="realm-sub">
              {c.cleared}/{c.stages}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const SPIRES: [number, number, number][] = [
  [196, 300, 96], [238, 306, 62], [742, 292, 108], [806, 300, 74], [856, 306, 58],
]

/** Lower and fewer: a coastline, not a mountain range. */
const HEADLANDS: [number, number, number][] = [
  [120, 300, 46], [880, 296, 54],
]

const WAVES = [0, 1, 2]

/** A line of swell. Deterministic, like everything else on the map. */
function waves(y: number, amp: number): string {
  const points = ['M -20 ' + y]
  for (let x = 20; x <= W + 20; x += 40) {
    points.push(`Q ${x - 20} ${y - amp}, ${x} ${y}`)
  }
  return points.join(' ')
}

interface Palette {
  sky: [string, string][]
  far: [string, string]
  mid: [string, string]
  near: [string, string]
  glow: string
  cloud: string
  water: string
  rock: string
  waterTop: number
  farHeight: number
  midHeight: number
  nearHeight: number
}

const PALETTE: Record<Terrain, Palette> = {
  // Highland autumn: weather overhead, bracken and moss below, the low sun
  // that makes the grass look lit from inside.
  cliffs: {
    sky: [['0%', '#2b3350'], ['50%', '#6a7693'], ['100%', '#d8bd8a']],
    far: ['#6c7b9b', '#93a3bb'],
    mid: ['#6b7a45', '#8d9a4e'],
    near: ['#93a23c', '#4a4a22'],
    glow: '#ffd98a',
    cloud: '#1a2132',
    water: '#8fa3bc',
    rock: '#3b3f4e',
    waterTop: 0.5,
    farHeight: 44, midHeight: 66, nearHeight: 78,
  },
  // Coast: more sky, more water, the land a low green edge at the bottom.
  ocean: {
    sky: [['0%', '#15314a'], ['45%', '#3f7392'], ['100%', '#a9d4de']],
    far: ['#4e8198', '#79aab8'],
    mid: ['#2f6f7c', '#49909a'],
    near: ['#4e7f5e', '#24402f'],
    glow: '#cdf0ff',
    cloud: '#0f2436',
    water: '#2e7e94',
    rock: '#2c4452',
    waterTop: 0.42,
    farHeight: 34, midHeight: 44, nearHeight: 70,
  },
}

/**
 * A ridgeline.
 *
 * Deterministic on purpose - a map that reshuffles itself between visits is
 * not a place - but irregular, because evenly spaced triangles read as a
 * chart. Three layered sines per seed give peaks of different heights and
 * widths without anything random in it.
 */
function ridge(baseline: number, peaks: number, height: number, seed: number): string {
  const y = H * baseline
  const points: string[] = [`M -20 ${H}`, `L -20 ${y}`]
  const steps = peaks * 3
  const step = (W + 40) / steps
  for (let i = 0; i <= steps; i++) {
    const x = -20 + i * step
    const a = Math.sin(i * 0.9 + seed * 2.1)
    const b = Math.sin(i * 2.3 + seed * 1.3)
    const c = Math.sin(i * 0.37 + seed)
    const lift = height * (0.5 + 0.3 * a + 0.22 * b + 0.3 * c)
    points.push(`L ${x} ${y - Math.max(0, lift)}`)
  }
  points.push(`L ${W + 20} ${H} Z`)
  return points.join(' ')
}

function roman(n: number): string {
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''
  let left = n
  for (const [v, s] of table) while (left >= v) { out += s; left -= v }
  return out
}

/** Realm names have to fit under a dot. */
function short(name: string): string {
  const trimmed = name
    .replace('Problem-Solving and Data Analysis', 'Data & Problem-Solving')
    .replace('Standard English Conventions', 'Conventions')
    .replace('Geometry and Trigonometry', 'Geometry')
    .replace('Information and Ideas', 'Information')
    .replace('Expression of Ideas', 'Expression')
    .replace('Craft and Structure', 'Craft')
  return trimmed.length > 22 ? `${trimmed.slice(0, 21)}…` : trimmed
}
