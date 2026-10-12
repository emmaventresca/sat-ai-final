/**
 * Dawn over a lake, in the register of animated concept art.
 *
 * The first version of this was a watercolour: soft, pastel, tasteful, and
 * completely unwilling to grab anybody. That is the failure mode of drawing
 * a landscape in a product - you reach for restraint because restraint is
 * safe on every other screen, and you end up with a backdrop nobody looks at.
 *
 * This one is built the way a background painter builds one:
 *
 *   FRAME       near-black foliage and trunks around the edges, lit only on
 *               the rim. It is what turns a picture into a place you are
 *               standing in rather than an image you are looking at, and it
 *               is the single thing the soft version was missing.
 *   VALUE STEPS four depths that are clearly separated in brightness, not
 *               four tints of one colour. Atmosphere is contrast falling off
 *               with distance; without the steps the range reads flat.
 *   ONE LIGHT   everything warm points at the sun, everything facing away is
 *               cold indigo. Rays, rim light and alpenglow all come off that
 *               one decision.
 *   SATURATION  the sky is allowed to be loud. This screen has one job.
 */
export function Sunrise() {
  return (
    <svg className="sunrise" viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b1248" />
          <stop offset="18%" stopColor="#4a1f73" />
          <stop offset="36%" stopColor="#9b2f73" />
          <stop offset="52%" stopColor="#e05a4e" />
          <stop offset="66%" stopColor="#f98b35" />
          <stop offset="80%" stopColor="#ffbe3d" />
          <stop offset="100%" stopColor="#ffe59a" />
        </linearGradient>
        <radialGradient id="d-sun" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fffbe8" />
          <stop offset="30%" stopColor="#ffe169" stopOpacity=".95" />
          <stop offset="62%" stopColor="#ff9b3c" stopOpacity=".5" />
          <stop offset="100%" stopColor="#ff6b3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="d-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0b8" stopOpacity=".5" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </linearGradient>

        {/* Four depths. Each is darker and cooler than the one behind it. */}
        <linearGradient id="d-r1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c76a8e" /><stop offset="100%" stopColor="#8e4a7d" />
        </linearGradient>
        <linearGradient id="d-r2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7e3f74" /><stop offset="100%" stopColor="#4e2a5c" />
        </linearGradient>
        <linearGradient id="d-r3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d2254" /><stop offset="100%" stopColor="#241540" />
        </linearGradient>
        <linearGradient id="d-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity=".95" />
          <stop offset="46%" stopColor="#ff8f4a" stopOpacity=".55" />
          <stop offset="100%" stopColor="#c2496a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="d-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffbe56" stopOpacity=".5" />
          <stop offset="26%" stopColor="#c9527a" stopOpacity=".42" />
          <stop offset="100%" stopColor="#140d2e" stopOpacity=".94" />
        </linearGradient>

        <filter id="d-soft"><feGaussianBlur stdDeviation="6" /></filter>
        <clipPath id="d-water"><rect x="0" y="588" width="1440" height="312" /></clipPath>
      </defs>

      <rect width="1440" height="900" fill="url(#d-sky)" />

      {/* Rays, fanning from the sun and cut off at the waterline. */}
      <g opacity=".52">
        {RAYS.map((a, i) => (
          <path key={i} fill="url(#d-ray)"
            d={ray(560, 556, a, 1100, 2.6 + (i % 3) * 1.5)} />
        ))}
      </g>

      <circle cx="560" cy="556" r="260" fill="url(#d-sun)" />
      <circle cx="560" cy="556" r="74" fill="#fffbe8" />

      <Clouds />
      <Range />
      <Conifers y={592} />

      {/* The whole scene again, upside down and softened. Same geometry, so
          it can never disagree with what is above the waterline. */}
      <g clipPath="url(#d-water)" filter="url(#d-soft)" opacity=".46">
        <g transform="translate(0 1176) scale(1 -1)">
          <Range />
          <Conifers y={592} />
        </g>
      </g>
      <rect x="0" y="588" width="1440" height="312" fill="url(#d-lake)" />
      {[618, 660, 706, 758, 816].map((y, i) => (
        <rect key={y} x={452 - i * 34} y={y} width={220 + i * 68} height={3} rx={1.5}
          fill="#ffe9a8" opacity={0.34 - i * 0.05} />
      ))}

      {/* The frame. Last, because it sits in front of everything. */}
      <Canopy />
    </svg>
  )
}

const RAYS = [-58, -42, -28, -15, -4, 9, 22, 36, 52]

/** One shaft: a long thin wedge from the sun. */
function ray(cx: number, cy: number, deg: number, len: number, half: number): string {
  const a = (deg - 90) * (Math.PI / 180)
  const spread = (half * Math.PI) / 180
  const p = (ang: number, r: number) =>
    `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`
  return `M ${cx} ${cy} L ${p(a - spread, len)} L ${p(a + spread, len)} Z`
}

/** Stylised cloud banks: stacked lozenges, the way a painter blocks them in. */
function Clouds() {
  return (
    <g>
      {CLOUDS.map(([x, y, w, h, o], i) => (
        <g key={i} opacity={o}>
          <ellipse cx={x} cy={y} rx={w} ry={h} fill="#ffd9a0" />
          <ellipse cx={x - w * 0.42} cy={y + h * 0.3} rx={w * 0.52} ry={h * 0.74}
            fill="#ffc98a" />
          <ellipse cx={x + w * 0.46} cy={y + h * 0.24} rx={w * 0.46} ry={h * 0.68}
            fill="#ffc07d" />
        </g>
      ))}
    </g>
  )
}

const CLOUDS: [number, number, number, number, number][] = [
  [240, 186, 190, 26, 0.5], [900, 142, 230, 30, 0.42],
  [1210, 236, 160, 22, 0.46], [520, 288, 210, 20, 0.4],
  [120, 330, 150, 17, 0.36], [1020, 352, 180, 18, 0.34],
]

/** Three ridges, each a clear value step darker than the last. */
function Range() {
  const y = 592
  return (
    <>
      <path fill="url(#d-r1)" opacity=".92" d={
        `M0 ${y} L96 ${y - 214} L178 ${y - 126} L286 ${y - 292} L392 ${y - 150}
         L498 ${y - 246} L614 ${y - 176} L726 ${y - 316} L842 ${y - 158}
         L958 ${y - 262} L1086 ${y - 140} L1214 ${y - 238} L1336 ${y - 128}
         L1440 ${y - 196} L1440 ${y} Z`} />
      {/* Snow, then the warm light across the faces turned to the sun. */}
      <g fill="#fff4ff" opacity=".9">
        <path d={`M286 ${y - 292} L310 ${y - 242} L290 ${y - 252}
                  L272 ${y - 236} L262 ${y - 248} Z`} />
        <path d={`M726 ${y - 316} L752 ${y - 262} L730 ${y - 273}
                  L710 ${y - 256} L700 ${y - 268} Z`} />
        <path d={`M498 ${y - 246} L518 ${y - 206} L502 ${y - 215}
                  L486 ${y - 201} L478 ${y - 211} Z`} />
      </g>
      <path fill="url(#d-glow)" opacity=".75" d={
        `M178 ${y - 126} L286 ${y - 292} L392 ${y - 150} L498 ${y - 246}
         L614 ${y - 176} L726 ${y - 316} L842 ${y - 158} L958 ${y - 262}
         L1086 ${y - 140} L1086 ${y - 40} L178 ${y - 40} Z`} />

      <path fill="url(#d-r2)" d={
        `M0 ${y} L128 ${y - 132} L254 ${y - 206} L368 ${y - 118} L486 ${y - 196}
         L604 ${y - 106} L730 ${y - 188} L856 ${y - 100} L980 ${y - 170}
         L1118 ${y - 92} L1256 ${y - 154} L1390 ${y - 84} L1440 ${y - 118}
         L1440 ${y} Z`} />
      <path fill="url(#d-r3)" d={
        `M0 ${y} L186 ${y - 70} L348 ${y - 122} L516 ${y - 60} L688 ${y - 112}
         L866 ${y - 54} L1042 ${y - 104} L1226 ${y - 50} L1440 ${y - 94}
         L1440 ${y} Z`} />
    </>
  )
}

/** The treeline on the far shore, near-black against the light. */
function Conifers({ y }: { y: number }) {
  return (
    <g fill="#160e2e">
      {TREES.map(([x, h, w], i) => <path key={i} d={fir(x, y, h, w)} />)}
    </g>
  )
}

const TREES: [number, number, number][] = [
  [30, 150, 24], [78, 104, 17], [128, 176, 27], [180, 92, 15], [226, 132, 21],
  [286, 80, 14], [338, 118, 19], [1072, 126, 20], [1128, 182, 28],
  [1182, 100, 16], [1232, 150, 24], [1288, 86, 14], [1340, 164, 26],
  [1398, 112, 18],
]

function fir(x: number, base: number, h: number, w: number): string {
  const tiers = 4
  const out = [`M ${x} ${base - h}`]
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers
    const yy = base - h + h * t
    out.push(`L ${x + w * t * 0.8} ${yy - h * 0.07} L ${x + w * t * 0.5} ${yy}`)
  }
  out.push(`L ${x + w * 0.11} ${base} L ${x - w * 0.11} ${base}`)
  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers
    const yy = base - h + h * t
    out.push(`L ${x - w * t * 0.5} ${yy} L ${x - w * t * 0.8} ${yy - h * 0.07}`)
  }
  return `${out.join(' ')} Z`
}

/**
 * The frame: trunks and leaf masses at the edges, almost black, with a thin
 * warm rim where the sun catches them.
 *
 * This is the move that does the most work. Without it the picture is a
 * postcard; with it the viewer is standing under a tree at the edge of a
 * clearing, which is a place rather than a view.
 */
function Canopy() {
  return (
    <g>
      {/* Left trunk and boughs. */}
      <g fill="#120b26">
        <path d="M-20 900 L-20 60 L58 46 L96 300 L84 610 L120 900 Z" />
        <path d="M70 120 C 190 96, 300 142, 392 118 C 300 182, 186 168, 64 196 Z" />
        <path d="M58 300 C 160 282, 236 318, 300 302 C 230 356, 142 350, 54 368 Z" />
      </g>
      <g fill="#120b26">
        {LEAVES_L.map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.64}
            transform={`rotate(${(i * 37) % 60 - 30} ${x} ${y})`} />
        ))}
      </g>
      {/* Right side: a heavier mass, pushed further in so the frame is not
          symmetrical - symmetry here reads as a border, not as foliage. */}
      <g fill="#140d2a">
        <path d="M1460 900 L1460 20 L1368 40 L1330 280 L1352 620 L1312 900 Z" />
        <path d="M1372 150 C 1250 120, 1120 172, 1020 140 C 1130 212, 1266 196, 1382 232 Z" />
      </g>
      <g fill="#140d2a">
        {LEAVES_R.map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6}
            transform={`rotate(${(i * 53) % 70 - 35} ${x} ${y})`} />
        ))}
      </g>

      {/* Rim light, where the sun clips the edges of the leaves. */}
      <g fill="none" stroke="#ffc46a" strokeWidth="2.4" opacity=".5">
        <path d="M392 118 C 300 182, 186 168, 64 196" />
        <path d="M1020 140 C 1130 212, 1266 196, 1382 232" />
        <path d="M300 302 C 230 356, 142 350, 54 368" />
      </g>

      {/* A few grasses at the near bank, catching the same light. */}
      <g stroke="#1a1030" strokeWidth="3.4" strokeLinecap="round" fill="none">
        {GRASS.map(([x, h, lean], i) => (
          <path key={i} d={`M${x} 900 q ${lean} ${-h * 0.6} ${lean * 1.7} ${-h}`} />
        ))}
      </g>
    </g>
  )
}

const LEAVES_L: [number, number, number][] = [
  [40, 70, 68], [128, 52, 60], [214, 84, 52], [296, 62, 44], [360, 104, 36],
  [86, 176, 50], [176, 206, 40], [250, 176, 32], [60, 330, 46], [146, 356, 36],
  [224, 330, 28], [24, 470, 54], [92, 520, 40],
]

const LEAVES_R: [number, number, number][] = [
  [1404, 56, 74], [1316, 40, 64], [1228, 74, 54], [1142, 52, 44], [1070, 96, 34],
  [1356, 166, 52], [1268, 196, 42], [1190, 164, 32], [1390, 318, 48],
  [1300, 346, 36], [1420, 468, 56], [1348, 528, 40],
]

const GRASS: [number, number, number][] = [
  [130, 120, 14], [168, 86, -10], [206, 140, 18], [1240, 110, -16],
  [1284, 150, 12], [1326, 92, -14], [262, 72, 10], [1196, 78, 14],
]
