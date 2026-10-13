import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EXAM_IDS, examSpec } from '../exams/registry'
import type { Exam } from '../exams/types'
import { loadIndex, type QuestionRef } from '../lib/bank'
import { roster, type Student } from './roster'
import { StudentDetail } from './StudentDetail'
import { examTone } from './tone'
import { Codes } from './Codes'

/**
 * One portal, both exams.
 *
 * This is the half that is SUPPOSED to be joined up. The student side keeps
 * the two tests apart so nobody practises the wrong one; the teacher side
 * puts them side by side so one roster, one planner and one assignment flow
 * cover both.
 */
export function TeacherHome() {
  const [banks, setBanks] = useState<Partial<Record<Exam, QuestionRef[]>>>({})
  const [students] = useState<Student[]>(() => roster())
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    for (const id of EXAM_IDS) {
      void loadIndex(id)
        .then((b) => live && setBanks((prev) => ({ ...prev, [id]: b })))
        .catch(() => undefined)
    }
    return () => { live = false }
  }, [])

  const open = students.find((s) => s.id === openId)

  return (
    <div className="wrap wide">
      <div className="top">
        <div><h1>Teacher</h1><p className="who">Both tests, one roster</p></div>
      </div>

      <div className="exam-row">
        {EXAM_IDS.map((id) => {
          const bank = banks[id]
          return (
            <div key={id} className={`brush tone-${id}`} style={{ flex: '1 1 240px' }}>
              <strong>{examSpec(id).label}</strong>
              <div className="tiny muted">
                {bank ? `${bank.length} questions ready to assign` : 'loading…'}
              </div>
            </div>
          )
        })}
      </div>

      <Codes />

      <h2>Your students</h2>
      {!students.length && (
        <div className="card empty">
          <p>No students yet. Add one from <Link to="/assign">Assign</Link>.</p>
        </div>
      )}
      {students.map((s) => (
        <div key={s.id}>
          <div className={`brush roster-card ${examTone(s.access)}`}
            onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <div className="spread">
              <div>
                <strong>{s.name}</strong>
                <div style={{ marginTop: 6 }}>
                  {EXAM_IDS.filter((id) => s.access[id]).map((id) => (
                    <span className="exam-chip" key={id}>{examSpec(id).label}</span>
                  ))}
                  {!s.access.sat && !s.access.act && (
                    <span className="tiny muted">not sitting either yet</span>
                  )}
                </div>
              </div>
              <span className="btn-sm">{openId === s.id ? 'Hide' : 'Open'}</span>
            </div>
          </div>
          {open?.id === s.id && <StudentDetail student={s} />}
        </div>
      ))}
    </div>
  )
}
