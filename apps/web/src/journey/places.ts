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
}

/** terrain -> domain name -> where it is and what is inside it. */
export const SPOTS: Record<Terrain, Record<string, Spot>> = {
  // The Green Country: meadows across the lower half, wooded slopes right,
  // blue ridges along the skyline.
  cliffs: {
    'Algebra': { x: 24, y: 63, into: 'the-long-road' },
    'Advanced Math': { x: 76, y: 34, into: 'the-stair-of-kings' },
    'Problem-Solving and Data Analysis': { x: 58, y: 72, into: 'the-river-crossing' },
    'Geometry and Trigonometry': { x: 44, y: 22, into: 'the-watchtower' },
  },
  // The Departure: a tall ship on open water under a high horizon.
  ocean: {
    'Information and Ideas': { x: 47, y: 44, into: 'the-storm' },
    'Craft and Structure': { x: 20, y: 70, into: 'the-far-shore' },
    'Expression of Ideas': { x: 78, y: 66, into: 'the-far-shore' },
    'Standard English Conventions': { x: 66, y: 26, into: 'the-storm' },
  },
  park: {
    'Interpretation of Data': { x: 30, y: 58, into: 'zion' },
    'Scientific Investigation': { x: 68, y: 40, into: 'grand-canyon' },
    'Evaluation of Models & Results': { x: 50, y: 74, into: 'yosemite-valley' },
  },
  fair: {},
  peaks: {
    'Sentence Structure & Formation': { x: 34, y: 46, into: 'glacier-crossing' },
    'Punctuation': { x: 70, y: 36, into: 'glacier-crossing' },
    'Usage': { x: 52, y: 66, into: 'mountain-ridge' },
    'Production of Writing': { x: 20, y: 62, into: 'mountain-ridge' },
    'Knowledge of Language': { x: 82, y: 60, into: 'mountain-ridge' },
  },
  tropic: {
    'Algebra': { x: 28, y: 60, into: 'volcanic-coast' },
    'Math': { x: 62, y: 44, into: 'volcanic-coast' },
    'Geometry': { x: 44, y: 72, into: 'waikiki-beach' },
    'Functions': { x: 76, y: 56, into: 'waikiki-beach' },
  },
}

/**
 * Spread anything with no authored spot around the frame.
 *
 * An unauthored land still has to be clickable, and a ring keeps labels off
 * each other. It is the fallback, not the design - a spot placed on a real
 * feature always beats one placed by arithmetic.
 */
export function fallbackSpot(i: number, n: number): Spot {
  if (n <= 1) return { x: 50, y: 52 }
  const a = (i / n) * Math.PI * 2 - Math.PI / 2
  return { x: 50 + Math.cos(a) * 30, y: 52 + Math.sin(a) * 23 }
}
