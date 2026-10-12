import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sunrise } from '../journey/Sunrise'
import { CONNECTED, register, signIn, signInAsTeacher } from './auth'
import '../pages/pick.css'
import './login.css'

/**
 * The door.
 *
 * Registration is invite-only and the code field is not decoration: no valid
 * teacher code, no account. That is the whole feature, so the screen says it
 * plainly rather than letting a student fill in three fields and find out at
 * the end.
 *
 * It stands on the same sunrise as the chooser, because the first thing a
 * student sees should be the same place either way - a login screen that
 * looks like a different product is a login screen people abandon.
 */
export function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'in' | 'new'>('in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const out = mode === 'in'
      ? await signIn(username, password)
      : await register(username, password, code)
    setBusy(false)
    if (out.error) setError(out.error)
    else onDone()
  }

  return (
    <div className="gate">
      <Sunrise />
      <div className="gate-inner login-inner">
        <h1 className="gate-t">Your journey<br />begins here.</h1>
        <p className="gate-d">
          Personalized SAT and ACT practice, based on real test questions.
          {mode === 'new'
            ? ' Your teacher gives you a code to join.'
            : ' Sign in to pick up where you left off.'}
        </p>

        <form className="login-card" onSubmit={(e) => void go(e)}>
          <div className="login-switch" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'in'}
              className={mode === 'in' ? 'on' : ''}
              onClick={() => { setMode('in'); setError(null) }}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'new'}
              className={mode === 'new' ? 'on' : ''}
              onClick={() => { setMode('new'); setError(null) }}>
              Create account
            </button>
          </div>

          <label className="login-f">
            <span>Username</span>
            <input value={username} autoComplete="username" autoCapitalize="none"
              onChange={(e) => setUsername(e.target.value)} required />
          </label>

          <label className="login-f">
            <span>Password</span>
            <input type="password" value={password}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)} required />
          </label>

          {mode === 'new' && (
            <label className="login-f">
              <span>Teacher code</span>
              <input value={code} placeholder="XXXX-XXXX" autoCapitalize="characters"
                onChange={(e) => setCode(e.target.value)} required />
              <small>
                Ask your teacher for this. Without one you cannot register —
                that is what keeps the class private.
              </small>
            </label>
          )}

          {error && <p className="login-err">{error}</p>}

          <button className="btn-primary login-go" disabled={busy}>
            {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Join the class'}
          </button>

          {/* Said out loud rather than hidden, because a teacher code checked
              in the browser is a teacher code anybody can read, and somebody
              has to know that before this is handed to real students. */}
          {!CONNECTED && (
            <p className="login-note">
              <strong>Local mode.</strong> No database is connected, so
              accounts live in this browser only and codes are not yet
              secure. Set <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>, then run{' '}
              <code>supabase/teacher_codes.sql</code>.
            </p>
          )}
        </form>

        <p className="gate-foot">
          <button className="as-link" onClick={() => { signInAsTeacher(); onDone() }}>
            I'm the teacher
          </button>
          {' · '}
          <Link to="/teacher">Teacher portal</Link>
        </p>
      </div>
    </div>
  )
}
