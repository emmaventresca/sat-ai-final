/**
 * The ticks the student makes themselves.
 *
 * Only links and printed worksheets live here. We cannot watch a student
 * open a video or finish a paper worksheet, so those are taken on trust -
 * but a platform question is counted from the attempt it produced, and
 * progressFor deliberately ignores a self-report against a QUESTION item.
 * Keeping that rule there rather than here means this store can stay what it
 * is: a flat set of ticks that never has to know what it is ticking.
 *
 * Keyed by assignment ITEM id, not question or url. The same link can be set
 * twice in a term - last week's reading reassigned as revision - and keying
 * by url would hand back the second week already done.
 *
 * Stored locally, mirroring src/teacher/assignments.ts; the server side is
 * supabase/homework.sql and returns the same shape.
 */
const KEY = 'prep.selfreports'

export type SelfReports = Record<string, boolean>

function read(): SelfReports {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SelfReports) : {}
  } catch {
    return {}
  }
}

function write(all: SelfReports): void {
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function selfReports(): SelfReports {
  return read()
}

export function setSelfReport(itemId: string, done: boolean): SelfReports {
  const all = read()
  // Untick removes rather than storing false, so the store holds only what
  // was actually claimed and an absent key always means "not reported".
  if (done) all[itemId] = true
  else delete all[itemId]
  write(all)
  return all
}
