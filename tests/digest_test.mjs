import assert from 'node:assert/strict'
import test from 'node:test'

const { digestFor, headline, ENOUGH_EACH, NOTABLE } =
  await import('../apps/web/src/teacher/digest.ts')

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0)
const DAY = 86400000
const ago = (d) => new Date(NOW - d * DAY).toISOString()

const mk = (subtype, correct, n, daysAgo, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({
    exam: 'sat', questionId: `${subtype}-${daysAgo}-${i}-${correct}`,
    subtype, skill: 'A', difficulty: 'M', chosen: 'B', correct,
    at: ago(daysAgo), ms: 60000, ...extra,
  }))

test('a quiet week is reported as quiet, not as zero accuracy', () => {
  const d = digestFor('sat', mk('alpha', true, 6, 9), {}, 7, NOW)
  assert.equal(d.quiet, true)
  assert.equal(d.answered, 0)
  assert.match(headline(d), /Nothing this week, after 6 last week/)
})

test('improvement needs enough evidence in BOTH weeks', () => {
  // Strong improvement, but only two attempts in the earlier week.
  const d = digestFor('sat', [
    ...mk('alpha', false, 2, 9),
    ...mk('alpha', true, 8, 2),
  ], {}, 7, NOW)
  assert.equal(d.improved.length, 0, 'two attempts is not a baseline')
})

test('real movement is reported with both sample sizes', () => {
  const d = digestFor('sat', [
    ...mk('alpha', false, 4, 9), ...mk('alpha', true, 1, 9),   // 20% of 5
    ...mk('alpha', true, 8, 2), ...mk('alpha', false, 2, 2),   // 80% of 10
  ], { alpha: 'Alpha' }, 7, NOW)
  assert.equal(d.improved.length, 1)
  const m = d.improved[0]
  assert.equal(m.name, 'Alpha')
  assert.equal(m.beforeSeen, 5)
  assert.equal(m.afterSeen, 10)
  assert.equal(Math.round(m.delta), 60)
})

test('a slip is reported separately from an improvement', () => {
  const d = digestFor('sat', [
    ...mk('beta', true, 8, 9), ...mk('beta', false, 2, 9),     // 80%
    ...mk('beta', false, 8, 2), ...mk('beta', true, 2, 2),     // 20%
  ], {}, 7, NOW)
  assert.equal(d.improved.length, 0)
  assert.equal(d.slipped.length, 1)
  assert.ok(d.slipped[0].delta < 0)
})

test('movement under the notable threshold is not reported as a trend', () => {
  const d = digestFor('sat', [
    ...mk('alpha', true, 5, 9), ...mk('alpha', false, 5, 9),   // 50%
    ...mk('alpha', true, 11, 2), ...mk('alpha', false, 9, 2),  // 55%
  ], {}, 7, NOW)
  assert.ok(Math.abs(55 - 50) < NOTABLE)
  assert.equal(d.improved.length, 0, 'five points is noise, not news')
})

test('a rising error is surfaced, a steady one is not', () => {
  const rise = { misconception: 'flip' }
  const flat = { misconception: 'slip' }
  const d = digestFor('sat', [
    ...mk('a', false, 1, 9, rise), ...mk('a', false, 4, 2, rise),
    ...mk('b', false, 3, 9, flat), ...mk('b', false, 3, 2, flat),
  ], {}, 7, NOW)
  assert.deepEqual(d.habits.map((h) => h.slug), ['flip'])
})

test('a correct answer never counts as an error', () => {
  const d = digestFor('sat', mk('a', true, 5, 2, { misconception: 'flip' }),
    {}, 7, NOW)
  assert.equal(d.habits.length, 0)
})

test('newly met lists only recognitions never seen before', () => {
  const d = digestFor('sat', [
    ...mk('old', true, 3, 20),
    ...mk('old', true, 3, 2),
    ...mk('brand-new', true, 3, 2),
  ], { 'brand-new': 'Brand New' }, 7, NOW)
  assert.deepEqual(d.newlyMet, ['Brand New'])
})

test('unfixed counts questions never since answered right', () => {
  const d = digestFor('sat', [
    { exam: 'sat', questionId: 'q1', subtype: 'a', skill: 'A', difficulty: 'M',
      chosen: 'B', correct: false, at: ago(5) },
    { exam: 'sat', questionId: 'q1', subtype: 'a', skill: 'A', difficulty: 'M',
      chosen: 'C', correct: true, at: ago(4) },
    { exam: 'sat', questionId: 'q2', subtype: 'a', skill: 'A', difficulty: 'M',
      chosen: 'B', correct: false, at: ago(3) },
  ], {}, 7, NOW)
  assert.equal(d.unfixed, 1, 'q1 was fixed; q2 was not')
})

test('the other exam is not counted', () => {
  const act = mk('alpha', true, 10, 2).map((a) => ({ ...a, exam: 'act' }))
  const d = digestFor('sat', act, {}, 7, NOW)
  assert.equal(d.quiet, true)
})

test('ENOUGH_EACH is the boundary, not an approximation', () => {
  const build = (n) => digestFor('sat', [
    ...mk('alpha', false, n, 9),
    ...mk('alpha', true, n, 2),
  ], {}, 7, NOW)
  assert.equal(build(ENOUGH_EACH - 1).improved.length, 0)
  assert.equal(build(ENOUGH_EACH).improved.length, 1)
})
