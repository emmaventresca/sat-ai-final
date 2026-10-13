import type { Exam, Tier } from '../exams/types'
import type { Leg, Region } from './map'
import { progress } from '../practice/mastery'
import { resumeFor, sinceWords } from './resume'
import './resume.css'

/**
 * One click back to what they were actually doing.
 *
 * A student who practised last night should not have to remember which of
 * 182 recognitions they were on and then find it through three levels of
 * map. The attempt log already knows, and it is the first thing on the page
 * because it is the most likely reason they opened the app.
 *
 * Renders nothing when there is nothing to resume - a first visit, or
 * everything they have touched is finished. A button that might do nothing
 * is worse than no button.
 */
export function ResumeCard({ exam, regions, onResume }: {
  exam: Exam
  regions: Region[]
  onResume: (leg: Leg, subtype: string, tier: Tier | null) => void
}) {
  const r = resumeFor(exam, regions, progress().attempts)
  if (!r) return null

  return (
    <section className="resume">
      <div className="resume-body">
        <span className="resume-kicker">Pick up where you left off</span>
        <h2>{r.stage.name}</h2>
        <p className="resume-where">
          {r.region.name} &middot; {r.chapter.name} &middot; {r.leg.name}
        </p>
        <p className="resume-when">
          Last here {sinceWords(r.at)} &middot; {r.seen} answered &middot;{' '}
          <strong>{r.left}</strong> still to meet
        </p>
      </div>
      <button className="resume-go"
        onClick={() => onResume(r.leg, r.stage.subtype, null)}>
        Carry on
        <span aria-hidden="true"> &rarr;</span>
      </button>
    </section>
  )
}
