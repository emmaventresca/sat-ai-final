/**
 * Real persistence: sync gems and assignments to Supabase if connected.
 * Falls back to localStorage if not.
 */

import { db, CONNECTED } from '../auth/auth'

export interface PersistenceProvider {
  getGems: (studentId: string) => Promise<Record<string, number>>
  setGems: (studentId: string, gems: Record<string, number>) => Promise<void>
  getAssignments: (studentId: string) => Promise<Assignment[]>
  setAssignments: (studentId: string, assignments: Assignment[]) => Promise<void>
}

export interface Assignment {
  id: string
  studentId: string
  assignedAt: string
  skill: string
  tier: 'E' | 'M' | 'H' | 'X'
  questionCount: number
  completed: boolean
}

/** Local-only fallback */
const localProvider: PersistenceProvider = {
  async getGems(studentId) {
    const key = `gems:${studentId}`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  },
  async setGems(studentId, gems) {
    localStorage.setItem(`gems:${studentId}`, JSON.stringify(gems))
  },
  async getAssignments(studentId) {
    const key = `assignments:${studentId}`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  },
  async setAssignments(studentId, assignments) {
    localStorage.setItem(`assignments:${studentId}`, JSON.stringify(assignments))
  },
}

/** Supabase-backed persistence */
const supabaseProvider: PersistenceProvider = {
  async getGems(studentId) {
    const { data, error } = await db()!
      .from('student_gems')
      .select('skill,count')
      .eq('student_id', studentId)

    if (error) {
      console.warn('Gems fetch failed, falling back to local:', error)
      return localProvider.getGems(studentId)
    }

    const result: Record<string, number> = {}
    data?.forEach(row => { result[row.skill] = row.count })
    return result
  },

  async setGems(studentId, gems) {
    const rows = Object.entries(gems).map(([skill, count]) => ({
      student_id: studentId,
      skill,
      count,
      updated_at: new Date().toISOString(),
    }))

    for (const row of rows) {
      await db()!
        .from('student_gems')
        .upsert(row, { onConflict: 'student_id,skill' })
    }
  },

  async getAssignments(studentId) {
    const { data, error } = await db()!
      .from('assignments')
      .select('*')
      .eq('student_id', studentId)

    if (error) {
      console.warn('Assignments fetch failed, falling back to local:', error)
      return localProvider.getAssignments(studentId)
    }

    return data || []
  },

  async setAssignments(studentId, assignments) {
    for (const assignment of assignments) {
      await db()!
        .from('assignments')
        .upsert({
          ...assignment,
          student_id: studentId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
    }
  },
}

export function getPersistence(): PersistenceProvider {
  return CONNECTED ? supabaseProvider : localProvider
}
