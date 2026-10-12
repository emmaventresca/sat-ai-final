import { WORLDS } from './art'

/**
 * Ten places in canyon country.
 *
 * The rule this world lives or dies by: **red rock shadow is warm maroon,
 * never grey.** Rock bounces its own light back into its own shadows, and a
 * grey shadow on red rock is the fastest "cheap clip art" tell there is.
 * Every form here gets three values - a lit face, a core shadow, and a
 * reflected bounce - because two values is a cut-out.
 *
 * The other non-negotiable is the mesa's flat top. The instant a top edge
 * curves it stops being geology and becomes a hill.
 */
export function ParkScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.park
  const lit = p.mid[0]
  const core = p.mid[1]
  const bounce = p.near[0]
  const far = p.far[0]
  const ink = p.frame
  const gold = p.sunCore
  const rim = p.rim
  const pool = '#36c9c0'
  const green = '#1e6b4f'

  switch (v % 10) {
    // 1. Slot canyon: two mirrored S-curve walls, one blazing slit above.
    case 0:
      return <Slot y={y} w={W} h={H} lit={lit} core={core} bounce={bounce} gold={gold} />

    // 2. Sequoia grove: colossal trunks cropped by the frame, light shafts.
    case 1:
      return (
        <>
          <Mesa x={W * 0.3} y={y} w={W * 0.5} h={H * 0.2}
            lit={far} core={core} bounce={bounce} rim={rim} />
          <Sequoia x={W * 0.1} y={y + H * 0.2} w={W * 0.11} ink={ink} />
          <Sequoia x={W * 0.78} y={y + H * 0.2} w={W * 0.09} ink={ink} />
          <Ferns y={y + H * 0.12} w={W} green={green} ink={ink} />
        </>
      )

    // 3. Geyser basin: terraced rings and columns of lit steam.
    case 2:
      return (
        <>
          <Terraces y={y} w={W} h={H} warm="#e8d36a" pool={pool} ink={core} />
          {[0.22, 0.42, 0.58, 0.76].map((t, i) => (
            <Plume key={i} x={W * t} y={y - H * 0.02} h={H * (0.2 + (i % 3) * 0.08)} />
          ))}
        </>
      )

    // 4. Alpine lake with a perfect inverted reflection.
    case 3:
      return (
        <>
          <Mesa x={W * 0.14} y={y} w={W * 0.34} h={H * 0.28}
            lit={lit} core={core} bounce={bounce} rim={rim} />
          <Mesa x={W * 0.56} y={y} w={W * 0.4} h={H * 0.22}
            lit={far} core={core} bounce={bounce} rim={rim} />
          <Lake y={y} w={W} h={H} tint={pool} />
          <Pines y={y + H * 0.02} w={W} ink={ink} />
        </>
      )

    // 5. Hoodoo amphitheatre: a bowl crowded with spires into blue haze.
    case 4:
      return <Hoodoos y={y} w={W} h={H} lit={lit} core={core} far={far} rim={rim} />

    // 6. A waterfall into the canyon, mist and a turquoise plunge pool.
    case 5:
      return (
        <>
          <Mesa x={W * 0.42} y={y} w={W * 0.56} h={H * 0.4}
            lit={lit} core={core} bounce={bounce} rim={rim} />
          <Mesa x={-W * 0.08} y={y} w={W * 0.4} h={H * 0.34}
            lit={core} core={core} bounce={bounce} rim={rim} />
          <Waterfall x={W * 0.4} y={y - H * 0.32} h={H * 0.36} pool={pool} />
        </>
      )

    // 7. The rim overlook: layered canyon dropping away in mauve planes.
    case 6:
      return (
        <>
          {[0.46, 0.34, 0.22].map((t, i) => (
            <Layer key={i} y={y - H * t} w={W} h={H}
              fill={i === 0 ? far : i === 1 ? lit : core}
              opacity={0.6 + i * 0.2} seed={v + i} />
          ))}
          <Juniper x={W * 0.14} y={y + H * 0.08} h={H * 0.16} ink={ink} />
          <Ledge y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 8. A glacier-carved valley: U-profile, braided river, ribbon falls.
    case 7:
      return (
        <>
          <Valley y={y} w={W} h={H} lit={far} core={core} />
          <Waterfall x={W * 0.2} y={y - H * 0.24} h={H * 0.26} pool={pool} />
          <River y={y + H * 0.08} w={W} h={H} tint={pool} />
        </>
      )

    // 9. A natural arch, framing a second landscape through its window.
    case 8:
      return (
        <>
          <Layer y={y - H * 0.16} w={W} h={H} fill={far} opacity={0.7} seed={v} />
          <ArchRock x={W * 0.24} y={y + H * 0.06} w={W * 0.5} h={H * 0.46}
            lit={core} core={ink} rim={rim} />
        </>
      )

    // 10. A thermal pool close up: concentric mat bands, steam skimming.
    default:
      return (
        <>
          <Terraces y={y - H * 0.04} w={W} h={H} warm="#e8d36a" pool={pool} ink={core} />
          <Boardwalk y={y + H * 0.2} w={W} ink={ink} />
        </>
      )
  }
}

// ---------------------------------------------------------------------------

/** Flat top, sheer sides with a slight outward batter, talus skirt at the base. */
function Mesa({ x, y, w, h, lit, core, bounce, rim }: {
  x: number; y: number; w: number; h: number
  lit: string; core: string; bounce: string; rim: string
}) {
  const batter = w * 0.04
  const top = y - h
  return (
    <g>
      <path fill={lit} d={`M ${x - batter} ${y} L ${x} ${top}
        L ${x + w} ${top} L ${x + w + batter} ${y} Z`} />
      {/* Core shadow on the left third, then the reflected bounce under it. */}
      <path fill={core} d={`M ${x - batter} ${y} L ${x} ${top}
        L ${x + w * 0.3} ${top} L ${x + w * 0.28} ${y} Z`} />
      <path fill={bounce} opacity=".45" d={`M ${x - batter} ${y}
        L ${x - batter * 0.6} ${y - h * 0.22} L ${x + w * 0.28} ${y - h * 0.18}
        L ${x + w * 0.28} ${y} Z`} />
      {/* The rim catches the sun; the cap edge is the only hard line. */}
      <rect x={x} y={top} width={w} height={h * 0.035} fill={rim} opacity=".8" />
      {/* Strata, parallel to the cap. */}
      {[0.3, 0.46, 0.62].map((t, i) => (
        <rect key={i} x={x + w * 0.02} y={top + h * t} width={w * 0.96}
          height={h * 0.018} fill={core} opacity=".35" />
      ))}
      {/* Talus: a concave-up skirt of debris over the lower third. */}
      <path fill={core} opacity=".8" d={`M ${x - batter * 2.4} ${y}
        Q ${x + w * 0.5} ${y - h * 0.3} ${x + w + batter * 2.4} ${y} Z`} />
    </g>
  )
}

function Slot({ w, h, lit, core, bounce, gold }: {
  y: number; w: number; h: number
  lit: string; core: string; bounce: string; gold: string
}) {
  return (
    <g>
      <rect x="0" y="0" width={w} height={h} fill={core} />
      {/* Two opposing S-curves, mirrored but not identical. */}
      <path fill={lit} d={`M -20 ${h} L -20 0
        C ${w * 0.3} ${h * 0.2}, ${w * 0.16} ${h * 0.5}, ${w * 0.4} ${h}
        Z`} />
      <path fill={bounce} d={`M ${w + 20} ${h} L ${w + 20} 0
        C ${w * 0.64} ${h * 0.24}, ${w * 0.82} ${h * 0.56}, ${w * 0.58} ${h}
        Z`} />
      {/* Cross-bedding follows the curve of the wall it is on. */}
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 1) / 10
        return (
          <path key={i} fill="none" stroke={core} strokeWidth="2.6" opacity=".3"
            d={`M -20 ${h * t} C ${w * 0.28} ${h * (t + 0.14)},
                ${w * 0.14} ${h * (t + 0.4)}, ${w * 0.36} ${h}`} />
        )
      })}
      {/* The one shaft that reaches the floor. */}
      <path fill={gold} opacity=".32" d={`M ${w * 0.46} 0 L ${w * 0.54} 0
        L ${w * 0.62} ${h} L ${w * 0.4} ${h} Z`} />
      <ellipse cx={w * 0.51} cy={h * 0.94} rx={w * 0.12} ry={h * 0.03}
        fill={gold} opacity=".5" />
    </g>
  )
}

/** A sequoia trunk: barely tapering, buttressed foot, crown off the top. */
function Sequoia({ x, y, w, ink }: {
  x: number; y: number; w: number; ink: string
}) {
  return (
    <g fill={ink}>
      <path d={`M ${x} ${y} L ${x + w * 0.1} ${-40}
        L ${x + w * 0.88} ${-40} L ${x + w} ${y}
        q ${-w * 0.2} ${-14} ${-w * 0.36} 0
        q ${-w * 0.16} ${-16} ${-w * 0.3} 0 Z`} />
      {/* Fluted bark: long vertical channels, never horizontal rings. */}
      {[0.22, 0.4, 0.58, 0.76].map((t, i) => (
        <rect key={i} x={x + w * t} y={-40} width={w * 0.035} height={y + 40}
          fill="#000" opacity=".22" />
      ))}
    </g>
  )
}

function Ferns({ y, w, green, ink }: {
  y: number; w: number; green: string; ink: string
}) {
  return (
    <g>
      <path fill={green} opacity=".65" d={`M -20 ${y + 400} L -20 ${y}
        Q ${w * 0.3} ${y - 28} ${w * 0.6} ${y + 10}
        Q ${w * 0.84} ${y + 34} ${w + 20} ${y - 4} L ${w + 20} ${y + 400} Z`} />
      <path fill={ink} d={`M -20 ${y + 400} L -20 ${y + 40}
        Q ${w * 0.34} ${y + 14} ${w * 0.66} ${y + 48}
        Q ${w * 0.88} ${y + 70} ${w + 20} ${y + 36} L ${w + 20} ${y + 400} Z`} />
    </g>
  )
}

function Terraces({ y, w, h, warm, pool, ink }: {
  y: number; w: number; h: number; warm: string; pool: string; ink: string
}) {
  return (
    <g>
      {Array.from({ length: 7 }, (_, i) => {
        const t = i / 6
        const ry = 16 + t * 42
        const rx = w * (0.2 + t * 0.44)
        return (
          <ellipse key={i} cx={w * 0.5} cy={y + h * 0.1 + t * h * 0.5}
            rx={rx} ry={ry}
            fill={i % 2 ? warm : pool} opacity={0.42 + t * 0.2} />
        )
      })}
      <path fill={ink} opacity=".5" d={`M -20 ${y + h} L -20 ${y + h * 0.06}
        Q ${w * 0.5} ${y - h * 0.04} ${w + 20} ${y + h * 0.06} L ${w + 20} ${y + h} Z`} />
    </g>
  )
}

/** Narrow stem, 25-degree flare, dissolving at the top. Not a white blob. */
function Plume({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} fill="#f2f6f5" opacity={0.3 - i * 0.08}
          d={`M ${x - 9 - i * 3} ${y} Q ${x - 28 - i * 12} ${y - h * 0.6}
              ${x - 40 - i * 18} ${y - h}
              L ${x + 40 + i * 18} ${y - h} Q ${x + 28 + i * 12} ${y - h * 0.6}
              ${x + 9 + i * 3} ${y} Z`} />
      ))}
    </g>
  )
}

function Lake({ y, w, h, tint }: {
  y: number; w: number; h: number; tint: string
}) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill={tint} opacity=".42" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={w * (0.06 + (i % 3) * 0.2)} y={y + 30 + i * 48}
          width={w * (0.3 + (i % 4) * 0.12)} height={3} rx="1.5"
          fill="#fff" opacity={0.28 - i * 0.035} />
      ))}
    </g>
  )
}

function Pines({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      {Array.from({ length: 11 }, (_, i) => {
        const x = ((i * 191) % 1000) / 1000 * w * 0.4
        const h = 50 + ((i * 43) % 70)
        return <path key={i} d={fir(x, y + 6, h, h * 0.24)} />
      })}
    </g>
  )
}

function fir(x: number, base: number, h: number, w: number): string {
  const out = [`M ${x} ${base - h}`]
  for (let i = 1; i <= 4; i++) {
    const t = i / 4
    const y = base - h + h * t
    out.push(`L ${x + w * t * 0.8} ${y - h * 0.07} L ${x + w * t * 0.5} ${y}`)
  }
  out.push(`L ${x + w * 0.11} ${base} L ${x - w * 0.11} ${base}`)
  for (let i = 4; i >= 1; i--) {
    const t = i / 4
    const y = base - h + h * t
    out.push(`L ${x - w * t * 0.5} ${y} L ${x - w * t * 0.8} ${y - h * 0.07}`)
  }
  return `${out.join(' ')} Z`
}

/** Stacked drums of alternating diameter, caprock wider than the neck. */
function Hoodoos({ y, w, h, lit, core, far, rim }: {
  y: number; w: number; h: number
  lit: string; core: string; far: string; rim: string
}) {
  return (
    <g>
      <path fill={far} opacity=".6" d={`M -20 ${y + h} L -20 ${y - h * 0.1}
        Q ${w * 0.5} ${y - h * 0.3} ${w + 20} ${y - h * 0.1} L ${w + 20} ${y + h} Z`} />
      {Array.from({ length: 26 }, (_, i) => {
        const x = ((i * 157) % 1000) / 1000 * w
        const depth = ((i * 67) % 100) / 100
        const hh = h * (0.1 + depth * 0.26)
        const base = y + h * 0.04 + depth * h * 0.14
        const drums = 3 + (i % 3)
        const fill = depth > 0.6 ? lit : depth > 0.3 ? core : far
        return (
          <g key={i} opacity={0.55 + depth * 0.45}>
            {Array.from({ length: drums }, (_, d) => {
              const t = d / drums
              const dw = hh * (0.17 - (d % 2) * 0.05)
              return (
                <rect key={d} x={x - dw} y={base - hh * (t + 1 / drums)}
                  width={dw * 2} height={hh / drums + 1} fill={fill} />
              )
            })}
            <rect x={x - hh * 0.2} y={base - hh - hh * 0.07}
              width={hh * 0.4} height={hh * 0.08} fill={rim} opacity=".85" />
          </g>
        )
      })}
    </g>
  )
}

function Waterfall({ x, y, h, pool }: {
  x: number; y: number; h: number; pool: string
}) {
  return (
    <g>
      <path fill="#eaf6ff" opacity=".88"
        d={`M ${x} ${y} q -7 ${h * 0.5} -3 ${h} l 20 0 q 4 ${-h * 0.5} -2 ${-h} z`} />
      <ellipse cx={x + 8} cy={y + h} rx="44" ry="13" fill={pool} opacity=".6" />
      <ellipse cx={x + 8} cy={y + h} rx="76" ry="22" fill="#eaf6ff" opacity=".2" />
    </g>
  )
}

function Layer({ y, w, h, fill, opacity, seed }: {
  y: number; w: number; h: number; fill: string; opacity: number; seed: number
}) {
  const pts: string[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    pts.push(`L ${w * t} ${y - ((seed * 17 + i * 53) % 60)}`)
  }
  return (
    <path fill={fill} opacity={opacity}
      d={`M -20 ${y + h} L -20 ${y} ${pts.join(' ')} L ${w + 20} ${y}
          L ${w + 20} ${y + h} Z`} />
  )
}

function Juniper({ x, y, h, ink }: {
  x: number; y: number; h: number; ink: string
}) {
  return (
    <g fill={ink}>
      <path d={`M ${x} ${y} q ${h * 0.1} ${-h * 0.5} ${-h * 0.06} ${-h}
        l ${h * 0.12} 0 q ${h * 0.06} ${h * 0.5} ${h * 0.04} ${h} z`} />
      <ellipse cx={x - h * 0.1} cy={y - h * 0.94} rx={h * 0.3} ry={h * 0.17} />
      <ellipse cx={x + h * 0.22} cy={y - h * 0.78} rx={h * 0.22} ry={h * 0.13} />
    </g>
  )
}

function Ledge({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <path fill={ink} d={`M -20 ${y + 500} L -20 ${y}
      Q ${w * 0.24} ${y - 26} ${w * 0.5} ${y + 14}
      Q ${w * 0.76} ${y + 52} ${w + 20} ${y + 4} L ${w + 20} ${y + 500} Z`} />
  )
}

function Valley({ y, w, h, lit, core }: {
  y: number; w: number; h: number; lit: string; core: string
}) {
  return (
    <g>
      <path fill={lit} d={`M -20 ${y - h * 0.5} L -20 ${y + h}
        L ${w * 0.34} ${y + h} Q ${w * 0.3} ${y - h * 0.1} ${w * 0.12} ${y - h * 0.5} Z`} />
      <path fill={core} d={`M ${w + 20} ${y - h * 0.46} L ${w + 20} ${y + h}
        L ${w * 0.66} ${y + h} Q ${w * 0.7} ${y - h * 0.08} ${w * 0.88} ${y - h * 0.46} Z`} />
    </g>
  )
}

function River({ y, w, h, tint }: {
  y: number; w: number; h: number; tint: string
}) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} fill={tint} opacity={0.3 + i * 0.1}
          d={`M ${w * (0.44 + i * 0.03)} ${y} Q ${w * (0.5 - i * 0.05)} ${y + h * 0.3}
              ${w * (0.38 + i * 0.07)} ${y + h} L ${w * (0.52 + i * 0.05)} ${y + h}
              Q ${w * (0.58 - i * 0.03)} ${y + h * 0.3} ${w * (0.5 + i * 0.02)} ${y} Z`} />
      ))}
    </g>
  )
}

function ArchRock({ x, y, w, h, lit, core, rim }: {
  x: number; y: number; w: number; h: number
  lit: string; core: string; rim: string
}) {
  const o = w * 0.3
  return (
    <g>
      <path fill={lit} d={`M ${x} ${y} L ${x} ${y - h}
        Q ${x + w * 0.5} ${y - h * 1.26} ${x + w} ${y - h} L ${x + w} ${y}
        L ${x + w * 0.5 + o} ${y}
        Q ${x + w * 0.5 + o} ${y - h * 0.56} ${x + w * 0.5} ${y - h * 0.56}
        Q ${x + w * 0.5 - o} ${y - h * 0.56} ${x + w * 0.5 - o} ${y} Z`} />
      <path fill={core} opacity=".55" d={`M ${x} ${y} L ${x} ${y - h}
        Q ${x + w * 0.2} ${y - h * 1.1} ${x + w * 0.3} ${y - h * 1.04}
        L ${x + w * 0.3} ${y} Z`} />
      <path fill="none" stroke={rim} strokeWidth="3" opacity=".7"
        d={`M ${x} ${y - h} Q ${x + w * 0.5} ${y - h * 1.26} ${x + w} ${y - h}`} />
    </g>
  )
}

function Boardwalk({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      <path d={`M -20 ${y + 300} L -20 ${y + 40} L ${w * 0.46} ${y}
        L ${w * 0.52} ${y + 8} L ${w * 0.06} ${y + 300} Z`} />
      {Array.from({ length: 12 }, (_, i) => {
        const t = i / 11
        return (
          <rect key={i} x={-20 + w * 0.46 * (t * t)} y={y + 40 - 40 * (t * t)}
            width={w * 0.1 * (1 - t * 0.7)} height={4} opacity=".5" />
        )
      })}
    </g>
  )
}
