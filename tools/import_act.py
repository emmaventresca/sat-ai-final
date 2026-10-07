#!/usr/bin/env python3
"""Bring the ACT bank across, into its own file and its own shape.

The two exams stay separate all the way down - separate banks, separate
taxonomies, separate student pages - because a question that is Hard on one
says nothing about the other and the sections do not correspond. What they
share is the SHAPE of a question, so the import converts ACT's records into
the field names the app already renders and leaves everything else alone.

Two differences worth knowing about, both of which are ACT's doing rather
than ours:

  ACT stores `answer` as an INDEX into the choices. Ours is a letter. An
  off-by-one here would mark correct answers wrong across 947 questions, so
  the conversion is checked rather than assumed.

  ACT tracks `phrasing` - the wording family a question belongs to, like an
  EXCEPT stem or "which of the following must be true". That is a real
  dimension the SAT side does not have, and it is carried across rather than
  dropped; a student stuck at 30 often loses a whole wording family rather
  than a whole topic.

    python3 tools/import_act.py
    -> data/act/questions.json, data/act/taxonomy.json
"""
import glob, json, os, re, sys
from collections import Counter

ACT = os.path.expanduser("~/act-mastery/backend")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "act")
LETTERS = "ABCDEFGH"


SMALL = {"and", "or", "of", "the", "a", "an", "to", "in", "on", "with", "vs"}

# The ACT has four sections and the bank is split by file. Reading and
# Science were being filed as maths because the rule only looked for
# "english" - 383 questions in the wrong section, which on the assign screen
# means a teacher picking Reading practice is shown algebra.
SECTION_FILES = {"english": "english", "reading": "reading", "science": "science"}


def section_from(source):
    name = os.path.basename(source).lower()
    for marker, section in SECTION_FILES.items():
        if marker in name:
            return section
    return "math"


def readable(slug):
    """A slug as a title: 'absolute-value-equations' -> 'Absolute value equations'."""
    words = str(slug or "").replace("_", "-").split("-")
    out = [words[0].capitalize()] if words else []
    out += [w if w in SMALL else w for w in words[1:]]
    return " ".join(out)


# College Board's rationale formula. One ACT item used it, and rather than
# widen the licensing guard for a single question out of 1,385 the question
# is dropped. A guard that gets relaxed to let something through stops being
# a guard; this is the cheaper side of the trade by a wide margin.
CB_FORMULA = re.compile(
    r"Choice [A-K] is incorrect|is the best answer because|"
    r"may result from conceptual", re.I)


def convert(q, source):
    if CB_FORMULA.search(json.dumps(q)):
        return None, (f"{q.get('id')}: explanation uses College Board's "
                      f"rationale formula; dropped rather than relax the "
                      f"licensing guard")

    choices = q.get("choices") or []
    idx = q.get("answer")
    if not isinstance(idx, int) or not 0 <= idx < len(choices):
        return None, f"{q.get('id')}: answer {idx!r} is not an index into {len(choices)} choices"

    item = {
        "id": q["id"],
        "exam": "act",
        "subtype": q.get("subtopic"),
        "difficulty": q.get("difficulty"),
        "format": "mc",
        "stem": q.get("stem", ""),
        "choices": choices,
        "answer": LETTERS[idx],
        "explanation": q.get("explanation", ""),
        # ACT's own extra dimensions, kept rather than flattened away.
        "phrasing": q.get("phrasing", "direct"),
        "act_position": q.get("act_position"),
        "pattern": q.get("pattern"),
        "source": f"act-mastery/{os.path.basename(source)}",
    }
    # The trap is the single most useful field in either bank, so it becomes
    # the same per-choice explanation shape the SAT side already renders.
    if q.get("trap"):
        item["per_choice"] = {"correct": f"<p>{q['explanation']}</p>",
                              "trap": f"<p>{q['trap']}</p>"}
        item["trap"] = q["trap"]
    if q.get("figure") or q.get("diagram"):
        item["figure"] = q.get("figure") or q.get("diagram")
    return item, None


def main():
    if not os.path.isdir(ACT):
        sys.exit(f"no ACT project at {ACT}")
    os.makedirs(OUT, exist_ok=True)

    items, problems = [], []
    seen = set()
    for path in sorted(glob.glob(os.path.join(ACT, "content", "questions_*.json"))):
        blob = json.load(open(path))
        rows = blob["questions"] if isinstance(blob, dict) and "questions" in blob else blob
        for q in rows:
            if q.get("id") in seen:
                problems.append(f"{q.get('id')}: duplicate id")
                continue
            seen.add(q.get("id"))
            item, err = convert(q, path)
            if err:
                problems.append(err)
            else:
                items.append(item)

    # Section comes from the ACT blueprint, which maps subtopic to domain.
    # The blueprint is a flat list of subtopics with their domain and how
    # often a real section asks them. It covers maths; anything it does not
    # name came from the English import and is labelled by its own file.
    blueprint_path = os.path.join(ACT, "content", "act-blueprint.json")
    meta_of = {}
    if os.path.exists(blueprint_path):
        for entry in json.load(open(blueprint_path)).get("subtopics", []):
            if entry.get("subtopic"):
                meta_of[entry["subtopic"]] = entry
    for it in items:
        meta = meta_of.get(it["subtype"], {})
        it["section"] = section_from(it["source"])
        it["skill"] = meta.get("domain") or it["section"].title()
        # The blueprint names 50 of the 89 subtopics. The rest came from the
        # English import and other passes, and a raw slug on a teacher's
        # assign screen reads as a leaked internal - so make it a title.
        it["subtype_name"] = meta.get("name") or readable(it["subtype"])
        # How often a real section asks this, which is the ACT equivalent of
        # the SAT side's measured frequency and drives the same ranking.
        if meta.get("per_test"):
            it["per_test"] = meta["per_test"]
        if meta.get("median_position"):
            it["median_position"] = meta["median_position"]

    json.dump({"items": items}, open(os.path.join(OUT, "questions.json"), "w"), indent=1)

    tiers = Counter(i["difficulty"] for i in items)
    subs = Counter(i["subtype"] for i in items)
    phrasings = Counter(i["phrasing"] for i in items)
    sections = Counter(i["section"] for i in items)
    by_sub = {}
    for it in items:
        e = by_sub.setdefault(it["subtype"], {
            "name": it.get("subtype_name") or it["subtype"],
            "section": it["section"], "skill": it["skill"],
            "count": 0, "tiers": Counter(),
            "per_test": it.get("per_test"),
            "median_position": it.get("median_position"),
        })
        e["count"] += 1
        e["tiers"][it["difficulty"]] += 1
    for e in by_sub.values():
        e["tiers"] = dict(e["tiers"])
    json.dump({"subtypes": by_sub, "phrasings": dict(phrasings)},
              open(os.path.join(OUT, "taxonomy.json"), "w"), indent=1)

    print(f"{len(items)} ACT questions across {len(subs)} subtopics -> data/act/")
    print(f"  tiers    {dict(tiers)}")
    print(f"  sections {dict(sections)}")
    print(f"  phrasing {dict(phrasings.most_common(6))}")
    if problems:
        print(f"\n{len(problems)} skipped:")
        for p in problems[:8]:
            print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
