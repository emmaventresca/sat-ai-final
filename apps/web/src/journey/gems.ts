import type { Exam } from '../exams/types'

/**
 * What a student has to show for a path.
 *
 * Two ways to earn, and they are not a gate and a bypass - they are a floor
 * and a ceiling. Clearing every stop in a path earns the gem outright,
 * because a student at 85% across all four recognitions has already proved
 * it and making them sit a quiz to collect a reward they have earned is
 * exactly the busywork this whole reorganisation removed.
 *
 * The quiz earns a BRIGHTER one. It asks the four recognitions mixed
 * together and out of order, which is harder than any of them alone and is
 * the thing the real test actually does - so it deserves to look different
 * on the map.
 *
 * And it never closes. A polished gem does not lock the quiz; coming back to
 * it in six weeks is one of the better things a student can do with twenty
 * minutes, and the app should say so rather than greying it out.
 */
const KEY = 'prep.gems'

export type GemState = 'none' | 'earned' | 'polished'

interface Store {
  /** `exam|skill` -> the best state reached. */
  gems: Record<string, GemState>
  /** `exam|skill` -> ISO date of the last quiz attempt. */
  quizzed: Record<string, string>
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : { gems: {}, quizzed: {} }
  } catch {
    return { gems: {}, quizzed: {} }
  }
}

function write(s: Store): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

const key = (exam: Exam, skill: string) => `${exam}|${skill}`

export function gemFor(exam: Exam, skill: string, allStopsCleared: boolean): GemState {
  const stored = read().gems[key(exam, skill)]
  if (stored === 'polished') return 'polished'
  // Clearing the stops earns it whether or not it was recorded at the time,
  // so a gem cannot be lost to a storage wipe that kept the attempts.
  return allStopsCleared ? 'earned' : stored ?? 'none'
}

/** Passing the unit quiz. The threshold is high because the gem is the proof. */
export const QUIZ_PASS = 0.85

export function recordQuiz(
  exam: Exam, skill: string, correct: number, total: number,
): GemState {
  const store = read()
  const id = key(exam, skill)
  store.quizzed[id] = new Date().toISOString().slice(0, 10)
  const passed = total > 0 && correct / total >= QUIZ_PASS
  if (passed) store.gems[id] = 'polished'
  write(store)
  return passed ? 'polished' : (store.gems[id] ?? 'none')
}

export function lastQuiz(exam: Exam, skill: string): string | null {
  return read().quizzed[key(exam, skill)] ?? null
}

/** Realm gem colours, so one realm's set reads differently from another's. */
export const GEM_HUE: Record<string, [string, string]> = {
  Algebra: ['#639922', '#97C459'],
  'Advanced Math': ['#534AB7', '#7F77DD'],
  'Problem-Solving and Data Analysis': ['#BA7517', '#EF9F27'],
  'Geometry and Trigonometry': ['#1D9E75', '#5DCAA5'],
  'Information and Ideas': ['#185FA5', '#378ADD'],
  'Craft and Structure': ['#993556', '#D4537E'],
  'Expression of Ideas': ['#0F6E56', '#1D9E75'],
  'Standard English Conventions': ['#993C1D', '#D85A30'],
}

export function gemHue(realm: string): [string, string] {
  return GEM_HUE[realm] ?? ['#5F5E5A', '#888780']
}
