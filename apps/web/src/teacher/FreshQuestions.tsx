import { useState } from 'react'
import type { Exam, Question } from '../exams/types'
import { difficultyLabel } from '../lesson/types'
import type { LessonPlan, LessonQuestion } from '../lesson/types'
import { fromPool } from '../lesson/fromPlanner'
import { QuestionPeek } from './QuestionPeek'
import { lessonItems, type PoolBlock, type PoolBlockRequest } from './plannerApi'

/**
 * Fresh questions for a lesson, written against the ones it cites.
 *
 * The problem this fixes is small and ruinous: a lesson assembled out of the
 * bank is a lesson the student may have already sat alone, which turns a
 * ninety-minute session into a recital. So the planner's recognitions go back
 * to the authoring tool and come back as variants - same recognition, same
 * named trap, different numbers.
 *
 * It returns more than the lesson needs, and a tier either side of what the
 * block asked for. That is the useful part. A teacher reading these five
 * minutes before a session is deciding against information the planner never
 * had: who actually turned up, what they said last week, whether today is a
 * day for the hard set. Handing her exactly eight questions would be handing
 * her a plan with no give in it.
 *
 * Teacher portal only, and the pool is written somewhere the practice app
 * cannot read - the whole point is that the student meets these once.
 */
export function FreshQuestions({
  plan, exam, onUse,
}: {
  plan: LessonPlan
  exam: Exam
  onUse: (picked: Map<string, LessonQuestion[]>, replace: boolean) => void
}) {
  const [pool, setPool] = useState<PoolBlock[] | null>(null)
  const [failed, setFailed] = useState<{ subtype: string | null; error: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [replace, setReplace] = useState(true)
  const [peek, setPeek] = useState<Question | null>(null)

  const requests = blockRequests(plan)

  async function write() {
    if (busy || !requests.length) return
    setBusy(true)
    setError(null)
    try {
      const out = await lessonItems(exam, requests)
      setPool(out.blocks)
      setFailed(out.failed)
      // Pre-tick what the lesson asked for, at the tier it asked for. The
      // extras are there to be reached for, not to be sorted through from
      // scratch every time.
      const pre = new Set<string>()
      for (const block of out.blocks) {
        const target = block.tiers.find((t) => t.difficulty === block.target)
        for (const item of (target?.items ?? []).slice(0, block.asked_for)) {
          pre.add(String(item.id))
        }
      }
      setChosen(pre)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  function toggle(id: string) {
    setChosen((was) => {
      const next = new Set(was)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function use() {
    if (!pool) return
    const picked = new Map<string, LessonQuestion[]>()
    for (const block of pool) {
      const name = nameFor(plan, block.subtype)
      const taken = block.tiers
        .flatMap((t) => t.items)
        .filter((item) => chosen.has(String(item.id)))
        .map((item) => fromPool(item, exam, name))
      if (taken.length) picked.set(block.subtype ?? block.skill_cd, taken)
    }
    onUse(picked, replace)
  }

  if (!requests.length) return null

  return (
    <div className="card fresh">
      <div className="row tight between">
        <div>
          <h3 style={{ margin: 0 }}>Fresh questions for this lesson</h3>
          <p className="tiny muted" style={{ margin: '4px 0 0' }}>
            Variants of the questions this plan cites — same recognition, same
            trap, different numbers — so nobody sits the same item twice. You
            get more than the lesson needs, and a level either side of it.
          </p>
        </div>
        <button className="btn-primary" onClick={() => void write()} disabled={busy}>
          {busy ? 'Writing…' : pool ? 'Write another set' : 'Write them'}
        </button>
      </div>

      {busy && (
        <p className="small muted">
          Each recognition is an authoring run and a verification pass, so this
          takes a few minutes. Nothing is served until it verifies.
        </p>
      )}
      {error && <p className="bad-text small">{error}</p>}
      {failed.map((f) => (
        <p className="small" key={f.subtype ?? 'x'} style={{ color: 'var(--flag)' }}>
          Nothing for {f.subtype ?? 'one block'}: {f.error}
        </p>
      ))}

      {pool?.map((block) => (
        <div className="fresh-block" key={block.subtype ?? block.skill_cd}>
          <div className="row tight between">
            <strong>{nameFor(plan, block.subtype)}</strong>
            <span className="tiny muted">
              {block.total} written for {block.asked_for} the block needs
              {block.rejected_as_too_close > 0 &&
                ` · ${block.rejected_as_too_close} dropped as too close to the bank`}
            </span>
          </div>
          {block.tiers.map((tier) => (
            <div key={tier.difficulty} className="fresh-tier">
              <div className="tiny muted">
                {difficultyLabel(tier.difficulty as never)}
                {tier.difficulty === block.target
                  ? ` — what the block asked for (${tier.wanted})`
                  : ' — if the day calls for it'}
              </div>
              {tier.items.map((item) => {
                const id = String(item.id)
                return (
                  <label className="fresh-item" key={id}>
                    <input type="checkbox" checked={chosen.has(id)}
                      onChange={() => toggle(id)} />
                    <span className="fresh-stem">{plain(item)}</span>
                    <button className="btn-sm" type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setPeek({ ...item, exam,
                                  subtypeName: nameFor(plan, block.subtype),
                                } as unknown as Question)
                      }}>
                      Read it
                    </button>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      ))}

      {pool && (
        <div className="row tight between" style={{ marginTop: 12 }}>
          <label className="tiny">
            <input type="checkbox" checked={replace}
              onChange={(e) => setReplace(e.target.checked)} />{' '}
            Drop the bank questions this plan cited
            <span className="muted"> — leave this on unless you want both sets</span>
          </label>
          <button className="btn-primary" onClick={use} disabled={!chosen.size}>
            Use {chosen.size} question{chosen.size === 1 ? '' : 's'}
          </button>
        </div>
      )}

      {peek && <QuestionPeek question={peek} onClose={() => setPeek(null)} />}
    </div>
  )
}

/** The first line of a question, for a list you are scanning rather than reading. */
function plain(item: Record<string, unknown>): string {
  const text = String(item.stem ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 120 ? `${text.slice(0, 118)}…` : text
}

/**
 * What the lesson calls a recognition.
 *
 * Taken from the plan rather than the pool, because the plan's own heading is
 * what the teacher has been reading for the last two minutes and a second
 * name for the same thing reads as a different thing.
 */
function nameFor(plan: LessonPlan, subtype: string | null): string {
  const q = plan.questions.find((x) => !!x.category && !!subtype && x.subtype === subtype)
  if (q?.category) return q.category
  if (!subtype) return 'Work'
  return subtype.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * What to write, per block, from the plan as rendered.
 *
 * The count comes from the questions the block actually works rather than
 * from its minutes: the planner already made that judgement and second-
 * guessing it here would put two different ideas of lesson length in one
 * packet.
 */
export function blockRequests(plan: LessonPlan): PoolBlockRequest[] {
  const byId = new Map(plan.questions.map((q) => [q.id, q]))
  const out: PoolBlockRequest[] = []
  for (const section of plan.sections) {
    const ids = section.questionIds ?? []
    if (!ids.length) continue
    const qs = ids.map((id) => byId.get(id)).filter((q): q is LessonQuestion => !!q)
    if (!qs.length) continue
    const subtype = subtypeOf(qs)
    out.push({
      subtype: subtype ?? undefined,
      difficulty: commonest(qs.map((q) => q.difficulty)),
      n: qs.length,
      item_ids: ids.slice(0, 3),
    })
  }
  return out
}

/**
 * The recognition a block is about.
 *
 * Blocks are built around one recognition, but a planner that reached for a
 * neighbouring question is not wrong to - so this takes the commonest rather
 * than the first. Where a block has no slug at all it is sent without one and
 * the server falls back to the skill, which is a wider net but not a wrong one.
 */
function subtypeOf(qs: LessonQuestion[]): string | null {
  const slugs = qs.map((q) => q.subtype).filter((s): s is string => !!s)
  return slugs.length ? commonest(slugs) : null
}

function commonest<T extends string>(values: T[]): T {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}
