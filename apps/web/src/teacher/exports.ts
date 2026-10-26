/**
 * Export assignments and lesson plans by student.
 *
 * Teachers can download all assignments for a student as JSON,
 * or create a lesson plan folder structure by skill/tier.
 */

import { assignmentsFor } from './assignments'

/**
 * Export all assignments for a student as JSON.
 */
export function exportStudentAssignments(studentId: string, studentName: string): void {
  const assignments = assignmentsFor(studentId)
  const data = {
    student: studentName,
    exportedAt: new Date().toISOString(),
    assignments,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${studentName.replace(/\s+/g, '_')}_assignments_${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export assignments as a CSV for sharing/backup.
 */
export function exportStudentAssignmentsCSV(studentId: string, studentName: string): void {
  const assignments = assignmentsFor(studentId)

  let csv = 'Date,Title,Exam,Status,Items\n'
  for (const assignment of assignments) {
    const assignedDate = new Date(assignment.assignedAt).toLocaleDateString()
    const itemCount = assignment.items.length
    csv += `"${assignedDate}","${assignment.title}","${assignment.exam}","assigned","${itemCount} items"\n`
  }

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${studentName.replace(/\s+/g, '_')}_assignments.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
