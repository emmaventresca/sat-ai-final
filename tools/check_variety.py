#!/usr/bin/env python3
"""
Not how MANY questions, but how many KINDS.

Coverage counts answered the wrong question. A recognition can hold forty
questions and still only ever ask one way - and a student who has met it
forty times phrased directly has not met the way the test actually asks it.
Two dimensions the bank was blind to:

  WORDING   "which must be true", "which expression", "NOT ... EXCEPT",
            "in context", "compare". A student loses a whole family across
            six different topics, and a topic-only report hides it. The bank
            carried eight EXCEPT questions in total.

  FORMAT    grid-ins are 27% of the real SAT maths section. A student who
            only ever sees multiple choice has an eliminating strategy that
            works on three quarters of the paper and nothing for the rest.

  python3 tools/check_variety.py          # the gaps
  python3 tools/check_variety.py --plan   # what to author
"""
import argparse, collections, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# What the real paper is made of. Grid-ins are measured; the wording shares
# are a floor rather than a target - the point is that a family EXISTS in a
# recognition, not that it hits a quota.
GRID_SHARE = 0.27

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from author_variety import value_answers        # noqa: E402
WANT_PER_FAMILY = 3

# Which wording families make sense where. Asking for "which expression" on
# a punctuation question would produce nonsense.
MATH_FAMILIES = ["which_expression", "must_be_true", "work_backwards",
                 "in_context", "compare"]
VERBAL_FAMILIES = ["must_be_true", "not_except", "compare"]


def load():
    path = os.path.join(ROOT, "data", "practice.json")
    return json.load(open(path))["items"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", action="store_true")
    args = ap.parse_args()

    items = load()
    by_sub = collections.defaultdict(list)
    for it in items:
        if it.get("subtype"):
            by_sub[it["subtype"]].append(it)

    names = {}
    for it in items:
        names.setdefault(it.get("subtype"), it.get("subtype_name") or it.get("subtype"))

    jobs = []
    no_grid = 0
    blocked_q = 0
    one_family = 0

    for slug, qs in sorted(by_sub.items()):
        section = qs[0].get("section", "math")
        is_math = section == "math"
        fams = collections.Counter(q.get("phrasing") or "direct" for q in qs)
        fmts = collections.Counter(q.get("format") or "mc" for q in qs)

        # Same guard the authoring uses, so the report counts the gap we can
        # actually close. A recognition whose answers are claims - "which
        # conclusion the survey supports" - sits in the maths section and can
        # never have a grid-in, so counting it as a hole reports work that
        # cannot be done.
        gridable = is_math and value_answers(qs)
        if gridable:
            want_grid = max(3, round(len(qs) * GRID_SHARE))
            short = want_grid - fmts.get("grid", 0)
            if fmts.get("grid", 0) == 0:
                no_grid += 1
            if short > 0:
                jobs.append((slug, names[slug], section, "grid", None, min(short, 8)))
        elif is_math:
            blocked_q += len(qs)

        wanted = MATH_FAMILIES if is_math else VERBAL_FAMILIES
        if len(fams) == 1:
            one_family += 1
        for fam in wanted:
            short = WANT_PER_FAMILY - fams.get(fam, 0)
            if short > 0:
                jobs.append((slug, names[slug], section, "mc", fam, short))

    print(f"{len(by_sub)} recognitions")
    print(f"  {one_family} ask only ONE way")
    print(f"  {no_grid} maths recognitions have no grid-in at all")

    total_fmt = collections.Counter(i.get("format") or "mc" for i in items
                                    if i.get("section") == "math")
    maths_q = max(1, sum(total_fmt.values()))
    share = total_fmt.get("grid", 0) / maths_q
    # The real paper's 27% is not reachable bank-wide, and saying so is more
    # useful than printing a target we will never hit. A tenth of our maths
    # sits in recognitions that cannot take a grid-in at all, so the most
    # that 27%-of-every-eligible-recognition can come to is the ceiling here.
    ceiling = (maths_q - blocked_q) * GRID_SHARE / maths_q
    print(f"  grid-ins are {share:.1%} of our maths, against {GRID_SHARE:.0%} "
          f"on the real paper")
    print(f"    {blocked_q} maths questions ({blocked_q / maths_q:.1%}) are in "
          f"recognitions whose answers are claims, not values,")
    print(f"    so the reachable ceiling is {ceiling:.1%}, not {GRID_SHARE:.0%}")

    fam_total = collections.Counter(i.get("phrasing") or "direct" for i in items)
    print("\n  wording across the whole bank:")
    for k, v in fam_total.most_common():
        print(f"    {k:18s} {v:5d}  {v / len(items):5.1%}")

    need = sum(j[5] for j in jobs)
    print(f"\n{len(jobs)} cells to fill, {need} questions, for variety "
          f"(not for count)")

    if args.plan:
        for slug, name, section, fmt, fam, n in sorted(jobs, key=lambda j: -j[5])[:60]:
            what = "grid-in" if fmt == "grid" else fam
            print(f"  +{n:2d}  {what:18s} {name[:50]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
