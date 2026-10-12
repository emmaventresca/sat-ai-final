import {
  Arch, Bandstand, Boards, Campanile, Carousel, Colonnade, Dome, Pier, Tower, Wheel,
} from './Boardwalk'
import { WORLDS } from './art'

/**
 * Ten places in one fair.
 *
 * Not ten times of day of one view - that is what the first attempt was, and
 * it is why it read as "different gradients of the same colours". These are
 * ten compositions: the wheel from underneath, a canal with gondolas, the
 * colonnade reflected, the midway from the pier head, and so on. A student
 * working through a round moves through the fair rather than watching one
 * picture change colour.
 *
 * The brightest value in every one of them is the electric light, and it sits
 * in the MIDGROUND. That inverts the usual rule where distance is brightest,
 * and the inversion IS the hour: warm windows and bulbs winning against a sky
 * that has already gone violet. It is also the reason every lamp here is a
 * drawn bead on a real architectural edge rather than a soft glow laid over
 * the top - a blurry yellow wash reads as a filter, and beads read as 1904.
 */
export function FairScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.fair
  const stone = p.mid[0]          // lit beaux-arts stone, warm not neutral
  const dark = p.frame            // near-black foreground and interiors
  const lit = p.sunCore           // bulb cores: the only near-white in frame
  const gold = '#e8c05c'
  const deck = { horizon: y + H * 0.05, bottom: H, width: W, vp: 0.38 }

  switch (v % 10) {
    // 1. The wheel from underneath its leg trusses, running off the top.
    case 0:
      return (
        <>
          <Colonnade x={W * 0.52} y={y} w={W * 0.46} h={H * 0.13} n={9}
            stone={stone} dark={dark} lit={lit} />
          <Wheel x={W * 0.3} y={y - H * 0.3} r={H * 0.3}
            frame={dark} lit={lit} />
          <Boards deck={{ ...deck, vp: 0.3 }} plank={p.mid[1]} gap={dark}
            rail={dark} lit={lit} />
        </>
      )

    // 2. A canal between two colonnades, closing on a lit arch.
    case 1:
      return (
        <>
          <Colonnade x={-W * 0.04} y={y} w={W * 0.42} h={H * 0.17} n={8}
            stone={stone} dark={dark} lit={lit} />
          <Colonnade x={W * 0.62} y={y} w={W * 0.44} h={H * 0.17} n={8}
            stone={stone} dark={dark} lit={lit} />
          <Arch x={W * 0.42} y={y} w={W * 0.17} h={H * 0.22}
            stone={stone} dark={dark} lit={lit} />
          <Gondolas y={y + H * 0.1} w={W} dark={dark} lit={lit} />
        </>
      )

    // 3. The peristyle reflected: a long horizontal band of light verticals.
    case 2:
      return (
        <>
          <Colonnade x={W * 0.06} y={y} w={W * 0.88} h={H * 0.15} n={18}
            stone={stone} dark={dark} lit={lit} />
          <Dome x={W * 0.5} y={y - H * 0.15} r={H * 0.09}
            stone={stone} gold={gold} lit={lit} />
        </>
      )

    // 4. The midway from the pier head, looking back at land.
    case 3:
      return (
        <>
          <Colonnade x={W * 0.1} y={y} w={W * 0.34} h={H * 0.12} n={7}
            stone={stone} dark={dark} lit={lit} />
          <Colonnade x={W * 0.58} y={y} w={W * 0.34} h={H * 0.12} n={7}
            stone={stone} dark={dark} lit={lit} />
          <Dome x={W * 0.5} y={y - H * 0.04} r={H * 0.11}
            stone={stone} gold={gold} lit={lit} />
          <Boards deck={{ ...deck, vp: 0.5 }} plank={p.mid[1]} gap={dark}
            rail={dark} lit={lit} />
        </>
      )

    // 5. A bandstand in a lamplit garden, backs of a crowd in the dark.
    case 4:
      return (
        <>
          <Bandstand x={W * 0.42} y={y} w={W * 0.26} stone={stone} lit={lit} />
          <Crowd y={y + H * 0.04} w={W} dark={dark} />
        </>
      )

    // 6. The grand entrance arch from outside, glow spilling through.
    case 5:
      return (
        <>
          <Arch x={W * 0.28} y={y} w={W * 0.42} h={H * 0.34}
            stone={stone} dark={dark} lit={lit} />
          <Campanile x={W * 0.74} y={y} h={H * 0.4} stone={stone} lit={lit} />
          <Crowd y={y + H * 0.03} w={W} dark={dark} />
        </>
      )

    // 7. The electric tower across the lagoon, one vertical axis.
    case 6:
      return (
        <>
          <Tower x={W * 0.46} y={y} h={H * 0.46} frame={dark} lit={lit} />
          <Colonnade x={W * 0.66} y={y} w={W * 0.34} h={H * 0.1} n={7}
            stone={stone} dark={dark} lit={lit} />
          <Gondolas y={y + H * 0.14} w={W} dark={dark} lit={lit} />
        </>
      )

    // 8. Under the pier: pilings in deep perspective, light between planks.
    case 7:
      return (
        <>
          <Pier x={-W * 0.1} y={y - H * 0.02} len={W * 1.2} deep={H * 0.3}
            post={dark} lit={lit} />
          <Wheel x={W * 0.82} y={y - H * 0.24} r={H * 0.11}
            frame={dark} lit={lit} />
        </>
      )

    // 9. High over the whole fair: domes receding into haze.
    case 8:
      return (
        <>
          <Dome x={W * 0.2} y={y - H * 0.02} r={H * 0.07}
            stone={stone} gold={gold} lit={lit} />
          <Dome x={W * 0.46} y={y - H * 0.05} r={H * 0.11}
            stone={stone} gold={gold} lit={lit} />
          <Dome x={W * 0.74} y={y - H * 0.01} r={H * 0.08}
            stone={stone} gold={gold} lit={lit} />
          <Campanile x={W * 0.6} y={y} h={H * 0.34} stone={stone} lit={lit} />
          <Colonnade x={W * 0.02} y={y + H * 0.03} w={W * 0.96} h={H * 0.07}
            n={22} stone={stone} dark={dark} lit={lit} />
        </>
      )

    // 10. The carousel, close and head-on: a bright ring under a dark canopy.
    default:
      return (
        <>
          <Colonnade x={W * 0.64} y={y} w={W * 0.4} h={H * 0.12} n={8}
            stone={stone} dark={dark} lit={lit} />
          <Carousel x={W * 0.34} y={y + H * 0.04} w={W * 0.38}
            stone={stone} lit={lit} dark={dark} />
        </>
      )
  }
}

/** Lantern-prowed boats on the canal, small and dark. */
function Gondolas({ y, w, dark, lit }: {
  y: number; w: number; dark: string; lit: string
}) {
  return (
    <g>
      {[[0.16, 1], [0.44, 0.78], [0.72, 0.92]].map(([t, s], i) => (
        <g key={i} transform={`translate(${w * t} ${y}) scale(${s})`}>
          <path d="M -46 0 q 46 16 92 0 q -10 11 -46 11 q -36 0 -46 -11 z"
            fill={dark} />
          <path d="M -46 0 q -10 -12 -4 -20 q 8 6 10 20 z" fill={dark} />
          <circle cx="-48" cy="-22" r="3.4" fill={lit} />
          <circle cx="-48" cy="-22" r="9" fill={lit} opacity=".2" />
          <ellipse cx="6" cy="-9" rx="9" ry="11" fill={dark} />
        </g>
      ))}
    </g>
  )
}

/** Heads and hats, in silhouette. A fair with nobody at it is a diagram. */
function Crowd({ y, w, dark }: { y: number; w: number; dark: string }) {
  const n = 34
  return (
    <g fill={dark}>
      {Array.from({ length: n }, (_, i) => {
        const x = ((i * 137) % 1000) / 1000 * w
        const s = 0.8 + ((i * 53) % 40) / 100
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <circle cx="0" cy="-26" r="7" />
            <path d="M -11 -29 q 11 -7 22 0 q -11 -3 -22 0 z" />
            <path d="M -9 -18 q 9 -6 18 0 l 4 24 l -26 0 z" />
          </g>
        )
      })}
    </g>
  )
}
