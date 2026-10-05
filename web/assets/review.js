// ---------------------------------------------------------------------------
// Review - the mistakes, organised.
//
// A wrong answer is the most useful thing a student produces, and until now it
// vanished the moment the round ended. This module keeps it: every miss joined
// back to the question type it came from and the named error that caused it,
// so "I keep getting transitions wrong" becomes "you pick contrast when the
// sentence is adding a second reason, nine times now".
//
// Two levels, because they answer different questions:
//
//   subtype          what kind of question keeps beating you
//   misconception    the specific wrong move you keep making inside it
//
// Then the only useful next step: ten more of exactly that, not ten more of
// the skill in general. Those come from the bank first - unseen items of the
// same subtype whose distractors are built to catch the same error - and are
// generated on request when the bank runs out.
// ---------------------------------------------------------------------------

const REINFORCE_N = 10;

/**
 * A readable name for a misconception family.
 *
 * The taxonomy carries `label` (what to tell the student) and `when` (how to
 * assign it when authoring). Neither is a title, and `when` is an instruction
 * to an item writer that no student should ever be shown. So the heading is
 * the slug, made readable.
 */
export function familyName(slug, ctx) {
  const f = ctx?.misconceptions?.[slug];
  if (f?.name) return f.name;
  return String(slug).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Every miss, newest first, joined to its item.
 *
 * Attempts outlive the bank: an item can be rewritten or dropped between
 * sessions, and the attempt row still refers to it. Those are skipped rather
 * than rendered as a blank card.
 */
export function misses(ctx) {
  const byId = ctx.itemsById ?? Object.fromEntries(ctx.items.map((i) => [i.id, i]));
  const out = [];
  for (const a of ctx.attempts ?? []) {
    if (a.correct) continue;
    const item = byId[a.content_id];
    if (!item) continue;
    out.push({
      attempt: a, item,
      family: item.misconceptions?.[a.chosen] ?? null,
      at: a.created_at,
    });
  }
  return out;
}

/**
 * Misses grouped by question type, each with its own breakdown of errors.
 *
 * Ordered by how often the student misses it, not by how often the real test
 * asks it. This screen is about them; the home screen already argues about
 * what pays.
 */
export function missGroups(ctx) {
  const groups = new Map();
  for (const m of misses(ctx)) {
    const key = m.item.subtype || m.item.skill_cd;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        subtype: m.item.subtype || null,
        skill_cd: m.item.skill_cd,
        title: m.item.subtype_name || ctx.skills?.[m.item.skill_cd]?.skill_name || key,
        skill_name: ctx.skills?.[m.item.skill_cd]?.skill_name ?? '',
        section: ctx.skills?.[m.item.skill_cd]?.section ?? '',
        misses: [], families: new Map(), tiers: { E: 0, M: 0, H: 0 },
      };
      groups.set(key, g);
    }
    g.misses.push(m);
    g.tiers[m.item.difficulty] = (g.tiers[m.item.difficulty] ?? 0) + 1;
    if (m.family) g.families.set(m.family, (g.families.get(m.family) ?? 0) + 1);
  }

  for (const g of groups.values()) {
    g.count = g.misses.length;
    g.lastAt = g.misses[0]?.at ?? null;
    g.topFamilies = [...g.families.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([slug, n]) => ({ slug, n, name: familyName(slug, ctx) }));
    // Where they are losing them, which is where reinforcement should sit.
    g.worstTier = ['H', 'M', 'E'].find((t) => g.tiers[t]) ?? 'E';
  }
  return [...groups.values()].sort((a, b) =>
    b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)));
}

/** How many questions a student has missed in total, for the home-screen chip. */
export function missCount(ctx) {
  return misses(ctx).length;
}

/**
 * Ten more of exactly this.
 *
 * Ranked, not filtered, so a thin subtype still returns a full round rather
 * than four questions: an unseen item of the same subtype is always better
 * than nothing, and one whose distractors target the error they keep making
 * is better still.
 */
export function reinforcementSet(group, ctx, n = REINFORCE_N) {
  const seen = new Set((ctx.attempts ?? []).map((a) => a.content_id));
  const wanted = new Set(group.topFamilies.map((f) => f.slug));
  const missedIds = new Set(group.misses.map((m) => m.item.id));

  const pool = (ctx.items ?? []).filter((i) =>
    (group.subtype ? i.subtype === group.subtype : i.skill_cd === group.skill_cd));

  const score = (i) => {
    let s = 0;
    const fams = Object.values(i.misconceptions ?? {});
    if (fams.some((f) => wanted.has(f))) s += 100;
    s += fams.filter((f) => wanted.has(f)).length * 10;
    if (!seen.has(i.id)) s += 50;                 // fresh beats repeated
    if (i.difficulty === group.worstTier) s += 20;
    return s;
  };

  const ranked = pool
    .filter((i) => !missedIds.has(i.id))          // the misses themselves are reviewed above
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));

  const picked = ranked.slice(0, n);
  const fresh = picked.filter((i) => !seen.has(i.id)).length;
  return { items: picked, fresh, shortfall: Math.max(0, n - fresh) };
}

// ---------------------------------------------------------------------------
// Generating more
//
// When the bank cannot field ten fresh questions for a subtype, we ask for
// more. That needs a model, so it only works where tools/planner_server.py is
// running - the teacher's own machine. Everywhere else the shortfall is stated
// plainly instead of being papered over with repeats presented as new.
// ---------------------------------------------------------------------------

const GENERATOR = 'http://localhost:8791';

export async function generatorAvailable() {
  try {
    const r = await fetch(`${GENERATOR}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

/**
 * Ask for n new items in this subtype, aimed at the errors the student keeps
 * making. Resolves to the new items; they are appended to the live bank by
 * the caller so the round can use them immediately.
 */
export async function generateMore(group, ctx, n = REINFORCE_N) {
  const r = await fetch(`${GENERATOR}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subtype: group.subtype,
      skill_cd: group.skill_cd,
      difficulty: group.worstTier,
      n,
      misconceptions: group.topFamilies.slice(0, 3).map((f) => f.slug),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `generator returned ${r.status}`);
  return data.items ?? [];
}
