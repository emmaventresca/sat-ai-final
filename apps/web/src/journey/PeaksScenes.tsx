import { range, Summit } from './Summits'
import { WORLDS } from './art'

/**
 * Ten places on the ice.
 *
 * The value structure here is inverted and that inversion IS the subject: the
 * sky at altitude is dark, the brightest thing in frame is snow in the far
 * distance, and the foreground is nearly black. A dark frame around a blazing
 * white centre is where the awe lives, and lighting the valley throws it away.
 *
 * Two rules the research was emphatic about, both of which I had wrong first
 * time: snow shadow is BLUE and snow light is WARM - neutral grey snow is the
 * fastest way to make this subject look cheap - and the summit belongs high
 * in the frame, around a quarter down, because grandeur in mountain painting
 * comes from putting the subject above the viewer's eye line.
 */
export function PeaksScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.peaks
  const rock = p.far[0]
  const mid = p.mid[0]
  const dark = p.mid[1]
  const snow = p.sunCore
  const shade = '#7fa8d4'
  const glow = p.glow[0]
  const ink = p.frame
  const peaks = (n: number, tall: number, base = y) =>
    range(W, base, tall, v * 31 + n, n)

  switch (v % 10) {
    // 1. Base camp: bright tents on grey moraine, everything below unlit.
    case 0:
      return (
        <>
          {peaks(5, H * 0.5).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Moraine y={y + H * 0.06} w={W} ink={ink} />
          <Tents y={y + H * 0.05} w={W} ink={ink} lit={glow} />
        </>
      )

    // 2. The prayer-flag pass: a cairn, flags radiating, range beyond.
    case 1:
      return (
        <>
          {peaks(5, H * 0.46).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Cairn x={W * 0.22} y={y + H * 0.1} h={H * 0.16} ink={ink} />
          <Flags from={[W * 0.22, y - H * 0.06]} to={[W * 1.05, y + H * 0.04]} sag={H * 0.1} />
          <Flags from={[W * 0.22, y - H * 0.06]} to={[-W * 0.05, y + H * 0.08]} sag={H * 0.06} />
        </>
      )

    // 3. The icefall: chaotic seracs and blue crevasses, a rope team for scale.
    case 2:
      return (
        <>
          {peaks(4, H * 0.42).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Seracs y={y + H * 0.04} w={W} snow={snow} shade={shade} ice="#1e8fa8" />
          <Rope y={y + H * 0.1} x={W * 0.3} w={W * 0.4} ink={ink} />
        </>
      )

    // 4. Summit ridge: a knife-edge from lower-left to the top, two figures.
    case 3:
      return (
        <>
          {peaks(3, H * 0.52).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Ridge y={y} w={W} h={H} snow={snow} shade={shade} ink={ink} />
          <Spindrift x={W * 0.62} y={y - H * 0.34} w={W * 0.3} snow={snow} />
        </>
      )

    // 5. Looking down a glacier: moraine stripes and crevasse arcs.
    case 4:
      return (
        <>
          {peaks(5, H * 0.34).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Glacier y={y} w={W} h={H} snow={snow} shade={shade} ink={ink} />
        </>
      )

    // 6. The monastery terrace, with the peak filling everything behind it.
    case 5:
      return (
        <>
          {peaks(3, H * 0.56).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <Monastery x={W * 0.14} y={y + H * 0.1} w={W * 0.3} ink={ink} lit={glow} />
          <Flags from={[W * 0.14, y + H * 0.02]} to={[W * 0.78, y + H * 0.06]} sag={H * 0.09} />
        </>
      )

    // 7. A sea of cloud with only the peak tips out of it.
    case 6:
      return (
        <>
          {peaks(6, H * 0.4).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <CloudSea y={y - H * 0.08} w={W} h={H} snow={snow} shade={shade} />
        </>
      )

    // 8. The south face: one vertical plane, fluted, filling the frame.
    case 7:
      return <Wall y={y} w={W} h={H} snow={snow} shade={shade} glow={glow} ink={ink} />

    // 9. The frozen lake under the wall, with a yak train crossing.
    case 8:
      return (
        <>
          {peaks(4, H * 0.44).map((s, i) => (
            <Summit key={i} s={s} rock={rock} mid={mid} dark={dark}
              snow={snow} snowShade={shade} glow={glow} />
          ))}
          <FrozenLake y={y + H * 0.05} w={W} h={H} ice="#1e8fa8" shade={shade} />
          <Yaks y={y + H * 0.12} w={W} ink={ink} />
        </>
      )

    // 10. Night, with only the last hundred metres still catching light.
    default:
      return (
        <>
          {peaks(5, H * 0.48).map((s, i) => (
            <Summit key={i} s={s} rock={dark} mid={dark} dark={ink}
              snow={shade} snowShade={ink} glow={glow} />
          ))}
          <Stars w={W} h={y} />
        </>
      )
  }
}

// ---------------------------------------------------------------------------

/** Prayer flags: a catenary, never a straight line, in the fixed order. */
const FLAG = ['#1c6fd6', '#fafafa', '#d82c2c', '#17a34a', '#f2c014']

function Flags({ from, to, sag }: {
  from: [number, number]; to: [number, number]; sag: number
}) {
  const [x1, y1] = from
  const [x2, y2] = to
  const n = 18
  const at = (t: number): [number, number] => [
    x1 + (x2 - x1) * t,
    y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag,
  ]
  return (
    <g>
      <path d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 1.3} ${x2} ${y2}`}
        fill="none" stroke="#2a3a5c" strokeWidth="1.6" />
      {Array.from({ length: n }, (_, i) => {
        const [fx, fy] = at((i + 0.5) / n)
        const s = 0.74   // darkened: flags are in shadow, the summit is not
        return (
          <rect key={i} x={fx - 11} y={fy} width={22} height={17} rx="1.5"
            fill={FLAG[i % 5]} opacity={s} />
        )
      })}
    </g>
  )
}

function Cairn({ x, y, h, ink }: { x: number; y: number; h: number; ink: string }) {
  return (
    <g fill={ink}>
      {[0, 1, 2, 3, 4].map((i) => {
        const t = i / 5
        const w = h * (0.42 - t * 0.26)
        return <ellipse key={i} cx={x + (i % 2 ? 3 : -3)} cy={y - h * t} rx={w} ry={w * 0.46} />
      })}
    </g>
  )
}

function Moraine({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <path fill={ink} d={`M -20 ${y + 400} L -20 ${y} Q ${w * 0.3} ${y - 36}
      ${w * 0.56} ${y + 10} Q ${w * 0.82} ${y + 48} ${w + 20} ${y + 6}
      L ${w + 20} ${y + 400} Z`} />
  )
}

function Tents({ y, w, ink, lit }: { y: number; w: number; ink: string; lit: string }) {
  return (
    <g>
      {[[0.2, 1], [0.3, 0.8], [0.42, 0.95], [0.56, 0.72], [0.66, 0.88]].map(([t, s], i) => (
        <g key={i} transform={`translate(${w * t} ${y + 16}) scale(${s})`}>
          <path d="M -17 0 L 0 -21 L 17 0 Z" fill={lit} opacity=".9" />
          <path d="M -17 0 L 0 -21 L 4 -21 L -9 0 Z" fill={ink} opacity=".45" />
        </g>
      ))}
    </g>
  )
}

/** Crushed-sugar ice blocks: bright tops, deep blue shadow sides. */
function Seracs({ y, w, snow, shade, ice }: {
  y: number; w: number; snow: string; shade: string; ice: string
}) {
  return (
    <g>
      {Array.from({ length: 26 }, (_, i) => {
        const x = ((i * 211) % 1000) / 1000 * w
        const s = 22 + ((i * 37) % 48)
        const tilt = ((i * 53) % 24) - 12
        const yy = y + ((i * 97) % 90)
        return (
          <g key={i} transform={`translate(${x} ${yy}) rotate(${tilt})`}>
            <path d={`M 0 0 l ${s} ${-s * 0.3} l ${s * 0.3} ${s * 0.6} l ${-s} ${s * 0.32} z`}
              fill={snow} />
            <path d={`M ${s} ${-s * 0.3} l ${s * 0.3} ${s * 0.6} l 0 ${s * 0.6}
                      l ${-s * 0.3} ${-s * 0.5} z`} fill={shade} />
            <path d={`M 0 0 l ${s} ${-s * 0.3} l 0 ${s * 0.2} l ${-s} ${s * 0.3} z`}
              fill={ice} opacity=".35" />
          </g>
        )
      })}
    </g>
  )
}

function Rope({ y, x, w, ink }: { y: number; x: number; w: number; ink: string }) {
  return (
    <g>
      <path d={`M ${x} ${y} Q ${x + w / 2} ${y - 22} ${x + w} ${y - 8}`}
        fill="none" stroke={ink} strokeWidth="1.6" />
      {[0, 0.34, 0.68, 1].map((t, i) => (
        <g key={i} fill={ink}
          transform={`translate(${x + w * t} ${y - 8 - Math.sin(Math.PI * t) * 14})`}>
          <circle cx="0" cy="-13" r="3.6" />
          <path d="M -4 -9 q 4 -3 8 0 l 2 11 l -12 0 z" />
        </g>
      ))}
    </g>
  )
}

/** A knife-edge corniced ridge running up to the summit. */
function Ridge({ y, w, h, snow, shade, ink }: {
  y: number; w: number; h: number; snow: string; shade: string; ink: string
}) {
  const d = `M -20 ${y + h} L -20 ${y + h * 0.24}
             Q ${w * 0.28} ${y - h * 0.04} ${w * 0.62} ${y - h * 0.3}
             L ${w * 0.72} ${y - h * 0.24} Q ${w * 0.4} ${y + h * 0.1} ${w * 0.1} ${y + h}`
  return (
    <g>
      <path d={d} fill={shade} />
      <path d={`M -20 ${y + h * 0.24} Q ${w * 0.28} ${y - h * 0.04}
                ${w * 0.62} ${y - h * 0.3} L ${w * 0.6} ${y - h * 0.26}
                Q ${w * 0.26} ${y + h * 0.01} ${-20} ${y + h * 0.29} Z`} fill={snow} />
      {/* Two figures on it, because a ridge without scale is a line. */}
      {[0.34, 0.42].map((t, i) => (
        <g key={i} fill={ink}
          transform={`translate(${w * t} ${y + h * 0.17 - t * h * 0.42})`}>
          <circle cx="0" cy="-12" r="3.2" />
          <path d="M -4 -9 q 4 -3 8 0 l 2 10 l -12 0 z" />
        </g>
      ))}
    </g>
  )
}

function Spindrift({ x, y, w, snow }: {
  x: number; y: number; w: number; snow: string
}) {
  return (
    <g opacity=".45">
      {[0, 1, 2].map((i) => (
        <path key={i} fill={snow}
          d={`M ${x} ${y + i * 9} q ${w * 0.4} ${-14 - i * 7} ${w} ${-4 - i * 9}
              q ${-w * 0.5} ${12 + i * 6} ${-w} ${8 + i * 3} z`} />
      ))}
    </g>
  )
}

function Glacier({ y, w, h, snow, shade, ink }: {
  y: number; w: number; h: number; snow: string; shade: string; ink: string
}) {
  return (
    <g>
      <path fill={snow} d={`M -20 ${y + h} L ${w * 0.26} ${y + h * 0.06}
        L ${w * 0.62} ${y + h * 0.06} L ${w + 20} ${y + h} Z`} />
      {/* Crevasses arc downstream; lateral moraine runs the full length. */}
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 1) / 10
        const yy = y + h * (0.08 + t * 0.9)
        const spread = w * (0.18 + t * 0.52)
        return (
          <path key={i} fill="none" stroke={shade} strokeWidth={1.6 + t * 3}
            opacity=".7"
            d={`M ${w * 0.44 - spread} ${yy} Q ${w * 0.44} ${yy + 28 + t * 40}
                ${w * 0.44 + spread} ${yy}`} />
        )
      })}
      <path fill={ink} opacity=".8" d={`M -20 ${y + h} L ${w * 0.24} ${y + h * 0.06}
        L ${w * 0.29} ${y + h * 0.06} L ${w * 0.1} ${y + h} Z`} />
      <path fill={ink} opacity=".8" d={`M ${w + 20} ${y + h} L ${w * 0.64} ${y + h * 0.06}
        L ${w * 0.59} ${y + h * 0.06} L ${w * 0.86} ${y + h} Z`} />
    </g>
  )
}

function Monastery({ x, y, w, ink, lit }: {
  x: number; y: number; w: number; ink: string; lit: string
}) {
  const h = w * 0.46
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill="#f2ece0" opacity=".9" />
      <rect x={x - 6} y={y - h - 10} width={w + 12} height={13} fill="#7a3f2e" />
      {[0.12, 0.3, 0.48, 0.66, 0.84].map((t, i) => (
        <rect key={i} x={x + w * t} y={y - h * 0.62} width={w * 0.1}
          height={h * 0.34} fill={lit} opacity=".85" />
      ))}
      <rect x={x - w * 0.1} y={y} width={w * 1.2} height={10} fill={ink} />
    </g>
  )
}

function CloudSea({ y, w, h, snow, shade }: {
  y: number; w: number; h: number; snow: string; shade: string
}) {
  return (
    <g>
      <path fill={snow} opacity=".92" d={`M -20 ${y + h} L -20 ${y}
        Q ${w * 0.16} ${y - 34} ${w * 0.34} ${y - 4}
        Q ${w * 0.52} ${y + 26} ${w * 0.7} ${y - 10}
        Q ${w * 0.88} ${y - 40} ${w + 20} ${y + 8} L ${w + 20} ${y + h} Z`} />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={w * (0.2 + i * 0.3)} cy={y + 26 + i * 16}
          rx={w * 0.28} ry={16} fill={shade} opacity=".2" />
      ))}
    </g>
  )
}

/** One vertical plane, fluted by avalanche, with a rope team as specks. */
function Wall({ y, w, h, snow, shade, glow, ink }: {
  y: number; w: number; h: number
  snow: string; shade: string; glow: string; ink: string
}) {
  return (
    <g>
      <path fill={snow} d={`M -20 ${y + h} L ${w * 0.06} ${y - h * 0.6}
        L ${w * 0.5} ${y - h * 0.78} L ${w * 0.94} ${y - h * 0.56}
        L ${w + 20} ${y + h} Z`} />
      {Array.from({ length: 22 }, (_, i) => {
        const t = i / 21
        const x = w * (0.06 + t * 0.88)
        return (
          <path key={i} fill={shade} opacity={0.3 + ((i * 7) % 5) * 0.06}
            d={`M ${x} ${y - h * 0.6} Q ${x + 10} ${y - h * 0.2} ${x + 4} ${y + h * 0.3}
                L ${x + 16} ${y + h * 0.3} Q ${x + 24} ${y - h * 0.2} ${x + 16} ${y - h * 0.6} Z`} />
        )
      })}
      <path fill={glow} opacity=".6" d={`M ${w * 0.06} ${y - h * 0.6}
        L ${w * 0.5} ${y - h * 0.78} L ${w * 0.94} ${y - h * 0.56}
        L ${w * 0.9} ${y - h * 0.42} L ${w * 0.5} ${y - h * 0.62}
        L ${w * 0.1} ${y - h * 0.46} Z`} />
      {[0.42, 0.46, 0.5].map((t, i) => (
        <circle key={i} cx={w * t} cy={y + h * (0.04 + i * 0.03)} r="3.4" fill={ink} />
      ))}
    </g>
  )
}

function FrozenLake({ y, w, h, ice, shade }: {
  y: number; w: number; h: number; ice: string; shade: string
}) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h} fill={ice} opacity=".5" />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} fill="none" stroke={shade} strokeWidth={1.4 + i * 0.5}
          opacity=".45"
          d={`M ${-20 + i * 30} ${y + 30 + i * 46} Q ${w * 0.5} ${y + 10 + i * 52}
              ${w + 20} ${y + 34 + i * 44}`} />
      ))}
    </g>
  )
}

function Yaks({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      {[0.26, 0.34, 0.41, 0.49].map((t, i) => (
        <g key={i} transform={`translate(${w * t} ${y})`}>
          <path d="M -15 0 q 4 -13 15 -12 q 11 -1 15 12 z" />
          <path d="M 15 -10 q 7 -2 9 -7 q 3 4 -2 8 z" />
        </g>
      ))}
    </g>
  )
}

function Stars({ w, h }: { w: number; h: number }) {
  return (
    <g fill="#fff">
      {Array.from({ length: 90 }, (_, i) => (
        <circle key={i} cx={((i * 367) % 1000) / 1000 * w}
          cy={((i * 173) % 1000) / 1000 * h * 0.8}
          r={0.7 + ((i * 11) % 3) * 0.5}
          opacity={0.3 + ((i * 7) % 6) * 0.1} />
      ))}
    </g>
  )
}
