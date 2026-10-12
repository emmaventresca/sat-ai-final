import type { Terrain } from './map'

/**
 * The concept-art register, as reusable parts.
 *
 * The opening screen proved the formula and the rest of the app was still
 * watercolour, which made the theming read as a tint applied to a template.
 * This is that formula extracted so all six worlds are built the same way:
 *
 *   FRAME       near-black shapes at the edges with a thin warm rim. The
 *               single highest-leverage move: it turns a picture you look at
 *               into a place you are standing in.
 *   VALUE STEPS three depths clearly separated in BRIGHTNESS, not three
 *               tints of one hue. Atmosphere is contrast falling off with
 *               distance, and without the steps a range reads flat.
 *   ONE LIGHT   everything warm points at the sun; everything turned away is
 *               cold. Rays, rim light and alpenglow all fall out of that one
 *               decision rather than being three separate effects.
 *   SATURATION  skies are allowed to be loud. These are backdrops for a
 *               teenager who has been told to do two hours of homework.
 *
 * Every world keeps its own subject - highland stacks, a boardwalk, an ice
 * wall - so they stay six places rather than one place recoloured six times.
 */

export interface World {
  /** Sky stops, bottom-lit. Loud on purpose. */
  sky: [string, string][]
  /** Three depths, far to near. Each clearly darker than the last. */
  far: [string, string]
  mid: [string, string]
  near: [string, string]
  /** The light. */
  sun: string
  sunCore: string
  ray: string
  /** Warm light lying across the faces turned toward the sun. */
  glow: [string, string]
  /** Water, where the world has any. 0 means none. */
  waterAt: number
  water: [string, string]
  /** The frame, and the rim where the sun clips it. */
  frame: string
  rim: string
  /** Where the sun sits, as a fraction of the frame. */
  sunAt: [number, number]
}

export const WORLDS: Record<Terrain, World> = {
  // SAT Math - the Scottish highland coast under a break in the weather.
  // Storm overhead, one shaft of amber getting through, heather below.
  cliffs: {
    sky: [['0%', '#141a3d'], ['20%', '#2d2a62'], ['40%', '#5c3573'],
          ['58%', '#9c3f69'], ['74%', '#d96a4a'], ['88%', '#f2a23f'],
          ['100%', '#ffd27a']],
    far: ['#7a5a8e', '#55406f'], mid: ['#3b2b57', '#271d3f'],
    near: ['#1d1430', '#120c20'],
    sun: '#ffb347', sunCore: '#fff3cf', ray: '#ffd98a',
    glow: ['#ffc46a', '#c2567a'],
    waterAt: 0.68, water: ['#c47a5a', '#171028'],
    frame: '#120b22', rim: '#ffb860', sunAt: [0.36, 0.64],
  },
  // SAT English - open coast, the sun low and enormous on the water.
  ocean: {
    sky: [['0%', '#0d2c4d'], ['22%', '#17567f'], ['42%', '#3f93a8'],
          ['58%', '#8fc4a8'], ['72%', '#f0a86a'], ['86%', '#f7764f'],
          ['100%', '#ffd089']],
    far: ['#4b7f96', '#2f5a74'], mid: ['#24455e', '#163049'],
    near: ['#112437', '#081423'],
    sun: '#ff9d5c', sunCore: '#fff6dc', ray: '#ffd3a0',
    glow: ['#ffcf90', '#e2724f'],
    waterAt: 0.56, water: ['#ff9f5e', '#0a1b2c'],
    frame: '#07121f', rim: '#ffc27a', sunAt: [0.58, 0.55],
  },
  // ACT Science - canyon country. Cobalt sky, red rock, sequoia silhouettes.
  // Canyon country, an hour before sunset. Shadows are warm maroon, never
  // grey - red rock bounces its own light back into them, and a grey shadow
  // on red rock is the single fastest way to look like clip art.
  park: {
    sky: [['0%', '#1b4f8c'], ['26%', '#3d7cb8'], ['46%', '#6fb8e0'],
          ['64%', '#c98a7a'], ['80%', '#f6c76a'], ['100%', '#ffe9a8']],
    far: ['#c98a7a', '#a8706a'], mid: ['#d4694a', '#a33b2e'],
    near: ['#6e2318', '#2e1410'],
    sun: '#ff9d4d', sunCore: '#ffe9a8', ray: '#ffe9a8',
    glow: ['#ffcf8a', '#d4694a'],
    waterAt: 0, water: ['#36c9c0', '#1a4a46'],
    frame: '#2e1410', rim: '#ff9d4d', sunAt: [0.72, 0.58],
  },
  // ACT Reading - the fair at dusk, lit up and reflected in its own canal.
  // Teal-green sky over warm electric light, which is the whole image.
  // The blue hour, twenty minutes after sunset: the only moment when the sky
  // still has colour AND the lamps already dominate. The whole world depends
  // on that overlap. The brightest thing in frame is the lit architecture in
  // the MIDGROUND, which inverts the usual "distance is brightest" rule, and
  // the foreground is near-black. Lamps light surfaces upward and outward -
  // cornice undersides, arch intrados - which is the opposite of daylight and
  // is what reads instantly as electric.
  fair: {
    sky: [['0%', '#13225c'], ['28%', '#3a4ca0'], ['52%', '#7e5dae'],
          ['70%', '#d4708f'], ['86%', '#f2a05a'], ['100%', '#ffd9a0']],
    far: ['#6f7cb8', '#4a5390'], mid: ['#f6edd8', '#c2a878'],
    near: ['#121836', '#080c20'],
    sun: '#f2a05a', sunCore: '#fffbef', ray: '#ffe6ac',
    glow: ['#ffe6ac', '#d4708f'],
    waterAt: 0.64, water: ['#2f7d8e', '#0b1526'],
    frame: '#080c20', rim: '#ffe6ac', sunAt: [0.7, 0.52],
  },
  // ACT English - high ice. Alpenglow pink on snow against a cold sky, the
  // one world where the light is a visitor rather than the subject.
  // Pre-dawn alpenglow, and the one world whose value structure is INVERTED:
  // the sky at altitude is dark, the brightest thing in the frame is the snow
  // in the FURTHEST distance, and the foreground is near-black. That contrast
  // - a dark frame around a blazing white centre - is where the awe lives.
  // Snow shadow is blue, never grey; snow light is warm, never pure white.
  peaks: {
    sky: [['0%', '#08143a'], ['22%', '#1b3a78'], ['44%', '#4b6fae'],
          ['62%', '#9d8fc0'], ['78%', '#e8a2b4'], ['90%', '#f9cf9e'],
          ['100%', '#fff0d8']],
    // Rock, not snow: the snow is drawn on top as its own shape so the two
    // can have different values. Making the whole mountain one pale gradient
    // was what turned this world into "gradients of the same colour".
    far: ['#8f93c4', '#5c6096'], mid: ['#4a4f84', '#2e3360'],
    near: ['#1a2235', '#0b1020'],
    sun: '#f0785e', sunCore: '#fff4e8', ray: '#ffb49c',
    glow: ['#ff9eb0', '#f0785e'],
    waterAt: 0, water: ['#1e8fa8', '#15314a'],
    frame: '#0b1020', rim: '#ff9eb0', sunAt: [0.74, 0.4],
  },
  // ACT Math - Miami at golden hour, 1986. Banded sun, palms, a wet grid.
  tropic: {
    sky: [['0%', '#2a0f52'], ['18%', '#5c1570'], ['36%', '#a3246f'],
          ['52%', '#e0455f'], ['66%', '#f87244'], ['82%', '#ffa93c'],
          ['100%', '#ffe07e']],
    far: ['#8e3a76', '#5e2459'], mid: ['#45184a', '#2c0f33'],
    near: ['#1d0a23', '#100515'],
    sun: '#ffd24d', sunCore: '#fff7c9', ray: '#ffcf6e',
    glow: ['#ffcc5c', '#d4406a'],
    waterAt: 0.72, water: ['#ff9a4d', '#15061c'],
    frame: '#0f0514', rim: '#ff9f4d', sunAt: [0.5, 0.56],
  },
}

/** One shaft of light from the sun. */
export function ray(
  cx: number, cy: number, deg: number, len: number, half: number,
): string {
  const a = (deg - 90) * (Math.PI / 180)
  const spread = (half * Math.PI) / 180
  const p = (ang: number, r: number) =>
    `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`
  return `M ${cx} ${cy} L ${p(a - spread, len)} L ${p(a + spread, len)} Z`
}

/** A fir in silhouette: a stacked zigzag, cheapest shape that still reads. */
export function fir(x: number, base: number, h: number, w: number): string {
  const tiers = 4
  const out = [`M ${x} ${base - h}`]
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers
    const y = base - h + h * t
    out.push(`L ${x + w * t * 0.8} ${y - h * 0.07} L ${x + w * t * 0.5} ${y}`)
  }
  out.push(`L ${x + w * 0.11} ${base} L ${x - w * 0.11} ${base}`)
  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers
    const y = base - h + h * t
    out.push(`L ${x - w * t * 0.5} ${y} L ${x - w * t * 0.8} ${y - h * 0.07}`)
  }
  return `${out.join(' ')} Z`
}

/** A palm frond, drawn from a spine out. */
export function frond(x: number, y: number, len: number, deg: number): string {
  const a = (deg * Math.PI) / 180
  const tx = x + Math.cos(a) * len
  const ty = y + Math.sin(a) * len
  const bow = len * 0.3
  const nx = Math.cos(a + Math.PI / 2) * bow
  const ny = Math.sin(a + Math.PI / 2) * bow
  return `M ${x} ${y} Q ${(x + tx) / 2 + nx} ${(y + ty) / 2 + ny} ${tx} ${ty}
          Q ${(x + tx) / 2 + nx * 0.3} ${(y + ty) / 2 + ny * 0.3} ${x} ${y} Z`
}

/** A sharp peak with a snow cap, for the ice world. */
export function peak(x: number, base: number, h: number, w: number): string {
  return `M ${x - w} ${base} L ${x - w * 0.22} ${base - h * 0.78}
          L ${x} ${base - h} L ${x + w * 0.3} ${base - h * 0.72}
          L ${x + w} ${base} Z`
}
