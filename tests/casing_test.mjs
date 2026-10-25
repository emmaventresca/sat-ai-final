/**
 * No two source files may differ only in case.
 *
 * macOS and Windows have case-insensitive filesystems; Linux and the CI
 * that may one day build this do not. A pair like `digest.ts` and
 * `Digest.tsx` resolves to whichever TypeScript saw first, and the symptom
 * is never "two files have similar names" - it is a white screen, or an
 * import that silently returns the wrong module.
 *
 * This has happened three times here: digest/Digest, overture/Overture, and
 * overworld/Overworld. Three is enough.
 *
 * Only modules are compared - .ts, .tsx, .js, .jsx. `Atlas.tsx` beside
 * `atlas.css` is this codebase's own convention and is safe, because a
 * stylesheet is imported with its extension spelled out and so never goes
 * through extensionless resolution. Flagging those would be eleven false
 * positives, and a test that cries wolf gets deleted.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../apps/web/src/', import.meta.url).pathname

const MODULE = /\.(ts|tsx|js|jsx)$/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (MODULE.test(full)) out.push(full)
  }
  return out
}

test('no two source files differ only in case', () => {
  const files = walk(ROOT)
  const seen = new Map()
  const clashes = []
  for (const f of files) {
    const rel = relative(ROOT, f)
    // Compare the path without its extension: `a.ts` and `A.tsx` collide on
    // a case-insensitive import of './a', which is the failure mode.
    const stem = rel.replace(/\.[^./]+$/, '').toLowerCase()
    if (seen.has(stem)) clashes.push(`${seen.get(stem)}  <->  ${rel}`)
    else seen.set(stem, rel)
  }
  assert.deepEqual(clashes, [],
    'these resolve to each other on a case-insensitive filesystem')
})
