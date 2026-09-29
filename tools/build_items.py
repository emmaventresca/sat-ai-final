#!/usr/bin/env python3
"""
Build data/items.json - the practice pool the app serves.

**The output is deliberately not committed.** It is College Board's item text,
cached locally for use with your own students, which is what the educator bank
is for. Redistributing it through a public repo is not. See docs/DESIGN.md
section 2; data/items.json is in .gitignore for this reason.

Everything the app needs and nothing it does not: stem, stimulus, four options,
the answer letter, the rationale, and the skill and difficulty tags that let the
engine rank it.
"""
import glob, html, json, os, re, sys
from collections import Counter

from rationales import annotate
from sanitize import sanitize, to_text, has_figure, has_table

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "corpus", "bank")

# Spoken-maths phrasing that only appears when a MathML block failed to convert.
ALTTEXT_LEAK = re.compile(
    r"left parenthesis|right parenthesis|StartFraction|Superscript|Baseline|"
    r"StartRoot|EndRoot", re.I)

def build_one(path):
    try:
        d = json.load(open(path))
    except Exception:
        return None
    meta = d.get("_meta") or {}
    skill = meta.get("skill_cd")
    tier = (meta.get("difficulty") or "").upper()
    if not skill or tier not in ("E", "M", "H"):
        return None

    # Grid-ins have no options to render, so they are excluded from the
    # multiple-choice practice flow rather than shown half-broken.
    if d.get("type") != "mcq":
        return None

    options = d.get("answerOptions") or []
    if len(options) != 4:
        return None
    choices = [sanitize(o.get("content")) for o in options]
    if not all(to_text(c) for c in choices):
        return None

    answer = (d.get("correct_answer") or [None])[0]
    if answer not in ("A", "B", "C", "D"):
        return None

    stem = sanitize(d.get("stem"))
    stimulus = sanitize(d.get("stimulus"))
    if not to_text(stem):
        return None

    # A handful of items carry MathML we cannot convert, and fall back to its
    # spoken alttext - "f left parenthesis 400 right parenthesis". That is worse
    # than one fewer question, so drop them rather than show them.
    if ALTTEXT_LEAK.search(to_text(stem) + " ".join(to_text(c) for c in choices)):
        return None

    record = {
        "id": d.get("externalid") or os.path.basename(path)[:-5],
        "type": "item",
        "skill_cd": skill,
        "difficulty": tier,
        "score_band": meta.get("score_band_range_cd"),
        "band_floor": 200, "band_ceiling": 1600,
        "stimulus": stimulus or None,
        "stem": stem,
        "choices": choices,
        "answer": answer,
        "rationale": sanitize(d.get("rationale")) or None,
        # Flags the app uses to lay the item out: a question built around a
        # figure or a table needs more width than a one-line equation.
        "figure": has_figure(stimulus) or has_figure(stem),
        "table": has_table(stimulus) or has_table(stem),
        "source": "College Board SAT educator question bank",
        "license": "College Board copyright - cached for use with own students",
    }
    # Split the rationale per answer choice, so a student who picks B is shown
    # why B is wrong rather than four paragraphs to search through.
    annotate(record)
    return record


def main():
    paths = [p for p in glob.glob(os.path.join(BANK, "*", "*.json"))
             if not os.path.basename(p).startswith("_")]
    if not paths:
        sys.exit("no bank items found - run tools/fetch_bank.py first")

    items, skipped = [], Counter()
    for p in paths:
        it = build_one(p)
        if it:
            items.append(it)
        else:
            skipped[os.path.basename(os.path.dirname(p))] += 1

    items.sort(key=lambda i: (i["skill_cd"], i["difficulty"], i["id"]))
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "items.json"), "w") as fh:
        json.dump({"items": items,
                   "note": "College Board content. Not for redistribution."}, fh)

    split = sum(1 for i in items if i.get("per_choice"))
    tagged = sum(1 for i in items if i.get("misconceptions"))
    figures = sum(1 for i in items if i["figure"])
    tables = sum(1 for i in items if i["table"])
    by_skill = Counter(i["skill_cd"] for i in items)
    by_tier = Counter(i["difficulty"] for i in items)
    print(f"{'skill':8} {'E':>5} {'M':>5} {'H':>5} {'total':>6}")
    for skill in sorted(by_skill):
        c = Counter(i["difficulty"] for i in items if i["skill_cd"] == skill)
        print(f"{skill:8} {c['E']:5} {c['M']:5} {c['H']:5} {by_skill[skill]:6}")
    print(f"\n{len(items)} items  (E {by_tier['E']} / M {by_tier['M']} / H {by_tier['H']})")
    print(f"{figures} with a figure, {tables} with a data table")
    print(f"{split} split into per-choice explanations ({split / len(items):.0%})")
    print(f"{tagged} carry a misconception tag College Board's wording actually "
          f"supports ({tagged / len(items):.0%}); the rest are left unlabelled")
    if skipped:
        print("skipped (grid-ins and malformed):",
              ", ".join(f"{k} {v}" for k, v in sorted(skipped.items())))
    print("wrote data/items.json  -- not committed, see docs/DESIGN.md section 2")


if __name__ == "__main__":
    main()
