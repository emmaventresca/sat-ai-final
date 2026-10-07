#!/usr/bin/env python3
"""The wording family a question belongs to, which is a dimension of its own.

Taken from the ACT project, which tracks it and which the SAT side had no
equivalent of. The observation behind it is worth repeating: a student stuck
at a score often loses a whole WORDING FAMILY rather than a whole topic. They
can solve for x all day and still lose every "which of the following must be
true", because that stem asks them to test claims rather than to solve - and
a topic-only breakdown hides it completely, since the misses are scattered
across six different topics.

Derived by pattern rather than by a model. These are stem frames, not
meaning: "EXCEPT" in a stem means one thing and only one thing, and a model
call per item would cost real money to tell us what a regex already knows.
Anything that matches nothing is `direct`, which is the honest default - most
questions just ask you the thing.

    python3 tools/derive_phrasing.py            # report
    python3 tools/derive_phrasing.py --write    # stamp it into the bank
"""
import argparse, json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ordered: the first match wins, and the order encodes which distinction
# matters more when a stem could be read two ways. A negated stem is a
# negated stem before it is anything else - that is the whole trap.
#
# Matched on the STEM ALONE. A passage containing the word "not" says nothing
# about how the question is asked, and including the stimulus put 451 ordinary
# transition questions into the negated family - the passage prose was doing
# the matching.
#
# NOT and EXCEPT are case SENSITIVE, because the exam capitalises them when it
# means them. Lowercase "not" is just English.
FAMILIES = [
    ("not_except", re.compile(r"\bEXCEPT\b|\bNOT\b|\bLEAST\b")),
    ("must_be_true", re.compile(
        r"must be true|which (?:of the following )?(?:statements?|conclusions?)"
        r"|can be concluded|is necessarily", re.I)),
    ("work_backwards", re.compile(
        r"for what value|for which (?:of the following )?values?"
        r"|which value of|what is one possible value", re.I)),
    ("which_expression", re.compile(
        r"which (?:of the following )?(?:expression|equation|function|"
        r"inequality|system|graph)|is equivalent to|represents the", re.I)),
    ("in_context", re.compile(
        r"in (?:this|the) context|best (?:interpretation|describes the meaning)"
        r"|most nearly mean|what does .{0,30} represent", re.I)),
    ("compare", re.compile(
        r"how many more|how much (?:greater|less)|compared (?:to|with)"
        r"|difference between .{0,40} and|than the", re.I)),
]


def phrasing_of(stem, _stimulus=""):
    for name, pattern in FAMILIES:
        if pattern.search(stem or ""):
            return name
    return "direct"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true",
                    help="stamp `phrasing` onto data/bank/ so it survives a rebuild")
    args = ap.parse_args()

    path = os.path.join(ROOT, "data", "practice.json")
    items = json.load(open(path))["items"]
    counts = Counter()
    examples = {}
    for it in items:
        fam = phrasing_of(it.get("stem", ""), it.get("stimulus") or "")
        counts[fam] += 1
        examples.setdefault(fam, it.get("stem", "")[:78])

    total = sum(counts.values())
    print(f"{total} SAT questions by wording family:")
    for fam, n in counts.most_common():
        print(f"  {n:5} ({n / total:5.1%})  {fam:16} e.g. {examples[fam]}")

    if not args.write:
        print("\n--write stamps it onto data/bank/")
        return 0

    import glob
    stamped = 0
    for bank in glob.glob(os.path.join(ROOT, "data", "bank", "*.json")):
        rows = json.load(open(bank))
        for it in rows:
            it["phrasing"] = phrasing_of(it.get("stem", ""), it.get("stimulus") or "")
            stamped += 1
        json.dump(rows, open(bank, "w"), indent=1)
    print(f"\nstamped {stamped} items in data/bank/ "
          f"(run build_bank_index.py to publish)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
