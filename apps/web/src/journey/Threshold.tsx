import { useEffect, useMemo, useRef, useState } from 'react'
import { beginWords, thresholdWords, type Crossing } from './crossingwords'
import './threshold.css'

/**
 * The curtain between the map and the lesson.
 *
 * Clicking a stop used to swap the atlas for the question page in one
 * frame, which is the moment the whole conceit drops: you are walking a
 * country, and then without transition you are taking a test. A beat of
 * deep ink with a line of text on it is what a cut needs to read as going
 * somewhere rather than as a page replacing another page.
 *
 * It does not pass on its own. The curtain closes, holds two seconds on the
 * line, then offers a button - and waits. That is the point of it: a
 * transition that runs past you is scenery, but one you have to open is a
 * threshold you chose to cross, and the lesson on the other side starts
 * because the student said go rather than because a timer expired.
 *
 * The lesson mounts BEHIND the curtain at its darkest point, not when the
 * button is pressed, so the whole hold is load time the student never sees
 * and the fade reveals a page that has already settled.
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
  const [phase, setPhase] = useState<'closing' | 'held' | 'ready' | 'lifting'>('closing')
  const words = useMemo(() => thresholdWords(kind, place), [kind, place])
  const go = useMemo(() => beginWords(kind, place), [kind, place])

  // Held in refs so a double-press cannot fire either callback twice:
  // onCovered mounting the lesson again would reset the round.
  const covered = useRef(false)
  const done = useRef(false)
  const cover = () => { if (!covered.current) { covered.current = true; onCovered() } }
  const finish = () => { if (!done.current) { done.current = true; onDone() } }

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))

  useEffect(() => {
    at(460, () => { cover(); setPhase('held') })
    // Two seconds on the line alone before anything to press appears. A
    // button offered immediately is just a dialog; the pause is what makes
    // it a moment.
    at(2460, () => setPhase('ready'))
    return clearAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Focus follows the button so Enter and Space work and a screen reader is
   * told what it landed on. Only once it is actually pressable - focusing it
   * while it is still invisible strands keyboard users on a dead control.
   */
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (phase === 'ready') btn.current?.focus() }, [phase])

  const open = () => {
    clearAll()
    cover()
    setPhase('lifting')
    at(560, finish)
  }

  return (
    <div className={`threshold threshold-${phase}`}
      role="dialog" aria-modal="true" aria-label={`${words}. ${place}`}>
      <div className="threshold-words">
        <strong>{words}</strong>
        <em>{place}</em>
      </div>

      <button ref={btn} type="button" className="threshold-go"
        onClick={open} tabIndex={phase === 'ready' ? 0 : -1}
        aria-hidden={phase === 'ready' ? undefined : true}>
        {go}
      </button>
    </div>
  )
}

export type { Crossing }
