#!/usr/bin/env python3
"""
MathML -> LaTeX, for the subset College Board's question bank actually uses.

1,453 of the 3,308 bank items carry <math> markup. Stripping it as ordinary
HTML turns "y = 34x + 81" into a column of fragments on separate lines, which is
how the math items first rendered. Converting to LaTeX and typesetting with
KaTeX is the fix.

Every element in the corpus is handled: mn mi mo mrow mfenced msup mfrac mtext
msqrt mover menclose mroot mstyle. Anything unexpected falls back to its text
content rather than raising, so a new element degrades instead of breaking the
item.
"""
import html
import re
import xml.etree.ElementTree as ET

# The bank's MathML is served as HTML, so it uses named entities like &deg; and
# &nbsp;. XML defines only five, and an undefined entity is a hard parse error -
# this alone accounted for every conversion failure in the corpus (354 blocks).
# Unescape everything except the five XML keeps, which must survive as entities.
_XML_SAFE = {"&amp;": "\x00AMP\x00", "&lt;": "\x00LT\x00", "&gt;": "\x00GT\x00",
             "&quot;": "\x00QUOT\x00", "&apos;": "\x00APOS\x00"}


def _unescape_html_entities(fragment):
    s = fragment
    for ent, hold in _XML_SAFE.items():
        s = s.replace(ent, hold)
    s = html.unescape(s)
    for ent, hold in _XML_SAFE.items():
        s = s.replace(hold, ent)
    return s

# Unicode operators the bank uses, mapped to LaTeX.
OPS = {
    "−": "-", "–": "-", "—": "-",      # minus, en/em dash
    "×": r"\times", "⋅": r"\cdot", "÷": r"\div",
    "≤": r"\le", "≥": r"\ge", "≠": r"\ne",
    "≈": r"\approx", "±": r"\pm", "∞": r"\infty",
    "π": r"\pi", "°": r"^{\circ}", "√": r"\sqrt",
    "→": r"\to", "∑": r"\sum", "∫": r"\int",
    "∠": r"\angle", "△": r"\triangle", "≅": r"\cong",
    "∼": r"\sim", "∥": r"\parallel", "⊥": r"\perp",
    " ": " ", "′": "'",
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
}

GREEK = {
    "α": r"\alpha", "β": r"\beta", "γ": r"\gamma",
    "θ": r"\theta", "μ": r"\mu", "σ": r"\sigma",
    "φ": r"\phi", "ω": r"\omega", "Δ": r"\Delta",
}


def _tag(el):
    return el.tag.split("}")[-1]           # drop any namespace


def _txt(el):
    s = (el.text or "").strip()
    for u, l in {**OPS, **GREEK}.items():
        s = s.replace(u, l)
    return s


def _kids(el):
    return [_node(c) for c in el]


def _join(parts):
    return " ".join(p for p in parts if p)


def _node(el):
    t = _tag(el)

    if t in ("math", "mrow", "mstyle", "semantics"):
        return _join(_kids(el))

    if t == "mn":
        return _txt(el)

    if t == "mi":
        s = _txt(el)
        # Multi-letter identifiers are function or unit names, not a product of
        # variables, so they should not be set in maths italic.
        return s if len(s) <= 1 else rf"\text{{{s}}}"

    if t == "mo":
        return _txt(el)

    if t == "mtext":
        s = _txt(el)
        return rf"\text{{{s}}}" if s else ""

    if t == "mfrac":
        k = _kids(el)
        return rf"\frac{{{k[0] if k else ''}}}{{{k[1] if len(k) > 1 else ''}}}"

    if t == "msup":
        k = _kids(el)
        return rf"{{{k[0] if k else ''}}}^{{{k[1] if len(k) > 1 else ''}}}"

    if t == "msub":
        k = _kids(el)
        return rf"{{{k[0] if k else ''}}}_{{{k[1] if len(k) > 1 else ''}}}"

    if t == "msubsup":
        k = _kids(el)
        return rf"{{{k[0]}}}_{{{k[1]}}}^{{{k[2]}}}" if len(k) > 2 else _join(k)

    if t == "msqrt":
        return rf"\sqrt{{{_join(_kids(el))}}}"

    if t == "mroot":
        k = _kids(el)
        return rf"\sqrt[{k[1] if len(k) > 1 else ''}]{{{k[0] if k else ''}}}"

    if t == "mfenced":
        opening = el.get("open", "(")
        closing = el.get("close", ")")
        sep = el.get("separators", ",").strip() or ","
        inner = sep.join(k for k in _kids(el) if k)
        opening = {"": ".", "|": r"\vert"}.get(opening, opening)
        closing = {"": ".", "|": r"\vert"}.get(closing, closing)
        if opening in "{}":
            opening = "\\" + opening
        if closing in "{}":
            closing = "\\" + closing
        return rf"\left{opening} {inner} \right{closing}"

    if t == "mover":
        k = _kids(el)
        if len(k) > 1 and k[1] in ("-", r"\overline", "¯"):
            return rf"\overline{{{k[0]}}}"
        return rf"\overset{{{k[1] if len(k) > 1 else ''}}}{{{k[0] if k else ''}}}"

    if t == "munder":
        k = _kids(el)
        return rf"\underset{{{k[1] if len(k) > 1 else ''}}}{{{k[0] if k else ''}}}"

    if t == "menclose":
        notation = el.get("notation", "")
        inner = _join(_kids(el))
        if "top" in notation or "bar" in notation:
            return rf"\overline{{{inner}}}"
        return inner

    if t in ("marker", "none", "mspace"):
        return ""

    if t in ("mtable", "mtr", "mtd"):
        # Tables appear only as simple stacked rows in this corpus.
        return _join(_kids(el))

    # Unknown element: keep whatever text it holds rather than failing.
    return _join([_txt(el)] + _kids(el))


def convert(fragment):
    """One <math>...</math> element -> a LaTeX string."""
    try:
        root = ET.fromstring(_unescape_html_entities(fragment))
    except ET.ParseError:
        return None
    latex = _node(root)
    latex = re.sub(r"\s+", " ", latex).strip()
    return latex or None


MATH_RE = re.compile(r"<math\b.*?</math>", re.S | re.I)
ALT_RE = re.compile(r'alttext="([^"]*)"', re.I)


def replace_all(html, delimiter="$"):
    """Replace every <math> block in an HTML fragment with $latex$.

    Falls back to the element's own alttext, then to dropping it, so a block we
    cannot parse never leaves MathML tags in the output.
    """
    def one(m):
        block = m.group(0)
        latex = convert(block)
        if latex:
            return f"{delimiter}{latex}{delimiter}"
        alt = ALT_RE.search(block)
        return f" {alt.group(1)} " if alt else " "

    return MATH_RE.sub(one, html)
