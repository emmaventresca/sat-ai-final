// Subtype-level mastery. The claim under test: a skill-level score averages
// away the thing a tutor needs to act on, and subtype-level does not.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as E from '../web/assets/engine.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const bands = read('bands.json');
const subtypeTax = read('subtypes.json').skills;

let pass = 0, fail = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

const SKILL = 'Systems of two linear equations in two variables';
const skills = {
  'H.D.': { skill_cd: 'H.D.', section: 'math', skill_name: SKILL,
            bank_count_e: 38, bank_count_m: 46, bank_count_h: 42, section_total: 1925 },
};
// Two subtypes of one skill, with different real-world frequency.
const subtypes = {
  'bare-system':  { slug: 'bare-system',  skill_cd: 'H.D.',
                    count_e: 20, count_m: 14, count_h: 6, section_total: 1925 },
  'word-problem': { slug: 'word-problem', skill_cd: 'H.D.',
                    count_e: 10, count_m: 18, count_h: 20, section_total: 1925 },
};
const subtypesOf = { 'H.D.': [subtypes['bare-system'], subtypes['word-problem']] };

const items = [
  { id: 'bare-m', type: 'item', skill_cd: 'H.D.', subtype: 'bare-system',
    difficulty: 'M', band_floor: 200, band_ceiling: 1600 },
  { id: 'word-m', type: 'item', skill_cd: 'H.D.', subtype: 'word-problem',
    difficulty: 'M', band_floor: 200, band_ceiling: 1600 },
];

const student = { current_rw: 560, current_math: 540, target_rw: 680, target_math: 680 };
const ctx = (mastery = {}) => ({ bands, skills, subtypes, subtypesOf, mastery,
                                 student, fingerprints: [], now: new Date() });

// Fluent at bare systems, lost on the word-problem version. At skill level
// this averages to "about 60%", which names no action.
const split = {
  'bare-system|E': { seen: 12, correct: 12, box: 5, due_at: '2020-01-01T00:00:00Z' },
  'bare-system|M': { seen: 10, correct: 9,  box: 4, due_at: '2020-01-01T00:00:00Z' },
  'word-problem|E': { seen: 10, correct: 4, box: 1, due_at: '2020-01-01T00:00:00Z' },
  'word-problem|M': { seen: 8,  correct: 2, box: 1, due_at: '2020-01-01T00:00:00Z' },
};

console.log('\nthe reason subtypes exist');
test('a skill-level score averages the two into something unactionable', () => {
  const acc = E.skillAccuracy('H.D.', ctx(split));
  assert.ok(acc > 0.5 && acc < 0.75, `skill accuracy ${acc}`);
});
test('the subtypes underneath it are nothing alike', () => {
  const c = ctx(split).mastery;
  const bare = (c['bare-system|E'].correct + c['bare-system|M'].correct) /
               (c['bare-system|E'].seen + c['bare-system|M'].seen);
  const word = (c['word-problem|E'].correct + c['word-problem|M'].correct) /
               (c['word-problem|E'].seen + c['word-problem|M'].seen);
  assert.ok(bare > 0.9, `bare ${bare}`);
  assert.ok(word < 0.4, `word ${word}`);
});
test('and selection goes to the weak one, not the skill average', () => {
  const round = E.selectRound(items, ctx(split), { size: 1 });
  assert.equal(round[0].id, 'word-m', `served ${round[0].id}`);
});

console.log('\nmastery is keyed by subtype');
test('cellKey uses the subtype when there is one', () => {
  assert.equal(E.cellKey(items[0]), 'bare-system|M');
});
test('...and falls back to the skill when there is not', () => {
  assert.equal(E.cellKey({ skill_cd: 'H.D.', difficulty: 'H' }), 'H.D.|H');
});
test('fluency in one subtype does not mark another as practised', () => {
  const only = { 'bare-system|M': { seen: 9, correct: 9, box: 5, due_at: '2020-01-01T00:00:00Z' } };
  assert.ok(E.pMiss(ctx(only).mastery['word-problem|M'], 'M') > 0.3);
});

console.log('\nfrequency comes from measured subtype counts');
test('a subtype rarer at a tier scores lower on frequency', () => {
  const c = ctx();
  const bareH = E.skillFrequency(skills['H.D.'], 'H', { subtype: 'bare-system' }, c);
  const wordH = E.skillFrequency(skills['H.D.'], 'H', { subtype: 'word-problem' }, c);
  assert.ok(wordH > bareH, `word ${wordH} should exceed bare ${bareH}`);
});
test('an item with no subtype still falls back to skill counts', () => {
  const f = E.skillFrequency(skills['H.D.'], 'M', { skill_cd: 'H.D.' }, ctx());
  assert.ok(f > 0);
});

console.log('\nreachability ladders within a subtype');
test('proving Easy in one subtype does not open Hard in another', () => {
  const m = { 'bare-system|E': { seen: 10, correct: 10 },
              'bare-system|M': { seen: 10, correct: 10 } };
  const other = E.reachability({ skill_cd: 'H.D.', subtype: 'word-problem', difficulty: 'H' }, ctx(m));
  const same  = E.reachability({ skill_cd: 'H.D.', subtype: 'bare-system',  difficulty: 'H' }, ctx(m));
  assert.ok(same > other * 5, `same ${same} vs other ${other}`);
});

console.log('\nround composition');
test('one recognition cannot fill a round', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `w${i}`, type: 'item', skill_cd: 'H.D.', subtype: 'word-problem',
    difficulty: 'M', band_floor: 200, band_ceiling: 1600 }));
  const round = E.selectRound(many, ctx(split), { size: 10, maxPerSubtype: 3 });
  assert.equal(round.length, 3);
});

console.log('\nthe taxonomy itself');
test('every skill has subtypes, and each has a tell and a method', () => {
  for (const [skill, v] of Object.entries(subtypeTax)) {
    assert.ok(v.subtypes.length >= 3, `${skill}: ${v.subtypes.length} subtypes`);
    for (const st of v.subtypes) {
      assert.ok(st.slug && st.tell && st.method, `${skill}/${st.slug} incomplete`);
    }
  }
});
test('subtype slugs are unique within a skill', () => {
  for (const [skill, v] of Object.entries(subtypeTax)) {
    const s = v.subtypes.map((x) => x.slug);
    assert.equal(new Set(s).size, s.length, `${skill} has duplicate slugs`);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
