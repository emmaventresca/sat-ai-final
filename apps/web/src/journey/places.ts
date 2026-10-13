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
  tropic: 'volcanic-coast',
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
    [20, 60], [26, 55], [31, 47], [29, 36], [25, 27], [23, 19],
    [31, 21], [40, 25], [50, 27], [60, 24], [71, 20],
    [74, 31], [77, 44], [77, 55], [74, 64],
  ],
  // The Departure: the near water, out past the ship's bow, along the
  // horizon under the cloud bank and back down the open swell.
  ocean: [
    [18, 72], [27, 66], [36, 57], [47, 46],
    [54, 36], [60, 28], [64, 24],
    [72, 33], [78, 46], [80, 70],
  ],
}

/** terrain -> domain name -> where it is and what is inside it. */
export const SPOTS: Record<Terrain, Record<string, Spot>> = {
  // THE GREEN COUNTRY. Read off the photograph: a lit oak-dotted pasture
  // filling the lower left, a deep shadowed wooded ravine on the right, a
  // dark peak on the back left, a pale sunlit ridge on the back right.
  // There is no coast anywhere in it.
  cliffs: {
    'Algebra': {
      x: 20, y: 60, name: 'The Grazed Valley', into: 'the-long-road' },
    'Advanced Math': {
      x: 23, y: 19, name: 'The Dark Peak', into: 'the-high-pass' },
    'Problem-Solving and Data Analysis': {
      x: 74, y: 64, name: 'The Shadowed Wood', into: 'the-elder-wood' },
    'Geometry and Trigonometry': {
      x: 71, y: 20, name: 'The Pale Ridge', into: 'the-watchtower' },
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
  fair: {},
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
  tropic: {
    'Algebra': { x: 28, y: 60, name: 'The Green Cleft', into: 'volcanic-coast' },
    'Math': { x: 62, y: 44, name: 'The Lit Ridge', into: 'volcanic-coast' },
    'Geometry': { x: 44, y: 72, name: 'The Deep Valley', into: 'waikiki-beach' },
    'Functions': { x: 76, y: 56, name: 'The Far Spur', into: 'waikiki-beach' },
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
