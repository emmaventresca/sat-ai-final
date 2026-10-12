import type { Terrain } from '../journey/map'
import { PLACES, SCENES_PER_WORLD } from './scenes'
import type { WorldStop } from './World'

/**
 * The map in the corner, so you can never be lost.
 *
 * Free movement without a map is how an explorable world turns into a
 * frustrating one: you wander, you miss two lessons, and you cannot tell
 * whether there is anything left here or you should move on. So the map
 * answers exactly three questions, always, without being opened:
 *
 *   Where am I?            the lit screen, and a dot inside it
 *   What is still here?    unvisited markers pulse; cleared ones are solid
 *   Where is the next one? the nearest unfinished screen is called out
 *
 * It is the whole world, not a viewport window. Ten screens is small enough
 * to show entirely, and a map you have to scroll is a second thing to get
 * lost in.
 */
export function Minimap({ terrain, screens, at, x, z, onJump }: {
  terrain: Terrain
  screens: WorldStop[][]
  at: number
  /** Player position within the current screen, 0-100. */
  x: number
  z: number
  onJump: (screen: number) => void
}) {
  const nextUnfinished = screens.findIndex(
    (s, i) => i >= at && s.some((stop) => !stop.stage.cleared))
  const anyLeft = screens.findIndex((s) => s.some((stop) => !stop.stage.cleared))
  const target = nextUnfinished === -1 ? anyLeft : nextUnfinished

  return (
    <aside className="minimap" aria-label="Map of this world">
      <h3 className="minimap-h">Map</h3>
      <ol className="minimap-list">
        {Array.from({ length: SCENES_PER_WORLD }, (_, i) => {
          const stops = screens[i] ?? []
          const done = stops.filter((s) => s.stage.cleared).length
          const fresh = stops.some((s) => !s.stage.cleared)
          const isHere = i === at
          return (
            <li key={i}>
              <button
                className={`minimap-row${isHere ? ' here' : ''}`
                  + `${stops.length === 0 ? ' empty' : ''}`}
                onClick={() => onJump(i)}
                aria-current={isHere ? 'true' : undefined}>
                <span className="minimap-n">{i + 1}</span>
                <span className="minimap-name">{PLACES[terrain][i]}</span>
                {stops.length > 0 && (
                  <span className={`minimap-pips${fresh ? ' fresh' : ''}`}>
                    {done}/{stops.length}
                  </span>
                )}
              </button>

              {/* You-are-here: the player's own position inside this screen,
                  so the map moves while you walk rather than only when you
                  cross a boundary. */}
              {isHere && (
                <span className="minimap-you" aria-hidden="true">
                  <i style={{ left: `${x}%`, bottom: `${8 + z * 0.5}%` }} />
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {target !== -1 && target !== at && (
        <p className="minimap-next">
          Next lesson: <strong>{PLACES[terrain][target]}</strong>
          <span>{target > at ? 'keep going right' : 'back to the left'}</span>
        </p>
      )}
      {target === at && (
        <p className="minimap-next here">Lessons here &mdash; look for the pins.</p>
      )}
      {target === -1 && (
        <p className="minimap-next done">Every stop in this world is cleared.</p>
      )}
    </aside>
  )
}
