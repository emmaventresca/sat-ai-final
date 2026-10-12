import { useState } from 'react'
import { CONNECTED, mintCode } from '../auth/auth'

/**
 * Codes, one per student.
 *
 * This is how a student gets in at all - no code, no account - so the screen
 * treats a code as a physical object: big, monospaced, unambiguous, with a
 * copy button, because it is going to be read off a laptop and typed on a
 * phone.
 *
 * The alphabet in the database drops I, O, 0 and 1. Those four characters are
 * the entire reason "the code didn't work" support requests exist.
 *
 * Codes are generated server-side and this component never sees any code but
 * the one it just asked for. There is no list to fetch and no way to ask for
 * one, which is the point.
 */
export function Codes() {
  const [label, setLabel] = useState('')
  const [uses, setUses] = useState(1)
  const [made, setMade] = useState<{ code: string; label: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function mint() {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = await mintCode(label.trim() || 'Student', uses)
    setBusy(false)
    if (out.error) setError(out.error)
    else if (out.code) {
      setMade((was) => [{ code: out.code as string, label: label.trim() || 'Student' }, ...was])
      setLabel('')
    }
  }

  return (
    <div className="card codes">
      <h2 style={{ marginTop: 0 }}>Invite a student</h2>
      <p className="small">
        A student cannot register without one of these. Give them a code, and
        they appear on your roster the moment they use it.
      </p>

      <div className="row tight codes-make">
        <input value={label} placeholder="Who is it for? (optional)"
          onChange={(e) => setLabel(e.target.value)} />
        <label className="tiny muted codes-uses">
          uses
          <input type="number" min={1} max={40} value={uses}
            onChange={(e) => setUses(Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <button className="btn-primary" onClick={() => void mint()} disabled={busy}>
          {busy ? 'Making…' : 'Make a code'}
        </button>
      </div>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        One use for one student. Raise it to hand the same code to a whole
        class. Codes expire after 90 days.
      </p>

      {error && <p className="bad-text small">{error}</p>}

      {made.length > 0 && (
        <ul className="code-list">
          {made.map((m) => (
            <li key={m.code}>
              <code className="code-big">{m.code}</code>
              <span className="code-for">{m.label}</span>
              <button className="btn-sm" onClick={() => {
                void navigator.clipboard?.writeText(m.code)
                setCopied(m.code)
                setTimeout(() => setCopied(null), 1600)
              }}>
                {copied === m.code ? 'Copied' : 'Copy'}
              </button>
            </li>
          ))}
          <li className="tiny muted" style={{ display: 'block', paddingTop: 4 }}>
            Shown once, here. Copy it now &mdash; for safety there is no way to
            list codes again later, including for you.
          </li>
        </ul>
      )}

      {!CONNECTED && (
        <p className="tiny" style={{ color: 'var(--flag)', marginTop: 12 }}>
          No database connected, so these codes only work in this browser.
          They are not secure yet.
        </p>
      )}
    </div>
  )
}
