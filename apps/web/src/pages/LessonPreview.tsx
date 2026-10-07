import { useState } from 'react'
import { Lesson } from '../lesson/render'
import { exportBothPdfs, exportLessonPdf } from '../lesson/pdf'
import type { LessonPlan } from '../lesson/types'

/**
 * A worked example of a plan, so the two modes can be looked at side by side.
 *
 * This is also the only place that proves the lesson module renders at all -
 * it was written against the types with nothing importing it, and a module
 * nobody mounts is a module nobody has run.
 */
const DEMO: LessonPlan = {
  title: 'Systems of equations: when to combine instead of substitute',
  subtitle: 'For a student at 1200 aiming at 1350',
  exam: 'sat',
  sections: [
    {
      heading: 'Where this shows up',
      minutes: 8,
      body: [
        'Two linear equations, and the question asks for something that is not $x$ or $y$ on its own.',
        '- $x + y$, or $2x - y$, or $y^2 - x^2$',
        'Solving for both and substituting back is never wrong. It is just slower, and slow is what costs you the last five questions.',
      ],
      prompts: ['Ask: what is the question actually asking for? Not "solve the system".'],
    },
    {
      heading: 'The move',
      minutes: 17,
      body: [
        'Add the two equations. Subtract them. One of those usually lands on the thing you were asked for.',
        '$$7x + 3y = 92$$',
        '$$3x + 7y = 108$$',
        'Adding gives $10x + 10y = 200$, so $x + y = 20$ in one step.',
      ],
      prompts: ['Do the slow way on the board first, then the fast way. The contrast is the lesson.'],
    },
    {
      heading: 'Practice',
      minutes: 30,
      body: ['Easy to hard. Stop after each one and name which move you used.'],
      questionIds: ['demo-1', 'demo-2'],
    },
    {
      heading: 'Close',
      minutes: 5,
      body: ['One sentence back to me: how do you know to combine rather than substitute?'],
    },
  ],
  questions: [
    {
      id: 'demo-1',
      category: 'Add or subtract the equations to target one value',
      difficulty: 'M',
      format: 'mc',
      stem: 'If $2x + y = 11$ and $x + 2y = 13$, what is the value of $x + y$?',
      choices: ['$6$', '$8$', '$11$', '$24$'],
      answer: { value: 'B', why: 'Adding gives $3x + 3y = 24$, so $x + y = 8$.' },
    },
    {
      id: 'demo-2',
      category: 'Add or subtract the equations to target one value',
      difficulty: 'X',
      format: 'grid',
      stem: 'If $7x + 3y = 92$ and $3x + 7y = 108$, what is the value of $y^2 - x^2$?',
      answer: {
        value: '80',
        why: 'Adding gives $x + y = 20$; subtracting gives $y - x = 4$. So $y^2 - x^2 = 80$.',
        trap: 'Solving for $x$ and $y$ separately works but eats two minutes.',
      },
    },
  ],
  teacherNotes: [
    'If they reach for substitution on question 2, let them start. Stop them at 90 seconds.',
  ],
  closing: 'Homework: the five Medium ones in this recognition.',
}

export function LessonPreview() {
  const [mode, setMode] = useState<'present' | 'teacher'>('present')
  return (
    <div className="wrap wide">
      <div className="row tight" style={{ marginBottom: 14 }}>
        <button className={mode === 'present' ? 'btn-primary' : 'btn-sm'}
          onClick={() => setMode('present')}>Screen-share view</button>
        <button className={mode === 'teacher' ? 'btn-primary' : 'btn-sm'}
          onClick={() => setMode('teacher')}>Teacher view</button>
        <button className="btn-sm" onClick={() => void exportLessonPdf(DEMO, mode)}>
          PDF of this view
        </button>
        <button className="btn-sm" onClick={() => void exportBothPdfs(DEMO)}>Both PDFs</button>
      </div>
      <Lesson plan={DEMO} mode={mode} />
    </div>
  )
}
