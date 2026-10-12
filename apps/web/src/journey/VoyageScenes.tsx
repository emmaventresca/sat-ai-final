import { broadleaf, conifer, r, ridge } from './poster'
import { lightDefs, SunLight } from './atmosphere'
import type { Poster } from './poster'

/**
 * The Great Sea Voyage, as ten flat posters.
 *
 * Where the overland quest climbs, this one WIDENS - the emotional line is
 * "we do not know what lies beyond the horizon", so the compositions open out
 * rather than rising. The two worlds deliberately share no vocabulary: the
 * quest gets roads, stone, forest and snow; this gets sail, fog, island and
 * star. A conifer appears exactly twice here and never as the subject.
 *
 * The palette walks harbour-gold to clear blue to silver fog to storm iron to
 * green-gold enchantment to star-dark and out into dawn.
 */
const W = 1600
const H = 900

export const VOYAGE: Poster[] = [
  // 1. The Home Harbour - warm, enclosed, safe.
  { sky: ['#ab8b62', '#d3b687', '#fbe0ad', '#fdeabe', '#fff4cf'],
    planes: ['#9a7f6e', '#7a6458', '#564840', '#362e2b'],
    ink: '#241f20', light: '#fff6d8', accent: '#d9502f', sunAt: [0.78, 0.28] },
  // 2. The Departure - bright, open, wind.
  { sky: ['#2166a9', '#4a91c7', '#74bde4', '#a4d2e6', '#d3e6e8'],
    planes: ['#4f8fae', '#2f6f90', '#1d5473', '#113a54'],
    ink: '#0c2838', light: '#ffffff', accent: '#e8e2d0', sunAt: [0.22, 0.2] },
  // 3. The Misted Isles - flat silver, contrast gone.
  { sky: ['#8892ae', '#b2bbcb', '#dce3e8', '#ebeae9', '#faf2ea'],
    planes: ['#b0bcc6', '#94a3b0', '#76868f', '#56646d'],
    ink: '#3a464e', light: '#ffffff', accent: '#8fa0a8', sunAt: null },
  // 4. The Singing Coast - green-gold, warm against cool rock.
  { sky: ['#366f78', '#639c8b', '#8fc99e', '#bfd4a0', '#efe0a1'],
    planes: ['#6f8a6a', '#4e6a54', '#36503f', '#243a2e'],
    ink: '#16261e', light: '#fff4c0', accent: '#e8c45c', sunAt: [0.7, 0.3] },
  // 5. The Storm - iron, with one hot slot of sky.
  { sky: ['#1d2434', '#333b4a', '#48525f', '#6c6662', '#917a66'],
    planes: ['#5a6670', '#434e58', '#2f3840', '#1d242a'],
    ink: '#121719', light: '#ffd9a0', accent: '#e8e2d0', sunAt: [0.74, 0.34] },
  // 6. The Drowned Ruins - pale, still, everything slightly green.
  { sky: ['#6f7d8c', '#99a8ac', '#c4d2cc', '#d9ddd2', '#ede8d7'],
    planes: ['#8fa096', '#6f8078', '#53625c', '#3a4642'],
    ink: '#28322e', light: '#f4f8f0', accent: '#b8a870', sunAt: null },
  // 7. The Cold Sea - low sun, long shadows, ice.
  { sky: ['#3f4e7c', '#6c7ba0', '#9aa8c4', '#c7b8b3', '#f4c8a1'],
    planes: ['#dfe8f0', '#b4c4d4', '#7e90a8', '#4e5e78'],
    ink: '#2c3a50', light: '#ffe6b8', accent: '#ff9a5c', sunAt: [0.18, 0.46] },
  // 8. The Narrow Strait - deep shade, light only from the slot above.
  { sky: ['#4d6689', '#7f97ae', '#b0c8d4', '#d0dbdd', '#efeee6'],
    planes: ['#4a5a66', '#36434e', '#242e36', '#161d23'],
    ink: '#0e1317', light: '#fffbe8', accent: '#d8a858', sunAt: null },
  // 9. The World's Edge - night and dawn at once.
  { sky: ['#0e1430', '#243058', '#6a5a7e', '#d49a78'],
    planes: ['#5a5878', '#403e5c', '#2a2942', '#1a1a2c'],
    ink: '#0c0c18', light: '#ffe4c0', accent: '#ffd07a', sunAt: null },
  // 10. The Far Shore - full dawn, warm, everything ahead.
  { sky: ['#a77756', '#d1a779', '#fbd79c', '#fde4b0', '#fff0c4'],
    planes: ['#e8e0cc', '#b8bfa0', '#8a9a72', '#5e724e'],
    ink: '#36422e', light: '#fffbe0', accent: '#e8703c', sunAt: [0.56, 0.3] },
]

export function VoyageScene({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = VOYAGE[i]
  const id = `v${i}`
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
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
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
      <rect width={W} height={H} filter={`url(#grain${id})`} opacity=".06"
        style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

/** Where the water starts in most scenes. */
const SEA = H * 0.58

function Body({ i }: { i: number }) {
  const p = VOYAGE[i]
  const [far, mid, near, fore] = p.planes

  switch (i) {
    // 1. The Home Harbour - quay left, crooked houses, boats, gulls.
    case 0: return (
      <>
        <path d={ridge(SEA - H * 0.04, W, H * 0.08, 5, 3, SEA)} fill={far} />
        <Water y={SEA} fill={mid} />
        {/* The quay runs down the left edge, houses stacked above it. */}
        <path fill={near} d={`M -20 ${H} L -20 ${SEA - H * 0.02}
          L ${W * 0.3} ${SEA + H * 0.04} L ${W * 0.26} ${H} Z`} />
        <Houses x={W * 0.03} y={SEA + H * 0.02} n={4} ink={p.ink}
          roof={p.accent} lit={p.light} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.84} L ${W * 0.34} ${H * 0.94}
          L ${W * 0.3} ${H} Z`} />
        {/* Two fishing boats, small, at the quay foot. */}
        <Boat x={W * 0.36} y={H * 0.9} s={120} ink={p.ink} sail={null} />
        <Boat x={W * 0.52} y={H * 0.95} s={150} ink={p.ink} sail={null} />
        {/* Nets on poles, right edge, cropped. */}
        <g fill={p.ink}>
          <rect x={r(W * 0.94)} y={r(H * 0.6)} width="11" height={H * 0.4} />
          <path d={`M ${W * 0.9} ${H * 0.62} L ${W * 1.02} ${H * 0.6}
            L ${W * 1.02} ${H * 0.82} L ${W * 0.9} ${H * 0.76} Z`} opacity=".55" />
        </g>
        <Gulls ink={p.ink} />
      </>
    )

    // 2. The Departure - the ship under way, headland behind, crowd tiny.
    case 1: return (
      <>
        <path d={ridge(SEA - H * 0.02, W, H * 0.07, 4, 7, SEA)} fill={far} />
        <Water y={SEA} fill={mid} />
        <path fill={near} d={`M -20 ${H} L -20 ${SEA + H * 0.04}
          L ${W * 0.22} ${SEA + H * 0.1} L ${W * 0.18} ${H} Z`} />
        {/* The ship at the right third, full sail, heeled. */}
        <Ship x={W * 0.82} y={SEA + H * 0.14} s={320} ink={p.ink}
          sail={p.accent} heel={-7} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.88} L ${W * 0.26} ${H * 0.96}
          L ${W * 0.22} ${H} Z`} />
        {/* The crowd left behind, small, on the point. */}
        <Crowd x={W * 0.08} y={H * 0.9} n={9} ink={p.ink} />
        <Gulls ink={p.ink} />
      </>
    )

    // 3. The Misted Isles - ranks of rock fading, one wheeling bird.
    case 2: return (
      <>
        {[[0.16, 0.34, far], [0.3, 0.26, mid], [0.56, 0.2, near]]
          .map(([t, h, fill], n) => (
          <Isles key={n} y={SEA - H * (t as number) * 0.2} h={H * (h as number) * 0.4}
            fill={fill as string} seed={n * 13 + 5} />
        ))}
        <Water y={SEA} fill={fore} />
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.9} L ${W * 0.2} ${H * 0.96}
          L ${W * 0.16} ${H} Z`} />
        <Gulls ink={p.ink} />
      </>
    )

    // 4. The Singing Coast - cliff left, slender falls, a lit stair.
    case 3: return (
      <>
        <path d={ridge(SEA - H * 0.1, W, H * 0.12, 5, 11, SEA)} fill={far} />
        <Water y={SEA} fill={mid} />
        {/* The cliff fills the left; the stair is a narrow bright vertical. */}
        <path fill={near} d={`M -20 ${H} L -20 ${H * 0.04} L ${W * 0.3} ${H * 0.1}
          L ${W * 0.36} ${SEA + H * 0.2} L ${W * 0.26} ${H} Z`} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.3} L ${W * 0.18} ${H * 0.36}
          L ${W * 0.22} ${H} Z`} />
        {[0.2, 0.27].map((t, n) => (
          <path key={n} fill={p.light} opacity=".85"
            d={`M ${W * t} ${H * 0.14} l ${7 + n * 3} 0 l ${-2} ${H * 0.44}
                l ${-(5 + n * 3)} 0 z`} />
        ))}
        <Stair x={W * 0.3} top={H * 0.2} bottom={SEA + H * 0.16} ink={p.light} />
        {[0.06, 0.13].map((t, n) => (
          <path key={n} d={broadleaf(W * t, H * 0.22, 150 - n * 40, n + 2)}
            fill={p.ink} />
        ))}
        {/* One lamp among the trees - somebody lives up there. */}
        <circle cx={W * 0.1} cy={H * 0.2} r="9" fill={p.accent} />
      </>
    )

    // 5. The Storm - a wave wall, the ship heeled, one break of light.
    case 4: return (
      <>
        {/* Torn cloud: hard-edged lozenges, not soft masses. */}
        {[[0.1, 0.1, 0.5], [0.42, 0.06, 0.34], [0.72, 0.13, 0.42]].map(([t, y, s], n) => (
          <ellipse key={n} cx={W * (t as number)} cy={H * (y as number)}
            rx={W * (s as number) * 0.5} ry={H * 0.045} fill={far} opacity=".9" />
        ))}
        <Water y={SEA - H * 0.04} fill={mid} />
        {/* The wave wall, rising from the left across the lower frame. */}
        <path fill={near} d={`M -20 ${H} L -20 ${H * 0.52}
          Q ${W * 0.3} ${H * 0.3} ${W * 0.56} ${H * 0.72}
          Q ${W * 0.76} ${H} ${W + 20} ${H * 0.88} L ${W + 20} ${H} Z`} />
        <path fill={p.light} opacity=".5" d={`M -20 ${H * 0.52}
          Q ${W * 0.3} ${H * 0.3} ${W * 0.56} ${H * 0.72}
          Q ${W * 0.3} ${H * 0.38} ${-20} ${H * 0.6} Z`} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.78}
          Q ${W * 0.4} ${H * 0.96} ${W + 20} ${H * 0.82} L ${W + 20} ${H} Z`} />
        <Ship x={W * 0.3} y={H * 0.62} s={230} ink={p.ink} sail={null} heel={-22} />
      </>
    )

    // 6. The Drowned Ruins - columns and a stair rising from calm water.
    case 5: return (
      <>
        <path d={ridge(SEA - H * 0.06, W, H * 0.06, 5, 17, SEA)} fill={far} />
        <Water y={SEA} fill={mid} />
        {/* Columns flank; the middle is open water. */}
        {[[0.06, 0.34], [0.14, 0.26], [0.86, 0.3], [0.94, 0.22]].map(([t, h], n) => (
          <g key={n}>
            <rect x={r(W * (t as number))} y={r(SEA - H * (h as number))}
              width={r(W * 0.035)} height={r(H * (h as number) + H * 0.1)}
              fill={n < 2 ? near : fore} />
            <rect x={r(W * (t as number) - W * 0.008)} y={r(SEA - H * (h as number))}
              width={r(W * 0.051)} height={r(H * 0.022)} fill={n < 2 ? near : fore} />
          </g>
        ))}
        <path fill={fore} d={`M ${W * 0.04} ${H} L ${W * 0.04} ${SEA + H * 0.02}
          L ${W * 0.24} ${SEA + H * 0.06} L ${W * 0.2} ${H} Z`} />
        <Stair x={W * 0.12} top={SEA + H * 0.04} bottom={H * 0.96} ink={near} />
        {/* A tilted statue base, right, half-sunk. */}
        <g transform={`rotate(-9 ${W * 0.8} ${H * 0.86})`}>
          <rect x={r(W * 0.76)} y={r(H * 0.72)} width={r(W * 0.08)}
            height={r(H * 0.2)} fill={p.ink} />
        </g>
      </>
    )

    // 7. The Cold Sea - floes, a low sun, very long shadows.
    case 6: return (
      <>
        <path d={ridge(SEA - H * 0.12, W, H * 0.1, 5, 23, SEA)} fill={far} />
        <Water y={SEA} fill={near} />
        {/* Floes: small, scattered, none large enough to be a mass. */}
        {Array.from({ length: 13 }, (_, n) => {
          const t = n / 12
          const x = ((n * 211) % 1000) / 1000
          const y = SEA + H * 0.04 + t * H * 0.34
          const s = 30 + t * 90
          return (
            <g key={n}>
              <ellipse cx={r(W * x)} cy={r(y)} rx={r(s)} ry={r(s * 0.26)} fill={mid} />
              {/* The shadow is longer than the floe - that is the hour. */}
              <ellipse cx={r(W * x + s * 1.8)} cy={r(y + s * 0.12)} rx={r(s * 1.5)}
                ry={r(s * 0.16)} fill={fore} opacity=".45" />
            </g>
          )
        })}
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.88} L ${W * 0.18} ${H * 0.95}
          L ${W * 0.14} ${H} Z`} />
      </>
    )

    // 8. The Narrow Strait - two carved walls, the ship tiny between.
    case 7: return (
      <>
        <Water y={SEA + H * 0.1} fill={mid} />
        {/* The two cliffs are the frame; the lit channel runs up the middle. */}
        <path fill={near} d={`M -20 ${H} L -20 -20 L ${W * 0.34} -20
          L ${W * 0.4} ${H * 0.52} L ${W * 0.3} ${H} Z`} />
        <path fill={fore} d={`M ${W + 20} ${H} L ${W + 20} -20 L ${W * 0.7} -20
          L ${W * 0.64} ${H * 0.48} L ${W * 0.74} ${H} Z`} />
        {/* Carved faces: huge, flat, suggested by two notches each. */}
        {[0.2, 0.84].map((t, n) => (
          <g key={n} fill={p.ink} opacity=".3">
            <rect x={r(W * t)} y={r(H * 0.2)} width={r(W * 0.07)}
              height={r(H * 0.03)} />
            <rect x={r(W * t)} y={r(H * 0.34)} width={r(W * 0.05)}
              height={r(H * 0.025)} />
          </g>
        ))}
        <Ship x={W * 0.5} y={H * 0.82} s={130} ink={p.ink} sail={p.light} heel={0} />
      </>
    )

    // 9. The World's Edge - the sea falling into cloud and stars.
    case 8: return (
      <>
        <Stars ink="#ffffff" />
        <path d={ridge(H * 0.4, W, H * 0.05, 7, 29, H * 0.56)} fill={far} opacity=".7" />
        {/* The horizon curves - the one scene where it is not a straight line. */}
        <path fill={mid} d={`M -20 ${H} L -20 ${H * 0.62}
          Q ${W * 0.5} ${H * 0.5} ${W + 20} ${H * 0.62} L ${W + 20} ${H} Z`} />
        {/* The fall: a hard-edged band of cloud where the water ends. */}
        {[0.66, 0.72, 0.78].map((t, n) => (
          <ellipse key={n} cx={W * (0.3 + n * 0.22)} cy={H * t} rx={W * 0.4}
            ry={H * 0.028} fill={p.light} opacity={0.5 - n * 0.12} />
        ))}
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.86}
          Q ${W * 0.4} ${H * 0.96} ${W + 20} ${H * 0.84} L ${W + 20} ${H} Z`} />
        <Ship x={W * 0.18} y={H * 0.9} s={170} ink={p.ink} sail={p.accent} heel={-4} />
      </>
    )

    // 10. The Far Shore - white cliffs, a river mouth, green hills, nobody.
    default: return (
      <>
        <path d={ridge(SEA - H * 0.14, W, H * 0.12, 5, 31, SEA)} fill={mid} />
        {/* The white cliffs, right, catching full dawn. */}
        <path fill={far} d={`M ${W * 0.56} ${SEA} L ${W * 0.6} ${H * 0.3}
          L ${W * 0.72} ${H * 0.26} L ${W * 0.8} ${H * 0.34}
          L ${W * 0.94} ${H * 0.3} L ${W + 20} ${SEA} Z`} />
        {/* The river mouth cutting in, left of centre. */}
        <path fill={near} d={`M -20 ${SEA} L ${W * 0.5} ${SEA}
          L ${W * 0.4} ${SEA + H * 0.1} L -20 ${SEA + H * 0.06} Z`} />
        <Water y={SEA + H * 0.06} fill={p.planes[3]} />
        {[0.08, 0.16, 0.9, 0.96].map((t, n) => (
          <path key={n} d={n < 2
            ? broadleaf(W * t, SEA + H * 0.04, 120 - n * 26, n + 5)
            : conifer(W * t, SEA + H * 0.02, 140 - (n - 2) * 30, n)}
            fill={p.ink} />
        ))}
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.9} L ${W * 0.22} ${H * 0.96}
          L ${W * 0.18} ${H} Z`} />
      </>
    )
  }
}

// ---------------------------------------------------------------------------

function Water({ y, fill }: { y: number; fill: string }) {
  return (
    <>
      <rect x="0" y={y} width={W} height={H - y} fill={fill} />
      {/* Three flat bands, hard-edged. A gradient here would be a painting. */}
      {[0.2, 0.45, 0.74].map((t, n) => (
        <rect key={n} x="0" y={r(y + (H - y) * t)} width={W}
          height={r((H - y) * 0.04)} fill="#ffffff" opacity={0.08 + n * 0.04} />
      ))}
    </>
  )
}

/** A tall ship: hull, three masts, square sails. Heel sells the wind. */
function Ship({ x, y, s, ink, sail, heel }: {
  x: number; y: number; s: number; ink: string; sail: string | null; heel: number
}) {
  return (
    <g transform={`rotate(${heel} ${x} ${y})`}>
      <path fill={ink} d={`M ${r(x - s * 0.5)} ${r(y)} q ${r(s * 0.5)} ${r(s * 0.2)}
        ${r(s)} 0 q ${r(-s * 0.12)} ${r(s * 0.13)} ${r(-s * 0.5)} ${r(s * 0.13)}
        q ${r(-s * 0.38)} 0 ${r(-s * 0.5)} ${r(-s * 0.13)} Z`} />
      {[-0.26, 0, 0.26].map((t, n) => (
        <rect key={n} x={r(x + s * t)} y={r(y - s * (0.9 - Math.abs(t)))}
          width={r(s * 0.018)} height={r(s * (0.9 - Math.abs(t)))} fill={ink} />
      ))}
      {sail && [-0.26, 0, 0.26].map((t, n) => (
        <g key={n}>
          {[0.3, 0.56].map((h, j) => (
            <path key={j} fill={sail} opacity={0.92 - j * 0.1}
              d={`M ${r(x + s * t - s * 0.17)} ${r(y - s * (0.86 - Math.abs(t)) + s * h)}
                  L ${r(x + s * t + s * 0.17)} ${r(y - s * (0.86 - Math.abs(t)) + s * h)}
                  L ${r(x + s * t + s * 0.14)} ${r(y - s * (0.86 - Math.abs(t)) + s * (h + 0.2))}
                  L ${r(x + s * t - s * 0.14)} ${r(y - s * (0.86 - Math.abs(t)) + s * (h + 0.2))} Z`} />
          ))}
        </g>
      ))}
    </g>
  )
}

/** A small open boat. No sail: these are moored. */
function Boat({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string; sail: null
}) {
  return (
    <g fill={ink}>
      <path d={`M ${r(x - s * 0.5)} ${r(y)} q ${r(s * 0.5)} ${r(s * 0.22)}
        ${r(s)} 0 q ${r(-s * 0.14)} ${r(s * 0.12)} ${r(-s * 0.5)} ${r(s * 0.12)}
        q ${r(-s * 0.36)} 0 ${r(-s * 0.5)} ${r(-s * 0.12)} Z`} />
      <rect x={r(x - s * 0.01)} y={r(y - s * 0.56)} width={r(s * 0.02)}
        height={r(s * 0.56)} />
    </g>
  )
}

/** Crooked waterfront houses, stacked up a quay. */
function Houses({ x, y, n, ink, roof, lit }: {
  x: number; y: number; n: number; ink: string; roof: string; lit: string
}) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const w = 92 + ((i * 37) % 44)
        const h = 130 + ((i * 53) % 90)
        const bx = x + i * 86
        const by = y - i * 26
        return (
          <g key={i}>
            <rect x={r(bx)} y={r(by - h)} width={r(w)} height={r(h)} fill={ink} />
            <path fill={roof} d={`M ${r(bx - 9)} ${r(by - h)}
              L ${r(bx + w / 2)} ${r(by - h - 40)} L ${r(bx + w + 9)} ${r(by - h)} Z`} />
            {[0.2, 0.56].map((t, j) => (
              <rect key={j} x={r(bx + w * t)} y={r(by - h * 0.74)}
                width={r(w * 0.2)} height={r(h * 0.22)} fill={lit} opacity=".8" />
            ))}
          </g>
        )
      })}
    </g>
  )
}

function Isles({ y, h, fill, seed }: {
  y: number; h: number; fill: string; seed: number
}) {
  return (
    <g fill={fill}>
      {Array.from({ length: 5 }, (_, n) => {
        const x = ((n * 211 + seed * 97) % 1000) / 1000 * W
        const hh = h * (0.5 + ((n * 37) % 60) / 100)
        const w = hh * 0.8
        return (
          <path key={n} d={`M ${r(x - w)} ${r(y + h)} L ${r(x - w * 0.3)} ${r(y + h - hh)}
            L ${r(x + w * 0.2)} ${r(y + h - hh * 0.72)} L ${r(x + w)} ${r(y + h)} Z`} />
        )
      })}
    </g>
  )
}

function Stair({ x, top, bottom, ink }: {
  x: number; top: number; bottom: number; ink: string
}) {
  const n = 16
  return (
    <g fill={ink} opacity=".7">
      {Array.from({ length: n }, (_, i) => {
        const t = i / n
        return (
          <rect key={i} x={r(x - 22 + t * 10)} y={r(top + (bottom - top) * t)}
            width={r(44 - t * 18)} height="6" />
        )
      })}
    </g>
  )
}

function Crowd({ x, y, n, ink }: {
  x: number; y: number; n: number; ink: string
}) {
  return (
    <g fill={ink}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${r(x + i * 15)} ${r(y - (i % 3) * 4)})`}>
          <circle cx="0" cy="-17" r="4.4" />
          <path d="M -5 -13 q 5 -4 10 0 l 3 15 l -16 0 z" />
        </g>
      ))}
    </g>
  )
}

function Gulls({ ink }: { ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="3" opacity=".5">
      {[[0.3, 0.14], [0.4, 0.09], [0.62, 0.17], [0.72, 0.11]].map(([tx, ty], n) => (
        <path key={n} d={`M ${r(W * tx - 15)} ${r(H * ty)} q 15 -10 15 0 q 0 -10 15 0`} />
      ))}
    </g>
  )
}

function Stars({ ink }: { ink: string }) {
  return (
    <g fill={ink}>
      {Array.from({ length: 110 }, (_, n) => (
        <circle key={n} cx={r(((n * 367) % 1000) / 1000 * W)}
          cy={r(((n * 173) % 1000) / 1000 * H * 0.62)}
          r={0.9 + ((n * 11) % 3) * 0.6}
          opacity={0.3 + ((n * 7) % 6) * 0.1} />
      ))}
    </g>
  )
}
