// ---------------------------------------------------------------------------
// Text rendering: light markdown plus $...$ maths, typeset with KaTeX.
//
// Order matters. Maths is pulled out *first*, before escaping and before the
// markdown pass, because LaTeX is full of characters both of those would
// mangle - braces, backslashes, carets, underscores, and asterisks that are not
// emphasis.
// ---------------------------------------------------------------------------

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Inline markdown. Runs only on non-maths text. */
function markdown(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Typeset one expression, wrapped in a chip.
 *
 * The chip is the thing that makes maths readable inside a sentence: it keeps
 * an equation together as one visual unit instead of letting it dissolve into
 * the surrounding prose, and it never breaks across a line.
 */
function typeset(latex, display = false) {
  const cls = display ? 'mth mth-block' : 'mth';
  if (typeof katex === 'undefined') {
    return `<span class="${cls}">${escapeHtml(latex)}</span>`;
  }
  try {
    const html = katex.renderToString(latex, {
      displayMode: display, throwOnError: false, strict: false,
    });
    return `<span class="${cls}">${html}</span>`;
  } catch {
    // A malformed expression should show as plain text, not blank the line.
    return `<span class="${cls}">${escapeHtml(latex)}</span>`;
  }
}

// $$...$$ first so the single-dollar pattern cannot split it in half.
const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

/** Render one line of lesson or item text to HTML. */
export function renderText(s) {
  const text = String(s ?? '');
  let out = '';
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    out += markdown(text.slice(last, m.index));
    out += m[1] !== undefined ? typeset(m[1], true) : typeset(m[2], false);
    last = m.index + m[0].length;
  }
  return out + markdown(text.slice(last));
}

/**
 * Render a lesson section body. Lines starting "- " become a list, everything
 * else a paragraph.
 */
export function renderBody(lines) {
  const out = [];
  let list = null;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      (list ??= []).push(`<li>${renderText(line.slice(2))}</li>`);
    } else {
      if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
      out.push(`<p>${renderText(line)}</p>`);
    }
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('');
}

/**
 * Render pre-sanitized HTML that may contain $...$ maths.
 *
 * Item text arrives from tools/sanitize.py already reduced to a whitelisted
 * subset, so it is inserted as HTML rather than escaped - otherwise the SVG
 * figures and data tables would show as angle brackets. Maths is still
 * typeset, but only in the text between tags: a `$` inside an attribute
 * (a `d="M0 0"` path, say) must be left alone.
 */
export function renderHtml(html) {
  const text = String(html ?? '');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt === -1) { out += mathOnly(text.slice(i)); break; }
    out += mathOnly(text.slice(i, lt));
    const gt = text.indexOf('>', lt);
    if (gt === -1) { out += text.slice(lt); break; }
    out += text.slice(lt, gt + 1);          // tag, verbatim
    i = gt + 1;
  }
  return out;
}

/** Typeset $...$ but leave the surrounding text exactly as it is. */
function mathOnly(s) {
  let out = '';
  let last = 0;
  for (const m of s.matchAll(MATH)) {
    out += s.slice(last, m.index);
    out += m[1] !== undefined ? typeset(m[1], true) : typeset(m[2], false);
    last = m.index + m[0].length;
  }
  return out + s.slice(last);
}
