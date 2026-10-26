import type { Terrain } from './map'

/**
 * The world above the lands.
 *
 * Named `overworldPlaces` rather than `overworld` because `Overworld.tsx`
 * sits beside it and macOS cannot tell the two apart. That collision has
 * now cost this project three separate debugging sessions - digest.ts /
 * Digest.tsx, overture.ts / Overture.tsx, and this - so tests/casing_test
 * .mjs now fails the build on any new pair.
 *
 * Until now the exam page opened on a vertical list of plates - accurate,
 * and the one shape a world is not. This is the level above: one landscape
 * with the lands standing in it, so a student picks a place by looking at
 * it rather than by reading a column of cards.
 *
 * Placements are percentages read off the photograph by eye, the same way
 * places.ts does it and for the same reason: they cannot be derived, and a
 * guess puts a label on empty sky. Keyed by terrain rather than by section
 * id because terrain is what the rest of the map code is already keyed on.
 *
 * A world needs ONE photograph that honestly holds all of its lands. The
 * SAT has two and they are a coast and an ocean, which is a single picture.
 * The ACT has four - an alpine range, a tropical shore, a pier and a
 * national park - and no one landscape contains those without lying about
 * the geography. So the ACT has no world plate yet and falls back to the
 * atlas, which is the honest answer until there is art that earns it.
 */
export interface Landmark {
  /** 0-100 across the photograph. */
  x: number
  /** 0-100 down it. */
  y: number
  /** What this land is called, in THIS photograph. */
  name: string
  /** One line on the country, shown when the landmark is reached. */
  note: string
  /** Where the label sits relative to the point, so it never leaves frame. */
  side?: 'left' | 'right'
}

export interface World {
  /** Scene slug under public/art. */
  plate: string
  /** The plate's own pixel size. The frame must take its aspect ratio, or
   *  object-fit crops the picture and every landmark below moves. */
  w: number
  h: number
  /** The world's own name, engraved on it. */
  name: string
  lands: Partial<Record<Terrain, Landmark>>
  /** Said under the title, where the plate needs explaining. */
  note?: string
  /** The plate already letters its own places, so draw no text labels. */
  named?: boolean
}

/**
 * The six realms, as the board draws them.
 *
 * One plate serves both exams. Overworld only renders a landmark for a
 * region the current exam actually has, so a student on the SAT sees two
 * pins and a student on the ACT sees four - the map shows the whole world
 * either way, which is what a world map is for, and neither can reach the
 * other exam's work from it.
 *
 * Coordinates sit on the emblems the plate already paints. `named: true`
 * turns this world's own text labels off: the picture names its realms in
 * its own lettering, and printing them again beside each pin is the
 * doubled-label mistake, not a belt-and-braces.
 */
const REALMS: Partial<Record<Terrain, Landmark>> = {
  ocean: {
    x: 23, y: 33, side: 'right',
    name: 'SAT English',
    note: 'The green country of words. Four chapters.',
  },
  cliffs: {
    x: 59, y: 31, side: 'left',
    name: 'SAT Math',
    note: 'High rock and thin air. Four chapters.',
  },
  peaks: {
    x: 17, y: 62, side: 'right',
    name: 'ACT English',
    note: 'The red hills. Five chapters.',
  },
  tropic: {
    x: 42, y: 85, side: 'right',
    name: 'ACT Math',
    note: 'The golden lowlands. Six chapters.',
  },
  fair: {
    x: 65, y: 62, side: 'left',
    name: 'ACT Reading',
    note: 'The violet coast. Three chapters.',
  },
  park: {
    x: 84, y: 75, side: 'left',
    name: 'ACT Science',
    note: 'The far green isles. Three chapters.',
  },
}

const PLATE = {
  plate: 'art/worlds/the-realm-of-knowledge.webp',
  w: 2060,
  h: 950,
  name: 'The Realm of Knowledge',
  named: true,
}

export const WORLDS: Record<string, World> = {
  sat: { ...PLATE, lands: REALMS },
  act: { ...PLATE, lands: REALMS },
}

export function worldFor(exam: string): World | undefined {
  return WORLDS[exam]
}

/** Untouched, under way, or walked. Nothing here is ever locked: this app
 *  does not hide levels, and a land a student cannot see is a land they
 *  cannot ask for. */
export type Standing = 'new' | 'walking' | 'walked'

export function standingOf(cleared: number, stages: number): Standing {
  if (stages > 0 && cleared >= stages) return 'walked'
  return cleared > 0 ? 'walking' : 'new'
}
