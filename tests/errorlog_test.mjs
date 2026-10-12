// The error log, and the counting change behind it. The failure these guard
// against is the app telling a student they finished something they got
// wrong — which is the one place it was flattering them.
import assert from 'node:assert/strict'

let pass = 0, fail = 0
const test = (n, fn) => {
  try { fn(); pass++; console.log(`  ok   ${n}`) }
  catch (e) { fail++; console.log(`  FAIL ${n}\n       ${e.message}`) }
}

const L = await import('../apps/web/src/errors/log.ts')

const at = (d) => `2026-10-0${d}T10:00:00.000Z`
const a = (questionId, correct, day, extra = {}) => ({
  exam: 'sat', questionId, correct, at: at(day),
  subtype: 'percent-change', skill: 'PSD', difficulty: 'M', chosen: 'B', ...extra,
})

test('a question answered wrong is NOT resolved', () => {
  assert.deepEqual([...L.resolved([a('q1', false, 1)])], [])
})

test('a question answered wrong then right IS resolved', () => {
  assert.deepEqual([...L.resolved([a('q1', false, 1), a('q1', true, 2)])], ['q1'])
})

test('unresolved holds the ones still wrong', () => {
  const s = L.unresolved([a('q1', false, 1), a('q2', true, 1), a('q3', false, 1)])
  assert.deepEqual([...s].sort(), ['q1', 'q3'])
})

test('getting it right later clears it from unresolved', () => {
  const s = L.unresolved([a('q1', false, 1), a('q1', true, 3)])
  assert.equal(s.size, 0)
})

test('a question never missed never enters the log', () => {
  assert.equal(L.errorLog([a('q1', true, 1)]).length, 0)
})

test('a miss enters the log and stays open', () => {
  const log = L.errorLog([a('q1', false, 1)])
  assert.equal(log.length, 1)
  assert.equal(log[0].fixedAt, null)
  assert.equal(L.open(log).length, 1)
  assert.equal(L.fixed(log).length, 0)
})

test('re-solving it moves it to fixed, and it never leaves the record', () => {
  const log = L.errorLog([a('q1', false, 1), a('q1', true, 2)])
  assert.equal(L.open(log).length, 0)
  assert.equal(L.fixed(log).length, 1)
  assert.equal(log[0].attempts.length, 2)
})

test('a right answer BEFORE the miss does not count as a fix', () => {
  // Got it right on Monday, wrong on Wednesday: still open.
  const log = L.errorLog([a('q1', true, 1), a('q1', false, 3)])
  assert.equal(log[0].fixedAt, null)
})

test('retries are counted from the first miss onward', () => {
  const log = L.errorLog([a('q1', false, 1), a('q1', false, 2), a('q1', true, 3)])
  assert.equal(log[0].retries, 2)
})

test('topics group by skill and recognition, worst first', () => {
  const log = L.errorLog([
    a('q1', false, 1), a('q2', false, 1),
    a('q3', false, 1, { subtype: 'ratios' }),
  ])
  const rows = L.byTopic(log, { 'percent-change': 'Percent change' })
  assert.equal(rows[0].name, 'Percent change')
  assert.equal(rows[0].open, 2)
  assert.equal(rows[1].open, 1)
})

test('the log is filtered by exam', () => {
  const mixed = [a('q1', false, 1), { ...a('q2', false, 1), exam: 'act' }]
  assert.equal(L.errorLog(mixed, 'sat').length, 1)
  assert.equal(L.errorLog(mixed, 'act').length, 1)
})

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
