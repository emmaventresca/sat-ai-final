import { broadleaf, conifer, r, ridge } from './poster'
import type { Poster } from './poster'
import { lightDefs, SunLight } from './atmosphere'

/**
 * America the Beautiful, as ten flat posters.
 *
 * This is the one world with a real precedent: the 1938-41 WPA national-park
 * serigraphs. Flat planes of saturated colour, strong silhouette, reverence,
 * and very few of them. That is exactly what vector does well, so this world
 * should be the most convincing of the six.
 *
 * Named places, so each is unmistakable. The failure to avoid is "generic
 * mountain" - every scene needs the one shape that makes it that park.
 */
const W = 1600
const H = 900

export const PARKS: Poster[] = [
  { sky: ['#214f3c', '#48774d', '#6fa05e', '#a4bc71', '#d9d784'], planes: ['#4e7a46', '#3a5c38', '#28402a', '#18281c'],
    ink: '#101c12', light: '#fdf6c4', accent: '#e8a23c', sunAt: [0.6, 0.08] },
  { sky: ['#a7773e', '#cfa261', '#f8cd84', '#fcda9c', '#ffe8b4'], planes: ['#c4a068', '#9a7c50', '#6e5a3c', '#453828'],
    ink: '#2a2118', light: '#ffffff', accent: '#36c9c0', sunAt: [0.2, 0.26] },
  { sky: ['#1d4e89', '#447baa', '#6aa8cc', '#afb6b0', '#f4c494'], planes: ['#c98a7a', '#a8604e', '#7e4234', '#4e2820'],
    ink: '#301a16', light: '#ffe9a8', accent: '#ff9d4d', sunAt: [0.82, 0.2] },
  { sky: ['#1d5a96', '#4e89b7', '#7fb8d8', '#b1d0dc', '#e3e8e1'], planes: ['#8fa8b8', '#5e8090', '#3e5e6a', '#2a4048'],
    ink: '#1a2c32', light: '#ffffff', accent: '#36c9c0', sunAt: [0.74, 0.16] },
  { sky: ['#2866a6', '#5c95c3', '#8fc4e0', '#c6d0c4', '#fcdca9'], planes: ['#e0b088', '#c08456', '#94603c', '#5e3c28'],
    ink: '#36241a', light: '#fff6d8', accent: '#4e9a3c', sunAt: null },
  { sky: ['#4d77a6', '#7fa4c3', '#b0d0e0', '#d2dad2', '#f4e4c4'], planes: ['#b8bcc0', '#8e949a', '#646c74', '#3e464e'],
    ink: '#28303a', light: '#ffffff', accent: '#3a7a4a', sunAt: [0.24, 0.14] },
  { sky: ['#164f96', '#3a7bb7', '#5fa8d8', '#92c0db', '#c5d8df'], planes: ['#d4704a', '#b04e32', '#843826', '#52241a'],
    ink: '#331610', light: '#fff4d0', accent: '#3a6a3a', sunAt: [0.5, 0.1] },
  { sky: ['#366696', '#6b97b9', '#9fc8dc', '#c7d9d2', '#efeac8'], planes: ['#d8b0a8', '#a88078', '#6e5c58', '#3e3a3a'],
    ink: '#222628', light: '#ffffff', accent: '#2a6a4a', sunAt: [0.82, 0.18] },
  { sky: ['#885e4b', '#b88767', '#e8b084', '#f4c69a', '#ffdcb1'], planes: ['#9fb0b4', '#7e9298', '#5e7278', '#3e5058'],
    ink: '#2a383e', light: '#fff0d0', accent: '#8a6a4a', sunAt: [0.3, 0.2] },
  { sky: ['#0a0e27', '#141d3d', '#1e2c52', '#30365b', '#414064'], planes: ['#3a3a58', '#2a2a42', '#1c1c2e', '#121220'],
    ink: '#0a0a14', light: '#f0ecd8', accent: '#e8c45c', sunAt: null },
]

export function ParksScene({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = PARKS[i]
  const id = `pk${i}`
  return (
    <svg className="scene scene-poster" viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, n) => (
            <stop key={n} offset={`${(n / (p.sky.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        {lightDefs(id, p.light, p.planes)}
        <filter id={`g${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"
            stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#sky${id})`} />
      <SunLight id={id} at={p.sunAt} w={W} h={H} light={p.light} />
      {/* Horizon glow, behind the land: the furthest ridge is eaten by light
          rather than meeting the sky on a hard cut. */}
      <rect x="0" y={H * 0.34} width={W} height={H * 0.46} fill={`url(#glow${id})`} />
      <Body i={i} />
      <rect width={W} height={H} filter={`url(#g${id})`} opacity=".06"
        style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

const Y = H * 0.66

function Body({ i }: { i: number }) {
  const p = PARKS[i]
  const [far, mid, near, fore] = p.planes

  switch (i) {
    // 1. Sequoia - trunks too wide to frame, cropped top and bottom.
    case 0: return (
      <>
        <rect width={W} height={H} fill={far} opacity=".5" />
        <path d={`M ${W * 0.42} 0 L ${W * 0.6} 0 L ${W * 0.7} ${H} L ${W * 0.3} ${H} Z`}
          fill={p.light} opacity=".22" />
        <path d={ridge(H * 0.76, W, H * 0.06, 7, 3, H)} fill={mid} />
        <Bole x={-W * 0.02} w={W * 0.19} fill={near} ink={p.ink} />
        <Bole x={W * 0.84} w={W * 0.22} fill={near} ink={p.ink} />
        <Bole x={W * 0.2} w={W * 0.08} fill={fore} ink={p.ink} />
        {/* The trail and one tiny walker: all the scale there is. */}
        <path fill="#c8b088" d={`M ${W * 0.48} ${H * 0.78} L ${W * 0.53} ${H * 0.78}
          L ${W * 0.72} ${H} L ${W * 0.3} ${H} Z`} />
        <Walker x={W * 0.5} y={H * 0.88} s={34} ink={p.ink} />
      </>
    )

    // 2. Yellowstone - terraced rings and steam columns.
    case 1: return (
      <>
        <path d={ridge(Y - H * 0.08, W, H * 0.07, 6, 7, Y)} fill={far} />
        <path d={ridge(Y, W, H * 0.04, 5, 11, H)} fill={mid} />
        {[0.06, 0.16, 0.86, 0.95].map((t, n) => (
          <Steam key={n} x={W * t} y={Y - H * 0.02} h={H * (0.3 + (n % 2) * 0.16)}
            fill={p.light} />
        ))}
        {/* Terraces: flat elliptical rings stepping down, bottom of frame. */}
        {Array.from({ length: 6 }, (_, n) => {
          const t = n / 5
          return (
            <ellipse key={n} cx={W * 0.5} cy={H * (0.82 + t * 0.2)}
              rx={W * (0.3 + t * 0.34)} ry={H * (0.03 + t * 0.03)}
              fill={n % 2 ? near : p.accent} opacity={0.5 + t * 0.4} />
          )
        })}
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.9} L ${W * 0.2} ${H * 0.97}
          L ${W * 0.16} ${H} Z`} />
      </>
    )

    // 3. Grand Canyon - receding buttes, a rim ledge near.
    case 2: return (
      <>
        {[[0.34, far, 0.7], [0.46, mid, 0.85], [0.56, near, 1]].map(([t, fill, o], n) => (
          <Buttes key={n} y={H * (t as number)} h={H * 0.13}
            fill={fill as string} opacity={o as number} seed={n * 17 + 3} />
        ))}
        {/* The river, a thread, far down and off-centre. */}
        <path fill="#6f9ab0" d={`M ${W * 0.2} ${H * 0.68} Q ${W * 0.5} ${H * 0.72}
          ${W * 0.84} ${H * 0.66} L ${W * 0.84} ${H * 0.69}
          Q ${W * 0.5} ${H * 0.75} ${W * 0.2} ${H * 0.71} Z`} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.74} L ${W * 0.3} ${H * 0.84}
          L ${W * 0.24} ${H} Z`} />
        <path fill={p.ink} d={`M ${W + 20} ${H} L ${W + 20} ${H * 0.78}
          L ${W * 0.76} ${H * 0.9} L ${W * 0.8} ${H} Z`} />
        <path d={conifer(W * 0.12, H * 0.84, 150, 5)} fill={p.ink} />
      </>
    )

    // 4. Glacier - hanging valley, ribbon falls, turquoise lake.
    case 3: return (
      <>
        <path d={ridge(H * 0.32, W, H * 0.16, 5, 13, Y)} fill={far} />
        <path fill={mid} d={`M -20 ${Y} L ${W * 0.12} ${H * 0.36}
          L ${W * 0.34} ${H * 0.4} L ${W * 0.46} ${Y} Z`} />
        {[0.16, 0.22].map((t, n) => (
          <path key={n} fill={p.light}
            d={`M ${W * t} ${H * 0.4} l ${6 + n * 3} 0 l -2 ${H * 0.22} l ${-(4 + n * 3)} 0 z`} />
        ))}
        <rect x="0" y={Y} width={W} height={H - Y} fill={p.accent} opacity=".5" />
        {/* Bear-grass along the bottom: the plant that says Glacier. */}
        <g fill={p.ink}>
          {Array.from({ length: 22 }, (_, n) => {
            const x = ((n * 173) % 1000) / 1000 * W
            const h = 60 + ((n * 41) % 70)
            return (
              <g key={n}>
                <rect x={r(x)} y={r(H - h)} width="4" height={r(h)} />
                <circle cx={r(x + 2)} cy={r(H - h - 8)} r="11" />
              </g>
            )
          })}
        </g>
      </>
    )

    // 5. Zion - sheer cream-and-rust walls either side, river below.
    case 4: return (
      <>
        <path d={ridge(H * 0.4, W, H * 0.08, 6, 19, Y)} fill={far} opacity=".6" />
        <path fill={mid} d={`M -20 ${H} L -20 ${H * 0.06} L ${W * 0.3} ${H * 0.14}
          L ${W * 0.36} ${H} Z`} />
        <path fill={near} d={`M ${W + 20} ${H} L ${W + 20} ${H * 0.02}
          L ${W * 0.68} ${H * 0.12} L ${W * 0.62} ${H} Z`} />
        {/* Strata: horizontal bands, the thing that says sandstone. */}
        {[0.3, 0.44, 0.58].map((t, n) => (
          <g key={n} opacity=".3">
            <rect x="-20" y={r(H * t)} width={r(W * 0.34)} height="10" fill={p.ink} />
            <rect x={r(W * 0.64)} y={r(H * (t + 0.03))} width={r(W * 0.4)} height="10"
              fill={p.ink} />
          </g>
        ))}
        <path fill="#5e8a6a" d={`M ${W * 0.3} ${H} L ${W * 0.36} ${H * 0.82}
          L ${W * 0.64} ${H * 0.8} L ${W * 0.68} ${H} Z`} />
        {[0.38, 0.6].map((t, n) => (
          <path key={n} d={broadleaf(W * t, H * 0.98, 160 - n * 30, n + 7)} fill={fore} />
        ))}
      </>
    )

    // 6. Yosemite - the great granite face, a meadow, mist.
    case 5: return (
      <>
        <path fill={far} d={`M ${W * 0.3} ${Y} L ${W * 0.36} ${H * 0.1}
          L ${W * 0.52} ${H * 0.06} L ${W * 0.62} ${H * 0.2} L ${W * 0.76} ${Y} Z`} />
        <path fill={mid} d={`M -20 ${Y} L ${W * 0.1} ${H * 0.3} L ${W * 0.3} ${Y} Z`} />
        <path fill={p.light} opacity=".85"
          d={`M ${W * 0.14} ${H * 0.34} l 8 0 l -3 ${H * 0.26} l -6 0 z`} />
        <rect x="0" y={Y} width={W} height={H - Y} fill={near} />
        {/* Mist in the meadow: two flat bands, not a blur. */}
        {[0.72, 0.78].map((t, n) => (
          <rect key={n} x="0" y={r(H * t)} width={W} height={r(H * 0.03)}
            fill="#ffffff" opacity={0.3 - n * 0.1} />
        ))}
        <path d={conifer(W * 0.08, H * 0.98, 290, 11)} fill={p.ink} />
        <path d={conifer(W * 0.93, H * 1.0, 250, 13)} fill={p.ink} />
        <path d={conifer(W * 0.98, H * 0.96, 180, 17)} fill={fore} />
      </>
    )

    // 7. Sedona - red spires, juniper, hard noon shadow.
    case 6: return (
      <>
        <path d={ridge(Y - H * 0.04, W, H * 0.05, 7, 23, Y)} fill={far} opacity=".5" />
        {[[0.04, 0.42], [0.14, 0.3], [0.86, 0.38], [0.95, 0.26]].map(([t, h], n) => (
          <Spire key={n} x={W * (t as number)} base={Y} h={H * (h as number)}
            fill={n < 2 ? mid : near} shade={fore} />
        ))}
        <rect x="0" y={Y} width={W} height={H - Y} fill={near} />
        <path fill="#c88a58" d={`M ${W * 0.4} ${Y} L ${W * 0.46} ${Y}
          L ${W * 0.72} ${H} L ${W * 0.22} ${H} Z`} />
        {[0.1, 0.22, 0.82, 0.92].map((t, n) => (
          <Juniper key={n} x={W * t} y={H * (0.92 + (n % 2) * 0.06)}
            h={110 + (n % 3) * 40} ink={p.accent} />
        ))}
      </>
    )

    // 8. Acadia - pink granite shore, spruce, a lighthouse on the point.
    case 7: return (
      <>
        <path d={ridge(H * 0.5, W, H * 0.08, 5, 29, H * 0.6)} fill={far} opacity=".6" />
        <rect x="0" y={H * 0.6} width={W} height={H * 0.4} fill={mid} />
        {[0.68, 0.76].map((t, n) => (
          <rect key={n} x="0" y={r(H * t)} width={W} height={r(H * 0.02)}
            fill="#ffffff" opacity={0.3 - n * 0.1} />
        ))}
        {/* The granite shore, bottom, pink and blocky. */}
        <path fill={near} d={`M -20 ${H} L -20 ${H * 0.82}
          L ${W * 0.3} ${H * 0.88} L ${W * 0.56} ${H * 0.8}
          L ${W + 20} ${H * 0.9} L ${W + 20} ${H} Z`} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.92} L ${W * 0.4} ${H * 0.96}
          L ${W + 20} ${H * 0.94} L ${W + 20} ${H} Z`} />
        <Lighthouse x={W * 0.9} y={H * 0.8} h={H * 0.16} ink={p.ink} lit={p.light} />
        {[0.05, 0.12, 0.18].map((t, n) => (
          <path key={n} d={conifer(W * t, H * 0.86, 170 - n * 30, n + 19)}
            fill={p.accent} />
        ))}
      </>
    )

    // 9. Great Smokies - ridge on ridge fading, mist in the hollows.
    case 8: return (
      <>
        {[0.42, 0.5, 0.58, 0.66].map((t, n) => (
          <g key={n}>
            <path d={ridge(H * t, W, H * 0.07, 6, 31 + n * 7, H)}
              fill={[far, mid, near, fore][n]} />
            {n < 3 && (
              <rect x="0" y={r(H * (t + 0.05))} width={W} height={r(H * 0.022)}
                fill="#ffffff" opacity={0.34 - n * 0.08} />
            )}
          </g>
        ))}
        {/* A split-rail fence along the bottom - the one made thing. */}
        <g fill={p.ink}>
          {Array.from({ length: 9 }, (_, n) => (
            <rect key={n} x={r(W * (0.02 + n * 0.12))} y={r(H * 0.88)} width="9"
              height={r(H * 0.12)} />
          ))}
          {[0.9, 0.95].map((t, n) => (
            <path key={n} d={`M -20 ${r(H * t)} L ${W + 20} ${r(H * (t - 0.012))}
              L ${W + 20} ${r(H * (t + 0.01))} L -20 ${r(H * (t + 0.022))} Z`} />
          ))}
        </g>
      </>
    )

    // 10. Joshua Tree at night - yucca, boulders, the Milky Way, one tent.
    default: return (
      <>
        <MilkyWay />
        <path d={ridge(H * 0.6, W, H * 0.08, 6, 41, H)} fill={far} />
        <path d={ridge(H * 0.74, W, H * 0.05, 5, 43, H)} fill={mid} />
        {/* Boulder piles, bottom corners. */}
        {[[0.04, 1], [0.12, 0.7], [0.9, 1.1], [0.97, 0.8]].map(([t, s], n) => (
          <g key={n} fill={n < 2 ? near : fore}>
            <ellipse cx={r(W * (t as number))} cy={r(H * 0.95)}
              rx={r(110 * (s as number))} ry={r(70 * (s as number))} />
            <ellipse cx={r(W * (t as number) + 60 * (s as number))} cy={r(H * 0.99)}
              rx={r(80 * (s as number))} ry={r(50 * (s as number))} />
          </g>
        ))}
        {[0.24, 0.78].map((t, n) => (
          <Yucca key={n} x={W * t} y={H * (0.9 - n * 0.02)} h={180 + n * 50}
            ink={p.ink} />
        ))}
        {/* One lit tent: the human note that makes the sky enormous. */}
        <g transform={`translate(${W * 0.44} ${H * 0.94})`}>
          <path d="M -40 0 L 0 -52 L 40 0 Z" fill={p.accent} />
          <path d="M -40 0 L 0 -52 L 8 -52 L -24 0 Z" fill={p.ink} opacity=".45" />
        </g>
      </>
    )
  }
}

// ---------------------------------------------------------------------------

function Bole({ x, w, fill, ink }: {
  x: number; w: number; fill: string; ink: string
}) {
  return (
    <g>
      <path fill={fill} d={`M ${r(x)} ${H + 20} L ${r(x + w * 0.12)} ${-20}
        L ${r(x + w * 0.86)} ${-20} L ${r(x + w)} ${H + 20}
        q ${r(-w * 0.24)} ${-34} ${r(-w * 0.44)} 0
        q ${r(-w * 0.16)} ${-38} ${r(-w * 0.32)} 0 Z`} />
      {[0.24, 0.44, 0.66].map((t, n) => (
        <rect key={n} x={r(x + w * t)} y={-20} width={r(w * 0.05)} height={H + 40}
          fill={ink} opacity=".3" />
      ))}
    </g>
  )
}

function Walker({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink} transform={`translate(${r(x)} ${r(y)})`}>
      <circle cx="0" cy={-s * 0.78} r={s * 0.2} />
      <path d={`M ${-s * 0.24} ${-s * 0.6} q ${s * 0.24} ${-s * 0.18}
        ${s * 0.48} 0 l ${s * 0.1} ${s * 0.6} l ${-s * 0.68} 0 z`} />
    </g>
  )
}

/** A plume with a stem and a flare, dissolving upward. Not a white blob. */
function Steam({ x, y, h, fill }: {
  x: number; y: number; h: number; fill: string
}) {
  return (
    <g>
      {[0, 1, 2].map((n) => (
        <path key={n} fill={fill} opacity={0.42 - n * 0.11}
          d={`M ${r(x - 11 - n * 5)} ${r(y)} Q ${r(x - 34 - n * 16)} ${r(y - h * 0.6)}
              ${r(x - 48 - n * 22)} ${r(y - h)} L ${r(x + 48 + n * 22)} ${r(y - h)}
              Q ${r(x + 34 + n * 16)} ${r(y - h * 0.6)} ${r(x + 11 + n * 5)} ${r(y)} Z`} />
      ))}
    </g>
  )
}

function Buttes({ y, h, fill, opacity, seed }: {
  y: number; h: number; fill: string; opacity: number; seed: number
}) {
  return (
    <g fill={fill} opacity={opacity}>
      {Array.from({ length: 6 }, (_, n) => {
        const x = ((n * 211 + seed * 97) % 1000) / 1000 * W
        const w = 150 + ((n * 53) % 180)
        const hh = h * (0.5 + ((n * 37) % 60) / 100)
        return (
          <path key={n} d={`M ${r(x)} ${r(y + h)} L ${r(x + w * 0.08)} ${r(y + h - hh)}
            L ${r(x + w * 0.92)} ${r(y + h - hh)} L ${r(x + w)} ${r(y + h)} Z`} />
        )
      })}
      <rect x="-20" y={r(y + h - 4)} width={W + 40} height={r(h)} />
    </g>
  )
}

/** A Sedona spire: tall, stepped, with a shaded side. */
function Spire({ x, base, h, fill, shade }: {
  x: number; base: number; h: number; fill: string; shade: string
}) {
  const w = h * 0.32
  return (
    <g>
      <path fill={fill} d={`M ${r(x - w)} ${r(base)} L ${r(x - w * 0.72)} ${r(base - h * 0.62)}
        L ${r(x - w * 0.4)} ${r(base - h * 0.66)} L ${r(x - w * 0.22)} ${r(base - h)}
        L ${r(x + w * 0.3)} ${r(base - h * 0.94)} L ${r(x + w * 0.56)} ${r(base - h * 0.5)}
        L ${r(x + w)} ${r(base)} Z`} />
      <path fill={shade} opacity=".45" d={`M ${r(x - w)} ${r(base)}
        L ${r(x - w * 0.72)} ${r(base - h * 0.62)} L ${r(x - w * 0.22)} ${r(base - h)}
        L ${r(x - w * 0.1)} ${r(base)} Z`} />
    </g>
  )
}

function Juniper({ x, y, h, ink }: {
  x: number; y: number; h: number; ink: string
}) {
  return (
    <g fill={ink}>
      <path d={`M ${r(x - h * 0.04)} ${r(y)} q ${h * 0.06} ${-h * 0.5}
        ${-h * 0.02} ${-h * 0.86} l ${h * 0.08} 0 q ${h * 0.04} ${h * 0.42}
        ${h * 0.02} ${h * 0.86} z`} />
      <ellipse cx={r(x - h * 0.1)} cy={r(y - h * 0.8)} rx={r(h * 0.3)} ry={r(h * 0.2)} />
      <ellipse cx={r(x + h * 0.2)} cy={r(y - h * 0.66)} rx={r(h * 0.24)} ry={r(h * 0.16)} />
    </g>
  )
}

function Lighthouse({ x, y, h, ink, lit }: {
  x: number; y: number; h: number; ink: string; lit: string
}) {
  const w = h * 0.2
  return (
    <g>
      <path fill={ink} d={`M ${r(x - w * 0.6)} ${r(y)} L ${r(x - w * 0.34)} ${r(y - h)}
        L ${r(x + w * 0.34)} ${r(y - h)} L ${r(x + w * 0.6)} ${r(y)} Z`} />
      <rect x={r(x - w * 0.42)} y={r(y - h * 1.14)} width={r(w * 0.84)}
        height={r(h * 0.16)} fill={ink} />
      <circle cx={r(x)} cy={r(y - h * 1.06)} r={r(w * 0.22)} fill={lit} />
    </g>
  )
}

function Yucca({ x, y, h, ink }: {
  x: number; y: number; h: number; ink: string
}) {
  return (
    <g fill={ink}>
      <rect x={r(x - h * 0.04)} y={r(y - h)} width={r(h * 0.08)} height={r(h)} />
      {[-1, 1].map((s) =>
        [0.34, 0.6, 0.86].map((t, n) => (
          <g key={`${s}${n}`}>
            <rect x={r(x)} y={r(y - h * t)} width={r(h * 0.3 * s)} height={r(h * 0.035)}
              transform={`rotate(${s * (18 + n * 10)} ${r(x)} ${r(y - h * t)})`} />
            <circle cx={r(x + h * 0.3 * s * 0.9)} cy={r(y - h * t - h * 0.06 * n)}
              r={r(h * 0.11)} />
          </g>
        )))}
      <circle cx={r(x)} cy={r(y - h - h * 0.04)} r={r(h * 0.13)} />
    </g>
  )
}

function MilkyWay() {
  return (
    <g fill="#ffffff">
      {Array.from({ length: 150 }, (_, n) => {
        const t = n / 150
        // A band across the upper frame, denser toward its spine.
        const spine = H * (0.1 + Math.sin(t * Math.PI) * 0.12)
        const off = (((n * 173) % 100) / 100 - 0.5) * H * 0.26
        return (
          <circle key={n} cx={r(W * t)} cy={r(spine + off)}
            r={0.8 + ((n * 11) % 3) * 0.7}
            opacity={0.3 + (1 - Math.abs(off) / (H * 0.13)) * 0.5} />
        )
      })}
    </g>
  )
}
