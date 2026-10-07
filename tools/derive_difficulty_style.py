#!/usr/bin/env python3
"""What actually makes an official question Easy, Medium or Hard.

"Make it feel like a real one" is the hardest instruction to give a writer,
because the thing being asked for is a register rather than a rule. So
measure it. Every feature below is counted off the 3,308-item College Board
corpus we are licensed to analyse, per section and per tier, and the result
is a spec the authoring prompt can be held to.

Nothing here reads a third-party book. Prep publishers write imitations of
the exam, and two of the ones on this machine imitate the retired paper
format; shaping our register from those would move it away from official,
not toward it. The corpus is the authority.

Nothing here quotes the corpus either. What comes out is counts and ratios -
facts about the questions, which 17 U.S.C. 102(b) puts outside copyright -
checked by tools/check_derived.py like the rest of the derived taxonomy.

    python3 tools/derive_difficulty_style.py
    -> data/difficulty_style.json
"""
import glob, json, os, re, statistics, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from sanitize import sanitize, to_text                   # noqa: E402

CORPUS = os.path.join(ROOT, "corpus", "bank")
TIERS = ("E", "M", "H")

WORD = re.compile(r"[A-Za-z][A-Za-z'-]*")
NUMBER = re.compile(r"-?\d[\d,]*\.?\d*")
# Clause boundaries are a decent proxy for how many conditions a student has
# to hold at once, which is most of what separates Medium from Hard.
CLAUSE = re.compile(r"\b(if|when|where|given that|such that|and|but|however|"
                    r"although|while|unless|after|before|since)\b", re.I)
# Things that make a maths question multi-step without making it longer.
CONSTRAINT = re.compile(r"\b(for all|at least|at most|no more than|exactly|"
                        r"must|cannot|only if|in terms of|positive|negative|"
                        r"integer|constant|distinct)\b", re.I)


def load():
    skills = {s["skill_cd"]: s for s in
              json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}
    out = []
    for path in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(path).startswith("_"):
            continue
        try:
            d = json.load(open(path))
        except Exception:
            continue
        meta = d.get("_meta") or {}
        tier, cd = meta.get("difficulty"), meta.get("skill_cd")
        if tier not in TIERS or cd not in skills:
            continue
        opts = d.get("answerOptions") or []
        out.append({
            "tier": tier,
            "section": skills[cd]["section"],
            "stem": to_text(sanitize(d.get("stem"))) or "",
            "stim": to_text(sanitize(d.get("stimulus"))) or "",
            "choices": [to_text(sanitize(o.get("content") if isinstance(o, dict) else o)) or ""
                        for o in opts],
            "grid": not opts,
            "rationale": str(d.get("rationale") or ""),
            # The sanitiser turns LaTeX into glyphs and loses words like
            # "constant" that live inside it, which is where a maths
            # question's extra conditions usually sit.
            "raw": f"{d.get('stem') or ''} {d.get('stimulus') or ''}",
        })
    return out


def features(item):
    stem, stim = item["stem"], item["stim"]
    both = f"{stim} {stem}"
    words = WORD.findall(both)
    choices = item["choices"]
    lens = [len(WORD.findall(c)) for c in choices] or [0]
    # How far the rationale has to go is the most direct measure of steps we
    # have. It is measured, never reproduced - length only.
    rat_sentences = len(re.findall(r"[.!?]\s", item["rationale"])) + 1
    return {
        "stem_words": len(WORD.findall(stem)),
        "stimulus_words": len(WORD.findall(stim)),
        "total_words": len(words),
        "numbers": len(NUMBER.findall(both)),
        "clauses": len(CLAUSE.findall(both)),
        "constraints": len(CONSTRAINT.findall(both)) + len(CONSTRAINT.findall(item["raw"])),
        "choice_words_mean": statistics.mean(lens),
        "choice_words_spread": (max(lens) - min(lens)) if len(lens) > 1 else 0,
        "rationale_sentences": rat_sentences,
        "has_figure": 1 if "[figure]" in stim.lower() or "[table]" in stim.lower() else 0,
        "grid_in": 1 if item["grid"] else 0,
    }


# Yes/no features. A median of a 0/1 column tells you nothing useful - 27%
# of maths questions are grid-ins and the median still reads 0 - so these are
# reported as the share instead.
BINARY = {"has_figure", "grid_in"}


def summarise(rows):
    out = {}
    for key in rows[0]:
        vals = sorted(r[key] for r in rows)
        if key in BINARY:
            out[key] = {"share": round(statistics.mean(vals), 3)}
            continue
        out[key] = {
            "median": round(statistics.median(vals), 2),
            "mean": round(statistics.mean(vals), 2),
            "p25": round(vals[len(vals) // 4], 2),
            "p75": round(vals[3 * len(vals) // 4], 2),
        }
    return out


def main():
    items = load()
    if not items:
        sys.exit("no local corpus - nothing to measure")

    buckets = defaultdict(list)
    for it in items:
        buckets[(it["section"], it["tier"])].append(features(it))

    stats = {}
    for (section, tier), rows in sorted(buckets.items()):
        stats.setdefault(section, {})[tier] = {
            "items": len(rows), **summarise(rows),
        }

    # The part an author can act on: how each tier differs from the one below.
    deltas = {}
    for section, tiers in stats.items():
        d = {}
        for lo, hi in (("E", "M"), ("M", "H")):
            if lo not in tiers or hi not in tiers:
                continue
            d[f"{lo}->{hi}"] = {
                k: round(tiers[hi][k].get("median", tiers[hi][k].get("share", 0))
                         - tiers[lo][k].get("median", tiers[lo][k].get("share", 0)), 3)
                for k in tiers[hi] if k != "items"
            }
        deltas[section] = d

    blob = {
        "measured_from": f"{len(items)} College Board items",
        "note": ("Counts and ratios only. No corpus text is stored here, and "
                 "nothing in this file is quoted from it - see "
                 "tools/check_derived.py."),
        "sections": stats,
        "steps_up": deltas,
    }
    out = os.path.join(ROOT, "data", "difficulty_style.json")
    json.dump(blob, open(out, "w"), indent=1)

    print(f"measured {len(items)} College Board items")
    for section, tiers in stats.items():
        print(f"\n{section}:")
        for tier in TIERS:
            if tier not in tiers:
                continue
            t = tiers[tier]
            print(f"  {tier}  n={t['items']:4}  "
                  f"stem {t['stem_words']['median']:5.1f}w  "
                  f"passage {t['stimulus_words']['median']:6.1f}w  "
                  f"clauses {t['clauses']['mean']:4.1f}  "
                  f"constraints {t['constraints']['mean']:4.1f}  "
                  f"steps {t['rationale_sentences']['mean']:5.1f}  "
                  f"grid {t['grid_in']['share']:.0%}  "
                  f"figure {t['has_figure']['share']:.0%}")
    print(f"\n-> {os.path.relpath(out, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
