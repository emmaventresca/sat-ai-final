import assert from 'node:assert/strict'
import test from 'node:test'

const { renderBody } = await import('../apps/web/src/lesson/math.ts')

test('a markdown heading becomes a heading, not literal hashes', () => {
  const h = renderBody(['## Warm-up'])
  assert.match(h, /<h4 class="lsn-h">Warm-up<\/h4>/)
  assert.doesNotMatch(h, /##/)
})

test('headings never outrank the lesson title', () => {
  // A single # must not become an <h1> inside a page that already has one.
  assert.match(renderBody(['# Big']), /<h3/)
  assert.match(renderBody(['#### Small']), /<h4/)
})

test('numbered steps become an ordered list', () => {
  const h = renderBody(['1. Rewrite it', '2. Isolate x'])
  assert.match(h, /<ol class="lsn-steps">/)
  assert.equal((h.match(/<li>/g) || []).length, 2)
  assert.doesNotMatch(h, /<p>1\./)
})

test('a pipe table becomes a real table', () => {
  const h = renderBody(['| a | b |', '| - | - |', '| 1 | 2 |'])
  assert.match(h, /<table class="lsn-table">/)
  assert.match(h, /<th>a<\/th>/)
  assert.doesNotMatch(h, /\|/)
})

test('a list and a table in sequence do not merge', () => {
  const h = renderBody(['- one', '- two', '| a | b |', '| 1 | 2 |'])
  assert.match(h, /<ul class="lsn-list">/)
  assert.match(h, /<table/)
  assert.ok(h.indexOf('</ul>') < h.indexOf('<table'), 'list closes first')
})

test('bullets and numbers are separate lists, not one', () => {
  const h = renderBody(['- a', '1. b'])
  assert.match(h, /<ul class="lsn-list">/)
  assert.match(h, /<ol class="lsn-steps">/)
})

test('maths still typesets inside prose', () => {
  assert.match(renderBody(['Use $x^2$ here.']), /katex/)
})

test('bold and italic survive the new paths', () => {
  assert.match(renderBody(['## **Key** idea']), /<strong>Key<\/strong>/)
  assert.match(renderBody(['1. Ask *why*']), /<em>why<\/em>/)
})

test('a paragraph that merely starts with a digit is not a list', () => {
  // "2026 was the year..." is prose, not step two.
  const h = renderBody(['2026 changed the format.'])
  assert.doesNotMatch(h, /<ol/)
  assert.match(h, /<p>/)
})

test('a planner paragraph with embedded newlines is split, not dumped', () => {
  const h = renderBody(['## Head\nSome prose\n- a bullet'])
  assert.match(h, /<h4/)
  assert.match(h, /<p>Some prose<\/p>/)
  assert.match(h, /<ul/)
})
