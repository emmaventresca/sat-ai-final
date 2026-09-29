#!/usr/bin/env python3
"""
Split College Board's rationale into one explanation per answer choice.

CB writes a paragraph for the correct answer and then one for each wrong choice,
explaining the specific error that produces it. Shown whole, a student who picks
B reads four paragraphs to find the one about B. Split, they get told exactly
why *their* answer was wrong - which is the difference between being corrected
and being diagnosed.

Also tags each wrong choice with a misconception family, so practice feeds the
same trigger system that uploaded test results do. The tags come from CB's own
wording, not from guessing.
"""
import html as _html
import re

# "Choice C is the best answer" / "Choice C is correct" / "Choice A is incorrect"
SPLIT = re.compile(
    r"Choice\s+([A-D])\s+is\s+(the\s+best\s+answer|correct|incorrect)\b",
    re.I)

# College Board's boilerplate for "no specific reason given". It is by far the
# most common wrong-choice text in Math, and it carries no diagnostic
# information at all - tagging it as a misconception would be inventing
# precision that is not in the source. Matched first, and mapped to nothing.
BOILERPLATE = re.compile(
    r"is incorrect and may result from (?:a )?"
    r"(?:conceptual|calculation|computational)[^.]{0,40}error", re.I)

# Misconception families, keyed off the language CB actually uses. Ordered:
# the first match wins, so the specific patterns come before the generic ones.
FAMILIES = [
    ("misread-question",  r"answers? the wrong question|not what the question|"
                          r"this is the (?:number|value|amount|total) of [^.]{0,70}, not|"
                          r", not the (?:number|value|amount|total)"),
    ("sign-or-order",     r"sign error|reversed|opposite order|switch(?:ed|ing) the"),
    ("wrong-operation",   r"multiplying instead of dividing|dividing instead of "
                          r"multiplying|adding instead of subtracting|subtracting "
                          r"instead of adding"),
    ("partial-solution",  r"only (?:part|one step)|stops? (?:short|after)|"
                          r"intermediate (?:value|step)"),
    ("too-strong",        r"too (?:strong|broad|absolute)|overstate|stronger than|"
                          r"goes beyond what the text"),
    ("topic-not-claim",   r"does(?:n'?t| not) (?:support|address) the claim|"
                          r"about a different|"
                          r"the text (?:does(?:n'?t| not)) (?:suggest|indicate|state|"
                          r"describe|mention)|"
                          r"not the (?:point|claim) (?:being )?made|"
                          r"no(?:t)? (?:supported|discussed) (?:by|in) the text"),
    ("wrong-meaning",     r"in this context[,]? “|isn'?t what .{0,30} means|"
                          r"wouldn'?t make sense in context"),
    ("arithmetic-slip",   r"calculation error"),
]
COMPILED = [(name, re.compile(rx, re.I)) for name, rx in FAMILIES]

TAGS = re.compile(r"<[^>]+>")


def _plain(html_fragment):
    """Tags out, entities resolved. The entity step matters: the patterns below
    key off curly quotes, which arrive as &ldquo;/&rdquo; and would never match
    as written otherwise."""
    s = re.sub(r"</(p|div|li)>", " ", html_fragment or "", flags=re.I)
    s = TAGS.sub("", s)
    s = _html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def split(rationale_html, answer):
    """-> {'correct': html, 'A': html, 'B': html, ...} for whatever is present.

    Returns None when the rationale has no per-choice structure, in which case
    the caller should keep showing it whole rather than inventing a split.
    """
    if not rationale_html:
        return None

    marks = list(SPLIT.finditer(rationale_html))
    if len(marks) < 2:
        return None

    out = {}
    for i, m in enumerate(marks):
        letter = m.group(1).upper()
        end = marks[i + 1].start() if i + 1 < len(marks) else len(rationale_html)
        segment = rationale_html[m.start():end].strip()
        # Close any tag the slice opened, so the fragment stands alone.
        segment = re.sub(r"<p[^>]*>\s*$", "", segment)
        if not segment.rstrip().endswith("</p>") and "<p" in segment:
            segment += "</p>"
        key = "correct" if letter == answer else letter
        # A letter can appear twice (named in the correct answer's paragraph);
        # keep the first, which is the one that leads its own explanation.
        out.setdefault(key, segment)

    # Without an explanation of the right answer this is not a usable split.
    return out if "correct" in out else None


def misconception(segment_html):
    """Which error family this wrong choice represents, from CB's own wording.

    None means College Board did not say - either boilerplate, or prose that
    does not name a recognisable error. That is reported as unknown rather than
    guessed at.
    """
    text = _plain(segment_html)
    if BOILERPLATE.search(text):
        return None
    for name, rx in COMPILED:
        if rx.search(text):
            return name
    return None


def annotate(item):
    """Add per_choice and misconceptions to one item, in place."""
    parts = split(item.get("rationale"), item.get("answer"))
    if not parts:
        return False
    item["per_choice"] = parts
    item["misconceptions"] = {
        k: m for k, v in parts.items() if k != "correct"
        for m in [misconception(v)] if m
    }
    return True
