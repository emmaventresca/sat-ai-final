import { useEffect, useRef, useState } from 'react'
import './rite.css'

/**
 * The moment a stop is cleared.
 *
 * A lantern on the trail catches, the stop names itself, and the land is
 * one light less dark. Three seconds, skippable, and then back to the map.
 *
 * The one rule it will not break: it fires on the store, not on the round.
 * A good round that leaves a recognition at four attempts does not light
 * anything, because the map would still show that stop open in the next
 * breath - and a celebration the map contradicts is worse than none. The
 * predicate lives in map.ts and is the same one the map itself uses.
 *
 * It is a reward, never a gate. Skipping it loses nothing: the clearing is
 * already recorded by the time this mounts, and the light on the map is
 * drawn from the store rather than from having watched this play.
 */
export function Rite({ name, where, legName, done, total, onDone }: {
  /** The recognition that was cleared. */
  name: string
  /** The ground it stands on in its clearing, where there is one. */
  where?: string
  /** The path it belongs to. */
  legName: string
  /** Stops cleared on that path, now. */
  done: number
  total: number
  onDone: () => void
}) {
  const [lit, setLit] = useState(false)
  const finished = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const finish = () => {
    if (finished.current) return
    finished.current = true
    timers.current.forEach(clearTimeout)
    onDone()
  }

  useEffect(() => {
    timers.current.push(setTimeout(() => setLit(true), 180))
    timers.current.push(setTimeout(finish, 3300))
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const go = () => finish()
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const walked = total > 0 && done >= total

  return (
    <div className={`rite${lit ? ' rite-lit' : ''}`} role="status" aria-live="polite">
      <div className="rite-inner">
        <svg className="rite-lamp" viewBox="0 0 64 96" aria-hidden="true">
          {/* The hook and the hoop it hangs from. */}
          <path className="rite-iron" d="M32 4 v10 M24 14 h16" />
          <path className="rite-iron" d="M20 20 h24 l-3 6 H23 Z" />
          <path className="rite-iron" d="M23 60 h18 l3 7 H20 Z" />
          <path className="rite-iron" d="M22 26 v34 M42 26 v34" />
          {/* The glass, and the flame inside it. */}
          <rect className="rite-glass" x="23" y="26" width="18" height="34" rx="2" />
          <g className="rite-flame">
            <ellipse cx="32" cy="46" rx="9" ry="13" className="rite-halo" />
            <path d="M32 34 C38 41 37 48 32 54 C27 48 26 41 32 34 Z" />
          </g>
        </svg>

        <p className="rite-eyebrow">{walked ? 'The path is walked' : 'The lamp is lit'}</p>
        <h2 className="rite-name">{name}</h2>
        {where && <p className="rite-where">at {where}</p>}

        <p className="rite-count">
          {done} of {total} stop{total === 1 ? '' : 's'} on {legName}
        </p>
        <span className="rite-rule" aria-hidden="true">
          <i style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
        </span>

        <button type="button" className="rite-go" onClick={finish}>
          {walked ? 'Back to the land' : 'Back to the clearing'}
        </button>
      </div>
    </div>
  )
}
