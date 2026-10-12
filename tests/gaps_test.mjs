import assert from 'node:assert/strict'
import test from 'node:test'

const { scoreGaps, ENOUGH } = await import('../apps/web/src/journey/gaps.ts')

const SPEC = {
  label: 'SAT',
  sections: [
    { id: 'rw', label: 'Reading & Writing', questions: 54, score: [200, 800] },
    { id: 'math', label: 'Math', questions: 44, score: [200, 800] },
  ],
  total_score: [400, 1600],
}

const COUNTS = {
  // 10% of the maths section -> 4.4 questions on a real test.
  common: { slug: 'common', skill: 'Algebra', section: 'math',
            count_total: 100, section_total: 1000 },
  // 1% -> 0.44 questions a test.
  rare: { slug: 'rare', skill: 'Geometry', section: 'math',
          count_total: 10, section_total: 1000 },
}
const NAMES = { common: 'A common one', rare: 'A rare one' }

const at = (subtype, correct, n) => Array.from({ length: n }, (_, i) => ({
  exam: 'sat', questionId: `${subtype}-${i}`, subtype, skill: 'x',
  difficulty: 'M', chosen: 'A', correct, at: new Date().toISOString(),
}))

test('a frequent weakness outranks a rare one at the same accuracy', () => {
  const r = scoreGaps('sat', SPEC,
    [...at('rare', false, 10), ...at('common', false, 10)], COUNTS, NAMES)
  assert.equal(r.gaps[0].subtype, 'common')
})

test('missed-per-test is frequency times failure rate', () => {
  // 50% on a recognition worth 4.4 questions a test -> 2.2 missed.
  const r = scoreGaps('sat', SPEC,
    [...at('common', true, 5), ...at('common', false, 5)], COUNTS, NAMES)
  const g = r.gaps[0]
  assert.equal(Math.round(g.perTest * 10) / 10, 4.4)
  assert.equal(Math.round(g.missedPerTest * 10) / 10, 2.2)
})

test('points follow the section scale, not a global constant', () => {
  const r = scoreGaps('sat', SPEC, at('common', false, 10), COUNTS, NAMES)
  // 4.4 missed x (600/44) points a question.
  assert.equal(Math.round(r.gaps[0].points), Math.round(4.4 * (600 / 44)))
})

test('thin evidence never outranks solid evidence', () => {
  const r = scoreGaps('sat', SPEC,
    // 0% but only twice, against 50% over twenty.
    [...at('common', false, 2),
     ...at('rare', true, 10), ...at('rare', false, 10)], COUNTS, NAMES)
  assert.equal(r.gaps[0].subtype, 'rare', 'two attempts is not a diagnosis')
  assert.equal(r.gaps[0].thin, false)
  assert.equal(r.gaps[1].thin, true)
})

test('thin is exactly below ENOUGH attempts', () => {
  const a = scoreGaps('sat', SPEC, at('common', false, ENOUGH - 1), COUNTS, NAMES)
  const b = scoreGaps('sat', SPEC, at('common', false, ENOUGH), COUNTS, NAMES)
  assert.equal(a.gaps[0].thin, true)
  assert.equal(b.gaps[0].thin, false)
})

test('a perfect recognition costs nothing', () => {
  const r = scoreGaps('sat', SPEC, at('common', true, 10), COUNTS, NAMES)
  assert.equal(r.gaps[0].missedPerTest, 0)
  assert.equal(r.gaps[0].points, 0)
  assert.equal(r.headroom, 0)
})

test('headroom excludes thin evidence', () => {
  const r = scoreGaps('sat', SPEC,
    [...at('common', false, 2), ...at('rare', false, 10)], COUNTS, NAMES)
  const solid = r.gaps.filter((g) => !g.thin)
  assert.equal(solid.length, 1)
  assert.equal(Math.round(r.headroom), Math.round(solid[0].points))
})

test('recognitions in another exam are ignored', () => {
  const act = at('common', false, 10).map((a) => ({ ...a, exam: 'act' }))
  const r = scoreGaps('sat', SPEC, act, COUNTS, NAMES)
  assert.equal(r.gaps.length, 0)
})

test('untested counts recognitions never attempted', () => {
  const r = scoreGaps('sat', SPEC, at('common', false, 5), COUNTS, NAMES)
  assert.equal(r.untested, 1)
})

test('an unknown subtype is skipped rather than guessed at', () => {
  const r = scoreGaps('sat', SPEC, at('nonsense', false, 10), COUNTS, NAMES)
  assert.equal(r.gaps.length, 0)
})
