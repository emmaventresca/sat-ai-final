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
  /** The world's own name, engraved on it. */
  name: string
  lands: Partial<Record<Terrain, Landmark>>
}

export const WORLDS: Record<string, World> = {
  sat: {
    plate: 'art/voyage/the-far-shore.webp',
    name: 'The Far Shore',
    lands: {
      // The headland filling the left of the frame: high ground, bracken,
      // a cliff falling into the water. The maths land is already the
      // green country, and this is the same country seen from the sea.
      cliffs: {
        x: 15, y: 46, side: 'right',
        name: 'The Cliff Country',
        note: 'High ground and long views. Four chapters inland.',
      },
      // Open water to the right, where the voyage goes. Reading and
      // Writing is the sea world, and this is the water it sails.
      ocean: {
        x: 74, y: 58, side: 'left',
        name: 'The Open Water',
        note: 'Out past the headland. Four chapters, and the horizon.',
      },
    },
  },
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
