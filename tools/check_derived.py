#!/usr/bin/env python3
"""
Assert that the derived taxonomies quote nothing from the corpus.

data/subtypes.json and data/passage_patterns.json are the project's central
claim: that studying College Board's questions yields an abstraction which is
ours, not a repackaging of theirs. The prompts forbid quoting, but "the prompt
said not to" is not evidence. This measures it.

Every field of every subtype and pattern is checked for an 8-word sequence
shared with the 3,770-question export. Standard mathematical terms of art
("the slope of the line of best fit") are expected and allowed - they name
objects, and there is no other way to name them.

  python3 tools/check_derived.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT = os.path.join(ROOT, "corpus", "export")

# Mathematical and grammatical terms of art. Naming an object is not
# expression, and these have no alternative phrasing.
TERMS_OF_ART = [
    "the slope of the line of best fit",
    "the line of best fit",
    "perpendicular to the radius at the point",
    "the x coordinate of the vertex",
    "two independent clauses",
]


def shingles(t, n=8):
    w = re.findall(r"[a-z']+", (t or "").lower())
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def allowed():
    out = set()
    for t in TERMS_OF_ART:
        out |= shingles(t)
        w = re.findall(r"[a-z']+", t.lower())
        for n in range(4, 9):
            out |= {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}
    return out


def main():
    if not os.path.isdir(EXPORT):
        print("no local export to compare against - skipping")
        return
    corpus = set()
    for name in ("rw", "math"):
        p = os.path.join(EXPORT, f"{name}.jsonl")
        if not os.path.exists(p):
            continue
        for line in open(p):
            corpus |= shingles(json.loads(line)["text"])
    ok = allowed()

    checks = [
        ("data/subtypes.json", "skills", "subtypes",
         ("name", "tell", "method", "desmos", "trap")),
        ("data/passage_patterns.json", "skills", "patterns",
         ("name", "what", "exploit", "example")),
    ]
    problems = []
    n_items = 0
    for rel, top, listkey, fields in checks:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        for skill, v in json.load(open(path))[top].items():
            for entry in v[listkey]:
                n_items += 1
                for f in fields:
                    hit = (shingles(entry.get(f)) & corpus) - ok
                    if hit:
                        problems.append(f"{rel} {skill}/{entry.get('slug')}/{f}: "
                                        f"{sorted(hit)[0]!r}")

    print(f"checked {n_items} derived entries against "
          f"{len(corpus):,} corpus sequences")
    if problems:
        for p in problems:
            print(f"  OVERLAP  {p}")
        sys.exit(f"\n{len(problems)} derived entries quote the corpus")
    print("no derived text quotes the corpus "
          "(mathematical terms of art excepted)")


if __name__ == "__main__":
    main()
