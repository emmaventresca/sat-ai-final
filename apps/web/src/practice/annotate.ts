/**
 * Highlighting that survives a re-render.
 *
 * Storing a DOM Range is the obvious approach and the wrong one: the nodes
 * it points at are gone the moment React re-renders the passage, and the
 * passage re-renders every time the student picks an answer. So a highlight
 * is stored as a pair of character offsets into the container's plain text,
 * which is stable as long as the text is - and the text of a question does
 * not change.
 *
 * Offsets are computed over text nodes only, which also means KaTeX's markup
 * is skipped rather than counted. That matters: the maths in a stem is a
 * nest of spans, and counting its characters would put every offset after it
 * in the wrong place.
 */
export type HighlightColour = 'yellow' | 'pink' | 'blue'

export interface Highlight {
  start: number
  end: number
  colour: HighlightColour
  note?: string
}

export const COLOURS: HighlightColour[] = ['yellow', 'pink', 'blue']

/** Every text node under `root`, in document order. */
function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const out: Text[] = []
  let node = walker.nextNode()
  while (node) {
    out.push(node as Text)
    node = walker.nextNode()
  }
  return out
}

/**
 * Where a selection sits in the container's text, or null if it is not in
 * this container, is empty, or is only whitespace.
 */
export function offsetsOf(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.commonAncestorContainer)) return null
  let start = -1
  let end = -1
  let seen = 0
  for (const node of textNodes(root)) {
    const len = node.data.length
    if (node === range.startContainer) start = seen + range.startOffset
    if (node === range.endContainer) end = seen + range.endOffset
    seen += len
  }
  if (start < 0 || end < 0 || end <= start) return null
  if (!root.textContent?.slice(start, end).trim()) return null
  return { start, end }
}

/**
 * Paint the highlights onto the rendered HTML.
 *
 * Each text node that falls inside a highlight is split and wrapped, rather
 * than the whole range being surrounded - a range that starts mid-sentence
 * and ends inside a KaTeX span cannot be surrounded at all, and the student
 * selecting across a formula is the normal case, not the edge one.
 */
export function paint(root: HTMLElement, highlights: readonly Highlight[]): void {
  for (const old of [...root.querySelectorAll('mark[data-hl]')]) {
    const parent = old.parentNode
    if (!parent) continue
    while (old.firstChild) parent.insertBefore(old.firstChild, old)
    parent.removeChild(old)
    parent.normalize()
  }
  if (!highlights.length) return

  for (const [index, hl] of [...highlights].entries()) {
    let seen = 0
    for (const node of textNodes(root)) {
      const len = node.data.length
      const from = Math.max(hl.start - seen, 0)
      const to = Math.min(hl.end - seen, len)
      seen += len
      if (to <= from) continue

      const middle = node.splitText(from)
      if (to - from < middle.data.length) middle.splitText(to - from)
      const mark = document.createElement('mark')
      mark.dataset.hl = String(index)
      mark.className = `hl hl-${hl.colour}`
      if (hl.note) mark.title = hl.note
      middle.parentNode?.replaceChild(mark, middle)
      mark.appendChild(middle)
    }
  }
}

/**
 * Add a highlight, merging anything it touches.
 *
 * Overlapping marks of the same colour are one highlight as far as a reader
 * is concerned, and leaving them separate makes removal feel broken - you
 * click to clear and half the stripe stays.
 */
export function add(existing: readonly Highlight[], next: Highlight): Highlight[] {
  const touching = existing.filter(
    (h) => h.colour === next.colour && h.start <= next.end && next.start <= h.end,
  )
  const rest = existing.filter((h) => !touching.includes(h))
  const merged: Highlight = {
    colour: next.colour,
    start: Math.min(next.start, ...touching.map((h) => h.start)),
    end: Math.max(next.end, ...touching.map((h) => h.end)),
    note: next.note ?? touching.find((h) => h.note)?.note,
  }
  return [...rest, merged].sort((a, b) => a.start - b.start)
}

export function removeAt(existing: readonly Highlight[], index: number): Highlight[] {
  return existing.filter((_, i) => i !== index)
}

// ---------------------------------------------------------------------------
// Storage
//
// Annotations belong to the student and the question, and they are worth
// keeping between sittings: a passage a student has already marked up is
// one they can re-read in a tenth of the time.
// ---------------------------------------------------------------------------

const KEY = 'prep.annotations'

interface Saved {
  highlights?: Record<string, Highlight[]>
  /** Answer choices the student has crossed out, per question. */
  eliminated?: Record<string, string[]>
}

function read(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved
  } catch {
    return {}
  }
}

function write(s: Saved): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function loadHighlights(questionId: string, part: string): Highlight[] {
  return read().highlights?.[`${questionId}|${part}`] ?? []
}

export function saveHighlights(
  questionId: string, part: string, highlights: readonly Highlight[],
): void {
  const store = read()
  store.highlights = { ...store.highlights, [`${questionId}|${part}`]: [...highlights] }
  write(store)
}

export function loadEliminated(questionId: string): string[] {
  return read().eliminated?.[questionId] ?? []
}

export function saveEliminated(questionId: string, letters: readonly string[]): void {
  const store = read()
  store.eliminated = { ...store.eliminated, [questionId]: [...letters] }
  write(store)
}
