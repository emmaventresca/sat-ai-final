// ---------------------------------------------------------------------------
// Two readings of one lesson.
//
// `present` is what goes on the shared screen. It is sized for a student
// sitting across the room from a laptop on a stand: large type, high contrast,
// one idea per block, and nothing on it that the student should not see.
//
// `teacher` is the same lesson with the answers and the talking points folded
// back in. The constraint there is different and sharper - it is read while
// teaching, in glances, so the answer has to be findable without being read
// for. It sits in its own rail, in the UI font, on a green card; the student
// text is Georgia. Nobody mid-sentence confuses the two.
//
// The split is enforced by the data, not by conditionals scattered through
// the tree: present mode is handed a plan with `forStudent()` already applied.
// ---------------------------------------------------------------------------

import type { ReactElement } from 'react'
import {
  difficultyLabel, forStudent, lessonTiming, sectionQuestions, unassignedQuestions,
} from './types'
import type {
  LessonAnswer, LessonMode, LessonPlan, LessonQuestion, SectionSlot,
} from './types'
import { renderBody, renderFigure, renderStimulus, renderText } from './math'
import './styles.css'

const LETTERS = 'ABCDEFGH'

/** The one place pre-rendered maths/table/figure HTML enters the tree. */
function Html({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

function Inline({ text, className }: { text: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderText(text) }} />
}

export interface LessonProps {
  plan: LessonPlan
  mode: LessonMode
}

export function Lesson({ plan, mode }: LessonProps): ReactElement {
  const teaching = mode === 'teacher'
  const view = teaching ? plan : forStudent(plan)
  const timing = lessonTiming(view)
  const extra = unassignedQuestions(view)

  return (
    <article className={`lesson lesson--${mode}`} data-exam={view.exam}>
      <header className="lsn-head">
        <div className="lsn-kicker">
          {view.exam.toUpperCase()} &middot; {timing.duration}-minute lesson
          {teaching ? ' · teacher copy' : ''}
        </div>
        <h1 className="lsn-title">{view.title}</h1>
        {view.subtitle ? <p className="lsn-sub">{view.subtitle}</p> : null}
      </header>

      {teaching && view.teacherNotes?.length ? (
        <section className="lsn-notes">
          <div className="lsn-label">Before you start</div>
          <ul className="lsn-list">
            {view.teacherNotes.map((n, i) => (
              <li key={i}><Inline text={n} /></li>
            ))}
          </ul>
        </section>
      ) : null}

      <RunSheet timing={timing} plan={view} />

      {timing.drift !== 0 && teaching ? (
        <section className="lsn-drift">
          <strong>The blocks do not add up.</strong> They total {timing.planned} minutes
          against a {timing.duration}-minute lesson
          ({timing.drift > 0 ? `${timing.drift} over` : `${-timing.drift} short`}).
          Cut or stretch a block before you teach it - nothing here has been rescaled
          for you.
        </section>
      ) : null}

      {timing.slots.map((slot, i) => (
        <Section
          key={`${slot.heading}-${i}`}
          slot={slot}
          index={i + 1}
          questions={sectionQuestions(view, slot)}
          teaching={teaching}
        />
      ))}

      {extra.length ? (
        <section className="lsn-section lsn-break">
          <div className="lsn-section-head">
            <span className="lsn-num">+</span>
            <h2>If there is time</h2>
          </div>
          <p className="lsn-why">Easiest first. These are not budgeted into the hour.</p>
          {extra.map((q, i) => (
            <Question key={q.id} q={q} n={i + 1} teaching={teaching} />
          ))}
        </section>
      ) : null}

      {view.closing ? (
        <section className="lsn-closing">
          <div className="lsn-label">Leave with this</div>
          <Html className="lsn-body" html={renderBody([view.closing])} />
        </section>
      ) : null}
    </article>
  )
}

/**
 * The clock, up front.
 *
 * Both modes get it: the student knowing there are 12 minutes of circles left
 * is the cheapest pacing tool in the room.
 */
function RunSheet({ timing, plan }: { timing: ReturnType<typeof lessonTiming>; plan: LessonPlan }) {
  return (
    <section className="lsn-runsheet">
      <table className="lsn-table lsn-table-run">
        <thead>
          <tr><th>Time</th><th>Block</th><th className="num">Questions</th></tr>
        </thead>
        <tbody>
          {timing.slots.map((s, i) => (
            <tr key={`${s.heading}-${i}`}>
              <td className="num">{s.from}&ndash;{s.to}</td>
              <td>{s.heading}</td>
              <td className="num">{sectionQuestions(plan, s).length || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={timing.drift === 0 ? undefined : 'off'}>
            <td className="num">{timing.planned}</td>
            <td>
              {timing.drift === 0
                ? 'Total'
                : `Total — the lesson is ${timing.duration} minutes`}
            </td>
            <td className="num">{plan.questions.length || '—'}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function Section({ slot, index, questions, teaching }: {
  slot: SectionSlot
  index: number
  questions: LessonQuestion[]
  teaching: boolean
}) {
  return (
    <section className="lsn-section">
      <div className="lsn-section-head">
        <span className="lsn-num">{index}</span>
        <h2>{slot.heading}</h2>
        <span className="lsn-min">{slot.from}&ndash;{slot.to} min</span>
      </div>

      <Html className="lsn-body" html={renderBody(slot.body)} />

      {teaching && slot.prompts?.length ? (
        <div className="lsn-prompts">
          <div className="lsn-label">Say / ask</div>
          <ul>
            {slot.prompts.map((p, i) => (
              <li key={i}><Inline text={p} /></li>
            ))}
          </ul>
        </div>
      ) : null}

      {questions.map((q, i) => (
        <Question key={q.id} q={q} n={i + 1} teaching={teaching} />
      ))}
    </section>
  )
}

function Question({ q, n, teaching }: { q: LessonQuestion; n: number; teaching: boolean }) {
  const stim = renderStimulus(q.stimulus) + renderFigure(q.figure)
  return (
    <div className="lsn-q">
      <div className="lsn-q-main">
        <div className="lsn-q-meta">
          <span className="lsn-q-num">{n}</span>
          <span className="lsn-q-cat">{q.category}</span>
          <span className={`lsn-q-level ${q.difficulty.toLowerCase()}`}>
            {difficultyLabel(q.difficulty)}
          </span>
        </div>

        {stim ? <Html className="lsn-stim" html={stim} /> : null}
        <Html className="lsn-stem" html={renderStimulus(q.stem)} />

        {q.format === 'grid' ? (
          <div className="lsn-grid">
            <span className="lsn-label">Answer</span>
            <span className="lsn-grid-box" />
          </div>
        ) : (
          <ol className="lsn-choices">
            {(q.choices ?? []).map((c, i) => (
              <li key={i} value={i + 1}>
                <span className="lsn-choice-letter">{LETTERS[i]}</span>
                <Html className="lsn-choice-body" html={renderStimulus(c)} />
              </li>
            ))}
          </ol>
        )}
      </div>

      {teaching && q.answer ? <AnswerRail answer={q.answer} /> : null}
    </div>
  )
}

/**
 * The answer, in the margin.
 *
 * Deliberately not in the flow of the question: the eye finds it by position
 * in a glance, and it cannot be read aloud by accident while reading the stem.
 */
function AnswerRail({ answer }: { answer: LessonAnswer }) {
  return (
    <aside className="lsn-answer">
      <div className="lsn-answer-key">{answer.value}</div>
      {answer.why ? <p className="lsn-answer-why"><Inline text={answer.why} /></p> : null}
      {answer.trap ? (
        <p className="lsn-answer-trap">
          <strong>Trap.</strong> <Inline text={answer.trap} />
        </p>
      ) : null}
    </aside>
  )
}
