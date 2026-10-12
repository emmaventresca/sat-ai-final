import { WORLDS } from './art'

/**
 * Ten places on the highland coast, and ten on the open ocean.
 *
 * The two SAT worlds are deliberately opposed so a student knows which
 * section they are in from a thumbnail: **cliffs is vertical, cool and
 * high-contrast; ocean is horizontal, warm and low-contrast.** They share no
 * devices - god rays belong to the highland and never appear at sea, and the
 * sunpath on water belongs to the ocean and never appears inland. Reusing
 * one world's toolkit in the other is how six worlds collapse into one.
 *
 * Highland rock is blue-violet in shadow and warm-orange on the lit edge.
 * Grey-brown "realistic" rock is the failure mode of this subject.
 */
export function CliffsScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.cliffs
  const far = p.far[0]
  const mid = p.mid[0]
  const near = p.near[0]
  const ink = p.frame
  const rim = p.rim
  const surf = '#dceff5'
  const heather = '#9b3e95'
  const turf = '#5f7a33'

  switch (v % 10) {
    // 1. A stack field at low tide, reflections longer than the stacks.
    case 0:
      return (
        <>
          <Stacks y={y} w={W} h={H} fills={[far, mid, near]} rim={rim} surf={surf} />
          <WetSand y={y + H * 0.04} w={W} h={H} surf={surf} />
        </>
      )

    // 2. The loch under cloud: still black water, one island, no horizon.
    case 1:
      return (
        <>
          <Island x={W * 0.42} y={y} w={W * 0.2} h={H * 0.1} fill={near} />
          <StillWater y={y + H * 0.02} w={W} h={H} />
        </>
      )

    // 3. A ruined broch, the sea visible through its broken wall.
    case 2:
      return (
        <>
          <Headland y={y} w={W} h={H} fill={mid} ink={ink} turf={turf} />
          <Broch x={W * 0.52} y={y - H * 0.02} w={W * 0.17} ink={ink} rim={rim} />
        </>
      )

    // 4. A glen with a thread of white off a basalt lip.
    case 3:
      return (
        <>
          <Glen y={y} w={W} h={H} far={far} mid={mid} near={near} />
          <Thread x={W * 0.48} y={y - H * 0.3} h={H * 0.32} surf={surf} />
        </>
      )

    // 5. The sea arch from the shore, bright open sea beyond it.
    case 4:
      return (
        <>
          <SeaArch x={W * 0.22} y={y + H * 0.04} w={W * 0.56} h={H * 0.4}
            fill={near} rim={rim} />
          <Shingle y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 6. Heather moor and standing stones, horizon utterly empty.
    case 5:
      return (
        <>
          <Moor y={y} w={W} h={H} heather={heather} turf={turf} />
          <Stones y={y + H * 0.02} w={W} ink={ink} rim={rim} />
        </>
      )

    // 7. A harbour under the cliff: the one scene with human scale.
    case 6:
      return (
        <>
          <Wall x={-W * 0.04} y={y} w={W * 0.52} h={H * 0.62} fill={near} rim={rim} />
          <Jetty y={y + H * 0.1} w={W} ink={ink} />
        </>
      )

    // 8. A storm wall offshore, far headlands already erased by rain.
    case 7:
      return (
        <>
          {[0.5, 0.36, 0.22].map((t, i) => (
            <Promontory key={i} y={y - H * 0.02} w={W} h={H * t}
              fill={[far, mid, near][i]} seed={v + i} flip={i % 2 === 1} />
          ))}
          <Squall y={0} w={W} h={H} />
        </>
      )

    // 9. The pass between two leaning pinnacles, a path toward brightness.
    case 8:
      return (
        <>
          <Pinnacle x={W * 0.22} y={y + H * 0.08} h={H * 0.52} lean={-7}
            fill={near} rim={rim} />
          <Pinnacle x={W * 0.74} y={y + H * 0.06} h={H * 0.46} lean={9}
            fill={near} rim={rim} />
          <Path y={y + H * 0.08} w={W} h={H} turf={turf} />
        </>
      )

    // 10. A clifftop in a gale: grass flattened, spray coming up over the edge.
    default:
      return (
        <>
          <Headland y={y} w={W} h={H} fill={near} ink={ink} turf={turf} />
          <Spray y={y - H * 0.02} w={W} surf={surf} />
          <Gulls w={W} h={y} ink={ink} />
        </>
      )
  }
}

/**
 * Ten places at sea.
 *
 * The sunpath is the hero and the one thing that must be right: a vertical
 * BOWTIE, narrow at the horizon and widening to the bottom of frame, built
 * from lozenges whose spacing follows a square law. Evenly spaced rungs read
 * as a ladder graphic, which is the single commonest failure of this subject.
 * The other is a flat gradient sea - the gradient belongs in the sky, and the
 * water has to be banded and broken.
 */
export function OceanScene({ v, y, w: W, h: H }: {
  v: number; y: number; w: number; h: number
}) {
  const p = WORLDS.ocean
  const mid = p.mid[0]
  const ink = p.frame
  const foam = '#eaf6ff'
  const warm = '#ffc65a'
  const deep = '#0e5068'
  const sand = '#c8a24a'
  const sx = W * (0.36 + ((v * 11) % 28) / 100)

  switch (v % 10) {
    // 1. Open horizon: sea, sky, sunpath. The purest statement of the world.
    case 0:
      return (
        <>
          <Swell y={y} w={W} h={H} mid={mid} deep={deep} foam={foam} />
          <SunPath x={sx} y={y} h={H} warm={warm} />
        </>
      )

    // 2. The lagoon and reef line.
    case 1:
      return (
        <>
          <Reef y={y + H * 0.1} w={W} foam={foam} />
          <Swell y={y} w={W} h={H} mid="#2bb6c4" deep={mid} foam={foam} />
          <SunPath x={sx} y={y} h={H} warm={warm} />
        </>
      )

    // 3. A headland with a lighthouse, its beam just lit.
    case 2:
      return (
        <>
          <Arm y={y} w={W} h={H} fill={ink} side={-1} />
          <Lighthouse x={W * 0.18} y={y - H * 0.01} h={H * 0.2} ink={ink} warm={warm} />
          <SunPath x={sx} y={y} h={H} warm={warm} />
        </>
      )

    // 4. Tidal flats: mirror-wet sand, land a thin dark line.
    case 3:
      return (
        <>
          <Arm y={y} w={W} h={H} fill={ink} side={1} />
          <Flats y={y} w={W} h={H} warm={warm} sand={sand} />
        </>
      )

    // 5. Under the dune crest: the sea only a bright strip above the lip.
    case 4:
      return (
        <>
          <Swell y={y} w={W} h={H * 0.3} mid={mid} deep={deep} foam={foam} />
          <Dune y={y + H * 0.12} w={W} h={H} ink={ink} sand={sand} />
        </>
      )

    // 6. Boats at anchor, masts breaking the horizon, long reflections.
    case 5:
      return (
        <>
          <Swell y={y} w={W} h={H} mid={mid} deep={deep} foam={foam} />
          <Boats y={y} w={W} ink={ink} />
          <SunPath x={sx} y={y} h={H} warm={warm} />
        </>
      )

    // 7. A sandbar running out and ending, water either side.
    case 6:
      return (
        <>
          <Swell y={y} w={W} h={H} mid={mid} deep={deep} foam={foam} />
          <Bar y={y + H * 0.06} w={W} h={H} sand={sand} foam={foam} />
        </>
      )

    // 8. A squall clearing: rain falling on the right, sunlit water left.
    case 7:
      return (
        <>
          <Swell y={y} w={W} h={H} mid={mid} deep={deep} foam={foam} />
          <Rain x={W * 0.62} w={W * 0.42} y={0} h={y} />
          <SunPath x={W * 0.28} y={y} h={H} warm={warm} />
        </>
      )

    // 9. From a clifftop, looking down on the sunpath.
    case 8:
      return (
        <>
          <Swell y={y - H * 0.16} w={W} h={H} mid={mid} deep={deep} foam={foam} />
          <SunPath x={sx} y={y - H * 0.16} h={H} warm={warm} />
          <Arm y={y + H * 0.12} w={W} h={H} fill={ink} side={-1} />
        </>
      )

    // 10. Night swell: the one cool-dominant scene, moon for sun.
    default:
      return (
        <>
          <Swell y={y} w={W} h={H} mid={deep} deep="#071725" foam="#b9d6e8" />
          <SunPath x={sx} y={y} h={H} warm={foam} />
          <circle cx={sx} cy={y - H * 0.14} r={H * 0.045} fill={foam} opacity=".9" />
        </>
      )
  }
}

// ---------------------------------------------------------------------------
// Highland
// ---------------------------------------------------------------------------

/** Stacks: 3:1 to 4:1, notched where soft bands eroded, on a basalt plinth. */
function Stacks({ y, w, h, fills, rim, surf }: {
  y: number; w: number; h: number; fills: string[]; rim: string; surf: string
}) {
  const set: [number, number, number][] = [
    [0.18, 0.46, 0], [0.26, 0.3, 1], [0.33, 0.17, 2],
    [0.72, 0.4, 0], [0.8, 0.24, 1],
  ]
  return (
    <g>
      {set.map(([t, s, f], i) => {
        const hh = h * s
        const ww = hh * 0.28
        const x = w * t
        return (
          <g key={i}>
            <ellipse cx={x + ww / 2} cy={y + 6} rx={ww * 1.3} ry={10}
              fill={surf} opacity=".35" />
            <path fill={fills[f]} d={`M ${x - ww * 0.18} ${y}
              L ${x} ${y - hh} L ${x + ww} ${y - hh * 0.96}
              L ${x + ww * 1.18} ${y} Z`} />
            {[0.3, 0.52, 0.7].map((n, j) => (
              <rect key={j} x={x - ww * 0.1} y={y - hh * n}
                width={ww * 1.2} height={hh * 0.025} fill="#000" opacity=".22" />
            ))}
            <rect x={x + ww * 0.92} y={y - hh * 0.96} width={ww * 0.1}
              height={hh * 0.96} fill={rim} opacity=".55" />
            <path fill="#000" opacity=".35" d={`M ${x - ww * 0.4} ${y}
              L ${x - ww * 0.1} ${y - hh * 0.16} L ${x + ww * 1.3} ${y - hh * 0.14}
              L ${x + ww * 1.6} ${y} Z`} />
          </g>
        )
      })}
    </g>
  )
}

function WetSand({ y, w, h, surf }: {
  y: number; w: number; h: number; surf: string
}) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill="#6b5f70" opacity=".5" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={w * (0.08 + (i % 3) * 0.22)} y={y + 28 + i * 50}
          width={w * (0.2 + (i % 4) * 0.1)} height={4} rx="2"
          fill={surf} opacity={0.3 - i * 0.04} />
      ))}
    </g>
  )
}

function Island({ x, y, w, h, fill }: {
  x: number; y: number; w: number; h: number; fill: string
}) {
  return (
    <g fill={fill}>
      <path d={`M ${x} ${y} q ${w * 0.3} ${-h} ${w} 0 Z`} />
      {[0.3, 0.5, 0.7].map((t, i) => (
        <path key={i} d={fir2(x + w * t, y - h * 0.4, h * 0.9, h * 0.2)} />
      ))}
    </g>
  )
}

function fir2(x: number, base: number, h: number, w: number): string {
  return `M ${x} ${base - h} L ${x + w} ${base} L ${x - w} ${base} Z`
}

function StillWater({ y, w, h }: { y: number; w: number; h: number }) {
  return <rect x="0" y={y} width={w} height={h - y} fill="#10131f" opacity=".82" />
}

function Headland({ y, w, h, fill, ink, turf }: {
  y: number; w: number; h: number; fill: string; ink: string; turf: string
}) {
  return (
    <g>
      <path fill={fill} d={`M -20 ${y + h} L -20 ${y} L ${w * 0.62} ${y - h * 0.04}
        L ${w * 0.64} ${y + h * 0.3} L ${w + 20} ${y + h * 0.34}
        L ${w + 20} ${y + h} Z`} />
      <rect x="-20" y={y - h * 0.04} width={w * 0.66} height={h * 0.03}
        fill={turf} opacity=".8" />
      <path fill={ink} d={`M -20 ${y + h} L -20 ${y + h * 0.42}
        Q ${w * 0.4} ${y + h * 0.3} ${w + 20} ${y + h * 0.5} L ${w + 20} ${y + h} Z`} />
    </g>
  )
}

function Broch({ x, y, w, ink, rim }: {
  x: number; y: number; w: number; ink: string; rim: string
}) {
  const h = w * 1.1
  return (
    <g>
      <path fill={ink} d={`M ${x} ${y} L ${x + w * 0.08} ${y - h}
        L ${x + w * 0.4} ${y - h * 0.86} L ${x + w * 0.56} ${y - h}
        L ${x + w * 0.92} ${y - h * 0.7} L ${x + w} ${y} Z`} />
      <path fill="none" stroke={rim} strokeWidth="2.4" opacity=".6"
        d={`M ${x + w * 0.08} ${y - h} L ${x + w * 0.4} ${y - h * 0.86}
            L ${x + w * 0.56} ${y - h}`} />
      {[0.3, 0.52, 0.74].map((t, i) => (
        <rect key={i} x={x + w * 0.1} y={y - h * t} width={w * 0.8}
          height={h * 0.02} fill="#000" opacity=".3" />
      ))}
    </g>
  )
}

function Glen({ y, w, h, far, mid, near }: {
  y: number; w: number; h: number; far: string; mid: string; near: string
}) {
  return (
    <g>
      <path fill={far} d={`M -20 ${y + h} L ${w * 0.5} ${y - h * 0.3}
        L ${w + 20} ${y + h} Z`} opacity=".75" />
      <path fill={mid} d={`M -20 ${y + h} L -20 ${y - h * 0.06}
        L ${w * 0.44} ${y + h} Z`} />
      <path fill={near} d={`M ${w + 20} ${y + h} L ${w + 20} ${y - h * 0.02}
        L ${w * 0.56} ${y + h} Z`} />
    </g>
  )
}

function Thread({ x, y, h, surf }: {
  x: number; y: number; h: number; surf: string
}) {
  return (
    <g>
      <path fill={surf} opacity=".8"
        d={`M ${x} ${y} q -4 ${h * 0.5} -1 ${h} l 9 0 q 2 ${-h * 0.5} -1 ${-h} z`} />
      <ellipse cx={x + 4} cy={y + h} rx="30" ry="10" fill={surf} opacity=".35" />
    </g>
  )
}

function SeaArch({ x, y, w, h, fill, rim }: {
  x: number; y: number; w: number; h: number; fill: string; rim: string
}) {
  const o = w * 0.26
  return (
    <g>
      <path fill={fill} d={`M ${x} ${y} L ${x} ${y - h} L ${x + w} ${y - h * 0.9}
        L ${x + w} ${y} L ${x + w * 0.5 + o} ${y}
        Q ${x + w * 0.5 + o * 0.9} ${y - h * 0.5} ${x + w * 0.5} ${y - h * 0.5}
        Q ${x + w * 0.5 - o * 0.9} ${y - h * 0.5} ${x + w * 0.5 - o} ${y} Z`} />
      <path fill="none" stroke={rim} strokeWidth="3" opacity=".65"
        d={`M ${x} ${y - h} L ${x + w} ${y - h * 0.9}`} />
    </g>
  )
}

function Shingle({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      <path d={`M -20 ${y + 400} L -20 ${y} Q ${w * 0.4} ${y - 20} ${w + 20} ${y + 10}
        L ${w + 20} ${y + 400} Z`} />
      {Array.from({ length: 24 }, (_, i) => (
        <ellipse key={i} cx={((i * 173) % 1000) / 1000 * w}
          cy={y + 10 + ((i * 41) % 60)} rx={5 + (i % 4) * 4} ry={3 + (i % 3) * 2}
          opacity=".7" />
      ))}
    </g>
  )
}

function Moor({ y, w, h, heather, turf }: {
  y: number; w: number; h: number; heather: string; turf: string
}) {
  return (
    <g>
      <path fill={turf} d={`M -20 ${y + h} L -20 ${y}
        Q ${w * 0.5} ${y - 22} ${w + 20} ${y + 8} L ${w + 20} ${y + h} Z`} />
      <path fill={heather} opacity=".55" d={`M -20 ${y + h} L -20 ${y + h * 0.3}
        Q ${w * 0.4} ${y + h * 0.18} ${w + 20} ${y + h * 0.34}
        L ${w + 20} ${y + h} Z`} />
      {Array.from({ length: 30 }, (_, i) => (
        <ellipse key={i} cx={((i * 211) % 1000) / 1000 * w}
          cy={y + h * 0.32 + ((i * 53) % 90)} rx={14 + (i % 5) * 7} ry={7}
          fill={heather} opacity=".4" />
      ))}
    </g>
  )
}

function Stones({ y, w, ink, rim }: {
  y: number; w: number; ink: string; rim: string
}) {
  return (
    <g>
      {[[0.16, 1, -5], [0.3, 0.8, 4], [0.46, 1.1, -3], [0.62, 0.74, 7],
        [0.78, 0.95, -6]].map(([t, s, lean], i) => (
        <g key={i} transform={`translate(${w * t} ${y}) rotate(${lean})`}>
          <path fill={ink} d={`M -14 0 L -11 ${-120 * s} L 12 ${-124 * s}
            L 16 0 Z`} />
          <rect x="10" y={-124 * (s as number)} width="5" height={124 * (s as number)}
            fill={rim} opacity=".4" />
        </g>
      ))}
    </g>
  )
}

function Wall({ x, y, w, h, fill, rim }: {
  x: number; y: number; w: number; h: number; fill: string; rim: string
}) {
  return (
    <g>
      <path fill={fill} d={`M ${x} ${y + h} L ${x} ${y - h} L ${x + w} ${y - h * 0.86}
        L ${x + w * 0.94} ${y + h} Z`} />
      <path fill="none" stroke={rim} strokeWidth="3.4" opacity=".55"
        d={`M ${x} ${y - h} L ${x + w} ${y - h * 0.86}`} />
    </g>
  )
}

function Jetty({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      <rect x={w * 0.56} y={y} width={w * 0.4} height={12} />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={w * (0.58 + i * 0.055)} y={y + 12} width="7" height="40" />
      ))}
      {[0.66, 0.78].map((t, i) => (
        <path key={i} d={`M ${w * t - 24} ${y + 56} q 24 14 48 0
          q -6 9 -24 9 q -18 0 -24 -9 z`} />
      ))}
    </g>
  )
}

function Promontory({ y, w, h, fill, seed, flip }: {
  y: number; w: number; h: number; fill: string; seed: number; flip: boolean
}) {
  const d = flip
    ? `M ${w + 20} ${y + h * 2} L ${w + 20} ${y - h * 0.3}
       Q ${w * 0.6} ${y - h * 0.5} ${w * 0.3} ${y} L ${w * 0.3} ${y + h * 2} Z`
    : `M -20 ${y + h * 2} L -20 ${y - h * 0.26}
       Q ${w * 0.3} ${y - h * 0.46} ${w * 0.62} ${y} L ${w * 0.62} ${y + h * 2} Z`
  return <path fill={fill} opacity={0.6 + (seed % 3) * 0.12} d={d} />
}

function Squall({ y, w, h }: { y: number; w: number; h: number }) {
  return (
    <g opacity=".4">
      <rect x={-20} y={y} width={w * 0.44} height={h} fill="#2a2f52" />
      {Array.from({ length: 40 }, (_, i) => (
        <line key={i} x1={((i * 97) % 440) / 1000 * w} y1={y}
          x2={((i * 97) % 440) / 1000 * w - 24} y2={h}
          stroke="#8fa0c8" strokeWidth="1" opacity=".3" />
      ))}
    </g>
  )
}

function Pinnacle({ x, y, h, lean, fill, rim }: {
  x: number; y: number; h: number; lean: number; fill: string; rim: string
}) {
  const w = h * 0.2
  return (
    <g transform={`rotate(${lean} ${x} ${y})`}>
      <path fill={fill} d={`M ${x - w} ${y} L ${x - w * 0.3} ${y - h}
        L ${x + w * 0.4} ${y - h * 0.94} L ${x + w} ${y} Z`} />
      <rect x={x + w * 0.3} y={y - h * 0.94} width={w * 0.14} height={h * 0.94}
        fill={rim} opacity=".45" />
    </g>
  )
}

function Path({ y, w, h, turf }: {
  y: number; w: number; h: number; turf: string
}) {
  return (
    <g>
      <path fill={turf} opacity=".6" d={`M -20 ${y + h} L -20 ${y}
        Q ${w * 0.5} ${y - 18} ${w + 20} ${y + 6} L ${w + 20} ${y + h} Z`} />
      <path fill="#d8cdb0" opacity=".4" d={`M ${w * 0.44} ${y}
        L ${w * 0.52} ${y} L ${w * 0.72} ${y + h} L ${w * 0.22} ${y + h} Z`} />
    </g>
  )
}

function Spray({ y, w, surf }: { y: number; w: number; surf: string }) {
  return (
    <g opacity=".45">
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} fill={surf}
          d={`M ${w * (0.08 + i * 0.13)} ${y} q 18 ${-60 - (i % 3) * 30}
              44 ${-80 - (i % 4) * 26} q -40 ${30 + (i % 3) * 18} -44 ${80} z`} />
      ))}
    </g>
  )
}

function Gulls({ w, h, ink }: { w: number; h: number; ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="2.4" opacity=".6">
      {[[0.3, 0.3], [0.38, 0.22], [0.52, 0.36], [0.66, 0.26]].map(([tx, ty], i) => (
        <path key={i} d={`M ${w * tx - 12} ${h * ty} q 12 -8 12 0 q 0 -8 12 0`} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Ocean
// ---------------------------------------------------------------------------

/** Banded, broken water. The gradient belongs in the sky, not the sea. */
function Swell({ y, w, h, mid, deep, foam }: {
  y: number; w: number; h: number; mid: string; deep: string; foam: string
}) {
  const bands = 8
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill={mid} />
      {Array.from({ length: bands }, (_, i) => {
        const t = (i + 1) / bands
        const yy = y + (h - y) * (t ** 1.5)
        const amp = 3 + t * 16
        const wl = w / (9 - i)
        const d = [`M -20 ${yy}`]
        for (let x = -20; x < w + 40; x += wl) {
          d.push(`q ${wl / 2} ${-amp} ${wl} 0`)
        }
        return (
          <g key={i}>
            <path d={`${d.join(' ')} L ${w + 20} ${h} L -20 ${h} Z`}
              fill={deep} opacity={0.14 + t * 0.3} />
            <path d={d.join(' ')} fill="none" stroke={foam}
              strokeWidth={0.8 + t * 1.4} opacity={0.2 + t * 0.22} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * The sunpath: a bowtie, narrow at the horizon and widening to the viewer,
 * with square-law spacing. Even rungs read as a ladder.
 */
function SunPath({ x, y, h, warm }: {
  x: number; y: number; h: number; warm: string
}) {
  const n = 22
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / n
        const yy = y + (h - y) * (t ** 2)
        const half = 6 + t * 150
        return (
          <rect key={i} x={x - half} y={yy} width={half * 2}
            height={2 + t * 9} rx={1 + t * 4}
            fill={warm} opacity={0.82 - t * 0.3} />
        )
      })}
    </g>
  )
}

function Reef({ y, w, foam }: { y: number; w: number; foam: string }) {
  return (
    <g>
      <path fill="none" stroke={foam} strokeWidth="7" opacity=".75"
        d={`M -20 ${y} Q ${w * 0.3} ${y - 24} ${w * 0.56} ${y + 8}
            Q ${w * 0.8} ${y + 34} ${w + 20} ${y - 4}`} />
      <path fill="none" stroke={foam} strokeWidth="2.6" opacity=".4"
        d={`M -20 ${y + 16} Q ${w * 0.34} ${y - 6} ${w * 0.6} ${y + 24}
            Q ${w * 0.82} ${y + 48} ${w + 20} ${y + 12}`} />
    </g>
  )
}

function Arm({ y, w, h, fill, side }: {
  y: number; w: number; h: number; fill: string; side: 1 | -1
}) {
  const d = side < 0
    ? `M -20 ${y + h} L -20 ${y + 6} Q ${w * 0.16} ${y - 28} ${w * 0.42} ${y + 10}
       L ${w * 0.42} ${y + h} Z`
    : `M ${w + 20} ${y + h} L ${w + 20} ${y + 4} Q ${w * 0.84} ${y - 32}
       ${w * 0.58} ${y + 12} L ${w * 0.58} ${y + h} Z`
  return <path fill={fill} d={d} />
}

function Lighthouse({ x, y, h, ink, warm }: {
  x: number; y: number; h: number; ink: string; warm: string
}) {
  const w = h * 0.16
  return (
    <g>
      <path fill={ink} d={`M ${x - w * 0.7} ${y} L ${x - w * 0.4} ${y - h}
        L ${x + w * 0.4} ${y - h} L ${x + w * 0.7} ${y} Z`} />
      <rect x={x - w * 0.5} y={y - h * 1.14} width={w} height={h * 0.16} fill={ink} />
      <circle cx={x} cy={y - h * 1.06} r={w * 0.26} fill={warm} />
      <path fill={warm} opacity=".2" d={`M ${x} ${y - h * 1.06}
        L ${x + h * 1.4} ${y - h * 1.5} L ${x + h * 1.4} ${y - h * 0.6} Z`} />
    </g>
  )
}

function Flats({ y, w, h, warm, sand }: {
  y: number; w: number; h: number; warm: string; sand: string
}) {
  return (
    <g>
      <rect x="0" y={y} width={w} height={h - y} fill={sand} opacity=".3" />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} fill={warm} opacity={0.34 - i * 0.05}
          d={`M ${w * (0.1 + i * 0.16)} ${y} q ${w * 0.1} ${(h - y) * 0.4}
              ${-w * 0.04} ${h - y} l ${w * 0.1} 0 q ${w * 0.04} ${-(h - y) * 0.5}
              ${w * 0.02} ${-(h - y)} z`} />
      ))}
    </g>
  )
}

function Dune({ y, w, h, ink, sand }: {
  y: number; w: number; h: number; ink: string; sand: string
}) {
  return (
    <g>
      <path fill={sand} opacity=".5" d={`M -20 ${y + h} L -20 ${y}
        Q ${w * 0.5} ${y - 40} ${w + 20} ${y + 10} L ${w + 20} ${y + h} Z`} />
      <path fill={ink} d={`M -20 ${y + h} L -20 ${y + 40}
        Q ${w * 0.46} ${y + 6} ${w + 20} ${y + 48} L ${w + 20} ${y + h} Z`} />
      <g stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round">
        {Array.from({ length: 22 }, (_, i) => {
          const x = ((i * 157) % 1000) / 1000 * w
          const hh = 40 + ((i * 37) % 70)
          const lean = ((i * 23) % 24) - 12
          return <path key={i} d={`M ${x} ${y + 44} q ${lean} ${-hh * 0.6}
            ${lean * 1.8} ${-hh}`} />
        })}
      </g>
    </g>
  )
}

function Boats({ y, w, ink }: { y: number; w: number; ink: string }) {
  return (
    <g fill={ink}>
      {[[0.22, 1], [0.44, 0.8], [0.68, 0.92]].map(([t, s], i) => (
        <g key={i} transform={`translate(${w * t} ${y}) scale(${s})`}>
          <path d="M -30 0 q 30 15 60 0 q -7 10 -30 10 q -23 0 -30 -10 z" />
          <rect x="-2" y="-62" width="3.4" height="62" />
          <path d="M 2 -58 q 22 20 14 44 l -14 0 z" opacity=".7" />
          <rect x="-26" y="12" width="52" height="3" opacity=".4" />
          <rect x="-20" y="20" width="40" height="2.4" opacity=".28" />
        </g>
      ))}
    </g>
  )
}

function Bar({ y, w, h, sand, foam }: {
  y: number; w: number; h: number; sand: string; foam: string
}) {
  return (
    <g>
      <path fill={sand} opacity=".65" d={`M -20 ${y + h} L -20 ${y + h * 0.5}
        Q ${w * 0.4} ${y + h * 0.1} ${w * 0.74} ${y}
        Q ${w * 0.5} ${y + h * 0.26} ${w * 0.2} ${y + h} Z`} />
      <path fill="none" stroke={foam} strokeWidth="3" opacity=".5"
        d={`M -20 ${y + h * 0.52} Q ${w * 0.4} ${y + h * 0.12} ${w * 0.74} ${y + 4}`} />
    </g>
  )
}

function Rain({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g opacity=".42">
      <rect x={x} y={y} width={w} height={h} fill="#2b3f5c" />
      {Array.from({ length: 36 }, (_, i) => (
        <line key={i} x1={x + ((i * 83) % 100) / 100 * w} y1={y}
          x2={x + ((i * 83) % 100) / 100 * w - 18} y2={h}
          stroke="#9fc0d8" strokeWidth="1" opacity=".35" />
      ))}
    </g>
  )
}
