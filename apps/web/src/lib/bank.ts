import type { Exam, Question, Tier } from '../exams/types'

/**
 * One bank per exam, split so the first load is small.
 *
 * The app used to fetch 19MB of question bodies to render a list of topic
 * names. On a school network - the one place this has to work, and the
 * reason every library is vendored instead of fetched from a CDN - that is
 * the difference between a tool and a spinner.
 *
 * So there are two things now, and the type system keeps them apart:
 *
 *   QuestionRef   what a question IS: exam, section, skill, recognition,
 *                 level, wording. Enough to decide what to show. 1.2MB for
 *                 both exams.
 *   Question      what a question SAYS. Fetched one recognition at a time,
 *                 which is the unit a student practises in anyway.
 *
 * They are separate types on purpose. A ref has no stem, and code that
 * tries to render one will not compile - which is better than code that
 * renders an empty question and looks like a loading bug.
 *
 * The banks themselves stay apart as they always have: two indexes, two sets
 * of chunks, never merged. A merged array is one filter away from an ACT
 * question in an SAT round, and that failure is silent.
 */
const BASE = import.meta.env.BASE_URL ?? '/'

export interface QuestionRef {
  id: string
  exam: Exam
  section: string
  skill: string
  subtype: string | null
  subtypeName?: string | null
  difficulty: Tier
  format: 'mc' | 'grid'
  phrasing?: string
  /** Which chunk holds this question's body. */
  chunk: string
  /**
   * One line of the stem.
   *
   * Without it a picker is forty identical rows - every transition question
   * reads "Which choice completes the text with the most logical
   * transition?" - and choosing between them means opening each one.
   */
  teaser: string
}

const indexes = new Map<Exam, QuestionRef[]>()
const chunks = new Map<string, Question[]>()

export async function loadIndex(exam: Exam): Promise<QuestionRef[]> {
  const already = indexes.get(exam)
  if (already) return already

  const res = await fetch(`${BASE}data/${exam}/index.json`)
  if (!res.ok) throw new Error(`could not load the ${exam.toUpperCase()} bank`)
  const blob = (await res.json()) as { items?: RawRef[] }
  const refs = (blob.items ?? []).map((raw) => ({
    id: raw.id,
    exam,
    section: raw.section ?? 'math',
    skill: raw.skill ?? raw.skill_cd ?? '',
    subtype: raw.subtype ?? null,
    subtypeName: raw.subtype_name ?? null,
    difficulty: raw.difficulty as Tier,
    format: raw.format === 'grid' ? 'grid' : 'mc',
    phrasing: raw.phrasing,
    chunk: raw.chunk ?? '_unsorted',
    teaser: raw.teaser ?? '',
  } as QuestionRef))
  indexes.set(exam, refs)
  return refs
}

/** The bodies for one recognition. */
export async function loadChunk(exam: Exam, chunk: string): Promise<Question[]> {
  const key = `${exam}/${chunk}`
  const already = chunks.get(key)
  if (already) return already

  const res = await fetch(`${BASE}data/${exam}/q/${chunk}.json`)
  if (!res.ok) throw new Error(`could not load questions for ${chunk}`)
  const blob = (await res.json()) as { items?: RawItem[] }
  const items = (blob.items ?? []).map((raw) => normalise(raw, exam))
  chunks.set(key, items)
  return items
}

/**
 * Bodies for a set of questions, by id.
 *
 * Fetches each chunk once however many ids it covers, because the ids in an
 * assignment or a review set usually cluster in one or two recognitions -
 * that is what makes them a set.
 */
export async function loadBodies(exam: Exam, ids: readonly string[]): Promise<Question[]> {
  const index = await loadIndex(exam)
  const want = new Set(ids)
  const needed = new Set(
    index.filter((r) => want.has(r.id)).map((r) => r.chunk),
  )
  const loaded = await Promise.all([...needed].map((c) => loadChunk(exam, c)))
  const byId = new Map(loaded.flat().map((q) => [q.id, q]))
  // In the order asked for: an assignment's order is the teaching order.
  return ids.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q))
}

/** Bodies for whole recognitions. */
export async function loadSubtypes(
  exam: Exam, subtypes: readonly (string | null)[],
): Promise<Question[]> {
  const index = await loadIndex(exam)
  const want = new Set(subtypes)
  const needed = new Set(
    index.filter((r) => want.has(r.subtype)).map((r) => r.chunk),
  )
  const loaded = await Promise.all([...needed].map((c) => loadChunk(exam, c)))
  return loaded.flat().filter((q) => want.has(q.subtype))
}

interface RawRef {
  id: string
  section?: string
  skill?: string
  skill_cd?: string
  subtype?: string | null
  subtype_name?: string | null
  difficulty: string
  format?: string
  phrasing?: string
  chunk?: string
  teaser?: string
}

interface RawItem extends RawRef {
  stimulus?: string | null
  stem: string
  figure?: unknown
  figures?: unknown[]
  figure_html?: string[]
  choices?: string[]
  answer?: string
  keys?: string[]
  explanation?: string
  per_choice?: Record<string, string>
  misconceptions?: Record<string, string>
}

/**
 * The two banks were built years apart and name things differently. This is
 * the only place that knows about either set of field names.
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
    // Already-drawn displays, which is how the ACT bank carries them.
    figures: raw.figure_html ?? raw.figures,
    choices: raw.choices,
    answer: raw.answer,
    keys: raw.keys,
    explanation: raw.explanation,
    perChoice: raw.per_choice,
    misconceptions: raw.misconceptions,
    phrasing: raw.phrasing,
  }
}
