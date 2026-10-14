/**
 * Which art direction a screen belongs to.
 *
 * The lesson, quiz and practice screens are shared by both exams - the same
 * Stage, the same Round, the same QuestionCard. So a theme cannot be applied
 * to those components; it has to be applied to the WORLD the student is
 * currently in, and the components have to inherit it.
 *
 * Hence an attribute on the shell rather than new components or a fork of
 * the CSS: `[data-world="forest"]` dresses everything inside it, and ACT's
 * alpine, boardwalk and island worlds are untouched because the attribute
 * is simply not there.
 *
 * SAT Maths is the forest - it is the land the quest art was drawn for.
 * Everything else returns `undefined`, which means "the app's own look",
 * and that is the honest default until each world has art direction of its
 * own rather than a colour swap.
 */
export type World = 'forest'

export function worldOf(exam: string, section: string | undefined): World | undefined {
  return exam === 'sat' && section === 'math' ? 'forest' : undefined
}
