import { Link } from 'react-router-dom'
import { EXAM_IDS, examSpec } from '../exams/registry'

/**
 * Which test are you here for?
 *
 * Shown only when a student has been given both. One exam goes straight in -
 * a chooser with a single option is a click that teaches nothing, and an
 * option for a test they are not sitting is an invitation to waste an hour.
 */
export function Pick() {
  return (
    <div className="wrap">
      <h1>Practice</h1>
      <p className="muted">Pick the test you are preparing for.</p>
      <div className="pick">
        {EXAM_IDS.map((id) => {
          const spec = examSpec(id)
          return (
            <Link key={id} className="pick-card" to={`/${id}`}>
              <div className="pick-t">{spec.label}</div>
              <div className="pick-d">
                {spec.sections.map((s) => s.label).join(' · ')}
              </div>
              <div className="pick-s">
                {spec.total_score[0]}&ndash;{spec.total_score[1]}
              </div>
            </Link>
          )
        })}
      </div>
      <p className="tiny muted" style={{ marginTop: 18 }}>
        <Link to="/teacher">Teacher portal</Link>
      </p>
    </div>
  )
}
