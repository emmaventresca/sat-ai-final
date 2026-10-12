import {
  Children, cloneElement, isValidElement,
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react'

/**
 * Stops laid out as a map, not as a list.
 *
 * A path with one leg in it was rendering as a 335px column stranded in a
 * full-width card, which looked like a layout that had failed rather than a
 * layout that had decided. The fix is not a wider column: it is to stop
 * pretending a sequence of eight recognitions is a list at all. They are
 * stops on a road, and a road that reaches the edge of the page turns back.
 *
 * So the stops run in a serpentine - left to right, then right to left on
 * the row below - and a dashed trail is drawn through their centres. The
 * ordering is set on the grid rather than faked with `direction`, so the
 * order you read is the order you tab through is the order the trail joins
 * them in. Those three agreeing is the whole reason this is worth measuring
 * for.
 */
export function StopGrid({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLUListElement>(null)
  const [cols, setCols] = useState(1)
  const [trail, setTrail] = useState('')
  const [size, setSize] = useState({ w: 0, h: 0 })

  /** How many columns fit. Measured, because it drives where the stops go. */
  const fit = useCallback(() => {
    const node = box.current
    if (!node) return
    // Below ~300px a stop's title wraps to three lines and the grid stops
    // being readable, so the column count is driven by that rather than by
    // a breakpoint list.
    setCols(Math.max(1, Math.min(4, Math.floor(node.clientWidth / 300))))
  }, [])

  /**
   * Centres of every stop, in order, joined with a smooth curve.
   *
   * Runs AFTER the column count has been applied. Measuring in the same pass
   * that sets it reads the positions of the layout being replaced - which
   * put every point on one x and drew the trail as a straight vertical line
   * down a two-column grid.
   */
  const measure = useCallback(() => {
    const node = box.current
    if (!node) return
    setSize({ w: node.clientWidth, h: node.clientHeight })

    const items = [...node.querySelectorAll<HTMLElement>('[data-stop]')]
    if (items.length < 2) {
      setTrail('')
      return
    }
    const origin = node.getBoundingClientRect()
    const points = items.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left - origin.left + r.width / 2, y: r.top - origin.top + r.height / 2 }
    })
    setTrail(curveThrough(points))
  }, [])

  useLayoutEffect(fit, [fit, children])
  useLayoutEffect(measure, [measure, cols, children])

  useEffect(() => {
    const node = box.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { fit(); measure() })
    ro.observe(node)
    for (const el of node.querySelectorAll('[data-stop]')) ro.observe(el)
    return () => ro.disconnect()
  }, [fit, measure, children])

  // The children are already <li>; they are placed on the grid directly
  // rather than wrapped. A <li> inside a wrapper div is outside its list,
  // which is both wrong for a screen reader and why the cards were sizing
  // themselves and overlapping instead of filling a cell.
  const placed = Children.toArray(children).filter(isValidElement)

  return (
    <ul className="stop-grid" ref={box}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {trail && (
        <li className="stop-trail-cell" aria-hidden="true">
          <svg className="stop-trail" viewBox={`0 0 ${size.w} ${size.h}`}
            width={size.w} height={size.h}>
            <path d={trail} />
          </svg>
        </li>
      )}
      {placed.map((child, i) => {
        const row = Math.floor(i / cols)
        const inRow = i % cols
        // Odd rows run backwards, so the trail turns at the margin instead
        // of flying back across the whole width.
        const col = row % 2 === 0 ? inRow + 1 : cols - inRow
        const el = child as React.ReactElement<{
          className?: string; style?: React.CSSProperties
        }>
        return cloneElement(el, {
          key: i,
          className: `${el.props.className ?? ''} stop-cell`.trim(),
          style: { ...el.props.style, gridRow: row + 1, gridColumn: col },
          ...{ 'data-stop': '' },
        })
      })}
    </ul>
  )
}

/**
 * A smooth path through the centres.
 *
 * Catmull-Rom converted to cubic beziers: it passes exactly through every
 * point, which a plain bezier chain does not, and a trail that misses the
 * stops it is supposed to join is worse than no trail. Tension is low so the
 * turns at the end of a row read as a bend in a road rather than a loop.
 */
function curveThrough(p: { x: number; y: number }[]): string {
  if (p.length < 2) return ''
  const out = [`M ${r(p[0].x)} ${r(p[0].y)}`]
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const t = 6
    const c1 = { x: p1.x + (p2.x - p0.x) / t, y: p1.y + (p2.y - p0.y) / t }
    const c2 = { x: p2.x - (p3.x - p1.x) / t, y: p2.y - (p3.y - p1.y) / t }
    out.push(`C ${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(p2.x)} ${r(p2.y)}`)
  }
  return out.join(' ')
}

const r = (n: number) => Math.round(n * 10) / 10
