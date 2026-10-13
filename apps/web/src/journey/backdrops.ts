import type { Exam } from '../exams/types'
import { terrainFor, type Terrain } from './map'

/**
 * Sixty background artworks, one per theme per slot.
 *
 * These are IMAGE ASSETS, not drawings made in code. The previous approach -
 * authoring each scene as SVG paths - is why four attempts landed somewhere
 * between "abstract blobs" and "a nice gradient": vector shapes cannot carry
 * texture, painterly edges, or the accumulated imperfection that makes an
 * illustrated environment read as a place.
 *
 * So this module knows about files. It does not draw anything.
 *
 * The slots exist whether or not the artwork does. A slot with no asset is
 * `placeholder: true` and renders the old SVG scene, clearly marked, so it is
 * always obvious which of the sixty are real. Nothing silently substitutes a
 * gradient for a missing painting - that failure mode is how you end up
 * shipping forty placeholders believing they are art.
 *
 * Drop a file at the documented path and it becomes real on the next build.
 * See docs/ART_DIRECTION.md for what each slot is a picture of.
 */

export const SLOTS = 10

/** The six themes, in the order the art direction document lists them. */
export const THEME: Record<Terrain, { id: string; name: string; section: string }> = {
  cliffs: { id: 'quest', name: 'From Countryside to Final Ascent', section: 'SAT Math' },
  ocean: { id: 'voyage', name: 'The Great Sea Voyage', section: 'SAT Reading & Writing' },
  park: { id: 'parks', name: 'America the Beautiful', section: 'ACT Science' },
  fair: { id: 'boardwalk', name: 'The Boardwalk', section: 'ACT Reading' },
  peaks: { id: 'alpine', name: 'Alpine Expedition', section: 'ACT English' },
  tropic: { id: 'hawaii', name: 'Retro Hawaiian Vacation', section: 'ACT Math' },
}

export interface Backdrop {
  terrain: Terrain
  /** 1-10, matching the art direction table. */
  slot: number
  /** Short name of the scene, for alt text and the manifest. */
  scene: string
  /** Where the artwork lives, relative to the published base. */
  src: string
  /** True while no artwork exists for this slot. */
  placeholder: boolean
}

/**
 * What each slot is a picture of.
 *
 * Kept here rather than in a JSON file so a missing or misspelled slot is a
 * compile error. Sixty strings is small; sixty silent mismatches is not.
 */
const SCENES: Record<Terrain, string[]> = {
  cliffs: [
    'the-green-country', 'the-long-road', 'the-elder-wood', 'the-river-crossing',
    'the-watchtower', 'the-high-pass', 'the-white-silence', 'the-stair-of-kings',
    'the-last-gate', 'the-final-ascent',
  ],
  ocean: [
    'the-home-harbour', 'the-departure', 'the-misted-isles', 'the-singing-coast',
    'the-storm', 'the-drowned-ruins', 'the-cold-sea', 'the-narrow-strait',
    'the-worlds-edge', 'the-far-shore',
  ],
  park: [
    'sequoia-grove', 'yellowstone-geyser-basin', 'grand-canyon', 'glacier',
    'zion', 'yosemite-valley', 'sedona', 'acadia-coast',
    'great-smoky-mountains', 'joshua-tree-night',
  ],
  fair: [
    'the-boardwalk', 'the-ferris-wheel', 'the-pier', 'the-arcade',
    'under-the-pier', 'the-beach-at-dusk', 'the-carousel', 'the-bandstand',
    'the-boardwalk-at-night', 'sunrise-on-the-boards',
  ],
  peaks: [
    'base-camp', 'glacier-crossing', 'mountain-ridge', 'ice-wall',
    'summit-push', 'alpine-sunrise', 'mountain-pass', 'storm-on-the-mountain',
    'frozen-lake', 'above-the-clouds',
  ],
  tropic: [
    'waikiki-beach', 'retro-hotel-pool', 'hawaiian-sunset', 'surf-shack',
    'tropical-garden', 'road-to-hana', 'volcanic-coast', 'retro-tiki-resort',
    'catamaran-day', 'hawaiian-night',
  ],
}

/**
 * Which slots have real artwork.
 *
 * Add the terrain's scene slug here when its file lands in
 * `public/art/<theme>/<scene>.webp`. Deliberately a manual list rather than a
 * filesystem probe: a build that silently picks up a half-finished render is
 * worse than one that waits to be told.
 */
const SHIPPED = new Set<string>([
  'alpine/glacier-crossing',
  'alpine/mountain-ridge',
  'boardwalk/the-boardwalk-at-night',
  'hawaii/volcanic-coast',
  'hawaii/waikiki-beach',
  'parks/grand-canyon',
  'parks/sequoia-grove',
  'parks/yosemite-valley',
  'parks/zion',
  'quest/the-elder-wood',
  'quest/the-green-country',
  'quest/the-high-pass',
  'quest/the-long-road',
  'quest/the-river-crossing',
  'quest/the-stair-of-kings',
  'quest/the-watchtower',
  'quest/the-white-silence',
  'voyage/the-departure',
  'voyage/the-far-shore',
  'voyage/the-home-harbour',
  'voyage/the-misted-isles',
  'voyage/the-narrow-strait',
  'voyage/the-storm',
])

export function backdropFor(exam: Exam, section: string, seed: string): Backdrop {
  const terrain = terrainFor(exam, section)
  return backdrop(terrain, slotOf(seed))
}

export function backdrop(terrain: Terrain, slot: number): Backdrop {
  const i = Math.max(0, Math.min(SLOTS - 1, slot))
  const theme = THEME[terrain].id
  const scene = SCENES[terrain][i]
  const key = `${theme}/${scene}`
  return {
    terrain,
    slot: i + 1,
    scene,
    src: `${import.meta.env.BASE_URL}art/${key}.webp`,
    placeholder: !SHIPPED.has(key),
  }
}

/** A stable slot from a question id, so one question is one place. */
export function slotOf(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % SLOTS
}

/** Every slot, for a contact sheet or a progress check. */
export function allBackdrops(): Backdrop[] {
  return (Object.keys(THEME) as Terrain[])
    .flatMap((t) => Array.from({ length: SLOTS }, (_, i) => backdrop(t, i)))
}

/** How much of the artwork actually exists. */
export function artProgress(): { done: number; total: number } {
  const all = allBackdrops()
  return { done: all.filter((b) => !b.placeholder).length, total: all.length }
}

/**
 * The real photographs a world actually has, in slot order.
 *
 * The atlas leads each world with a picture, and a world with no artwork
 * yet must not lead with a blank frame - so this returns only what exists
 * and the caller decides what to do when the list is empty.
 */
export function realBackdrops(terrain: Terrain): Backdrop[] {
  return Array.from({ length: SLOTS }, (_, i) => backdrop(terrain, i))
    .filter((b) => !b.placeholder)
}
