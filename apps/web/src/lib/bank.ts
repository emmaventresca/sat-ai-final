import type { Exam, Question, Tier } from '../exams/types'

/**
 * One bank per exam, loaded on demand and never merged.
 *
 * The merge is the thing to avoid. Two banks in one array is one filter away
 * from an ACT question in an SAT round, and that failure is silent - the
 * question renders fine and the student only finds out it was the wrong test
 * when they cannot see why it is hard. Separate maps, keyed by exam, make it
 * impossible to ask for "the questions" without saying which exam.
 */
const BASE = import.meta.env.BASE_URL ?? '/'

const SOURCES: Record<Exam, string> = {
  sat: `${BASE}data/practice.json`,
  act: `${BASE}data/act/questions.json`,
}

const cache = new Map<Exam, Question[]>()

export async function loadBank(exam: Exam): Promise<Question[]> {
  const already = cache.get(exam)
  if (already) return already

  const res = await fetch(SOURCES[exam])
  if (!res.ok) throw new Error(`could not load the ${exam.toUpperCase()} bank`)
  const blob = (await res.json()) as { items?: unknown[] }
  const items = (blob.items ?? []).map((raw) => normalise(raw as RawItem, exam))
  cache.set(exam, items)
  return items
}

interface RawItem {
  id: string
  section?: string
  skill?: string
  skill_cd?: string
  subtype?: string | null
  subtype_name?: string | null
  difficulty: string
  format?: string
  stimulus?: string | null
  stem: string
  figure?: unknown
  figures?: unknown[]
  choices?: string[]
  answer?: string
  keys?: string[]
  explanation?: string
  per_choice?: Record<string, string>
  misconceptions?: Record<string, string>
  phrasing?: string
}

/**
 * The two banks were built years apart and name things differently. This is
 * the only place that knows about either set of field names; everything
 * downstream sees one shape.
 */
function normalise(raw: RawItem, exam: Exam): Question {
  return {
    id: raw.id,
    exam,
    section: raw.section ?? 'math',
    skill: raw.skill ?? raw.skill_cd ?? '',
    subtype: raw.subtype ?? null,
    subtypeName: raw.subtype_name ?? null,
    difficulty: raw.difficulty as Tier,
    format: raw.format === 'grid' ? 'grid' : 'mc',
    stimulus: raw.stimulus ?? null,
    stem: raw.stem,
    figure: raw.figure,
    figures: raw.figures,
    choices: raw.choices,
    answer: raw.answer,
    keys: raw.keys,
    explanation: raw.explanation,
    perChoice: raw.per_choice,
    misconceptions: raw.misconceptions,
    phrasing: raw.phrasing,
  }
}

/** Questions for one exam at one level, for one recognition. */
export function pick(
  bank: Question[],
  opts: { subtype?: string | null; skill?: string; tier?: Tier },
): Question[] {
  return bank.filter(
    (q) =>
      (opts.subtype == null || q.subtype === opts.subtype) &&
      (opts.skill == null || q.skill === opts.skill) &&
      (opts.tier == null || q.difficulty === opts.tier),
  )
}
