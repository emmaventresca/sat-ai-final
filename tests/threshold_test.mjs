/**
 * The curtain's copy.
 *
 * Small, but two things here are easy to get wrong in a way nobody notices
 * until a student does: a line that changes every time you look at the same
 * stop, and a resume that greets you as though you had never been.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

const { thresholdWords, beginWords, SETTING_OUT, RETURNING, BEGIN, BEGIN_AGAIN } =
  await import('../apps/web/src/journey/crossingwords.ts')

test('the same stop always says the same thing', () => {
  const a = thresholdWords('start', 'Summary & Paraphrase')
  for (let i = 0; i < 20; i++) {
    assert.equal(thresholdWords('start', 'Summary & Paraphrase'), a)
  }
})

test('resuming does not greet you as though you had never been', () => {
  for (const place of ['Unnecessary Commas', 'The Carousel', 'Arcs chords tangents']) {
    assert.ok(RETURNING.includes(thresholdWords('resume', place)),
      `resume at ${place} used a setting-out line`)
  }
})

test('setting out uses the setting-out lines', () => {
  for (const place of ['Unnecessary Commas', 'The Carousel', 'Logarithm properties']) {
    assert.ok(SETTING_OUT.includes(thresholdWords('start', place)))
  }
})

test('different stops do not all land on one line', () => {
  const places = [
    'Summary & Paraphrase', 'Unnecessary Commas', 'Dashes & Parentheses',
    'Semicolons & Colons', 'Trig identities', 'Two way tables',
    'Scatterplot regression', 'Piecewise functions', 'The Great Wheel',
    'Arcs chords tangents', 'Absolute value equations', 'Function from table',
  ]
  const used = new Set(places.map((p) => thresholdWords('start', p)))
  assert.ok(used.size >= 3,
    `twelve stops only produced ${used.size} distinct lines: ${[...used]}`)
})

test('an empty place name still says something', () => {
  assert.ok(SETTING_OUT.includes(thresholdWords('start', '')))
})

test('the button is stable for a stop too', () => {
  const a = beginWords('start', 'Semicolons & Colons')
  for (let i = 0; i < 20; i++) {
    assert.equal(beginWords('start', 'Semicolons & Colons'), a)
  }
})

test('resuming gets a resuming button', () => {
  for (const place of ['Unnecessary Commas', 'The Carousel']) {
    assert.ok(BEGIN_AGAIN.includes(beginWords('resume', place)))
    assert.ok(BEGIN.includes(beginWords('start', place)))
  }
})

test('the line and the button vary independently', () => {
  // Salted differently on purpose. If both hashed the same way, every stop
  // showing "Onward, traveller" would also show the same button, and the
  // pool would read as four openings instead of twenty.
  const places = [
    'Summary & Paraphrase', 'Unnecessary Commas', 'Dashes & Parentheses',
    'Semicolons & Colons', 'Trig identities', 'Two way tables',
    'Scatterplot regression', 'Piecewise functions', 'The Great Wheel',
    'Arcs chords tangents', 'Absolute value equations', 'Function from table',
  ]
  const pairs = new Set(
    places.map((p) => `${thresholdWords('start', p)}|${beginWords('start', p)}`))
  const lines = new Set(places.map((p) => thresholdWords('start', p)))
  assert.ok(pairs.size > lines.size,
    `${pairs.size} distinct pairings from ${lines.size} lines - the button tracks the line`)
})

test('nothing in the copy borrows from a franchise', () => {
  // Emma's standing constraint. Cheap to assert, and the list is the kind of
  // thing a later edit reaches for without thinking.
  const banned = /shire|hobbit|mordor|gandalf|rivendell|narnia|hogwarts|jedi|zelda|hyrule/i
  for (const line of [...SETTING_OUT, ...RETURNING, ...BEGIN, ...BEGIN_AGAIN]) {
    assert.ok(!banned.test(line), `"${line}" borrows a franchise name`)
  }
})
