/**
 * The opening, and when it is allowed to run.
 *
 * The failure this guards against is not visual. It is a cinematic that
 * plays when it should not: every login instead of the first, or at all for
 * a student who has asked their machine to stop moving things.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const mod = '../apps/web/src/journey/overtureState.ts'

/** A fresh module with a fresh fake localStorage behind it. */
async function load(store) {
  const bag = store ?? new Map()
  globalThis.localStorage = {
    getItem: (k) => (bag.has(k) ? bag.get(k) : null),
    setItem: (k, v) => bag.set(k, String(v)),
    removeItem: (k) => bag.delete(k),
  }
  // Cache-busted so each test gets the module's own first run.
  return { m: await import(`${mod}?t=${Math.random()}`), bag }
}

test('reduced motion means no cinematic at all', async () => {
  const { m } = await load()
  assert.equal(m.overtureFor(true), 'none')
})

test('the long version runs once, then never again', async () => {
  const { m, bag } = await load()
  assert.equal(m.overtureFor(false), 'full')
  m.markOvertureSeen()
  assert.equal(m.overtureFor(false), 'short')
  assert.equal(m.overtureFor(false), 'short', 'and still short on the third visit')
  assert.ok(bag.get('prep.overture.seen'), 'the visit is recorded')
})

test('reduced motion still wins over a first visit', async () => {
  const { m } = await load()
  assert.equal(m.overtureFor(true), 'none')
})

test('storage refusing leaves the short version, not the long one', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
    removeItem() { throw new Error('denied') },
  }
  const { overtureFor, markOvertureSeen } =
    await import(`${mod}?t=${Math.random()}`)
  // A student who cannot be remembered must not be shown the long opening
  // on every single login - which is what returning 'full' here would do.
  assert.equal(overtureFor(false), 'short')
  assert.doesNotThrow(() => markOvertureSeen())
})

test('forgetting brings the long version back', async () => {
  const { m } = await load()
  m.markOvertureSeen()
  assert.equal(m.overtureFor(false), 'short')
  m.forgetOverture()
  assert.equal(m.overtureFor(false), 'full')
})

test('both cuts stay inside the brief, and are the same cut', async () => {
  const { m } = await load()
  const { full, short } = m.BEATS
  // "approximately 3-6 seconds for the full cinematic"
  assert.ok(full.end >= 3000 && full.end <= 6000,
    `the full opening is ${full.end}ms, outside the 3-6s asked for`)
  assert.ok(short.end < full.end / 2,
    'the returning cut has to be much shorter, or it is not a shortcut')
  // The short version is the long one with the forest removed.
  assert.equal(short.forest, -1, 'the short cut has no forest beat')
  assert.ok(full.forest >= 0, 'the full cut does')
  for (const b of [full, short]) {
    assert.ok(b.vista <= b.title && b.title < b.out && b.out < b.end,
      'the beats have to run in order')
  }
})
