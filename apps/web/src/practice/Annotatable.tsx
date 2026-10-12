import { useCallback, useEffect, useRef, useState } from 'react'
import {
  COLOURS, add, loadHighlights, offsetsOf, paint, removeAt, saveHighlights,
  type Highlight, type HighlightColour,
} from './annotate'

/**
 * A passage the student can mark up, the way the real test lets them.
 *
 * Highlighting is not decoration on the digital SAT - it is how you hold a
 * long passage while you work, and a student who practises without it
 * practises a different task from the one they will sit. Same for notes: the
 * exam lets you attach one to a highlight, and that is where "this is the
 * claim" goes.
 *
 * The toolbar appears on selection and nowhere else. A permanent set of
 * colour buttons would be clutter on a maths stem, which is most of the
 * questions here.
 */
import { LineGutter, useLineNumbers } from './LineNumbers'

export function Annotatable({
  html, questionId, part, className, lineNumbers = false,
}: {
  html: string
  questionId: string
  part: string
  className?: string
  /** Number the margin every five lines, as the real paper does. */
  lineNumbers?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const lineRows = useLineNumbers(host, lineNumbers)
  const [highlights, setHighlights] = useState<Highlight[]>(
    () => loadHighlights(questionId, part),
  )
  const [menu, setMenu] = useState<
    { x: number; y: number; start: number; end: number } | null
  >(null)
  const [onMark, setOnMark] = useState<{ x: number; y: number; index: number } | null>(null)

  // Reloading on question change rather than on mount: the component is
  // reused as a round advances, so mounting once would carry one question's
  // marks onto the next.
  useEffect(() => {
    setHighlights(loadHighlights(questionId, part))
    setMenu(null)
    setOnMark(null)
  }, [questionId, part])

  const repaint = useCallback(() => {
    if (host.current) paint(host.current, highlights)
  }, [highlights])

  // After every render of the HTML, and after any change to the marks.
  useEffect(repaint, [repaint, html])

  function onMouseUp(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const mark = target.closest('mark[data-hl]')
    const selection = window.getSelection()
    const range = selection && !selection.isCollapsed ? selection.getRangeAt(0) : null

    if (!range && mark) {
      // A click on an existing highlight offers to clear it. Without this
      // there is no way back out of a mis-drag.
      setMenu(null)
      setOnMark({ x: e.clientX, y: e.clientY, index: Number(mark.getAttribute('data-hl')) })
      return
    }
    setOnMark(null)
    if (!range || !host.current) return setMenu(null)
    const at = offsetsOf(host.current, range)
    if (!at) return setMenu(null)
    setMenu({ x: e.clientX, y: e.clientY, ...at })
  }

  function apply(colour: HighlightColour, note?: string) {
    if (!menu) return
    const next = add(highlights, { start: menu.start, end: menu.end, colour, note })
    setHighlights(next)
    saveHighlights(questionId, part, next)
    setMenu(null)
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div className={`annotatable${lineNumbers ? ' numbered' : ''}`}>
      <LineGutter lines={lineRows} />
      <div ref={host} className={className} onMouseUp={onMouseUp}
        dangerouslySetInnerHTML={{ __html: html }} />

      {menu && (
        <div className="hl-menu" style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.preventDefault()}>
          {COLOURS.map((c) => (
            <button key={c} className={`hl-swatch hl-${c}`} title={`Highlight ${c}`}
              onClick={() => apply(c)} />
          ))}
          <button className="hl-note" title="Highlight and add a note"
            onClick={() => {
              const note = window.prompt('Note on this bit')
              if (note !== null) apply('yellow', note || undefined)
            }}>Note</button>
        </div>
      )}

      {onMark && (
        <div className="hl-menu" style={{ left: onMark.x, top: onMark.y }}
          onMouseDown={(e) => e.preventDefault()}>
          <button className="hl-clear" onClick={() => {
            const next = removeAt(highlights, onMark.index)
            setHighlights(next)
            saveHighlights(questionId, part, next)
            setOnMark(null)
          }}>Remove highlight</button>
        </div>
      )}
    </div>
  )
}
