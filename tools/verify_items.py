#!/usr/bin/env python3
"""
Verify authored items before any student sees them.

Generated questions are worthless unless something checks them, so four gates
run on every item and anything that fails is quarantined rather than shipped:

  1. STRUCTURE. Four distinct choices, a real answer letter, every distractor
     tagged with a family that exists, and the correct answer not identifiable
     by being the longest option - the oldest tell in multiple choice.

  2. BLIND SOLVE. A second model sees only the passage, the stem and the
     choices. No answer, no explanations, no distractor tags. If it disagrees
     with the intended answer, the item is wrong or ambiguous - either way it
     does not ship. This is the gate that actually catches bad questions.

  3. DEFENSIBILITY. The same pass reports whether a second choice could be
     argued for. A question with two defensible answers is a broken question.

  4. ORIGINALITY. Every item is checked for verbatim overlap against the local
     College Board corpus. Nothing should match - the generator never sees CB
     text - but "should not" is not "does not", and on a project whose whole
     claim is that the content is ours, that deserves a measurement rather
     than an assumption.

  python3 tools/verify_items.py                 # verify everything unverified
  python3 tools/verify_items.py --file TRA-M.json
"""
import argparse, glob, json, os, re, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "data", "bank")
CORPUS = os.path.join(ROOT, "corpus", "bank")

_lock = threading.Lock()
LETTERS = "ABCD"


# ---------------------------------------------------------------------------
# 1. Structure
# ---------------------------------------------------------------------------

def check_structure(it, families):
    problems = []
    ch = it.get("choices") or []
    if len(ch) != 4:
        problems.append(f"{len(ch)} choices, expected 4")
    if len({c.strip().lower() for c in ch}) != len(ch):
        problems.append("duplicate choices")
    if it.get("answer") not in LETTERS:
        problems.append(f"bad answer {it.get('answer')!r}")
    if not (it.get("stem") or "").strip():
        problems.append("empty stem")
    if not (it.get("explanation") or "").strip():
        problems.append("no explanation for the correct answer")

    d = it.get("distractors") or {}
    wrong = [L for L in LETTERS[:len(ch)] if L != it.get("answer")]
    for L in wrong:
        entry = d.get(L)
        if not entry:
            problems.append(f"distractor {L} has no entry")
        elif entry.get("misconception") not in families:
            problems.append(f"distractor {L}: unknown family "
                            f"{entry.get('misconception')!r}")
        elif not (entry.get("why") or "").strip():
            problems.append(f"distractor {L}: no explanation")

    # The longest-option tell: a correct answer noticeably longer than every
    # distractor is answerable without reading the question.
    if len(ch) == 4 and it.get("answer") in LETTERS:
        correct = ch[LETTERS.index(it["answer"])]
        others = [c for i, c in enumerate(ch) if i != LETTERS.index(it["answer"])]
        if others and len(correct) > 1.6 * max(len(c) for c in others):
            problems.append("correct answer is far longer than every distractor")
    return problems


# ---------------------------------------------------------------------------
# 2 & 3. Blind solve
# ---------------------------------------------------------------------------

def blind_prompt(it):
    body = []
    if it.get("stimulus"):
        body.append(it["stimulus"])
    body.append(it["stem"])
    for i, c in enumerate(it["choices"]):
        body.append(f"{LETTERS[i]}) {c}")
    return f"""Answer this SAT-style multiple-choice question.

You are being used as a check on question quality, so be exacting.

{chr(10).join(body)}

Respond with ONLY JSON:
{{"answer": "A"|"B"|"C"|"D",
  "confident": true|false,
  "ambiguous": true|false,
  "second_defensible": "<letter or null>",
  "problem": "<null, or one sentence on what is wrong with this question>"}}

On "ambiguous": set it true only if a careful, well-prepared student could
reasonably choose a different answer and be right. A choice you can construct
an argument for, but which is clearly worse once the deciding detail is
noticed, is NOT ambiguous - that is what a good distractor is supposed to do.
Name it in second_defensible and leave ambiguous false."""


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=600,
        env={**os.environ, "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:200])
    i = proc.stdout.find("{")
    if i == -1:
        raise ValueError("no JSON")
    parsed, _ = json.JSONDecoder().raw_decode(proc.stdout[i:])
    return parsed


# ---------------------------------------------------------------------------
# 4. Originality
# ---------------------------------------------------------------------------

def corpus_shingles(n=8):
    """Every n-word sequence in the cached College Board corpus."""
    out = set()
    tag = re.compile(r"<[^>]+>")
    for p in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(p).startswith("_"):
            continue
        try:
            d = json.load(open(p))
        except Exception:
            continue
        for field in ("stem", "stimulus"):
            t = tag.sub(" ", d.get(field) or "")
            w = re.findall(r"[a-z']+", t.lower())
            for i in range(len(w) - n + 1):
                out.add(" ".join(w[i:i + n]))
    return out


def overlap(it, shingles, n=8):
    w = re.findall(r"[a-z']+",
                   ((it.get("stimulus") or "") + " " + it["stem"]).lower())
    hits = [" ".join(w[i:i + n]) for i in range(len(w) - n + 1)
            if " ".join(w[i:i + n]) in shingles]
    return hits


# ---------------------------------------------------------------------------

def verify_one(it, families, shingles, model):
    report = {"id": it["id"], "structure": check_structure(it, families)}
    try:
        r = call(blind_prompt(it), model)
    except Exception as exc:
        report["solve_error"] = str(exc)[:120]
        return report
    report["solver_answer"] = r.get("answer")
    report["agrees"] = r.get("answer") == it["answer"]
    report["confident"] = bool(r.get("confident"))
    report["second_defensible"] = r.get("second_defensible")
    report["ambiguous"] = bool(r.get("ambiguous"))
    report["problem"] = r.get("problem")
    if shingles is not None:
        report["overlap"] = overlap(it, shingles)
    return report


def verdict(rep):
    if rep.get("solve_error"):
        return "error"
    if rep["structure"]:
        return "fail"
    if not rep.get("agrees"):
        return "fail"
    if rep.get("overlap"):
        return "fail"
    # A merely *nameable* second choice is not a defect - that is a distractor
    # doing its job. Genuine ambiguity, or a solver that is not confident, is.
    if rep.get("ambiguous"):
        return "review"
    if not rep.get("confident"):
        return "review"
    return "pass"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file")
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--skip-originality", action="store_true")
    args = ap.parse_args()

    families = {f["slug"] for f in
                json.load(open(os.path.join(ROOT, "data", "misconceptions.json")))["families"]}

    shingles = None
    if not args.skip_originality:
        if os.path.isdir(CORPUS):
            print("indexing the College Board corpus for overlap checking...", flush=True)
            shingles = corpus_shingles()
            print(f"  {len(shingles):,} 8-word sequences indexed\n", flush=True)
        else:
            print("no local corpus - skipping the originality check\n")

    files = ([os.path.join(BANK, args.file)] if args.file
             else sorted(glob.glob(os.path.join(BANK, "*.json"))))
    totals = {"pass": 0, "review": 0, "fail": 0, "error": 0}

    for path in files:
        items = json.load(open(path))
        todo = [it for it in items if it.get("status") != "verified"]
        if not todo:
            continue
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            reports = list(pool.map(
                lambda it: verify_one(it, families, shingles, args.model), todo))

        by_id = {r["id"]: r for r in reports}
        for it in items:
            r = by_id.get(it["id"])
            if not r:
                continue
            v = verdict(r)
            totals[v] += 1
            it["status"] = "verified" if v == "pass" else v
            it["verification"] = r
        json.dump(items, open(path, "w"), indent=1)

        name = os.path.basename(path)
        counts = {k: sum(1 for r in reports if verdict(r) == k) for k in totals}
        print(f"{name:22} pass {counts['pass']:3}  review {counts['review']:3}  "
              f"fail {counts['fail']:3}  error {counts['error']:3}")
        for r in reports:
            v = verdict(r)
            if v in ("fail", "review"):
                why = (r["structure"] or
                       ([f"solver said {r.get('solver_answer')}"] if not r.get("agrees") else []) or
                       (["verbatim overlap with CB corpus"] if r.get("overlap") else []) or
                       (["genuinely ambiguous: " + str(r.get("second_defensible"))]
                        if r.get("ambiguous") else []) or
                       ["solver not confident"])
                print(f"   {v:6} {r['id']}: {why[0]}")

    print(f"\ntotal: {totals['pass']} pass, {totals['review']} review, "
          f"{totals['fail']} fail, {totals['error']} error")
    print("Only 'verified' items are served to students.")


if __name__ == "__main__":
    main()
