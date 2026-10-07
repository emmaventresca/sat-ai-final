import type { Exam, Question } from '../exams/types'
import { difficultyRank } from './types'
import type { LessonAnswer, LessonPlan, LessonQuestion, LessonSection } from './types'

/**
 * The planner's spec, turned into something the renderer can show.
 *
 * The planner returns structure and judgement - which recognitions, in what
 * order, for how long, and which item ids - and deliberately not prose about
 * the questions themselves. That is the right split: the questions already
 * exist, verified, with their explanations and the named error each wrong
 * choice catches, so asking a model to describe them again would be asking
 * it to restate something we can simply look up, with a chance of getting it
 * wrong.
 *
 * So this joins the spec to the bank. Anything the planner cites that does
 * not exist is dropped and reported rather than rendered as a blank - a
 * hallucinated id on a screen-shared lesson is worse than a short lesson.
 */

export interface PlannerBlock {
  minutes?: number
  subtype?: string
  why?: string
  teach?: string
  items?: string[]
}

export interface PlannerLesson {
  kind?: string
  title?: string
  subtitle?: string
  student?: { from?: number; to?: number }
  minutes?: number
  opening?: string
  blocks?: PlannerBlock[]
  closing?: string
  checklist?: string[]
}

export interface Converted {
  plan: LessonPlan
  /** Ids the planner cited that are not in the bank. */
  missing: string[]
}

/** Prose into renderable lines; a planner writes paragraphs, not arrays. */
function lines(text: string | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
}

function answerFor(q: Question): LessonAnswer | undefined {
  // A grid-in has no letter, so the accepted forms ARE the answer - and all
  // of them matter, since a student who writes 3/2 for 1.5 is right.
  const value = q.format === 'grid' ? (q.keys ?? []).join('  or  ') : q.answer ?? ''
  if (!value) return undefined

  const why = stripTags(q.perChoice?.correct ?? q.explanation ?? '')
  // The trap is whichever wrong choice the item was built around. Any of
  // them will do to say out loud; the first tagged one is the likeliest.
  const trapKey = Object.keys(q.misconceptions ?? {})[0]
  const trap = trapKey ? stripTags(q.perChoice?.[trapKey] ?? '') : ''
  return { value, why: why || undefined, trap: trap || undefined }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function toLessonQuestion(q: Question): LessonQuestion {
  return {
    id: q.id,
    category: q.subtypeName || q.subtype || q.skill || '',
    difficulty: q.difficulty,
    format: q.format,
    stimulus: q.stimulus ?? null,
    stem: q.stem,
    figure: (q.figure ?? null) as LessonQuestion['figure'],
    choices: q.choices,
    answer: answerFor(q),
  }
}

export function fromPlanner(
  spec: PlannerLesson,
  bank: Question[],
  exam: Exam,
): Converted {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const missing: string[] = []
  const used = new Map<string, LessonQuestion>()

  const sections: LessonSection[] = (spec.blocks ?? []).map((block) => {
    const ids: string[] = []
    for (const id of block.items ?? []) {
      const q = byId.get(id)
      if (!q) {
        missing.push(id)
        continue
      }
      if (!used.has(id)) used.set(id, toLessonQuestion(q))
      ids.push(id)
    }
    // Inside a block, climb. The planner picks which recognition and how
    // long; the order within it is a property of the questions, and easiest
    // first is how a student meets the same idea in harder clothes.
    ids.sort((a, b) => {
      const qa = used.get(a)
      const qb = used.get(b)
      return qa && qb ? difficultyRank(qa.difficulty) - difficultyRank(qb.difficulty) : 0
    })

    return {
      heading: headingFor(block, ids, used, bank),
      minutes: Math.max(0, Math.round(block.minutes ?? 0)),
      body: lines(block.teach),
      questionIds: ids.length ? ids : undefined,
      prompts: block.why ? [block.why] : undefined,
    }
  })

  // The opening needs minutes or it is a row on the run sheet reading 0-0,
  // which looks like a bug. When the blocks already fill the hour it belongs
  // at the top of the first one instead - the teacher still says it, they
  // just say it inside the time that was budgeted.
  if (spec.opening) {
    const spent = sections.reduce((n, s) => n + s.minutes, 0)
    const spare = Math.min(10, (spec.minutes ?? 0) - spent)
    if (spare > 0) {
      sections.unshift({ heading: 'Where this sits', minutes: spare,
                         body: lines(spec.opening) })
    } else if (sections.length) {
      sections[0] = { ...sections[0],
                      body: [...lines(spec.opening), ...sections[0].body] }
    } else {
      sections.push({ heading: 'Where this sits', minutes: spec.minutes ?? 0,
                      body: lines(spec.opening) })
    }
  }

  return {
    plan: {
      title: spec.title || 'Lesson',
      subtitle: spec.subtitle || studentLine(spec),
      exam,
      duration: spec.minutes,
      sections,
      questions: [...used.values()],
      teacherNotes: spec.checklist,
      closing: spec.closing,
    },
    missing,
  }
}

/**
 * What to call a block.
 *
 * The recognition's own name where we can get it - from a question in the
 * block, or failing that from any question in the bank with that subtype,
 * since a block the planner could not fill still has a name. Only if both
 * miss does the raw slug show, made readable, because "no-solution-parallel"
 * on a screen-shared lesson reads as a leaked internal.
 */
function headingFor(
  block: PlannerBlock,
  ids: string[],
  used: Map<string, LessonQuestion>,
  bank: Question[],
): string {
  if (!block.subtype) return 'Work'
  const fromBlock = ids.length ? used.get(ids[0])?.category : undefined
  if (fromBlock) return fromBlock
  const anywhere = bank.find((q) => q.subtype === block.subtype)
  if (anywhere?.subtypeName) return anywhere.subtypeName
  return block.subtype.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function studentLine(spec: PlannerLesson): string | undefined {
  const s = spec.student
  if (!s?.from || !s?.to) return undefined
  return `For a student at ${s.from} aiming at ${s.to}`
}
