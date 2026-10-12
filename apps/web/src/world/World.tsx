import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tier } from '../exams/types'
import type { Chapter, Leg, Region, Stage, Terrain } from '../journey/map'
import { Poster } from '../journey/Scene'
import { PLACES, SCENES_PER_WORLD, WORLD_ARC, WORLD_TITLE } from './scenes'
import { Walker } from './Walker'
import { Minimap } from './Minimap'
import './world.css'

/**
 * A world you walk through, rather than a dashboard with gamification on it.
 *
 * The brief was explicit that the existing creative direction is the source
 * of truth, so nothing here invents a place. Each world's ten named scenes
 * from docs/ART_DIRECTION.md are its ten SCREENS, in Emma's order, drawn by
 * the backdrop already painted for that slot. Walking off the right edge of
 * The Green Country puts you on The Long Road because that is the order she
 * wrote; the code cannot reorder them.
 *
 * The curriculum is laid along the road rather than bolted beside it: a
 * region's recognitions are dealt out across its ten screens in order, so a
 * marker you meet on The Elder Wood is a real recognition from the real
 * bank, and entering it starts the real round. There is no separate "game
 * progress" to drift out of step with what the student has actually done -
 * a marker is lit because that recognition is cleared, full stop.
 */

/**
 * Where a stop stands on its screen: across, and how far back.
 *
 * Depth matters because movement is free rather than on rails. Markers on
 * one line read as a menu; markers at different distances read as a place
 * you walk into. `z` is 0 at the front of the ground plane and 100 at the
 * back.
 */
const SPOTS: [number, number][] = [
  [20, 18], [36, 62], [52, 10], [68, 54], [84, 26],
]

export interface WorldStop {
  key: string
  stage: Stage
  leg: Leg
  chapter: Chapter
}

/** Deal a region's recognitions across its ten screens, in order. */
export function layOut(region: Region): WorldStop[][] {
  const flat: WorldStop[] = []
  for (const chapter of region.chapters) {
    for (const leg of chapter.legs) {
      for (const stage of leg.stages) {
        flat.push({ key: `${chapter.id}|${leg.skill}|${stage.subtype}`, stage, leg, chapter })
      }
    }
  }
  const screens: WorldStop[][] = Array.from({ length: SCENES_PER_WORLD }, () => [])
  if (!flat.length) return screens
  // Spread rather than chunk: a world with 12 recognitions should put one on
  // most screens, not pile eleven on the first and leave nine empty.
  flat.forEach((s, i) => {
    const screen = Math.min(
      SCENES_PER_WORLD - 1,
      Math.floor((i / flat.length) * SCENES_PER_WORLD),
    )
    screens[screen].push(s)
  })
  return screens
}

/** The ground plane: where it starts up the frame, and how deep it runs. */
const GROUND = 10
const DEPTH = 0.17

export function World({ region, onEnter, onLeave }: {
  region: Region
  onEnter: (leg: Leg, subtype: string, tier: Tier | null) => void
  onLeave: () => void
}) {
  const terrain = region.terrain as Terrain
  const screens = useMemo(() => layOut(region), [region])

  const [at, setAt] = useState(0)            // which of the ten screens
  const [x, setX] = useState(12)             // across, 0-100
  const [z, setZ] = useState(26)             // into the scene, 0 near - 100 far
  const [facing, setFacing] = useState<1 | -1>(1)
  const [moving, setMoving] = useState(false)
  const held = useRef<Set<string>>(new Set())
  const frame = useRef<number | null>(null)

  const here = screens[at] ?? []
  // The marker you are standing on, if any. Generous radius: hunting for a
  // pixel is not exploring.
  const near = useMemo<WorldStop | null>(() => {
    let bestStop: WorldStop | null = null
    let bestD = Infinity
    here.forEach((stop, i) => {
      const [sx, sz] = SPOTS[i % SPOTS.length]
      // Distance in both axes, with depth weighted lower because the ground
      // plane is foreshortened - a step back covers less ground than a step
      // sideways, and the radius should feel the same to walk into.
      const d = Math.hypot(sx - x, (sz - z) * 0.55)
      if (d < 9 && d < bestD) { bestStop = stop; bestD = d }
    })
    return bestStop
  }, [here, x, z])

  const step = useCallback(() => {
    const keys = held.current
    const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A')
    const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D')
    const back = keys.has('ArrowUp') || keys.has('w') || keys.has('W')
    const fwd = keys.has('ArrowDown') || keys.has('s') || keys.has('S')

    if (back !== fwd) {
      setZ((p) => Math.max(0, Math.min(100, p + (back ? 1.1 : -1.1))))
    }
    if (left === right) { setMoving(back !== fwd); return }
    const dir = right ? 1 : -1
    setFacing(dir)
    setMoving(true)
    setX((prev) => {
      const next = prev + dir * 0.9
      // Walking off an edge is how you travel. The world's order is the art
      // direction's order, so this is the progression itself.
      if (next > 97) {
        if (at < SCENES_PER_WORLD - 1) { setAt(at + 1); return 4 }
        return 97
      }
      if (next < 3) {
        if (at > 0) { setAt(at - 1); return 96 }
        return 3
      }
      return next
    })
  }, [at])

  useEffect(() => {
    function loop() { step(); frame.current = requestAnimationFrame(loop) }
    frame.current = requestAnimationFrame(loop)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [step])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'Escape') { onLeave(); return }
      if (e.key === 'Enter' || e.key === ' ') {
        if (near) { e.preventDefault(); onEnter(near.leg, near.stage.subtype, null) }
        return
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'a', 'A', 'd', 'D', 'w', 'W', 's', 'S'].includes(e.key)) {
        e.preventDefault()
        held.current.add(e.key)
      }
    }
    function up(e: KeyboardEvent) { held.current.delete(e.key) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [near, onEnter, onLeave])

  const cleared = here.filter((s) => s.stage.cleared).length
  return (
    <div className={`world world-${terrain}`}>
      <div className="world-art"><Poster terrain={terrain} slot={at} /></div>
      <div className="world-haze" aria-hidden="true" />

      <header className="world-hud">
        <button className="world-x" onClick={onLeave}>&larr; Leave</button>
        <div className="world-where">
          <strong>{PLACES[terrain][at]}</strong>
          <span>{WORLD_TITLE[terrain]} &middot; {at + 1} of {SCENES_PER_WORLD}</span>
        </div>
        <div className="world-tally">
          {region.cleared}/{region.stages}
          <span>stops</span>
        </div>
      </header>

      <div className="world-ground" aria-hidden="true" />

      {here.map((stop, i) => {
        const [sx, sz] = SPOTS[i % SPOTS.length]
        const active = near?.key === stop.key
        return (
          <button key={stop.key}
            className={`world-stop${stop.stage.cleared ? ' done' : ''}${active ? ' near' : ''}`}
            style={{
              left: `${sx}%`,
              bottom: `${GROUND + sz * DEPTH}%`,
              // Further away is smaller. Without this the depth is a lie the
              // eye catches immediately.
              transform: `translate(-50%, 0) scale(${1 - sz * 0.0042})`,
              zIndex: 2 + Math.round(100 - sz),
            }}
            onClick={() => onEnter(stop.leg, stop.stage.subtype, null)}>
            <span className="world-stop-pin" />
            <span className="world-stop-name">{stop.stage.name}</span>
          </button>
        )
      })}

      <div className="world-walker"
        style={{
          left: `${x}%`,
          bottom: `${GROUND + z * DEPTH}%`,
          transform: `translate(-50%, 0) scale(${1 - z * 0.0042})`,
          zIndex: 2 + Math.round(100 - z),
        }}>
        <Walker facing={facing} moving={moving} />
      </div>

      {near ? (
        <div className="world-prompt">
          <strong>{near.stage.name}</strong>
          <span className="world-prompt-d">
            {near.stage.tests || `${near.leg.name} · ${near.chapter.name}`}
          </span>
          <span className="world-prompt-k">
            {near.stage.left} left · press <kbd>Enter</kbd>
          </span>
        </div>
      ) : (
        <p className="world-hint">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to walk
          {here.length > 0 && ` · ${cleared}/${here.length} here`}
          {at < SCENES_PER_WORLD - 1 && ' · keep going right to travel on'}
        </p>
      )}

      <Minimap terrain={terrain} screens={screens} at={at} x={x} z={z}
        onJump={(n) => { setAt(n); setX(10); setZ(26) }} />

      <p className="world-arc">{WORLD_ARC[terrain]}</p>
    </div>
  )
}

export { PLACES, WORLD_TITLE }
