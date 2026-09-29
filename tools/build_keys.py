#!/usr/bin/env python3
"""
Reconcile the two independent answer sources into one trusted key per test.

Neither source is usable alone:

  * The answer *explanations* PDF states answers in prose and is authoritative
    for multiple choice, but grid-in values lose their glyphs in extraction -
    a fraction bar vanishes ("1/5" -> "1 5") and a minus sign migrates
    ("-5" -> "5-").
  * The *scoring guide* renders grid-ins correctly ("1/5; .2") but extracts two
    pages of identical shape carrying different letters, so on its own there is
    no way to tell which page is the real key.

Together they settle each other: the explanations pick which scoring page is
real (it is the one whose multiple-choice letters agree), and that page then
supplies the grid-in strings. Disagreement after that is reported, not hidden.
The output deliberately holds no rationale text. Which letter is correct is a
fact about the test; College Board's explanation of *why* is their expression,
and it stays in corpus/ (git-ignored) rather than in a tracked file. See
docs/LICENSING.md.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TESTS = os.path.join(ROOT, "corpus", "tests")
sys.path.insert(0, HERE)
from fetch_tests import _answer_pairs                      # noqa: E402

MODULES = ["rw-1", "rw-2", "math-1", "math-2"]


def scoring_candidates(pdf_path):
    """Every page of the scoring guide that looks like a four-module answer key."""
    from pypdf import PdfReader
    out = []
    for page in PdfReader(pdf_path).pages:
        pairs = _answer_pairs(page.extract_text() or "")
        if not pairs:
            continue
        groups, current, last = [], [], 0
        for num, ans in pairs:
            if num <= last and current:
                groups.append(current); current = []
            current.append({"q": num, "answer": ans}); last = num
        if current:
            groups.append(current)
        groups = [g for g in groups
                  if len(g) >= 20 and [c["q"] for c in g] == list(range(1, len(g) + 1))]
        if len(groups) == 4 and sum(len(g) for g in groups) == len(pairs):
            out.append(dict(zip(MODULES, groups)))
    return out


def build(n):
    expl = json.load(open(os.path.join(TESTS, f"test{n}-explanations.json")))
    truth = {(e["module"], e["q"]): e for e in expl}

    mcq = {k: v["answer"] for k, v in truth.items() if v["kind"] == "mcq"}
    best, best_agree = None, -1
    for cand in scoring_candidates(os.path.join(TESTS, f"test{n}-scoring.pdf")):
        flat = {(m, c["q"]): c["answer"] for m in MODULES for c in cand[m]}
        agree = sum(1 for k, a in mcq.items() if flat.get(k) == a)
        if agree > best_agree:
            best, best_agree = flat, agree

    mcq_rate = best_agree / len(mcq) if mcq else 0.0

    key = []
    for m in MODULES:
        for q in sorted(x[1] for x in truth if x[0] == m):
            e = truth[(m, q)]
            answer = e["answer"]
            source = "explanations"
            if e["kind"] == "gridin" and best and (m, q) in best:
                answer = best[(m, q)]           # scoring guide renders these correctly
                source = "scoring-guide"
            key.append({"module": m, "q": q, "answer": answer, "kind": e["kind"],
                        "source": source})
    return key, mcq_rate


def main():
    path = os.path.join(TESTS, "manifest.json")
    manifest = json.load(open(path))
    allgood = True
    for n in sorted(manifest, key=int):
        key, rate = build(n)
        grid = sum(1 for k in key if k["kind"] == "gridin")
        fixed = sum(1 for k in key if k["source"] == "scoring-guide")
        ok = rate == 1.0 and len(key) == 120 and fixed == grid
        allgood &= ok
        with open(os.path.join(TESTS, f"test{n}-key.json"), "w") as fh:
            json.dump(key, fh, indent=1)
        manifest[n]["key"] = f"test{n}-key.json"
        manifest[n]["key_mcq_agreement"] = round(rate, 4)
        print(f"test {n}: {len(key)} items, MCQ cross-check {rate:.0%}, "
              f"{fixed}/{grid} grid-ins from scoring guide  {'OK' if ok else 'CHECK'}",
              flush=True)
    # Drop the unreconciled key; test{n}-key.json supersedes it.
    for v in manifest.values():
        v.pop("answer_key", None)
    json.dump(manifest, open(path, "w"), indent=1)
    print("\nall tests reconciled" if allgood else "\nsome tests need review")


if __name__ == "__main__":
    main()
