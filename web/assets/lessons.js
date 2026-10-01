// ---------------------------------------------------------------------------
// Adaptive lessons.
//
// A lesson is not a page. It is an ordered set of sections, each of which knows
// the band it is for and the evidence that should make it appear. Two students
// opening "Transitions" see genuinely different pages: the one at 1000 gets the
// four relationships and a decision procedure, the one at 1400 gets the
// near-miss pairs and the no-transition case, and neither is shown the other's
// material.
//
// This is the same principle as the selection engine - do not teach what this
// student does not need - applied inside a single lesson rather than across the
// catalogue.
//
// Gates available on a section:
//
//   band:    [floor, ceiling]  on total score. Hard boundary.
//   tier:    'E' | 'M' | 'H'   only if the band requires that tier at all.
//   when:    one of
//            {unseen: true}                     no evidence yet in this skill
//            {struggling: {tier, below}}        accuracy under `below`
//            {mastered:   {tier, atLeast}}      accuracy at or above `atLeast`
//            {missed: 'misconception-slug'}     they have actually made this error
//            {count: {misconception, atLeast}}  ...this many times
//
// A section with no gates is always shown. Gates are AND-ed.
// ---------------------------------------------------------------------------

import { bandWeights } from './engine.js?v=956c26ba84';

const TIER_ORDER = { E: 0, M: 1, H: 2 };

function cellAccuracy(mastery, skill_cd, tier) {
  const cell = mastery[`${skill_cd}|${tier}`];
  if (!cell || !cell.seen) return null;             // null means "no evidence"
  return cell.correct / cell.seen;
}

/**
 * Decide whether one section is shown.
 * @param ctx {bands, skills, mastery, student, fingerprints}
 */
export function sectionVisible(section, lesson, ctx) {
  const total = (ctx.student.current_rw ?? 0) + (ctx.student.current_math ?? 0);

  if (section.band && total) {
    const [floor, ceiling] = section.band;
    if (total < floor || total > ceiling) return false;
  }

  if (section.tier) {
    const skill = ctx.skills[lesson.skill_cd];
    if (!skill) return false;
    const target = skill.section === 'rw' ? ctx.student.target_rw : ctx.student.target_math;
    const weight = bandWeights(ctx.bands, skill.section, target)[section.tier] ?? 0;
    // Do not teach a tier this student's target does not ask them to win.
    if (weight <= 0.02) return false;
  }

  const when = section.when;
  if (!when) return true;

  if (when.unseen) {
    const any = ['E', 'M', 'H'].some((t) => cellAccuracy(ctx.mastery, lesson.skill_cd, t) !== null);
    if (any) return false;
  }
  if (when.struggling) {
    const acc = cellAccuracy(ctx.mastery, lesson.skill_cd, when.struggling.tier);
    if (acc === null || acc >= when.struggling.below) return false;
  }
  if (when.mastered) {
    const acc = cellAccuracy(ctx.mastery, lesson.skill_cd, when.mastered.tier);
    if (acc === null || acc < when.mastered.atLeast) return false;
  }
  if (when.missed) {
    const hit = (ctx.fingerprints ?? []).some((f) => f.misconception === when.missed);
    if (!hit) return false;
  }
  if (when.count) {
    const n = (ctx.fingerprints ?? [])
      .filter((f) => f.misconception === when.count.misconception).length;
    if (n < when.count.atLeast) return false;
  }
  return true;
}

/**
 * Render a lesson for one student: the sections they should see, in order.
 *
 * `always` sections are kept even when nothing else survives, so a lesson is
 * never empty - a student who opens something they have already mastered still
 * gets the summary rather than a blank page.
 */
export function buildLesson(lesson, ctx) {
  const sections = lesson.sections.filter((s) => sectionVisible(s, lesson, ctx));
  const shown = sections.length
    ? sections
    : lesson.sections.filter((s) => s.always);

  return {
    ...lesson,
    sections: shown,
    hidden: lesson.sections.length - shown.length,
    // What the student is being told to aim at here, so the lesson can say so.
    focus: focusTier(lesson, ctx),
  };
}

/** The difficulty tier this student should be working at in this skill. */
export function focusTier(lesson, ctx) {
  const skill = ctx.skills[lesson.skill_cd];
  if (!skill) return 'M';
  const target = skill.section === 'rw' ? ctx.student.target_rw : ctx.student.target_math;
  const weights = bandWeights(ctx.bands, skill.section, target);

  // The lowest tier they have not yet secured, capped at what their target asks.
  for (const tier of ['E', 'M', 'H']) {
    if ((weights[tier] ?? 0) <= 0.02) break;
    const acc = cellAccuracy(ctx.mastery, lesson.skill_cd, tier);
    if (acc === null || acc < 0.85) return tier;
  }
  const required = ['E', 'M', 'H'].filter((t) => (weights[t] ?? 0) > 0.02);
  return required[required.length - 1] ?? 'E';
}

/**
 * Order a set of lessons for the home screen: the skills where this student has
 * the most to gain first. Reuses the engine's own value calculation by proxying
 * each lesson as a content object at the student's focus tier.
 */
export function rankLessons(lessons, ctx, scoreItem) {
  return lessons
    .map((lesson) => ({
      lesson,
      value: scoreItem({
        id: lesson.id, type: 'lesson', skill_cd: lesson.skill_cd,
        difficulty: focusTier(lesson, ctx),
        band_floor: lesson.band_floor ?? 200,
        band_ceiling: lesson.band_ceiling ?? 1600,
      }, ctx),
    }))
    .sort((a, b) => b.value - a.value);
}
