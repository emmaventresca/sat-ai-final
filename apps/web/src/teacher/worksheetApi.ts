const PLANNER = 'http://localhost:8791'

export interface Packet {
  exam: string
  title: string
  question_count: number
  worksheet_html: string
  answer_key_html: string
  notes?: string[]
}

/**
 * Build a worksheet and its answer key on the teacher's machine.
 *
 * Same server as the planner, for the same reason: this is the teacher's own
 * tooling and students never reach it.
 */
export async function makeWorksheet(
  exam: string, questionIds: string[], brief: string,
): Promise<Packet> {
  const r = await fetch(`${PLANNER}/worksheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exam, question_ids: questionIds, brief }),
  })
  const data = (await r.json().catch(() => ({}))) as Packet & { error?: string }
  if (!r.ok) throw new Error(data.error || `worksheet returned ${r.status}`)
  return data
}
