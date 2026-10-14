import type { Terrain } from './map'

/**
 * Where each land sits IN its photograph, and which photograph you arrive at.
 *
 * The pods used to float in a ring over a backdrop, which made the picture
 * wallpaper: nothing in it was the thing you clicked. Here a hotspot is
 * anchored to an actual feature - the meadow, the dark treeline, the ridge -
 * so clicking "The Grazed Valley" means clicking the valley.
 *
 * Coordinates are percentages of the photograph, authored by looking at each
 * picture. They cannot be derived, which is why they live in one small table
 * rather than being computed: a wrong guess puts a label on empty sky.
 *
 * `into` is the photograph you ARRIVE at, and it is deliberately a different
 * picture rather than a crop of the same one. Zooming a backdrop gets you
 * blur; cutting to a closer photograph of that kind of country is what makes
 * the move feel like travelling into it.
 */
export interface Spot {
  /** 0-100 across the photograph. */
  x: number
  /** 0-100 down it. */
  y: number
  /** Scene slug to show once you are inside. */
  into?: string
  /**
   * What this place is called, in THIS photograph.
   *
   * Per picture rather than per domain, because the name has to describe
   * what is actually there. "The Cliff Coast" was printed over a Spanish
   * pasture with no coast in it, which breaks the thing the map is for: if
   * the label does not match the ground, the photograph stops being a map
   * and goes back to being wallpaper.
   */
  name: string
}

/**
 * The photograph each land leads with.
 *
 * Named rather than taken from slot order, for two reasons. The hotspot
 * coordinates are authored against ONE picture, so the land must open on
 * that picture or every label lands somewhere arbitrary. And a full-bleed
 * hero has to be landscape: `object-fit: cover` on a 2:3 portrait crops to
 * the middle 29-71% of its height, so an authored y of 76 is on pixels
 * nobody can see. Adding the lighthouse photograph - a portrait - silently
 * became the sea world's hero and put "The Ship" on a lighthouse.
 */
export const HERO: Partial<Record<Terrain, string>> = {
  cliffs: 'the-green-country',
  ocean: 'the-departure',
  park: 'yosemite-valley',
  peaks: 'mountain-ridge',
  tropic: 'hawaiian-sunset',
  fair: 'the-boardwalk',
}

/**
 * The road, traced along the ground of each photograph.
 *
 * Curving straight between hotspots produced a loop floating over the
 * country - correct about where the places are and wrong about everything
 * between them. A road goes along the valley floor, up the slope, over the
 * saddle; it does not cut across a mountain.
 *
 * So these are waypoints read off the picture. They pass through every
 * hotspot in curriculum order and hug the terrain in between, which is what
 * stops the line looking stuck on top of the photograph.
 */
export const ROUTE: Partial<Record<Terrain, [number, number][]>> = {
  // Green Country: out along the pasture, up the left slope to the dark
  // peak, along the skyline saddle to the pale ridge, then down its flank
  // into the shadowed wood.
  cliffs: [
    [-5, 97], [8, 88], [16, 80], [16, 74],
    [27, 70], [36, 68], [46, 66],
    [57, 61], [66, 56], [72, 52],
    [75, 40], [74, 28], [76, 18],
    [86, 12], [97, 6], [106, 1],
  ],
  // The Departure: the near water, out past the ship's bow, along the
  // horizon under the cloud bank and back down the open swell.
  ocean: [
    [18, 72], [27, 66], [36, 57], [47, 46],
    [54, 36], [60, 28], [64, 24],
    [72, 33], [78, 46], [80, 70],
  ],
  // The Boardwalk: in off the bottom-left boards, past the carousel, along
  // the shopfronts, then up the deck to the wheel at the pier head and out
  // along the water. The deck itself does the work - it already recedes to
  // the wheel, so the road only has to follow the boards.
  // Retro Hawaii: in along the sand under the palms, up to the headland,
  // down to the open beach, out to the sail and back along the surf line to
  // the pool deck.
  tropic: [
    [-4, 70], [2, 66], [8, 62],
    [16, 60], [25, 58], [33, 58],
    [39, 64], [46, 72],
    [54, 66], [62, 60],
    [69, 70], [73, 77],
    [82, 70], [90, 62], [99, 58],
  ],
  fair: [
    [10, 99], [14, 86], [17, 72],
    [23, 67], [29, 62],
    [36, 57], [42, 52], [49, 46],
    [57, 55], [67, 62], [79, 66], [92, 69],
  ],
}

/** terrain -> domain name -> where it is and what is inside it. */
export const SPOTS: Record<Terrain, Record<string, Spot>> = {
  // THE GREEN COUNTRY. Placed so curriculum order IS the journey: in from
  // the bottom-left corner, up the pasture, through the wooded middle, onto
  // the rise and up to the sunlit ridge, then off the top-right corner. The
  // first version looped back on itself, which reads as a circuit rather
  // than a road to somewhere - and Geometry ending on the high ridge is
  // Emma's own note that geometry should be the peak.
  cliffs: {
    'Algebra': {
      x: 16, y: 74, name: 'The Grazed Valley', into: 'the-long-road' },
    'Advanced Math': {
      x: 46, y: 66, name: 'The Shadowed Wood', into: 'the-elder-wood' },
    'Problem-Solving and Data Analysis': {
      x: 72, y: 52, name: 'The Oak Rise', into: 'the-river-crossing' },
    'Geometry and Trigonometry': {
      x: 76, y: 18, name: 'The Pale Ridge', into: 'the-watchtower' },
  },

  // THE DEPARTURE. A tall ship on open water, high horizon, cloud bank
  // along it. Everything here is sea and sky, so everything is named for
  // sea and sky.
  ocean: {
    'Information and Ideas': {
      x: 47, y: 46, name: 'The Ship', into: 'the-storm' },
    'Craft and Structure': {
      x: 18, y: 72, name: 'The Near Water', into: 'the-home-harbour' },
    'Expression of Ideas': {
      x: 80, y: 70, name: 'The Open Swell', into: 'the-narrow-strait' },
    'Standard English Conventions': {
      x: 64, y: 24, name: 'The Cloud Bank', into: 'the-misted-isles' },
  },
  park: {
    'Interpretation of Data': {
      x: 30, y: 58, name: 'The Canyon Floor', into: 'zion' },
    'Scientific Investigation': {
      x: 68, y: 40, name: 'The Red Walls', into: 'grand-canyon' },
    'Evaluation of Models & Results': {
      x: 50, y: 74, name: 'The Valley Mouth', into: 'yosemite-valley' },
  },
  // THE BOARDWALK, at dusk. Three stops down one pier, placed by depth so
  // curriculum order is also the walk: the carousel is the thing you are
  // standing next to, the booths are halfway along, the wheel is the far end
  // you can see from anywhere. Nothing doubles back, because the boards do
  // not. Each name is a thing visibly in the photograph - if a student looks
  // for the carousel they find horses, not an empty stretch of deck.
  fair: {
    'Key Ideas & Details': {
      x: 17, y: 72, name: 'The Carousel' },
    'Craft & Structure': {
      x: 29, y: 62, name: 'The Painted Booths' },
    'Integration of Knowledge & Ideas': {
      x: 49, y: 46, name: 'The Great Wheel' },
  },
  peaks: {
    'Sentence Structure & Formation': {
      x: 34, y: 46, name: 'The Icefall', into: 'glacier-crossing' },
    'Punctuation': {
      x: 70, y: 36, name: 'The Cloud Line', into: 'glacier-crossing' },
    'Usage': {
      x: 52, y: 66, name: 'The Long Ridge', into: 'mountain-ridge' },
    'Production of Writing': {
      x: 20, y: 62, name: 'The Lower Slope', into: 'mountain-ridge' },
    'Knowledge of Language': {
      x: 82, y: 60, name: 'The Far Shoulder', into: 'mountain-ridge' },
  },
  // RETRO HAWAII, at sunset. This land used to open on the volcanic-coast
  // plate, which is a dark Na Pali valley with no coast in it - the same
  // mismatch Emma caught on the Spanish pasture - and it was dark enough
  // that four of six labels would have sat on unreadable rock. The sunset
  // plate carries six features anyone can point at, so all six domains get
  // a place instead of four plus a leftover.
  //
  // One of those four was keyed 'Math', a placeholder skill no question
  // carries any more, so it pointed at nothing.
  //
  // Order is the order the app lists the legs - most recognitions first -
  // and the walk runs left to right along the beach, weaving between the
  // shore and the water. x only ever increases, so the road cannot cross
  // itself however much it rises and falls.
  tropic: {
    'Geometry': {
      x: 8, y: 62, name: 'The Surf Shack', into: 'waikiki-beach' },
    'Functions': {
      x: 33, y: 58, name: 'The Headland', into: 'volcanic-coast' },
    'Statistics & Probability': {
      x: 46, y: 72, name: 'The Shallows' },
    'Algebra': {
      x: 62, y: 60, name: 'The Lone Sail' },
    'Integrating Essential Skills': {
      x: 73, y: 77, name: 'The Sun Path' },
    'Number & Quantity': {
      x: 90, y: 62, name: 'The Pool Deck' },
  },
}

/**
 * Spread anything with no authored spot around the frame.
 *
 * An unauthored land still has to be clickable, and a ring keeps labels off
 * each other. It is the fallback, not the design - a spot placed on a real
 * feature always beats one placed by arithmetic.
 */
export function fallbackSpot(i: number, n: number, name: string): Spot {
  if (n <= 1) return { x: 50, y: 52, name }
  const a = (i / n) * Math.PI * 2 - Math.PI / 2
  return { x: 50 + Math.cos(a) * 30, y: 52 + Math.sin(a) * 23, name }
}
