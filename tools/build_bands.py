#!/usr/bin/env python3
"""
Build the band model: target score -> how many questions you actually need ->
how much of each difficulty tier you must win.

This is DESIGN.md section 4a, and it is what stops the system over-teaching.
The logic is deliberately simple enough to explain to a student:

    You need N questions right. Buy them from the cheapest shelf first.
    Take every Easy item, then as much Medium as you still need, and only
    then start paying for Hard.

band_weight(d) is then just "what fraction of tier d do you have to win",
which falls straight out of that fill. A 1000->1300 student gets
band_weight(H) near zero, so Hard circle questions never enter their queue
even though they would certainly miss them.

Inputs:  corpus/tests/manifest.json   (raw -> scaled conversion, 7 official tests)
         corpus/bank/*/_listing.json  (real E/M/H mix per section)
Output:  data/bands.json
"""
import json, os, statistics
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "corpus", "bank")
TESTS = os.path.join(ROOT, "corpus", "tests")

# Bluebook's adaptive form, which is what students actually sit.
SECTION_QUESTIONS = {"rw": 54, "math": 44}
RW_DOMAINS, MATH_DOMAINS = ["INI", "CAS", "EOI", "SEC"], ["H", "P", "Q", "S"]
TIERS = ["E", "M", "H"]


def conversion_tables():
    """Average the seven official raw -> scaled tables into one curve per section.

    The published tables are for the 66/54-question linear form, while students
    sit the 54/44-question adaptive form, so we work in *proportion of section
    correct* rather than raw count and re-project onto the adaptive length."""
    manifest = json.load(open(os.path.join(TESTS, "manifest.json")))
    curves = {"rw": {}, "math": {}}
    for entry in manifest.values():
        conv = entry.get("conversion") or {}
        for section in curves:
            table = conv.get(section) or {}
            if not table:
                continue
            top = max(int(r) for r in table)
            for raw_s, (lo, hi) in table.items():
                frac = int(raw_s) / top
                curves[section].setdefault(round(frac, 3), []).append((lo + hi) / 2)
    return {s: {f: statistics.mean(v) for f, v in sorted(c.items())}
            for s, c in curves.items()}


def fraction_needed(curve, target):
    """Smallest fraction-correct whose mean scaled score reaches the target."""
    for frac in sorted(curve):
        if curve[frac] >= target:
            return frac
    return 1.0


def difficulty_mix():
    """Real E/M/H proportions per section, from the question bank listings."""
    mix, complete = {}, True
    for section, domains in (("rw", RW_DOMAINS), ("math", MATH_DOMAINS)):
        counts = Counter()
        for d in domains:
            path = os.path.join(BANK, d, "_listing.json")
            if not os.path.exists(path):
                complete = False
                continue
            for item in json.load(open(path)):
                tier = (item.get("difficulty") or "").upper()
                if tier in TIERS:
                    counts[tier] += 1
        total = sum(counts.values())
        mix[section] = ({t: counts[t] / total for t in TIERS} if total else
                        {"E": 0.25, "M": 0.50, "H": 0.25})
        mix[section]["_items"] = total
    return mix, complete


# Four-choice questions yield ~25% by guessing. Math student-produced responses
# (grid-ins) yield ~0, and they are 14 of the 54 math questions on the linear
# form, so math's effective guessing rate is lower.
GUESS_RATE = {"rw": 0.25, "math": 0.1875}


def band_weights(frac_needed, mix, n_questions, guess):
    """How much of each tier the student must actually *study*.

    The subtlety is that unstudied questions are not worth zero - a guessed
    four-choice question pays 25%. If you study s questions and guess the rest:

        correct = N*guess + (1 - guess) * s

    so the studied total needed is (need - N*guess) / (1 - guess). Fill that
    from the cheapest tier upward.

    This is what reproduces the advice in the Mills deck rather than merely
    approximating it. At a 600 math target the Easy and Medium tiers alone
    exceed the studied requirement, so the Hard tier comes out at zero - which
    is the deck's "deliberately guess-and-move on Hard", derived instead of
    asserted."""
    need = frac_needed * n_questions
    studied = max(0.0, (need - n_questions * guess) / (1 - guess))

    weights, detail = {}, {}
    for tier in TIERS:
        available = mix[tier] * n_questions
        take = max(0.0, min(available, studied))
        weights[tier] = round(take / available, 4) if available else 0.0
        detail[tier] = round(take, 1)
        studied -= take
    return weights, detail, round(studied, 1)


def main():
    curves = conversion_tables()
    mix, complete = difficulty_mix()
    if not complete:
        print("! question bank still downloading - difficulty mix is partial", flush=True)

    out = {"sections": {}, "generated_from": "7 official practice tests + question bank"}
    for section, n in SECTION_QUESTIONS.items():
        curve, rows = curves[section], []
        for target in range(300, 801, 10):
            frac = fraction_needed(curve, target)
            w, detail, short = band_weights(frac, mix[section], n, GUESS_RATE[section])
            rows.append({"target": target,
                         "questions_needed": round(frac * n, 1),
                         "accuracy_needed": round(frac, 3),
                         "guess_rate": GUESS_RATE[section],
                         "must_win": detail,
                         "band_weight": w,
                         "unreachable_by": short})
        out["sections"][section] = {"questions": n,
                                    "difficulty_mix": mix[section],
                                    "targets": rows}

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "bands.json"), "w") as fh:
        json.dump(out, fh, indent=1)

    for section in SECTION_QUESTIONS:
        m = mix[section]
        print(f"\n{section.upper()}  mix E/M/H = "
              f"{m['E']:.2f}/{m['M']:.2f}/{m['H']:.2f}  ({m['_items']} bank items)")
        print(f"  {'target':>6} {'need':>5} {'acc':>5}   band_weight E / M / H")
        for row in out["sections"][section]["targets"]:
            if row["target"] % 50:
                continue
            w = row["band_weight"]
            print(f"  {row['target']:>6} {row['questions_needed']:>5} "
                  f"{row['accuracy_needed']:>5.0%}   "
                  f"{w['E']:>4.0%} / {w['M']:>4.0%} / {w['H']:>4.0%}")
    print("\nwrote data/bands.json")


if __name__ == "__main__":
    main()
