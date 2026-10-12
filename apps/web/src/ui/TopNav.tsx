import { Link, useLocation } from 'react-router-dom'
import type { Account } from '../auth/auth'
import './topnav.css'

/**
 * One header on every page, so no screen is a dead end.
 *
 * Each page used to carry whatever links its author thought to add, which
 * meant two of them carried none: open the lesson planner or the homework
 * screen and the only way back to the portal was the browser's Back button.
 * A page you can only leave by going backwards is a page the app forgot to
 * finish.
 *
 * Role decides what is listed rather than hiding links a student cannot use:
 * the route guards already refuse them, and showing a student a Planner tab
 * that bounces is worse than not showing it at all.
 */
export function TopNav({ account, pending }: {
  account: Account
  /** Assignment items outstanding, for the badge. 0 hides it. */
  pending?: number
}) {
  const { pathname } = useLocation()
  // The chooser is the one screen that gets to be purely an invitation.
  if (pathname === '/') return null

  const links: { to: string; label: string; badge?: number }[] =
    account.role === 'teacher'
      ? [
        { to: '/teacher', label: 'Portal' },
        { to: '/plan', label: 'Plan a lesson' },
        { to: '/assign', label: 'Assign' },
        { to: '/', label: 'Student view' },
      ]
      : [
        { to: '/sat', label: 'SAT' },
        { to: '/act', label: 'ACT' },
        { to: '/homework', label: 'Homework', badge: pending },
        { to: '/review', label: 'Review' },
      ]

  return (
    <nav className="topnav" aria-label="Main">
      <Link className="topnav-home" to={account.role === 'teacher' ? '/teacher' : '/'}>
        Prep
      </Link>
      <ul className="topnav-links">
        {links.map((l) => {
          // "/" would match everything under startsWith, and /sat must not
          // light up while the student is somewhere under /act.
          const here = l.to === '/'
            ? pathname === '/'
            : pathname === l.to || pathname.startsWith(`${l.to}/`)
          return (
            <li key={l.to + l.label}>
              <Link className={`topnav-link${here ? ' here' : ''}`} to={l.to}>
                {l.label}
                {l.badge ? <span className="topnav-badge">{l.badge}</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
      <span className="topnav-who">{account.name}</span>
    </nav>
  )
}
