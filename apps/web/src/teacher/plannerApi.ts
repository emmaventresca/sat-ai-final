import type { Exam } from '../exams/types'
import type { PlannerLesson } from '../lesson/fromPlanner'

/**
 * The planner runs on the teacher's own machine.
 *
 * tools/planner_server.py proxies to their Claude session: no API key in the
 * browser, nothing leaving the laptop, and students never reach it. That is
 * why the planner is a teacher-portal feature rather than a product
 * capability - it is the teacher's own tooling, wired into the app.
 */
const PLANNER = 'http://localhost:8791'

export interface PlannerMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PlannerReply {
  reply: string
  lesson: PlannerLesson | null
  /** Anything that came back shaped like a plan but not like a lesson. */
  other: unknown | null
}

export async function plannerUp(): Promise<boolean> {
  try {
    const r = await fetch(`${PLANNER}/health`, { signal: AbortSignal.timeout(2500) })
    return r.ok
  } catch {
    return false
  }
}

export async function ask(
  messages: PlannerMessage[],
  focus: { exam: Exam; student?: string } | null,
): Promise<PlannerReply> {
  const r = await fetch(`${PLANNER}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, focus }),
  })
  const data = (await r.json().catch(() => ({}))) as {
    reply?: string
    assignment?: unknown
    error?: string
  }
  if (!r.ok) throw new Error(data.error || `planner returned ${r.status}`)

  const spec = extractSpec(data.reply ?? '', data.assignment)
  return {
    reply: stripSpecBlock(data.reply ?? ''),
    lesson: spec && spec.kind !== 'assignment' ? (spec as PlannerLesson) : null,
    other: spec && spec.kind === 'assignment' ? spec : null,
  }
}

/**
 * The machine-readable block the planner ends with.
 *
 * The server already pulls out the first fenced JSON object, but it parses
 * only one and a course comes back as several nested in one block - so the
 * raw reply is re-read here rather than trusting the convenience field.
 */
function extractSpec(reply: string, fallback: unknown): { kind?: string } | null {
  const fence = /```json\s*([\s\S]*?)```/.exec(reply)
  if (fence) {
    try {
      return JSON.parse(fence[1]) as { kind?: string }
    } catch {
      // A truncated block is not worth a thrown error in the chat; the prose
      // is still useful and the teacher can ask again.
    }
  }
  return (fallback as { kind?: string }) ?? null
}

/** The fenced block is rendered as a lesson, so it must not also be shown raw. */
function stripSpecBlock(reply: string): string {
  return reply.replace(/```json[\s\S]*?```/g, '').trim()
}

/** A course is several lessons; this flattens one level so each can render. */
export function sessionsOf(spec: PlannerLesson & { sessions?: PlannerLesson[] }):
  PlannerLesson[] {
  if (spec.kind === 'course' && Array.isArray(spec.sessions)) return spec.sessions
  return [spec]
}

// ---------------------------------------------------------------------------
// Fresh questions for a generated lesson
//
// A lesson built out of the bank is a lesson the student may already have
// sat. So the planner's blocks go back to the server, which writes variants
// of the cited items - same recognition, same trap, different numbers - and
// returns more than the block needs, spread a tier either side of its target.
//
// The teacher picks. That is not a hedge: she is the one who knows whether
// the student in front of her is having a good day, and a generator that
// decided for her would be making that call from a worse position.
// ---------------------------------------------------------------------------

export interface PoolBlockRequest {
  subtype?: string
  skill_cd?: string
  difficulty?: string
  /** How many the block's minutes actually need. */
  n?: number
  /** Bank items the variants should be built against. */
  item_ids?: string[]
}

export interface PoolTier {
  difficulty: string
  /** What the block needed at this tier; the list is deliberately longer. */
  wanted: number
  items: Record<string, unknown>[]
}

export interface PoolBlock {
  subtype: string | null
  skill_cd: string
  target: string
  asked_for: number
  tiers: PoolTier[]
  total: number
  modelled_on: string[]
  rejected_as_too_close: number
}

export interface PoolReply {
  blocks: PoolBlock[]
  /** Recognitions that produced nothing, with the reason. */
  failed: { subtype: string | null; error: string }[]
}

export async function lessonItems(
  exam: Exam,
  blocks: PoolBlockRequest[],
): Promise<PoolReply> {
  const r = await fetch(`${PLANNER}/lesson-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exam, blocks }),
    // Each block is an authoring run plus a verification pass. This is a
    // minutes-long call and there is no honest way to make it a fast one.
    signal: AbortSignal.timeout(20 * 60 * 1000),
  })
  const data = (await r.json().catch(() => ({}))) as Partial<PoolReply> & { error?: string }
  if (!r.ok) throw new Error(data.error || `planner returned ${r.status}`)
  return { blocks: data.blocks ?? [], failed: data.failed ?? [] }
}
