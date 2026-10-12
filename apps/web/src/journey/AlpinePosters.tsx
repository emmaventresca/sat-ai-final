import { r, ridge } from './poster'
import { lightDefs, SunLight } from './atmosphere'
import type { Poster } from './poster'

/**
 * Alpine Expedition, as ten flat posters.
 *
 * Above the treeline in all ten. That is the rule that keeps this world apart
 * from the parks, and it is a vocabulary rule rather than a colour one: the
 * parks have trees, trails and water, and this has none of them. If a conifer
 * appears here the scene is wrong.
 *
 * The value structure is inverted on purpose - dark sky, blazing snow in the
 * distance, near-black foreground. A dark frame around a blazing white centre
 * is where the awe lives, and the thin-air sky being darker than the mountain
 * is both physically true and the whole trick.
 *
 * Snow shadow is blue and snow light is warm. Grey snow is the fastest way to
 * make this subject look cheap.
 */
const W = 1600
const H = 900

export const ALPINE: Poster[] = [
  { sky: ['#081536', '#193563', '#2a5490', '#587eae', '#85a8cc'], planes: ['#fff4e8', '#a8c6e8', '#3e6aa8', '#1a2235'],
    ink: '#0d1324', light: '#ffeeda', accent: '#f0785e', sunAt: null },
  { sky: ['#6377a0', '#94a6c0', '#c4d4e0', '#dce1e4', '#f4eee8'], planes: ['#eef3f7', '#d4dfe8', '#b4c2d0', '#8e9eb0'],
    ink: '#4a5668', light: '#ffffff', accent: '#d82c2c', sunAt: null },
  { sky: ['#0a1a3b', '#1c3a67', '#2f5a94', '#7d6689', '#cc737f'], planes: ['#fff4e8', '#ff9eb0', '#6a71a3', '#262b4d'],
    ink: '#0b1020', light: '#fff4e8', accent: '#f0785e', sunAt: null },
  { sky: ['#0d2248', '#1e416c', '#2f6090', '#5280a6', '#75a0bc'], planes: ['#dff0fa', '#9fcde8', '#4e8fb8', '#1e4e70'],
    ink: '#0e2c42', light: '#ffffff', accent: '#1e8fa8', sunAt: [0.78, 0.16] },
  { sky: ['#07112e', '#12264e', '#1e3a6e', '#3e5f8d', '#5e84ad'], planes: ['#ffffff', '#cfe0f0', '#8fa8c8', '#3e5d78'],
    ink: '#16233a', light: '#ffffff', accent: '#d82c2c', sunAt: [0.2, 0.12] },
  { sky: ['#101c44', '#3a4a84', '#b07898', '#f4c0a0'], planes: ['#fff0e0', '#ffb49c', '#7a7ea8', '#2e3450'],
    ink: '#121828', light: '#fff4e8', accent: '#f0785e', sunAt: null },
  { sky: ['#0a1a41', '#1c3969', '#2e5890', '#6284ae', '#96b0cc'], planes: ['#e8eff6', '#bccbd9', '#8496ac', '#4e5e76'],
    ink: '#223046', light: '#ffffff', accent: '#17a34a', sunAt: null },
  { sky: ['#20293f', '#3b465d', '#56637a', '#767e91', '#959aa7'], planes: ['#d4dbe4', '#aeb8c4', '#848f9e', '#5a6474'],
    ink: '#333c4a', light: '#f0f4f8', accent: '#d82c2c', sunAt: null },
  { sky: ['#081737', '#193460', '#2a5288', '#6689ac', '#a2c0cf'], planes: ['#eaf6fb', '#a8d8e8', '#4e9ab8', '#24627e'],
    ink: '#15324a', light: '#ffffff', accent: '#f2c014', sunAt: [0.26, 0.2] },
  { sky: ['#050b21', '#0d1a37', '#16294e', '#293a5f', '#3d4a6f'], planes: ['#fff4e8', '#d8c4d0', '#6a6e92', '#2e3450'],
    ink: '#0a0f1e', light: '#fff4e8', accent: '#ff9eb0', sunAt: null },
]

export function AlpinePoster({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = ALPINE[i]
  const id = `al${i}`
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

function Body({ i }: { i: number }) {
  const p = ALPINE[i]
  const [snow, lit2, rock, deep] = p.planes

  switch (i) {
    // 1. Base Camp - bright tents on moraine, only the summit lit.
    case 0: return (
      <>
        <Peaks y={H * 0.68} h={H * 0.56} snow={snow} shade={lit2} rock={rock}
          glow={p.accent} seed={3} n={4} />
        <path d={ridge(H * 0.72, W, H * 0.06, 6, 7, H)} fill={deep} />
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.8} L ${W * 0.42} ${H * 0.9}
          L ${W + 20} ${H * 0.84} L ${W + 20} ${H} Z`} />
        {/* Tents along the bottom, bright against near-black moraine. */}
        {[[0.05, 1], [0.13, 0.82], [0.22, 0.95], [0.84, 0.88], [0.93, 1.05]]
          .map(([t, s], n) => (
          <g key={n} transform={`translate(${r(W * (t as number))} ${r(H * 0.95)})
            scale(${s as number})`}>
            <path d="M -36 0 L 0 -46 L 36 0 Z" fill={n % 2 ? p.accent : '#f2c014'} />
            <path d="M -36 0 L 0 -46 L 7 -46 L -22 0 Z" fill={p.ink} opacity=".4" />
          </g>
        ))}
        {/* Fixed lines strung between poles. */}
        <path d={`M ${W * 0.04} ${H * 0.86} Q ${W * 0.16} ${H * 0.9} ${W * 0.28} ${H * 0.85}`}
          fill="none" stroke={p.ink} strokeWidth="3" />
      </>
    )

    // 2. Glacier Crossing - whiteout, a rope team, wands marking the route.
    case 1: return (
      <>
        <rect width={W} height={H} fill={snow} />
        <path d={ridge(H * 0.4, W, H * 0.07, 6, 11, H)} fill={lit2} opacity=".7" />
        <path d={ridge(H * 0.62, W, H * 0.05, 5, 13, H)} fill={p.planes[2]} opacity=".5" />
        {/* Crevasse lines: thin, curving, the only drawing in a flat field. */}
        {Array.from({ length: 6 }, (_, n) => (
          <path key={n} fill="none" stroke={deep} strokeWidth={2 + n} opacity=".4"
            d={`M ${-20 + n * 40} ${r(H * (0.7 + n * 0.05))}
                Q ${W * 0.5} ${r(H * (0.64 + n * 0.055))} ${W + 20} ${r(H * (0.72 + n * 0.048))}`} />
        ))}
        {/* Wands: a line of small flags marching into the white. */}
        {Array.from({ length: 9 }, (_, n) => {
          const t = n / 8
          return (
            <g key={n}>
              <rect x={r(W * (0.06 + t * 0.24))} y={r(H * (0.98 - t * 0.2))}
                width="3" height={r(40 - t * 22)} fill={p.ink} />
              <rect x={r(W * (0.06 + t * 0.24) + 3)} y={r(H * (0.98 - t * 0.2))}
                width={r(16 - t * 8)} height={r(11 - t * 5)} fill={p.accent} />
            </g>
          )
        })}
        <RopeTeam x={W * 0.74} y={H * 0.9} n={3} s={1} ink={p.ink} />
      </>
    )

    // 3. Mountain Ridge - a knife-edge corner to corner, two climbers.
    case 2: return (
      <>
        <Peaks y={H * 0.6} h={H * 0.5} snow={snow} shade={lit2} rock={rock}
          glow={p.accent} seed={17} n={4} />
        {/* The ridge runs corner to corner, missing the middle entirely. */}
        <path fill={rock} d={`M -20 ${H} L -20 ${H * 0.52}
          Q ${W * 0.3} ${H * 0.4} ${W * 0.72} ${H * 0.2} L ${W * 0.8} ${H * 0.26}
          Q ${W * 0.4} ${H * 0.5} ${W * 0.1} ${H} Z`} />
        <path fill={snow} d={`M -20 ${H * 0.52} Q ${W * 0.3} ${H * 0.4}
          ${W * 0.72} ${H * 0.2} L ${W * 0.74} ${H * 0.24}
          Q ${W * 0.3} ${H * 0.45} ${-20} ${H * 0.57} Z`} />
        {/* Cornice: a lip overhanging the lee side. */}
        <path fill={lit2} opacity=".8" d={`M ${W * 0.3} ${H * 0.4}
          q ${W * 0.08} ${-H * 0.03} ${W * 0.14} ${-H * 0.01}
          q ${-W * 0.07} ${H * 0.04} ${-W * 0.14} ${H * 0.01} z`} />
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.88} L ${W * 0.2} ${H * 0.96}
          L ${W * 0.16} ${H} Z`} />
        <RopeTeam x={W * 0.42} y={H * 0.56} n={2} s={0.85} ink={p.ink} />
      </>
    )

    // 4. Ice Wall - one vertical plane, fluted, with a climber on it.
    case 3: return (
      <>
        <path fill={p.planes[0]} d={`M -20 ${H} L ${W * 0.04} ${-20}
          L ${W * 0.96} ${-20} L ${W + 20} ${H} Z`} />
        {/* Flutes: fine, even, many. Texture rather than shapes. */}
        {Array.from({ length: 26 }, (_, n) => {
          const t = n / 25
          const x = W * (0.04 + t * 0.92)
          return (
            <path key={n} fill={lit2} opacity={0.3 + ((n * 7) % 5) * 0.08}
              d={`M ${r(x)} ${-20} Q ${r(x + 14)} ${r(H * 0.5)} ${r(x + 6)} ${H}
                  L ${r(x + 24)} ${H} Q ${r(x + 32)} ${r(H * 0.5)} ${r(x + 18)} ${-20} Z`} />
          )
        })}
        {/* The climber: small, off-centre, and all the scale there is. */}
        <g transform={`translate(${W * 0.16} ${H * 0.66})`}>
          <circle cx="0" cy="-20" r="9" fill={p.accent} />
          <path d="M -9 -14 q 9 -6 18 0 l 4 26 l -26 0 z" fill={p.accent} />
          <path d="M 9 -12 L 34 -40" stroke={p.ink} strokeWidth="4" fill="none" />
          <path d="M -9 -10 L -32 -36" stroke={p.ink} strokeWidth="4" fill="none" />
        </g>
        <path d={`M ${W * 0.16} ${H * 0.66} Q ${W * 0.1} ${H * 0.86} ${W * 0.14} ${H}`}
          fill="none" stroke={p.ink} strokeWidth="3" />
        <path fill={deep} d={`M -20 ${H} L -20 ${H * 0.9} L ${W * 0.3} ${H * 0.97}
          L ${W * 0.26} ${H} Z`} />
      </>
    )

    // 5. Summit Push - a near-vertical slope, fixed line, curve of the earth.
    case 4: return (
      <>
        <path fill={p.planes[1]} opacity=".5" d={`M -20 ${H * 0.44}
          Q ${W * 0.5} ${H * 0.36} ${W + 20} ${H * 0.44} L ${W + 20} ${H * 0.5}
          Q ${W * 0.5} ${H * 0.42} ${-20} ${H * 0.5} Z`} />
        <path fill={p.planes[0]} d={`M -20 ${H} L ${W * 0.34} ${H * 0.16}
          L ${W * 0.5} ${H * 0.2} L ${W + 20} ${H} Z`} />
        <path fill={p.planes[2]} opacity=".6" d={`M -20 ${H} L ${W * 0.34} ${H * 0.16}
          L ${W * 0.38} ${H * 0.18} L ${W * 0.16} ${H} Z`} />
        {/* The fixed line, with climbers on it, in the left third. */}
        <path d={`M ${W * 0.36} ${H * 0.2} Q ${W * 0.24} ${H * 0.6} ${W * 0.14} ${H}`}
          fill="none" stroke={p.accent} strokeWidth="4" />
        {[0.34, 0.56, 0.78].map((t, n) => (
          <g key={n} transform={`translate(${r(W * (0.34 - t * 0.17))} ${r(H * (0.26 + t * 0.66))})`}>
            <circle cx="0" cy="-19" r="8" fill={p.ink} />
            <path d="M -8 -13 q 8 -6 16 0 l 4 24 l -24 0 z" fill={p.ink} />
          </g>
        ))}
      </>
    )

    // 6. Alpine Sunrise - peak tips rose-lit, everything below still blue.
    case 5: return (
      <>
        <Peaks y={H * 0.66} h={H * 0.58} snow={snow} shade={lit2} rock={p.planes[2]}
          glow={p.accent} seed={23} n={5} />
        {/* The cutoff: below this line nothing is lit. Fairly abrupt. */}
        <path fill={deep} opacity=".82" d={`M -20 ${H} L -20 ${H * 0.42}
          Q ${W * 0.5} ${H * 0.46} ${W + 20} ${H * 0.4} L ${W + 20} ${H} Z`} />
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.76} L ${W * 0.34} ${H * 0.88}
          L ${W + 20} ${H * 0.8} L ${W + 20} ${H} Z`} />
      </>
    )

    // 7. Mountain Pass - prayer flags across a col, range beyond.
    case 6: return (
      <>
        <Peaks y={H * 0.68} h={H * 0.46} snow={snow} shade={lit2} rock={p.planes[2]}
          glow={p.accent} seed={29} n={5} />
        <path d={ridge(H * 0.72, W, H * 0.06, 5, 31, H)} fill={deep} />
        <Cairn x={W * 0.12} y={H * 0.84} s={130} ink={p.ink} />
        {/* Flags cross the upper third as thin colour, in the fixed order. */}
        <Flags from={[W * 0.12, H * 0.42]} to={[W * 1.06, H * 0.3]} sag={H * 0.14} />
        <Flags from={[W * 0.12, H * 0.42]} to={[-W * 0.08, H * 0.54]} sag={H * 0.05} />
        <path fill={p.ink} d={`M -20 ${H} L -20 ${H * 0.86} L ${W * 0.3} ${H * 0.95}
          L ${W + 20} ${H * 0.88} L ${W + 20} ${H} Z`} />
      </>
    )

    // 8. Storm on the Mountain - spindrift, form almost gone.
    case 7: return (
      <>
        <rect width={W} height={H} fill={p.planes[1]} opacity=".4" />
        <path d={ridge(H * 0.5, W, H * 0.1, 5, 37, H)} fill={p.planes[2]} opacity=".5" />
        {/* Spindrift: long flat streaks, all one direction. */}
        {Array.from({ length: 16 }, (_, n) => (
          <path key={n} fill={p.light} opacity={0.3 - (n % 5) * 0.04}
            d={`M ${-100 + ((n * 173) % 1200)} ${r(H * (0.2 + (n % 9) * 0.08))}
                q ${W * 0.3} ${-28 - (n % 4) * 14} ${W * 0.62} ${-10 - (n % 5) * 12}
                q ${-W * 0.3} ${20 + (n % 4) * 10} ${-W * 0.62} ${24} z`} />
        ))}
        <path fill={deep} d={`M -20 ${H} L -20 ${H * 0.76} L ${W * 0.4} ${H * 0.88}
          L ${W + 20} ${H * 0.8} L ${W + 20} ${H} Z`} />
        <RopeTeam x={W * 0.2} y={H * 0.9} n={3} s={0.9} ink={p.ink} />
      </>
    )

    // 9. Frozen Lake - turquoise ice pan, pressure ridges, a yak train.
    case 8: return (
      <>
        <Peaks y={H * 0.56} h={H * 0.46} snow={snow} shade={lit2} rock={p.planes[2]}
          glow={p.accent} seed={41} n={4} />
        <rect x="0" y={H * 0.58} width={W} height={H * 0.42} fill={p.planes[1]} />
        {/* Pressure ridges: hard broken lines across the pan. */}
        {Array.from({ length: 7 }, (_, n) => (
          <path key={n} fill={p.planes[2]} opacity=".5"
            d={`M ${-20} ${r(H * (0.64 + n * 0.05))}
                L ${r(W * 0.3)} ${r(H * (0.62 + n * 0.05))}
                L ${r(W * 0.62)} ${r(H * (0.66 + n * 0.05))}
                L ${W + 20} ${r(H * (0.63 + n * 0.05))}
                L ${W + 20} ${r(H * (0.65 + n * 0.05))} L ${-20} ${r(H * (0.67 + n * 0.05))} Z`} />
        ))}
        {/* The yak train, bottom-left, crossing. */}
        {[0.06, 0.13, 0.19, 0.25].map((t, n) => (
          <g key={n} fill={p.ink} transform={`translate(${r(W * t)} ${r(H * (0.94 - n * 0.01))})`}>
            <path d="M -22 0 q 6 -19 22 -18 q 16 -1 22 18 z" />
            <path d="M 22 -15 q 10 -3 13 -10 q 4 6 -3 12 z" />
          </g>
        ))}
      </>
    )

    // 10. Above the Clouds - only tips above a flat white ocean.
    default: return (
      <>
        <Stars />
        <Peaks y={H * 0.62} h={H * 0.5} snow={snow} shade={lit2} rock={p.planes[2]}
          glow={p.accent} seed={43} n={6} />
        {/* The cloud sea: flat, hard-topped, a floor not a mist. */}
        <path fill={p.planes[0]} d={`M -20 ${H} L -20 ${H * 0.6}
          Q ${W * 0.16} ${H * 0.56} ${W * 0.34} ${H * 0.62}
          Q ${W * 0.54} ${H * 0.68} ${W * 0.72} ${H * 0.6}
          Q ${W * 0.88} ${H * 0.54} ${W + 20} ${H * 0.62} L ${W + 20} ${H} Z`} />
        {[0.7, 0.78].map((t, n) => (
          <ellipse key={n} cx={W * (0.3 + n * 0.4)} cy={H * t} rx={W * 0.32}
            ry={H * 0.022} fill={p.planes[1]} opacity=".35" />
        ))}
        {/* One figure at the edge of the cloud floor. */}
        <g fill={p.ink} transform={`translate(${W * 0.14} ${H * 0.68})`}>
          <circle cx="0" cy="-22" r="8" />
          <path d="M -8 -16 q 8 -6 16 0 l 4 24 l -24 0 z" />
        </g>
      </>
    )
  }
}

// ---------------------------------------------------------------------------

/** Three-faced summits: lit, mid, dark. A two-value peak is a road sign. */
function Peaks({ y, h, snow, shade, rock, glow, seed, n }: {
  y: number; h: number; snow: string; shade: string; rock: string
  glow: string; seed: number; n: number
}) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n
        const x = W * t + (((i * 97 + seed) % 100) / 100 - 0.5) * W * 0.12
        const hh = h * (0.5 + ((i * 53 + seed) % 50) / 100)
        const w = hh * 0.66
        const sx = x + w * 0.12
        return (
          <g key={i}>
            <path fill={rock} d={`M ${r(x - w)} ${r(y)} L ${r(x)} ${r(y - hh)}
              L ${r(sx)} ${r(y)} Z`} />
            <path fill={shade} d={`M ${r(x + w)} ${r(y)} L ${r(x)} ${r(y - hh)}
              L ${r(sx)} ${r(y)} Z`} />
            {/* Snow runs down the gullies, not as a cap band. */}
            <path fill={snow} d={`M ${r(x)} ${r(y - hh)}
              L ${r(x + w * 0.4)} ${r(y - hh * 0.5)} L ${r(x + w * 0.2)} ${r(y - hh * 0.56)}
              L ${r(x + w * 0.06)} ${r(y - hh * 0.4)} L ${r(x - w * 0.12)} ${r(y - hh * 0.58)}
              L ${r(x - w * 0.34)} ${r(y - hh * 0.52)} Z`} />
            <path fill={glow} opacity=".55" d={`M ${r(x)} ${r(y - hh)}
              L ${r(x + w * 0.3)} ${r(y - hh * 0.62)} L ${r(x - w * 0.24)} ${r(y - hh * 0.66)} Z`} />
          </g>
        )
      })}
    </g>
  )
}

const FLAG = ['#1c6fd6', '#fafafa', '#d82c2c', '#17a34a', '#f2c014']

/** A catenary. A straight line reads as bunting at a car dealership. */
function Flags({ from, to, sag }: {
  from: [number, number]; to: [number, number]; sag: number
}) {
  const [x1, y1] = from
  const [x2, y2] = to
  const n = 20
  return (
    <g>
      <path d={`M ${r(x1)} ${r(y1)} Q ${r((x1 + x2) / 2)} ${r((y1 + y2) / 2 + sag * 1.3)}
        ${r(x2)} ${r(y2)}`} fill="none" stroke="#2a3a5c" strokeWidth="2" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n
        const fx = x1 + (x2 - x1) * t
        const fy = y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag
        return (
          <rect key={i} x={r(fx - 12)} y={r(fy)} width="24" height="19" rx="1.5"
            fill={FLAG[i % 5]} opacity=".78" />
        )
      })}
    </g>
  )
}

function Cairn({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      {[0, 1, 2, 3, 4, 5].map((n) => {
        const t = n / 6
        const w = s * (0.4 - t * 0.28)
        return (
          <ellipse key={n} cx={r(x + (n % 2 ? 5 : -5))} cy={r(y - s * t * 0.92)}
            rx={r(w)} ry={r(w * 0.5)} />
        )
      })}
    </g>
  )
}

function RopeTeam({ x, y, n, s, ink }: {
  x: number; y: number; n: number; s: number; ink: string
}) {
  return (
    <g>
      <path d={`M ${r(x)} ${r(y)} Q ${r(x + 60 * s)} ${r(y - 22 * s)}
        ${r(x + 120 * s)} ${r(y - 8 * s)}`} fill="none" stroke={ink}
        strokeWidth={2 * s} />
      {Array.from({ length: n }, (_, i) => {
        const t = i / Math.max(1, n - 1)
        return (
          <g key={i} fill={ink}
            transform={`translate(${r(x + 120 * s * t)} ${r(y - 8 * s * t - Math.sin(Math.PI * t) * 16 * s)}) scale(${s})`}>
            <circle cx="0" cy="-20" r="8" />
            <path d="M -8 -14 q 8 -6 16 0 l 4 24 l -24 0 z" />
          </g>
        )
      })}
    </g>
  )
}

function Stars() {
  return (
    <g fill="#ffffff">
      {Array.from({ length: 100 }, (_, n) => (
        <circle key={n} cx={r(((n * 367) % 1000) / 1000 * W)}
          cy={r(((n * 173) % 1000) / 1000 * H * 0.56)}
          r={0.8 + ((n * 11) % 3) * 0.6}
          opacity={0.3 + ((n * 7) % 6) * 0.1} />
      ))}
    </g>
  )
}
