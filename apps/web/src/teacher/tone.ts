import type { Exam } from '../exams/types'

/**
 * Which exams a student is sitting, as a colour.
 *
 * Teacher side only. On a roster of twenty, the thing you scan for is "who
 * is doing what", and a colour answers that before you have read a name.
 * The student side stays one palette on purpose: a student is only ever
 * looking at one test, so colouring it would carry no information and just
 * make the two apps look like different products.
 */
export function examTone(access: Record<Exam, boolean>): string {
  if (access.sat && access.act) return 'tone-both'
  if (access.act) return 'tone-act'
  if (access.sat) return 'tone-sat'
  return 'tone-none'
}
