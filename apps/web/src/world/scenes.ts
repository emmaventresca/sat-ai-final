import type { Terrain } from '../journey/map'

/**
 * The ten named places in each world, exactly as written in
 * docs/ART_DIRECTION.md.
 *
 * These are Emma's names and Emma's order, copied across rather than
 * invented: the art direction is the source of truth for this world and the
 * backdrops in journey/*Scenes.tsx are already drawn to these slots. The
 * index into each array IS the `slot` passed to <Poster>, so scene 3 of the
 * Elder Wood is the Elder Wood painting and cannot drift out of step.
 */
export const PLACES: Record<Terrain, readonly string[]> = {
  // SAT Math - From Countryside to Final Ascent.
  // Safe to epic, low to high, green to stone, in sequence.
  cliffs: [
    'The Green Country', 'The Long Road', 'The Elder Wood', 'The River Crossing',
    'The Watchtower', 'The High Pass', 'The White Silence', 'The Stair of Kings',
    'The Last Gate', 'The Final Ascent',
  ],
  // SAT English - The Great Sea Voyage.
  // Harbour -> open water -> strangeness -> the edge of the known.
  ocean: [
    'The Home Harbour', 'The Departure', 'The Misted Isles', 'The Singing Coast',
    'The Storm', 'The Drowned Ruins', 'The Cold Sea', 'The Narrow Strait',
    "The World's Edge", 'The Far Shore',
  ],
  // ACT Science - America the Beautiful. Named places, so each is unmistakable.
  park: [
    'Sequoia Grove', 'Yellowstone Geyser Basin', 'Grand Canyon',
    'Glacier National Park', 'Zion', 'Yosemite Valley', 'Sedona',
    'Acadia Coast', 'Great Smoky Mountains', 'Joshua Tree at Night',
  ],
  // ACT Reading - The World's Fair. 1893-1910, electric light as the attraction.
  fair: [
    'Grand Fair Entrance', 'The Ferris Wheel', 'The Midway',
    'Palace of Fine Arts', 'Industrial Exhibition', 'Transportation Pavilion',
    'The Fair at Night', 'Garden Exhibition', 'International Pavilion',
    'Ragtime Afternoon',
  ],
  // ACT English - Alpine Expedition. Above the treeline in all ten.
  peaks: [
    'Base Camp', 'Glacier Crossing', 'Mountain Ridge', 'Ice Wall',
    'Summit Push', 'Alpine Sunrise', 'Mountain Pass', 'Storm on the Mountain',
    'Frozen Lake', 'Above the Clouds',
  ],
  // ACT Math - Retro Hawaiian Vacation. A postcard someone kept.
  tropic: [
    'Waikiki Beach', 'Retro Hotel Pool', 'Hawaiian Sunset', 'Surf Shack',
    'Tropical Garden', 'Road to Hana', 'Volcanic Coast', 'Retro Tiki Resort',
    'Catamaran Day', 'Hawaiian Night',
  ],
}

/** The world's own name, as written in the art direction. */
export const WORLD_TITLE: Record<Terrain, string> = {
  cliffs: 'From Countryside to Final Ascent',
  ocean: 'The Great Sea Voyage',
  park: 'America the Beautiful',
  fair: "The World's Fair",
  peaks: 'Alpine Expedition',
  tropic: 'Retro Hawaiian Vacation',
}

/** The line of travel each world's progression describes. */
export const WORLD_ARC: Record<Terrain, string> = {
  cliffs: 'Safe to epic, low to high, green to stone.',
  ocean: 'Harbour, open water, strangeness, the edge of the known.',
  park: 'Named places, each one unmistakable.',
  fair: 'Beaux-Arts and ragtime, electric light as the attraction.',
  peaks: 'Above the treeline the whole way. Dark sky, blazing snow.',
  tropic: 'A postcard someone kept.',
}

export const SCENES_PER_WORLD = 10
