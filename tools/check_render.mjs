// Does every question in both banks actually RENDER?
//
// The bug this exists for was invisible to every check we had: `renderHtml`
// scanned for HTML tags before maths, so a `<` inside `$...$` - which is the
// most common operator on the test - was read as the start of a tag, found no
// closing `>`, and dumped the rest of the string out as raw LaTeX. Three of
// four answer choices on an inequality question showed `$5.0 \le m < 6.0$` to
// the student. Nothing threw, nothing logged, and the only way to find it was
// to look at the screen.
//
// So this renders every stem, stimulus and choice in both banks and fails on
// anything that still looks like source after rendering.
//
//   node tools/check_render.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DATA = join(ROOT, 'apps/web/public/data')

// A rendered string must not still carry a LaTeX command or an unconsumed
// maths delimiter. Currency is the one legitimate lone dollar, so a `$`
// followed by a digit with no closing `$` on the line is allowed.
const LATEX_CMD = /\\(?:le|ge|neq|times|div|frac|sqrt|cdot|pm|approx|ne|pi|theta|alpha|beta|infty|left|right|text|mathrm)\b/
const KATEX_HTML = /class="katex/

function strip(html) {
  // Anything KaTeX produced is fine; look only at what it did not consume.
  return html.replace(/<span class="lsn-math[\s\S]*?<\/span>\s*(?=<|$)/g, ' ')
}

async function main() {
  const { renderHtml, renderStimulus } = await import(
    join(ROOT, 'apps/web/src/lesson/math.ts'))

  const files = []
  for (const exam of ['sat', 'act']) {
    const dir = join(DATA, exam, 'q')
    let names = []
    try { names = readdirSync(dir) } catch { continue }
    for (const n of names) if (n.endsWith('.json')) files.push(join(dir, n))
  }
  if (!files.length) {
    console.log('no split bank found - run tools/split_bank.py first')
    return 0
  }

  let checked = 0
  const bad = []
  for (const file of files) {
    let data
    try { data = JSON.parse(readFileSync(file, 'utf8')) } catch { continue }
    const items = Array.isArray(data) ? data : (data.items ?? [])
    for (const it of items) {
      const fields = [
        ['stem', it.stem, renderHtml],
        ['stimulus', it.stimulus, renderStimulus],
        ...(it.choices ?? []).map((c, i) => [`choice ${'ABCDEFGH'[i]}`, c, renderHtml]),
      ]
      for (const [what, raw, render] of fields) {
        if (typeof raw !== 'string' || !raw) continue
        checked += 1
        let out
        try { out = render(raw) } catch (e) {
          bad.push([file, it.id, what, `threw: ${e.message}`, raw])
          continue
        }
        const rest = strip(out)
        if (LATEX_CMD.test(rest)) {
          bad.push([file, it.id, what, 'LaTeX survived rendering', raw])
        } else if (/\$[^$\n]*\\/.test(rest)) {
          bad.push([file, it.id, what, 'unrendered maths span', raw])
        } else if (raw.includes('$') && raw.includes('\\') && !KATEX_HTML.test(out)) {
          bad.push([file, it.id, what, 'maths present but nothing typeset', raw])
        }
      }
    }
  }

  console.log(`rendered ${checked} fields from ${files.length} files`)
  if (!bad.length) {
    console.log('all clean')
    return 0
  }
  console.log(`\n${bad.length} did not render:\n`)
  for (const [file, id, what, why, raw] of bad.slice(0, 40)) {
    console.log(`  ${basename(file)} ${id} ${what}: ${why}`)
    console.log(`    ${raw.slice(0, 120)}`)
  }
  if (bad.length > 40) console.log(`  ... and ${bad.length - 40} more`)
  return 1
}

process.exit(await main())
