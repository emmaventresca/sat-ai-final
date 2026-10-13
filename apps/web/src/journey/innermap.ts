/**
 * The drawn map a land opens into, and the painted tile each place opens to.
 *
 * Zooming used to land on another photograph with the skills arranged in a
 * ring on top of it, which Emma called correctly: a circle of pods over a
 * backdrop is not a map. A real map has named places, paths between them, a
 * legend and a direction of travel - and on a drawn map the places are
 * already there to stand on.
 *
 * Three levels of artwork, then: the land's photograph, the forest map, and
 * the place's own painted plate. Walking into Moonlit Lake puts you at
 * Moonlit Lake.
 */
export interface MapPlace {
  /** The name printed on the map itself. */
  name: string
  /** Percentage position of that label on the artwork. */
  x: number
  y: number
  /** The place's own painted tile, for standing inside it. */
  slug: string
}

export interface InnerMap {
  src: string
  title: string
  /** The tagline lettered on the artwork, repeated for screen readers. */
  motto: string
  /** Walking order. A skill is dropped on each, in turn. */
  places: MapPlace[]
  /** Where the road enters, before the first place. */
  entry: [number, number]
  /** Where the road leaves, so the journey continues past the frame. */
  exit: [number, number]
}

/**
 * The Emberwood, read off the artwork.
 *
 * Ordered so the road never doubles back on itself: along the bottom from
 * west to east, back across the middle east to west, then along the top
 * west to east and out past the tower. A route that crosses its own line
 * reads as wandering rather than travelling.
 */
export const EMBERWOOD: InnerMap = {
  src: 'art/maps/emberwood.webp',
  title: 'The Emberwood Forest',
  motto: 'Some paths are found. Others find you.',
  entry: [2, 99],
  places: [
    { name: 'Trailhead', x: 19, y: 89, slug: 'trailhead' },
    { name: 'Cedar Lake', x: 38, y: 73, slug: 'cedar-lake' },
    { name: "Eagle's Perch", x: 61, y: 74, slug: 'eagles-perch' },
    { name: 'The Hollow', x: 91, y: 58, slug: 'the-hollow' },
    { name: 'Mirewood Marsh', x: 69, y: 45, slug: 'mirewood-marsh' },
    { name: 'Old Chapel Ruins', x: 46, y: 48, slug: 'old-chapel-ruins' },
    { name: 'Whispering Pines', x: 27, y: 36, slug: 'whispering-pines' },
    { name: 'Raven Falls', x: 14, y: 45, slug: 'raven-falls' },
    { name: 'Stonefall Ridge', x: 31, y: 13, slug: 'stonefall-ridge' },
    { name: 'Moonlit Lake', x: 63, y: 19, slug: 'moonlit-lake' },
    { name: 'Northwatch Tower', x: 90, y: 11, slug: 'northwatch-tower' },
  ],
  exit: [104, 4],
}

/** Where a place's own painted plate lives. */
export function siteArt(slug: string): string {
  return `art/sites/${slug}.webp`
}

/** Every land opens into a drawn map; for now they share this one. */
export function innerMapFor(_domain: string): InnerMap {
  return EMBERWOOD
}
