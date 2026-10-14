import { useEffect, useMemo, useRef, useState } from 'react'
import { thresholdWords, type Crossing } from './crossingwords'
import './threshold.css'

/**
 * The curtain between the map and the lesson.
 *
 * Clicking a stop used to swap the atlas for the question page in one
 * frame, which is the moment the whole conceit drops: you are walking a
 * country, and then without transition you are taking a test. A beat of
 * black with a line of text on it is what a cut needs to read as going
 * somewhere rather than as a page replacing another page.
 *
 * It is deliberately short and skippable. A flourish a student sees four
 * times a session has to be under two seconds and has to get out of the way
 * when they click it, or the second week it is an obstacle.
 *
 * The lesson mounts BEHIND the curtain at its darkest point, not after it
 * lifts, so the fade out reveals a page that has already settled - no flash
 * of empty layout, no second load.
 */

export function Threshold({
  kind, place, onCovered, onDone,
}: {
  kind: Crossing
  /** The stop being entered, shown under the line. */
  place: string
  /** Fired once the screen is fully covered: mount the lesson now. */
  onCovered: () => void
  /** Fired when the curtain has lifted and can be unmounted. */
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'closing' | 'open' | 'lifting'>('closing')
  const words = useMemo(() => thresholdWords(kind, place), [kind, place])

  // Held in refs so skipping cannot fire either callback twice: onCovered
  // mounting the lesson a second time would reset the round.
  const covered = useRef(false)
  const done = useRef(false)
  const cover = () => { if (!covered.current) { covered.current = true; onCovered() } }
  const finish = () => { if (!done.current) { done.current = true; onDone() } }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))

  useEffect(() => {
    at(460, () => { cover(); setPhase('open') })
    at(1010, () => setPhase('lifting'))
    at(1560, finish)
    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Clicking anywhere takes the rest of it at once - but still lifts rather
   * than vanishing, because a curtain that disappears mid-frame is just the
   * hard cut this exists to avoid.
   */
  const skip = () => {
    clearAll()
    cover()
    setPhase('lifting')
    at(240, finish)
  }

  return (
    <div className={`threshold threshold-${phase}`} onClick={skip}
      role="presentation" aria-hidden="true">
      <div className="threshold-words">
        <strong>{words}</strong>
        <em>{place}</em>
      </div>
    </div>
  )
}

export type { Crossing }
