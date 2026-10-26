/**
 * Where a lesson stands in its clearing.
 *
 * Level three used to lay its recognitions out on a generic arc over the
 * site plate: correct about how many there were, and wrong about the one
 * thing this level is for. A stop should be ON something - the log bridge,
 * the dock, the ruined arch - so that walking to it means walking to a
 * place rather than clicking the third circle from the left.
 *
 * Coordinates are percentages of the CROPPED plate in art/clearings/,
 * authored by looking at each picture. They cannot be derived. `where`
 * names the thing that is actually at that point, and it is not decoration:
 * it is the check. If the label says "the log bridge" and there is no
 * bridge there, the anchor is wrong and the whole illusion goes with it.
 *
 * The plates carry their own cartography - a title, a compass rose, a
 * legend and a scale bar, all painted in. Those are good and they stay,
 * but nothing may be placed on top of them, which is what CHROME is for.
 */

export interface Anchor {
  /** 0-100 across the cropped plate. */
  x: number
  /** 0-100 down it. */
  y: number
  /** The thing at that point, in this picture. */
  where: string
}

/**
 * Painted-in furniture, in the same 0-100 space. A marker landing in one of
 * these sits on top of a compass rose or inside the legend box, which looks
 * exactly like a bug because it is one. clearings_test.mjs fails on it.
 */
export const CHROME: { x1: number; y1: number; x2: number; y2: number; what: string }[] = [
  { x1: 0, y1: 0, x2: 52, y2: 15, what: 'the title cartouche' },
  { x1: 80, y1: 0, x2: 100, y2: 24, what: 'the compass rose' },
  { x1: 0, y1: 68, x2: 36, y2: 100, what: 'the legend and scale bar' },
]

export function inChrome(x: number, y: number): string | null {
  for (const c of CHROME) {
    if (x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2) return c.what
  }
  return null
}

export const CLEARINGS: Record<string, Anchor[]> = {
  trailhead: [
    { x: 43, y: 65, where: 'linear functions' },
    { x: 70, y: 60, where: 'slope and intercept' },
    { x: 15, y: 42, where: 'systems of equations' },
    { x: 56, y: 51, where: 'word problems' },
    { x: 64, y: 20, where: 'graphing exercises' },
    { x: 77, y: 75, where: 'linear inequalities' },
    { x: 30, y: 26, where: 'practice drills' },
  ],
  'cedar-lake': [
    { x: 66, y: 70, where: 'polynomial functions' },
    { x: 53, y: 47, where: 'domain and range' },
    { x: 22, y: 62, where: 'function composition' },
    { x: 84, y: 40, where: 'function inverses' },
    { x: 45, y: 22, where: 'transformations' },
    { x: 70, y: 88, where: 'rational functions' },
    { x: 61, y: 30, where: 'applications' },
  ],
  'eagles-perch': [
    { x: 63, y: 38, where: 'angles and triangles' },
    { x: 45, y: 58, where: 'properties of shapes' },
    { x: 10, y: 46, where: 'area and perimeter' },
    { x: 53, y: 85, where: 'circle theorems' },
    { x: 74, y: 27, where: 'trigonometry' },
    { x: 86, y: 50, where: 'coordinate geometry' },
    { x: 33, y: 38, where: 'proofs and reasoning' },
  ],
  'the-hollow': [
    { x: 42, y: 37, where: 'main idea extraction' },
    { x: 53, y: 46, where: 'inference practice' },
    { x: 46, y: 65, where: 'vocabulary in context' },
    { x: 86, y: 43, where: 'rhetorical analysis' },
    { x: 74, y: 78, where: 'summarization' },
    { x: 29, y: 52, where: 'detail recognition' },
    { x: 62, y: 28, where: 'comparative reading' },
  ],
  'mirewood-marsh': [
    { x: 62, y: 63, where: 'the boardwalk' },
    { x: 79, y: 48, where: 'the open pools' },
    { x: 25, y: 58, where: 'the stand of pines' },
    { x: 57, y: 83, where: 'the winding channel' },
    { x: 55, y: 33, where: 'the mist on the far bank' },
    { x: 89, y: 77, where: 'the reed beds' },
    { x: 41, y: 48, where: 'the island of trees' },
  ],
  'moonlit-lake': [
    { x: 61, y: 47, where: 'the ruin on the island' },
    { x: 66, y: 72, where: "the moon's path on the water" },
    { x: 58, y: 11, where: 'the moon' },
    { x: 20, y: 44, where: 'the far shore pines' },
    { x: 89, y: 57, where: 'the headland' },
    { x: 37, y: 29, where: 'the mist on the hills' },
    { x: 82, y: 80, where: 'the dark water' },
  ],
  'northwatch-tower': [
    { x: 63, y: 30, where: 'the tower' },
    { x: 55, y: 55, where: 'the crag beneath it' },
    { x: 74, y: 83, where: 'the climbing trail' },
    { x: 29, y: 53, where: 'the pines on the shoulder' },
    { x: 20, y: 35, where: 'the far ranges' },
    { x: 66, y: 19, where: 'the flag on the battlement' },
    { x: 87, y: 62, where: 'the east slope' },
  ],
  'old-chapel-ruins': [
    { x: 58, y: 47, where: 'the great window' },
    { x: 76, y: 62, where: 'the fallen wall' },
    { x: 44, y: 59, where: 'the standing stones' },
    { x: 57, y: 88, where: 'the path through the grass' },
    { x: 20, y: 51, where: 'the birches' },
    { x: 53, y: 27, where: 'the ridge of trees' },
    { x: 65, y: 73, where: 'the low doorway' },
  ],
  'raven-falls': [
    { x: 44, y: 18, where: 'the head of the falls' },
    { x: 54, y: 67, where: 'the lower cascade' },
    { x: 57, y: 86, where: 'the plunge pool' },
    { x: 42, y: 50, where: 'the middle ledge' },
    { x: 86, y: 38, where: 'the trail on the far bank' },
    { x: 26, y: 33, where: 'the cliff beside the water' },
    { x: 75, y: 20, where: 'the pines on the rim' },
  ],
  'stonefall-ridge': [
    { x: 57, y: 18, where: 'the summit' },
    { x: 38, y: 58, where: 'the scree slope' },
    { x: 75, y: 65, where: 'the trail to the ridge' },
    { x: 20, y: 43, where: 'the pines on the shoulder' },
    { x: 65, y: 42, where: 'the rock band' },
    { x: 56, y: 91, where: 'the mist below' },
    { x: 87, y: 53, where: 'the east buttress' },
  ],
  'whispering-pines': [
    { x: 63, y: 53, where: 'the standing stones' },
    { x: 57, y: 69, where: 'the ring trail' },
    { x: 20, y: 39, where: 'the dense pines' },
    { x: 87, y: 42, where: 'the eastern stand' },
    { x: 61, y: 17, where: 'the ridge behind' },
    { x: 38, y: 33, where: 'the lone tall pine' },
    { x: 76, y: 85, where: 'the south path' },
  ],
  'the-storm': [
    { x: 45, y: 42, where: 'the ship at anchor' },
    { x: 60, y: 55, where: 'the rough water' },
    { x: 28, y: 65, where: 'the near waves' },
    { x: 72, y: 28, where: 'the cloud bank' },
    { x: 50, y: 18, where: 'the horizon line' },
    { x: 85, y: 60, where: 'the far swell' },
    { x: 35, y: 28, where: 'the mist' },
  ],
  'the-home-harbour': [
    { x: 50, y: 52, where: 'the harbour dock' },
    { x: 30, y: 65, where: 'the breakwater' },
    { x: 65, y: 68, where: 'the beach shore' },
    { x: 55, y: 25, where: 'the harbour mouth' },
    { x: 75, y: 48, where: 'the lighthouse' },
    { x: 25, y: 35, where: 'the tide pools' },
    { x: 68, y: 30, where: 'the headland' },
  ],
  'the-narrow-strait': [
    { x: 48, y: 45, where: 'the channel passage' },
    { x: 62, y: 55, where: 'the far shore' },
    { x: 35, y: 62, where: 'the near shore' },
    { x: 70, y: 28, where: 'the open water' },
    { x: 45, y: 20, where: 'the sky line' },
    { x: 28, y: 35, where: 'the rocky point' },
    { x: 58, y: 72, where: 'the deep water' },
  ],
  'coral-reef': [
    { x: 50, y: 50, where: 'the coral heads' },
    { x: 35, y: 65, where: 'the shallow shelf' },
    { x: 70, y: 60, where: 'the deep channel' },
    { x: 45, y: 30, where: 'the open sea' },
    { x: 65, y: 75, where: 'the beach break' },
    { x: 25, y: 40, where: 'the reef edge' },
    { x: 55, y: 20, where: 'the horizon' },
  ],
  'beach-shack': [
    { x: 45, y: 55, where: 'the shack' },
    { x: 60, y: 70, where: 'the beach' },
    { x: 30, y: 60, where: 'the water line' },
    { x: 50, y: 28, where: 'the palm trees' },
    { x: 70, y: 45, where: 'the dunes' },
    { x: 35, y: 40, where: 'the hammock grove' },
    { x: 65, y: 20, where: 'the open sky' },
  ],
  'island-peak': [
    { x: 55, y: 40, where: 'the summit' },
    { x: 45, y: 65, where: 'the base trail' },
    { x: 70, y: 55, where: 'the cliff face' },
    { x: 35, y: 30, where: 'the ridge line' },
    { x: 60, y: 20, where: 'the sky' },
    { x: 50, y: 75, where: 'the jungle' },
    { x: 75, y: 40, where: 'the overlook' },
  ],
  'carousel': [
    { x: 48, y: 50, where: 'the carousel horses' },
    { x: 30, y: 65, where: 'the ticket booth' },
    { x: 65, y: 60, where: 'the boardwalk' },
    { x: 45, y: 25, where: 'the open midway' },
    { x: 70, y: 35, where: 'the game stands' },
    { x: 35, y: 40, where: 'the cotton candy' },
    { x: 55, y: 72, where: 'the funnel cakes' },
  ],
  'ferris-wheel': [
    { x: 50, y: 45, where: 'the wheel hub' },
    { x: 65, y: 55, where: 'the wheel cars' },
    { x: 35, y: 60, where: 'the platform' },
    { x: 55, y: 25, where: 'the sky' },
    { x: 70, y: 70, where: 'the ground' },
    { x: 30, y: 35, where: 'the pier rail' },
    { x: 60, y: 75, where: 'the shoreline' },
  ],
  'base-camp': [
    { x: 50, y: 60, where: 'the camp tents' },
    { x: 35, y: 50, where: 'the trail head' },
    { x: 65, y: 55, where: 'the cliff' },
    { x: 48, y: 30, where: 'the peaks above' },
    { x: 70, y: 75, where: 'the valley floor' },
    { x: 25, y: 40, where: 'the rocky slope' },
    { x: 60, y: 20, where: 'the sky' },
  ],
  'summit': [
    { x: 50, y: 35, where: 'the peak' },
    { x: 60, y: 55, where: 'the ridge' },
    { x: 40, y: 65, where: 'the approach' },
    { x: 70, y: 40, where: 'the far range' },
    { x: 45, y: 20, where: 'the sky dome' },
    { x: 55, y: 75, where: 'the valley below' },
    { x: 30, y: 50, where: 'the scree field' },
  ],
  'visitor-center': [
    { x: 45, y: 55, where: 'the building' },
    { x: 60, y: 65, where: 'the parking area' },
    { x: 35, y: 45, where: 'the map board' },
    { x: 55, y: 25, where: 'the vista point' },
    { x: 70, y: 50, where: 'the trail start' },
    { x: 40, y: 35, where: 'the picnic area' },
    { x: 65, y: 75, where: 'the road' },
  ],
  'waterfall': [
    { x: 50, y: 42, where: 'the falls' },
    { x: 60, y: 65, where: 'the pool below' },
    { x: 35, y: 55, where: 'the trail' },
    { x: 70, y: 30, where: 'the cliff top' },
    { x: 45, y: 20, where: 'the sky' },
    { x: 55, y: 75, where: 'the streambed' },
    { x: 40, y: 40, where: 'the overlook' },
  ],
}

/**
 * A clearing with no authored anchors yet.
 *
 * Still a place rather than a list: the stops curve across the open middle
 * of the plate on a shallow arc, clear of the painted furniture. It is
 * honestly generic - the names say nothing about the ground, because
 * nobody has looked at that ground yet - but a student meets a scene with
 * stops in it rather than an empty level while the art is authored.
 */
export function fallbackAnchors(n: number): Anchor[] {
  const out: Anchor[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    out.push({
      x: 24 + t * 54,
      y: 54 - Math.sin(t * Math.PI) * 17,
      where: '',
    })
  }
  return out
}

export function anchorsFor(slug: string | null, n: number): Anchor[] {
  const authored = slug ? CLEARINGS[slug] : undefined
  if (!authored) return fallbackAnchors(n)
  if (authored.length >= n) return authored.slice(0, n)
  // More stops than authored ground. Keep every authored one - throwing
  // away seven good anchors because an eighth is missing would put the
  // whole clearing back on a generic arc - and give the remainder places
  // on a lower sweep, clear of the furniture and of each other.
  const out = [...authored]
  const extra = n - authored.length
  for (let i = 0; i < extra; i++) {
    const t = extra === 1 ? 0.5 : i / (extra - 1)
    out.push({ x: 40 + t * 34, y: 78 - Math.sin(t * Math.PI) * 6, where: '' })
  }
  return out
}

export function clearingArt(slug: string): string {
  // Ocean-themed clearings live in voyage folder
  if (['the-storm', 'the-home-harbour', 'the-narrow-strait'].includes(slug)) {
    return `art/voyage/${slug}.webp`
  }
  // Tropical, boardwalk, alpine, and park clearings use sites folder
  // (images will be sourced and placed there)
  return `art/sites/${slug}.webp`
}
