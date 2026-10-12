/**
 * The boardwalk at dusk.
 *
 * Reading was the weakest of the six because it was a generic ridgeline in
 * warm colours, and the world is not a landscape at all - it is a BUILT
 * place. Everything that makes a boardwalk read is architecture:
 *
 *   PLANKS RECEDING   the single strongest device. Boards converging to a
 *                     vanishing point put the viewer ON the boardwalk rather
 *                     than looking at a picture of one, and no amount of sky
 *                     does that job.
 *   THE WHEEL         lit, offset, and large enough to break the skyline.
 *                     Its spokes against a sunset are the silhouette the
 *                     whole subject is known by.
 *   THE PIER          pilings marching out over water, getting smaller and
 *                     hazier, ending in a lit pavilion.
 *
 * The electric light is the brightest value in the frame and it sits in the
 * MIDGROUND, which inverts the usual "distance is brightest" rule. That
 * inversion is the hour: warm windows and bulbs winning against a sky that
 * has already gone violet.
 */

export interface Deck {
  /** Where the boardwalk's far edge sits. */
  horizon: number
  /** Bottom of frame. */
  bottom: number
  width: number
  /** Vanishing point, as a fraction across. */
  vp: number
}

/**
 * The deck: boards converging on a vanishing point, plus the rail.
 *
 * Board spacing follows a square law, so they crowd toward the horizon the
 * way real perspective does. Even spacing reads as a ladder lying down.
 */
export function Boards({
  deck, plank, gap, rail, lit,
}: {
  deck: Deck
  plank: string
  gap: string
  rail: string
  lit: string
}) {
  const { horizon, bottom, width, vp } = deck
  const vx = width * vp
  const depth = bottom - horizon

  // Cross-boards: horizontal lines getting closer together with distance.
  const rows: number[] = []
  for (let i = 1; i <= 26; i++) {
    rows.push(bottom - depth * (1 - (i / 27) ** 2.1))
  }

  // Edge rails converge on the vanishing point.
  const leftOut = -width * 0.35
  const rightOut = width * 1.35

  return (
    <g>
      <path d={`M ${leftOut} ${bottom} L ${vx - width * 0.055} ${horizon}
                L ${vx + width * 0.055} ${horizon} L ${rightOut} ${bottom} Z`}
        fill={plank} />
      {rows.map((y, i) => {
        const t = (y - horizon) / depth
        const halfLeft = (vx - width * 0.055) + (leftOut - (vx - width * 0.055)) * t
        const halfRight = (vx + width * 0.055) + (rightOut - (vx + width * 0.055)) * t
        return (
          <line key={i} x1={halfLeft} y1={y} x2={halfRight} y2={y}
            stroke={gap} strokeWidth={0.6 + t * 2.6} opacity={0.3 + t * 0.4} />
        )
      })}
      {/* Running boards, a few long lines converging - the thing that makes
          the deck read as planks rather than as a painted ramp. */}
      {[-0.3, -0.15, 0.15, 0.3].map((o, i) => (
        <line key={i} x1={vx + width * o * 0.1} y1={horizon}
          x2={vx + width * o * 2.6} y2={bottom}
          stroke={gap} strokeWidth="1.4" opacity=".3" />
      ))}

      {/* Rail posts, shrinking with distance, with a lamp on every third. */}
      {POSTS.map((t, i) => {
        const y = bottom - depth * (1 - t ** 2.1)
        const scale = 1 - t * 0.86
        const h = depth * 0.3 * scale
        const edge = (side: number) => {
          const far = vx + side * width * 0.055
          const near = side < 0 ? leftOut : rightOut
          const tt = (y - horizon) / depth
          return far + (near - far) * tt
        }
        return [-1, 1].map((side) => (
          <g key={`${i}${side}`}>
            <rect x={edge(side) - 3 * scale} y={y - h}
              width={6 * scale} height={h} fill={rail} />
            {i % 3 === 0 && (
              <>
                <rect x={edge(side) - 2 * scale} y={y - h * 1.9}
                  width={4 * scale} height={h * 0.9} fill={rail} />
                <circle cx={edge(side)} cy={y - h * 1.95} r={7 * scale} fill={lit} />
                <circle cx={edge(side)} cy={y - h * 1.95} r={16 * scale}
                  fill={lit} opacity=".25" />
              </>
            )}
          </g>
        ))
      })}
    </g>
  )
}

const POSTS = [0.08, 0.17, 0.27, 0.38, 0.5, 0.63, 0.78, 0.95]

/** The wheel: rim, spokes, and a lit car at every spoke end. */
export function Wheel({
  x, y, r, frame, lit,
}: {
  x: number; y: number; r: number; frame: string; lit: string
}) {
  const spokes = 18
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M ${-r * 0.5} ${r * 1.08} L 0 0 L ${r * 0.5} ${r * 1.08}`}
        fill="none" stroke={frame} strokeWidth={r * 0.07} />
      <circle r={r} fill="none" stroke={frame} strokeWidth={r * 0.045} />
      <circle r={r * 0.58} fill="none" stroke={frame} strokeWidth={r * 0.026}
        opacity=".7" />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2
        const cx = Math.cos(a) * r
        const cy = Math.sin(a) * r
        return (
          <g key={i}>
            <line x1="0" y1="0" x2={cx} y2={cy} stroke={frame}
              strokeWidth={r * 0.02} opacity=".85" />
            <circle cx={cx} cy={cy} r={r * 0.055} fill={lit} />
            <circle cx={cx} cy={cy} r={r * 0.13} fill={lit} opacity=".3" />
          </g>
        )
      })}
      <circle r={r * 0.08} fill={frame} />
    </g>
  )
}

/**
 * A pier: pilings marching out over the water to a lit pavilion.
 *
 * The pilings shrink and crowd exactly like the deck boards, which is what
 * ties the two together as one place rather than two drawings.
 */
export function Pier({
  x, y, len, deep, post, lit,
}: {
  x: number; y: number; len: number; deep: number; post: string; lit: string
}) {
  const n = 14
  return (
    <g>
      <rect x={x} y={y - 6} width={len} height={9} fill={post} />
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1)
        const px = x + len * (t ** 1.5)
        const h = deep * (1 - t * 0.55)
        return (
          <rect key={i} x={px} y={y} width={4 + (1 - t) * 3} height={h}
            fill={post} opacity={0.9 - t * 0.3} />
        )
      })}
      {/* The pavilion at the end: a hipped roof and a row of lit windows. */}
      <g transform={`translate(${x + len - 54} ${y - 46})`}>
        <path d="M -8 10 L 27 -16 L 62 10 Z" fill={post} />
        <rect x="0" y="10" width="54" height="36" fill={post} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={6 + i * 12} y={18} width={7} height={16} fill={lit} />
        ))}
      </g>
    </g>
  )
}

/**
 * A beaux-arts colonnade: a rhythm of light verticals against dark gaps.
 *
 * The gaps are the drawing. A row of columns rendered as pale rectangles on
 * a pale wall reads as a fence; the same row read as dark intervals between
 * lit stone reads as a building you could walk into.
 */
export function Colonnade({
  x, y, w, h, n, stone, dark, lit,
}: {
  x: number; y: number; w: number; h: number; n: number
  stone: string; dark: string; lit: string
}) {
  const gap = w / n
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={dark} />
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * gap + gap * 0.22} y={y - h * 0.86}
          width={gap * 0.4} height={h * 0.86} fill={stone} />
      ))}
      {/* Entablature and stylobate: the two horizontals that say "classical"
          louder than any column ever does. */}
      <rect x={x - 6} y={y - h} width={w + 12} height={h * 0.14} fill={stone} />
      <rect x={x - 10} y={y - 7} width={w + 20} height={9} fill={stone} />
      {/* The lamp string following the cornice. Beads, not a glow. */}
      {Array.from({ length: n * 2 }, (_, i) => (
        <g key={i}>
          <circle cx={x + (i + 0.5) * (w / (n * 2))} cy={y - h + 3} r="2.6" fill={lit} />
          <circle cx={x + (i + 0.5) * (w / (n * 2))} cy={y - h + 3} r="7"
            fill={lit} opacity=".22" />
        </g>
      ))}
    </g>
  )
}

/** The campanile: slender, off-axis, with an open belfry near the top. */
export function Campanile({
  x, y, h, stone, lit,
}: {
  x: number; y: number; h: number; stone: string; lit: string
}) {
  const w = h / 9
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={stone} />
      <rect x={x - w * 0.22} y={y - h * 0.3} width={w * 1.44} height={6} fill={stone} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + w * 0.2} y={y - h * 0.26 + i * (h * 0.07)}
          width={w * 0.6} height={h * 0.04} fill={lit} opacity=".9" />
      ))}
      <path d={`M ${x - w * 0.3} ${y - h} L ${x + w / 2} ${y - h - w * 1.2}
                L ${x + w * 1.3} ${y - h} Z`} fill={stone} />
      <circle cx={x + w / 2} cy={y - h - w * 1.5} r={w * 0.2} fill={lit} />
    </g>
  )
}

/** A dome on a drum, with meridian ribs and a lantern. Never a semicircle. */
export function Dome({
  x, y, r, stone, gold, lit,
}: {
  x: number; y: number; r: number; stone: string; gold: string; lit: string
}) {
  return (
    <g>
      <rect x={x - r * 0.92} y={y - r * 0.5} width={r * 1.84} height={r * 0.5}
        fill={stone} />
      <path d={`M ${x - r} ${y - r * 0.5} a ${r} ${r * 1.08} 0 0 1 ${r * 2} 0 Z`}
        fill={stone} />
      {[-0.62, -0.3, 0, 0.3, 0.62].map((t, i) => (
        <path key={i} d={`M ${x + r * t} ${y - r * 0.5}
          q ${-r * t * 0.5} ${-r * 0.8} 0 ${-r * 0.98}`}
          fill="none" stroke={gold} strokeWidth="1.6" opacity=".7" />
      ))}
      <rect x={x - r * 0.16} y={y - r * 1.74} width={r * 0.32} height={r * 0.3}
        rx={r * 0.08} fill={stone} />
      <circle cx={x} cy={y - r * 1.86} r={r * 0.09} fill={lit} />
      {/* Lamps following the drum cornice. */}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={x - r * 0.82 + i * (r * 0.205)} cy={y - r * 0.52}
          r="2.4" fill={lit} />
      ))}
    </g>
  )
}

/** The lattice tower, stepping in twice, standing in water. */
export function Tower({
  x, y, h, frame, lit,
}: {
  x: number; y: number; h: number; frame: string; lit: string
}) {
  const base = h / 6
  const at = (t: number) => base * (1 - t * 0.78) / 2
  const pt = (t: number, side: number) => `${x + side * at(t)} ${y - h * t}`
  return (
    <g>
      <path d={`M ${pt(0, -1)} L ${pt(1, -1)} L ${pt(1, 1)} L ${pt(0, 1)} Z`}
        fill="none" stroke={frame} strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = i / 9
        const t2 = (i + 1) / 9
        return (
          <g key={i} stroke={frame} strokeWidth="1.5" opacity=".8">
            <line x1={x - at(t)} y1={y - h * t} x2={x + at(t2)} y2={y - h * t2} />
            <line x1={x + at(t)} y1={y - h * t} x2={x - at(t2)} y2={y - h * t2} />
            <line x1={x - at(t2)} y1={y - h * t2} x2={x + at(t2)} y2={y - h * t2} />
          </g>
        )
      })}
      {Array.from({ length: 14 }, (_, i) => {
        const t = i / 13
        return <circle key={i} cx={x} cy={y - h * t} r="2.4" fill={lit} />
      })}
      <circle cx={x} cy={y - h - 14} r="12" fill="none" stroke={frame} strokeWidth="2" />
      <circle cx={x} cy={y - h - 14} r="5" fill={lit} />
    </g>
  )
}

/** An octagonal bandstand with bulbs round the fascia. */
export function Bandstand({
  x, y, w, stone, lit,
}: {
  x: number; y: number; w: number; stone: string; lit: string
}) {
  const h = w * 0.78
  return (
    <g>
      <rect x={x - w / 2} y={y - 8} width={w} height={11} fill={stone} />
      {[-0.44, -0.22, 0, 0.22, 0.44].map((t, i) => (
        <rect key={i} x={x + w * t - 3} y={y - h * 0.62} width={6}
          height={h * 0.62} fill={stone} />
      ))}
      <path d={`M ${x - w * 0.6} ${y - h * 0.62}
                Q ${x} ${y - h * 1.26} ${x + w * 0.6} ${y - h * 0.62} Z`}
        fill={stone} />
      <circle cx={x} cy={y - h * 1.3} r={w * 0.045} fill={lit} />
      {Array.from({ length: 11 }, (_, i) => (
        <circle key={i} cx={x - w * 0.56 + i * (w * 0.112)} cy={y - h * 0.6}
          r="2.6" fill={lit} />
      ))}
    </g>
  )
}

/** The carousel: a bright ring under a dark canopy of bulbs. */
export function Carousel({
  x, y, w, stone, lit, dark,
}: {
  x: number; y: number; w: number; stone: string; lit: string; dark: string
}) {
  const h = w * 0.62
  return (
    <g>
      <ellipse cx={x} cy={y} rx={w / 2} ry={w * 0.1} fill={dark} />
      <rect x={x - w / 2} y={y - h * 0.72} width={w} height={h * 0.72} fill={lit}
        opacity=".85" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={x - w * 0.46 + i * (w * 0.105)} y={y - h * 0.72}
          width={w * 0.02} height={h * 0.72} fill={dark} opacity=".8" />
      ))}
      <path d={`M ${x - w * 0.58} ${y - h * 0.72}
                Q ${x} ${y - h * 1.38} ${x + w * 0.58} ${y - h * 0.72} Z`}
        fill={stone} />
      {Array.from({ length: 13 }, (_, i) => (
        <circle key={i} cx={x - w * 0.55 + i * (w * 0.092)} cy={y - h * 0.7}
          r="2.4" fill={lit} />
      ))}
      <rect x={x - w * 0.02} y={y - h * 1.3} width={w * 0.04} height={h * 0.6}
        fill={stone} />
    </g>
  )
}

/** A triumphal arch, interrupting a colonnade off-centre. */
export function Arch({
  x, y, w, h, stone, dark, lit,
}: {
  x: number; y: number; w: number; h: number
  stone: string; dark: string; lit: string
}) {
  const o = w * 0.3
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill={stone} />
      <path d={`M ${x + w / 2 - o} ${y} L ${x + w / 2 - o} ${y - h * 0.5}
                a ${o} ${o} 0 0 1 ${o * 2} 0 L ${x + w / 2 + o} ${y} Z`}
        fill={dark} />
      <rect x={x - 8} y={y - h} width={w + 16} height={h * 0.13} fill={stone} />
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={x + 10 + i * ((w - 20) / 9)} cy={y - h + 4}
          r="2.6" fill={lit} />
      ))}
      {/* Light pouring out of the opening - the reason to draw an arch. */}
      <path d={`M ${x + w / 2 - o * 0.8} ${y} L ${x + w / 2 - o * 0.8} ${y - h * 0.46}
                a ${o * 0.8} ${o * 0.8} 0 0 1 ${o * 1.6} 0 L ${x + w / 2 + o * 0.8} ${y} Z`}
        fill={lit} opacity=".75" />
    </g>
  )
}
