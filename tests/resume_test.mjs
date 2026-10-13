import assert from 'node:assert/strict'
import test from 'node:test'

const { resumeFor, sinceWords } = await import('../apps/web/src/journey/resume.ts')

const stage = (subtype, cleared, left) => ({
  subtype, name: subtype, pool: {}, total: 10, frequency: 1,
  seen: 0, accuracy: null, cleared, left, fresh: 0,
})
const region = (stages) => ({
  id: 'r1', name: 'Math', terrain: 'cliffs', stages: stages.length,
  cleared: 0, left: 0, fresh: 0,
  chapters: [{ id: 'c1', name: 'Algebra', section: 'math', stages: stages.length,
    cleared: 0, left: 0, fresh: 0,
    legs: [{ skill: 'A', name: 'Linear', stages, left: 0, fresh: 0,
      trial: null, quiz: null, cleared: 0 }] }],
})
const at = (subtype, iso, exam = 'sat') => ({
  exam, questionId: `${subtype}-${iso}`, subtype, skill: 'A', difficulty: 'M',
  chosen: 'B', correct: false, at: iso,
})

test('resumes the most recent unfinished recognition', () => {
  const r = region([stage('alpha', false, 5), stage('beta', false, 5)])
  const got = resumeFor('sat', [r], [
    at('alpha', '2026-10-01T10:00:00Z'),
    at('beta', '2026-10-02T10:00:00Z'),
  ])
  assert.equal(got.stage.subtype, 'beta', 'newest wins')
})

test('skips a cleared recognition and keeps walking back', () => {
  const r = region([stage('alpha', false, 5), stage('beta', true, 0)])
  const got = resumeFor('sat', [r], [
    at('alpha', '2026-10-01T10:00:00Z'),
    at('beta', '2026-10-02T10:00:00Z'),
  ])
  assert.equal(got.stage.subtype, 'alpha', 'finished work is a dead click')
})

test('skips one with nothing left to serve', () => {
  const r = region([stage('alpha', false, 3), stage('beta', false, 0)])
  const got = resumeFor('sat', [r], [
    at('alpha', '2026-10-01T10:00:00Z'),
    at('beta', '2026-10-02T10:00:00Z'),
  ])
  assert.equal(got.stage.subtype, 'alpha')
})

test('returns nothing when everything touched is finished', () => {
  const r = region([stage('alpha', true, 0)])
  assert.equal(resumeFor('sat', [r], [at('alpha', '2026-10-01T10:00:00Z')]), null)
})

test('a recognition the bank dropped does not crash it', () => {
  const r = region([stage('alpha', false, 5)])
  const got = resumeFor('sat', [r], [
    at('alpha', '2026-10-01T10:00:00Z'),
    at('ghost', '2026-10-02T10:00:00Z'),
  ])
  assert.equal(got.stage.subtype, 'alpha')
})

test('the other exam is never resumed', () => {
  const r = region([stage('alpha', false, 5)])
  assert.equal(resumeFor('sat', [r], [at('alpha', '2026-10-01T10:00:00Z', 'act')]), null)
})

test('no attempts at all means no button', () => {
  assert.equal(resumeFor('sat', [region([stage('alpha', false, 5)])], []), null)
})

test('it reports where the recognition lives, for the breadcrumb', () => {
  const r = region([stage('alpha', false, 5)])
  const got = resumeFor('sat', [r], [at('alpha', '2026-10-01T10:00:00Z')])
  assert.equal(got.chapter.name, 'Algebra')
  assert.equal(got.leg.name, 'Linear')
  assert.equal(got.region.name, 'Math')
})

test('since-words read like a person', () => {
  const now = Date.UTC(2026, 9, 13)
  assert.equal(sinceWords(new Date(now).toISOString(), now), 'today')
  assert.equal(sinceWords(new Date(now - 86400000).toISOString(), now), 'yesterday')
  assert.equal(sinceWords(new Date(now - 3 * 86400000).toISOString(), now), '3 days ago')
  assert.equal(sinceWords(new Date(now - 10 * 86400000).toISOString(), now), 'last week')
})
