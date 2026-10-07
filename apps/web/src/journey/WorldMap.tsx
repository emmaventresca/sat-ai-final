import type { Chapter } from './map'

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

export function WorldMap({
  chapters, openId, onPick,
}: {
  chapters: Chapter[]
  openId: string | null
  onPick: (id: string) => void
}) {
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
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="55%" stopColor="#5a6a8c" />
          <stop offset="100%" stopColor="#c7b58e" />
        </linearGradient>
        <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6c7b9b" />
          <stop offset="100%" stopColor="#8fa0ba" />
        </linearGradient>
        <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d7257" />
          <stop offset="100%" stopColor="#7d9460" />
        </linearGradient>
        <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#71893f" />
          <stop offset="100%" stopColor="#3f4a2a" />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#sky)" />
      {/* Weather: heavy banks low in the frame, the way a storm sits over a
          ridge. Painted clouds read as smudges at this size. */}
      <ellipse cx="220" cy="54" rx="340" ry="62" fill="#161c2c" opacity=".7" />
      <ellipse cx="640" cy="30" rx="380" ry="54" fill="#1a2132" opacity=".6" />
      <ellipse cx="880" cy="92" rx="260" ry="40" fill="#222a3e" opacity=".5" />
      <circle cx="800" cy="186" r="150" fill="url(#glow)" />

      {/* Water, which is what makes the far edge read as distance. */}
      <rect x="0" y={H * 0.5} width={W} height={H * 0.22} fill="#8fa3bc" opacity=".55" />

      <path d={ridge(0.55, 9, 44, 1)} fill="url(#far)" opacity=".8" />
      {/* Spires. The one shape that makes a landscape read as somewhere
          rather than as hills, so they sit on the skyline, not behind it. */}
      {SPIRES.map(([x, base, h], i) => (
        <path key={i}
          d={`M ${x} ${base} l ${h * 0.17} ${-h} l ${h * 0.1} ${h * 0.34}
              l ${h * 0.12} ${-h * 0.56} l ${h * 0.2} ${h * 1.22} z`}
          fill="#333c52" opacity=".92" />
      ))}
      <path d={ridge(0.7, 6, 66, 2)} fill="url(#mid)" />
      <path d={ridge(0.86, 5, 78, 3)} fill="url(#near)" />

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
