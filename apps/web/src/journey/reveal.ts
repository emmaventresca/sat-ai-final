import { useEffect, useRef, useState } from 'react'

/**
 * Reveal on scroll.
 *
 * The page is a journey and it was arriving all at once, which is the one
 * thing a journey cannot do. Sections settle in as they come up, from a
 * position they already occupy - so nothing jumps, nothing reflows, and a
 * student who scrolls fast never sees a half-built page.
 *
 * Once revealed, it stays revealed. Elements that fade back out on the way
 * up are the reason scroll animation gets a bad name: scrolling back to
 * re-read something and watching it disappear is the interface fighting you.
 */
export function useReveal<T extends HTMLElement>(): [
  React.RefObject<T>, boolean,
] {
  // Cast at the boundary: React 18's own `ref` prop type does not accept the
  // nullable RefObject that useRef<T>(null) infers, and every consumer here
  // only ever hands it straight to a `ref=`.
  const ref = useRef<T>(null) as React.RefObject<T>
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      // Fires a little before the edge, so the move finishes as the section
      // arrives rather than starting then.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.06 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return [ref, shown]
}
