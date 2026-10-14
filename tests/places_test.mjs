/**
 * Every land's hotspots must match the skills the bank actually has.
 *
 * This is here because of a bug nobody could see from the code: the Hawaii
 * land had a hotspot keyed 'Math', a placeholder domain that 167 ACT
 * questions used to carry. The questions were given real domains, and the
 * hotspot silently went on pointing at a skill that no longer existed -
 * while three real domains had no place on the map at all and fell back to
 * printing their raw skill name.
 *
 * Neither half of that fails a type check: SPOTS is keyed by string, so a
 * key that matches nothing is still valid TypeScript. The only thing that
 * catches it is comparing the authored table against the shipped bank,
 * which is what this does.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const src = readFileSync(new URL('../apps/web/src/journey/places.ts', import.meta.url), 'utf8')

/** terrain -> the domain names authored on that photograph. */
function authored() {
  const body = src.slice(src.indexOf('export const SPOTS'))
  const out = {}
  for (const m of body.matchAll(/^ {2}(\w+): \{(.*?)^ {2}\},/gms)) {
    out[m[1]] = new Set([...m[2].matchAll(/'([^']+)':\s*\{/g)].map((x) => x[1]))
  }
  return out
}

const TERRAIN = {
  'act/math': 'tropic', 'act/english': 'peaks',
  'act/reading': 'fair', 'act/science': 'park',
  'sat/math': 'cliffs', 'sat/rw': 'ocean',
}

/** section -> the domains the bank puts in it, for each exam. */
function banks() {
  const out = {}
  for (const it of read('../data/act/index.json').items) {
    if (!it.section || !it.skill) continue
    ;(out[`act/${it.section}`] ??= new Set()).add(it.skill)
  }
  // The SAT index carries a College Board skill code; the chapter a student
  // sees is the domain that code belongs to.
  const domain = new Map(read('../data/skills.json').skills.map((s) => [s.skill_cd, s.domain_name]))
  for (const it of read('../data/sat/index.json').items) {
    const d = domain.get(it.skill_cd)
    if (!it.section || !d) continue
    ;(out[`sat/${it.section}`] ??= new Set()).add(d)
  }
  return out
}

const SPOTS = authored()
const BANK = banks()

for (const [key, terrain] of Object.entries(TERRAIN)) {
  test(`${key} -> ${terrain}: every hotspot points at a real domain`, () => {
    const dead = [...(SPOTS[terrain] ?? [])].filter((s) => !BANK[key]?.has(s))
    assert.deepEqual(dead, [], `hotspots on ${terrain} matching no skill in ${key}`)
  })

  test(`${key} -> ${terrain}: every domain has a place on the map`, () => {
    const missing = [...(BANK[key] ?? [])].filter((s) => !SPOTS[terrain]?.has(s))
    assert.deepEqual(missing, [], `domains in ${key} with no hotspot, so they fall back to a raw skill name`)
  })
}

test('no two hotspots on one land sit on top of each other', () => {
  const body = src.slice(src.indexOf('export const SPOTS'))
  for (const m of body.matchAll(/^ {2}(\w+): \{(.*?)^ {2}\},/gms)) {
    const pts = [...m[2].matchAll(/x:\s*(-?\d+),\s*y:\s*(-?\d+)/g)].map((p) => `${p[1]},${p[2]}`)
    assert.equal(new Set(pts).size, pts.length, `${m[1]} has two hotspots at the same point`)
  }
})
