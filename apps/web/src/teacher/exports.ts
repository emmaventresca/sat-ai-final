/**
 * Export assignments and lesson plans by student.
 *
 * Teachers can download all assignments for a student as JSON,
 * or create a lesson plan folder structure by skill/tier.
 */

import { assignmentsFor } from './assignments'
import { makeWorksheet } from './worksheetApi'

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

/**
 * Generate and download a beautiful worksheet PDF.
 */
export async function downloadWorksheetPDF(
  exam: string,
  questionIds: string[],
  title: string,
): Promise<void> {
  try {
    const packet = await makeWorksheet(exam, questionIds, title)

    // Convert HTML to PDF using html2pdf library (loaded from CDN)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
    script.onload = () => {
      const element = document.createElement('div')
      element.innerHTML = packet.worksheet_html

      const options = {
        margin: [10, 10, 10, 10],
        filename: `${title.replace(/\s+/g, '_')}_worksheet.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'letter' },
      }

      // @ts-ignore - html2pdf is loaded dynamically
      window.html2pdf().set(options).from(element).save()
    }
    document.head.appendChild(script)
  } catch (error) {
    console.error('Worksheet generation failed:', error)
    alert('Could not generate worksheet. Make sure the planner service is running.')
  }
}
