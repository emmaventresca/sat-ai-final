#!/usr/bin/env python3
"""
Printable packets: a student worksheet and the teacher's answer key.

Ported from the ACT project's `packet.py`. Two things survive the port because
they were the good ideas in it:

  **Two agents with a real division of labour.** A layout agent decides what
  order the questions are taught in and how they group; a key agent writes the
  teacher-facing solution. One agent asked for both drifts - it writes a key
  for the order it *meant* to print rather than the order it printed.

  **Numbering is assigned here, between the two passes, and handed to the
  second one.** If each agent chose its own numbering, the worksheet and the
  key would disagree and a teacher holding both would not notice until mid
  class.

Three things are new, and all three come from this repo's data being richer
than the ACT bank was:

  * Our items carry `per_choice` and `misconceptions` - a slug naming the error
    each wrong choice is built to catch. That is the most valuable line in an
    answer key and it is already written, so the key prints it from the data
    rather than asking a model to re-derive it. Only the worked steps and the
    one sentence a tutor says out loud are generated.
  * `format: "grid"` items have no choices at all. On paper a grid-in needs a
    ruled box to write a value into; printing empty choice letters under one
    teaches the student to expect four options that are not coming.
  * `figure` specs are drawn, not described. "Week 3 reaches the 10th
    gridline" does the reading for the student and leaves them arithmetic.

Output is HTML with a print stylesheet rather than the ACT version's PDF: this
repo has no reportlab and the browser's own print dialogue is one dependency
fewer between a teacher and a stack of paper.

Model calls go through tools/cli.py, the same path everything else in this repo
uses - its retry and circuit-breaker behaviour is the reason a rate limit costs
a pause instead of a run.
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Any, Iterable

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from cli import call_json_object                            # noqa: E402

MODEL = os.environ.get("WORKSHEET_MODEL", "claude-opus-5-5")
EXAMS_PATH = os.path.join(ROOT, "packages", "schema", "exams.json")

BANK_LETTERS = "ABCDEFGH"

# The ACT alternates its answer letters down the page - A-E on odd questions,
# F-K on even - and a student who has drilled on worksheets that do not is
# slower on test day for no reason. The SAT does not do this.
ACT_ODD, ACT_EVEN = "ABCDE", "FGHJK"
SAT_LETTERS = "ABCDEFG"

# Who wrote the item. LICENSING.md §4: College Board's expression may not be
# redistributed and may not enter a model prompt, so a packet is built only
# from items we can point at an author for. Anything else is refused loudly
# rather than quietly dropped - a worksheet missing three questions looks like
# a worksheet, and nobody checks.
OURS = ("original", "act-mastery/", "cc by")


class WorksheetError(ValueError):
    """The packet cannot be built from what was asked for."""


class MixedExams(WorksheetError):
    """SAT and ACT questions were asked for in one packet."""


# --------------------------------------------------------------------------- #
# banks
# --------------------------------------------------------------------------- #
_BANKS: dict[str, dict[str, dict]] = {}


def exam_config(exam: str) -> dict:
    exams = json.load(open(EXAMS_PATH))["exams"]
    if exam not in exams:
        raise WorksheetError(
            f"unknown exam {exam!r} - expected one of {', '.join(sorted(exams))}")
    return exams[exam]


def load_bank(exam: str) -> dict[str, dict]:
    """The exam's own question bank, id -> item.

    The two banks are separate files on purpose and are read separately here;
    there is deliberately no merged view for anything to fall through into.
    """
    if exam in _BANKS:
        return _BANKS[exam]
    rel = exam_config(exam)["bank"]
    for path in (os.path.join(ROOT, rel), os.path.join(ROOT, "data", rel)):
        if os.path.exists(path):
            break
    else:
        raise WorksheetError(
            f"the {exam.upper()} bank is not built yet (looked for {rel}). "
            f"For the ACT run tools/import_act.py first.")
    blob = json.load(open(path))
    items = blob["items"] if isinstance(blob, dict) else blob
    _BANKS[exam] = {i["id"]: i for i in items}
    return _BANKS[exam]


def _is_ours(item: dict) -> bool:
    mark = f"{item.get('source', '')} {item.get('license', '')}".lower()
    return any(m in mark for m in OURS)


def select(exam: str, question_ids: Iterable[str]) -> list[dict]:
    """Resolve ids against ONE exam's bank, refusing a mixed packet.

    An id from the other exam is the failure worth naming explicitly: it is
    the one mistake that produces a plausible-looking worksheet which is
    wrong for the student holding it.
    """
    bank = load_bank(exam)
    other = "act" if exam == "sat" else "sat"
    wanted = list(dict.fromkeys(question_ids))
    if not wanted:
        raise WorksheetError("no questions were given for this packet")

    missing = [q for q in wanted if q not in bank]
    if missing:
        try:
            foreign = [q for q in missing if q in load_bank(other)]
        except WorksheetError:
            foreign = []
        if foreign:
            raise MixedExams(
                f"{len(foreign)} of these questions are {other.upper()} items "
                f"({', '.join(foreign[:3])}); this packet is {exam.upper()}. "
                f"One packet, one exam.")
        raise WorksheetError(
            f"{len(missing)} question ids are not in the {exam.upper()} bank: "
            f"{', '.join(missing[:5])}")

    items = [bank[q] for q in wanted]
    borrowed = [i["id"] for i in items if not _is_ours(i)]
    if borrowed:
        raise WorksheetError(
            f"{len(borrowed)} questions are not ours to print or to put in a "
            f"prompt ({', '.join(borrowed[:3])}). See docs/LICENSING.md §4.")
    return items


# --------------------------------------------------------------------------- #
# numbering, assigned once and shared by both passes
# --------------------------------------------------------------------------- #
def letter_for(exam: str, number: int, index: int) -> str:
    alphabet = SAT_LETTERS
    if exam == "act":
        alphabet = ACT_EVEN if number % 2 == 0 else ACT_ODD
    return alphabet[index] if index < len(alphabet) else chr(65 + index)


@dataclass
class Numbered:
    """One item with the number and letters it will be printed under."""
    number: int
    item: dict
    letters: list[str] = field(default_factory=list)

    @property
    def is_grid(self) -> bool:
        return self.item.get("format") == "grid"

    @property
    def answer_index(self) -> int:
        return BANK_LETTERS.find(str(self.item.get("answer", "")).strip().upper())

    @property
    def answer_letter(self) -> str:
        i = self.answer_index
        return self.letters[i] if 0 <= i < len(self.letters) else "?"

    @property
    def answer_text(self) -> str:
        if self.is_grid:
            return " or ".join(str(k) for k in self.item.get("keys") or [])
        i = self.answer_index
        choices = self.item.get("choices") or []
        return str(choices[i]) if 0 <= i < len(choices) else ""

    def distractors(self) -> list[tuple[str, str, str, str]]:
        """(printed label, text, misconception slug, why) for every wrong path.

        Grid-ins have no wrong choices, but they do have `common_errors`: the
        values a student actually lands on. Those are the same object as a
        distractor and are printed in the same place in the key.
        """
        miscon = self.item.get("misconceptions") or {}
        if self.is_grid:
            return [(str(e.get("value", "")), "",
                     e.get("misconception") or miscon.get(str(e.get("value"))) or "",
                     e.get("why") or "")
                    for e in self.item.get("common_errors") or []]
        out = []
        detail = self.item.get("distractors") or {}
        for i, choice in enumerate(self.item.get("choices") or []):
            if i == self.answer_index:
                continue
            key = BANK_LETTERS[i]
            d = detail.get(key) or {}
            out.append((self.letters[i], str(choice),
                        d.get("misconception") or miscon.get(key) or "",
                        d.get("why") or ""))
        return out

    def for_prompt(self) -> str:
        head = (f"Question {self.number} [{self.item.get('subtype', '?')} · "
                f"tier {self.item.get('difficulty', '?')}]")
        body = [head]
        if self.item.get("stimulus"):
            body.append(to_text(self.item["stimulus"]))
        body.append(to_text(self.item.get("stem", "")))
        if self.is_grid:
            body.append("  Student-produced response (no choices).")
            body.append(f"  Accepted: {self.answer_text}")
        else:
            body += [f"  {self.letters[i]}. {to_text(c)}"
                     for i, c in enumerate(self.item.get("choices") or [])]
            body.append(f"  Correct: {self.answer_letter}. {to_text(self.answer_text)}")
        body.append(f"  Our explanation: {to_text(self.item.get('explanation', ''))}")
        for label, _text, slug, why in self.distractors():
            body.append(f"  Trap {label} [{slug or 'untagged'}]: {to_text(why)}")
        return "\n".join(body)


def number_items(items: list[dict], exam: str, start: int = 1) -> list[Numbered]:
    out = []
    for offset, item in enumerate(items):
        n = start + offset
        letters = [] if item.get("format") == "grid" else [
            letter_for(exam, n, i) for i in range(len(item.get("choices") or []))]
        out.append(Numbered(number=n, item=item, letters=letters))
    return out


# --------------------------------------------------------------------------- #
# text: LaTeX down to something a printer can set
# --------------------------------------------------------------------------- #
_TEX = [
    (r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)"),
    (r"\\dfrac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)"),
    (r"\\sqrt\{([^{}]*)\}", r"√(\1)"),
    (r"\\sqrt\s*(\w)", r"√\1"),
    (r"\\overline\{([^{}]*)\}", r"\1"),
    (r"\\text\{([^{}]*)\}", r"\1"),
    (r"\\(?:left|right|,|;|!|quad|qquad)", ""),
]
_SYMBOLS = {
    r"\pi": "π", r"\theta": "θ", r"\le": "≤", r"\leq": "≤", r"\ge": "≥",
    r"\geq": "≥", r"\ne": "≠", r"\neq": "≠", r"\times": "×", r"\div": "÷",
    r"\cdot": "·", r"\pm": "±", r"\circ": "°", r"\approx": "≈",
    r"\infty": "∞", r"\angle": "∠", r"\triangle": "△", r"\%": "%",
}
MATH = re.compile(r"\$\$(.+?)\$\$|\$([^$\n]+?)\$", re.S)


def tex_to_text(tex: str) -> str:
    """One LaTeX expression as plain characters.

    There is no KaTeX here - this HTML is built to be printed, and a page that
    needs a script to be legible is a page that prints blank when the school
    network blocks a CDN. Everything the bank actually uses collapses to real
    Unicode; anything exotic degrades to its own source, which is ugly but
    still readable.
    """
    s = str(tex or "")
    for pattern, repl in _TEX:
        for _ in range(3):                  # nested fractions, a level at a time
            s, n = re.subn(pattern, repl, s)
            if not n:
                break
    for name, char in _SYMBOLS.items():
        s = s.replace(name, char)
    s = re.sub(r"\^\{([^{}]*)\}", r"^(\1)", s)
    s = re.sub(r"_\{([^{}]*)\}", r"_(\1)", s)
    return s.replace("{", "").replace("}", "").strip()


def to_text(s: Any) -> str:
    """Item text with the maths flattened - for prompts and for alt text."""
    text = str(s or "")
    return MATH.sub(lambda m: tex_to_text(m.group(1) or m.group(2)), text)


def render_text(s: Any) -> str:
    """Item text as print-ready HTML: maths in chips, light markdown, escaped."""
    text = str(s or "")
    out, last = [], 0
    for m in MATH.finditer(text):
        out.append(_markdown(text[last:m.start()]))
        expr = html.escape(tex_to_text(m.group(1) or m.group(2)))
        expr = re.sub(r"\^\(([^()]*)\)", r"<sup>\1</sup>", expr)
        expr = re.sub(r"_\(([^()]*)\)", r"<sub>\1</sub>", expr)
        expr = re.sub(r"\^(-?\w)", r"<sup>\1</sup>", expr)
        out.append(f'<span class="m">{expr}</span>')
        last = m.end()
    out.append(_markdown(text[last:]))
    return "".join(out)


def _markdown(s: str) -> str:
    e = html.escape(s)
    e = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", e)
    e = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", e)
    return e.replace("\n\n", "<br><br>")


def strip_tags(s: Any) -> str:
    """`per_choice` prose is stored as HTML; the prompt wants the words."""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def clean_step(text: Any) -> str:
    """Drop a leading "1." or "Step 2:" so our numbering is not doubled."""
    return re.sub(r"^(?:step\s*)?\d+\s*[.):]\s*", "", str(text or "").strip(),
                  flags=re.IGNORECASE)


# --------------------------------------------------------------------------- #
# figures
#
# Ported from web/assets/mathfmt.js so the printed figure is the same figure
# the student saw on screen. Same geometry, same spec vocabulary - if the two
# drift, a question that reads off a gridline means different things in the two
# places it appears.
# --------------------------------------------------------------------------- #
_W, _H = 560, 300
_PAD = {"l": 52, "r": 14, "t": 14, "b": 42}


def _nice(n: float) -> str:
    v = round(float(n), 2)
    return str(int(v)) if v == int(v) else str(v)


def _ticks(lo: float, hi: float, step: float | None) -> list[float]:
    s = step or (hi - lo) / 5 or 1
    out, v = [], lo
    while v <= hi + 1e-9:
        out.append(round(v, 6))
        v += s
    return out


def _axes(spec: dict, xs: list[tuple[float, str]], ys: list[tuple[float, str]],
          zero_x: float | None = None, zero_y: float | None = None) -> str:
    e, out = html.escape, []
    for p, label in ys:
        out.append(f'<line class="g" x1="{_PAD["l"]}" y1="{p:.1f}" '
                   f'x2="{_W - _PAD["r"]}" y2="{p:.1f}"/>')
        out.append(f'<text x="{_PAD["l"] - 8}" y="{p + 4:.1f}" '
                   f'text-anchor="end">{e(label)}</text>')
    out.append(f'<line class="a" x1="{_PAD["l"]}" y1="{_PAD["t"]}" '
               f'x2="{_PAD["l"]}" y2="{_H - _PAD["b"]}"/>')
    out.append(f'<line class="a" x1="{_PAD["l"]}" y1="{_H - _PAD["b"]}" '
               f'x2="{_W - _PAD["r"]}" y2="{_H - _PAD["b"]}"/>')
    if zero_y is not None:
        out.append(f'<line class="a" x1="{_PAD["l"]}" y1="{zero_y:.1f}" '
                   f'x2="{_W - _PAD["r"]}" y2="{zero_y:.1f}"/>')
    if zero_x is not None:
        out.append(f'<line class="a" x1="{zero_x:.1f}" y1="{_PAD["t"]}" '
                   f'x2="{zero_x:.1f}" y2="{_H - _PAD["b"]}"/>')
    for p, label in xs:
        out.append(f'<text x="{p:.1f}" y="{_H - _PAD["b"] + 18}" '
                   f'text-anchor="middle">{e(label)}</text>')
    if spec.get("x_label"):
        out.append(f'<text x="{(_PAD["l"] + _W - _PAD["r"]) / 2:.1f}" y="{_H - 6}" '
                   f'text-anchor="middle">{e(spec["x_label"])}</text>')
    if spec.get("y_label"):
        mid = (_PAD["t"] + _H - _PAD["b"]) / 2
        out.append(f'<text transform="translate(13 {mid:.1f}) rotate(-90)" '
                   f'text-anchor="middle">{e(spec["y_label"])}</text>')
    return "".join(out)


def _bar_chart(spec: dict) -> str:
    cats = spec.get("categories") or []
    vals = [float(v) for v in spec.get("values") or []]
    hi = float(spec.get("y_max", max(vals + [1])))
    lo = min(0.0, float(spec.get("y_min", 0)))
    plot = _H - _PAD["b"] - _PAD["t"]

    def y(v: float) -> float:
        return _H - _PAD["b"] - ((v - lo) / (hi - lo or 1)) * plot

    span = (_W - _PAD["l"] - _PAD["r"]) / max(len(cats), 1)
    bw = min(span * 0.56, 64)
    yt = [(y(v), _nice(v)) for v in _ticks(lo, hi, spec.get("y_step"))]
    xt = [(_PAD["l"] + span * (i + 0.5), str(c)) for i, c in enumerate(cats)]
    bars = "".join(
        f'<rect class="bar" x="{_PAD["l"] + span * (i + 0.5) - bw / 2:.1f}" '
        f'y="{min(y(v), y(0)):.1f}" width="{bw:.1f}" '
        f'height="{abs(y(v) - y(0)):.1f}" rx="3"/>'
        for i, v in enumerate(vals))
    return _axes(spec, xt, yt) + bars


def _point_chart(spec: dict, kind: str) -> str:
    pts = [(float(a), float(b)) for a, b in spec.get("points") or []]
    if not pts:
        return ""
    x0 = float(spec.get("x_min", min([0.0] + [p[0] for p in pts])))
    x1 = float(spec.get("x_max", max([1.0] + [p[0] for p in pts])))
    y0 = float(spec.get("y_min", min([0.0] + [p[1] for p in pts])))
    y1 = float(spec.get("y_max", max([1.0] + [p[1] for p in pts])))

    def X(v: float) -> float:
        return _PAD["l"] + ((v - x0) / (x1 - x0 or 1)) * (_W - _PAD["l"] - _PAD["r"])

    def Y(v: float) -> float:
        return _H - _PAD["b"] - ((v - y0) / (y1 - y0 or 1)) * (_H - _PAD["b"] - _PAD["t"])

    yt = [(Y(v), _nice(v)) for v in _ticks(y0, y1, spec.get("y_step"))]
    xt = [(X(v), _nice(v)) for v in _ticks(x0, x1, spec.get("x_step"))]
    body = ""
    if kind in ("line", "curve"):
        path = " ".join(f"{X(a):.1f},{Y(b):.1f}" for a, b in sorted(pts))
        body += f'<polyline class="ln" points="{path}"/>'
    # A sampled curve is one object, not a set of readings: no point markers.
    if kind != "curve":
        body += "".join(f'<circle class="pt" cx="{X(a):.1f}" cy="{Y(b):.1f}" r="4"/>'
                        for a, b in pts)
    return _axes(spec, xt, yt,
                 zero_x=X(0) if x0 < 0 < x1 else None,
                 zero_y=Y(0) if y0 < 0 < y1 else None) + body


def render_figure(spec: Any) -> str:
    """An item's figure as inline SVG, or '' for anything unrecognised.

    Unknown specs degrade to no picture rather than a broken one - a half-drawn
    axis on a printed page is worse than a caption.
    """
    if not isinstance(spec, dict):
        return ""
    kind = spec.get("type")
    if kind == "bar":
        body = _bar_chart(spec)
    elif kind in ("line", "curve", "scatter"):
        body = _point_chart(spec, kind)
    else:
        return ""
    if not body:
        return ""
    cap = (f'<figcaption>{html.escape(str(spec["caption"]))}</figcaption>'
           if spec.get("caption") else "")
    alt = html.escape(str(spec.get("alt") or spec.get("caption") or "chart"))
    return (f'<figure class="fig">{cap}<svg viewBox="0 0 {_W} {_H}" role="img" '
            f'aria-label="{alt}">{body}</svg></figure>')


# --------------------------------------------------------------------------- #
# pass 1: the layout agent
# --------------------------------------------------------------------------- #
LAYOUT_BRIEF = """You lay out a printable {exam} practice worksheet for a tutor \
to teach from. The student holds this page.

You are given a short brief from the tutor and a numbered list of questions \
that have already been chosen. You are NOT choosing or writing questions. Your \
job is order and grouping:

- Group the questions into 2 to 5 sections, each teaching one idea. Nine \
one-question sections is not a worksheet.
- Order the sections the way they should be taught. Questions get renumbered \
into your order afterwards, so put them in the order you want them answered.
- Write a one-line note per section saying what it trains and what to watch for.

Return JSON and nothing else:
{{"title": "<short worksheet title>",
  "subtitle": "<one line>",
  "instructions": "<2-3 sentences to the student on how to work the page>",
  "sections": [
    {{"title": "<section name>",
      "note": "<one sentence: what this section trains>",
      "watch_for": "<the error to watch for here>",
      "question_numbers": [<numbers from the list given>]}}
  ]}}

Rules:
- Use EVERY question number you were given, exactly once.
- Do not rewrite, reword or invent a question. You only arrange them.
- Write maths the way the questions do.
- Be concise. This is a worksheet, not a textbook."""


def plan_layout(exam: str, brief: str, numbered: list[Numbered],
                model: str = MODEL) -> dict:
    listing = "\n\n".join(nq.for_prompt() for nq in numbered)
    prompt = (f"{LAYOUT_BRIEF.format(exam=exam.upper())}\n\n"
              f"# TUTOR'S BRIEF\n{brief.strip() or '(none given)'}\n\n"
              f"# QUESTIONS (use every number)\n{listing}")
    out = call_json_object(prompt, model)
    return out if isinstance(out, dict) else {}


# --------------------------------------------------------------------------- #
# pass 2: the answer-key agent
# --------------------------------------------------------------------------- #
KEY_BRIEF = """You write the teacher's answer key for a printed {exam} practice \
worksheet. The tutor reads this while the student works, so it must be \
scannable and it must be right.

For each question you are given the correct answer, our own explanation, and \
the named trap each wrong choice catches. Do NOT change the answer, and do NOT \
re-derive the traps - they are already written and the key prints them from the \
data. Your job is the two things that are not in the data: a short numbered \
solution a tutor can read aloud, and one sentence that makes the idea stick.

Return JSON and nothing else:
{{"solutions": [
   {{"n": <question number>,
     "steps": ["<step 1>", "<step 2>", "..."],
     "say_this": "<one sentence the tutor says to lock in the idea>"}}
 ]}}

Rules:
- 2 to 4 steps. Each step is one move, not a paragraph.
- Include every question number you were given.
- Write maths the way the questions do.
- If our explanation is thin, work the question yourself - but never contradict
  the given correct answer. If you cannot reach it, say so in a step rather
  than changing the answer."""


def write_key(exam: str, numbered: list[Numbered],
              model: str = MODEL) -> dict[int, dict]:
    listing = "\n\n".join(nq.for_prompt() for nq in numbered)
    prompt = (f"{KEY_BRIEF.format(exam=exam.upper())}\n\n"
              f"# QUESTIONS\n{listing}")
    raw = call_json_object(prompt, model)
    out: dict[int, dict] = {}
    for sol in (raw.get("solutions") or []) if isinstance(raw, dict) else []:
        try:
            out[int(sol["n"])] = sol
        except (KeyError, TypeError, ValueError):
            continue
    return out


# --------------------------------------------------------------------------- #
# rendering
# --------------------------------------------------------------------------- #
CSS = """
:root { --ink:#101418; --slate:#39454f; --muted:#6b7885; --rule:#cfdce5;
        --accent:#1b6fa8; --key:#1f7a5c; --tint:#f4f8fa; }
* { box-sizing:border-box; }
body { margin:0; padding:34px 40px 48px; max-width:7.3in;
       font:11pt/1.5 Georgia,'Times New Roman',serif; color:var(--ink); }
h1 { font-size:22pt; margin:0 0 2px; letter-spacing:-.01em; }
.sub { color:var(--muted); margin:0 0 10px; font-size:10.5pt; }
.rule { border:0; border-top:2px solid var(--key); margin:10px 0 16px; }
.how { background:var(--tint); border:1px solid var(--rule); border-radius:6px;
       padding:10px 13px; font-size:10pt; color:var(--slate); margin:0 0 18px; }
h2 { font-size:13pt; color:var(--accent); margin:26px 0 2px;
     border-bottom:1px solid var(--rule); padding-bottom:4px; }
.note { font-size:9.5pt; color:var(--muted); margin:3px 0 14px; }
.q { margin:0 0 20px; page-break-inside:avoid; break-inside:avoid; }
.stim { margin:0 0 7px; }
.stem { margin:0 0 7px; }
.stem .n, .ans .n { font-weight:bold; }
ol.choices { list-style:none; margin:0; padding:0 0 0 18px; }
ol.choices li { margin:0 0 3px; }
ol.choices .lt { display:inline-block; min-width:1.5em; font-weight:bold; }
.work { border:1px solid var(--rule); background:var(--tint); border-radius:5px;
        height:1.1in; margin:8px 0 0; }
.gridbox { margin:8px 0 0; }
.gridbox .lbl { font-size:8pt; letter-spacing:.09em; text-transform:uppercase;
                color:var(--muted); margin:0 0 3px; }
.gridbox .box { border:1.4px solid var(--slate); border-radius:4px; height:.52in;
                width:2.3in; background:repeating-linear-gradient(90deg,
                transparent 0 .575in, var(--rule) .575in .578in); }
.m { font-family:'DejaVu Sans',Verdana,sans-serif; font-size:.95em;
     white-space:nowrap; }
.fig { margin:8px 0; max-width:4.9in; }
.fig figcaption { font-size:9pt; color:var(--slate); margin:0 0 3px;
                  font-style:italic; }
.fig svg { width:100%; height:auto; font:9px Verdana,sans-serif; fill:var(--slate); }
.fig .g { stroke:var(--rule); stroke-width:1; }
.fig .a { stroke:var(--slate); stroke-width:1.4; }
.fig .ln { fill:none; stroke:var(--accent); stroke-width:2.2; }
.fig .pt { fill:var(--accent); }
.fig .bar { fill:var(--accent); }
.glance { border-collapse:collapse; margin:0 0 6px; font-size:10pt; }
.glance td { border:1px solid var(--rule); background:var(--tint);
             padding:4px 9px; }
.lbl { font-size:8pt; letter-spacing:.09em; text-transform:uppercase;
       color:var(--muted); margin:14px 0 4px; }
.ans { border-left:3px solid var(--key); padding:2px 0 4px 12px;
       margin:0 0 16px; page-break-inside:avoid; break-inside:avoid; }
ol.steps { margin:6px 0; padding-left:20px; font-size:10pt; }
ol.steps li { margin:0 0 2px; }
.traps { list-style:none; margin:6px 0 0; padding:0; font-size:9.5pt;
         color:var(--slate); }
.traps li { margin:0 0 3px; }
.slug { font:8.5pt/1 ui-monospace,Menlo,monospace; background:var(--tint);
        border:1px solid var(--rule); border-radius:3px; padding:1px 5px;
        color:var(--accent); }
.say { font-size:9.5pt; color:var(--slate); margin:6px 0 0; }
.foot { margin-top:30px; padding-top:8px; border-top:1px solid var(--rule);
        font-size:8pt; color:var(--muted); }
@page { margin:0.7in; }
@media print { body { padding:0; max-width:none; } .work { height:1.25in; } }
"""


def _page(title: str, body: str) -> str:
    return (f"<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
            f"<title>{html.escape(title)}</title><style>{CSS}</style></head>"
            f"<body>{body}</body></html>\n")


def _stimulus(nq: Numbered) -> str:
    out = ""
    if nq.item.get("stimulus"):
        out += f'<p class="stim">{render_text(nq.item["stimulus"])}</p>'
    out += render_figure(nq.item.get("figure"))
    return out


def _question_html(nq: Numbered) -> str:
    """One question as the student sees it: no answer anywhere on the page."""
    out = [f'<div class="q">{_stimulus(nq)}',
           f'<p class="stem"><span class="n">{nq.number}.</span> '
           f'{render_text(nq.item.get("stem", ""))}</p>']
    if nq.is_grid:
        # A grid-in has no choices, so it gets somewhere to write a value.
        # Printing empty letters under one trains the wrong expectation.
        out.append('<div class="gridbox"><p class="lbl">Answer &mdash; write '
                   'one value</p><div class="box"></div></div>')
        out.append('<div class="work"></div>')
    else:
        out.append('<ol class="choices">')
        for i, choice in enumerate(nq.item.get("choices") or []):
            out.append(f'<li><span class="lt">{nq.letters[i]}.</span> '
                       f'{render_text(choice)}</li>')
        out.append("</ol>")
        out.append('<div class="work"></div>')
    out.append("</div>")
    return "".join(out)


def render_worksheet(plan: dict, numbered: list[Numbered], exam: str) -> str:
    by_number = {nq.number: nq for nq in numbered}
    title = plan.get("title") or f"{exam.upper()} Practice"
    body = [f"<h1>{render_text(title)}</h1>"]
    if plan.get("subtitle"):
        body.append(f'<p class="sub">{render_text(plan["subtitle"])}</p>')
    body.append('<hr class="rule">')
    if plan.get("instructions"):
        body.append(f'<p class="how">{render_text(plan["instructions"])}</p>')

    seen: set[int] = set()
    for section in plan.get("sections") or []:
        nums = [n for n in section.get("question_numbers") or []
                if n in by_number and n not in seen]
        if not nums:
            continue
        body.append(f'<h2>{render_text(section.get("title", ""))}</h2>')
        note = " ".join(x for x in (section.get("note"),
                                    section.get("watch_for")) if x)
        if note:
            body.append(f'<p class="note">{render_text(note)}</p>')
        for n in nums:
            seen.add(n)
            body.append(_question_html(by_number[n]))

    # A question the layout agent forgot still has to reach the student.
    leftover = [nq for nq in numbered if nq.number not in seen]
    if leftover:
        body.append("<h2>More practice</h2>")
        body += [_question_html(nq) for nq in leftover]

    body.append(f'<p class="foot">{html.escape(_credit(numbered))}</p>')
    return _page(title, "".join(body))


def render_answer_key(plan: dict, numbered: list[Numbered],
                      solutions: dict[int, dict], exam: str) -> str:
    by_number = {nq.number: nq for nq in numbered}
    title = (plan.get("title") or f"{exam.upper()} Practice") + " — Answer Key"
    body = [f"<h1>{render_text(title)}</h1>",
            '<p class="sub">Teacher copy. Do not hand this to the student.</p>',
            '<hr class="rule">', '<p class="lbl">Answers at a glance</p>',
            "<table class=\"glance\">"]
    per_row = 8
    for start in range(0, len(numbered), per_row):
        row = numbered[start:start + per_row]
        cells = "".join(
            f"<td><strong>{nq.number}.</strong> "
            f"{html.escape(nq.answer_text if nq.is_grid else nq.answer_letter)}</td>"
            for nq in row)
        cells += "<td></td>" * (per_row - len(row))
        body.append(f"<tr>{cells}</tr>")
    body.append("</table>")

    seen: set[int] = set()
    sections = list(plan.get("sections") or [])
    sections.append({"title": "More practice",
                     "question_numbers": [nq.number for nq in numbered]})
    for section in sections:
        nums = [n for n in section.get("question_numbers") or []
                if n in by_number and n not in seen]
        if not nums:
            continue
        body.append(f'<h2>{render_text(section.get("title", ""))}</h2>')
        for n in nums:
            seen.add(n)
            body.append(_answer_html(by_number[n], solutions.get(n, {})))

    body.append(f'<p class="foot">{html.escape(_credit(numbered))}</p>')
    return _page(title, "".join(body))


def _answer_html(nq: Numbered, sol: dict) -> str:
    label = nq.answer_text if nq.is_grid else f"{nq.answer_letter}."
    head = (f'<p class="ans-head"><span class="n">{nq.number}. Answer: '
            f'{render_text(label)}</span>')
    if not nq.is_grid:
        head += f" {render_text(nq.answer_text)}"
    out = [f'<div class="ans">{head}</p>']
    if nq.is_grid and len(nq.item.get("keys") or []) > 1:
        accepted = ", ".join(str(k) for k in nq.item["keys"])
        out.append(f'<p class="say">Also accept: {render_text(accepted)}</p>')

    steps = [clean_step(s) for s in (sol.get("steps") or []) if str(s).strip()]
    if steps:
        out.append("<ol class=\"steps\">"
                   + "".join(f"<li>{render_text(s)}</li>" for s in steps)
                   + "</ol>")
    else:
        # No generated solution: our own explanation is the fallback, and it is
        # the thing the generated steps were a summary of anyway.
        explanation = nq.item.get("explanation") or strip_tags(
            (nq.item.get("per_choice") or {}).get("correct"))
        if explanation:
            out.append(f'<p class="say">{render_text(explanation)}</p>')

    traps = nq.distractors()
    if traps:
        out.append('<p class="lbl">What each wrong answer catches</p>'
                   '<ul class="traps">')
        per_choice = nq.item.get("per_choice") or {}
        for label, text, slug, why in traps:
            # The bank letters the per-choice prose, not the printed letters,
            # so look it up by where the choice sits rather than by what the
            # worksheet calls it - on an ACT even-numbered question those differ.
            why = why or strip_tags(per_choice.get(BANK_LETTERS[nq.letters.index(label)]
                                                   if label in nq.letters else "", ""))
            shown = f"{html.escape(label)}." + (f" {render_text(text)}" if text else "")
            tag = f'<span class="slug">{html.escape(slug)}</span> ' if slug else ""
            out.append(f"<li><strong>{shown}</strong> {tag}{render_text(why)}</li>")
        out.append("</ul>")

    if sol.get("say_this"):
        out.append(f'<p class="say"><strong>Say:</strong> '
                   f'“{render_text(sol["say_this"])}”</p>')
    out.append("</div>")
    return "".join(out)


def _credit(numbered: list[Numbered]) -> str:
    """Say whose questions these are, on the paper itself.

    LICENSING.md: original items must be labelled as ours and never presented
    as the test maker's. A printed page outlives the app it came from.
    """
    licenses = {nq.item.get("license") or nq.item.get("source", "")
                for nq in numbered}
    return ("Original practice items written for this project. "
            "Not College Board or ACT content. " + " ".join(sorted(filter(None, licenses))))


# --------------------------------------------------------------------------- #
# orchestration
# --------------------------------------------------------------------------- #
def build_packet(exam: str, question_ids: Iterable[str], brief: str = "",
                 model: str = MODEL, use_model: bool = True) -> dict[str, Any]:
    """Build one worksheet and its key for ONE exam.

    Order of operations is the whole point. The layout agent groups questions
    using provisional numbers; only then are final numbers assigned, in
    teaching order, so the printed page reads 1, 2, 3 straight down. The key
    agent is given those final numbers, so the two documents cannot disagree.

    A model failure degrades rather than aborts: the packet still prints, in
    the order the caller asked for, with our own explanations in the key. A
    tutor who wanted paper for a lesson in ten minutes is better served by a
    plainer worksheet than by a 503.
    """
    if exam not in ("sat", "act"):
        raise WorksheetError(f"exam must be 'sat' or 'act', not {exam!r}")
    items = select(exam, question_ids)

    provisional = number_items(items, exam)
    by_provisional = {nq.number: nq.item for nq in provisional}
    plan: dict[str, Any] = {}
    notes: list[str] = []

    if use_model:
        try:
            plan = plan_layout(exam, brief, provisional, model)
        except Exception as exc:                            # noqa: BLE001
            notes.append(f"layout pass unavailable: {str(exc)[:160]}")

    ordered: list[dict] = []
    spans: list[dict] = []
    placed: set[int] = set()
    for section in plan.get("sections") or []:
        nums = [n for n in section.get("question_numbers") or []
                if n in by_provisional and n not in placed]
        if not nums:
            continue
        start = len(ordered) + 1
        for n in nums:
            placed.add(n)
            ordered.append(by_provisional[n])
        spans.append({**section,
                      "question_numbers": list(range(start, len(ordered) + 1))})
    unplaced = [nq.number for nq in provisional if nq.number not in placed]
    leftover_numbers = list(range(len(ordered) + 1, len(ordered) + 1 + len(unplaced)))
    ordered += [by_provisional[n] for n in unplaced]

    numbered = number_items(ordered, exam)
    plan = {"title": plan.get("title") or f"{exam.upper()} practice",
            "subtitle": plan.get("subtitle") or brief.strip()[:120],
            "instructions": plan.get("instructions"),
            "sections": spans}

    solutions: dict[int, dict] = {}
    if use_model:
        try:
            solutions = write_key(exam, numbered, model)
        except Exception as exc:                            # noqa: BLE001
            notes.append(f"answer-key pass unavailable: {str(exc)[:160]}")

    return {
        "exam": exam,
        "title": plan["title"],
        "worksheet_html": render_worksheet(plan, numbered, exam),
        "answer_key_html": render_answer_key(plan, numbered, solutions, exam),
        "question_count": len(numbered),
        "sections": len(spans),
        "question_ids": [nq.item["id"] for nq in numbered],
        "unsectioned_questions": leftover_numbers,
        "questions_without_written_solution": [
            nq.number for nq in numbered if nq.number not in solutions],
        "notes": notes,
    }
