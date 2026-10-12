/**
 * The figure you walk the world with.
 *
 * Drawn here rather than borrowed. What makes a traveller read at this size
 * is the silhouette - a cloak, a pack, a stride - not any particular
 * character, so this is built from those and is nobody's: no franchise
 * costume, no crest, no named figure. Same rule as the backdrops.
 *
 * Two frames and a CSS swap rather than a sprite sheet: at 54px the only
 * thing the eye reads as walking is the legs changing, and two poses is
 * enough to sell it.
 */
export function Walker({ facing, moving }: { facing: 1 | -1; moving: boolean }) {
  return (
    <div className={`walker${moving ? ' moving' : ''}`}
      style={{ transform: `scaleX(${facing})` }}>
      <svg viewBox="0 0 28 44" width="38" height="60" aria-hidden="true">
        {/* Cloak: a single flaring shape, which is what carries the figure. */}
        <path d="M14 8 c4 0 6.8 3 6.8 6.8 L24 36 c.2 1.7-.8 2.6-2.2 2.6 H6.2
                 C4.8 38.6 3.8 37.7 4 36 L7.2 14.8 C7.2 11 10 8 14 8 z"
          fill="currentColor" />
        {/* Hood, peaked forward so you can tell which way it is going. */}
        <path d="M14 3.4 c3.1 0 5.4 2.2 5.6 5.1 -1.7 1.3-3.5 2-5.6 2
                 s-3.9-.7-5.6-2 C8.6 5.6 10.9 3.4 14 3.4 z" fill="currentColor" />
        <path d="M19.4 8.6 c-1.5 1.1-3.3 1.7-5.4 1.7 v-2.4 c2 0 3.8-.5 5.2-1.4 z"
          fill="#fff" opacity=".22" />
        {/* Pack. */}
        <ellipse cx="7.4" cy="18" rx="3.4" ry="4.6" fill="currentColor" />
        {/* Staff, planted - it is what makes the stride look like effort. */}
        <path d="M22.5 11 L20.4 37" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" />
        {/* Legs: the two frames. */}
        <g className="legs-a">
          <path d="M11.6 38 l-1.6 5.4 M16.4 38 l1.6 5.4" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="legs-b">
          <path d="M12.6 38 l-3.4 4.4 M15.4 38 l3.4 4.4" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}
