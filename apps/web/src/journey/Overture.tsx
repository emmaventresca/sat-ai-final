import { useEffect, useMemo, useRef, useState } from 'react'
import { BEATS, markOvertureSeen, type Overture as Kind } from './overtureState'
import './overture.css'

/**
 * The way in.
 *
 * The camera pushes through the elder wood - mist between the trunks,
 * light breaking through the canopy - and comes out above the loch, where
 * the world opens and takes its name. Then it hands the screen to the app.
 *
 * It is built out of two photographs and some geometry rather than a 3D
 * scene, and that is a decision rather than a shortcut. three.js and R3F
 * would add about 600KB gzipped to a tutoring site students open on
 * phones, to render an establishing shot that is on screen for five
 * seconds and never interactive. The depth here comes from the same place
 * it comes from in film: layers moving at different rates. The photograph
 * pushes in slowly, hand-drawn trunk silhouettes in front of it push out
 * fast and slide past the edges of the frame, mist drifts across at a
 * third speed, and motes hang in between. The eye reads parallax, which is
 * all depth ever was.
 *
 * Nothing here gates anything. It is skippable on any key or click, it is
 * replaced by a short settle for anyone who has seen it, it does not run
 * at all under prefers-reduced-motion, and the app behind it has already
 * mounted - so skipping lands on a page that is ready, not on a spinner.
 */

const FOREST = 'art/quest/the-elder-wood.webp'
const VISTA = 'art/quest/the-watchtower.webp'

/** Trunks drawn rather than cut out of the photograph.
 *
 * A silhouette traced off a photo leaves a halo and fights the grain. These
 * are near-black shapes that never resolve into detail, which is exactly
 * what a trunk two feet from the lens looks like. */
function Trunks() {
  return (
    <svg className="ov-trunks" viewBox="0 0 100 100" preserveAspectRatio="none"
      aria-hidden="true">
      <g fill="#07090a">
        {/* Narrow and irregular. The first pass used wide straight slabs,
            which at the edges of a 16:9 frame read as letterboxing rather
            than as trees - the giveaway was the perfectly vertical inside
            edge. Real trunks taper, lean, and carry stubs. */}
        <path d="M-3 101 L-3 -1 L4.6 -1 C6.2 11 4.4 19 6.1 28
                 C7.4 35 5.2 41 7 49 C8.1 57 6.3 64 7.8 73
                 C8.6 83 7.1 92 8.4 101 Z" />
        <path d="M12.4 101 C13.6 90 11.9 80 13.2 70
                 C14.1 61 12.4 54 13.9 46 C14.9 38 13.2 30 14.5 21
                 C15.2 13 14.1 6 14.9 -1 L18.9 -1
                 C19.4 7 18.6 14 19.3 22 C20.1 31 18.7 39 19.8 47
                 C20.7 55 19.2 62 20.3 71 C21.1 81 19.9 91 21 101 Z"
          opacity=".93" />
        <path d="M103 101 L103 -1 L94.8 -1 C93.1 12 95.2 21 93.4 30
                 C92.1 38 94.3 45 92.5 53 C91.3 61 93.1 69 91.4 78
                 C90.5 87 92 94 90.6 101 Z" />
        <path d="M87.6 101 C86.3 91 88 82 86.6 73
                 C85.6 64 87.3 57 85.8 49 C84.8 41 86.4 33 85.1 24
                 C84.4 15 85.4 7 84.6 -1 L80.8 -1
                 C80.2 8 81.1 16 80.3 25 C79.5 34 81 42 79.8 50
                 C78.9 58 80.4 66 79.2 75 C78.4 85 79.5 93 78.4 101 Z"
          opacity=".9" />
        {/* A low branch crossing the top, so the canopy is not a clean arc. */}
        <path d="M-3 -1 L103 -1 L103 6.5 C96 9 90 5.5 84 8
                 C77 11 71 6 64 9.5 C57 13 50 7 43 10.5
                 C36 14 29 6.5 22 9.5 C15 12.5 8 7 2 11 L-3 12 Z"
          opacity=".96" />
        <path d="M18 7 C27 10 33 15 41 16.5 C36 18.5 29 15 22 12 Z"
          opacity=".8" />
        <path d="M82 9 C74 12 68 17 61 18 C66 20 73 16.5 79 13.5 Z"
          opacity=".75" />
      </g>
    </svg>
  )
}

/** Dust and spores hanging in the shafts. Canvas, because a hundred of
 *  these as DOM nodes is a hundred things for the compositor to think
 *  about every frame. */
function Motes({ run }: { run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !run) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cv.clientWidth, h = cv.clientHeight
    cv.width = w * dpr; cv.height = h * dpr
    ctx.scale(dpr, dpr)
    const n = w < 700 ? 42 : 90
    const dots = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 0.4 + Math.random() * 1.5,
      // Drifting up and across, slowly, like dust in still air.
      vx: 0.06 + Math.random() * 0.22,
      vy: -(0.04 + Math.random() * 0.16),
      a: 0.1 + Math.random() * 0.45,
      p: Math.random() * Math.PI * 2,
    }))
    let raf = 0
    let t = 0
    const frame = () => {
      t += 0.016
      ctx.clearRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x > w + 4) d.x = -4
        if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w }
        const tw = d.a * (0.65 + 0.35 * Math.sin(t * 1.7 + d.p))
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,228,170,${tw})`
        ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [run])
  return <canvas ref={ref} className="ov-motes" aria-hidden="true" />
}

export function Overture({ kind, onDone }: {
  kind: Exclude<Kind, 'none'>
  onDone: () => void
}) {
  const beats = BEATS[kind]
  const [phase, setPhase] = useState<'forest' | 'vista' | 'title' | 'out'>(
    kind === 'full' ? 'forest' : 'vista')
  const done = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const finish = useMemo(() => () => {
    if (done.current) return
    done.current = true
    timers.current.forEach(clearTimeout)
    markOvertureSeen()
    onDone()
  }, [onDone])

  useEffect(() => {
    const at = (ms: number, fn: () => void) => {
      if (ms >= 0) timers.current.push(setTimeout(fn, ms))
    }
    at(beats.vista, () => setPhase('vista'))
    at(beats.title, () => setPhase('title'))
    at(beats.out, () => setPhase('out'))
    at(beats.end, finish)
    return () => timers.current.forEach(clearTimeout)
  }, [beats, finish])

  // Any key, any click. A skip you have to find is not a skip.
  useEffect(() => {
    const go = () => finish()
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [finish])

  return (
    <div className={`ov ov-${kind} ov-at-${phase}`} role="presentation">
      {kind === 'full' && (
        <div className="ov-forest">
          <img src={`${import.meta.env.BASE_URL}${FOREST}`} alt="" />
          <div className="ov-beams" aria-hidden="true" />
          <div className="ov-mist ov-mist-a" aria-hidden="true" />
          <div className="ov-mist ov-mist-b" aria-hidden="true" />
          <Trunks />
          <Motes run={phase === 'forest'} />
        </div>
      )}

      <div className="ov-vista">
        <img src={`${import.meta.env.BASE_URL}${VISTA}`} alt="" />
        <div className="ov-vignette" aria-hidden="true" />
      </div>

      <div className="ov-title">
        <p className="ov-eyebrow">Ventresca Tutoring</p>
        <h1>The Long Road</h1>
        <p className="ov-sub">Every recognition on the test, laid out as a country.</p>
      </div>

      <button type="button" className="ov-skip" onClick={finish}>
        Skip
      </button>
    </div>
  )
}
