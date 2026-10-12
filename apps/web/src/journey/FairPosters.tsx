import { r } from './poster'
import { lightDefs, SunLight } from './atmosphere'
import type { Poster } from './poster'

/**
 * The boardwalk, as ten flat posters.
 *
 * Two corrections drove this rewrite. The first: I had drifted inland into a
 * Beaux-Arts exposition — domes, colonnades, a formal garden — and lost the
 * seaside entirely. The references were Atlantic City and Myrtle Beach: a
 * WOODEN DECK BY THE OCEAN. Every scene here now has sand, water or planks in
 * it, and most have all three.
 *
 * The second: "chopped". The fair scenes were assembled from a dozen small
 * separate forms, and at this size a row of little rectangles reads as debris
 * rather than as a street. So the rule here is FEWER, LONGER shapes — one
 * continuous deck running the width of the frame, one long arcade frontage,
 * one pier. Where there were twelve booths there is now one building with
 * twelve lit windows, which is one shape instead of twelve.
 *
 * The planks are the signature. Boards converging on a vanishing point put
 * the viewer ON the boardwalk rather than looking at a picture of one, and
 * nothing else in the vocabulary does that job.
 */
const W = 1600
const H = 900

export const FAIR: Poster[] = [
  // 1. The Boardwalk - late afternoon, the sky already turning.
  { sky: ['#1e5a9e', '#4e9cc8', '#9fcfdc', '#f0d8a8'],
    planes: ['#c8a878', '#a8865c', '#7e6342', '#4e3c28'],
    ink: '#2e2418', light: '#fffbe8', accent: '#e8564a', sunAt: [0.84, 0.2] },
  // 2. The Ferris Wheel - dusk, the wheel lit against a coral sky.
  { sky: ['#3a3a78', '#8a5a94', '#e8886a', '#ffc48a'], planes: ['#6a5a78', '#4a4058', '#2e2a3c', '#1a1824'],
    ink: '#121018', light: '#fffbef', accent: '#ff5c8a', sunAt: [0.24, 0.42] },
  // 3. The Pier - low sun straight down the deck.
  { sky: ['#6a3a7e', '#c4567a', '#f08a4c', '#ffd89c'],
    planes: ['#b88a5c', '#8e6842', '#5e462c', '#38281a'],
    ink: '#201810', light: '#fffbe0', accent: '#e8564a', sunAt: [0.52, 0.44] },
  // 4. The Arcade - bright, but the sky still has somewhere to go.
  { sky: ['#1a6aa8', '#4ea8d0', '#9fd4e0', '#e8ecd0'],
    planes: ['#e8d8b8', '#c4ae8c', '#968060', '#5e4e38'],
    ink: '#30261a', light: '#ffffff', accent: '#e8564a', sunAt: [0.14, 0.14] },
  // 5. Under the Pier - dark, with light leaking between planks.
  { sky: ['#2a3a52', '#46607e', '#8aa0ae'], planes: ['#5a4a3a', '#3e3228', '#2a2118', '#16110c'],
    ink: '#0d0a08', light: '#ffe9b8', accent: '#e8c05c', sunAt: null },
  // 6. The Beach at Dusk - dunes, sea oats, the wheel far off.
  { sky: ['#5a4a8e', '#b06a8e', '#f09a6a', '#ffd0a0'], planes: ['#d8b88c', '#b0906a', '#7e6448', '#4e3c2c'],
    ink: '#2a2018', light: '#fff0c8', accent: '#ff7a5c', sunAt: [0.76, 0.46] },
  // 7. The Carousel - evening, the ride the brightest thing in frame.
  { sky: ['#2e3a6e', '#5a5a8e', '#a0708a'], planes: ['#8a7a6a', '#60544a', '#3e3630', '#241e1a'],
    ink: '#141010', light: '#fffbef', accent: '#e8564a', sunAt: null },
  // 8. The Bandstand - late afternoon, warm, sea behind.
  { sky: ['#1f6ea8', '#52a4cc', '#a8d0d8', '#f4dfae'],
    planes: ['#c4a880', '#9e8260', '#6e5a40', '#423424'],
    ink: '#281e14', light: '#fffbe8', accent: '#e8564a', sunAt: [0.16, 0.18] },
  // 9. The Boardwalk at Night - everything lit, wet planks doubling it.
  { sky: ['#101a40', '#24306a', '#4a4a84'], planes: ['#5a4e42', '#3e352c', '#28211a', '#150f0a'],
    ink: '#0a0710', light: '#fffbef', accent: '#ff5c8a', sunAt: null },
  // 10. Sunrise on the Boards - empty, low sun over water.
  { sky: ['#3e3a7e', '#9a5a86', '#e8906a', '#ffdcae'],
    planes: ['#d0a87c', '#aa8358', '#7a5c3c', '#4a3626'],
    ink: '#2c2016', light: '#fffbe0', accent: '#e8564a', sunAt: [0.46, 0.36] },
]

export function FairPoster({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = FAIR[i]
  const id = `bw${i}`
  return (
    <svg className="scene scene-poster" viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {lightDefs(id, p.light, p.planes)}
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, n) => (
            <stop key={n} offset={`${(n / (p.sky.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <filter id={`g${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"
            stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#sky${id})`} />
      <SunLight id={id} at={p.sunAt} w={W} h={H} light={p.light} />
      {/* Horizon glow behind the land, so the furthest edge is eaten by
          light instead of meeting the sky on a hard cut. */}
      <rect x="0" y={H * 0.34} width={W} height={H * 0.46}
        fill={`url(#glow${id})`} />
      <Body i={i} />
      <rect width={W} height={H} filter={`url(#g${id})`} opacity=".06"
        style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

/** Where sea meets sky in most scenes. */
const SEA = H * 0.5

function Body({ i }: { i: number }) {
  const p = FAIR[i]
  const [plank, board, post, dark] = p.planes
  const lit = p.light

  switch (i) {
    // 1. The Boardwalk - planks down the middle, arcade left, ocean right.
    case 0: return (
      <>
        <Ocean y={SEA} />
        <Sand y={H * 0.56} fill={board} />
        {/* One long frontage on the left, not a row of booths. */}
        <Frontage x={-W * 0.06} y={H * 0.62} w={W * 0.44} h={H * 0.3}
          wall={plank} roof={p.accent} lit={lit} dark={dark} n={6} />
        <Deck vp={0.42} top={H * 0.6} plank={board} gap={dark} />
        <Rail y={H * 0.68} right plank={post} lit={lit} />
        <Lamps y={H * 0.68} xs={[0.72, 0.9]} h={H * 0.2} ink={dark} lit={lit} />
      </>
    )

    // 2. The Ferris Wheel - from the sand, lit against the dusk.
    case 1: return (
      <>
        <Ocean y={SEA} dusk />
        <Sand y={H * 0.6} fill={board} />
        <Wheel x={W * 0.78} y={H * 0.34} r={H * 0.26} frame={dark} lit={p.accent} />
        {/* The deck edge runs along as one clean horizontal. */}
        <rect x="-20" y={r(H * 0.58)} width={W + 40} height={r(H * 0.05)} fill={post} />
        <rect x="-20" y={r(H * 0.63)} width={W + 40} height={r(H * 0.02)} fill={dark} />
        <Pilings y={H * 0.65} n={16} fill={dark} h={H * 0.12} />
        <Lamps y={H * 0.58} xs={[0.06, 0.24, 0.5]} h={H * 0.2} ink={dark} lit={lit} />
      </>
    )

    // 3. The Pier - pilings marching out, low sun down the deck.
    case 2: return (
      <>
        <Ocean y={SEA} />
        {/* One pier, running away from the viewer, as one mass. */}
        <path fill={post} d={`M -20 ${H} L ${W * 0.4} ${r(H * 0.54)}
          L ${W * 0.6} ${r(H * 0.54)} L ${W + 20} ${H} Z`} />
        <Deck vp={0.5} top={H * 0.54} plank={board} gap={dark} />
        <Rail y={H * 0.62} plank={plank} lit={lit} />
        <Rail y={H * 0.62} right plank={plank} lit={lit} />
        {/* The pavilion at the far end: one silhouette, small. */}
        <g fill={dark}>
          <rect x={r(W * 0.44)} y={r(H * 0.44)} width={r(W * 0.12)} height={r(H * 0.1)} />
          <path d={`M ${r(W * 0.42)} ${r(H * 0.44)} L ${r(W * 0.5)} ${r(H * 0.37)}
            L ${r(W * 0.58)} ${r(H * 0.44)} Z`} />
        </g>
      </>
    )

    // 4. The Arcade - one long awninged frontage, full width.
    case 3: return (
      <>
        <Ocean y={H * 0.42} />
        <Sand y={H * 0.52} fill={board} />
        <Frontage x={-W * 0.04} y={H * 0.66} w={W * 1.08} h={H * 0.34}
          wall={plank} roof={p.accent} lit={lit} dark={dark} n={11} />
        <Deck vp={0.5} top={H * 0.66} plank={board} gap={dark} />
        <StringLights y={H * 0.3} lit={lit} ink={dark} />
      </>
    )

    // 5. Under the Pier - pilings in perspective, light through the planks.
    case 4: return (
      <>
        <rect width={W} height={H} fill={p.planes[2]} />
        <Ocean y={H * 0.56} dusk />
        {/* Light leaking between deck boards: thin bright bars, the subject. */}
        {Array.from({ length: 16 }, (_, n) => {
          const t = n / 15
          return (
            <path key={n} fill={lit} opacity={0.26 - t * 0.14}
              d={`M ${r(W * (0.1 + t * 0.06))} ${r(H * 0.1)}
                  L ${r(W * (0.12 + t * 0.06))} ${r(H * 0.1)}
                  L ${r(W * (0.3 + t * 0.07))} ${H}
                  L ${r(W * (0.26 + t * 0.07))} ${H} Z`} />
          )
        })}
        {/* The deck overhead, and two ranks of pilings. */}
        <rect x="-20" y="-20" width={W + 40} height={r(H * 0.14)} fill={dark} />
        {[[0.9, 1], [0.6, 0.72], [0.4, 0.5]].map(([o, s], n) => (
          <g key={n} fill={dark} opacity={o as number}>
            {Array.from({ length: 5 }, (_, j) => (
              <rect key={j} x={r(W * (0.04 + j * 0.24 + n * 0.08))} y={r(H * 0.12)}
                width={r(26 * (s as number))} height={H} />
            ))}
          </g>
        ))}
      </>
    )

    // 6. The Beach at Dusk - dunes, sea oats, the wheel small and far.
    case 5: return (
      <>
        <Ocean y={SEA} dusk />
        {/* The boardwalk is a thin line in the distance here. */}
        <rect x="-20" y={r(H * 0.56)} width={W + 40} height={r(H * 0.02)} fill={dark} />
        <Wheel x={W * 0.14} y={H * 0.46} r={H * 0.1} frame={dark} lit={p.accent} />
        <Sand y={H * 0.6} fill={plank} />
        {/* Dune and sea oats, bottom - the Myrtle Beach note. */}
        <path fill={board} d={`M -20 ${H} L -20 ${r(H * 0.72)}
          Q ${W * 0.34} ${r(H * 0.64)} ${W * 0.66} ${r(H * 0.74)}
          Q ${W * 0.88} ${r(H * 0.8)} ${W + 20} ${r(H * 0.72)} L ${W + 20} ${H} Z`} />
        <SeaOats y={H * 0.78} ink={p.ink} />
      </>
    )

    // 7. The Carousel - one round building, lit from within.
    case 6: return (
      <>
        <Ocean y={H * 0.44} dusk />
        <Sand y={H * 0.54} fill={board} />
        <Deck vp={0.5} top={H * 0.62} plank={board} gap={dark} />
        {/* One shape: a bright ring under a dark conical roof. */}
        <g>
          <ellipse cx={W * 0.22} cy={H * 0.78} rx={W * 0.2} ry={H * 0.05} fill={dark} />
          <rect x={r(W * 0.02)} y={r(H * 0.54)} width={r(W * 0.4)} height={r(H * 0.24)}
            fill={lit} opacity=".9" />
          {Array.from({ length: 9 }, (_, n) => (
            <rect key={n} x={r(W * (0.04 + n * 0.045))} y={r(H * 0.54)} width={r(W * 0.012)}
              height={r(H * 0.24)} fill={dark} opacity=".8" />
          ))}
          <path fill={p.accent} d={`M ${r(W * -0.02)} ${r(H * 0.54)}
            Q ${r(W * 0.22)} ${r(H * 0.32)} ${r(W * 0.46)} ${r(H * 0.54)} Z`} />
          <rect x={r(W * 0.21)} y={r(H * 0.28)} width={r(W * 0.016)} height={r(H * 0.08)}
            fill={dark} />
        </g>
        <Lamps y={H * 0.62} xs={[0.62, 0.78, 0.94]} h={H * 0.22} ink={dark} lit={lit} />
      </>
    )

    // 8. The Bandstand - one octagon on the deck, sea behind.
    case 7: return (
      <>
        <Ocean y={SEA} />
        <Sand y={H * 0.58} fill={board} />
        <Deck vp={0.46} top={H * 0.6} plank={board} gap={dark} />
        <g>
          <rect x={r(W * 0.68)} y={r(H * 0.72)} width={r(W * 0.3)} height={r(H * 0.06)}
            fill={dark} />
          {[-0.12, -0.04, 0.04, 0.12].map((t, n) => (
            <rect key={n} x={r(W * (0.83 + t))} y={r(H * 0.48)} width="9"
              height={r(H * 0.24)} fill={post} />
          ))}
          <path fill={p.accent} d={`M ${r(W * 0.66)} ${r(H * 0.48)}
            Q ${r(W * 0.83)} ${r(H * 0.3)} ${r(W + 20)} ${r(H * 0.48)} Z`} />
        </g>
        <Rail y={H * 0.66} plank={post} lit={lit} />
      </>
    )

    // 9. The Boardwalk at Night - lit, and doubled in the wet planks.
    case 8: return (
      <>
        <Ocean y={H * 0.4} dusk />
        <Frontage x={-W * 0.04} y={H * 0.6} w={W * 0.52} h={H * 0.26}
          wall={post} roof={p.accent} lit={lit} dark={dark} n={7} />
        <Wheel x={W * 0.84} y={H * 0.3} r={H * 0.2} frame={dark} lit={p.accent} />
        <Deck vp={0.44} top={H * 0.6} plank={dark} gap={p.ink} />
        {/* Wet planks: long reflections running toward the viewer. */}
        {[0.1, 0.22, 0.34, 0.76, 0.88].map((t, n) => (
          <path key={n} fill={lit} opacity={0.22 - (n % 3) * 0.05}
            d={`M ${r(W * t)} ${r(H * 0.62)} L ${r(W * (t + 0.02))} ${r(H * 0.62)}
                L ${r(W * (t + 0.1))} ${H} L ${r(W * (t - 0.06))} ${H} Z`} />
        ))}
        <StringLights y={H * 0.34} lit={lit} ink={dark} />
      </>
    )

    // 10. Sunrise on the Boards - empty, clean, the whole deck.
    default: return (
      <>
        <Ocean y={SEA} />
        <Sand y={H * 0.56} fill={board} />
        <Deck vp={0.48} top={H * 0.58} plank={plank} gap={dark} />
        <Rail y={H * 0.64} plank={post} lit={lit} />
        <Rail y={H * 0.64} right plank={post} lit={lit} />
        {/* The wheel again, unlit and still, at the far edge - the hero this
            scene was missing. Plus one bench: the whole story is "nobody is
            here yet". */}
        <Wheel x={W * 0.88} y={H * 0.26} r={H * 0.2} frame={p.ink} lit={dark} />
        <g fill={p.ink}>
          <rect x={r(W * 0.04)} y={r(H * 0.82)} width={r(W * 0.2)} height={r(H * 0.03)} />
          <rect x={r(W * 0.04)} y={r(H * 0.7)} width={r(W * 0.2)} height={r(H * 0.025)} />
          <rect x={r(W * 0.05)} y={r(H * 0.82)} width="11" height={r(H * 0.16)} />
          <rect x={r(W * 0.22)} y={r(H * 0.82)} width="11" height={r(H * 0.16)} />
        </g>
      </>
    )
  }
}

// ---------------------------------------------------------------------------
// Boardwalk vocabulary. Few shapes, long shapes.
// ---------------------------------------------------------------------------

function Ocean({ y, dusk }: { y: number; dusk?: boolean }) {
  return (
    <g>
      <rect x="0" y={r(y)} width={W} height={r(H - y)}
        fill={dusk ? '#2a3a62' : '#2f8fb0'} />
      {[0.2, 0.46, 0.76].map((t, n) => (
        <rect key={n} x="0" y={r(y + (H - y) * t)} width={W}
          height={r((H - y) * 0.04)} fill="#ffffff" opacity={0.1 + n * 0.05} />
      ))}
    </g>
  )
}

function Sand({ y, fill }: { y: number; fill: string }) {
  return <rect x="0" y={r(y)} width={W} height={r(H - y)} fill={fill} />
}

/**
 * The deck: boards converging on a vanishing point.
 *
 * The signature of the whole world, and the one thing that puts the viewer
 * on the boardwalk rather than in front of a picture of one. Cross-board
 * spacing follows a square law so they crowd toward the horizon; evenly
 * spaced rungs read as a ladder lying down.
 */
function Deck({ vp, top, plank, gap }: {
  vp: number; top: number; plank: string; gap: string
}) {
  const vx = W * vp
  const depth = H - top
  return (
    <g>
      <path fill={plank} d={`M ${r(-W * 0.4)} ${H} L ${r(vx - W * 0.04)} ${r(top)}
        L ${r(vx + W * 0.04)} ${r(top)} L ${r(W * 1.4)} ${H} Z`} />
      {/* Seven cross-boards, not twenty-two, and only in the near half.
          
          The dense version was the right idea and the wrong amount: a deck
          ruled with fine lines all the way to the horizon reads as hatching,
          and hatching is texture competing with the question text above it.
          Near the viewer the boards are wide enough to be structure; far
          away they are noise, so they simply stop. */}
      {Array.from({ length: 7 }, (_, n) => {
        const k = 0.34 + (n / 6) ** 1.6 * 0.66
        const y = top + depth * k
        const x1 = (vx - W * 0.04) + (-W * 0.4 - (vx - W * 0.04)) * k
        const x2 = (vx + W * 0.04) + (W * 1.4 - (vx + W * 0.04)) * k
        return (
          <line key={n} x1={r(x1)} y1={r(y)} x2={r(x2)} y2={r(y)} stroke={gap}
            strokeWidth={r(1.4 + k * 4)} opacity={0.1 + k * 0.1} />
        )
      })}
    </g>
  )
}

/** A railing along one edge, with a lamp on it. */
function Rail({ y, right, plank, lit }: {
  y: number; right?: boolean; plank: string; lit: string
}) {
  const x0 = right ? W * 0.62 : -20
  const x1 = right ? W + 20 : W * 0.38
  const drop = right ? 1 : -1
  return (
    <g>
      {/* Two rails and three posts. The third rail and the fourth post were
          four more lines at the busiest edge of the frame. */}
      {[0, 0.09].map((o, n) => (
        <path key={n} fill={plank}
          d={`M ${r(x0)} ${r(y + H * o)} L ${r(x1)} ${r(y + H * (o + drop * 0.12))}
              L ${r(x1)} ${r(y + H * (o + drop * 0.12) + 13)} L ${r(x0)} ${r(y + H * o + 13)} Z`} />
      ))}
      {[0.14, 0.56, 1].map((t, n) => {
        const x = x0 + (x1 - x0) * t
        return (
          <rect key={n} x={r(x)} y={r(y + H * (drop * 0.12 * t))} width="13"
            height={r(H * 0.22)} fill={plank} />
        )
      })}
      <circle cx={r(x0 + (x1 - x0) * 0.4)} cy={r(y + H * (drop * 0.048) - 14)}
        r="11" fill={lit} />
    </g>
  )
}

/**
 * One long building frontage with lit windows.
 *
 * Replaces what used to be a row of separate booths. At this size twelve
 * small rectangles read as debris; one wall with twelve windows reads as a
 * street, and it is one shape instead of twelve.
 */
function Frontage({ x, y, w, h, wall, roof, lit, dark, n }: {
  x: number; y: number; w: number; h: number
  wall: string; roof: string; lit: string; dark: string; n: number
}) {
  return (
    <g>
      <rect x={r(x)} y={r(y - h)} width={r(w)} height={r(h)} fill={wall} />
      {/* One continuous awning along the whole run. */}
      <rect x={r(x - 10)} y={r(y - h)} width={r(w + 20)} height={r(h * 0.14)}
        fill={roof} />
      <rect x={r(x - 10)} y={r(y - h + h * 0.14)} width={r(w + 20)} height={r(h * 0.04)}
        fill={dark} opacity=".4" />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={r(x + w * ((i + 0.28) / n))} y={r(y - h * 0.66)}
          width={r(w * (0.44 / n))} height={r(h * 0.44)} fill={lit} opacity=".88" />
      ))}
      <rect x={r(x)} y={r(y - h * 0.08)} width={r(w)} height={r(h * 0.08)}
        fill={dark} />
    </g>
  )
}

/** The wheel: rim, paired cables, cars hung outside, bulbs on the rim. */
function Wheel({ x, y, r: rad, frame, lit }: {
  x: number; y: number; r: number; frame: string; lit: string
}) {
  const spokes = 18
  return (
    <g transform={`translate(${r(x)} ${r(y)})`}>
      <path fill="none" stroke={frame} strokeWidth={r(rad * 0.06)}
        d={`M ${r(-rad * 0.5)} ${r(rad * 1.3)} L 0 0 L ${r(rad * 0.5)} ${r(rad * 1.3)}`} />
      <circle r={r(rad)} fill="none" stroke={frame} strokeWidth={r(rad * 0.04)} />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2
        const cx = Math.cos(a) * rad
        const cy = Math.sin(a) * rad
        return (
          <g key={i}>
            <line x1={r(-2)} y1="0" x2={r(cx)} y2={r(cy)} stroke={frame}
              strokeWidth={r(rad * 0.014)} />
            <line x1={r(2)} y1="0" x2={r(cx)} y2={r(cy)} stroke={frame}
              strokeWidth={r(rad * 0.014)} />
            <rect x={r(cx - rad * 0.055)} y={r(cy)} width={r(rad * 0.11)}
              height={r(rad * 0.08)} rx={r(rad * 0.02)} fill={frame} />
            <circle cx={r(cx)} cy={r(cy)} r={r(rad * 0.035)} fill={lit} />
            <circle cx={r(cx)} cy={r(cy)} r={r(rad * 0.1)} fill={lit} opacity=".22" />
          </g>
        )
      })}
      <circle r={r(rad * 0.09)} fill={frame} />
    </g>
  )
}

/** Pilings below a deck edge: one rank, evenly spaced, short. */
function Pilings({ y, n, fill, h }: {
  y: number; n: number; fill: string; h: number
}) {
  return (
    <g fill={fill}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={r((W / n) * (i + 0.5) - 7)} y={r(y)} width="14" height={r(h)} />
      ))}
    </g>
  )
}

/** Lamp standards on the deck. Few and tall, not many and small. */
function Lamps({ y, xs, h, ink, lit }: {
  y: number; xs: number[]; h: number; ink: string; lit: string
}) {
  return (
    <g>
      {xs.map((t, n) => (
        <g key={n}>
          <rect x={r(W * t - 6)} y={r(y - h)} width="12" height={r(h)} fill={ink} />
          <circle cx={r(W * t)} cy={r(y - h - 12)} r="17" fill={lit} />
          <circle cx={r(W * t)} cy={r(y - h - 12)} r="38" fill={lit} opacity=".16" />
        </g>
      ))}
    </g>
  )
}

/** A catenary of bulbs across the top. One line, not a thicket. */
function StringLights({ y, lit, ink }: {
  y: number; lit: string; ink: string
}) {
  const n = 26
  return (
    <g>
      <path d={`M -20 ${r(y - H * 0.06)} Q ${r(W * 0.5)} ${r(y + H * 0.06)}
        ${W + 20} ${r(y - H * 0.05)}`} fill="none" stroke={ink} strokeWidth="3" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n
        const x = -20 + (W + 40) * t
        const yy = (y - H * 0.06) + Math.sin(Math.PI * t) * H * 0.1
          + (H * 0.01) * t
        return (
          <g key={i}>
            <circle cx={r(x)} cy={r(yy)} r="7" fill={lit} />
            <circle cx={r(x)} cy={r(yy)} r="18" fill={lit} opacity=".14" />
          </g>
        )
      })}
    </g>
  )
}

/** Sea oats: thin stems with a seed head. The dune in one shape per blade. */
function SeaOats({ y, ink }: { y: number; ink: string }) {
  return (
    <g fill={ink}>
      {Array.from({ length: 26 }, (_, n) => {
        const x = ((n * 157) % 1000) / 1000 * W
        const h = 110 + ((n * 41) % 110)
        const lean = ((n * 23) % 26) - 13
        return (
          <g key={n}>
            <path d={`M ${r(x)} ${r(y + 40)} q ${r(lean)} ${r(-h * 0.6)}
              ${r(lean * 1.7)} ${r(-h)} l 5 1 q ${r(-lean * 1.5)} ${r(h * 0.5)}
              ${r(-lean * 1.6)} ${r(h)} z`} />
            <ellipse cx={r(x + lean * 1.8)} cy={r(y + 40 - h - 12)} rx="7" ry="17"
              transform={`rotate(${lean} ${r(x + lean * 1.8)} ${r(y + 40 - h - 12)})`} />
          </g>
        )
      })}
    </g>
  )
}
