import { WORLDS } from './art'

/**
 * Ten places in the tropics.
 *
 * The first attempt here failed in a specific, diagnosable way: I drew the
 * buildings as plain rectangles, and rectangles read as blocks. A real
 * Tropical Deco hotel is a rectangle plus four mandatory events, and leaving
 * them out is exactly what produced abstract geometry instead of a place:
 *
 *   STEPPED PARAPET  the roofline is never one horizontal. It is a three-part
 *                    ziggurat with a finial, so the silhouette has seven
 *                    changes of direction instead of one.
 *   EYEBROWS         a cantilevered slab over every window band, lit on top
 *                    and throwing a hard shadow bar underneath. This is the
 *                    single shape that makes a facade read as Miami, because
 *                    it turns a flat plane into a stack of light/dark
 *                    sandwiches.
 *   CURVED CORNER    one corner is a quarter-cylinder with the window bands
 *                    wrapping round it. Curvature against the orthogonals is
 *                    what says 1930s rather than box.
 *   RACING STRIPES   three parallel incised lines, or three portholes.
 *
 * And a palm is an S-curved taper with ring scars and uneven, drooping
 * fronds. A straight trunk with symmetrical fronds is a clip-art icon.
 */
export function TropicScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.tropic
  const cream = '#f9f2e2'
  const pink = '#ffd6e4'
  const shadow = '#8c4c84'       // violet, never grey - the anti-grey rule
  const ink = p.frame
  const neonC = '#28e0c8'
  const neonM = '#ff3fa6'
  const gold = '#ffc247'

  switch (v % 10) {
    // 1. Ocean Drive at eye level: staggered hotels, palms, wet asphalt.
    case 0:
      return (
        <>
          <Strip y={y} w={W} h={H} seed={v} cream={cream} pink={pink}
            shadow={shadow} gold={gold} neon={neonM} />
          <Palm x={W * 0.78} base={y + H * 0.06} h={H * 0.46} lean={11} ink={ink} />
          <Palm x={W * 0.9} base={y + H * 0.1} h={H * 0.34} lean={-8} ink={ink} />
          <WetGround y={y + H * 0.08} w={W} h={H} gold={gold} />
        </>
      )

    // 2. A hotel across a pool, reflected and broken by ripple.
    case 1:
      return (
        <>
          <Deco x={W * 0.24} y={y} w={W * 0.5} h={H * 0.34}
            cream={cream} pink={pink} shadow={shadow} gold={gold} neon={neonC} />
          <Pool y={y + H * 0.06} w={W} h={H} />
          <Board x={W * 0.1} y={y + H * 0.14} ink={ink} />
        </>
      )

    // 3. The lifeguard stand against the banded sun.
    case 2:
      return (
        <>
          <Stand x={W * 0.3} y={y + H * 0.05} s={H * 0.2} ink={ink} />
          <Sand y={y + H * 0.06} w={W} h={H} />
        </>
      )

    // 4. The coast road from above, guardrail ticking off the curve.
    case 3:
      return (
        <>
          <Headland y={y} w={W} h={H} shadow={shadow} ink={ink} />
          <Guardrail y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 5. The marina: bare masts as vertical rhythm.
    case 4:
      return (
        <>
          <Strip y={y - H * 0.02} w={W} h={H * 0.6} seed={v + 3} cream={cream}
            pink={pink} shadow={shadow} gold={gold} neon={neonC} />
          <Masts y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 6. Inland: a fluted volcanic ridge with a waterfall thread.
    case 5:
      return (
        <>
          <Ridge y={y} w={W} h={H} face="#5c7a4a" shade="#2e3f28" gold={gold} />
          <Falls x={W * 0.56} y={y - H * 0.22} h={H * 0.28} />
          <Jungle y={y + H * 0.06} w={W} ink={ink} />
        </>
      )

    // 7. A curved corner bay close up, neon blade sign, palm crossing it.
    case 6:
      return (
        <>
          <Deco x={W * 0.18} y={y + H * 0.1} w={W * 0.56} h={H * 0.52}
            cream={pink} pink={cream} shadow={shadow} gold={gold} neon={neonM} />
          <Blade x={W * 0.7} y={y - H * 0.34} h={H * 0.3} neon={neonM} />
          <Palm x={W * 0.4} base={y + H * 0.3} h={H * 0.62} lean={9} ink={ink} />
        </>
      )

    // 8. Pool deck after dark: the water is the brightest thing in frame.
    case 7:
      return (
        <>
          <Deco x={W * 0.08} y={y} w={W * 0.3} h={H * 0.24}
            cream={shadow} pink={shadow} shadow={ink} gold={gold} neon={neonC} />
          <Pool y={y + H * 0.04} w={W} h={H} glow />
          <Loungers y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 9. A jungle valley, no architecture at all: four planes of foliage.
    case 8:
      return (
        <>
          <Ridge y={y - H * 0.04} w={W} h={H} face="#6f8f58" shade="#3b5134" gold={gold} />
          <Jungle y={y + H * 0.02} w={W} ink="#2a4228" />
          <Jungle y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 10. The causeway: lamps ticking into the distance, skyline cut out.
    default:
      return (
        <>
          <Strip y={y} w={W} h={H * 0.5} seed={v + 7} cream={shadow} pink={shadow}
            shadow={ink} gold={gold} neon={neonC} />
          <Causeway y={y + H * 0.05} w={W} h={H} ink={ink} lit={gold} />
        </>
      )
  }
}

// ---------------------------------------------------------------------------

/**
 * One Deco hotel: ziggurat parapet, eyebrows, curved corner, stripes.
 *
 * Every one of those is load-bearing. Drop them and this is a rectangle.
 */
function Deco({ x, y, w, h, cream, pink, shadow, gold, neon }: {
  x: number; y: number; w: number; h: number
  cream: string; pink: string; shadow: string; gold: string; neon: string
}) {
  const storeys = 4
  const top = y - h
  const r = w * 0.2
  return (
    <g>
      {/* Body, with the curved corner bay on the right. */}
      <path fill={cream} d={`M ${x} ${y} L ${x} ${top}
        L ${x + w - r} ${top} a ${r} ${r} 0 0 1 ${r} ${r} L ${x + w} ${y} Z`} />
      {/* Shadow side: violet, which is the whole anti-grey rule. */}
      <path fill={shadow} opacity=".5" d={`M ${x} ${y} L ${x} ${top}
        L ${x + w * 0.22} ${top} L ${x + w * 0.22} ${y} Z`} />

      {/* Ziggurat parapet: three steps and a finial. Seven direction changes. */}
      <g fill={cream}>
        <rect x={x + w * 0.3} y={top - h * 0.1} width={w * 0.4} height={h * 0.1} />
        <rect x={x + w * 0.38} y={top - h * 0.18} width={w * 0.24} height={h * 0.09} />
        <rect x={x + w * 0.47} y={top - h * 0.3} width={w * 0.06} height={h * 0.13} />
      </g>

      {/* Eyebrows: lit slab on top, hard shadow bar underneath. */}
      {Array.from({ length: storeys }, (_, i) => {
        const by = top + h * (0.2 + i * 0.19)
        return (
          <g key={i}>
            <rect x={x + w * 0.26} y={by} width={w * 0.6} height={h * 0.08}
              fill={pink} opacity=".75" />
            <rect x={x + w * 0.24} y={by - h * 0.028} width={w * 0.66}
              height={h * 0.03} fill="#fff" opacity=".65" />
            <rect x={x + w * 0.24} y={by + h * 0.002} width={w * 0.66}
              height={h * 0.028} fill={shadow} opacity=".8" />
          </g>
        )
      })}

      {/* Racing stripes in threes, and three portholes by the entrance. */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + w * (0.46 + i * 0.025)} y={top + h * 0.06}
          width={w * 0.012} height={h * 0.9} fill={shadow} opacity=".4" />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + w * (0.08 + i * 0.05)} cy={y - h * 0.14}
          r={w * 0.016} fill={shadow} opacity=".55" />
      ))}

      {/* Entry canopy projecting toward the viewer, and the neon on the bay. */}
      <rect x={x + w * 0.3} y={y - h * 0.1} width={w * 0.26} height={h * 0.022}
        fill={gold} />
      <rect x={x + w * 0.3} y={y - h * 0.08} width={w * 0.012} height={h * 0.08}
        fill={shadow} />
      <rect x={x + w * 0.545} y={y - h * 0.08} width={w * 0.012} height={h * 0.08}
        fill={shadow} />
      <rect x={x + w * 0.9} y={top + h * 0.1} width={w * 0.012} height={h * 0.5}
        fill={neon} />
      <rect x={x + w * 0.88} y={top + h * 0.1} width={w * 0.05} height={h * 0.5}
        fill={neon} opacity=".18" />
    </g>
  )
}

/** A street of them: unequal, overlapping, staggered in depth. */
function Strip({ y, w, h, seed, cream, pink, shadow, gold, neon }: {
  y: number; w: number; h: number; seed: number
  cream: string; pink: string; shadow: string; gold: string; neon: string
}) {
  const n = 5
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = i / n
        const bw = w * (0.2 + ((seed * 13 + i * 29) % 14) / 100)
        const bh = h * (0.2 + ((seed * 7 + i * 41) % 26) / 100)
        return (
          <Deco key={i} x={w * t - bw * 0.14} y={y + (i % 2 ? 8 : 0)}
            w={bw} h={bh}
            cream={i % 2 ? cream : pink} pink={i % 2 ? pink : cream}
            shadow={shadow} gold={gold} neon={neon} />
        )
      })}
    </g>
  )
}

/** An S-curved trunk with ring scars and uneven, drooping fronds. */
function Palm({ x, base, h, lean, ink }: {
  x: number; base: number; h: number; lean: number; ink: string
}) {
  const topX = x + lean * 2.6
  const topY = base - h
  return (
    <g fill={ink}>
      <path d={`M ${x - h * 0.028} ${base}
        C ${x + lean * 0.4} ${base - h * 0.45}, ${topX - lean} ${base - h * 0.7},
          ${topX} ${topY}
        l ${h * 0.022} 0
        C ${topX - lean * 0.6} ${base - h * 0.72}, ${x + lean * 0.9} ${base - h * 0.44},
          ${x + h * 0.028} ${base} Z`} />
      {Array.from({ length: 11 }, (_, i) => {
        const t = (i + 1) / 13
        const px = x + (topX - x) * t * t
        return (
          <rect key={i} x={px - h * 0.022} y={base - h * t} width={h * 0.044}
            height={h * 0.008} opacity=".5" />
        )
      })}
      {[-166, -138, -108, -74, -44, -18, 22].map((a, i) => (
        <path key={i} d={frond(topX, topY, h * (0.26 + (i % 3) * 0.05), a)} />
      ))}
      {/* Two dead fronds hanging straight down - the detail that stops it
          looking like an icon. */}
      {[-96, -84].map((a, i) => (
        <path key={`d${i}`} d={frond(topX, topY, h * 0.19, a)} opacity=".75" />
      ))}
    </g>
  )
}

function frond(x: number, y: number, len: number, deg: number): string {
  const a = (deg * Math.PI) / 180
  const tx = x + Math.cos(a) * len
  const ty = y + Math.sin(a) * len
  const bow = len * 0.34
  const nx = Math.cos(a + Math.PI / 2) * bow
  const ny = Math.sin(a + Math.PI / 2) * bow
  return `M ${x} ${y} Q ${(x + tx) / 2 + nx} ${(y + ty) / 2 + ny} ${tx} ${ty}
          Q ${(x + tx) / 2 + nx * 0.22} ${(y + ty) / 2 + ny * 0.22} ${x} ${y} Z`
}

function Pool({ y, w, h, glow }: {
  y: number; w: number; h: number; glow?: boolean
}) {
  return (
    <g>
      <rect x={w * 0.06} y={y} width={w * 0.88} height={h - y}
        fill={glow ? '#5fe0d2' : '#1e8fa8'} opacity={glow ? 0.75 : 0.55} rx="10" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={w * (0.1 + (i % 2) * 0.06)} y={y + 26 + i * 40}
          width={w * (0.5 + (i % 3) * 0.1)} height={3} rx="1.5"
          fill="#fff" opacity={0.26 - i * 0.03} />
      ))}
    </g>
  )
}

function Board({ x, y, ink }: { x: number; y: number; ink: string }) {
  return (
    <g fill={ink}>
      <rect x={x} y={y} width={120} height={9} rx="3" />
      <rect x={x + 8} y={y + 9} width={7} height={40} />
      <rect x={x + 96} y={y + 9} width={7} height={40} />
    </g>
  )
}

function Stand({ x, y, s, ink }: { x: number; y: number; s: number; ink: string }) {
  return (
    <g fill={ink}>
      <rect x={x} y={y - s} width={s * 1.2} height={s * 0.62} />
      <path d={`M ${x - s * 0.12} ${y - s} L ${x + s * 0.6} ${y - s * 1.36}
                L ${x + s * 1.32} ${y - s} Z`} />
      <rect x={x + s * 0.1} y={y - s * 0.38} width={s * 0.1} height={s * 0.38} />
      <rect x={x + s * 0.98} y={y - s * 0.38} width={s * 0.1} height={s * 0.38} />
      <path d={`M ${x + s * 0.2} ${y} l ${s * 0.16} ${-s * 0.4} l ${s * 0.1} 0
                l ${-s * 0.16} ${s * 0.4} z`} />
    </g>
  )
}

function Sand({ y, w, h }: { y: number; w: number; h: number }) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill="#e8c9a0" opacity=".5" />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} fill="none" stroke="#fff" strokeWidth="2" opacity={0.3 - i * 0.04}
          d={`M -20 ${y + 30 + i * 52} Q ${w * 0.5} ${y + 8 + i * 58}
              ${w + 20} ${y + 34 + i * 50}`} />
      ))}
    </g>
  )
}

function Headland({ y, w, h, shadow, ink }: {
  y: number; w: number; h: number; shadow: string; ink: string
}) {
  return (
    <g>
      <path fill={shadow} opacity=".7" d={`M -20 ${y} Q ${w * 0.3} ${y - h * 0.14}
        ${w * 0.62} ${y - h * 0.04} Q ${w * 0.86} ${y + h * 0.04} ${w + 20} ${y - h * 0.08}
        L ${w + 20} ${y + h} L -20 ${y + h} Z`} />
      <path fill={ink} d={`M -20 ${y + h * 0.16} Q ${w * 0.26} ${y + h * 0.04}
        ${w * 0.56} ${y + h * 0.16} Q ${w * 0.8} ${y + h * 0.28} ${w + 20} ${y + h * 0.18}
        L ${w + 20} ${y + h} L -20 ${y + h} Z`} />
    </g>
  )
}

function Guardrail({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      {Array.from({ length: 16 }, (_, i) => {
        const t = i / 15
        const x = w * (0.02 + t * 0.96)
        const s = 1 - t * 0.62
        return <rect key={i} x={x} y={y - 46 * s} width={5 * s} height={46 * s} />
      })}
      <path d={`M ${w * 0.02} ${y - 44} Q ${w * 0.5} ${y - 28} ${w * 0.98} ${y - 16}`}
        fill="none" stroke={ink} strokeWidth="5" />
    </g>
  )
}

function Masts({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g>
      {Array.from({ length: 18 }, (_, i) => {
        const x = ((i * 173) % 1000) / 1000 * w
        const h = 60 + ((i * 47) % 110)
        return (
          <g key={i} fill={ink}>
            <rect x={x} y={y - h} width="3" height={h} />
            <path d={`M ${x - 22} ${y} q 24 13 48 0 q -6 8 -24 8 q -18 0 -24 -8 z`} />
          </g>
        )
      })}
    </g>
  )
}

function Ridge({ y, w, h, face, shade, gold }: {
  y: number; w: number; h: number; face: string; shade: string; gold: string
}) {
  const teeth = 7
  const pts: string[] = []
  for (let i = 0; i <= teeth; i++) {
    const t = i / teeth
    const x = w * t
    const yy = y - h * (0.16 + ((i * 37) % 22) / 100)
    pts.push(`L ${x} ${yy}`)
  }
  return (
    <g>
      <path fill={face} d={`M -20 ${y + h} L -20 ${y} ${pts.join(' ')}
        L ${w + 20} ${y} L ${w + 20} ${y + h} Z`} />
      {/* Erosion flutes: a lit edge and a shadowed groove, irregularly spaced. */}
      {Array.from({ length: 22 }, (_, i) => {
        const x = ((i * 139) % 1000) / 1000 * w
        return (
          <g key={i}>
            <path fill={shade} opacity=".55"
              d={`M ${x} ${y - h * 0.22} q 6 ${h * 0.12} 2 ${h * 0.26} l 9 0
                  q 3 ${-h * 0.14} -3 ${-h * 0.26} z`} />
            <path fill={gold} opacity=".2"
              d={`M ${x + 9} ${y - h * 0.22} q 6 ${h * 0.12} 3 ${h * 0.26} l 3 0
                  q 2 ${-h * 0.14} -3 ${-h * 0.26} z`} />
          </g>
        )
      })}
    </g>
  )
}

function Falls({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      <path fill="#eaf6ff" opacity=".85"
        d={`M ${x} ${y} q -5 ${h * 0.5} -2 ${h} l 14 0 q 3 ${-h * 0.5} -1 ${-h} z`} />
      <ellipse cx={x + 6} cy={y + h} rx="26" ry="8" fill="#eaf6ff" opacity=".4" />
    </g>
  )
}

function Jungle({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      <path d={`M -20 ${y + 400} L -20 ${y} Q ${w * 0.2} ${y - 26} ${w * 0.42} ${y + 8}
        Q ${w * 0.66} ${y + 40} ${w + 20} ${y - 6} L ${w + 20} ${y + 400} Z`} />
      {Array.from({ length: 13 }, (_, i) => {
        const x = ((i * 211) % 1000) / 1000 * w
        return (
          <g key={i}>
            {[-150, -118, -86, -52, -20].map((a, j) => (
              <path key={j} d={frond(x, y + 6, 46 + ((i * 7 + j) % 20), a)} />
            ))}
          </g>
        )
      })}
    </g>
  )
}

function Loungers({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      {[0.12, 0.24, 0.74, 0.86].map((t, i) => (
        <g key={i} transform={`translate(${w * t} ${y})`}>
          <path d="M -30 0 l 6 -15 l 40 0 l -5 15 z" />
          <path d="M 10 -15 l 16 -22 l 7 3 l -13 19 z" />
        </g>
      ))}
    </g>
  )
}

function Causeway({ y, w, h, ink, lit }: {
  y: number; w: number; h: number; ink: string; lit: string
}) {
  return (
    <g>
      <path fill={ink} d={`M ${w + 20} ${h} L ${w * 0.56} ${y} L ${w * 0.62} ${y}
        L ${w + 20} ${h - 60} Z`} />
      {Array.from({ length: 12 }, (_, i) => {
        const t = i / 11
        const x = w * (0.6 + t * 0.44)
        const yy = y + (h - y) * (t * t)
        const s = 0.3 + t * 0.9
        return (
          <g key={i}>
            <rect x={x} y={yy - 62 * s} width={4 * s} height={62 * s} fill={ink} />
            <circle cx={x + 2 * s} cy={yy - 64 * s} r={5 * s} fill={lit} />
            <circle cx={x + 2 * s} cy={yy - 64 * s} r={14 * s} fill={lit} opacity=".2" />
          </g>
        )
      })}
    </g>
  )
}

/** Wet asphalt: the real ground plane, and the thing that doubles the neon. */
function WetGround({ y, w, h, gold }: {
  y: number; w: number; h: number; gold: string
}) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill="#2a1430" opacity=".72" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={w * (0.1 + (i % 3) * 0.24)} y={y + 24 + i * 44}
          width={w * (0.18 + (i % 4) * 0.12)} height={4} rx="2"
          fill={gold} opacity={0.3 - i * 0.028} />
      ))}
    </g>
  )
}

/** A vertical neon blade sign, mounted off the corner bay. */
function Blade({ x, y, h, neon }: {
  x: number; y: number; h: number; neon: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={h * 0.17} height={h} rx={h * 0.03}
        fill="#160a1e" opacity=".9" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={x + h * 0.045} y={y + h * (0.08 + i * 0.17)}
          width={h * 0.08} height={h * 0.09} rx={h * 0.015} fill={neon} />
      ))}
      <rect x={x - h * 0.03} y={y} width={h * 0.23} height={h} rx={h * 0.03}
        fill={neon} opacity=".14" />
    </g>
  )
}
