/**
 * The drawn map a land opens into.
 *
 * Zooming used to land on another photograph with the skills arranged in a
 * ring on top of it, which Emma called correctly: a circle of pods over a
 * backdrop is not a map, and the picture underneath was doing no work. A
 * real map has named places, paths between them, a legend and a direction
 * of travel - and on a drawn map the places are already there to stand on.
 *
 * So the inner level uses an illustrated map, and the skills are dropped
 * onto its actual locations in walking order: Trailhead first, then along
 * the paths, leaving by the far corner.
 */
export interface MapPlace {
  /** The name printed on the map itself. */
  name: string
  /** Percentage position of that label on the artwork. */
  x: number
  y: number
}

export interface InnerMap {
  src: string
  title: string
  /** The tagline lettered on the artwork, repeated for screen readers. */
  motto: string
  /** Walking order. A skill is dropped on each, in turn. */
  places: MapPlace[]
  /** Where the road leaves the frame, so the journey continues past it. */
  exit: [number, number]
  /** Where it enters, before the first place. */
  entry: [number, number]
}

/**
 * The Emberwood, read off the artwork.
 *
 * Ordered as a walk rather than as a list: in at the Trailhead bottom-left,
 * up through the lake and the ruins, over the ridge, and out past the tower
 * at the top right. Seven places, which is what Problem-Solving needs; a
 * land with fewer skills simply stops earlier along the same road.
 */
export const EMBERWOOD: InnerMap = {
  src: 'art/maps/emberwood.webp',
  title: 'The Emberwood Forest',
  motto: 'Some paths are found. Others find you.',
  entry: [4, 99],
  places: [
    { name: 'Trailhead', x: 19, y: 89 },
    { name: 'Cedar Lake', x: 38, y: 73 },
    { name: "Eagle's Perch", x: 61, y: 74 },
    { name: 'Old Chapel Ruins', x: 46, y: 48 },
    { name: 'Whispering Pines', x: 27, y: 36 },
    { name: 'Stonefall Ridge', x: 31, y: 13 },
    { name: 'Moonlit Lake', x: 63, y: 19 },
    { name: 'Mirewood Marsh', x: 69, y: 45 },
    { name: 'The Hollow', x: 91, y: 58 },
    { name: 'Northwatch Tower', x: 90, y: 11 },
  ],
  exit: [104, 4],
}

/** Every land opens into a drawn map; for now they share this one. */
export function innerMapFor(_domain: string): InnerMap {
  return EMBERWOOD
}
