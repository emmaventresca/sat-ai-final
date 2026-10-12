import { broadleaf, conifer, fieldEdge, QUEST, ridge, r } from './poster'
import { lightDefs, SunLight } from './atmosphere'

/**
 * From Countryside to Final Ascent, as ten flat posters.
 *
 * Each one is a specific place drawn with specific shapes - a round-doored
 * cottage, a stone bridge with a mill beside it, a stairway with worn treads,
 * a gate with one lamp lit. Silhouette carries everything here, so a generic
 * shape is a failed shape; "a building" reads as nothing, and a round door
 * with a path to it reads as home.
 *
 * Composition is the same in all ten: the card covers the middle ~60%, so the
 * detail and the darkest values go to the edges and the middle band stays
 * open. Where a scene's subject would land behind the card it is moved to a
 * third, not dimmed.
 */
const W = 1600
const H = 900
/** Where the ground meets sky in most scenes. */
const Y = H * 0.62

export function QuestScene({ slot }: { slot: number }) {
  const i = Math.max(0, Math.min(9, slot))
  const p = QUEST[i]
  const id = `q${i}`

  return (
    <svg className="scene scene-poster" viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        {lightDefs(id, p.light, p.planes)}
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, n) => (
            <stop key={n} offset={`${(n / (p.sky.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        {/* The one texture allowed: paper grain. Not fake paint - the
            printed surface, and what stops flat vector reading as software
            illustration. */}
        <filter id={`grain${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"
            stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={W} height={H} fill={`url(#sky${id})`} />
      <SunLight id={id} at={p.sunAt} w={W} h={H} light={p.light} />
      {/* Horizon glow behind the land, so the furthest edge is eaten by
          light instead of meeting the sky on a hard cut. */}
      <rect x="0" y={H * 0.34} width={W} height={H * 0.46}
        fill={`url(#glow${id})`} />

      <Body i={i} />

      <rect width={W} height={H} filter={`url(#grain${id})`} opacity=".06"
        style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

function Body({ i }: { i: number }) {
  const p = QUEST[i]
  const [far, mid, near, fore] = p.planes

  switch (i) {
    // ----------------------------------------------------------------- 1
    case 0: return (
      <>
        <path d={fieldEdge(Y, W, H * 0.07, 5, 11, H)} fill={far} />
        <path d={fieldEdge(Y + H * 0.08, W, H * 0.06, 4, 23, H)} fill={mid} />
        {/* Hedges dividing the fields: flat bands, not textured. */}
        {[0.18, 0.34, 0.52].map((t, n) => (
          <path key={n} d={`M ${-20} ${Y + H * (0.1 + t * 0.2)}
            Q ${W * 0.5} ${Y + H * (0.04 + t * 0.2)} ${W + 20} ${Y + H * (0.12 + t * 0.2)}`}
            stroke={near} strokeWidth={9 + n * 4} fill="none" />
        ))}
        <path d={fieldEdge(Y + H * 0.26, W, H * 0.05, 3, 31, H)} fill={near} />
        {/* Two cottages dug into the hillside, left. A round door is the
            single shape that says "somebody lives here". */}
        <Cottage x={W * 0.1} y={Y + H * 0.2} s={118} ink={p.ink} roof={p.accent}
          lit={p.light} />
        <Cottage x={W * 0.25} y={Y + H * 0.27} s={88} ink={p.ink} roof={p.accent}
          lit={p.light} />
        {/* The lane and its gate, bottom right. */}
        <path d={`M ${W * 1.02} ${H} L ${W * 0.76} ${Y + H * 0.26}
          L ${W * 0.82} ${Y + H * 0.26} L ${W * 1.14} ${H} Z`} fill="#cbbd92" />
        <Gate x={W * 0.86} y={H * 0.93} s={76} ink={p.ink} />
        <path d={fieldEdge(H * 0.94, W, H * 0.03, 3, 7, H)} fill={fore} />
        {[0.06, 0.15].map((t, n) => (
          <path key={n} d={broadleaf(W * t, H * 0.96, 210 - n * 50)} fill={p.ink} />
        ))}
      </>
    )

    // ----------------------------------------------------------------- 2
    case 1: return (
      <>
        <path d={ridge(Y - H * 0.06, W, H * 0.1, 6, 3, H)} fill={far} />
        <path d={fieldEdge(Y + H * 0.04, W, H * 0.07, 5, 17, H)} fill={mid} />
        <path d={fieldEdge(Y + H * 0.16, W, H * 0.06, 4, 29, H)} fill={near} />
        {/* The road: a wedge to a vanishing point left of centre. */}
        <path d={`M ${W * 0.41} ${Y + H * 0.05} L ${W * 0.44} ${Y + H * 0.05}
          L ${W * 0.82} ${H} L ${W * 0.06} ${H} Z`} fill="#d3c69c" />
        <path d={`M ${W * 0.425} ${Y + H * 0.05} L ${W * 0.432} ${Y + H * 0.05}
          L ${W * 0.47} ${H} L ${W * 0.36} ${H} Z`} fill="#c0b188" />
        {/* Hedgerows either side of it, converging. */}
        {[-1, 1].map((s) => (
          <path key={s} fill={fore}
            d={`M ${W * (0.425 + s * 0.012)} ${Y + H * 0.05}
                L ${W * (0.425 + s * 0.4)} ${H} L ${W * (0.425 + s * 0.52)} ${H}
                L ${W * (0.425 + s * 0.03)} ${Y + H * 0.05} Z`} />
        ))}
        <Milestone x={W * 0.11} y={H * 0.93} s={78} ink={p.ink} />
        {[0.08, 0.9, 0.96].map((t, n) => (
          <path key={n} d={broadleaf(W * t, H * 1.02, 250 - n * 40)} fill={p.ink} />
        ))}
      </>
    )

    // ----------------------------------------------------------------- 3
    case 2: return (
      <>
        <rect x="0" y="0" width={W} height={H} fill={far} />
        {/* The shaft: a hard-edged wedge, not a glow. */}
        <path d={`M ${W * 0.46} 0 L ${W * 0.62} 0 L ${W * 0.74} ${H} L ${W * 0.3} ${H} Z`}
          fill={p.light} opacity=".3" />
        <path d={ridge(H * 0.72, W, H * 0.08, 7, 5, H)} fill={mid} />
        {/* Trunks: enormous, cropped top and bottom. That crop is what makes
            them read as enormous. */}
        <Trunk x={W * -0.02} w={W * 0.17} fill={near} ink={p.ink} />
        <Trunk x={W * 0.84} w={W * 0.2} fill={near} ink={p.ink} />
        <Trunk x={W * 0.17} w={W * 0.07} fill={fore} ink={p.ink} />
        {/* Roots crossing the path, and ferns along the bottom. */}
        {[0.26, 0.4, 0.56].map((t, n) => (
          <path key={n} fill={p.ink}
            d={`M ${W * (t - 0.2)} ${H * (0.88 + n * 0.04)}
                Q ${W * t} ${H * (0.82 + n * 0.04)} ${W * (t + 0.2)} ${H * (0.9 + n * 0.04)}
                L ${W * (t + 0.2)} ${H * (0.94 + n * 0.04)}
                Q ${W * t} ${H * (0.86 + n * 0.04)} ${W * (t - 0.2)} ${H * (0.93 + n * 0.04)} Z`} />
        ))}
        <Ferns y={H * 0.97} ink={p.ink} />
      </>
    )

    // ----------------------------------------------------------------- 4
    case 3: return (
      <>
        <path d={ridge(Y - H * 0.18, W, H * 0.16, 5, 13, H)} fill={far} />
        <path d={ridge(Y - H * 0.04, W, H * 0.1, 6, 19, H)} fill={mid} />
        <path d={fieldEdge(Y + H * 0.1, W, H * 0.06, 4, 37, H)} fill={near} />
        {/* The beck, running toward the viewer. */}
        <path d={`M ${W * 0.56} ${Y + H * 0.08} L ${W * 0.64} ${Y + H * 0.08}
          L ${W * 1.02} ${H} L ${W * 0.62} ${H} Z`} fill="#7fb4c4" />
        <Bridge x={W * 0.84} y={Y + H * 0.24} s={330} fill={fore} ink={p.ink} />
        <Mill x={W * 0.17} y={Y + H * 0.22} s={150} ink={p.ink} roof={p.accent}
          lit={p.light} />
        {[0.9, 0.97].map((t, n) => (
          <path key={n} d={conifer(W * t, H * 1.0, 280 - n * 60)} fill={p.ink} />
        ))}
        <path d={fieldEdge(H * 0.95, W, H * 0.02, 3, 41, H)} fill={p.ink} />
      </>
    )

    // ----------------------------------------------------------------- 5
    case 4: return (
      <>
        <path d={ridge(Y - H * 0.1, W, H * 0.14, 5, 23, H)} fill={far} />
        <path d={ridge(Y + H * 0.04, W, H * 0.1, 6, 43, H)} fill={mid} />
        {/* The bluff, right of centre, with the tower on it. */}
        <path fill={near} d={`M ${W * 0.74} ${H} L ${W * 0.78} ${Y - H * 0.04}
          L ${W * 0.96} ${Y - H * 0.08} L ${W * 1.1} ${H} Z`} />
        <Tower x={W * 0.88} y={Y - H * 0.07} s={250} fill={fore} ink={p.ink}
          lit={p.accent} />
        {/* The road winding past and upward - a ribbon, flat. */}
        <path fill="#9a8f7e" d={`M ${W * 0.1} ${H} Q ${W * 0.4} ${H * 0.9}
          ${W * 0.56} ${Y + H * 0.1} L ${W * 0.62} ${Y + H * 0.12}
          Q ${W * 0.46} ${H * 0.92} ${W * 0.2} ${H} Z`} />
        <path d={fieldEdge(H * 0.92, W, H * 0.03, 3, 53, H)} fill={p.ink} />
      </>
    )

    // ----------------------------------------------------------------- 6
    case 5: return (
      <>
        <path d={ridge(H * 0.34, W, H * 0.18, 5, 61, H)} fill={far} />
        {/* Cloud from below: flat lozenges, hard-edged, stacked. */}
        {[0.52, 0.58, 0.64].map((t, n) => (
          <ellipse key={n} cx={W * (0.3 + n * 0.22)} cy={H * t}
            rx={W * (0.3 - n * 0.04)} ry={H * 0.035} fill={p.light}
            opacity={0.85 - n * 0.15} />
        ))}
        {/* The cliff the road is cut into: right edge, floor to ceiling. */}
        <path fill={near} d={`M ${W} 0 L ${W * 0.66} 0 L ${W * 0.7} ${H * 0.5}
          L ${W * 0.62} ${H} L ${W} ${H} Z`} />
        <path fill={fore} d={`M ${W} 0 L ${W * 0.78} 0 L ${W * 0.82} ${H} L ${W} ${H} Z`} />
        {/* The cut road, a pale shelf across the cliff face. */}
        <path fill="#b9b0a2" d={`M ${W * 0.62} ${H * 0.86} L ${W * 0.72} ${H * 0.62}
          L ${W * 0.78} ${H * 0.63} L ${W * 0.7} ${H * 0.88} Z`} />
        <Cairn x={W * 0.09} y={H * 0.93} s={104} ink={p.ink} />
        <path fill={p.ink} d={`M 0 ${H} L 0 ${H * 0.72} L ${W * 0.26} ${H * 0.9}
          L ${W * 0.3} ${H} Z`} />
      </>
    )

    // ----------------------------------------------------------------- 7
    case 6: return (
      <>
        <path d={ridge(H * 0.4, W, H * 0.12, 6, 71, H)} fill={far} />
        <path d={ridge(H * 0.56, W, H * 0.08, 5, 79, H)} fill={mid} />
        {/* Black rock teeth through the snow - the only dark in the scene. */}
        {[[0.1, 0.17], [0.2, 0.1], [0.78, 0.2], [0.88, 0.13], [0.95, 0.08]]
          .map(([x, hh], n) => (
          <path key={n} fill={p.ink}
            d={`M ${W * x} ${H * 0.72} L ${W * (x + 0.02)} ${H * (0.72 - hh)}
                L ${W * (x + 0.035)} ${H * (0.72 - hh * 0.5)}
                L ${W * (x + 0.06)} ${H * (0.72 - hh * 0.8)}
                L ${W * (x + 0.09)} ${H * 0.72} Z`} />
        ))}
        <path d={fieldEdge(H * 0.74, W, H * 0.03, 4, 83, H)} fill={near} />
        {/* Footprints: a line of small flat ovals receding. */}
        {Array.from({ length: 11 }, (_, n) => {
          const t = n / 10
          return (
            <ellipse key={n} cx={W * (0.04 + t * 0.2)} cy={H * (0.99 - t * 0.14)}
              rx={16 - t * 10} ry={7 - t * 4.2} fill={fore} opacity=".75" />
          )
        })}
        <Waymarker x={W * 0.28} y={H * 0.89} s={132} ink={p.ink} accent={p.accent} />
      </>
    )

    // ----------------------------------------------------------------- 8
    case 7: return (
      <>
        <path d={ridge(H * 0.3, W, H * 0.14, 5, 89, H)} fill={far} />
        {[0.46, 0.52].map((t, n) => (
          <ellipse key={n} cx={W * (0.3 + n * 0.4)} cy={H * t} rx={W * 0.34}
            ry={H * 0.03} fill={p.light} opacity={0.7 - n * 0.2} />
        ))}
        {/* The mountainside the stair is cut into. */}
        <path fill={mid} d={`M 0 ${H} L 0 ${H * 0.28} L ${W * 0.56} ${H * 0.52}
          L ${W * 0.9} ${H} Z`} />
        <Stair fill={near} ink={fore} />
        {/* A worn carving beside the lowest treads, right. */}
        <path fill={fore} d={`M ${W * 0.78} ${H} L ${W * 0.8} ${H * 0.66}
          L ${W * 0.86} ${H * 0.63} L ${W * 0.9} ${H} Z`} />
        <path fill={p.ink} d={`M ${W * 0.815} ${H * 0.84} l 18 -44 l 18 44 z`} />
        <path fill={p.ink} d={`M ${W} ${H} L ${W} ${H * 0.58} L ${W * 0.88} ${H} Z`} />
      </>
    )

    // ----------------------------------------------------------------- 9
    case 8: return (
      <>
        <path d={ridge(H * 0.26, W, H * 0.16, 4, 97, H)} fill={far} />
        <path d={ridge(H * 0.46, W, H * 0.1, 5, 101, H)} fill={mid} />
        {/* The wall across the col, with the gate off-centre left. */}
        <rect x="-20" y={H * 0.6} width={W + 40} height={H * 0.4} fill={near} />
        <path fill={fore} d={`M -20 ${H * 0.6} L -20 ${H * 0.56}
          L ${W + 20} ${H * 0.52} L ${W + 20} ${H * 0.6} Z`} />
        {Array.from({ length: 14 }, (_, n) => (
          <rect key={n} x={-20 + n * ((W + 40) / 14)} y={H * 0.53 - (n % 2) * 10}
            width={(W + 40) / 28} height={26} fill={fore} />
        ))}
        <Gateway x={W * 0.15} y={H * 0.62} s={300} fill={fore} ink={p.ink}
          lamp={p.accent} lit={p.light} />
        <path fill={p.ink} d={`M 0 ${H} L 0 ${H * 0.78} L ${W * 0.22} ${H * 0.94}
          L ${W * 0.24} ${H} Z`} />
      </>
    )

    // ---------------------------------------------------------------- 10
    default: return (
      <>
        {/* The peak: enormous, behind, the whole reason for the scene. */}
        <path fill={far} d={`M ${W * 0.26} ${H * 0.74} L ${W * 0.56} ${H * 0.08}
          L ${W * 0.64} ${H * 0.2} L ${W * 0.72} ${H * 0.12} L ${W} ${H * 0.74} Z`} />
        <path fill={p.light} d={`M ${W * 0.56} ${H * 0.08} L ${W * 0.64} ${H * 0.2}
          L ${W * 0.6} ${H * 0.22} L ${W * 0.66} ${H * 0.3} L ${W * 0.5} ${H * 0.26} Z`} />
        <path fill={mid} d={`M -20 ${H * 0.78} L ${W * 0.2} ${H * 0.4}
          L ${W * 0.42} ${H * 0.78} Z`} />
        {/* Cloud line: the road is above it. */}
        {[0.72, 0.78].map((t, n) => (
          <ellipse key={n} cx={W * (0.3 + n * 0.44)} cy={H * t} rx={W * 0.42}
            ry={H * 0.035} fill={p.light} opacity={0.8 - n * 0.2} />
        ))}
        <path fill={near} d={`M -20 ${H} L -20 ${H * 0.84} L ${W * 0.56} ${H * 0.66}
          L ${W * 0.62} ${H * 0.72} L ${W * 0.1} ${H} Z`} />
        <path fill={fore} d={`M -20 ${H} L -20 ${H * 0.9} L ${W * 0.52} ${H * 0.72}
          L ${W * 0.56} ${H * 0.76} L ${W * 0.04} ${H} Z`} />
        {/* The figure: small, on the road, and the whole sense of scale. */}
        <g fill={p.ink} transform={`translate(${W * 0.3} ${H * 0.84})`}>
          <circle cx="0" cy="-26" r="7" />
          <path d="M -8 -20 q 8 -6 16 0 l 4 22 l -24 0 z" />
          <rect x="11" y="-40" width="3" height="46" />
        </g>
      </>
    )
  }
}

// ---------------------------------------------------------------------------
// The specific shapes. A generic shape reads as nothing; these are the scene.
// ---------------------------------------------------------------------------

function Cottage({ x, y, s, ink, roof, lit }: {
  x: number; y: number; s: number; ink: string; roof: string; lit: string
}) {
  return (
    <g>
      {/* Set into the slope: the walls are short and the roof comes low. */}
      <path fill={ink} d={`M ${r(x - s * 0.5)} ${r(y)} L ${r(x - s * 0.5)} ${r(y - s * 0.34)}
        Q ${r(x)} ${r(y - s * 0.86)} ${r(x + s * 0.5)} ${r(y - s * 0.34)}
        L ${r(x + s * 0.5)} ${r(y)} Z`} />
      <path fill={roof} d={`M ${r(x - s * 0.58)} ${r(y - s * 0.3)}
        Q ${r(x)} ${r(y - s * 0.92)} ${r(x + s * 0.58)} ${r(y - s * 0.3)}
        L ${r(x + s * 0.5)} ${r(y - s * 0.26)}
        Q ${r(x)} ${r(y - s * 0.82)} ${r(x - s * 0.5)} ${r(y - s * 0.26)} Z`} />
      {/* The round door - the one shape that says somebody lives here. */}
      <circle cx={x} cy={y - s * 0.17} r={s * 0.17} fill={lit} />
      <rect x={r(x - s * 0.02)} y={r(y - s * 0.34)} width={r(s * 0.04)}
        height={r(s * 0.17)} fill={ink} opacity=".5" />
      {/* Chimney and smoke, straight up: a calm morning. */}
      <rect x={r(x + s * 0.26)} y={r(y - s * 0.84)} width={r(s * 0.1)}
        height={r(s * 0.28)} fill={ink} />
      <path fill="#ffffff" opacity=".5"
        d={`M ${r(x + s * 0.28)} ${r(y - s * 0.86)} q ${s * 0.1} ${-s * 0.2}
            ${-s * 0.02} ${-s * 0.4} q ${s * 0.16} ${s * 0.16} ${s * 0.08} ${s * 0.4} z`} />
    </g>
  )
}

function Gate({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      <rect x={r(x - s * 0.5)} y={r(y - s * 0.6)} width={r(s * 0.07)} height={r(s * 0.6)} />
      <rect x={r(x + s * 0.43)} y={r(y - s * 0.6)} width={r(s * 0.07)} height={r(s * 0.6)} />
      {[0.14, 0.3, 0.46].map((t, n) => (
        <rect key={n} x={r(x - s * 0.5)} y={r(y - s * 0.6 + s * t)}
          width={s} height={r(s * 0.055)} />
      ))}
      <path d={`M ${r(x - s * 0.46)} ${r(y - s * 0.04)} L ${r(x + s * 0.42)} ${r(y - s * 0.52)}
        L ${r(x + s * 0.46)} ${r(y - s * 0.46)} L ${r(x - s * 0.42)} ${r(y)} Z`} />
    </g>
  )
}

function Milestone({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      <path d={`M ${r(x - s * 0.22)} ${r(y)} L ${r(x - s * 0.18)} ${r(y - s * 0.6)}
        Q ${r(x)} ${r(y - s * 0.78)} ${r(x + s * 0.18)} ${r(y - s * 0.6)}
        L ${r(x + s * 0.22)} ${r(y)} Z`} />
      <rect x={r(x - s * 0.1)} y={r(y - s * 0.46)} width={r(s * 0.2)}
        height={r(s * 0.05)} fill="#e8e0c8" />
    </g>
  )
}

function Trunk({ x, w, fill, ink }: {
  x: number; w: number; fill: string; ink: string
}) {
  return (
    <g>
      <path fill={fill} d={`M ${r(x)} ${H + 20} L ${r(x + w * 0.1)} ${-20}
        L ${r(x + w * 0.88)} ${-20} L ${r(x + w)} ${H + 20}
        q ${r(-w * 0.22)} ${-28} ${r(-w * 0.4)} 0
        q ${r(-w * 0.18)} ${-32} ${r(-w * 0.34)} 0 Z`} />
      {[0.26, 0.46, 0.68].map((t, n) => (
        <rect key={n} x={r(x + w * t)} y={-20} width={r(w * 0.045)} height={H + 40}
          fill={ink} opacity=".3" />
      ))}
    </g>
  )
}

function Ferns({ y, ink }: { y: number; ink: string }) {
  return (
    <g fill={ink}>
      {Array.from({ length: 16 }, (_, n) => {
        const x = ((n * 211) % 1000) / 1000 * W
        const h = 70 + ((n * 47) % 90)
        return (
          <g key={n}>
            {[-150, -120, -90, -60, -30].map((a, j) => {
              const rad = (a * Math.PI) / 180
              const len = h * (0.6 + (j % 2) * 0.3)
              return (
                <path key={j}
                  d={`M ${r(x)} ${r(y)} L ${r(x + Math.cos(rad) * len)}
                      ${r(y + Math.sin(rad) * len)} L ${r(x + Math.cos(rad) * len * 0.9 + 9)}
                      ${r(y + Math.sin(rad) * len * 0.9)} Z`} />
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

function Bridge({ x, y, s, fill, ink }: {
  x: number; y: number; s: number; fill: string; ink: string
}) {
  return (
    <g>
      <path fill={fill} d={`M ${r(x - s * 0.9)} ${r(y)} L ${r(x - s * 0.9)} ${r(y - s * 0.16)}
        Q ${r(x)} ${r(y - s * 0.42)} ${r(x + s * 0.9)} ${r(y - s * 0.16)}
        L ${r(x + s * 0.9)} ${r(y)} Z`} />
      {/* The arch, and its reflection implied by leaving the water visible. */}
      <path fill={ink} d={`M ${r(x - s * 0.34)} ${r(y)}
        A ${r(s * 0.34)} ${r(s * 0.3)} 0 0 1 ${r(x + s * 0.34)} ${r(y)} Z`} />
      {Array.from({ length: 9 }, (_, n) => (
        <rect key={n} x={r(x - s * 0.88 + n * (s * 0.22))} y={r(y - s * 0.3)}
          width={r(s * 0.03)} height={r(s * 0.14)} fill={ink} opacity=".55" />
      ))}
    </g>
  )
}

function Mill({ x, y, s, ink, roof, lit }: {
  x: number; y: number; s: number; ink: string; roof: string; lit: string
}) {
  return (
    <g>
      <rect x={r(x - s * 0.4)} y={r(y - s * 0.72)} width={r(s * 0.8)}
        height={r(s * 0.72)} fill={ink} />
      <path fill={roof} d={`M ${r(x - s * 0.5)} ${r(y - s * 0.7)}
        L ${r(x)} ${r(y - s * 1.08)} L ${r(x + s * 0.5)} ${r(y - s * 0.7)} Z`} />
      <rect x={r(x - s * 0.16)} y={r(y - s * 0.5)} width={r(s * 0.16)}
        height={r(s * 0.2)} fill={lit} />
      {/* The wheel - the shape that makes it a mill and not a house. */}
      <circle cx={r(x + s * 0.5)} cy={r(y - s * 0.3)} r={r(s * 0.3)}
        fill="none" stroke={ink} strokeWidth={s * 0.06} />
      {Array.from({ length: 8 }, (_, n) => {
        const a = (n / 8) * Math.PI * 2
        return (
          <line key={n} x1={r(x + s * 0.5)} y1={r(y - s * 0.3)}
            x2={r(x + s * 0.5 + Math.cos(a) * s * 0.3)}
            y2={r(y - s * 0.3 + Math.sin(a) * s * 0.3)}
            stroke={ink} strokeWidth={s * 0.04} />
        )
      })}
    </g>
  )
}

function Tower({ x, y, s, fill, ink, lit }: {
  x: number; y: number; s: number; fill: string; ink: string; lit: string
}) {
  return (
    <g>
      <path fill={fill} d={`M ${r(x - s * 0.22)} ${r(y)} L ${r(x - s * 0.17)} ${r(y - s)}
        L ${r(x + s * 0.17)} ${r(y - s)} L ${r(x + s * 0.22)} ${r(y)} Z`} />
      {/* Crenellations: the shape that says fortification at any size. */}
      {Array.from({ length: 5 }, (_, n) => (
        <rect key={n} x={r(x - s * 0.2 + n * (s * 0.08))} y={r(y - s * 1.08)}
          width={r(s * 0.05)} height={r(s * 0.09)} fill={fill} />
      ))}
      <rect x={r(x - s * 0.22)} y={r(y - s * 1.02)} width={r(s * 0.44)}
        height={r(s * 0.04)} fill={fill} />
      <rect x={r(x - s * 0.05)} y={r(y - s * 0.72)} width={r(s * 0.1)}
        height={r(s * 0.16)} fill={ink} />
      {/* The beacon basket, lit. */}
      <path fill={lit} d={`M ${r(x - s * 0.07)} ${r(y - s * 1.06)}
        q ${s * 0.07} ${-s * 0.16} ${s * 0.14} 0 z`} />
    </g>
  )
}

function Cairn({ x, y, s, ink }: {
  x: number; y: number; s: number; ink: string
}) {
  return (
    <g fill={ink}>
      {[0, 1, 2, 3, 4].map((n) => {
        const t = n / 5
        const w = s * (0.44 - t * 0.3)
        return (
          <ellipse key={n} cx={r(x + (n % 2 ? 4 : -4))} cy={r(y - s * t * 0.9)}
            rx={r(w)} ry={r(w * 0.5)} />
        )
      })}
    </g>
  )
}

function Waymarker({ x, y, s, ink, accent }: {
  x: number; y: number; s: number; ink: string; accent: string
}) {
  return (
    <g>
      <rect x={r(x - s * 0.05)} y={r(y - s)} width={r(s * 0.1)} height={r(s)}
        fill={ink} />
      <path fill={accent} d={`M ${r(x + s * 0.05)} ${r(y - s)}
        L ${r(x + s * 0.5)} ${r(y - s * 0.9)} L ${r(x + s * 0.05)} ${r(y - s * 0.8)} Z`} />
      {/* Half-buried: snow cuts across its foot. */}
      <ellipse cx={x} cy={y} rx={s * 0.3} ry={s * 0.08} fill="#eef3f6" />
    </g>
  )
}

function Stair({ fill, ink }: { fill: string; ink: string }) {
  const steps = 26
  return (
    <g>
      {Array.from({ length: steps }, (_, n) => {
        const t = n / steps
        // The stair runs corner to corner, missing the middle of the frame.
        const x = W * (-0.04 + t * 0.26)
        const y = H * (1.02 - t * 0.44)
        const w = W * (0.34 - t * 0.22)
        const h = H * (0.055 - t * 0.03)
        return (
          <g key={n}>
            <rect x={r(x)} y={r(y)} width={r(w)} height={r(h)} fill={fill} />
            <rect x={r(x)} y={r(y)} width={r(w)} height={r(h * 0.26)} fill={ink}
              opacity=".4" />
          </g>
        )
      })}
    </g>
  )
}

function Gateway({ x, y, s, fill, ink, lamp, lit }: {
  x: number; y: number; s: number
  fill: string; ink: string; lamp: string; lit: string
}) {
  const o = s * 0.24
  return (
    <g>
      <rect x={r(x - s * 0.5)} y={r(y - s * 0.95)} width={s} height={r(s * 0.95)}
        fill={fill} />
      <path fill={ink} d={`M ${r(x - o)} ${r(y)} L ${r(x - o)} ${r(y - s * 0.44)}
        a ${r(o)} ${r(o)} 0 0 1 ${r(o * 2)} 0 L ${r(x + o)} ${r(y)} Z`} />
      {/* The summit, seen through the opening - the reason for the gate. */}
      <path fill={lit} opacity=".3" d={`M ${r(x - o * 0.7)} ${r(y)}
        L ${r(x - o * 0.7)} ${r(y - s * 0.4)} a ${r(o * 0.7)} ${r(o * 0.7)} 0 0 1
        ${r(o * 1.4)} 0 L ${r(x + o * 0.7)} ${r(y)} Z`} />
      <rect x={r(x - s * 0.58)} y={r(y - s * 1.02)} width={r(s * 1.16)}
        height={r(s * 0.09)} fill={fill} />
      {/* One lamp lit, off the left pier. */}
      <rect x={r(x - s * 0.46)} y={r(y - s * 0.74)} width={r(s * 0.05)}
        height={r(s * 0.1)} fill={ink} />
      <circle cx={r(x - s * 0.49)} cy={r(y - s * 0.78)} r={r(s * 0.07)} fill={lamp} />
    </g>
  )
}
