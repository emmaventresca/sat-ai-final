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

/**
 * The Misted Isles: ocean-themed inner map for SAT English domains.
 *
 * Four water-based locations with nautical names, ordered for coastal travel.
 * Each clearing points to a voyage-themed site.
 */
export const MISTED_ISLES: InnerMap = {
  src: 'art/voyage/the-misted-isles.webp',
  title: 'The Misted Isles',
  motto: 'Water runs deep. Some currents guide, others pull.',
  entry: [5, 50],
  places: [
    { name: 'The Home Harbour', x: 22, y: 60, slug: 'the-home-harbour' },
    { name: 'The Ship', x: 48, y: 48, slug: 'the-storm' },
    { name: 'The Narrow Strait', x: 72, y: 55, slug: 'the-narrow-strait' },
    { name: 'The Open Swell', x: 88, y: 45, slug: 'the-open-swell' },
  ],
  exit: [95, 50],
}

/**
 * The Tropical Isles: tropical/island inner map for ACT Math domains.
 * Beach, resort, and island locations.
 */
export const TROPICAL_ISLES: InnerMap = {
  src: 'art/maps/tropical-isles.webp',
  title: 'The Tropical Isles',
  motto: 'Where waters warm and trade winds blow.',
  entry: [8, 72],
  places: [
    { name: 'The Coral Reef', x: 28, y: 68, slug: 'coral-reef' },
    { name: 'The Beach Shack', x: 45, y: 75, slug: 'beach-shack' },
    { name: 'The Island Peak', x: 62, y: 48, slug: 'island-peak' },
    { name: 'The Palm Grove', x: 78, y: 65, slug: 'palm-grove' },
    { name: 'The Lagoon', x: 52, y: 32, slug: 'lagoon' },
    { name: 'The Sunset Point', x: 85, y: 42, slug: 'sunset-point' },
  ],
  exit: [95, 55],
}

/**
 * The Boardwalk: pier/beach town inner map for ACT Reading domains.
 * Amusement park, shops, and waterfront locations.
 */
export const BOARDWALK_MAP: InnerMap = {
  src: 'art/maps/boardwalk.webp',
  title: 'The Boardwalk',
  motto: 'Where the town meets the sea.',
  entry: [5, 52],
  places: [
    { name: 'The Carousel', x: 22, y: 60, slug: 'carousel' },
    { name: 'The Game Arcade', x: 38, y: 65, slug: 'game-arcade' },
    { name: 'The Ferris Wheel', x: 55, y: 55, slug: 'ferris-wheel' },
    { name: 'The Pier Head', x: 72, y: 62, slug: 'pier-head' },
  ],
  exit: [92, 50],
}

/**
 * The Alpine Peaks: mountain/alpine inner map for SAT Math & ACT English.
 * Rocky peaks, trails, and mountain locations.
 */
export const ALPINE_PEAKS: InnerMap = {
  src: 'art/maps/alpine-peaks.webp',
  title: 'The Alpine Peaks',
  motto: 'Thin air, high stone, and paths that teach.',
  entry: [15, 85],
  places: [
    { name: 'The Base Camp', x: 25, y: 75, slug: 'base-camp' },
    { name: 'The Ridge Trail', x: 45, y: 60, slug: 'ridge-trail' },
    { name: 'The Summit', x: 65, y: 35, slug: 'summit' },
    { name: 'The Glacier Pass', x: 55, y: 50, slug: 'glacier-pass' },
  ],
  exit: [78, 28],
}

/**
 * The National Park: wilderness/park inner map for ACT Science.
 * Canyon, forest, and wildlife locations.
 */
export const NATIONAL_PARK: InnerMap = {
  src: 'art/maps/national-park.webp',
  title: 'The National Park',
  motto: 'Stone, water, sky—the earth speaks here.',
  entry: [8, 68],
  places: [
    { name: 'The Visitor Center', x: 20, y: 62, slug: 'visitor-center' },
    { name: 'The Canyon Rim', x: 42, y: 48, slug: 'canyon-rim' },
    { name: 'The Forest Trail', x: 62, y: 65, slug: 'forest-trail' },
    { name: 'The Waterfall', x: 75, y: 55, slug: 'waterfall' },
  ],
  exit: [88, 42],
}

/** Every land opens into a drawn map; router picks by exam section and domain. */
export function innerMapFor(domain: string): InnerMap {
  // SAT English (ocean) domains
  if (['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'].includes(domain)) {
    return MISTED_ISLES
  }
  // ACT Math (tropical) domains
  if (['Geometry', 'Functions', 'Statistics & Probability', 'Algebra', 'Integrating Essential Skills', 'Number & Quantity'].includes(domain)) {
    return TROPICAL_ISLES
  }
  // ACT Reading (boardwalk) domains
  if (['Key Ideas & Details', 'Craft & Structure', 'Integration of Knowledge & Ideas'].includes(domain)) {
    return BOARDWALK_MAP
  }
  // ACT Science (park) domains
  if (['Interpretation of Data', 'Scientific Investigation', 'Evaluation of Models & Results'].includes(domain)) {
    return NATIONAL_PARK
  }
  // Default: alpine for SAT Math and other alpine domains
  return ALPINE_PEAKS
}
