#!/usr/bin/env python3
"""
Turn a bank item's HTML into a safe, renderable subset.

Flattening everything to plain text loses more than it saves. 312 items carry an
inline SVG figure and 155 carry a data table; as text those become a wall of
alt-text prose or a column of loose numbers, and 161 items leak the CSS from an
SVG <style> block straight into the question.

So: convert MathML to LaTeX, keep a small whitelist of structural tags plus the
SVG drawing elements, and drop everything else.

This is College Board's markup, not user input, and it is served from the local
cache - but it still goes through a whitelist rather than being trusted, because
"content we fetched" is exactly the category that should not be trusted by
default.
"""
import re

from mathml import replace_all as mathml_to_latex

# Structural tags worth keeping, and the SVG subset matplotlib emits.
KEEP = {
    "p", "br", "em", "i", "strong", "b", "u", "sub", "sup",
    "ul", "ol", "li", "blockquote", "span", "div", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "caption",
    "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline",
    "polygon", "text", "tspan", "defs", "use", "clipPath", "marker",
    "image", "symbol", "title",
}

# Attributes safe to keep. Anything else - including every on* handler - is
# dropped rather than filtered, so there is no pattern to get wrong.
KEEP_ATTR = {
    "viewBox", "width", "height", "d", "x", "y", "x1", "y1", "x2", "y2",
    "cx", "cy", "r", "rx", "ry", "points", "transform", "fill", "stroke",
    "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "font-size", "font-family", "text-anchor", "dominant-baseline",
    "class", "colspan", "rowspan", "scope", "xmlns", "id", "clip-path",
    # matplotlib draws every character as <use href="#glyph">, so dropping href
    # renders a figure with no axis numbers or labels on it.
    "href",
    "opacity", "fill-opacity", "stroke-opacity", "aria-label", "role",
    # matplotlib puts all of a figure's paint in inline style - without it every
    # path falls back to a black fill and the figure renders as a solid block.
    "style",
}

# Inline style is presentational, but it is still a place to smuggle things in,
# so the value is filtered too. Local url(#clip) references are legitimate and
# needed; anything else fetching a resource is not.
STYLE_BAD = re.compile(r"(expression\s*\(|javascript:|@import|behavior\s*:|url\s*\(\s*(?!#))", re.I)

DROP_WHOLE = re.compile(r"<(style|script)\b[^>]*>.*?</\1\s*>", re.S | re.I)
COMMENT = re.compile(r"<!--.*?-->", re.S)
TAG = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9:_-]*)((?:\s[^>]*?)?)(/?)>", re.S)
ATTR = re.compile(r"""([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)""")


def _attrs(raw):
    out = []
    for name, value in ATTR.findall(raw or ""):
        base = name.split(":")[-1] if name.startswith("xlink:") else name
        if base not in KEEP_ATTR:
            continue
        v = value.strip("\"'")
        if "javascript:" in v.lower() or "data:text/html" in v.lower():
            continue
        if base == "style" and STYLE_BAD.search(v):
            continue
        # Only same-document references. An href pointing anywhere else would
        # make the figure fetch something when rendered.
        if base == "href" and not v.startswith("#"):
            continue
        out.append(f'{base}="{v}"')
    return (" " + " ".join(out)) if out else ""


def sanitize(fragment, math_delimiter="$"):
    """HTML fragment -> safe HTML, with MathML converted to $latex$."""
    if not fragment:
        return ""

    s = mathml_to_latex(fragment, math_delimiter)
    s = DROP_WHOLE.sub(" ", s)          # kills the leaked SVG CSS
    s = COMMENT.sub("", s)

    def one(m):
        closing, name, raw, selfclose = m.groups()
        # Tag names are case-sensitive in SVG (clipPath), so match both ways.
        key = name if name in KEEP else name.lower()
        if key not in KEEP and name not in KEEP:
            return ""
        tag = name if name in KEEP else key
        if closing:
            return f"</{tag}>"
        return f"<{tag}{_attrs(raw)}{' /' if selfclose else ''}>"

    s = TAG.sub(one, s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"(\s*<p>\s*</p>\s*)+", "", s)
    return s.strip()


TEXTONLY = re.compile(r"<[^>]+>")


def to_text(html_fragment):
    """Plain-text version, for search and for the teacher view."""
    import html as _html
    s = re.sub(r"</(p|div|li|tr|h\d|blockquote)>", "\n", html_fragment, flags=re.I)
    s = re.sub(r"<svg\b.*?</svg>", " [figure] ", s, flags=re.S | re.I)
    s = TEXTONLY.sub("", s)
    s = _html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def has_figure(html_fragment):
    return "<svg" in (html_fragment or "")


def has_table(html_fragment):
    return "<table" in (html_fragment or "")
