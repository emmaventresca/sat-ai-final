// ---------------------------------------------------------------------------
// The adaptive engine.
//
// One formula decides what a student sees next:
//
//     value = P(miss) x skill frequency x bandWeight(difficulty)
//
// The third term is what makes this different from ordinary spaced repetition,
// and it is the term that stops the system over-teaching. bandWeight comes from
// the official raw-to-scaled conversion tables (data/bands.json, built by
// tools/build_bands.py) and answers: to hit your target, what fraction of this
// difficulty tier do you actually have to win?
//
// The two behaviours that follow are the point of the whole design:
//
//   * A student aiming at 1300 is never served Hard circle-equation items.
//     bandWeight('H') is ~0 for them, even though they would certainly miss
//     those items - they do not need them, so teaching them is wasted time.
//   * A student aiming at 1500 is never served Easy linear-equation drill.
//     P(miss) is ~0 there, even though those items are frequent.
//
// Promotion needs no manual step. As a (skill, difficulty) cell saturates,
// P(miss) falls, and as the student's score rises bandWeight shifts upward, so
// harder material enters the queue on its own.
// ---------------------------------------------------------------------------

export const TIERS = ['E', 'M', 'H'];

// ---------------------------------------------------------------------------
// Units of mastery
//
// The engine tracks a student at SUBTYPE level, not skill level. College
// Board's published skills are too coarse to diagnose with: "Systems of two
// linear equations" covers solving a bare system, translating a word problem
// into one, and finding the parameter that makes it have no solution. A
// student can be fluent at one and lost at another, and a skill-level score
// averages that into something that names no action.
//
// So a cell is keyed (subtype, difficulty), and a skill's mastery is derived
// from its subtypes rather than measured directly. "You are fine on bare
// systems, you are losing the ones that ask for x+y" is a lesson plan; "you
// are at 62% on Systems of Equations" is not.
// ---------------------------------------------------------------------------

/** The mastery key for a unit of practice. */
export function cellKey(item, tier = item.difficulty) {
  return `${item.subtype ?? item.skill_cd}|${tier}`;
}

/**
 * Roll a skill's subtype cells up into one number, weighted by how often each
 * subtype actually appears. Used for display and for teacher reporting - never
 * for selection, which always works at subtype level.
 */
export function skillAccuracy(skill_cd, ctx) {
  const subs = ctx.subtypesOf?.[skill_cd] ?? [];
  let seen = 0, correct = 0;
  for (const st of subs) {
    for (const tier of TIERS) {
      const cell = ctx.mastery[`${st.slug}|${tier}`];
      if (cell?.seen) { seen += cell.seen; correct += cell.correct; }
    }
  }
  return seen ? correct / seen : null;
}

// Leitner intervals in days. A miss drops to box 1 and requeues within the
// session; this mirrors what worked in sat-mills.
const BOX_DAYS = [0, 1, 3, 7, 21, 60];

// ---------------------------------------------------------------------------
// Band model
// ---------------------------------------------------------------------------

/**
 * How much of each difficulty tier this student must win, for one section.
 * Looks up the nearest target row in data/bands.json.
 */
export function bandWeights(bands, section, targetScore) {
  const rows = bands.sections[section].targets;
  let best = rows[0];
  for (const row of rows) {
    if (Math.abs(row.target - targetScore) < Math.abs(best.target - targetScore)) best = row;
  }
  return best.band_weight;
}

// ---------------------------------------------------------------------------
// Mastery
// ---------------------------------------------------------------------------

/**
 * Probability the student misses this cell next time.
 *
 * Unseen cells get a prior from the tier rather than a flat 0.5, so a brand new
 * student is not marched through Easy material they already know. The prior is
 * blended out as evidence arrives (Laplace-style, weight 3).
 */
export function pMiss(cell, tier) {
  const prior = { E: 0.25, M: 0.45, H: 0.65 }[tier] ?? 0.5;
  if (!cell || !cell.seen) return prior;
  const w = 3;
  const accuracy = (cell.correct + prior_correct(prior, w)) / (cell.seen + w);
  return clamp(1 - accuracy, 0.02, 0.98);
}

function prior_correct(prior, w) { return (1 - prior) * w; }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/**
 * How reachable this tier is for this student, in this skill.
 *
 * When the band only requires *part* of a tier - a 650 math target needs 9% of
 * the Hard items - those points should come from skills the student is already
 * close in, not from their worst skill. So Hard is earned by mastering Medium
 * in the same skill, and Medium by mastering Easy.
 *
 * Without this the engine sends a student who is shaky everywhere straight at
 * Hard circle questions, because circles are hard-weighted in the item pool and
 * so score well on frequency. That is exactly the over-teaching the design is
 * meant to prevent.
 */
export function reachability(item, ctx) {
  // The ladder is climbed within a subtype: being fluent at bare systems says
  // nothing about whether the word-problem version is reachable.
  return tierReachability(item.subtype ?? item.skill_cd,
                          item.difficulty ?? 'M', ctx);
}

// With no evidence at the tier below, a tier is open only for exploration.
const UNPROVEN = 0.05;

/**
 * Compounds down the ladder: Hard is reachable only to the extent Medium is
 * proven *and* Medium was itself reachable, which needs Easy.
 *
 * Compounding rather than looking one tier down is what keeps a hard-weighted
 * skill out of a beginner's queue. Circles have 41 Hard items against 4 Easy
 * ones, so on frequency alone a Hard circle question outscores a Medium one -
 * and a flat one-tier discount scales both equally and cannot separate them.
 * Two steps of discount can: an unproven Hard tier is penalised 20x more than
 * an unproven Medium one.
 */
export function tierReachability(skill_cd, tier, ctx) {
  if (tier === 'E') return 1;
  const below = tier === 'H' ? 'M' : 'E';
  const cell = ctx.mastery[`${skill_cd}|${below}`];
  if (!cell || !cell.seen) return UNPROVEN * tierReachability(skill_cd, below, ctx);

  const acc = clamp(cell.correct / cell.seen, 0.1, 1);
  // Strong evidence at the tier below settles the tiers under it too: a student
  // at 90% on Medium is not in doubt at Easy, whether or not we ever saw them
  // answer an Easy question. Without this, a student who started partway up the
  // ladder could never open the tier above.
  if (cell.seen >= 5 && acc >= 0.85) return acc;
  return acc * tierReachability(skill_cd, below, ctx);
}

export function isDue(cell, now = new Date()) {
  if (!cell || !cell.seen) return true;
  return new Date(cell.due_at) <= now;
}

/** Leitner update. A miss always drops straight back to box 1. */
export function updateMastery(cell, correct, now = new Date()) {
  const seen = (cell?.seen ?? 0) + 1;
  const got = (cell?.correct ?? 0) + (correct ? 1 : 0);
  const box = correct ? Math.min(5, (cell?.box ?? 1) + 1) : 1;
  const due = new Date(now);
  if (correct) due.setDate(due.getDate() + BOX_DAYS[box]);
  else due.setMinutes(due.getMinutes() + 10);
  return {
    ...cell, seen, correct: got, box,
    rolling_accuracy: got / seen,
    due_at: due.toISOString(),
    updated_at: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Score one candidate content object.
 *
 * @param item    {id, skill_cd, difficulty, type, band_floor, band_ceiling}
 * @param ctx     {bands, skills, mastery, student, now}
 */
export function scoreItem(item, ctx) {
  const skill = ctx.skills[item.skill_cd];
  if (!skill) return 0;

  const section = skill.section;                       // 'rw' | 'math'
  const target = section === 'rw' ? ctx.student.target_rw : ctx.student.target_math;
  const current = section === 'rw' ? ctx.student.current_rw : ctx.student.current_math;

  // Hard band gate: content authored for a different part of the curve.
  const total = (ctx.student.current_rw ?? 0) + (ctx.student.current_math ?? 0);
  if (total && (total < item.band_floor || total > item.band_ceiling)) return 0;

  const tier = item.difficulty ?? 'M';
  const weight = bandWeights(ctx.bands, section, target)[tier] ?? 0;
  if (weight <= 0.02) return 0;                        // they do not need this tier

  const cell = ctx.mastery[cellKey(item, tier)];
  if (!isDue(cell, ctx.now)) return 0;                 // not yet due for review

  const miss = pMiss(cell, tier);
  const frequency = skillFrequency(skill, tier, item, ctx);

  // Strategy and triage cards are force-multipliers rather than single points,
  // so they carry a premium over a single practice item.
  const typeBoost = { strategy: 1.6, triage: 1.5, lesson: 1.3, card: 1.0, item: 1.0 };

  return miss * frequency * weight * reachability(item, ctx) * (typeBoost[item.type] ?? 1);
}

/**
 * Share of the section's official item pool this unit occupies.
 *
 * Prefers the measured subtype counts when the item names a subtype, and falls
 * back to the skill's counts otherwise. The counts are measured rather than
 * estimated: every question in the official export was classified into a
 * subtype, because the engine multiplies by frequency and a guessed share
 * sends students at the wrong thing.
 */
export function skillFrequency(skill, tier, item = null, ctx = null) {
  const sub = item?.subtype && ctx?.subtypes?.[item.subtype];
  if (sub) {
    const n = { E: sub.count_e, M: sub.count_m, H: sub.count_h }[tier] ?? 0;
    return n / (sub.section_total || skill.section_total || 1);
  }
  const n = { E: skill.bank_count_e, M: skill.bank_count_m, H: skill.bank_count_h }[tier] ?? 0;
  return n / (skill.section_total || 1);
}

/**
 * Build the next round. Takes the highest-value items, but caps how many come
 * from any one skill so a session does not become twenty circle questions.
 */
export function selectRound(candidates, ctx,
                            { size = 20, maxPerSkill = 4, maxPerSubtype = 3 } = {}) {
  const scored = candidates
    .map((item) => ({ item, value: scoreItem(item, ctx) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  // Cap per skill AND per subtype. Without the second cap a round can be four
  // different skills and still be four copies of the same recognition.
  const perSkill = new Map();
  const perSubtype = new Map();
  const out = [];
  for (const { item, value } of scored) {
    const used = perSkill.get(item.skill_cd) ?? 0;
    if (used >= maxPerSkill) continue;
    const usedSub = item.subtype ? (perSubtype.get(item.subtype) ?? 0) : 0;
    if (item.subtype && usedSub >= maxPerSubtype) continue;
    perSkill.set(item.skill_cd, used + 1);
    if (item.subtype) perSubtype.set(item.subtype, usedSub + 1);
    out.push({ ...item, _value: value });
    if (out.length >= size) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strategy triggers
//
// A strategy card can fire on a *pattern* of errors rather than a schedule:
// three transition misses that are all contrast-vs-addition should surface the
// restatement-trap card, which is not something spaced repetition would ever do.
// ---------------------------------------------------------------------------

export function firedTriggers(strategyCards, fingerprints, ctx) {
  const byMisconception = new Map();
  for (const f of fingerprints) {
    if (!f.misconception) continue;
    byMisconception.set(f.misconception, (byMisconception.get(f.misconception) ?? 0) + 1);
  }
  const bySkill = new Map();
  for (const f of fingerprints) {
    bySkill.set(f.skill_cd, (bySkill.get(f.skill_cd) ?? 0) + 1);
  }

  return strategyCards.filter((card) => {
    const t = card.trigger;
    if (!t) return false;
    if (t.misconception && (byMisconception.get(t.misconception) ?? 0) >= (t.count ?? 3)) return true;
    if (t.skill_cd && (bySkill.get(t.skill_cd) ?? 0) >= (t.count ?? 3)) return true;
    return false;
  });
}
