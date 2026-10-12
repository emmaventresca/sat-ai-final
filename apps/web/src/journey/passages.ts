import type { QuestionRef } from '../lib/bank'

/**
 * Serving a Reading round by passage instead of by question.
 *
 * The real ACT Reading section is four passages carrying roughly ten
 * questions each. Practising it one question at a time means reading a fresh
 * passage for every single question, which is the single biggest waste of
 * time anywhere in this app: a student spends four minutes reading for forty
 * seconds of question. Nothing about that rehearses the real thing either -
 * on the test you read once and then answer ten.
 *
 * So a round takes passages WHOLE. The rule that matters is that a passage is
 * never split across rounds, because the half you meet tomorrow costs a
 * second full read of something you already read today. That means round
 * length varies, and the alternative - trimming a passage to hit a round
 * size - is the thing we are trying to stop.
 *
 * Passage density differs by genre in the current bank (humanities carry
 * 6.2 questions per passage, social science 4.4), so rounds will be uneven
 * until that evens out upstream. `TARGET` is a floor to aim past rather than
 * a cap, which keeps a thin passage from becoming a two-question round.
 */

/**
 * Sections where a passage is shared by many questions.
 *
 * English belongs here as much as Reading does. Every ACT English question
 * carries a passage_id - 193 passages over 357 questions - and leaving the
 * section out meant each one was served on its own, so a student re-read the
 * same passage from the top for one underlined clause and then met it again
 * two questions later. The real paper puts fifteen questions on one English
 * passage for exactly this reason.
 */
const PASSAGE_SECTIONS = new Set(['reading', 'science', 'english'])

export function groupedBySection(section: string): boolean {
  return PASSAGE_SECTIONS.has(section)
}

/** Questions to aim for in a round. Passed, not truncated to. */
export const TARGET = 10

export interface PassageGroup {
  id: string
  type: string | null
  refs: QuestionRef[]
  /** How many of these the student has never answered. */
  fresh: number
}

/** Every passage in a pool, with its questions, newest-first within each. */
export function groupByPassage(
  refs: readonly QuestionRef[],
  attempted: ReadonlySet<string>,
): PassageGroup[] {
  const byId = new Map<string, PassageGroup>()
  const loose: QuestionRef[] = []

  for (const ref of refs) {
    if (!ref.passageId) {
      loose.push(ref)
      continue
    }
    let g = byId.get(ref.passageId)
    if (!g) {
      g = { id: ref.passageId, type: ref.passageType ?? null, refs: [], fresh: 0 }
      byId.set(ref.passageId, g)
    }
    g.refs.push(ref)
  }

  for (const g of byId.values()) {
    g.fresh = g.refs.filter((r) => !attempted.has(r.id)).length
    // Inside a passage, unseen questions first: a student re-reading a
    // passage they have met should get the questions they have not.
    g.refs.sort((a, b) =>
      Number(attempted.has(a.id)) - Number(attempted.has(b.id))
      || a.id.localeCompare(b.id))
  }

  // Anything with no passage becomes a group of one, so a mixed pool still
  // works and nothing is silently dropped.
  for (const ref of loose) {
    byId.set(`solo:${ref.id}`, {
      id: `solo:${ref.id}`,
      type: ref.passageType ?? null,
      refs: [ref],
      fresh: attempted.has(ref.id) ? 0 : 1,
    })
  }

  return [...byId.values()]
}

/**
 * One round: whole passages, most-unseen first, until the target is passed.
 *
 * Ordered by how much of the passage is NEW rather than by passage id,
 * because a student who has done eight of a passage's ten questions should
 * not re-read it for the sake of the last two while an untouched passage
 * waits. A passage with nothing new left is served only if nothing else is.
 */
export function passageRound(
  refs: readonly QuestionRef[],
  attempted: ReadonlySet<string>,
  target: number = TARGET,
): QuestionRef[] {
  const groups = groupByPassage(refs, attempted)
    .sort((a, b) => b.fresh - a.fresh || a.id.localeCompare(b.id))

  const out: QuestionRef[] = []
  for (const g of groups) {
    if (out.length >= target) break
    out.push(...g.refs)
  }
  return out
}

/**
 * How a round will actually be shaped, for telling the student before they
 * start. "Two passages, 14 questions" is a different commitment from
 * "14 questions" and they should know which they are agreeing to.
 */
export function shapeOf(
  refs: readonly QuestionRef[],
  attempted: ReadonlySet<string>,
  target: number = TARGET,
): { passages: number; questions: number } {
  const picked = passageRound(refs, attempted, target)
  const ids = new Set(picked.map((r) => r.passageId ?? `solo:${r.id}`))
  return { passages: ids.size, questions: picked.length }
}

/** Readable name for a passage type. */
export function passageTypeName(slug: string | null | undefined): string {
  if (!slug) return 'Unclassified'
  return slug.replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface TypeRow {
  type: string
  seen: number
  correct: number
  accuracy: number | null
}

/**
 * Accuracy by passage type.
 *
 * The dimension a topic average hides: a student can be fine on Craft &
 * Structure in a science passage and lost in prose fiction, and the subtype
 * breakdown reports one number for both. Same shape as the wording-family
 * breakdown, and for the same reason.
 */
export function byPassageType(
  attempts: readonly { questionId: string; correct: boolean }[],
  refs: readonly QuestionRef[],
): TypeRow[] {
  const typeOf = new Map(refs.map((r) => [r.id, r.passageType]))
  const tally = new Map<string, { seen: number; correct: number }>()
  for (const a of attempts) {
    const t = typeOf.get(a.questionId)
    if (!t) continue
    const row = tally.get(t) ?? { seen: 0, correct: 0 }
    row.seen += 1
    if (a.correct) row.correct += 1
    tally.set(t, row)
  }
  return [...tally.entries()]
    .map(([type, r]) => ({
      type,
      seen: r.seen,
      correct: r.correct,
      accuracy: r.seen ? r.correct / r.seen : null,
    }))
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))
}
