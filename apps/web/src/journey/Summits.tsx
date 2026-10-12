/**
 * Defined peaks, which is the thing a soft ridgeline cannot be.
 *
 * The ice world was reading as "different gradients of the same colour"
 * because it was built from the same soft blobs as every other world. A
 * mountain does not read as a mountain because of its outline; it reads
 * because of its FACES. Three planes meeting at a point - one turned to the
 * light, one turned away, one between - is the whole of it, and a single
 * flat silhouette can never get there no matter how it is coloured.
 *
 * The value structure here is inverted on purpose, and it is what makes high
 * mountains feel like high mountains: the sky at altitude is DARK, the snow
 * in the far distance is the brightest thing in the frame, and the
 * foreground is nearly black. The eye reads that as thin air.
 *
 * Snow shadow is blue and snow light is warm. Neutral grey snow is the
 * single fastest way to make this subject look cheap - Disney's Frozen art
 * department went to Norway and came back with exactly that rule.
 */

export interface SummitSpec {
  /** Centre of the summit. */
  x: number
  /** Where the mountain meets the ground. */
  base: number
  h: number
  /** Half-width at the base. */
  w: number
  /** Which way the light comes from: 1 = lit on the right. */
  lit: 1 | -1
}

/**
 * One summit as three faces.
 *
 * The ridge lines sag slightly between the summit and the shoulders rather
 * than running straight, because a straight-sided triangle is a road sign.
 */
export function Summit({
  s, rock, mid, dark, snow, snowShade, glow,
}: {
  s: SummitSpec
  rock: string
  mid: string
  dark: string
  snow: string
  snowShade: string
  glow: string
}) {
  const { x, base, h, w, lit } = s
  const top = base - h
  // Shoulders sit at ~62% height, offset so the peak is never centred.
  const lsX = x - w * 0.62
  const lsY = base - h * 0.58
  const rsX = x + w * 0.58
  const rsY = base - h * 0.52
  const sag = h * 0.045

  // The spine running down the front of the mountain divides the lit face
  // from the shadowed one. Offset from centre so the two are unequal.
  const spineX = x + w * 0.12 * lit
  const spineY = base

  const ridge = (ax: number, ay: number) =>
    `Q ${(x + ax) / 2} ${(top + ay) / 2 + sag} ${ax} ${ay}`

  const litFace = lit === 1
    ? `M ${x} ${top} ${ridge(rsX, rsY)} L ${x + w} ${base} L ${spineX} ${spineY} Z`
    : `M ${x} ${top} ${ridge(lsX, lsY)} L ${x - w} ${base} L ${spineX} ${spineY} Z`
  const darkFace = lit === 1
    ? `M ${x} ${top} ${ridge(lsX, lsY)} L ${x - w} ${base} L ${spineX} ${spineY} Z`
    : `M ${x} ${top} ${ridge(rsX, rsY)} L ${x + w} ${base} L ${spineX} ${spineY} Z`

  // Snow sits on the top third and runs down the gullies, not as a cap band.
  const snowline = top + h * 0.34
  const cap = `M ${x} ${top}
    ${ridge(rsX, Math.min(rsY, snowline))}
    L ${x + w * 0.21} ${snowline + h * 0.1}
    L ${x + w * 0.09} ${snowline - h * 0.04}
    L ${x - w * 0.04} ${snowline + h * 0.13}
    L ${x - w * 0.16} ${snowline - h * 0.02}
    L ${x - w * 0.26} ${snowline + h * 0.08}
    ${ridge(lsX, Math.min(lsY, snowline)).replace('Q', 'L').split(' ').slice(3).join(' ')}
    Z`

  return (
    <g>
      <path d={darkFace} fill={dark} />
      <path d={litFace} fill={rock} />
      {/* The third plane: the shoulder between the two, mid value. */}
      <path d={`M ${x} ${top} ${ridge(lsX, lsY)} L ${lsX + w * 0.2} ${base}
                L ${spineX} ${spineY} Z`} fill={mid} opacity=".55" />
      <path d={cap} fill={snow} />
      <path d={cap} fill={snowShade} opacity=".38"
        transform={`translate(${-w * 0.07 * lit} ${h * 0.02})`} />
      {/* Alpenglow only on the very top, with a hard-ish cutoff. Lighting the
          whole mountain is how the hour gets lost. */}
      <path d={`M ${x} ${top} ${ridge(rsX, Math.min(rsY, top + h * 0.22))}
                L ${x - w * 0.3} ${top + h * 0.24} Z`}
        fill={glow} opacity=".75" />
    </g>
  )
}

/** A range: one dominant summit, unequal flankers, overlapping. */
export function range(
  width: number, base: number, tall: number, seed: number, n = 5,
): SummitSpec[] {
  const rnd = seeded(seed)
  const out: SummitSpec[] = []
  // The hero sits off-centre, between 40% and 68% across.
  const heroAt = width * (0.4 + rnd() * 0.28)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = width * t + (rnd() - 0.5) * width * 0.1
    const near = 1 - Math.min(1, Math.abs(x - heroAt) / (width * 0.55))
    const h = tall * (0.42 + near * 0.58) * (0.86 + rnd() * 0.28)
    out.push({
      x,
      base: base + (rnd() - 0.5) * tall * 0.08,
      h,
      w: h * (0.52 + rnd() * 0.22),
      lit: 1,
    })
  }
  // Tallest last so it draws in front of its own flankers.
  return out.sort((a, b) => a.h - b.h)
}

function seeded(n: number): () => number {
  let s = (Math.abs(Math.round(n)) * 2654435761) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
