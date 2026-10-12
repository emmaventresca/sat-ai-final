#!/usr/bin/env python3
"""
Does every recognition have enough questions at every level?

The target is ten each at Easy, Medium, Hard and Challenge for every subtype -
the smallest grouping a student ever practises from. Ten is the floor where a
round stops repeating itself and a streak means something; below it a student
who comes back twice has already seen everything.

Foundations is reported but not required: it is our own rung below the exam's
easiest, and some recognitions genuinely do not have a simpler version.

  python3 tools/check_coverage.py            # the summary
  python3 tools/check_coverage.py --gaps     # every cell that is short
  python3 tools/check_coverage.py --plan     # what to author, worst first
"""
import argparse, json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WANT = 10
REQUIRED = ["E", "M", "H", "X"]
ALL_TIERS = ["F", "E", "M", "H", "X"]


def bank(exam):
    """Every question, from the split bank the app actually serves."""
    out = []
    d = os.path.join(ROOT, "apps", "web", "public", "data", exam, "q")
    if not os.path.isdir(d):
        return out
    for name in sorted(os.listdir(d)):
        if not name.endswith(".json"):
            continue
        try:
            data = json.load(open(os.path.join(d, name)))
        except Exception:
            continue
        out += data if isinstance(data, list) else data.get("items", [])
    return out


def counts(exam):
    cells = collections.defaultdict(collections.Counter)
    names = {}
    for it in bank(exam):
        sub = it.get("subtype")
        if not sub:
            continue
        cells[sub][it.get("difficulty")] += 1
        names.setdefault(sub, it.get("subtypeName") or sub)
    return cells, names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gaps", action="store_true")
    ap.add_argument("--plan", action="store_true")
    ap.add_argument("--exam", choices=("sat", "act"))
    args = ap.parse_args()

    exams = [args.exam] if args.exam else ["sat", "act"]
    grand = 0
    for exam in exams:
        cells, names = counts(exam)
        if not cells:
            print(f"{exam}: no split bank found")
            continue

        short = []
        for sub, c in cells.items():
            missing = {t: WANT - c.get(t, 0) for t in REQUIRED if c.get(t, 0) < WANT}
            if missing:
                short.append((sub, names[sub], missing, sum(missing.values())))
        short.sort(key=lambda s: -s[3])

        need = sum(s[3] for s in short)
        grand += need
        full = len(cells) - len(short)
        print(f"\n{exam.upper()}  {len(cells)} recognitions, "
              f"{full} complete, {len(short)} short")
        print(f"      {need} questions to author for {WANT} at E/M/H/X everywhere")

        by_tier = collections.Counter()
        for _, _, missing, _ in short:
            for t, n in missing.items():
                by_tier[t] += n
        print("      by level: " + "  ".join(
            f"{t} {by_tier[t]}" for t in REQUIRED if by_tier[t]))

        if args.gaps or args.plan:
            rows = short if args.plan else short[:40]
            for sub, name, missing, total in rows:
                have = " ".join(f"{t}{cells[sub].get(t, 0)}" for t in ALL_TIERS)
                gap = " ".join(f"{t}+{n}" for t, n in sorted(missing.items()))
                print(f"  {total:3d}  {name[:46]:46s} [{have}]  need {gap}")
            if not args.plan and len(short) > 40:
                print(f"       ... and {len(short) - 40} more (--plan for all)")

    if len(exams) > 1:
        print(f"\nTotal to author: {grand}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
