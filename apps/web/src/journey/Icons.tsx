/**
 * Drawn icons, one stroke weight, one family.
 *
 * These were ✓, ⚔ and ★ - typed characters standing in for an icon set. The
 * cost of that is not taste: a glyph renders in whatever face the platform
 * has for it, so the same screen shows a thin outlined star on one machine
 * and a heavy filled one on another, and neither matches anything else on the
 * page. Drawing them is how they stay the same shape everywhere.
 */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function CheckMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M4 12.5 L9.5 18 L20 6.5" />
    </svg>
  )
}

/** The trial: two blades crossed. */
export function Blades({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...S}>
      <path d="M4 3 L14 15.5" />
      <path d="M20 3 L10 15.5" />
      <path d="M6.5 21 L10.5 17" />
      <path d="M17.5 21 L13.5 17" />
      <path d="M8.5 19 L5 15.5" />
      <path d="M15.5 19 L19 15.5" />
    </svg>
  )
}

/** A realm fully collected. */
export function Star({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3 L14.9 9.3 L21.6 10.1 L16.7 14.8 L18 21.4 L12 18.1 L6 21.4 L7.3 14.8 L2.4 10.1 L9.1 9.3 Z" />
    </svg>
  )
}

/** The difficulty ladder: one filled pip per rung. */
export function Rungs({ n, of = 5, size = 7 }: { n: number; of?: number; size?: number }) {
  return (
    <svg width={of * (size + 2)} height={size + 2} viewBox={`0 0 ${of * (size + 2)} ${size + 2}`}
      aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <rect key={i} x={i * (size + 2)} y={0} width={size} height={size} rx={1.6}
          transform={`rotate(45 ${i * (size + 2) + size / 2} ${size / 2})`}
          fill={i < n ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={1.2}
          opacity={i < n ? 1 : 0.35} />
      ))}
    </svg>
  )
}
