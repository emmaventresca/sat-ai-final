import { Link } from 'react-router-dom'
import { EXAM_IDS, examSpec } from '../exams/registry'
import { Sunrise } from '../journey/Sunrise'
import './pick.css'

/**
 * The first screen, and the only one that gets to be purely an invitation.
 *
 * It was a heading reading "Practice" over two cards, which is an accurate
 * description of the product and a terrible opening: nobody arrives at a
 * tutoring app wanting to practise. They arrive because somebody told them
 * their score has to go up, which is a feeling the old screen met with a
 * filing cabinet.
 *
 * So the test choice is still the only thing to do here - it is one decision
 * and it should stay one decision - but it is made standing in front of a
 * sunrise rather than in front of a form.
 */
export function Pick() {
  return (
    <div className="gate">
      <Sunrise />
      <div className="gate-inner">
        <h1 className="gate-t">Your journey<br />begins here.</h1>
        <p className="gate-d">
          Personalized SAT and ACT practice, based on real test questions.
          Pick your exam to begin your quest.
        </p>

        <div className="gate-pick">
          {EXAM_IDS.map((id) => {
            const spec = examSpec(id)
            return (
              <Link key={id} className="gate-card" to={`/${id}`}>
                <span className="gate-card-t">{spec.label}</span>
                <span className="gate-card-d">
                  {spec.sections.map((s) => s.label).join(' · ')}
                </span>
                <span className="gate-card-s">
                  {spec.total_score[0]}&ndash;{spec.total_score[1]}
                </span>
                <span className="gate-go" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M4 12 H19 M13 6 L19 12 L13 18" />
                  </svg>
                </span>
              </Link>
            )
          })}
        </div>

        <p className="gate-foot">
          <Link to="/teacher">Teacher portal</Link>
        </p>
      </div>
    </div>
  )
}
