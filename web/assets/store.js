// ---------------------------------------------------------------------------
// Data layer.
//
// Two backends behind one interface:
//
//   supabase - real accounts, row-level security, teacher visibility
//   local    - this browser only, no account
//
// Local mode exists so the app is usable and demonstrable before any backend is
// configured, and so a dropped connection mid-session is not a lost session.
// Everything above this file is written against the same methods either way.
// ---------------------------------------------------------------------------

const LS = {
  profile: 'satai.profile',
  mastery: 'satai.mastery',
  attempts: 'satai.attempts',
  fingerprints: 'satai.fingerprints',
  queue: 'satai.queue',
};

const readLS = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function configured() {
  const c = window.CONFIG ?? {};
  return Boolean(c.SUPABASE_URL && c.SUPABASE_ANON_KEY);
}

// ---------------------------------------------------------------------------

class LocalStore {
  constructor() { this.mode = 'local'; }

  async session() {
    const p = readLS(LS.profile, null);
    return p ? { user: { id: 'local', email: p.email ?? 'local' } } : null;
  }

  async signIn() { throw new Error('Local mode has no accounts. Use "Try it without an account".'); }
  async signUp() { throw new Error('Local mode has no accounts.'); }

  async startLocal(profile) {
    writeLS(LS.profile, { id: 'local', role: 'student', ...profile });
    return readLS(LS.profile, null);
  }

  async signOut() {
    for (const k of Object.values(LS)) localStorage.removeItem(k);
  }

  async profile() { return readLS(LS.profile, null); }

  async saveProfile(patch) {
    const p = { ...readLS(LS.profile, {}), ...patch };
    writeLS(LS.profile, p);
    return p;
  }

  async mastery() { return readLS(LS.mastery, {}); }

  async saveMastery(key, cell) {
    const m = readLS(LS.mastery, {});
    m[key] = cell;
    writeLS(LS.mastery, m);
  }

  async attempts() { return readLS(LS.attempts, []); }

  async logAttempt(row) {
    const a = readLS(LS.attempts, []);
    a.push({ ...row, created_at: new Date().toISOString() });
    writeLS(LS.attempts, a.slice(-5000));
  }

  async fingerprints() { return readLS(LS.fingerprints, []); }

  async addFingerprints(rows) {
    const f = readLS(LS.fingerprints, []);
    writeLS(LS.fingerprints, f.concat(rows));
  }

  /**
   * Local mode has no roster, but returning the single local student lets the
   * teacher view be demonstrated and tested without a backend.
   */
  async roster() {
    const p = readLS(LS.profile, null);
    return p ? [p] : [];
  }

  async studentData(id) {
    return {
      mastery: readLS(LS.mastery, {}),
      attempts: readLS(LS.attempts, []),
      fingerprints: readLS(LS.fingerprints, []),
    };
  }
}

// ---------------------------------------------------------------------------

class SupabaseStore {
  constructor(client) { this.sb = client; this.mode = 'supabase'; this.uid = null; }

  async session() {
    const { data } = await this.sb.auth.getSession();
    this.uid = data?.session?.user?.id ?? null;
    return data?.session ?? null;
  }

  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.uid = data.user.id;
    return data;
  }

  async signUp(email, password, full_name) {
    const { data, error } = await this.sb.auth.signUp({
      email, password, options: { data: { full_name } },
    });
    if (error) throw error;
    this.uid = data.user?.id ?? null;
    return data;
  }

  async signOut() { await this.sb.auth.signOut(); this.uid = null; }

  async profile() {
    if (!this.uid) await this.session();
    if (!this.uid) return null;
    const { data, error } = await this.sb.from('profiles')
      .select('*').eq('id', this.uid).maybeSingle();
    if (error) throw error;
    return data;
  }

  async saveProfile(patch) {
    const { data, error } = await this.sb.from('profiles')
      .update(patch).eq('id', this.uid).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async mastery() {
    const { data, error } = await this.sb.from('mastery')
      .select('*').eq('student_id', this.uid);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [`${r.skill_cd}|${r.difficulty}`, r]));
  }

  async saveMastery(key, cell) {
    const [skill_cd, difficulty] = key.split('|');
    const { error } = await this.sb.from('mastery').upsert({
      student_id: this.uid, skill_cd, difficulty,
      box: cell.box, seen: cell.seen, correct: cell.correct,
      rolling_accuracy: cell.rolling_accuracy, due_at: cell.due_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,skill_cd,difficulty' });
    if (error) throw error;
  }

  async attempts() {
    const { data, error } = await this.sb.from('attempts')
      .select('*').eq('student_id', this.uid)
      .order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    return data ?? [];
  }

  async logAttempt(row) {
    // Queue on failure rather than losing the answer; flushed on the next write.
    const payload = { ...row, student_id: this.uid };
    const { error } = await this.sb.from('attempts').insert(payload);
    if (error) {
      const q = readLS(LS.queue, []);
      q.push(payload);
      writeLS(LS.queue, q);
      return;
    }
    await this.flush();
  }

  async flush() {
    const q = readLS(LS.queue, []);
    if (!q.length) return;
    const { error } = await this.sb.from('attempts').insert(q);
    if (!error) writeLS(LS.queue, []);
  }

  async fingerprints() {
    const { data, error } = await this.sb.from('fingerprints')
      .select('*').eq('student_id', this.uid)
      .order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    return data ?? [];
  }

  async addFingerprints(rows) {
    const { error } = await this.sb.from('fingerprints')
      .insert(rows.map((r) => ({ ...r, student_id: this.uid })));
    if (error) throw error;
  }

  /** Everything the teacher view needs for one student. RLS decides what
   *  actually comes back; this code does not filter. */
  async studentData(id) {
    const [m, a, f] = await Promise.all([
      this.sb.from('mastery').select('*').eq('student_id', id),
      this.sb.from('attempts').select('correct, created_at').eq('student_id', id)
        .order('created_at', { ascending: false }).limit(2000),
      this.sb.from('fingerprints').select('*').eq('student_id', id)
        .order('created_at', { ascending: false }).limit(200),
    ]);
    return {
      mastery: Object.fromEntries((m.data ?? [])
        .map((r) => [`${r.skill_cd}|${r.difficulty}`, r])),
      attempts: a.data ?? [],
      fingerprints: f.data ?? [],
    };
  }

  /** Teacher view: the students on this teacher's roster. */
  async roster() {
    const { data, error } = await this.sb.from('roster')
      .select('student_id, profiles!roster_student_id_fkey(*)')
      .eq('teacher_id', this.uid);
    if (error) throw error;
    return (data ?? []).map((r) => r.profiles).filter(Boolean);
  }
}

// ---------------------------------------------------------------------------

/**
 * A store for the teacher's "Student view" preview.
 *
 * Seeded from one student's real profile and mastery, and **every write is a
 * no-op**. A teacher looking at what a student sees must not be able to move
 * that student's spaced-repetition schedule or log practice in their name, and
 * the safest way to guarantee that is a store with nowhere to write to - rather
 * than a flag that some future call site forgets to check.
 *
 * It also touches no localStorage key, so previewing on a shared browser cannot
 * disturb a real session.
 */
export class PreviewStore {
  constructor(seed) {
    this.mode = 'preview';
    this.seed = seed ?? {};
    this._mastery = { ...(seed?.mastery ?? {}) };
  }

  async session() { return { user: { id: 'preview' } }; }
  async profile() { return this.seed.profile ?? null; }
  async mastery() { return this._mastery; }
  async attempts() { return this.seed.attempts ?? []; }
  async fingerprints() { return this.seed.fingerprints ?? []; }
  async roster() { return []; }
  async studentData() { return { mastery: {}, attempts: [], fingerprints: [] }; }

  // Writes are accepted and discarded, so the preview behaves normally on
  // screen - a practice round still grades and advances - while nothing leaves
  // this tab.
  async saveProfile(patch) {
    this.seed.profile = { ...(this.seed.profile ?? {}), ...patch };
    return this.seed.profile;
  }
  async saveMastery(key, cell) { this._mastery[key] = cell; }
  async logAttempt() { /* discarded by design */ }
  async addFingerprints() { /* discarded by design */ }
  async signOut() { /* nothing to sign out of */ }
  async signIn() { throw new Error('Preview mode has no accounts.'); }
  async signUp() { throw new Error('Preview mode has no accounts.'); }
}

/** The seed the teacher page hands to a preview, via sessionStorage. */
export const PREVIEW_KEY = 'satai.preview';

export function previewSeed() {
  try { return JSON.parse(sessionStorage.getItem(PREVIEW_KEY)); }
  catch { return null; }
}

export function makeStore() {
  // A preview is requested by the teacher page opening this app in an iframe.
  if (new URLSearchParams(location.search).get('preview') === '1') {
    return new PreviewStore(previewSeed() ?? {});
  }
  if (!configured() || !window.supabase) return new LocalStore();
  const client = window.supabase.createClient(
    window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
  return new SupabaseStore(client);
}

export { LocalStore, SupabaseStore };
