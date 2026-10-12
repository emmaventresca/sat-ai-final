/**
 * Why every version of this looked like blocks.
 *
 * Flat vector polygons cannot read as painted art, and no amount of palette
 * work fixes that - the failure is in the EDGES. A real landscape painting
 * has three things a polygon stack does not:
 *
 *   SOFT EDGES    nothing in nature has a 1px mathematical boundary. Edges
 *                 break up, feather, and dissolve into the air in front of
 *                 them.
 *   HAZE          distance is not just "darker". Air scatters light, so far
 *                 things lose contrast AND shift toward the sky's own colour.
 *                 A ridge that is merely a darker version of the ridge
 *                 behind it reads as a cut-out; one that is also hazier
 *                 reads as miles away.
 *   DETAIL        a ridgeline is a thousand trees, not a five-point polygon.
 *                 The eye reads the texture long before it reads the shape.
 *
 * All three are reachable in SVG. `feTurbulence` + `feDisplacementMap` makes
 * an edge organic instead of geometric; `feGaussianBlur` scaled by depth does
 * atmospheric falloff; and a tree line drawn as sixty small irregular firs
 * costs nothing and does more than any gradient.
 */

/** Per-depth treatment. Far things are blurrier, hazier, lower contrast. */
export interface Depth {
  /** 0 = nearest, 1 = furthest. */
  t: number
}

export function atmosphereDefs(id: string, skyHaze: string) {
  return (
    <>
      {/* Organic edges. The scale is deliberately small: enough to stop a
          ridge reading as a polygon, not so much that it turns to soup. */}
      {[0, 1, 2].map((i) => (
        <filter key={i} id={`org${id}${i}`} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency={0.011 + i * 0.006}
            numOctaves="4" seed={7 + i * 13} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n"
            scale={16 - i * 4} xChannelSelector="R" yChannelSelector="G"
            result="d" />
          <feGaussianBlur in="d" stdDeviation={3.4 - i * 1.1} />
        </filter>
      ))}

      {/* Cloud: turbulence shaped into soft wisps rather than drawn. This is
          the one thing that reads as "painted" from across a room. */}
      <filter id={`wisp${id}`} x="-30%" y="-80%" width="160%" height="260%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.022"
          numOctaves="5" seed="23" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="78"
          xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="13" />
      </filter>

      <filter id={`soft${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>

      {/* Haze: the sky's own colour laid back over the land, strongest at the
          horizon. This is atmospheric perspective, and it is what turns a
          stack of silhouettes into distance. */}
      <linearGradient id={`haze${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={skyHaze} stopOpacity=".62" />
        <stop offset="55%" stopColor={skyHaze} stopOpacity=".2" />
        <stop offset="100%" stopColor={skyHaze} stopOpacity="0" />
      </linearGradient>
    </>
  )
}

/**
 * A ridgeline with trees on it, as one path.
 *
 * Sixty small firs along a wandering baseline. The irregularity is seeded
 * rather than random so a scene is the same place every time it is drawn,
 * and the heights vary by nearly a factor of three because a treeline of
 * uniform firs is a comb.
 */
export function treeRidge(
  y: number, width: number, amp: number, h: number, seed: number,
): string {
  const rnd = seeded(seed)
  const out: string[] = [`M -20 ${y + 200}`, `L -20 ${y}`]
  let x = -20
  while (x < width + 20) {
    const base = y - Math.sin((x / width) * Math.PI * 2.3 + seed) * amp
      - Math.sin((x / width) * Math.PI * 7.1) * amp * 0.3
    const th = h * (0.42 + rnd() * 1.1)
    const tw = th * (0.2 + rnd() * 0.12)
    out.push(`L ${r(x)} ${r(base)}`)
    out.push(`L ${r(x + tw * 0.5)} ${r(base - th)}`)
    out.push(`L ${r(x + tw)} ${r(base)}`)
    x += tw * (0.72 + rnd() * 0.5)
  }
  out.push(`L ${width + 20} ${y + 200}`, 'Z')
  return out.join(' ')
}

/**
 * A soft ridgeline: a wandering curve, no trees. For the layers that are far
 * enough away that individual trees have dissolved.
 */
export function softRidge(
  y: number, width: number, amp: number, seed: number, steps = 9,
): string {
  const rnd = seeded(seed)
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * (width + 40) - 20
    pts.push([x, y - (rnd() * 0.65 + 0.35) * amp])
  }
  let d = `M -20 ${y + 300} L ${r(pts[0][0])} ${r(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const mx = (x1 + x2) / 2
    d += ` C ${r(mx)} ${r(y1)}, ${r(mx)} ${r(y2)}, ${r(x2)} ${r(y2)}`
  }
  return `${d} L ${width + 20} ${y + 300} Z`
}

/** Scattered rocks and tufts, for the near bank. Detail reads before shape. */
export function scatter(
  y: number, width: number, n: number, seed: number,
): { x: number; y: number; r: number }[] {
  const rnd = seeded(seed)
  return Array.from({ length: n }, () => ({
    x: rnd() * width,
    y: y + rnd() * 90,
    r: 4 + rnd() * 16,
  }))
}

function seeded(n: number): () => number {
  let s = (Math.abs(Math.round(n)) * 2654435761) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const r = (n: number) => Math.round(n * 10) / 10

/* ------------------------------------------------------------------ *
 * The light kit.
 *
 * Emma looked at the login sunrise beside the sixty scenes and said she
 * wanted the scenes to look like THAT. The difference was never the palette
 * or the subject - the scenes already carry a five-stop ombre sky. It is
 * that the sunrise is lit and the scenes were merely coloured:
 *
 *   BLOOM    the sunrise sun is a radial that fades to nothing over four
 *            radii. The scenes drew a hard-edged circle, which reads as a
 *            sticker on the sky however pretty the sky is.
 *   RAYS     shafts fanning off the sun, widest where they leave it. They
 *            are what makes air look like it is full of light.
 *   GLOW     a warm band sitting on the horizon behind the land, so the
 *            furthest ridge is eaten by light rather than meeting the sky
 *            on a hard line.
 *   DEPTH    every plane gets a vertical gradient instead of one flat fill.
 *            Flat planes are the single clearest "vector" tell.
 *
 * All four are scene-independent, so they go on all sixty at once without
 * touching any scene's own geometry.
 * ------------------------------------------------------------------ */

/** One shaft: a long thin wedge from the sun, widest at the far end. */
export function rayPath(
  cx: number, cy: number, deg: number, len: number, half: number,
): string {
  const a = (deg - 90) * (Math.PI / 180)
  const spread = (half * Math.PI) / 180
  const p = (ang: number, rad: number) =>
    `${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`
  return `M ${cx} ${cy} L ${p(a - spread, len)} L ${p(a + spread, len)} Z`
}

const RAY_ANGLES = [-62, -46, -31, -17, -5, 8, 21, 35, 50, 64]

export function lightDefs(id: string, light: string, planes: string[]) {
  return (
    <>
      <radialGradient id={`sun${id}`} cx="50%" cy="50%">
        <stop offset="0%" stopColor={light} />
        <stop offset="28%" stopColor={light} stopOpacity=".92" />
        <stop offset="58%" stopColor={light} stopOpacity=".42" />
        <stop offset="100%" stopColor={light} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`ray${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={light} stopOpacity=".42" />
        <stop offset="100%" stopColor={light} stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`glow${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={light} stopOpacity="0" />
        <stop offset="62%" stopColor={light} stopOpacity=".34" />
        <stop offset="100%" stopColor={light} stopOpacity=".62" />
      </linearGradient>
      {/* Each depth plane as a gradient: lit at its top edge where it meets
          the air, falling into its own colour below. */}
      {planes.map((c, n) => (
        <linearGradient key={n} id={`pl${id}${n}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lift(c, 0.17)} />
          <stop offset="100%" stopColor={lift(c, -0.09)} />
        </linearGradient>
      ))}
    </>
  )
}

/** Sun, bloom and shafts. Nothing renders when the scene has no sun. */
export function SunLight({ id, at, w, h, light }: {
  id: string
  at: [number, number] | null
  w: number
  h: number
  light: string
}) {
  if (!at) return null
  const cx = w * at[0]
  const cy = h * at[1]
  return (
    <>
      <g opacity=".46">
        {RAY_ANGLES.map((a, i) => (
          <path key={i} fill={`url(#ray${id})`}
            d={rayPath(cx, cy, a, h * 1.5, 2.4 + (i % 3) * 1.6)} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={h * 0.3} fill={`url(#sun${id})`} />
      <circle cx={cx} cy={cy} r={h * 0.055} fill={light} />
    </>
  )
}

/**
 * Shift a hex toward white (positive) or black (negative).
 *
 * Done in the scene's own colour rather than by laying white over it,
 * because a white veil desaturates and these palettes are carrying the
 * whole mood.
 */
export function lift(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const t = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)
    return Math.max(0, Math.min(255, Math.round(t)))
  })
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
