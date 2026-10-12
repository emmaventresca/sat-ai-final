// Passage-grouped serving. The failure these guard against is a split
// passage: the student re-reads tomorrow what they read today, which is the
// exact waste the whole feature exists to remove.
import assert from 'node:assert/strict'

const ref = (id, passageId, type = 'humanities') =>
  ({ id, passageId, passageType: type, section: 'reading' })

let pass = 0, fail = 0
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`) }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

const { groupByPassage, passageRound, shapeOf, byPassageType } =
  await import('../apps/web/src/journey/passages.ts')

const pool = [
  ...Array.from({ length: 4 }, (_, i) => ref(`a${i}`, 'P-A')),
  ...Array.from({ length: 10 }, (_, i) => ref(`b${i}`, 'P-B', 'natural science')),
  ...Array.from({ length: 6 }, (_, i) => ref(`c${i}`, 'P-C')),
]
const none = new Set()

test('groups every question under its passage', () => {
  const g = groupByPassage(pool, none)
  assert.equal(g.length, 3)
  // Numeric sort: the default is lexicographic, which makes [4,6,10] -> [10,4,6].
  assert.deepEqual(g.map((x) => x.refs.length).sort((a, b) => a - b), [4, 6, 10])
})

test('never splits a passage across a round', () => {
  const round = passageRound(pool, none, 10)
  const counts = new Map()
  for (const r of round) counts.set(r.passageId, (counts.get(r.passageId) ?? 0) + 1)
  const sizes = { 'P-A': 4, 'P-B': 10, 'P-C': 6 }
  for (const [pid, n] of counts) {
    assert.equal(n, sizes[pid], `${pid} came through as ${n} of ${sizes[pid]}`)
  }
})

test('passes the target rather than truncating to it', () => {
  // Ten is the target; the 10-question passage alone meets it exactly.
  assert.ok(passageRound(pool, none, 10).length >= 10)
})

test('a thin passage does not become a two-question round', () => {
  const thin = [ref('x0', 'P-X'), ref('x1', 'P-X'), ...pool]
  assert.ok(passageRound(thin, none, 10).length >= 10)
})

test('prefers the passage with the most unseen questions', () => {
  // All of B seen, A and C untouched: B should not lead.
  const seen = new Set(Array.from({ length: 10 }, (_, i) => `b${i}`))
  assert.notEqual(passageRound(pool, seen, 10)[0].passageId, 'P-B')
})

test('inside a passage, unseen questions come first', () => {
  const seen = new Set(['b0', 'b1', 'b2'])
  const g = groupByPassage(pool, seen).find((x) => x.id === 'P-B')
  assert.ok(!seen.has(g.refs[0].id), 'led with one already answered')
})

test('questions with no passage still get served', () => {
  const mixed = [...pool, { id: 'loose', section: 'reading' }]
  const ids = passageRound(mixed, new Set(pool.map((r) => r.id)), 10).map((r) => r.id)
  assert.ok(ids.includes('loose'))
})

test('shape reports passages and questions, not just a count', () => {
  const s = shapeOf(pool, none, 10)
  assert.equal(s.questions, 10)
  assert.equal(s.passages, 1)
})

test('accuracy splits by passage type, worst first', () => {
  const attempts = [
    { questionId: 'a0', correct: false }, { questionId: 'a1', correct: false },
    { questionId: 'b0', correct: true }, { questionId: 'b1', correct: true },
  ]
  const rows = byPassageType(attempts, pool)
  assert.equal(rows[0].type, 'humanities')
  assert.equal(rows[0].accuracy, 0)
  assert.equal(rows[1].accuracy, 1)
})



// --- Challenge gate -------------------------------------------------------
const { challengeGate } = await import('../apps/web/src/journey/promotion.ts')
const q = (id, difficulty) => ({ id, difficulty })

test('Challenge is shut while any Hard question is unanswered', () => {
  const refs = [q('h1','H'), q('h2','H'), q('x1','X')]
  const g = challengeGate(refs, new Set(['h1']))
  assert.equal(g.open, false)
  assert.equal(g.hardLeft, 1)
  assert.equal(g.hardTotal, 2)
})

test('Challenge opens when every Hard question has been answered', () => {
  const refs = [q('h1','H'), q('h2','H'), q('x1','X')]
  assert.equal(challengeGate(refs, new Set(['h1','h2'])).open, true)
})

test('completion opens it, not accuracy — wrong answers still count', () => {
  // The gate takes an attempted set; it never sees correctness, which is
  // the point: 8 of 10 Hard right is ready, unopened Hard is not.
  const refs = [q('h1','H'), q('x1','X')]
  assert.equal(challengeGate(refs, new Set(['h1'])).open, true)
})

test('a recognition with no Hard questions does not lock forever', () => {
  const refs = [q('e1','E'), q('x1','X')]
  assert.equal(challengeGate(refs, new Set()).open, true)
})

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
