// ---------------------------------------------------------------------------
// Lesson -> PDF, through the browser's own print pipeline.
//
// No library. "Save as PDF" in the print dialog already produces real text,
// real vectors and selectable maths; a canvas-based exporter would give us a
// screenshot of the same thing, heavier and blurrier, plus a dependency to
// carry. So this builds a hidden iframe containing nothing but the lesson,
// gives it an @page rule, and calls print().
//
// Three things have to be carried across into that iframe or the PDF is
// wrong in a way that is easy to miss until it is on a screen in front of a
// student:
//
//   1. The stylesheets, inlined - an iframe written from script inherits none
//      of the parent document's CSS.
//   2. Their url() references, absolutized. KaTeX ships its woff2 files next
//      to its stylesheet; copy that CSS into a document with a different base
//      and every glyph falls back to a serif with the wrong metrics, which on
//      a formula reads as broken rather than as different.
//   3. print-color-adjust: exact. Browsers drop background fills when
//      printing, and a bar chart printed without its bars is a blank grid.
//
// The SVG charts need no special handling: they are already inline markup in
// the subtree we clone, so they travel with it.
// ---------------------------------------------------------------------------

import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Lesson } from './render'
import type { LessonMode, LessonPlan } from './types'
import { lessonDuration } from './types'

export interface PdfOptions {
  /**
   * An already-mounted lesson to print. Pass the node the teacher is looking
   * at and the PDF is guaranteed to match it; omit it and the plan is
   * rendered fresh off-screen.
   */
  node?: HTMLElement
  /** Becomes the document title, which is the filename most browsers offer. */
  filename?: string
}

/**
 * Page setup per mode.
 *
 * `size: landscape` rather than a named paper size on purpose - it sets the
 * orientation and leaves the teacher's own default paper alone, so the same
 * code gives Letter here and A4 to anyone else.
 */
const PAGE: Record<LessonMode, string> = {
  // The screen-share copy is read projected, so it wants the wide page and
  // big margins that keep a block from touching the edge of the frame.
  present: '@page { size: landscape; margin: 14mm 16mm; }',
  // The teacher copy is read in the hand, next to a laptop, and has a second
  // column of answers to fit; portrait gives that column somewhere to live.
  teacher: '@page { size: portrait; margin: 12mm 13mm; }',
}

const URL_REF = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g

function absolutize(css: string, href: string | null): string {
  if (!href) return css
  return css.replace(URL_REF, (whole, _quote: string, ref: string) => {
    if (/^(data:|https?:|\/\/|#)/i.test(ref)) return whole
    try {
      return `url("${new URL(ref, href).href}")`
    } catch {
      return whole
    }
  })
}

/**
 * Every stylesheet the app has loaded, as text.
 *
 * Reading `cssRules` needs same-origin, which is exactly why the app stopped
 * loading KaTeX from a CDN - so this is readable in practice. A sheet that
 * still refuses is linked instead rather than dropped, and the iframe's load
 * event waits for it.
 */
function collectStyles(): { inline: string; links: string[] } {
  const inline: string[] = []
  const links: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      rules = null
    }
    if (rules) {
      const text = Array.from(rules).map((r) => r.cssText).join('\n')
      inline.push(absolutize(text, sheet.href))
    } else if (sheet.href) {
      links.push(sheet.href)
    }
  }
  return { inline: inline.join('\n'), links }
}

/** Render a plan off-screen and hand back its markup. */
function renderToMarkup(plan: LessonPlan, mode: LessonMode): string {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1100px'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    // Synchronous on purpose: the markup is read on the next line, and a
    // concurrent render would hand back an empty div.
    flushSync(() => root.render(createElement(Lesson, { plan, mode })))
    return host.innerHTML
  } finally {
    root.unmount()
    host.remove()
  }
}

function printDocument(body: string, mode: LessonMode, title: string): string {
  const { inline, links } = collectStyles()
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<base href="${document.baseURI}">
<title>${title.replace(/[<&]/g, '')}</title>
${links.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<style>${inline}</style>
<style>
${PAGE[mode]}
html, body { margin: 0; padding: 0; background: #fff; }
/* Belt and braces: the print media query in styles.css covers the normal
   path, but a sheet we could not read would take this rule with it. */
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>${body}</body>
</html>`
}

/**
 * Open the print dialog on one mode of a lesson.
 *
 * Resolves once the dialog has been handed the document - not once a file
 * exists, which the browser never tells us.
 */
export async function exportLessonPdf(
  plan: LessonPlan,
  mode: LessonMode,
  opts: PdfOptions = {},
): Promise<void> {
  const title = opts.filename
    ?? `${plan.title} - ${lessonDuration(plan)} min - ${mode === 'teacher' ? 'teacher' : 'screen'}`
  const body = opts.node ? opts.node.outerHTML : renderToMarkup(plan, mode)

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)

  const ready = new Promise<void>((resolve) => {
    frame.addEventListener('load', () => resolve(), { once: true })
  })

  const doc = frame.contentDocument
  if (!doc) {
    frame.remove()
    throw new Error('could not open a print frame')
  }
  doc.open()
  doc.write(printDocument(body, mode, title))
  doc.close()
  await ready

  const win = frame.contentWindow
  if (!win) {
    frame.remove()
    throw new Error('print frame went away')
  }
  // Webfonts load after the document does, and printing mid-load sets the
  // maths in a fallback face.
  const fonts = frame.contentDocument?.fonts
  if (fonts) {
    try {
      await fonts.ready
    } catch {
      // No font loading API, or it refused: print with what has arrived.
    }
  }

  // Safari does not reliably fire afterprint, and an iframe removed while the
  // dialog is open cancels it - so cleanup is whichever happens first.
  let done = false
  const cleanup = () => {
    if (done) return
    done = true
    frame.remove()
  }
  win.addEventListener('afterprint', cleanup, { once: true })
  window.setTimeout(cleanup, 60_000)

  win.focus()
  win.print()
}

/** Both copies, one after the other: the screen version, then the key. */
export async function exportBothPdfs(plan: LessonPlan): Promise<void> {
  await exportLessonPdf(plan, 'present')
  await exportLessonPdf(plan, 'teacher')
}
