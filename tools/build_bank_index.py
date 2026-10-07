#!/usr/bin/env python3
"""
Collect the verified original items into the single file the app loads.

Only items with status "verified" are included - the ones that passed all four
gates. Everything else stays in data/bank/ for inspection and never reaches a
student.

The output, data/practice.json, is OUR content under CC BY and is committed.
That is the whole point of the exercise: unlike data/items.json, which is
College Board's and git-ignored, this can be published and served.
"""
import glob, json, os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANK = os.path.join(ROOT, "data", "bank")

# "figure" matters: an item that names a graph and ships without one is
# unanswerable, and dropping the field here is a silent way to do that.
KEEP = ("id", "type", "skill_cd", "subtype", "subtype_name", "difficulty",
        "stimulus", "stem", "choices", "answer", "explanation", "distractors",
        "figure", "authored_difficulty", "source", "license",
        # Student-produced response: no choices, a list of acceptable answers,
        # and the wrong values a student actually types.
        "format", "keys", "any_of", "common_errors",
        # The wording family, from tools/derive_phrasing.py. A dimension of
        # its own: a student can lose every "must be true" question across
        # six different topics, and a topic-only breakdown hides it.
        "phrasing")


def main():
    # Which section a skill belongs to. Without it every SAT item looked like
    # maths to the new front end, because the bank never carried the field -
    # the old app got it by joining to skills.json at runtime, and the join
    # does not survive being handed to a different app.
    section_of = {s["skill_cd"]: s["section"] for s in
                  json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}

    items, skipped = [], Counter()
    for path in sorted(glob.glob(os.path.join(BANK, "*.json"))):
        for it in json.load(open(path)):
            if it.get("status") != "verified":
                skipped[it.get("status", "unknown")] += 1
                continue
            rec = {k: it.get(k) for k in KEEP if it.get(k) is not None}
            rec["type"] = "item"
            rec["section"] = section_of.get(rec.get("skill_cd"), "math")
            rec["format"] = rec.get("format") or ("grid" if rec.get("keys") else "mc")
            rec["band_floor"], rec["band_ceiling"] = 200, 1600
            # Per-choice explanations, in the shape the app already renders.
            rec["per_choice"] = {"correct": f"<p>{it.get('explanation','')}</p>"}
            rec["misconceptions"] = {}
            if rec["format"] == "grid":
                # Keyed by the value a student types rather than by a letter,
                # so a wrong entry still gets its diagnosis.
                for e in it.get("common_errors") or []:
                    value = str(e.get("value", "")).strip()
                    if not value:
                        continue
                    rec["per_choice"][value] = f"<p>{e.get('why','')}</p>"
                    if e.get("misconception"):
                        rec["misconceptions"][value] = e["misconception"]
            else:
                for letter, v in (it.get("distractors") or {}).items():
                    # Authors sometimes emit a null entry for the CORRECT
                    # letter, which is harmless - it has its own explanation -
                    # but iterating it blindly crashed the whole build on one
                    # malformed item out of three thousand.
                    if letter == rec.get("answer") or not isinstance(v, dict):
                        continue
                    rec["per_choice"][letter] = f"<p>{v.get('why','')}</p>"
                    if v.get("misconception"):
                        rec["misconceptions"][letter] = v["misconception"]
            items.append(rec)

    out = os.path.join(ROOT, "data", "practice.json")
    json.dump({"items": items,
               "license": "CC BY 4.0",
               "note": "Original items written for this project. Not College "
                       "Board content."},
              open(out, "w"), indent=1)

    by_sub = Counter(i.get("subtype") for i in items)
    by_tier = Counter(i["difficulty"] for i in items)
    print(f"{len(items)} verified items across {len(by_sub)} subtypes "
          f"-> data/practice.json")
    print("  " + "  ".join(f"{t} {by_tier[t]}" for t in ("F", "E", "M", "H", "X")))
    if skipped:
        print(f"  held back: {dict(skipped)}")


if __name__ == "__main__":
    main()
