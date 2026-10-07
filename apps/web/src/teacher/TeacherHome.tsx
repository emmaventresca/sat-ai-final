import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EXAM_IDS, examSpec } from '../exams/registry'
import type { Exam, Question } from '../exams/types'
import { loadBank } from '../lib/bank'

/**
 * One portal, both exams.
 *
 * This is the half that is SUPPOSED to be joined up. The student side keeps
 * the two tests apart so nobody practises the wrong one; the teacher side
 * puts them side by side so one roster, one lesson planner and one
 * assignment flow cover both.
 */
export function TeacherHome() {
  const [banks, setBanks] = useState<Partial<Record<Exam, Question[]>>>({})

  useEffect(() => {
    let live = true
    for (const id of EXAM_IDS) {
      loadBank(id)
        .then((b) => live && setBanks((prev) => ({ ...prev, [id]: b })))
        .catch(() => undefined)
    }
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="wrap wide">
      <div className="top">
        <div><h1>Teacher</h1><p className="who">Both tests, one roster</p></div>
        <div className="row tight">
          <Link className="btn-sm" to="/plan">Plan a lesson</Link>
          <Link className="btn-sm" to="/assign">Assign</Link>
          <Link className="btn-sm" to="/">Student view</Link>
        </div>
      </div>
      <div className="exam-row">
        {EXAM_IDS.map((id) => {
          const bank = banks[id]
          return (
            <div key={id} className="card">
              <strong>{examSpec(id).label}</strong>
              <div className="tiny muted">
                {bank ? `${bank.length} questions ready to assign` : 'loading…'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
