import { r, ridge } from './poster'
import { lightDefs, SunLight } from './atmosphere'
import type { Poster } from './poster'

/**
 * Retro Hawaiian Vacation, as ten flat posters.
 *
 * The correction that defines this world: **retro means nostalgic, not
 * cyberpunk.** An earlier version built this as Miami synthwave - neon,
 * wireframe grid, night city - and that was wrong on the brief and wrong on
 * the feeling. This is a vintage travel poster: 1960s-80s resort Hawaii,
 * sunny, cheerful, polished, cute. The kind of postcard somebody kept.
 *
 * So: no neon tubes, no grid floor, no night city. Turquoise, coral, cream
 * and sunset orange; rattan, palm, painted wood; and the single most
 * cheerful palette of the six.
 */
const W = 1600
const H = 900

export const TROPIC: Poster[] = [
  { sky: ['#2171b0', '#509cca', '#7fc8e4', '#b1dbe6', '#e3eee8'], planes: ['#4e8fa8', '#2f7f98', '#1e6478', '#e8d0a8'],
    ink: '#24424e', light: '#fffbe8', accent: '#ff6b5c', sunAt: [0.82, 0.14] },
  { sky: ['#2877b3', '#5ca4ce', '#8fd0e8', '#bfe1e9', '#eff2ea'], planes: ['#5fe0d2', '#2fb8c4', '#f9f2e2', '#e8c9a0'],
    ink: '#2e5460', light: '#ffffff', accent: '#ff6b5c', sunAt: [0.18, 0.12] },
  { sky: ['#6a2f84', '#d4486e', '#ff8a4c', '#ffd27a'], planes: ['#8a4a7a', '#5e3060', '#3a1e42', '#241028'],
    ink: '#190a1e', light: '#fff2c8', accent: '#ffb03a', sunAt: [0.4, 0.5] },
  { sky: ['#3680b3', '#6bacce', '#9fd8e8', '#ceded4', '#fce4c0'], planes: ['#c8a878', '#a8865c', '#7e6342', '#e8d4a8'],
    ink: '#3e3024', light: '#fffbe8', accent: '#ff6b5c', sunAt: [0.76, 0.16] },
  { sky: ['#4288b0', '#75b2ca', '#a8dce4', '#cae5da', '#ebeecf'], planes: ['#3a8a5c', '#2a6a46', '#1c4e34', '#123a26'],
    ink: '#0c2a1c', light: '#fff8d8', accent: '#ff5c8a', sunAt: null },
  { sky: ['#367cad', '#64a5c6', '#92cfe0', '#bcdcda', '#e7ead3'], planes: ['#4e8a58', '#36683f', '#24502e', '#163a20'],
    ink: '#0e2816', light: '#fffbe8', accent: '#ff9a3c', sunAt: null },
  { sky: ['#2166a0', '#4f93be', '#7ec0dc', '#acd2dd', '#d9e4df'], planes: ['#3a6a52', '#2a4a3c', '#1a2a24', '#0e1614'],
    ink: '#0a0f0e', light: '#ffffff', accent: '#ff6b5c', sunAt: [0.22, 0.14] },
  { sky: ['#a15031', '#cd7c46', '#f8a85c', '#fcc079', '#ffd896'], planes: ['#a8603c', '#7e4430', '#542c22', '#301a16'],
    ink: '#1e1010', light: '#fff2c0', accent: '#ffc247', sunAt: [0.7, 0.42] },
  { sky: ['#2177b3', '#52a3ce', '#84cfe8', '#b6e0e9', '#e7f0ea'], planes: ['#5fe0d2', '#2fbcc8', '#1e8fa8', '#0d5f78'],
    ink: '#0a4254', light: '#ffffff', accent: '#ff6b5c', sunAt: [0.56, 0.1] },
  { sky: ['#1a2a56', '#3e4a7e', '#8a5a74', '#d4885c'], planes: ['#3a4a62', '#28344a', '#1a2434', '#101824'],
    ink: '#0a0e18', light: '#ffe9b0', accent: '#ffb03a', sunAt: null },
]

export function TropicPoster({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = TROPIC[i]
  const id = `tp${i}`
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

const SEA = H * 0.56

function Body({ i }: { i: number }) {
  const p = TROPIC[i]
  const [a, b, c, d] = p.planes

  switch (i) {
    // 1. Waikiki - Diamond Head, outriggers, striped umbrellas.
    case 0: return (
      <>
        {/* Diamond Head: a long low crater profile, right. Unmistakable. */}
        <path fill={a} d={`M ${W * 0.52} ${SEA} L ${W * 0.64} ${H * 0.3}
          L ${W * 0.78} ${H * 0.26} L ${W * 0.86} ${H * 0.34} L ${W + 20} ${SEA} Z`} />
        <Sea y={SEA} fill={b} deep={c} />
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.74} L ${W + 20} ${H * 0.8}
          L ${W + 20} ${H} Z`} />
        {/* Umbrellas along the bottom - stripes say 1962 in one shape. */}
        {[0.08, 0.26, 0.74, 0.92].map((t, n) => (
          <Umbrella key={n} x={W * t} y={H * (0.92 + (n % 2) * 0.04)} s={120}
            ink={p.ink} accent={n % 2 ? p.accent : '#2fb8c4'} />
        ))}
        <Outrigger x={W * 0.44} y={H * 0.82} s={190} ink={p.ink} accent={p.accent} />
        <Palm x={W * 0.03} base={H * 1.02} h={H * 0.66} lean={10} ink={p.ink} />
      </>
    )

    // 2. Retro Hotel Pool - kidney pool, springboard, breeze-block wall.
    case 1: return (
      <>
        {/* The breeze-block screen wall: the single most 1962 object there is. */}
        <g>
          <rect x="0" y={H * 0.3} width={W} height={H * 0.24} fill={c} />
          {Array.from({ length: 26 }, (_, n) =>
            [0, 1, 2].map((j) => (
              <circle key={`${n}${j}`} cx={r(W * 0.012 + n * (W / 26))}
                cy={r(H * (0.36 + j * 0.07))} r={r(W * 0.014)} fill={p.sky[1]} />
            )))}
        </g>
        <rect x="0" y={H * 0.54} width={W} height={H * 0.46} fill={d} />
        {/* The kidney pool: two lobes and a waist. Never a rectangle. */}
        <path fill={a} d={`M ${W * 0.1} ${H * 0.78}
          C ${W * 0.1} ${H * 0.62} ${W * 0.34} ${H * 0.62} ${W * 0.42} ${H * 0.7}
          C ${W * 0.5} ${H * 0.78} ${W * 0.72} ${H * 0.64} ${W * 0.86} ${H * 0.72}
          C ${W} ${H * 0.8} ${W * 0.92} ${H * 1.0} ${W * 0.6} ${H * 0.98}
          C ${W * 0.3} ${H * 0.96} ${W * 0.1} ${H * 0.94} ${W * 0.1} ${H * 0.78} Z`} />
        <path fill={b} opacity=".5" d={`M ${W * 0.16} ${H * 0.84}
          C ${W * 0.3} ${H * 0.78} ${W * 0.5} ${H * 0.86} ${W * 0.7} ${H * 0.8}`} />
        <Board x={W * 0.06} y={H * 0.72} s={170} ink={p.ink} />
        {[0.84, 0.93].map((t, n) => (
          <Lounger key={n} x={W * t} y={H * (0.66 + n * 0.04)} s={110}
            ink={p.ink} accent={p.accent} />
        ))}
      </>
    )

    // 3. Hawaiian Sunset - palms in silhouette, a wide banded sky.
    case 2: return (
      <>
        <Sea y={H * 0.68} fill={b} deep={c} />
        {/* The sun's path on the water: a bowtie, square-law spacing. */}
        {Array.from({ length: 16 }, (_, n) => {
          const t = (n + 1) / 16
          return (
            <rect key={n} x={r(W * 0.4 - (8 + t * 150))} y={r(H * 0.68 + (H * 0.32) * t * t)}
              width={r(16 + t * 300)} height={r(3 + t * 7)} rx="3"
              fill={p.light} opacity={0.6 - t * 0.3} />
          )
        })}
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.92} L ${W + 20} ${H * 0.96}
          L ${W + 20} ${H} Z`} />
        <Catamaran x={W * 0.76} y={H * 0.72} s={110} ink={p.ink} />
        <Palm x={W * 0.06} base={H * 1.04} h={H * 0.82} lean={9} ink={p.ink} />
        <Palm x={W * 0.17} base={H * 1.06} h={H * 0.62} lean={-7} ink={p.ink} />
        <Palm x={W * 0.93} base={H * 1.02} h={H * 0.72} lean={-11} ink={p.ink} />
      </>
    )

    // 4. Surf Shack - weathered hut, boards on a rack, a bicycle.
    case 3: return (
      <>
        <Sea y={SEA} fill="#4eb4c8" deep="#2f8fa8" />
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.66} L ${W + 20} ${H * 0.72}
          L ${W + 20} ${H} Z`} />
        {/* The shack, left third, with a rack of boards beside it. */}
        <g>
          <rect x={r(W * 0.06)} y={r(H * 0.52)} width={r(W * 0.22)} height={r(H * 0.26)}
            fill={a} />
          <path fill={p.accent} d={`M ${r(W * 0.03)} ${r(H * 0.52)}
            L ${r(W * 0.17)} ${r(H * 0.42)} L ${r(W * 0.31)} ${r(H * 0.52)} Z`} />
          <rect x={r(W * 0.1)} y={r(H * 0.58)} width={r(W * 0.07)} height={r(H * 0.1)}
            fill={p.light} opacity=".85" />
          <rect x={r(W * 0.19)} y={r(H * 0.6)} width={r(W * 0.05)} height={r(H * 0.18)}
            fill={b} />
        </g>
        {[0, 1, 2, 3].map((n) => (
          <g key={n} transform={`rotate(${-8 + n * 5} ${W * (0.32 + n * 0.035)} ${H * 0.76})`}>
            <path fill={[p.accent, '#ffc247', '#2fb8c4', '#f9f2e2'][n]}
              d={`M ${r(W * (0.32 + n * 0.035))} ${r(H * 0.78)}
                  q ${W * 0.018} ${-H * 0.2} 0 ${-H * 0.28}
                  q ${-W * 0.018} ${H * 0.08} 0 ${H * 0.28} z`} />
          </g>
        ))}
        <Bicycle x={W * 0.86} y={H * 0.92} s={150} ink={p.ink} />
        <Palm x={W * 0.96} base={H * 0.8} h={H * 0.5} lean={-8} ink={p.ink} />
      </>
    )

    // 5. Tropical Garden - monstera, heliconia, a stone path, a koi pond.
    case 4: return (
      <>
        <rect width={W} height={H} fill={a} opacity=".35" />
        <path d={ridge(H * 0.44, W, H * 0.1, 6, 7, H)} fill={b} />
        <path d={ridge(H * 0.62, W, H * 0.07, 5, 11, H)} fill={c} />
        {/* The path: a pale ribbon up the quiet middle. */}
        <path fill="#d8cfb4" d={`M ${W * 0.46} ${H * 0.6} L ${W * 0.54} ${H * 0.6}
          L ${W * 0.72} ${H} L ${W * 0.28} ${H} Z`} />
        <Pond x={W * 0.78} y={H * 0.86} w={W * 0.3} accent={p.accent} />
        {/* Monstera, bottom corners: the split leaf is the whole plant. */}
        {[0.04, 0.14, 0.88, 0.97].map((t, n) => (
          <Monstera key={n} x={W * t} y={H * (0.96 - (n % 2) * 0.08)}
            s={150 + (n % 3) * 50} ink={d} />
        ))}
        {/* Heliconia: hot red-orange bracts, the accent. */}
        {[0.22, 0.8].map((t, n) => (
          <Heliconia key={n} x={W * t} y={H * 0.94} s={150} ink={p.ink}
            accent={p.accent} />
        ))}
      </>
    )

    // 6. Road to Hana - one-lane bridge, waterfall, jungle either side.
    case 5: return (
      <>
        <path d={ridge(H * 0.3, W, H * 0.12, 5, 13, H)} fill={a} opacity=".6" />
        <Falls x={W * 0.3} y={H * 0.34} h={H * 0.3} />
        <path fill={b} d={`M -20 ${H} L -20 ${H * 0.2} L ${W * 0.3} ${H * 0.34}
          L ${W * 0.36} ${H} Z`} />
        <path fill={c} d={`M ${W + 20} ${H} L ${W + 20} ${H * 0.16}
          L ${W * 0.68} ${H * 0.34} L ${W * 0.64} ${H} Z`} />
        {/* The bridge, low and narrow, with the road running to the viewer. */}
        <rect x={r(W * 0.34)} y={r(H * 0.72)} width={r(W * 0.32)} height={r(H * 0.03)}
          fill="#9a8c74" />
        <path fill="#b8a98c" d={`M ${W * 0.38} ${H * 0.75} L ${W * 0.62} ${H * 0.75}
          L ${W * 0.76} ${H} L ${W * 0.24} ${H} Z`} />
        {[0.34, 0.64].map((t, n) => (
          <rect key={n} x={r(W * t)} y={r(H * 0.66)} width="9" height={r(H * 0.07)}
            fill={p.ink} />
        ))}
        {/* Jungle fronds crowding in from both edges. */}
        {[0.03, 0.1, 0.9, 0.97].map((t, n) => (
          <Monstera key={n} x={W * t} y={H * (0.92 + (n % 2) * 0.08)}
            s={180 + (n % 2) * 60} ink={d} />
        ))}
      </>
    )

    // 7. Volcanic Coast - black lava, white surf exploding, a sea arch.
    case 6: return (
      <>
        <path d={ridge(H * 0.36, W, H * 0.1, 5, 17, SEA)} fill={a} opacity=".6" />
        <Sea y={SEA} fill="#2f8fa8" deep="#13566e" />
        {/* Lava rock: hard angular black, all along the bottom. */}
        <path fill={c} d={`M -20 ${H} L -20 ${H * 0.72} L ${W * 0.16} ${H * 0.78}
          L ${W * 0.3} ${H * 0.7} L ${W * 0.46} ${H * 0.8}
          L ${W * 0.62} ${H * 0.72} L ${W * 0.84} ${H * 0.82}
          L ${W + 20} ${H * 0.74} L ${W + 20} ${H} Z`} />
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.86} L ${W * 0.4} ${H * 0.94}
          L ${W + 20} ${H * 0.88} L ${W + 20} ${H} Z`} />
        {/* A sea arch, right, and surf bursting white against the rock. */}
        <path fill={c} d={`M ${W * 0.76} ${H * 0.76} L ${W * 0.78} ${H * 0.5}
          L ${W * 0.92} ${H * 0.48} L ${W * 0.96} ${H * 0.76}
          L ${W * 0.9} ${H * 0.76} L ${W * 0.89} ${H * 0.62}
          Q ${W * 0.85} ${H * 0.56} ${W * 0.82} ${H * 0.62}
          L ${W * 0.81} ${H * 0.76} Z`} />
        {[0.2, 0.52, 0.86].map((t, n) => (
          <Burst key={n} x={W * t} y={H * (0.76 + (n % 2) * 0.04)} s={120 + n * 40} />
        ))}
      </>
    )

    // 8. Retro Tiki Resort - thatched A-frames, torches, rattan.
    case 7: return (
      <>
        <path d={ridge(H * 0.42, W, H * 0.09, 5, 19, H * 0.62)} fill={a} opacity=".5" />
        <Sea y={H * 0.62} fill="#a8683c" deep="#6e3c28" />
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.74} L ${W + 20} ${H * 0.8}
          L ${W + 20} ${H} Z`} />
        {/* Two thatched A-frames at the edges, cropped. */}
        {[0.02, 0.8].map((t, n) => (
          <AFrame key={n} x={W * t} y={H * (0.78 + n * 0.03)} s={W * 0.2}
            ink={p.ink} thatch={b} lit={p.light} />
        ))}
        {/* Torches: small warm points, not a wash. */}
        {[0.3, 0.42, 0.58, 0.7].map((t, n) => (
          <Torch key={n} x={W * t} y={H * (0.92 + (n % 2) * 0.04)} s={110}
            ink={p.ink} flame={p.accent} />
        ))}
        <Palm x={W * 0.94} base={H * 1.02} h={H * 0.56} lean={-9} ink={p.ink} />
      </>
    )

    // 9. Catamaran Day - a sail from the water, snorkellers, a reef.
    case 8: return (
      <>
        <path d={ridge(H * 0.4, W, H * 0.06, 5, 23, H * 0.48)} fill="#3a7a5c" opacity=".5" />
        <Sea y={H * 0.48} fill={a} deep={b} />
        {/* The reef: a pale irregular shelf under the surface, bottom. */}
        <path fill="#9fe8dc" opacity=".55" d={`M -20 ${H} L -20 ${H * 0.8}
          Q ${W * 0.3} ${H * 0.72} ${W * 0.56} ${H * 0.82}
          Q ${W * 0.82} ${H * 0.92} ${W + 20} ${H * 0.82} L ${W + 20} ${H} Z`} />
        <path fill={c} opacity=".4" d={`M -20 ${H} L -20 ${H * 0.92}
          Q ${W * 0.4} ${H * 0.86} ${W + 20} ${H * 0.94} L ${W + 20} ${H} Z`} />
        <Catamaran x={W * 0.2} y={H * 0.56} s={260} ink={p.ink} />
        {/* Snorkellers: small dark marks on the surface, bottom-right. */}
        {[[0.76, 0.82], [0.86, 0.88], [0.92, 0.78]].map(([x, y], n) => (
          <g key={n} fill={p.ink} opacity=".7">
            <ellipse cx={r(W * x)} cy={r(H * y)} rx="20" ry="8" />
            <rect x={r(W * x + 14)} y={r(H * y - 18)} width="5" height="20" />
          </g>
        ))}
      </>
    )

    // 10. Hawaiian Night - torches down a beach, warm, never cold.
    default: return (
      <>
        <Stars />
        <path d={ridge(H * 0.44, W, H * 0.08, 5, 29, H * 0.6)} fill={a} opacity=".6" />
        <Sea y={H * 0.6} fill={b} deep={c} />
        {/* Moonlight path: the same bowtie, cool silver this time. */}
        {Array.from({ length: 12 }, (_, n) => {
          const t = (n + 1) / 12
          return (
            <rect key={n} x={r(W * 0.62 - (7 + t * 110))} y={r(H * 0.6 + (H * 0.4) * t * t)}
              width={r(14 + t * 220)} height={r(3 + t * 5)} rx="3"
              fill={p.light} opacity={0.4 - t * 0.2} />
          )
        })}
        <circle cx={W * 0.62} cy={H * 0.3} r={H * 0.05} fill={p.light} opacity=".95" />
        <path fill={d} d={`M -20 ${H} L -20 ${H * 0.8} L ${W + 20} ${H * 0.86}
          L ${W + 20} ${H} Z`} />
        {/* A line of torches receding down the beach - warm, inviting. */}
        {Array.from({ length: 7 }, (_, n) => {
          const t = n / 6
          return (
            <Torch key={n} x={W * (0.04 + t * 0.34)} y={H * (0.98 - t * 0.12)}
              s={150 - t * 80} ink={p.ink} flame={p.accent} />
          )
        })}
        <Palm x={W * 0.9} base={H * 1.02} h={H * 0.66} lean={-10} ink={p.ink} />
      </>
    )
  }
}

// ---------------------------------------------------------------------------

function Sea({ y, fill, deep }: { y: number; fill: string; deep: string }) {
  return (
    <>
      <rect x="0" y={y} width={W} height={H - y} fill={fill} />
      {[0.18, 0.44, 0.72].map((t, n) => (
        <rect key={n} x="0" y={r(y + (H - y) * t)} width={W}
          height={r((H - y) * 0.035)} fill={deep} opacity={0.3 + n * 0.1} />
      ))}
    </>
  )
}

/** S-curved trunk, ring scars, uneven drooping fronds, two dead ones. */
function Palm({ x, base, h, lean, ink }: {
  x: number; base: number; h: number; lean: number; ink: string
}) {
  const tx = x + lean * 2.8
  const ty = base - h
  return (
    <g fill={ink}>
      <path d={`M ${r(x - h * 0.026)} ${r(base)}
        C ${r(x + lean * 0.5)} ${r(base - h * 0.45)}
          ${r(tx - lean)} ${r(base - h * 0.7)} ${r(tx)} ${r(ty)}
        l ${r(h * 0.02)} 0
        C ${r(tx - lean * 0.6)} ${r(base - h * 0.72)}
          ${r(x + lean)} ${r(base - h * 0.44)} ${r(x + h * 0.026)} ${r(base)} Z`} />
      {Array.from({ length: 12 }, (_, n) => {
        const t = (n + 1) / 14
        const px = x + (tx - x) * t * t
        return (
          <rect key={n} x={r(px - h * 0.021)} y={r(base - h * t)}
            width={r(h * 0.042)} height={r(h * 0.007)} opacity=".45" />
        )
      })}
      {[-168, -140, -112, -80, -50, -22, 14].map((deg, n) => (
        <path key={n} d={frond(tx, ty, h * (0.24 + (n % 3) * 0.045), deg)} />
      ))}
      {[-98, -86].map((deg, n) => (
        <path key={`d${n}`} d={frond(tx, ty, h * 0.17, deg)} opacity=".8" />
      ))}
    </g>
  )
}

function frond(x: number, y: number, len: number, deg: number): string {
  const a = (deg * Math.PI) / 180
  const tx = x + Math.cos(a) * len
  const ty = y + Math.sin(a) * len
  const bow = len * 0.36
  const nx = Math.cos(a + Math.PI / 2) * bow
  const ny = Math.sin(a + Math.PI / 2) * bow
  return `M ${r(x)} ${r(y)} Q ${r((x + tx) / 2 + nx)} ${r((y + ty) / 2 + ny)}
    ${r(tx)} ${r(ty)} Q ${r((x + tx) / 2 + nx * 0.2)} ${r((y + ty) / 2 + ny * 0.2)}
    ${r(x)} ${r(y)} Z`
}

function Umbrella({ x, y, s, ink, accent }: {
  x: number; y: number; s: number; ink: string; accent: string
}) {
  return (
    <g>
      <rect x={r(x - 3)} y={r(y - s * 0.5)} width="6" height={r(s * 0.5)} fill={ink} />
      <path fill={accent} d={`M ${r(x - s * 0.44)} ${r(y - s * 0.5)}
        q ${r(s * 0.44)} ${r(-s * 0.42)} ${r(s * 0.88)} 0 z`} />
      {/* The stripes: four wedges, the shape that dates it to 1962. */}
      {[-0.3, -0.1, 0.1, 0.3].map((t, n) => (
        <path key={n} fill="#f9f2e2"
          d={`M ${r(x)} ${r(y - s * 0.92)} L ${r(x + s * t)} ${r(y - s * 0.5)}
              L ${r(x + s * (t + 0.1))} ${r(y - s * 0.5)} Z`} />
      ))}
    </g>
  )
}

function Outrigger({ x, y, s, ink, accent }: {
  x: number; y: number; s: number; ink: string; accent: string
}) {
  return (
    <g>
      <path fill={ink} d={`M ${r(x - s * 0.5)} ${r(y)} q ${r(s * 0.5)} ${r(s * 0.17)}
        ${r(s)} 0 q ${r(-s * 0.12)} ${r(s * 0.1)} ${r(-s * 0.5)} ${r(s * 0.1)}
        q ${r(-s * 0.38)} 0 ${r(-s * 0.5)} ${r(-s * 0.1)} Z`} />
      {/* The outrigger float: the shape that makes it Polynesian. */}
      <rect x={r(x - s * 0.36)} y={r(y + s * 0.2)} width={r(s * 0.6)} height={r(s * 0.05)}
        fill={accent} />
      {[-0.26, 0.2].map((t, n) => (
        <rect key={n} x={r(x + s * t)} y={r(y + s * 0.04)} width={r(s * 0.03)}
          height={r(s * 0.18)} fill={ink} />
      ))}
    </g>
  )
}

function Board({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      <rect x={r(x)} y={r(y)} width={r(s)} height={r(s * 0.06)} rx={r(s * 0.03)} />
      <rect x={r(x + s * 0.06)} y={r(y + s * 0.06)} width={r(s * 0.05)} height={r(s * 0.3)} />
      <rect x={r(x + s * 0.78)} y={r(y + s * 0.06)} width={r(s * 0.05)} height={r(s * 0.3)} />
    </g>
  )
}

function Lounger({ x, y, s, ink, accent }: {
  x: number; y: number; s: number; ink: string; accent: string
}) {
  return (
    <g>
      <path fill={accent} d={`M ${r(x - s * 0.4)} ${r(y)} l ${r(s * 0.08)} ${r(-s * 0.16)}
        l ${r(s * 0.56)} 0 l ${r(-s * 0.08)} ${r(s * 0.16)} z`} />
      <path fill={accent} d={`M ${r(x + s * 0.16)} ${r(y - s * 0.16)}
        l ${r(s * 0.22)} ${r(-s * 0.3)} l ${r(s * 0.1)} ${r(s * 0.04)}
        l ${r(-s * 0.18)} ${r(s * 0.26)} z`} />
      <g fill={ink}>
        <rect x={r(x - s * 0.3)} y={r(y)} width={r(s * 0.03)} height={r(s * 0.12)} />
        <rect x={r(x + s * 0.12)} y={r(y)} width={r(s * 0.03)} height={r(s * 0.12)} />
      </g>
    </g>
  )
}

function Catamaran({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g>
      {/* Two hulls - that is what makes it a catamaran and not a boat. */}
      {[-0.22, 0.22].map((t, n) => (
        <path key={n} fill={ink} d={`M ${r(x + s * t - s * 0.3)} ${r(y + s * 0.04 * n)}
          q ${r(s * 0.3)} ${r(s * 0.1)} ${r(s * 0.6)} 0
          q ${r(-s * 0.08)} ${r(s * 0.06)} ${r(-s * 0.3)} ${r(s * 0.06)}
          q ${r(-s * 0.22)} 0 ${r(-s * 0.3)} ${r(-s * 0.06)} Z`} />
      ))}
      <rect x={r(x - s * 0.3)} y={r(y - s * 0.02)} width={r(s * 0.6)} height={r(s * 0.03)}
        fill={ink} />
      <rect x={r(x - s * 0.01)} y={r(y - s * 0.78)} width={r(s * 0.02)}
        height={r(s * 0.78)} fill={ink} />
      <path fill="#f9f2e2" d={`M ${r(x + s * 0.01)} ${r(y - s * 0.76)}
        q ${r(s * 0.3)} ${r(s * 0.34)} ${r(s * 0.1)} ${r(s * 0.66)}
        l ${r(-s * 0.1)} 0 z`} />
    </g>
  )
}

function Monstera({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      {[-150, -116, -82, -48].map((deg, n) => {
        const a = (deg * Math.PI) / 180
        const len = s * (0.8 + (n % 2) * 0.2)
        const lx = x + Math.cos(a) * len
        const ly = y + Math.sin(a) * len
        return (
          <g key={n}>
            <rect x={r(x - 3)} y={r(y - len)} width="6" height={r(len)}
              transform={`rotate(${deg + 90} ${r(x)} ${r(y)})`} />
            {/* The split leaf: a blade with three notches cut out of it. */}
            <path d={`M ${r(lx)} ${r(ly)} q ${r(s * 0.26)} ${r(-s * 0.3)}
              ${r(s * 0.02)} ${r(-s * 0.52)} q ${r(-s * 0.26)} ${r(s * 0.22)}
              ${r(-s * 0.02)} ${r(s * 0.52)} z`} />
            <path d={`M ${r(lx - s * 0.16)} ${r(ly - s * 0.2)}
              q ${r(s * 0.3)} ${r(-s * 0.26)} ${r(s * 0.06)} ${r(-s * 0.46)}
              q ${r(-s * 0.3)} ${r(s * 0.2)} ${r(-s * 0.06)} ${r(s * 0.46)} z`} />
          </g>
        )
      })}
    </g>
  )
}

function Heliconia({ x, y, s, ink, accent }: {
  x: number; y: number; s: number; ink: string; accent: string
}) {
  return (
    <g>
      <rect x={r(x - 4)} y={r(y - s)} width="8" height={r(s)} fill={ink} />
      {Array.from({ length: 5 }, (_, n) => (
        <path key={n} fill={accent}
          d={`M ${r(x + (n % 2 ? 4 : -4))} ${r(y - s + n * s * 0.16)}
              q ${r((n % 2 ? 1 : -1) * s * 0.3)} ${r(-s * 0.04)}
              ${r((n % 2 ? 1 : -1) * s * 0.34)} ${r(s * 0.1)}
              q ${r((n % 2 ? -1 : 1) * s * 0.3)} ${r(s * 0.02)}
              ${r((n % 2 ? -1 : 1) * s * 0.34)} ${r(-s * 0.1)} z`} />
      ))}
    </g>
  )
}

function Pond({ x, y, w, accent }: {
  x: number; y: number; w: number; accent: string
}) {
  return (
    <g>
      <ellipse cx={r(x)} cy={r(y)} rx={r(w * 0.5)} ry={r(w * 0.16)} fill="#2fb8c4" />
      {[-0.2, 0.05, 0.24].map((t, n) => (
        <ellipse key={n} cx={r(x + w * t)} cy={r(y + (n - 1) * 12)} rx={r(w * 0.07)}
          ry={r(w * 0.026)} fill={accent} />
      ))}
    </g>
  )
}

function Falls({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      <path fill="#eaf6ff" opacity=".9"
        d={`M ${r(x)} ${r(y)} q ${-6} ${r(h * 0.5)} ${-2} ${r(h)}
            l 18 0 q 4 ${r(-h * 0.5)} -2 ${r(-h)} z`} />
      <ellipse cx={r(x + 7)} cy={r(y + h)} rx="36" ry="11" fill="#eaf6ff" opacity=".45" />
    </g>
  )
}

function Burst({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g fill="#ffffff" opacity=".8">
      <path d={`M ${r(x - s * 0.5)} ${r(y)} q ${r(s * 0.2)} ${r(-s * 0.9)}
        ${r(s * 0.5)} ${r(-s * 1.0)} q ${r(s * 0.3)} ${r(s * 0.1)}
        ${r(s * 0.5)} ${r(s)} z`} />
      {[-0.3, 0.1, 0.34].map((t, n) => (
        <ellipse key={n} cx={r(x + s * t)} cy={r(y - s * (1.05 + (n % 2) * 0.16))}
          rx={r(s * 0.14)} ry={r(s * 0.1)} opacity=".7" />
      ))}
    </g>
  )
}

function AFrame({ x, y, s, ink, thatch, lit }: {
  x: number; y: number; s: number; ink: string; thatch: string; lit: string
}) {
  return (
    <g>
      <path fill={thatch} d={`M ${r(x)} ${r(y)} L ${r(x + s * 0.5)} ${r(y - s * 0.9)}
        L ${r(x + s)} ${r(y)} Z`} />
      {/* Thatch courses: horizontal bands, the texture of the roof. */}
      {[0.2, 0.42, 0.64].map((t, n) => (
        <path key={n} fill={ink} opacity=".2"
          d={`M ${r(x + s * t * 0.5)} ${r(y - s * 0.9 * (1 - t))}
              L ${r(x + s * (1 - t * 0.5))} ${r(y - s * 0.9 * (1 - t))}
              L ${r(x + s * (1 - t * 0.5))} ${r(y - s * 0.9 * (1 - t) + s * 0.04)}
              L ${r(x + s * t * 0.5)} ${r(y - s * 0.9 * (1 - t) + s * 0.04)} Z`} />
      ))}
      <rect x={r(x + s * 0.38)} y={r(y - s * 0.3)} width={r(s * 0.24)}
        height={r(s * 0.3)} fill={lit} opacity=".9" />
    </g>
  )
}

function Torch({ x, y, s, ink, flame }: {
  x: number; y: number; s: number; ink: string; flame: string
}) {
  return (
    <g>
      <rect x={r(x - s * 0.03)} y={r(y - s * 0.78)} width={r(s * 0.06)}
        height={r(s * 0.78)} fill={ink} />
      <path fill={flame} d={`M ${r(x)} ${r(y - s * 1.06)}
        q ${r(s * 0.12)} ${r(s * 0.16)} 0 ${r(s * 0.28)}
        q ${r(-s * 0.12)} ${r(-s * 0.12)} 0 ${r(-s * 0.28)} z`} />
      <circle cx={r(x)} cy={r(y - s * 0.92)} r={r(s * 0.22)} fill={flame} opacity=".2" />
    </g>
  )
}

function Stars() {
  return (
    <g fill="#ffffff">
      {Array.from({ length: 80 }, (_, n) => (
        <circle key={n} cx={r(((n * 367) % 1000) / 1000 * W)}
          cy={r(((n * 173) % 1000) / 1000 * H * 0.5)}
          r={0.8 + ((n * 11) % 3) * 0.5}
          opacity={0.3 + ((n * 7) % 6) * 0.1} />
      ))}
    </g>
  )
}

/** A bicycle: two wheels, a frame triangle, handlebars. Nothing else needed. */
function Bicycle({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  const rad = s * 0.17
  return (
    <g fill="none" stroke={ink} strokeWidth={s * 0.022} strokeLinecap="round">
      <circle cx={r(x - s * 0.22)} cy={r(y - rad)} r={r(rad)} />
      <circle cx={r(x + s * 0.22)} cy={r(y - rad)} r={r(rad)} />
      <path d={`M ${r(x - s * 0.22)} ${r(y - rad)} L ${r(x - s * 0.02)} ${r(y - rad)}
        L ${r(x + s * 0.04)} ${r(y - rad * 2.1)} L ${r(x - s * 0.16)} ${r(y - rad * 2.1)} Z`} />
      <path d={`M ${r(x - s * 0.02)} ${r(y - rad)} L ${r(x + s * 0.22)} ${r(y - rad)}`} />
      <path d={`M ${r(x + s * 0.04)} ${r(y - rad * 2.1)} L ${r(x + s * 0.22)} ${r(y - rad)}`} />
      <path d={`M ${r(x + s * 0.04)} ${r(y - rad * 2.1)} l ${r(s * 0.06)} ${r(-s * 0.05)}`} />
      <path d={`M ${r(x - s * 0.16)} ${r(y - rad * 2.1)} l ${r(-s * 0.03)} ${r(-s * 0.04)}`} />
    </g>
  )
}
