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
  busy: false, error: null, result: null, preview: null, startedAt: null,
};

export function resetShot() {
  shotState.busy = false;
  shotState.error = null;
  shotState.result = null;
  shotState.preview = null;
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
  shotState.busy = true;
  shotState.error = null;
  shotState.result = null;
  shotState.preview = dataUrl;
  shotState.startedAt = Date.now();
  if (onStart) onStart();
  try {
    const r = await fetch(`${PLANNER}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, section: section || null }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `identify returned ${r.status}`);
    if (!data.subtype) {
      throw new Error(data.why || 'That did not match any question type we know.');
    }
    shotState.result = data;
    return data;
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
export function matchesFor(result, items) {
  const pool = (items ?? []).filter((i) => i.subtype === result.subtype);
  const at = (t) => pool.filter((i) => i.difficulty === t);
  return {
    pool,
    same: at(result.difficulty),
    easier: result.difficulty === 'E' ? at('F') : at(result.difficulty === 'H' ? 'M' : 'E'),
    harder: result.difficulty === 'H' ? [] : at(result.difficulty === 'E' ? 'M' : 'H'),
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
