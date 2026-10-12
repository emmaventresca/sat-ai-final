import type { Chapter, Terrain } from './map'
import { Traveller } from './Traveller'

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

  // Every sub-sub-unit in this region, in road order. These are the steps
  // the traveller actually takes: a student who clears one recognition
  // should see the figure move, and realm-sized strides left it standing
  // still through a whole domain.
  const stops = chapters.flatMap((c) =>
    c.legs.flatMap((leg) => leg.stages.map((st) => ({
      key: `${c.id}|${leg.skill}|${st.subtype}`,
      name: st.name,
      cleared: st.cleared,
    }))))
  const walked = stops.filter((st) => st.cleared).length

  const doneUpTo = nodes.findIndex((n) => n.chapter.cleared < n.chapter.stages)
  const reached = doneUpTo === -1 ? nodes.length - 1 : doneUpTo

  // Where the traveller stands: at the realm they have reached, plus however
  // far into it they are. Snapping them to whole realms would leave the
  // figure motionless through an entire domain, which is the stretch where
  // seeing movement matters most.
  const here = nodes[reached]?.chapter
  const within = here && here.stages ? here.cleared / here.stages : 0
  // One step per stop cleared, landing ON the dot rather than near it: the
  // dots sit at i/(n-1), so the figure has to use the same denominator or
  // it stands just short of the marker it has actually reached.
  // Falls back to the old realm-based position where a region has no stops
  // to count, so an empty map still places the figure sensibly.
  const along = stops.length > 1
    ? walked / (stops.length - 1)
    : nodes.length > 1
      ? (reached + Math.min(0.95, within)) / (nodes.length - 1)
      : 0.5

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
      {t.waterTop < 0.6 && (
        <rect x="0" y={H * t.waterTop} width={W} height={H}
          fill={t.water} opacity=".62" />
      )}
      {terrain === 'ocean' && WAVES.map((i) => (
        <path key={i} d={waves(H * t.waterTop + 26 + i * 30, 7 - i)}
          fill="none" stroke="#dcecf6" strokeWidth="1.6" opacity={0.3 - i * 0.05} />
      ))}

      <path d={ridge(0.55, 9, t.farHeight, 1)} fill={`url(#far-${terrain})`} opacity=".8" />
      <Skyline terrain={terrain} rock={t.rock} />
      <path d={ridge(0.7, 6, t.midHeight, 2)} fill={`url(#mid-${terrain})`} />
      <path d={ridge(0.86, 5, t.nearHeight, 3)} fill={`url(#near-${terrain})`} />
      <Foreground terrain={terrain} />

      <path d={road} className="map-road-shadow" />
      <path d={road} className="map-road" />
      {/* The road already walked, drawn over the dotted one. */}
      <path d={road} className="map-road-done"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - along} />

      {/* A dot per sub-sub-unit, pinned to the road the same way the
          traveller is, so they can never drift off the line it walks. */}
      {stops.map((st, i) => (
        <g key={st.key}
          className={`map-stop${st.cleared ? ' done' : ''}`}
          style={{
            offsetPath: `path("${road}")`,
            offsetDistance: `${(stops.length > 1 ? i / (stops.length - 1) : 0.5) * 100}%`,
            offsetRotate: '0deg',
          }}>
          <circle r="4.5" />
          <title>{st.name}</title>
        </g>
      ))}

      <Traveller terrain={terrain} road={road} at={along} />

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
            <text y={n.above ? -30 : 42}
              className={`realm-label ${LIGHT_GROUND.has(terrain) ? 'on-light' : ''}`}>
              {short(c.name)}
            </text>
            <text y={n.above ? -15 : 57}
              className={`realm-sub ${LIGHT_GROUND.has(terrain) ? 'on-light' : ''}`}>
              {c.cleared}/{c.stages}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Worlds whose lower half is pale, where a white label disappears. */
const LIGHT_GROUND = new Set<Terrain>(['peaks'])

const SPIRES: [number, number, number][] = [
  [196, 300, 96], [238, 306, 62], [742, 292, 108], [806, 300, 74], [856, 306, 58],
]

/** Lower and fewer: a coastline, not a mountain range. */
const HEADLANDS: [number, number, number][] = [
  [120, 300, 46], [880, 296, 54],
]

const WAVES = [0, 1, 2]

/**
 * What stands on the skyline.
 *
 * The thing that makes a map read as somewhere rather than as coloured
 * hills. Recolouring one set of triangles six times would give six maps that
 * all feel like the same place, which defeats the point of having six.
 */
function Skyline({ terrain, rock }: { terrain: Terrain; rock: string }) {
  if (terrain === 'cliffs') {
    return <>{SPIRES.map(([x, base, h], i) => (
      <g key={i}>
        <path d={tooth(x, base, h)} fill={rock} opacity=".92" />
        {h > 70 && <path d={cap(x, base, h)} fill="#f2f7fb" opacity=".9" />}
      </g>
    ))}</>
  }
  if (terrain === 'ocean') {
    return <>{HEADLANDS.map(([x, base, h], i) => (
      <path key={i} d={tooth(x, base, h)} fill={rock} opacity=".92" />
    ))}</>
  }
  if (terrain === 'park') {
    // Mesas: flat tops, sheer sides. A pointed peak would read as the Alps.
    return <>{[[90, 300, 74, 150], [300, 296, 58, 110], [720, 302, 66, 170]]
      .map(([x, base, h, w], i) => (
        <path key={i} d={`M ${x} ${base} L ${x + w * 0.1} ${base - h}
          L ${x + w * 0.9} ${base - h} L ${x + w} ${base} z`}
          fill={rock} opacity=".9" />
      ))}</>
  }
  if (terrain === 'peaks') {
    // Sharp, snow-capped, overlapping. Height is the whole character.
    return <>{[[70, 320, 150, 120], [230, 320, 190, 150], [640, 320, 170, 140],
               [840, 320, 210, 160]].map(([x, base, h, w], i) => (
      <g key={i}>
        <path d={`M ${x} ${base} L ${x + w / 2} ${base - h} L ${x + w} ${base} z`}
          fill={rock} opacity=".95" />
        <path d={`M ${x + w / 2 - w * 0.17} ${base - h * 0.62}
          L ${x + w / 2} ${base - h} L ${x + w / 2 + w * 0.17} ${base - h * 0.62}
          L ${x + w / 2 + w * 0.06} ${base - h * 0.72}
          L ${x + w / 2 - w * 0.04} ${base - h * 0.64} z`}
          fill="#f4fbff" opacity=".95" />
      </g>
    ))}</>
  }
  if (terrain === 'fair') {
    // A ferris wheel and two pavilions. Nothing says 1904 like a wheel on
    // the skyline with the lights coming on.
    return (
      <g opacity=".95">
        <g transform="translate(180 250)" stroke={rock} strokeWidth="2.5" fill="none">
          <circle r="54" />
          <circle r="34" opacity=".6" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return <line key={i} x1="0" y1="0"
              x2={Math.cos(a) * 54} y2={Math.sin(a) * 54} opacity=".7" />
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return <circle key={i} cx={Math.cos(a) * 54} cy={Math.sin(a) * 54}
              r="3.4" fill="#ffe6ad" stroke="none" />
          })}
        </g>
        <path d="M 165 304 L 180 250 L 195 304 z" fill={rock} />
        {[[620, 300], [800, 304]].map(([x, base], i) => (
          <g key={i} fill={rock}>
            <rect x={x} y={base - 54} width="96" height="54" />
            <path d={`M ${x - 10} ${base - 54} L ${x + 48} ${base - 96}
              L ${x + 106} ${base - 54} z`} />
            <circle cx={x + 48} cy={base - 104} r="5" />
          </g>
        ))}
      </g>
    )
  }
  // tropic: a banded sun, the one image that says 1986 without a word.
  return (
    <g>
      <circle cx="500" cy="248" r="92" fill="#ffd36e" opacity=".9" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="400" y={240 + i * 16} width="200" height={5 + i * 1.6}
          fill="#8a3b86" opacity=".85" />
      ))}
    </g>
  )
}

/**
 * What stands in front, below the last ridge.
 *
 * Only two worlds need it: a park without conifers is a desert, and a
 * tropical sunset without palms is a gradient.
 */
function Foreground({ terrain }: { terrain: Terrain }) {
  if (terrain === 'park') {
    return <>{[60, 150, 250, 790, 880, 960].map((x, i) => (
      <path key={i} d={conifer(x, 430, 58 + (i % 3) * 16)}
        fill="#15301c" opacity=".92" />
    ))}</>
  }
  if (terrain === 'tropic') {
    return <>{[[70, 436, 1], [150, 444, -1], [880, 440, 1], [950, 432, -1]]
      .map(([x, base, lean], i) => (
        <g key={i} fill="#120a26">
          <path d={`M ${x} ${base} q ${4 * lean} -46 ${16 * lean} -74`}
            stroke="#120a26" strokeWidth="5" fill="none" />
          {[-1, -0.5, 0.5, 1].map((f, j) => (
            <path key={j}
              d={`M ${x + 16 * lean} ${base - 74}
                  q ${34 * f} ${-18 - Math.abs(f) * 6} ${54 * f} ${6 - Math.abs(f) * 4}
                  q ${-30 * f} ${-6} ${-54 * f} ${-6} z`} />
          ))}
      </g>
    ))}</>
  }
  return null
}

/** A rock tooth: the highland and coastal silhouette. */
function tooth(x: number, base: number, h: number): string {
  return `M ${x} ${base} l ${h * 0.17} ${-h} l ${h * 0.1} ${h * 0.34}
          l ${h * 0.12} ${-h * 0.56} l ${h * 0.2} ${h * 1.22} z`
}

/**
 * Snow on a tooth.
 *
 * Traced from the same two points the tooth's own summit uses, so the cap
 * sits on the rock rather than floating near it - a snowline drawn as a
 * separate triangle is the detail that makes a mountain look like clip art.
 */
function cap(x: number, base: number, h: number): string {
  const peak = { x: x + h * 0.17, y: base - h }
  const drop = h * 0.26
  return `M ${peak.x - drop * 0.52} ${peak.y + drop}
          L ${peak.x} ${peak.y}
          L ${peak.x + drop * 0.46} ${peak.y + drop * 0.84}
          L ${peak.x + drop * 0.16} ${peak.y + drop * 0.5}
          L ${peak.x - drop * 0.1} ${peak.y + drop * 0.92} z`
}

/** A sequoia, in the fewest points that still read as one. */
function conifer(x: number, base: number, h: number): string {
  const w = h * 0.42
  return `M ${x} ${base}
    L ${x - w * 0.18} ${base} L ${x - w * 0.5} ${base - h * 0.32}
    L ${x - w * 0.28} ${base - h * 0.34} L ${x - w * 0.42} ${base - h * 0.62}
    L ${x - w * 0.22} ${base - h * 0.64} L ${x} ${base - h}
    L ${x + w * 0.22} ${base - h * 0.64} L ${x + w * 0.42} ${base - h * 0.62}
    L ${x + w * 0.28} ${base - h * 0.34} L ${x + w * 0.5} ${base - h * 0.32}
    L ${x + w * 0.18} ${base} z`
}

/** A line of swell. Deterministic, like everything else on the map. */
function waves(y: number, amp: number): string {
  const points = ['M -20 ' + y]
  for (let x = 20; x <= W + 20; x += 40) {
    points.push(`Q ${x - 20} ${y - amp}, ${x} ${y}`)
  }
  return points.join(' ')
}

export interface Palette {
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

export const PALETTE: Record<Terrain, Palette> = {
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

  // National park. Sedona red rock behind, Sequoia dark green in front,
  // under the big clean western sky that makes the postcards.
  park: {
    sky: [['0%', '#2a5e8c'], ['45%', '#7fb4d4'], ['100%', '#f2d8ae']],
    far: ['#b4642f', '#d89a5a'],
    mid: ['#8a4a28', '#b06a38'],
    near: ['#2f5436', '#16301d'],
    glow: '#ffe3a8',
    cloud: '#ffffff',
    water: '#5e9bb8',
    rock: '#9c4f27',
    waterTop: 0.56,
    farHeight: 58, midHeight: 72, nearHeight: 64,
  },

  // A world's fair at dusk: warm electric light, pale pavilions, bunting.
  // Every surface in 1904 was painted white and then lit, which is why the
  // palette is cream against a deep evening blue.
  fair: {
    sky: [['0%', '#1f2449'], ['45%', '#5a4a7a'], ['100%', '#e8b06a']],
    far: ['#8d7fae', '#c0ad c8'.replace(' ', '')],
    mid: ['#6a5c8c', '#9a88ad'],
    near: ['#3d3254', '#241d36'],
    glow: '#ffd98a',
    cloud: '#2a2450',
    water: '#5d6a9c',
    rock: '#efe3cd',
    waterTop: 0.62,
    farHeight: 30, midHeight: 40, nearHeight: 58,
  },

  // High altitude: thin air, hard light, snow. Almost no colour on purpose -
  // everything else here is warm, and the cold is the point.
  peaks: {
    sky: [['0%', '#13243f'], ['42%', '#4e74a0'], ['100%', '#d6e7f2']],
    far: ['#7d9bbd', '#b8cfe2'],
    mid: ['#5f7fa6', '#93b2cc'],
    near: ['#e8f1f8', '#9fb6c9'],
    glow: '#eaf6ff',
    cloud: '#16233c',
    water: '#86a6c2',
    rock: '#44597a',
    waterTop: 0.6,
    farHeight: 96, midHeight: 110, nearHeight: 66,
  },

  // Hawaii by way of Miami, 1986. A sun with bands through it, palms in
  // silhouette, and a gradient that has no business being this loud.
  tropic: {
    sky: [['0%', '#2b1b55'], ['38%', '#8a3b86'], ['72%', '#e8615f'], ['100%', '#ffb867']],
    far: ['#5a2a6e', '#8a3b86'],
    mid: ['#3d1f5c', '#6a2d77'],
    near: ['#1d1038', '#0f0a22'],
    glow: '#ffd36e',
    cloud: '#3a1f5e',
    water: '#6a2d77',
    rock: '#2a1548',
    waterTop: 0.58,
    farHeight: 40, midHeight: 50, nearHeight: 56,
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
export function ridge(baseline: number, peaks: number, height: number, seed: number): string {
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
