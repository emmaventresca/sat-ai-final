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
