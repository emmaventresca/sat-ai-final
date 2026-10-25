/**
 * The anchors in a clearing.
 *
 * These coordinates are read off a picture by eye, which means the failure
 * mode is not a crash - it is a stop labelled "the log bridge" sitting in a
 * tree, or sitting on top of the painted compass rose. Nothing about that
 * throws, and nobody notices until a student does.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const { CLEARINGS, CHROME, inChrome, fallbackAnchors, anchorsFor } =
  await import('../apps/web/src/journey/clearings.ts')
const { CLEARING_SIZE } =
  await import('../apps/web/src/journey/clearingSizes.ts')

test('every authored anchor is on the plate', () => {
  for (const [slug, anchors] of Object.entries(CLEARINGS)) {
    for (const a of anchors) {
      assert.ok(a.x >= 2 && a.x <= 98, `${slug} "${a.where}" x=${a.x} is off the plate`)
      assert.ok(a.y >= 2 && a.y <= 98, `${slug} "${a.where}" y=${a.y} is off the plate`)
    }
  }
})

test('no anchor sits on the painted furniture', () => {
  const bad = []
  for (const [slug, anchors] of Object.entries(CLEARINGS)) {
    for (const a of anchors) {
      const hit = inChrome(a.x, a.y)
      if (hit) bad.push(`${slug} "${a.where}" (${a.x},${a.y}) is on ${hit}`)
    }
  }
  assert.deepEqual(bad, [])
})

test('every authored anchor says what is there', () => {
  for (const [slug, anchors] of Object.entries(CLEARINGS)) {
    for (const a of anchors) {
      assert.ok(a.where && a.where.trim().length > 3,
        `${slug} has an anchor with no ground named - the name IS the check`)
    }
  }
})

test('no two stops in one clearing land on top of each other', () => {
  for (const [slug, anchors] of Object.entries(CLEARINGS)) {
    for (let i = 0; i < anchors.length; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const dx = anchors[i].x - anchors[j].x
        const dy = anchors[i].y - anchors[j].y
        const d = Math.hypot(dx, dy)
        assert.ok(d >= 9,
          `${slug}: "${anchors[i].where}" and "${anchors[j].where}" are ${d.toFixed(1)} apart`)
      }
    }
  }
})

test('every authored clearing has a plate, and every plate a size', () => {
  for (const slug of Object.keys(CLEARINGS)) {
    assert.ok(CLEARING_SIZE[slug],
      `${slug} has anchors but no plate size - the frame cannot match its shape`)
  }
})

test('the fallback is still a scene, and still clear of the furniture', () => {
  for (let n = 1; n <= 10; n++) {
    const anchors = fallbackAnchors(n)
    assert.equal(anchors.length, n)
    for (const a of anchors) {
      assert.equal(inChrome(a.x, a.y), null,
        `the generated arc puts a stop on painted furniture at ${n} stops`)
      assert.ok(a.x >= 2 && a.x <= 98 && a.y >= 2 && a.y <= 98)
    }
  }
})

test('a clearing with more stops than anchors falls back rather than truncating', () => {
  const slug = Object.keys(CLEARINGS)[0]
  const authored = CLEARINGS[slug].length
  // Asking for one more than exists must not return a short list: a stop
  // with nowhere to stand is a lesson a student cannot reach.
  const got = anchorsFor(slug, authored + 1)
  assert.equal(got.length, authored + 1)
})

test('the chrome zones are the ones actually painted on the plates', () => {
  // A sanity check on the table itself: three boxes, each a real corner.
  assert.equal(CHROME.length, 3)
  for (const c of CHROME) {
    assert.ok(c.x2 > c.x1 && c.y2 > c.y1, 'a chrome box with no area protects nothing')
    assert.ok(c.what.length > 3)
  }
})
