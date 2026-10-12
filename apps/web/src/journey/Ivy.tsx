/**
 * Ivy, drawn rather than tiled.
 *
 * The journey is a road through country, and the page around it was a flat
 * lavender gradient - the one surface in the app that was asking to be a
 * place and wasn't. Ivy in the gutters makes the scroll feel like it has
 * walls, which is what turns a list of topics into somewhere you are.
 *
 * One authored segment, repeated down the column at its own aspect ratio.
 * Stretching a single tall vine to fit the page would flatten every leaf at
 * the top and bloat the ones at the bottom, which is exactly how a decorative
 * SVG starts looking like a texture.
 */
export function Ivy({ side, segments = 4 }: { side: 'left' | 'right'; segments?: number }) {
  return (
    <div className={`ivy ivy-${side}`} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <IvySegment key={i} flip={i % 2 === 1} />
      ))}
    </div>
  )
}

/**
 * One length of vine: a stem that wanders, leaves alternating off it, and two
 * tendrils. The wander is what sells it - a vine drawn as a smooth arc reads
 * as a graphic device, and a vine with a kink in it reads as a plant.
 */
function IvySegment({ flip }: { flip: boolean }) {
  return (
    <svg viewBox="0 0 86 300" className="ivy-seg"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path className="ivy-stem"
        d="M20 0 C 44 36, 10 64, 26 100 C 42 136, 8 162, 24 198 C 40 234, 12 262, 28 300" />
      <Leaf x={26} y={30} r={-28} s={1} />
      <Leaf x={14} y={74} r={38} s={0.78} />
      <Leaf x={32} y={118} r={-16} s={0.92} />
      <Leaf x={12} y={158} r={46} s={0.7} />
      <Leaf x={30} y={204} r={-34} s={1.04} />
      <Leaf x={15} y={248} r={30} s={0.82} />
      <path className="ivy-tendril" d="M24 96 c 12 6, 18 16, 10 22 c -6 4, -11 -2, -7 -8" />
      <path className="ivy-tendril" d="M26 196 c -11 7, -16 17, -8 22 c 6 4, 11 -3, 6 -9" />
    </svg>
  )
}

/** A five-lobed ivy leaf with its midrib, which is the part that reads. */
function Leaf({ x, y, r, s }: { x: number; y: number; r: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path className="ivy-leaf"
        d="M0 -13 C 5 -6, 14 -9, 15 -2 C 16 5, 9 7, 5 6
           C 9 10, 7 16, 0 17 C -7 16, -9 10, -5 6
           C -9 7, -16 5, -15 -2 C -14 -9, -5 -6, 0 -13 Z" />
      <path className="ivy-vein" d="M0 -9 L0 14" />
      <path className="ivy-vein" d="M0 1 L-9 -2 M0 1 L9 -2" />
    </g>
  )
}
