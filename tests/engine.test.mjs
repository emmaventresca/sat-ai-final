// Behavioural tests for the adaptive engine. These assert the two claims the
// whole design rests on, so if either breaks the failure is loud.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as E from '../web/assets/engine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bands = JSON.parse(readFileSync(join(ROOT, 'data', 'bands.json'), 'utf8'));

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

// A tiny but realistic skill table: one frequent easy-weighted algebra skill and
// one rare hard-weighted circles skill, which is the real shape of the bank.
const skills = {
  'H.C.': { skill_cd: 'H.C.', section: 'math', skill_name: 'Linear equations in one variable',
            bank_count_e: 120, bank_count_m: 90, bank_count_h: 30, section_total: 1925 },
  'S.C.':  { skill_cd: 'S.C.', section: 'math', skill_name: 'Circle equations',
            bank_count_e: 4, bank_count_m: 20, bank_count_h: 60, section_total: 1925 },
};

const catalogue = [
  { id: 'alg-e', type: 'item', skill_cd: 'H.C.', difficulty: 'E', band_floor: 200, band_ceiling: 1600 },
  { id: 'alg-m', type: 'item', skill_cd: 'H.C.', difficulty: 'M', band_floor: 200, band_ceiling: 1600 },
  { id: 'alg-h', type: 'item', skill_cd: 'H.C.', difficulty: 'H', band_floor: 200, band_ceiling: 1600 },
  { id: 'cir-m', type: 'item', skill_cd: 'S.C.', difficulty: 'M', band_floor: 200, band_ceiling: 1600 },
  { id: 'cir-h', type: 'item', skill_cd: 'S.C.', difficulty: 'H', band_floor: 200, band_ceiling: 1600 },
];

const ctx = (student, mastery = {}) => ({ bands, skills, mastery, student, now: new Date() });

// A student at 1000 heading for 1300: math target 650.
const climber = { current_rw: 500, current_math: 460, target_rw: 650, target_math: 650 };
// A student at 1400 heading for 1550: math target 780.
const advanced = { current_rw: 700, current_math: 700, target_rw: 770, target_math: 780 };

console.log('\nband model');
test('a 600 math target requires none of the Hard tier', () => {
  assert.equal(E.bandWeights(bands, 'math', 600).H, 0);
});
test('a 780 math target requires most of the Hard tier', () => {
  assert.ok(E.bandWeights(bands, 'math', 780).H > 0.6);
});
test('guessing yield keeps the Hard tier at zero right up to 600', () => {
  for (const t of [400, 450, 500, 550, 600]) {
    assert.equal(E.bandWeights(bands, 'math', t).H, 0, `target ${t}`);
  }
});
test('the Hard requirement then climbs monotonically', () => {
  let prev = -1;
  for (const t of [650, 700, 750, 800]) {
    const h = E.bandWeights(bands, 'math', t).H;
    assert.ok(h > prev, `target ${t}: ${h} not above ${prev}`);
    prev = h;
  }
});
test('every target requires the whole Easy tier above 400', () => {
  for (const t of [450, 550, 650, 750]) {
    assert.equal(E.bandWeights(bands, 'math', t).E, 1, `target ${t}`);
  }
});

console.log('\nthe two defining behaviours');
// A round of 3 from 5 candidates, so these assert real ranking rather than the
// trivial case where everything fits.
test('a student aiming under 600 math is served no Hard items at all', () => {
  const modest = { ...climber, target_math: 600 };
  const round = E.selectRound(catalogue, ctx(modest), { size: 5 });
  assert.ok(!round.some((i) => i.difficulty === 'H'),
    `served: ${round.map((i) => i.id).join(', ')}`);
});
test('...even though they would almost certainly miss them', () => {
  // Confirms the exclusion is the band weight, not a low miss probability.
  assert.ok(E.pMiss(undefined, 'H') > 0.6);
});
test('a 1300-bound student is not sent at Hard circles before mastering Medium', () => {
  const round = E.selectRound(catalogue, ctx(climber), { size: 3 });
  assert.ok(!round.some((i) => i.id === 'cir-h'),
    `served: ${round.map((i) => i.id).join(', ')}`);
});
test('a 1550-bound student ranks mastered Easy below the work that pays', () => {
  const mastered = { 'H.C.|E': { seen: 20, correct: 20, box: 5, due_at: '2020-01-01T00:00:00Z' },
                     'H.C.|M': { seen: 10, correct: 9, box: 3, due_at: '2020-01-01T00:00:00Z' } };
  const ids = E.selectRound(catalogue, ctx(advanced, mastered), { size: 5 }).map((i) => i.id);
  for (const better of ['alg-m', 'alg-h', 'cir-h']) {
    assert.ok(ids.indexOf(better) < ids.indexOf('alg-e'),
      `${better} should outrank alg-e; order: ${ids.join(', ')}`);
  }
});
test('...and excludes it once the round is competitive', () => {
  const mastered = { 'H.C.|E': { seen: 20, correct: 20, box: 5, due_at: '2020-01-01T00:00:00Z' },
                     'H.C.|M': { seen: 10, correct: 9, box: 3, due_at: '2020-01-01T00:00:00Z' } };
  const round = E.selectRound(catalogue, ctx(advanced, mastered), { size: 3 });
  assert.ok(!round.some((i) => i.id === 'alg-e'),
    `served: ${round.map((i) => i.id).join(', ')}`);
});
test('...but the same student does get Hard items', () => {
  const round = E.selectRound(catalogue, ctx(advanced), { size: 5 });
  assert.ok(round.some((i) => i.difficulty === 'H'));
});

console.log('\npromotion');
test('mastering Medium in a skill unlocks its Hard tier', () => {
  // The climber only needs 9% of the Hard tier, so Hard circles sit outside a
  // three-item round until Medium circles are actually proven.
  const before = E.selectRound(catalogue, ctx(climber), { size: 3 }).map((i) => i.id);
  const withM = { 'S.C.|M': { seen: 12, correct: 11, box: 4, due_at: '2020-01-01T00:00:00Z' } };
  const after = E.selectRound(catalogue, ctx(climber, withM), { size: 3 }).map((i) => i.id);
  assert.ok(!before.includes('cir-h') && after.includes('cir-h'),
    `before=[${before}] after=[${after}]`);
});
test('raising the target alone lets Hard content in', () => {
  const withM = { 'S.C.|M': { seen: 12, correct: 11, box: 4, due_at: '2020-01-01T00:00:00Z' } };
  const before = E.selectRound(catalogue, ctx({ ...climber, target_math: 600 }, withM), { size: 5 }).map((i) => i.id);
  const after = E.selectRound(catalogue, ctx({ ...climber, target_math: 780 }, withM), { size: 5 }).map((i) => i.id);
  assert.ok(!before.includes('cir-h') && after.includes('cir-h'),
    `before=[${before}] after=[${after}]`);
});

console.log('\nreachability');
test('Easy is always reachable', () => {
  assert.equal(E.reachability({ skill_cd: 'H.C.', difficulty: 'E' }, ctx(climber)), 1);
});
test('Hard is heavily discounted with no Medium evidence', () => {
  assert.ok(E.reachability({ skill_cd: 'S.C.', difficulty: 'H' }, ctx(climber)) <= 0.2);
});
test('Hard opens up as Medium in that skill is mastered', () => {
  const m = { 'S.C.|M': { seen: 10, correct: 10 } };
  assert.equal(E.reachability({ skill_cd: 'S.C.', difficulty: 'H' }, ctx(climber, m)), 1);
});

console.log('\nmastery');
test('a correct answer promotes and pushes the review out', () => {
  const c = E.updateMastery({ seen: 1, correct: 1, box: 1 }, true);
  assert.equal(c.box, 2);
  assert.ok(new Date(c.due_at) > new Date(Date.now() + 2 * 864e5 - 1e4));
});
test('a miss drops straight to box 1 and requeues within the session', () => {
  const c = E.updateMastery({ seen: 9, correct: 9, box: 5 }, false);
  assert.equal(c.box, 1);
  assert.ok(new Date(c.due_at) < new Date(Date.now() + 20 * 60e3));
});
test('cells that are not due score zero', () => {
  const future = { 'H.C.|M': { seen: 4, correct: 3, box: 3, due_at: new Date(Date.now() + 864e5).toISOString() } };
  assert.equal(E.scoreItem(catalogue[1], ctx(climber, future)), 0);
});

console.log('\nsession shape');
test('no single skill dominates a round', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({
    id: `m${i}`, type: 'item', skill_cd: 'H.C.', difficulty: 'M', band_floor: 200, band_ceiling: 1600 }));
  const round = E.selectRound(many, ctx(climber), { size: 20, maxPerSkill: 4 });
  assert.equal(round.length, 4);
});

console.log('\nstrategy triggers');
test('a repeated misconception surfaces its strategy card', () => {
  const cards = [{ id: 's1', type: 'strategy', trigger: { misconception: 'contrast-vs-addition', count: 3 } }];
  const fps = Array.from({ length: 3 }, () => ({ skill_cd: 'CAS.T', misconception: 'contrast-vs-addition' }));
  assert.equal(E.firedTriggers(cards, fps, ctx(climber)).length, 1);
});
test('two of the same misconception is not yet a pattern', () => {
  const cards = [{ id: 's1', type: 'strategy', trigger: { misconception: 'contrast-vs-addition', count: 3 } }];
  const fps = Array.from({ length: 2 }, () => ({ skill_cd: 'CAS.T', misconception: 'contrast-vs-addition' }));
  assert.equal(E.firedTriggers(cards, fps, ctx(climber)).length, 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
