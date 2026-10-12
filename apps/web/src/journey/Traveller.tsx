import type { Terrain } from './map'

/**
 * Someone actually on the road.
 *
 * The map had a route and a set of dots and nobody travelling it, which is
 * the difference between a diagram of a journey and a journey. The figure
 * sits at the furthest realm the student has reached and slides along the
 * road when that changes - so progress is something they watch happen rather
 * than a number that was already different when they came back.
 *
 * The mount belongs to the land. A horse on the coast of the ocean world or
 * a boat up Everest would say the six worlds are a palette swap, and they
 * are not.
 */
export function Traveller({ terrain, road, at }: {
  terrain: Terrain
  /** The road path, which the figure is pinned to. */
  road: string
  /** 0 to 1 along it. */
  at: number
}) {
  return (
    <g className="traveller"
      style={{
        offsetPath: `path("${road}")`,
        offsetDistance: `${Math.max(0, Math.min(1, at)) * 100}%`,
        offsetRotate: '0deg',
      }}>
      <Mount terrain={terrain} />
    </g>
  )
}

function Mount({ terrain }: { terrain: Terrain }) {
  if (terrain === 'ocean' || terrain === 'tropic') return <Boat />
  if (terrain === 'peaks') return <Climber />
  if (terrain === 'fair') return <Balloon />
  return <Horse />
}

const SKIN = '#f0c9a4'
const CLOAK = '#6b4ea8'

/** Highland and park: a rider, moving. */
function Horse() {
  return (
    <g transform="translate(-19 -30)">
      {/* Body and legs first, so the rider sits on top of them. */}
      <path d="M8 26 q7 -7 17 -6 q9 1 12 6 q2 5 -2 7 l-27 0 q-3 -3 0 -7 z"
        fill="#6b4a2f" />
      <path d="M36 26 q6 -3 7 -9 q1 -4 4 -4 q2 3 -1 6 q-1 5 -4 8 z" fill="#6b4a2f" />
      <path d="M46 13 q3 -4 2 1 q2 -3 1 2 q-1 3 -4 2 z" fill="#4e3521" />
      <path d="M10 25 q-5 -2 -8 3 q4 1 8 -1 z" fill="#4e3521" />
      <g stroke="#5c3f28" strokeWidth="3" strokeLinecap="round">
        <path d="M13 32 L10 41" /><path d="M20 33 L23 42" />
        <path d="M32 32 L30 41" /><path d="M38 32 L41 42" />
      </g>
      {/* Rider. */}
      <path d="M22 20 q3 -8 8 -8 q5 0 6 8 q-7 3 -14 0 z" fill={CLOAK} />
      <circle cx="29" cy="9" r="4.6" fill={SKIN} />
      <path d="M23 8 q6 -6 12 0 q-6 -3 -12 0 z" fill="#45346e" />
    </g>
  )
}

/** Coast and tropics: a small boat with its sail full. */
function Boat() {
  return (
    <g transform="translate(-18 -32)">
      <path d="M4 32 q14 7 28 0 q-3 6 -14 6 q-11 0 -14 -6 z" fill="#7a5433" />
      <path d="M18 30 L18 4" stroke="#5c3f28" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19 6 q14 9 10 20 l-10 0 z" fill="#fdfaf0" />
      <path d="M17 8 q-10 8 -7 18 l7 0 z" fill="#e6ddc6" />
      <circle cx="12" cy="27" r="3.6" fill={SKIN} />
      <path d="M8 31 q4 -5 8 0 z" fill={CLOAK} />
    </g>
  )
}

/** The ice: on foot, roped, with a staff. Nobody rides up Everest. */
function Climber() {
  return (
    <g transform="translate(-10 -30)">
      <path d="M18 2 L13 30" stroke="#6b4a2f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 14 q5 -9 11 0 q-1 11 -5 13 q-5 -2 -6 -13 z" fill="#d94f3d" />
      <circle cx="11" cy="8" r="4.4" fill={SKIN} />
      <path d="M6 7 q5 -6 10 0 q-5 -3 -10 0 z" fill="#2f3f6b" />
      <path d="M2 16 q-2 7 2 9 q2 -5 2 -9 z" fill="#b8402f" />
      <g stroke="#2f3f6b" strokeWidth="2.6" strokeLinecap="round">
        <path d="M9 27 L7 36" /><path d="M14 27 L16 36" />
      </g>
    </g>
  )
}

/** The fair: a balloon, because 1904 put everything in the air it could. */
function Balloon() {
  return (
    <g transform="translate(-14 -44)">
      <path d="M14 2 q13 0 13 14 q0 10 -13 18 q-13 -8 -13 -18 q0 -14 13 -14 z"
        fill="#d9534f" />
      <path d="M14 2 q5 0 5 14 q0 10 -5 18 q-5 -8 -5 -18 q0 -14 5 -14 z"
        fill="#f0e2bd" opacity=".85" />
      <g stroke="#6b4a2f" strokeWidth="1.3">
        <path d="M7 32 L10 40" /><path d="M21 32 L18 40" />
      </g>
      <rect x="9" y="39" width="10" height="7" rx="1.8" fill="#8a6132" />
      <circle cx="14" cy="38" r="2.6" fill={SKIN} />
    </g>
  )
}
