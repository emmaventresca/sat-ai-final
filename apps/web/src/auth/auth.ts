import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Who is using this, and are they allowed to.
 *
 * Registration is invite-only: a student needs a code from their teacher or
 * they do not get an account. The security of that rests on one rule, and it
 * is worth stating plainly because it is easy to get wrong:
 *
 *   THE BROWSER NEVER SEES THE LIST OF CODES.
 *
 * The obvious implementation - fetch the codes, compare in JavaScript - puts
 * every code we have ever issued one network-tab click away. So redemption
 * goes through a database function that answers exactly one question: does
 * this code work, right now. A wrong guess gets the same message whether the
 * code never existed or was used up last week, because "that one exists but
 * is spent" tells an attacker the format is right.
 *
 * When Supabase is not configured this falls back to a LOCAL mode so the app
 * is usable on one machine during development. Local mode is not security -
 * it says so, out loud, on the screen - because a teacher code checked in the
 * browser is a teacher code anyone can read.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const CONNECTED = Boolean(URL && KEY)

let client: SupabaseClient | null = null
export function db(): SupabaseClient | null {
  if (!CONNECTED) return null
  if (!client) client = createClient(URL as string, KEY as string)
  return client
}

export type Role = 'student' | 'teacher'

export interface Account {
  id: string
  name: string
  role: Role
  /** The teacher whose roster they joined, for students. */
  teacherId: string | null
  /** True when this account exists only in this browser. */
  local: boolean
}

const KEY_SESSION = 'prep.session'
const KEY_LOCAL = 'prep.accounts'

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function current(): Account | null {
  try {
    const raw = localStorage.getItem(KEY_SESSION)
    return raw ? (JSON.parse(raw) as Account) : null
  } catch {
    return null
  }
}

function hold(account: Account | null): Account | null {
  if (account) localStorage.setItem(KEY_SESSION, JSON.stringify(account))
  else localStorage.removeItem(KEY_SESSION)
  window.dispatchEvent(new Event('prep-auth'))
  return account
}

export async function signOut(): Promise<void> {
  await db()?.auth.signOut()
  hold(null)
}

export interface Result {
  account?: Account
  error?: string
}

/**
 * An email we can hand Supabase for a username-only signup.
 *
 * Students are given a username, not an email address - most of them are
 * sixteen and will mistype one, and a bounced confirmation is a support
 * ticket we cannot answer. Supabase Auth wants an email, so usernames are
 * namespaced into one we own and never send to.
 */
function asEmail(username: string): string {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${slug}@students.invalid`
}

export async function signIn(username: string, password: string): Promise<Result> {
  const supa = db()
  if (!supa) return localSignIn(username, password)

  const { data, error } = await supa.auth.signInWithPassword({
    email: asEmail(username), password,
  })
  if (error || !data.user) return { error: friendly(error?.message) }

  const { data: profile } = await supa
    .from('profiles').select('name, role').eq('id', data.user.id).maybeSingle()
  return {
    account: hold({
      id: data.user.id,
      name: (profile?.name as string) || username,
      role: ((profile?.role as Role) ?? 'student'),
      teacherId: null,
      local: false,
    }) as Account,
  }
}

/**
 * Register, which only succeeds with a working teacher code.
 *
 * The account is created first and the code redeemed second, because the
 * redemption function needs an authenticated caller to attach the roster row
 * to. If redemption fails the account is deleted again, so a bad code cannot
 * leave a half-registered student who can sign in but belongs to nobody.
 */
export async function register(
  username: string, password: string, code: string,
): Promise<Result> {
  if (!username.trim()) return { error: 'Pick a username.' }
  if (password.length < 8) return { error: 'Use at least 8 characters.' }
  if (!code.trim()) return { error: 'You need a code from your teacher.' }

  const supa = db()
  if (!supa) return localRegister(username, password, code)

  const { data, error } = await supa.auth.signUp({
    email: asEmail(username), password,
    options: { data: { name: username.trim() } },
  })
  if (error || !data.user) return { error: friendly(error?.message) }

  const { data: redeemed, error: rpcError } = await supa
    .rpc('redeem_teacher_code', { candidate: code })
  const row = Array.isArray(redeemed) ? redeemed[0] : redeemed
  if (rpcError || !row?.ok) {
    await supa.auth.signOut()
    return { error: row?.reason || 'That code is not valid.' }
  }

  return {
    account: hold({
      id: data.user.id,
      name: username.trim(),
      role: 'student',
      teacherId: (row.teacher_id as string) ?? null,
      local: false,
    }) as Account,
  }
}

/** Codes are minted in the database, never in the browser. */
export async function mintCode(
  label: string, uses = 1, days = 90,
): Promise<{ code?: string; error?: string }> {
  const supa = db()
  if (!supa) return { code: localMint(label), error: undefined }
  const { data, error } = await supa.rpc('mint_teacher_code', {
    student_label: label, uses, days,
  })
  if (error) return { error: error.message }
  return { code: data as string }
}

function friendly(message?: string): string {
  if (!message) return 'That did not work. Try again.'
  if (/invalid login/i.test(message)) return 'Wrong username or password.'
  if (/already registered/i.test(message)) return 'That username is taken.'
  return message
}

// ---------------------------------------------------------------------------
// Local mode: development only, and it says so on screen.
// ---------------------------------------------------------------------------

interface LocalRow { name: string; password: string; role: Role; code: string }

function localAll(): Record<string, LocalRow> {
  try {
    return JSON.parse(localStorage.getItem(KEY_LOCAL) ?? '{}') as Record<string, LocalRow>
  } catch {
    return {}
  }
}

function localSave(rows: Record<string, LocalRow>): void {
  localStorage.setItem(KEY_LOCAL, JSON.stringify(rows))
}

/** Teacher codes a local teacher has minted. Dev convenience, not security. */
const KEY_CODES = 'prep.localcodes'

function localCodes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_CODES) ?? '[]') as string[]
  } catch {
    return []
  }
}

function localMint(label: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)]
  const body = Array.from({ length: 8 }, pick).join('')
  const code = `${body.slice(0, 4)}-${body.slice(4)}`
  localStorage.setItem(KEY_CODES, JSON.stringify([...localCodes(), code]))
  localStorage.setItem(`prep.codelabel.${code}`, label)
  return code
}

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

function localSignIn(username: string, password: string): Result {
  const rows = localAll()
  const row = rows[username.trim().toLowerCase()]
  if (!row || row.password !== password) return { error: 'Wrong username or password.' }
  return {
    account: hold({
      id: username.trim().toLowerCase(), name: row.name, role: row.role,
      teacherId: null, local: true,
    }) as Account,
  }
}

function localRegister(username: string, password: string, code: string): Result {
  const key = username.trim().toLowerCase()
  const rows = localAll()
  if (rows[key]) return { error: 'That username is taken.' }
  if (!localCodes().some((c) => norm(c) === norm(code))) {
    return { error: 'That code is not valid.' }
  }
  rows[key] = { name: username.trim(), password, role: 'student', code }
  localSave(rows)
  return {
    account: hold({
      id: key, name: username.trim(), role: 'student', teacherId: null, local: true,
    }) as Account,
  }
}

/**
 * The teacher's own way in while there is no backend.
 *
 * Deliberately not a password check - it is a dev door on a dev machine, and
 * pretending otherwise would be worse than saying so.
 */
export function signInAsTeacher(name = 'Teacher'): Account {
  return hold({
    id: 'local-teacher', name, role: 'teacher', teacherId: null, local: true,
  }) as Account
}
