import assert from 'node:assert/strict'
import test from 'node:test'

const { traps, drillFor, HABIT } =
  await import('../apps/web/src/journey/drills.ts')

const ref = (id, subtype, tr) => ({
  id, exam: 'sat', section: 'math', skill: 'A', subtype,
  difficulty: 'M', format: 'mc', chunk: 'c', teaser: '', traps: tr,
})
const BANK = [
  ref('a1', 'alpha', ['flip']), ref('a2', 'alpha', ['flip']),
  ref('a3', 'alpha', ['flip']), ref('b1', 'beta', ['flip']),
  ref('b2', 'beta', ['flip']), ref('c1', 'gamma', ['other']),
]
const wrong = (slug, n, from = 0) => Array.from({ length: n }, (_, i) => ({
  exam: 'sat', questionId: `w${from + i}`, subtype: 'x', skill: 'A',
  difficulty: 'M', chosen: 'B', correct: false, misconception: slug,
  at: new Date(Date.now() - i * 1000).toISOString(),
}))

test('a repeated error becomes a drillable habit', () => {
  const t = traps('sat', wrong('flip', HABIT), BANK)
  assert.equal(t.length, 1)
  assert.equal(t[0].slug, 'flip')
  assert.equal(t[0].hits, HABIT)
})

test('a one-off is not a habit', () => {
  assert.equal(traps('sat', wrong('flip', HABIT - 1), BANK).length, 0)
})

test('an error with nothing in the bank to drill is not offered', () => {
  // 'ghost' never appears in BANK, so there is nothing to practise on.
  assert.equal(traps('sat', wrong('ghost', 10), BANK).length, 0)
})

test('share is of their wrong answers, not of all answers', () => {
  const t = traps('sat', [...wrong('flip', 6), ...wrong('other', 2, 50)], BANK)
  assert.equal(t[0].slug, 'flip')
  assert.equal(Math.round(t[0].share * 100), 75)
})

test('correct answers never create a trap', () => {
  const right = wrong('flip', 5).map((a) => ({ ...a, correct: true }))
  assert.equal(traps('sat', right, BANK).length, 0)
})

test('a drill spreads across recognitions rather than drilling one', () => {
  const picked = drillFor('flip', BANK, new Set(), 4)
  const subs = new Set(picked.map((q) => q.subtype))
  assert.ok(subs.size > 1, 'the error is the subject, not the topic')
  assert.ok(picked.every((q) => q.traps.includes('flip')))
})

test('a drill prefers questions they have not seen', () => {
  const seen = new Set(['a1', 'b1'])
  const picked = drillFor('flip', BANK, seen, 2)
  assert.ok(picked.every((q) => !seen.has(q.id)), 'new work first')
})

test('a drill never returns questions that do not punish the error', () => {
  const picked = drillFor('flip', BANK, new Set(), 20)
  assert.ok(picked.every((q) => q.id !== 'c1'))
  assert.equal(picked.length, 5, 'only what the bank actually has')
})
