import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ExamHome } from './pages/ExamHome'
import { TeacherHome } from './teacher/TeacherHome'
import { Pick } from './pages/Pick'
import { LessonPreview } from './pages/LessonPreview'
import { Browse } from './pages/Browse'
import { Planner } from './teacher/Planner'
import { Assign } from './teacher/Assign'
import { Homework } from './student/Homework'
import { Review } from './review/Review'
import { Login } from './auth/Login'
import { Sheet } from './journey/Sheet'
import { current, type Account } from './auth/auth'
import { useEffect, useState } from 'react'

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
  // The router wraps the gate, not the other way round: the login screen has
  // links of its own, and a <Link> rendered outside a Router throws rather
  // than degrading - which is exactly what it did the first time.
  return (
    <HashRouter>
      <Gate />
    </HashRouter>
  )
}

function OnlyTeacher(
  { role, children }: { role: Account['role']; children: React.ReactNode },
) {
  if (role !== 'teacher') return <Navigate to="/" replace />
  return <>{children}</>
}

/**
 * Signed in, or not.
 *
 * One gate in front of everything rather than a guard on each route. A
 * per-route guard is a list somebody forgets to add the next route to, and
 * the route they forget is always the one that mattered.
 */
function Gate() {
  const [account, setAccount] = useState<Account | null>(() => current())
  const nav = useNavigate()
  useEffect(() => {
    const sync = () => setAccount(current())
    window.addEventListener('prep-auth', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('prep-auth', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (!account) {
    return (
      <Login onDone={() => {
        const who = current()
        setAccount(who)
        // Sent to the portal once, on the way in. Doing this as a route
        // redirect instead made "/" unreachable for a teacher, and "/" is
        // where the portal's own Student view link points.
        if (who?.role === 'teacher') nav('/teacher', { replace: true })
      }} />
    )
  }

  return (
      <Routes>
        {/* The chooser, for everyone.
            
            This used to redirect teachers to the portal, which quietly broke
            the portal's own "Student view" link: it points at "/", so a
            teacher clicking it was bounced straight back to the page they
            were trying to leave. Landing a teacher in the portal is a
            sign-in behaviour, not a property of the route - see Gate. */}
        <Route path="/" element={<Pick />} />
        {/* Explicit, not /:exam/*. A dynamic segment swallows every other
            top-level path - /lesson-preview matched it, failed the exam
            check and bounced to the chooser - and naming the two exams here
            says what the app supports instead of hiding it in a guard. */}
        <Route path="/sat/*" element={<ExamHome exam="sat" />} />
        <Route path="/act/*" element={<ExamHome exam="act" />} />
        {/* Teacher-only, by role rather than by obscurity.
            
            Guarding just "/" was not enough: signing out of a teacher session
            on #/teacher and registering as a student left the new student
            sitting on that same hash, looking at the roster. The route is
            what has to check, not the login screen. The database enforces
            this too - this is the half that stops a student SEEING the page,
            not the half that stops them reading the data. */}
        <Route path="/teacher/*" element={<OnlyTeacher role={account.role}><TeacherHome /></OnlyTeacher>} />
        <Route path="/plan" element={<OnlyTeacher role={account.role}><Planner /></OnlyTeacher>} />
        <Route path="/assign" element={<OnlyTeacher role={account.role}><Assign /></OnlyTeacher>} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/review" element={<Review />} />
        {/* A contact sheet for reviewing a world's ten backgrounds. */}
        <Route path="/sheet" element={<Sheet />} />
        <Route path="/browse/:exam" element={<Browse />} />
        <Route path="/lesson-preview" element={<LessonPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}
