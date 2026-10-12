/**
 * Flat poster illustration.
 *
 * Four attempts at these backgrounds failed the same way, and the diagnosis
 * was wrong every time. It was not the palette. It was that authored vector
 * shapes were being used to fake a PAINTING - soft blurred masses, haze
 * gradients, atmospheric falloff. Those are a painter's tools, and code
 * imitating them produces exactly what it looked like: blurry abstract blobs.
 *
 * So this is the opposite bet. Vector is natively excellent at flat poster
 * illustration - the WPA national-park posters, vintage travel posters, the
 * Eyvind Earle backgrounds - and that tradition looks DELIBERATE rather than
 * like failed painting. The rules are nearly the inverse of what came before:
 *
 *   FLAT       every plane is one solid colour. No gradients inside a shape.
 *   HARD       no blur anywhere. The edge is the drawing.
 *   FEW        five to seven colours per scene, and they are shared between
 *              shapes so the image reads as printed rather than assembled.
 *   SPECIFIC   a kidney-shaped pool with a springboard, not "a pool shape".
 *              Silhouette carries all the meaning, so it has to be the right
 *              silhouette.
 *   STACKED    depth comes from overlapping planes stepping darker toward the
 *              viewer, not from haze.
 *
 * The one texture allowed is a fine print grain at very low opacity. That is
 * not fake paint - it is the paper, and it is what stops flat vector reading
 * as a software illustration.
 */

export interface Poster {
  /** Sky, top to bottom. Two or three bands, hard-edged or one soft ramp. */
  sky: string[]
  /** Depth planes, furthest first. Each step is a clear value change. */
  planes: string[]
  /** Foreground silhouette - the darkest value in the scene. */
  ink: string
  /** The light: sun disc, lit faces, lamp glow. */
  light: string
  /** One hot accent, used sparingly. Roofs, a beacon, a gate lamp. */
  accent: string
  /** Where the sun or key light sits, as fractions of the frame. */
  sunAt: [number, number] | null
}

/**
 * The ten palettes of the overland quest, in order.
 *
 * They are a single walk rather than ten independent choices: warm green to
 * gold to grey-blue to white to slate to last light on high stone. Read the
 * `planes` column down the page and the journey is visible before any shape
 * is drawn - which is the test of whether a progression actually progresses.
 */
export const QUEST: Poster[] = [
  // 1. The Green Country - safe, warm, low.
  { sky: ['#6396bd', '#96c0d6', '#c9eaf0', '#e4eddd', '#fff0ca'],
    planes: ['#bcd98a', '#8fbf62', '#6aa046', '#49793a'],
    ink: '#2d4a2a', light: '#fff3c4', accent: '#e07a3f', sunAt: [0.74, 0.3] },

  // 2. The Long Road - open, bright, the hills going blue.
  { sky: ['#4d88b6', '#7bb2d0', '#a9dcea', '#cee6df', '#f4f1d4'],
    planes: ['#9fb8cf', '#86a86e', '#5f8a4c', '#3f6a38'],
    ink: '#2a4330', light: '#fff8d6', accent: '#d9b24a', sunAt: [0.5, 0.26] },

  // 3. The Elder Wood - the first enclosure. Green underwater light.
  { sky: ['#90a38f', '#a0b987', '#b0cf7f'],
    planes: ['#7fae63', '#4f7f45', '#355c34', '#22402a'],
    ink: '#16291c', light: '#f2ffcf', accent: '#d7a23c', sunAt: [0.56, 0.12] },

  // 4. The River Crossing - cooling, the first grey in the set.
  { sky: ['#5883ad', '#86acc6', '#b4d6e0', '#cfd8cf', '#e9d9be'],
    planes: ['#8d9eb0', '#6f8a7a', '#4e6a55', '#36503f'],
    ink: '#223228', light: '#fff4d2', accent: '#c2502f', sunAt: [0.3, 0.3] },

  // 5. The Watchtower - low gold on one face, valley already in shade.
  { sky: ['#a1733e', '#c99e5c', '#f0c87a', '#f8d591', '#ffe2a9'],
    planes: ['#8a7e94', '#60607c', '#434760', '#2c3044'],
    ink: '#1b1e2e', light: '#ffe9a8', accent: '#ff8c3a', sunAt: [0.18, 0.4] },

  // 6. The High Pass - thin light, wind, cloud from below.
  { sky: ['#6381b0', '#94adcc', '#c4d9e8', '#dfe6e9', '#faf2ea'],
    planes: ['#9fb0c4', '#78889e', '#56657c', '#3b4557'],
    ink: '#262c3a', light: '#ffffff', accent: '#d8803c', sunAt: [0.66, 0.22] },

  // 7. The White Silence - flat, shadowless, almost no colour.
  { sky: ['#8f99b8', '#b9c2d4', '#e4ebf0', '#f2f1ef', '#fff7ee'],
    planes: ['#e8eef2', '#d2dce4', '#b4c2cf', '#8d9cae'],
    ink: '#39404e', light: '#ffffff', accent: '#b8452f', sunAt: null },

  // 8. The Stair of Kings - raking late light across worn stone.
  { sky: ['#415f93', '#708cb2', '#9fb9d2', '#c3c6c3', '#e7d2b4'],
    planes: ['#b8a88c', '#9a8a70', '#746752', '#4e4538'],
    ink: '#2b2720', light: '#ffeec0', accent: '#e0943c', sunAt: [0.84, 0.34] },

  // 9. The Last Gate - dusk, one lamp, the summit beyond.
  { sky: ['#1f2953', '#37426d', '#4f5a86', '#786c87', '#a27f88'],
    planes: ['#6d6f8e', '#4f5270', '#383a55', '#24263c'],
    ink: '#14162a', light: '#ffd98a', accent: '#ff9a3c', sunAt: null },

  // 10. The Final Ascent - last light on high stone, everything below blue.
  { sky: ['#1e2c56', '#5a5f8e', '#c08a7e', '#f0c08a'],
    planes: ['#d8b48e', '#a88070', '#6a5c64', '#3e3a50'],
    ink: '#1a1b30', light: '#fff0c8', accent: '#ff9a4a', sunAt: [0.3, 0.36] },
]

/** A hill or ridge as a flat plane: one hard curve, no texture. */
export function ridge(
  y: number, w: number, h: number, pts: number, seed: number, bottom: number,
): string {
  const rnd = seeded(seed)
  const out: string[] = [`M -20 ${bottom}`, `L -20 ${y}`]
  for (let i = 0; i <= pts; i++) {
    const x = -20 + ((w + 40) * i) / pts
    const yy = y - rnd() * h
    const px = -20 + ((w + 40) * (i - 0.5)) / pts
    if (i === 0) out.push(`L ${x} ${r(yy)}`)
    else out.push(`Q ${r(px)} ${r(yy)} ${r(x)} ${r(yy)}`)
  }
  out.push(`L ${w + 20} ${bottom}`, 'Z')
  return out.join(' ')
}

/** Rolling field edge: shallower and rounder than a ridge. */
export function fieldEdge(
  y: number, w: number, h: number, lobes: number, seed: number, bottom: number,
): string {
  const rnd = seeded(seed)
  const step = (w + 40) / lobes
  const out = [`M -20 ${bottom}`, `L -20 ${y}`]
  for (let i = 0; i < lobes; i++) {
    const x0 = -20 + i * step
    const lift = h * (0.3 + rnd() * 0.7)
    out.push(`Q ${r(x0 + step / 2)} ${r(y - lift)} ${r(x0 + step)} ${r(y)}`)
  }
  out.push(`L ${w + 20} ${bottom}`, 'Z')
  return out.join(' ')
}

/**
 * A conifer: six tiers, each wider than the last, each slightly offset.
 *
 * The offset is the whole thing. A symmetrical stack of triangles is a
 * Christmas-tree icon; tiers that lean a few degrees and overhang unevenly
 * read as a tree that grew. Six rather than four, because four leaves gaps
 * big enough to see the silhouette as a zigzag rather than as foliage.
 */
export function conifer(x: number, base: number, h: number, seed = 1): string {
  const rnd = seeded(seed * 97 + Math.round(x))
  const tiers = 6
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers
    // Width grows faster than height, so the tree sits rather than spikes.
    const w = h * 0.1 + h * 0.3 * Math.pow(t, 1.3)
    const y = base - h + h * t * 0.94
    const lean = (rnd() - 0.5) * h * 0.05
    const over = h * 0.045
    left.push(`L ${r(x - w + lean)} ${r(y - over)}`, `L ${r(x - w * 0.52 + lean)} ${r(y)}`)
    right.unshift(`L ${r(x + w * 0.52 + lean)} ${r(y)}`, `L ${r(x + w + lean)} ${r(y - over)}`)
  }
  return [
    `M ${r(x)} ${r(base - h)}`,
    ...right.reverse(),
    `L ${r(x + h * 0.035)} ${r(base)}`,
    `L ${r(x - h * 0.035)} ${r(base)}`,
    ...left.reverse(),
    'Z',
  ].join(' ')
}

/**
 * A broadleaf: a crown of overlapping lobes on a forked trunk.
 *
 * The first version was a single circle on a stick - a lollipop, and it
 * looked exactly as sad as that sounds. A real canopy reads as a cluster of
 * masses with gaps of sky between them, so this is seven overlapping circles
 * of unequal size laid in one path, plus a trunk that forks. Both are cheap
 * and both are the difference between "tree" and "tree-shaped object".
 */
export function broadleaf(x: number, base: number, h: number, seed = 1): string {
  const rnd = seeded(seed * 131 + Math.round(x))
  const cy = base - h * 0.64
  const out: string[] = []

  // Trunk, with a fork. A straight stick is the other half of the lollipop.
  const tw = h * 0.045
  out.push(
    `M ${r(x - tw)} ${r(base)}`,
    `L ${r(x - tw * 0.7)} ${r(base - h * 0.42)}`,
    `L ${r(x - h * 0.13)} ${r(base - h * 0.56)}`,
    `L ${r(x - h * 0.1)} ${r(base - h * 0.58)}`,
    `L ${r(x - tw * 0.3)} ${r(base - h * 0.48)}`,
    `L ${r(x + h * 0.1)} ${r(base - h * 0.6)}`,
    `L ${r(x + h * 0.12)} ${r(base - h * 0.56)}`,
    `L ${r(x + tw * 0.7)} ${r(base - h * 0.44)}`,
    `L ${r(x + tw)} ${r(base)}`,
    'Z',
  )

  // The crown: seven lobes, unequal, clustered off-centre.
  const lobes: [number, number, number][] = [
    [0, -h * 0.1, 0.3], [-0.26, 0.02, 0.23], [0.26, 0.0, 0.25],
    [-0.15, 0.14, 0.2], [0.16, 0.15, 0.21], [-0.08, -0.2, 0.2],
    [0.1, -0.19, 0.18],
  ]
  for (const [dx, dy, rad] of lobes) {
    const cx = x + h * dx + (rnd() - 0.5) * h * 0.04
    const yy = cy + h * dy + (rnd() - 0.5) * h * 0.04
    const rr = h * rad * (0.88 + rnd() * 0.24)
    out.push(
      `M ${r(cx - rr)} ${r(yy)}`,
      `a ${r(rr)} ${r(rr)} 0 1 0 ${r(rr * 2)} 0`,
      `a ${r(rr)} ${r(rr)} 0 1 0 ${r(-rr * 2)} 0`,
      'Z',
    )
  }
  return out.join(' ')
}

function seeded(n: number): () => number {
  let s = (Math.abs(Math.round(n)) * 2654435761) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export const r = (n: number) => Math.round(n * 10) / 10
