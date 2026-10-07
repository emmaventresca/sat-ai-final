import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ExamHome } from './pages/ExamHome'
import { TeacherHome } from './teacher/TeacherHome'
import { Pick } from './pages/Pick'
import { LessonPreview } from './pages/LessonPreview'

/**
 * Two exams, two front doors, one teacher.
 *
 * The student routes are /sat/* and /act/* and they do not share a page. A
 * student practising SAT Transitions should never be one mis-click from an
 * ACT comma question: the sections do not correspond, the scoring does not
 * correspond, and a tier on one says nothing about the other. Keeping them
 * on separate routes with separate banks makes that a property of the
 * structure rather than something the UI has to remember.
 *
 * The teacher side is deliberately the opposite. One portal, one roster, and
 * per student the choice of assigning from either bank - which is the whole
 * reason for putting the two apps together.
 *
 * HashRouter rather than BrowserRouter: this deploys to GitHub Pages, which
 * serves static files and cannot rewrite unknown paths to index.html, so a
 * refresh on /sat/lesson would 404 under a browser router.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Pick />} />
        {/* Explicit, not /:exam/*. A dynamic segment swallows every other
            top-level path - /lesson-preview matched it, failed the exam
            check and bounced to the chooser - and naming the two exams here
            says what the app supports instead of hiding it in a guard. */}
        <Route path="/sat/*" element={<ExamHome exam="sat" />} />
        <Route path="/act/*" element={<ExamHome exam="act" />} />
        <Route path="/teacher/*" element={<TeacherHome />} />
        <Route path="/lesson-preview" element={<LessonPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
