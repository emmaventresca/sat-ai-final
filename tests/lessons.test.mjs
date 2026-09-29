// Tests for lesson adaptivity. The failure these guard against is silent: a
// student simply sees the wrong page, with no error anywhere.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as L from '../web/assets/lessons.js';
import { scoreItem } from '../web/assets/engine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const bands = read('bands.json');
const lessons = read('lessons.json').lessons;
const skills = Object.fromEntries(read('skills.json').skills.map((s) => [s.skill_cd, s]));

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
const ctx = (student, mastery = {}, fingerprints = []) =>
  ({ bands, skills, mastery, student, fingerprints, now: new Date() });

// 1000 heading for 1300, and 1440 heading for 1550.
const climber  = { current_rw: 540, current_math: 460, target_rw: 650, target_math: 650 };
const advanced = { current_rw: 720, current_math: 720, target_rw: 770, target_math: 780 };

const headings = (id, c) => L.buildLesson(byId[id], c).sections.map((s) => s.id);

console.log('\ntriage reverses across the score range');
test('the climber is told to guess and move on Hard', () => {
  const ids = headings('lesson-TRIAGE', ctx(climber));
  assert.ok(ids.includes('tri-low') && ids.includes('tri-low-why'), ids.join(', '));
});
test('...and is never shown the advice written for 1500s', () => {
  const ids = headings('lesson-TRIAGE', ctx(climber));
  for (const hidden of ['tri-high', 'tri-high-module', 'tri-high-last']) {
    assert.ok(!ids.includes(hidden), `${hidden} leaked: ${ids.join(', ')}`);
  }
});
test('the advanced student is told Hard is mandatory', () => {
  const ids = headings('lesson-TRIAGE', ctx(advanced));
  assert.ok(ids.includes('tri-high'), ids.join(', '));
});
test('...and is never shown the skip-Hard advice', () => {
  const ids = headings('lesson-TRIAGE', ctx(advanced));
  assert.ok(!ids.includes('tri-low') && !ids.includes('tri-low-why'), ids.join(', '));
});
test('both see the universal sections', () => {
  for (const s of [climber, advanced]) {
    const ids = headings('lesson-TRIAGE', ctx(s));
    assert.ok(ids.includes('tri-guess') && ids.includes('tri-frame'), ids.join(', '));
  }
});

console.log('\ntier gating follows the band model');
test('a climber opening Inferences is not shown the Hard traps', () => {
  // A 650 R&W target requires 45% of the Hard tier, so this is genuinely open;
  // use a lower target to test the gate itself.
  const modest = { ...climber, target_rw: 520 };
  assert.ok(!headings('lesson-INF', ctx(modest)).includes('inf-hard'));
});
test('an advanced student opening Inferences does get them', () => {
  assert.ok(headings('lesson-INF', ctx(advanced)).includes('inf-hard'));
});
test('a lesson is never empty, even when fully mastered', () => {
  const mastered = Object.fromEntries(['E', 'M', 'H'].map((t) =>
    [`WIC|${t}`, { seen: 30, correct: 30, box: 5, due_at: '2020-01-01T00:00:00Z' }]));
  const built = L.buildLesson(byId['lesson-WIC'], ctx(advanced, mastered));
  assert.ok(built.sections.length > 0);
});

console.log('\nevidence gates');
test('remediation appears only once there is evidence of struggling', () => {
  assert.ok(!headings('lesson-WIC', ctx(climber)).includes('wic-struggle'));
  const weak = { 'WIC|E': { seen: 10, correct: 4, box: 1, due_at: '2020-01-01T00:00:00Z' } };
  assert.ok(headings('lesson-WIC', ctx(climber, weak)).includes('wic-struggle'));
});
test('a mastered student does not get the remediation', () => {
  const strong = { 'WIC|E': { seen: 10, correct: 10, box: 5, due_at: '2020-01-01T00:00:00Z' } };
  assert.ok(!headings('lesson-WIC', ctx(climber, strong)).includes('wic-struggle'));
});
test('a misconception section needs the error to have been made enough times', () => {
  const two = Array.from({ length: 2 }, () => ({ misconception: 'contrast-vs-addition' }));
  const three = Array.from({ length: 3 }, () => ({ misconception: 'contrast-vs-addition' }));
  assert.ok(!headings('lesson-TRA', ctx(climber, {}, two)).includes('tra-restatement'));
  assert.ok(headings('lesson-TRA', ctx(climber, {}, three)).includes('tra-restatement'));
});

console.log('\nfocus tier');
test('a fresh climber is pointed at Easy first', () => {
  assert.equal(L.focusTier(byId['lesson-WIC'], ctx(climber)), 'E');
});
test('securing Easy moves the focus to Medium', () => {
  const m = { 'WIC|E': { seen: 20, correct: 19, box: 5, due_at: '2020-01-01T00:00:00Z' } };
  assert.equal(L.focusTier(byId['lesson-WIC'], ctx(climber, m)), 'M');
});
test('focus never exceeds what the target requires', () => {
  const modest = { ...climber, target_rw: 500 };
  const m = Object.fromEntries(['E', 'M'].map((t) =>
    [`WIC|${t}`, { seen: 20, correct: 20, box: 5, due_at: '2020-01-01T00:00:00Z' }]));
  assert.notEqual(L.focusTier(byId['lesson-WIC'], ctx(modest, m)), 'H');
});

console.log('\nranking');
test('lessons are ordered by what this student has to gain', () => {
  const ranked = L.rankLessons(lessons.filter((l) => l.skill_cd), ctx(climber), scoreItem);
  assert.ok(ranked.length > 0);
  for (let i = 1; i < ranked.length; i++) {
    assert.ok(ranked[i - 1].value >= ranked[i].value, 'not sorted');
  }
});
test('a mastered skill sinks down the list', () => {
  const m = Object.fromEntries(['E', 'M', 'H'].map((t) =>
    [`WIC|${t}`, { seen: 40, correct: 40, box: 5, due_at: '2020-01-01T00:00:00Z' }]));
  const before = L.rankLessons(lessons.filter((l) => l.skill_cd), ctx(climber), scoreItem)
    .findIndex((r) => r.lesson.id === 'lesson-WIC');
  const after = L.rankLessons(lessons.filter((l) => l.skill_cd), ctx(climber, m), scoreItem)
    .findIndex((r) => r.lesson.id === 'lesson-WIC');
  assert.ok(after > before, `moved from ${before} to ${after}`);
});

console.log('\ncontent integrity');
test('every lesson has a title and at least one section', () => {
  for (const l of lessons) {
    assert.ok(l.title, `${l.id} has no title`);
    assert.ok(l.sections.length, `${l.id} has no sections`);
  }
});
test('every non-pinned lesson maps to a real skill', () => {
  const known = new Set(Object.keys(skills));
  for (const l of lessons) {
    if (l.pinned) continue;
    assert.ok(known.has(l.skill_cd) || l.skill_cd?.startsWith('H.'),
      `${l.id}: unknown skill ${l.skill_cd}`);
  }
});
test('every lesson carries source and licence provenance', () => {
  for (const l of lessons) {
    assert.ok(l.source && l.license, `${l.id} missing provenance`);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
