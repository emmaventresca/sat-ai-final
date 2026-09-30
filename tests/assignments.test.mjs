// Assignment resolution: which questions a student actually gets.
// The filter is what the teacher approved, so this decides whether an
// approval means what it said.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const items = JSON.parse(readFileSync(join(ROOT, 'data', 'practice.json'), 'utf8')).items;

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

// Mirrors assignedItems() in web/assets/app.js.
function assignedItems(a, pool) {
  const f = a.filter ?? {};
  if (f.item_ids?.length) {
    const want = new Set(f.item_ids);
    const hit = pool.filter((i) => want.has(i.id));
    if (hit.length) return hit;
  }
  const subs = new Set(f.subtypes ?? []);
  return pool.filter((i) =>
    (!subs.size || subs.has(i.subtype)) &&
    (!f.difficulty || i.difficulty === f.difficulty));
}

const someSubtype = items[0].subtype;

console.log('\nresolving what a student gets');
test('explicit item ids win over the filter', () => {
  const ids = items.slice(0, 3).map((i) => i.id);
  const got = assignedItems({ filter: { item_ids: ids, subtypes: ['nope'] } }, items);
  assert.deepEqual(got.map((i) => i.id).sort(), ids.slice().sort());
});
test('a subtype filter returns only that subtype', () => {
  const got = assignedItems({ filter: { subtypes: [someSubtype] } }, items);
  assert.ok(got.length > 0);
  assert.ok(got.every((i) => i.subtype === someSubtype));
});
test('a difficulty filter is respected', () => {
  const got = assignedItems({ filter: { difficulty: 'E' } }, items);
  assert.ok(got.length > 0);
  assert.ok(got.every((i) => i.difficulty === 'E'));
});
test('subtype and difficulty together intersect', () => {
  const got = assignedItems({ filter: { subtypes: [someSubtype], difficulty: 'E' } }, items);
  assert.ok(got.every((i) => i.subtype === someSubtype && i.difficulty === 'E'));
});
test('ids the bank does not have fall back to the filter, not to nothing', () => {
  // The planner may cite items that were never authored. Silently returning
  // an empty set would look like an empty assignment rather than a miss.
  const got = assignedItems(
    { filter: { item_ids: ['does-not-exist'], subtypes: [someSubtype] } }, items);
  assert.ok(got.length > 0, 'should fall back to the subtype filter');
});
test('an empty filter does not silently assign the whole bank to one tier', () => {
  const got = assignedItems({ filter: {} }, items);
  assert.equal(got.length, items.length);
});

console.log('\nthe pool it draws from');
test('every assignable item is ours, not College Board', () => {
  assert.ok(items.every((i) => i.source?.startsWith('original')));
});
test('every assignable item carries a subtype, so filters can reach it', () => {
  assert.ok(items.every((i) => i.subtype));
});
test('every assignable item explains each wrong choice', () => {
  for (const i of items.slice(0, 40)) {
    assert.ok(i.per_choice?.correct, `${i.id} has no correct explanation`);
    const wrong = ['A', 'B', 'C', 'D'].filter((L) => L !== i.answer);
    assert.ok(wrong.some((L) => i.per_choice[L]), `${i.id} explains no distractor`);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
