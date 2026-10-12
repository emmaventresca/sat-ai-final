import assert from 'node:assert/strict'
import test from 'node:test'

const { scoreGaps, ENOUGH, formatPoints } = await import('../apps/web/src/journey/gaps.ts')

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

test('SAT points are reported in the ten-point steps the score moves in', () => {
  // 10% of a 44-question section, answered 50% -> 2.2 missed x 13.6 = ~30.
  const r = scoreGaps('sat', SPEC,
    [...at('common', true, 5), ...at('common', false, 5)], COUNTS, NAMES)
  assert.equal(r.step, 10)
  assert.equal(Number(r.gaps[0].pointsLabel) % 10, 0, 'must land on a real score')
})

test('a gap smaller than one step says so rather than claiming a point', () => {
  // The SAT cannot express a one-point gain; "~1" reads as "not worth doing".
  assert.equal(formatPoints(1.4, 10), 'under 10')
  assert.equal(formatPoints(4, 10), 'under 10')
  assert.equal(formatPoints(0.2, 1), 'under 1')
})

test('rounding never overstates the prize', () => {
  // 4 points is under a step and must not round UP to a whole step.
  assert.equal(formatPoints(4, 10), 'under 10')
  assert.equal(formatPoints(14, 10), '10')
  assert.equal(formatPoints(16, 10), '20')
})

test('ACT reports in whole points, not tens', () => {
  const ACT_SPEC = { label: 'ACT', total_score: [1, 36], sections: [
    { id: 'math', label: 'Math', questions: 60, score: [1, 36] }] }
  const r = scoreGaps('act', ACT_SPEC,
    at('common', false, 10).map((a) => ({ ...a, exam: 'act' })), COUNTS, NAMES)
  assert.equal(r.step, 1)
})
