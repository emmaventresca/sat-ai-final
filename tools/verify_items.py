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

sys.path.insert(0, HERE)
from sanitize import sanitize, to_text                  # noqa: E402

_lock = threading.Lock()
LETTERS = "ABCD"
TAG = re.compile(r"<[^>]+>")

# Math stems are templates: "the best interpretation of $m$ in this context"
# and "...of $b$ in this context" are the same sentence with a different
# variable spliced in. Comparing them raw makes each look rare, so a stem that
# is plainly formulaic never clears a reuse threshold. Normalising the variable
# and number slots first lets the template be counted as the one thing it is.
VAR = re.compile(r"\$[^$]*\$|\\\(.*?\\\)")
NUM = re.compile(r"\b\d[\d,.]*\b")



# A sequence of nothing but number placeholders is data, not expression. Two
# tables of unrelated figures can collide on one, and a match there says
# nothing about copying.
NUMERIC_ONLY = re.compile(r"^(?:__num__\s*)+$")


def _subgrams(phrase, k=5):
    w = phrase.split()
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}


def exempt_fragments(allowlist, k=5):
    """Every k-word fragment appearing inside an allowlisted phrase.

    The allowlist stores 8-word windows, but an authored item lands its
    variables at different offsets than the corpus did, so the same standard
    phrasing produces a *shifted* window that never matches exactly - "the
    function f is defined by f(x)" against "f the function f is defined by".
    Comparing constituent fragments makes the test window-independent: an
    8-gram is exempt when every 5-word run inside it also appears inside some
    allowlisted phrase, which means the whole span is made of boilerplate.
    """
    out = set()
    for p in allowlist:
        out |= _subgrams(p, k)
    return out


def is_boilerplate(shingle, fragments, k=5):
    subs = _subgrams(shingle, k)
    return bool(subs) and subs <= fragments

def normalize(text):
    """Lowercase, with variable and number slots collapsed to sentinels.

    The sentinels are lowercase and underscore-delimited so that the word regex
    can match them without needing a capital-letter class - an earlier version
    used bare VAR/NUM and a `[a-z']+` regex, which silently dropped the first
    letter of every capitalised word ("Which" -> "hich") and corrupted every
    comparison in both directions."""
    t = TAG.sub(" ", text or "")
    t = VAR.sub(" __var__ ", t)
    t = NUM.sub(" __num__ ", t)
    return t.lower()



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

def _one(it, n=None):
    body = []
    if n is not None:
        body.append(f'<question id="{it["id"]}">')
    if it.get("stimulus"):
        body.append(it["stimulus"])
    body.append(it["stem"])
    for i, c in enumerate(it["choices"]):
        body.append(f"{LETTERS[i]}) {c}")
    if n is not None:
        body.append("</question>")
    return "\n".join(body)


def blind_batch_prompt(items):
    """Blind-solve several items in one call.

    Each is answered on its own terms - the model never sees our intended
    answer, the explanations or the distractor tags, which is what makes this
    an independent check. Batching costs one call per N items instead of one
    per item, and the check is unchanged.
    """
    return f"""Answer each SAT-style multiple-choice question below.

You are being used as a check on question quality, so be exacting. Judge each
question independently; do not let one influence another.

{chr(10).join(_one(it, i) for i, it in enumerate(items))}

For EACH question respond with one object, in the same order, as a JSON array:
[{{"id": "<the question's id>",
   "answer": "A"|"B"|"C"|"D",
   "confident": true|false,
   "ambiguous": true|false,
   "second_defensible": "<letter or null>",
   "problem": "<null, or one sentence on what is wrong with this question>"}}]

On "ambiguous": set it true only if a careful, well-prepared student could
reasonably choose a different answer and be right. A choice you can construct
an argument for, but which is clearly worse once the deciding detail is
noticed, is NOT ambiguous - that is what a good distractor is supposed to do.
Name it in second_defensible and leave ambiguous false.

Respond with ONLY the JSON array."""


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


def call_list(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=900,
        env={**os.environ, "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:200])
    i = proc.stdout.find("[")
    if i == -1:
        raise ValueError("no JSON array")
    return json.JSONDecoder().raw_decode(proc.stdout[i:])[0]


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

def standard_stem_shingles(n=8):
    """Phrases exempt from the overlap check: sequences College Board reuses
    across at least ten different item stems, which is what makes them
    formulaic instruction language rather than authorship. Built by
    tools/build_stem_allowlist.py; rationale in data/standard_stems.json."""
    p = os.path.join(ROOT, "data", "standard_stems.json")
    if not os.path.exists(p):
        return set()
    return {e["text"] for e in json.load(open(p))["phrases"]}


def corpus_shingles(n=8):
    """Every n-word sequence in the cached College Board corpus."""
    out = set()
    for p in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(p).startswith("_"):
            continue
        try:
            d = json.load(open(p))
        except Exception:
            continue
        for field in ("stem", "stimulus"):
            # Sanitize first, exactly as tools/build_stem_allowlist.py does.
            # Indexing the raw field matched the figure's SVG text and table
            # markup, which the allowlist builder never sees and therefore can
            # never exempt - so those matches could only ever fail, no matter
            # how standard the phrasing was.
            w = re.findall(r"[a-z']+|__var__|__num__",
                           normalize(to_text(sanitize(d.get(field)))))
            for i in range(len(w) - n + 1):
                out.add(" ".join(w[i:i + n]))
    return out


def overlap(it, shingles, n=8, fragments=frozenset()):
    w = re.findall(r"[a-z']+|__var__|__num__",
                   normalize((it.get("stimulus") or "") + " " + it["stem"]))
    hits = []
    for i in range(len(w) - n + 1):
        sh = " ".join(w[i:i + n])
        if (sh in shingles and not NUMERIC_ONLY.match(sh)
                and not is_boilerplate(sh, fragments)):
            hits.append(sh)
    return hits


# ---------------------------------------------------------------------------

def verify_batch(items, families, shingles, model, fragments=frozenset()):
    """Structure and originality are local and free; only the solve costs a call."""
    reports = {it["id"]: {"id": it["id"],
                          "structure": check_structure(it, families)}
               for it in items}
    try:
        solved = {r.get("id"): r for r in call_list(blind_batch_prompt(items), model)}
    except Exception as exc:
        for r in reports.values():
            r["solve_error"] = str(exc)[:120]
        solved = {}

    for it in items:
        rep = reports[it["id"]]
        r = solved.get(it["id"])
        if r is None:
            rep.setdefault("solve_error", "no result for this id in the batch")
        else:
            rep["solver_answer"] = r.get("answer")
            rep["agrees"] = r.get("answer") == it["answer"]
            rep["confident"] = bool(r.get("confident"))
            rep["ambiguous"] = bool(r.get("ambiguous"))
            rep["second_defensible"] = r.get("second_defensible")
            rep["problem"] = r.get("problem")
        if shingles is not None:
            rep["overlap"] = overlap(it, shingles, fragments=fragments)
    return list(reports.values())


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
    # Haiku by default, on measurement rather than on price. Re-verifying 60
    # items with both: the blind-solve answer agreed 98% of the time, the gate
    # verdict agreed 98%, and - the direction that matters - Haiku never passed
    # an item the stronger model failed. Its one disagreement was stricter.
    # Verification is the bulk of this pipeline's calls, so this is where cost
    # actually lives.
    ap.add_argument("--model", default="claude-haiku-4-5")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--skip-originality", action="store_true")
    ap.add_argument("--batch", type=int, default=10,
                    help="items per blind-solve call (1 = one call per item)")
    args = ap.parse_args()

    families = {f["slug"] for f in
                json.load(open(os.path.join(ROOT, "data", "misconceptions.json")))["families"]}

    shingles = None
    fragments = frozenset()
    if not args.skip_originality:
        if os.path.isdir(CORPUS):
            print("indexing the College Board corpus for overlap checking...", flush=True)
            shingles = corpus_shingles()
            exempt = standard_stem_shingles()
            shingles -= exempt
            fragments = exempt_fragments(exempt)
            print(f"  {len(shingles):,} 8-word sequences indexed "
                  f"({len(exempt):,} excluded as standard instruction lines)\n",
                  flush=True)
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
        groups = [todo[i:i + args.batch] for i in range(0, len(todo), args.batch)]
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            reports = [r for g in pool.map(
                lambda grp: verify_batch(grp, families, shingles, args.model, fragments),
                groups) for r in g]

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
