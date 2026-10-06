// ---------------------------------------------------------------------------
// "Here is a question. Give me more like it."
//
// A teacher has one on screen - in Bluebook, in a textbook, on a worksheet -
// and wants to build a lesson around it. The useful thing to pull out of the
// image is WHICH RECOGNITION it is, which is a fact about the question rather
// than anything anyone wrote.
//
// That is also the whole legal design. The image may be College Board's. We
// send it to the teacher's own machine, ask for a classification, and keep
// only that: "two-way table conditional probability, Medium". The file is
// written to a temp path, read once, and deleted. Nothing is stored, and the
// question's text is never requested - the prompt forbids it explicitly.
// Processed, never persisted (docs/DESIGN.md section 3).
// ---------------------------------------------------------------------------

const PLANNER = 'http://localhost:8791';

export const shotState = {
  busy: false, error: null, questions: [], rejected: [],
  preview: null, startedAt: null, picked: 0, writing: false, wrote: 0,
};

export function resetShot() {
  Object.assign(shotState, {
    busy: false, error: null, questions: [], rejected: [],
    preview: null, picked: 0, writing: false, wrote: 0,
  });
}

/** The question the teacher is currently looking at. */
export function picked() {
  return shotState.questions[shotState.picked] ?? null;
}

/** A File from an input or a paste, as a data URL we can show and send. */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('That is not an image.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('That image is larger than 12MB.'));
      return;
    }
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

/**
 * Identify the question in an image.
 *
 * `onStart` fires before the request so the caller can paint the pending
 * state - the call takes the better part of a minute and a page that does
 * not react looks broken.
 */
export async function identify(dataUrl, section, onStart) {
  Object.assign(shotState, {
    busy: true, error: null, questions: [], rejected: [], wrote: 0,
    preview: dataUrl, startedAt: Date.now(), picked: 0,
  });
  if (onStart) onStart();
  try {
    const r = await fetch(`${PLANNER}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, section: section || null }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `identify returned ${r.status}`);
    const hits = (data.questions ?? []).filter((q) => q.subtype);
    if (!hits.length) {
      // A screenshot of something that is not an SAT question is the normal
      // way this fails, and saying so beats a stack trace.
      throw new Error((data.questions ?? [])[0]?.why
        || 'Nothing in that image matched a question type we know.');
    }
    shotState.questions = hits;
    shotState.rejected = data.rejected ?? [];
    return hits;
  } catch (e) {
    shotState.error = String(e.message ?? e);
    throw e;
  } finally {
    shotState.busy = false;
  }
}

/**
 * What we can offer from the bank for an identified question.
 *
 * Split the same way the student review screen splits it, because the
 * distinction is the same one: the closest match is same recognition AND
 * same difficulty, and a teacher usually wants a spread around it rather
 * than ten clones.
 */
const TIERS = ['F', 'E', 'M', 'H'];

export function matchesFor(result, items) {
  const pool = (items ?? []).filter((i) => i.subtype === result.subtype);
  const at = (t) => pool.filter((i) => i.difficulty === t);
  const i = Math.max(0, TIERS.indexOf(result.difficulty));
  return {
    pool,
    same: at(result.difficulty),
    easier: i > 0 ? at(TIERS[i - 1]) : [],
    harder: i + 1 < TIERS.length ? at(TIERS[i + 1]) : [],
  };
}

/** Ask for more of this recognition at this level. */
export async function writeMoreLikeIt(result, n = 6) {
  const r = await fetch(`${PLANNER}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subtype: result.subtype,
      skill_cd: result.skill_cd,
      difficulty: result.difficulty,
      n,
      kind: 'twins',
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `generator returned ${r.status}`);
  return data.items ?? [];
}
