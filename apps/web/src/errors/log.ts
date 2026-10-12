import type { Attempt } from '../practice/mastery'

/**
 * The error log: every question a student got wrong, until they fix it.
 *
 * Two ideas, and the first one is a correction to how the app counted.
 *
 * A missed question used to mark a recognition as worked. The stop said
 * "all 21 done" and the bar filled, when what actually happened was that the
 * student met 21 questions and got six of them wrong. That is the opposite
 * of the truth, and it is the one place the app was flattering somebody
 * instead of telling them where they stand. A question is DONE when it has
 * been answered correctly. Until then it is open, and it counts as left.
 *
 * The second is that a mistake is worth more than a score. Where it happened
 * - which recognition, which named error, which wording - is the most useful
 * thing a student produces all week, and it used to vanish into an accuracy
 * percentage. So every miss stays on a list with its own history until it is
 * re-solved, and the student can write down what went wrong in their own
 * words, which is the part a tutor can actually read.
 */

export interface ErrorNote {
  /** The student's own words. Theirs, not ours - never generated. */
  text: string
  at: string
}

export interface ErrorEntry {
  questionId: string
  exam: string
  subtype: string | null
  skill: string
  difficulty: string
  /** The misconception the wrong choice was built to catch, if tagged. */
  family: string | null
  /** Every time they have met it, oldest first. */
  attempts: { chosen: string; correct: boolean; at: string }[]
  /** When they first got it wrong. */
  firstMissed: string
  /** When they finally got it right, if they have. */
  fixedAt: string | null
  /** How many times they have had another go since first missing it. */
  retries: number
  note: ErrorNote | null
}

const NOTES_KEY = 'prep.errornotes'

function notes(): Record<string, ErrorNote> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}') as Record<string, ErrorNote>
  } catch {
    return {}
  }
}

export function noteFor(questionId: string): ErrorNote | null {
  return notes()[questionId] ?? null
}

export function saveNote(questionId: string, text: string): void {
  const all = notes()
  if (text.trim()) {
    all[questionId] = { text: text.trim(), at: new Date().toISOString() }
  } else {
    delete all[questionId]
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(all))
}

/**
 * Build the log from the attempt history.
 *
 * Derived rather than stored, so it can never drift out of step with what
 * the student actually did - and so a student who clears their progress does
 * not keep a list of mistakes for questions the app has forgotten.
 */
export function errorLog(attempts: readonly Attempt[], exam?: string): ErrorEntry[] {
  const byQuestion = new Map<string, Attempt[]>()
  for (const a of attempts) {
    if (exam && a.exam !== exam) continue
    const list = byQuestion.get(a.questionId) ?? []
    list.push(a)
    byQuestion.set(a.questionId, list)
  }

  const out: ErrorEntry[] = []
  const saved = notes()
  for (const [questionId, list] of byQuestion) {
    const ordered = [...list].sort((a, b) => a.at.localeCompare(b.at))
    const firstMiss = ordered.find((a) => !a.correct)
    if (!firstMiss) continue                    // never got it wrong
    const after = ordered.filter((a) => a.at > firstMiss.at)
    const fixed = after.find((a) => a.correct)
    const seed = ordered[0]
    out.push({
      questionId,
      exam: seed.exam,
      subtype: seed.subtype,
      skill: seed.skill,
      difficulty: seed.difficulty,
      family: firstMiss.misconception ?? null,
      attempts: ordered.map((a) => ({ chosen: a.chosen, correct: a.correct, at: a.at })),
      firstMissed: firstMiss.at,
      fixedAt: fixed?.at ?? null,
      retries: after.length,
      note: saved[questionId] ?? null,
    })
  }
  // Open first, then by how recently it bit them.
  return out.sort((a, b) =>
    Number(Boolean(a.fixedAt)) - Number(Boolean(b.fixedAt))
    || b.firstMissed.localeCompare(a.firstMissed))
}

export function open(log: readonly ErrorEntry[]): ErrorEntry[] {
  return log.filter((e) => !e.fixedAt)
}

export function fixed(log: readonly ErrorEntry[]): ErrorEntry[] {
  return log.filter((e) => e.fixedAt)
}

export interface TopicRow {
  key: string
  skill: string
  subtype: string | null
  name: string
  open: number
  fixed: number
}

/**
 * Mistakes grouped by where they happened.
 *
 * Skill then recognition, because those are the two levels a teacher thinks
 * in: "she is losing Percentages" and "specifically, working backward to the
 * original whole".
 */
export function byTopic(
  log: readonly ErrorEntry[],
  names: Record<string, string> = {},
): TopicRow[] {
  const rows = new Map<string, TopicRow>()
  for (const e of log) {
    const key = `${e.skill}|${e.subtype ?? ''}`
    const row = rows.get(key) ?? {
      key,
      skill: e.skill,
      subtype: e.subtype,
      name: names[e.subtype ?? ''] ?? e.subtype ?? e.skill,
      open: 0,
      fixed: 0,
    }
    if (e.fixedAt) row.fixed += 1
    else row.open += 1
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => b.open - a.open || b.fixed - a.fixed)
}

/**
 * Questions that still count as unfinished.
 *
 * The set a progress bar should treat as NOT done: never attempted, or
 * attempted and still wrong. This is what makes "17 of 21 left" honest.
 */
export function unresolved(attempts: readonly Attempt[]): Set<string> {
  const best = new Map<string, boolean>()
  for (const a of attempts) {
    best.set(a.questionId, (best.get(a.questionId) ?? false) || a.correct)
  }
  const out = new Set<string>()
  for (const [id, ok] of best) if (!ok) out.add(id)
  return out
}

/** Questions answered correctly at least once. */
export function resolved(attempts: readonly Attempt[]): Set<string> {
  const out = new Set<string>()
  for (const a of attempts) if (a.correct) out.add(a.questionId)
  return out
}


export interface TopicGroup {
  key: string
  skill: string
  subtype: string | null
  name: string
  open: number
  fixed: number
  entries: ErrorEntry[]
}

export interface SkillGroup {
  /** The skill code, e.g. "Q.B.". Stable, and not for showing. */
  skill: string
  /** What that code means, e.g. "Percentages". */
  name: string
  /** The domain it sits in, e.g. "Problem-Solving and Data Analysis". */
  domain: string
  open: number
  fixed: number
  topics: TopicGroup[]
}

/** skill_cd -> what to call it, from data/skills.json. */
export interface SkillLabel {
  skill_name: string
  domain_name: string
}

/**
 * Mistakes as a two-level tree: skill, then recognition.
 *
 * A flat list of forty entries is a list nobody reads - every row says
 * "Percent change · Medium · missed once" and the shape of the problem is
 * invisible. Grouped, the same forty say "you are losing Percentages, and
 * specifically working backward to the original whole", which is the
 * sentence a teacher can act on.
 *
 * Both levels are sorted by how many are still OPEN, because open is work
 * outstanding and fixed is history.
 */
export function grouped(
  log: readonly ErrorEntry[],
  names: Record<string, string> = {},
  skills: Record<string, SkillLabel> = {},
): SkillGroup[] {
  const topics = new Map<string, TopicGroup>()
  for (const e of log) {
    const key = `${e.skill}|${e.subtype ?? ''}`
    const t = topics.get(key) ?? {
      key,
      skill: e.skill,
      subtype: e.subtype,
      name: names[e.subtype ?? ''] ?? e.subtype ?? e.skill,
      open: 0,
      fixed: 0,
      entries: [],
    }
    t.entries.push(e)
    if (e.fixedAt) t.fixed += 1
    else t.open += 1
    topics.set(key, t)
  }

  const groups = new Map<string, SkillGroup>()
  for (const t of topics.values()) {
    // The code is what the data carries; the name is what a student can
    // read. A heading of "Q.B." tells nobody they keep losing percentages.
    const label = skills[t.skill]
    const g = groups.get(t.skill) ?? {
      skill: t.skill,
      name: (label?.skill_name ?? t.skill).trim(),
      domain: (label?.domain_name ?? '').trim(),
      open: 0,
      fixed: 0,
      topics: [],
    }
    g.topics.push(t)
    g.open += t.open
    g.fixed += t.fixed
    groups.set(t.skill, g)
  }

  for (const g of groups.values()) {
    g.topics.sort((a, b) => b.open - a.open || b.fixed - a.fixed)
    // Within a recognition: open first, then most recently missed.
    for (const t of g.topics) {
      t.entries.sort((a, b) =>
        Number(Boolean(a.fixedAt)) - Number(Boolean(b.fixedAt))
        || b.firstMissed.localeCompare(a.firstMissed))
    }
  }
  return [...groups.values()].sort((a, b) => b.open - a.open || b.fixed - a.fixed)
}
