/**
 * When the lamp is allowed to light.
 *
 * The failure worth guarding is not a broken animation. It is a
 * celebration that fires on its own idea of "finished" - telling a student
 * they have cleared something the map still shows as open, one screen
 * later. So the rite reads the same predicate the map does, and this holds
 * that predicate to the rule the comment in map.ts states: five attempts
 * and eighty percent.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const KEY = 'prep.progress'

async function withStore(cells) {
  const bag = new Map()
  bag.set(KEY, JSON.stringify({ attempts: [], mastery: cells }))
  globalThis.localStorage = {
    getItem: (k) => (bag.has(k) ? bag.get(k) : null),
    setItem: (k, v) => bag.set(k, String(v)),
    removeItem: (k) => bag.delete(k),
  }
  return import(`../apps/web/src/journey/map.ts?t=${Math.random()}`)
}

const cell = (seen, correct) => ({ seen, correct, streak: 0, box: 1, dueAt: '' })

test('five attempts at eighty percent clears', async () => {
  const { clearedNow } = await withStore({ 'sat|thing|F': cell(5, 4) })
  assert.equal(clearedNow('sat', 'thing'), true)
})

test('four attempts does not, however well they went', async () => {
  const { clearedNow } = await withStore({ 'sat|thing|F': cell(4, 4) })
  assert.equal(clearedNow('sat', 'thing'), false,
    'a perfect four is still four - fewer cannot tell luck from understanding')
})

test('five attempts below eighty percent does not', async () => {
  const { clearedNow } = await withStore({ 'sat|thing|F': cell(5, 3) })
  assert.equal(clearedNow('sat', 'thing'), false)
})

test('attempts add up across the tiers', async () => {
  // A student who did three at Easy and two at Hard has done five.
  const { clearedNow } = await withStore({
    'sat|thing|E': cell(3, 3),
    'sat|thing|H': cell(2, 2),
  })
  assert.equal(clearedNow('sat', 'thing'), true)
})

test('another exam\'s work does not clear this one', async () => {
  const { clearedNow } = await withStore({ 'act|thing|F': cell(9, 9) })
  assert.equal(clearedNow('sat', 'thing'), false)
})

test('an untouched recognition is not cleared', async () => {
  const { clearedNow } = await withStore({})
  assert.equal(clearedNow('sat', 'thing'), false)
})

test('the thresholds are the ones map.ts documents', async () => {
  const { CLEAR_SEEN, CLEAR_ACC } = await withStore({})
  assert.equal(CLEAR_SEEN, 5)
  assert.equal(CLEAR_ACC, 0.8)
})
