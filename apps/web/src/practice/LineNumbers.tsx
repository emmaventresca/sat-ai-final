import { useLayoutEffect, useState } from 'react'

/**
 * Line numbers down the margin of a passage, the way the real paper has them.
 *
 * The constraint that decides the approach: the numbers must land on the
 * lines the student is actually looking at, and the passage HTML carries
 * markup that matters - <u> on the clause an English question is asking
 * about. So the two obvious methods are both out. CSS cannot count wrapped
 * lines at all, and splitting the text into fixed-length lines would have to
 * cut through the middle of tags.
 *
 * What works is to measure. A Range over each text node reports one client
 * rect per visual line box, so grouping those rects by their top edge gives
 * the real lines at the real width, whatever the font or the wrapping did -
 * and the HTML is never touched. It re-measures on resize, because the line
 * a number belongs to changes when the column does.
 *
 * Numbered every five lines, as the test does: enough to find "lines 41-44"
 * quickly, few enough that the margin stays quiet.
 */
export function useLineNumbers(
  host: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  every = 5,
) {
  const [lines, setLines] = useState<{ top: number; n: number }[]>([])

  useLayoutEffect(() => {
    if (!enabled) { setLines([]); return }
    const el = host.current
    if (!el) return

    function measure() {
      const el = host.current
      if (!el) return
      const base = el.getBoundingClientRect().top
      const tops: number[] = []
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const range = document.createRange()
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        if (!node.textContent || !node.textContent.trim()) continue
        range.selectNodeContents(node)
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.height === 0 || rect.width === 0) continue
          const top = Math.round(rect.top - base)
          // One entry per line box. Rects from several nodes on the same
          // line (a <u> splits one line into three rects) collapse here.
          if (!tops.some((t) => Math.abs(t - top) < 4)) tops.push(top)
        }
      }
      tops.sort((a, b) => a - b)
      setLines(
        tops
          .map((top, i) => ({ top, n: i + 1 }))
          .filter((l) => l.n % every === 0),
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Fonts land after first paint and move every line box when they do.
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {})
    return () => ro.disconnect()
  }, [host, enabled, every])

  return lines
}

export function LineGutter({ lines }: { lines: { top: number; n: number }[] }) {
  if (!lines.length) return null
  return (
    <span className="psg-gutter" aria-hidden="true">
      {lines.map((l) => (
        <span key={l.n} className="psg-num" style={{ top: l.top }}>{l.n}</span>
      ))}
    </span>
  )
}
