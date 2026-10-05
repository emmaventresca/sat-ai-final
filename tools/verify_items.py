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
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "data", "bank")
CORPUS = os.path.join(ROOT, "corpus", "bank")

sys.path.insert(0, HERE)
from sanitize import sanitize, to_text                  # noqa: E402
from agentlog import run                                # noqa: E402

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

DISPLAY = r"(table|graph|chart|figure|bar graph|scatterplot|histogram|diagram)"
NAMES_DISPLAY = re.compile(
    rf"(data (from|in) the {DISPLAY}"
    rf"|the {DISPLAY} (shows|shown|above|below|displays|presents|gives)"
    rf"|(shown|given|represented) in the {DISPLAY}"
    rf"|according to the {DISPLAY}"
    rf"|based on the {DISPLAY})", re.I)
# Prose standing in for a picture instead of being one.
NARRATES_DISPLAY = re.compile(
    r"\b(gridlines?|the \d+(st|nd|rd|th) (horizontal|vertical) line)\b", re.I)
DRAWABLE = {"bar", "line", "scatter", "curve"}


def has_display(it):
    stim = it.get("stimulus") or ""
    if "<table" in stim:
        return True
    run = 0
    for line in stim.split("\n"):          # a table is two adjacent pipe rows
        run = run + 1 if "|" in line else 0
        if run >= 2:
            return True
    fig = it.get("figure")
    return isinstance(fig, dict) and fig.get("type") in DRAWABLE


def figure_problems(it):
    text = f"{it.get('stimulus') or ''}\n{it.get('stem') or ''}"
    out = []
    if NAMES_DISPLAY.search(text) and not has_display(it):
        out.append("names a table or graph but shows none")
    if NARRATES_DISPLAY.search(text):
        out.append("describes the picture in prose instead of drawing it")
    return out


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

    # A question that names a display has to show one. The blind solver does
    # not catch this: it reads the same prose the author wrote, so a picture
    # described in words ("the bar reaches the 4th gridline") solves fine and
    # is unanswerable only for the student who is shown a chart instead.
    problems += figure_problems(it)
    return problems


# ---------------------------------------------------------------------------
# 2 & 3. Blind solve
# ---------------------------------------------------------------------------

def figure_text(it):
    """The figure as the solver would read it off the page.

    A chart item without this is unanswerable, and a solver that cannot
    answer it looks exactly like an item with no defensible answer - the
    verification would reject good items for a reason that is ours.
    """
    fig = it.get("figure")
    if not isinstance(fig, dict):
        return None
    head = f"[{fig.get('type')} chart] {fig.get('caption') or ''}".strip()
    axes = " / ".join(x for x in (fig.get("x_label"), fig.get("y_label")) if x)
    if fig.get("type") == "bar":
        rows = ", ".join(f"{c}: {v}" for c, v in
                         zip(fig.get("categories") or [], fig.get("values") or []))
    else:
        pts = fig.get("points") or []
        rows = ", ".join(f"({a}, {b})" for a, b in pts[:60])
    return "\n".join(x for x in (head, axes, rows) if x)


def _one(it, n=None):
    body = []
    if n is not None:
        body.append(f'<question id="{it["id"]}">')
    if it.get("stimulus"):
        body.append(it["stimulus"])
    fig = figure_text(it)
    if fig:
        body.append(fig)
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
    fig = figure_text(it)
    if fig:
        body.append(fig)
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
        # stderr is sometimes empty on a failed call, and an empty message
        # then reads as falsy everywhere downstream - which is how 219 items
        # were recorded as quality failures when they had simply never been
        # solved. Always carry something truthy.
        raise RuntimeError(proc.stderr.strip()[:200]
                           or f"claude CLI exited {proc.returncode} with no message")
    i = proc.stdout.find("[")
    if i == -1:
        raise ValueError(f"no JSON array in output (got {len(proc.stdout)} chars)")
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


SENTINEL = re.compile(r"^__(var|num)__$")

# How much ORIGINAL expression a matching window actually shares, in
# consecutive words. Calibrated against the corpus itself: scoring 400 real
# College Board items against the rest of the corpus, 60% share nothing,
# 91% stay at or below 4, and the 99th percentile is 12. Whatever a genuine
# item scores against its own bank cannot be evidence of copying, so the gate
# is set just past where genuine items stop.
#
# This replaced a plain "any 8-gram match fails" rule, which failed 127 items
# that turned out to share no original expression at all. Two things inflated
# the old count: normalisation collapses every variable and number to a
# sentinel, so "triangle __var__ where __var__ __var__ and __var__ correspond"
# counted as a match on four English words; and a window straddling the
# boundary between an allowlisted phrase and our own content was never exempt
# even when the matching half was entirely boilerplate. Measuring the residue
# addresses both without widening the allowlist, which is the thing that fails
# open and silently.
RESIDUE_FAIL = 12
RESIDUE_REVIEW = 8


def overlap(it, shingles, n=8, fragments=frozenset()):
    """Every matching window, for the record - the gate reads `residue`."""
    w = re.findall(r"[a-z']+|__var__|__num__",
                   normalize((it.get("stimulus") or "") + " " + it["stem"]))
    hits = []
    for i in range(len(w) - n + 1):
        sh = " ".join(w[i:i + n])
        if (sh in shingles and not NUMERIC_ONLY.match(sh)
                and not is_boilerplate(sh, fragments)):
            hits.append(sh)
    return hits


def residue(it, shingles, n=8, fragments=frozenset(), k=5):
    """The longest run of matched words that is neither boilerplate nor a
    sentinel - the original expression the two items genuinely share."""
    w = re.findall(r"[a-z']+|__var__|__num__",
                   normalize((it.get("stimulus") or "") + " " + it["stem"]))
    if len(w) < n:
        return 0
    matched = [False] * len(w)
    for i in range(len(w) - n + 1):
        sh = " ".join(w[i:i + n])
        if sh in shingles and not NUMERIC_ONLY.match(sh):
            matched[i:i + n] = [True] * n
    boiler = [False] * len(w)
    for i in range(len(w) - k + 1):
        if " ".join(w[i:i + k]) in fragments:
            boiler[i:i + k] = [True] * k
    best = cur = 0
    for i, m in enumerate(matched):
        cur = cur + 1 if (m and not boiler[i] and not SENTINEL.match(w[i])) else 0
        best = max(best, cur)
    return best


# ---------------------------------------------------------------------------

def verify_batch(items, families, shingles, model, fragments=frozenset()):
    """Structure and originality are local and free; only the solve costs a call."""
    reports = {it["id"]: {"id": it["id"],
                          "structure": check_structure(it, families)}
               for it in items}
    try:
        solved = {r.get("id"): r for r in call_list(blind_batch_prompt(items), model)}
    except Exception as exc:
        msg = str(exc)[:160] or f"{type(exc).__name__} with no message"
        for r in reports.values():
            r["solve_error"] = msg
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
            rep["residue"] = residue(it, shingles, fragments=fragments)
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
        report["residue"] = residue(it, shingles)
    return report


def verdict(rep):
    # "error" covers any run where the solve did not happen, including the
    # empty-message case. An item that was never solved has not failed a
    # quality gate - it has not been tested - and must be retried rather than
    # discarded.
    if "solve_error" in rep or rep.get("solver_answer") is None:
        return "error"
    if rep["structure"]:
        return "fail"
    if not rep.get("agrees"):
        return "fail"
    if rep.get("residue", 0) >= RESIDUE_FAIL:
        return "fail"
    # A merely *nameable* second choice is not a defect - that is a distractor
    # doing its job. Genuine ambiguity, or a solver that is not confident, is.
    if rep.get("residue", 0) >= RESIDUE_REVIEW:
        return "review"
    if rep.get("ambiguous"):
        return "review"
    if not rep.get("confident"):
        return "review"
    return "pass"


def recheck(families):
    """Re-apply the free checks to the whole bank.

    Structural checks cost nothing, so whenever one is tightened it should be
    re-applied to items that already passed - otherwise a rule added today
    only ever guards items authored tomorrow, and the ones already marked
    verified keep going out to students. That is exactly what happened with
    the figure rule: twenty-one items naming a table or a graph that does not
    exist were sitting in the served pool.
    """
    demoted = Counter()
    for path in sorted(glob.glob(os.path.join(BANK, "*.json"))):
        items = json.load(open(path))
        changed = False
        for it in items:
            problems = check_structure(it, families)
            if problems and it.get("status") == "verified":
                it["status"] = "fail"
                it.setdefault("verification", {})["structure"] = problems
                demoted[problems[0]] += 1
                changed = True
                print(f"  demoted {it['id']}: {problems[0]}")
        if changed:
            json.dump(items, open(path, "w"), indent=1)

    total = sum(demoted.values())
    print(f"\n{total} previously verified item(s) demoted")
    for why, n in demoted.most_common():
        print(f"  {n:4}  {why}")
    return 0


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
    ap.add_argument("--recheck", action="store_true",
                    help="re-apply the structural checks to every item, "
                         "including verified ones, and make no model calls")
    args = ap.parse_args()

    families = {f["slug"] for f in
                json.load(open(os.path.join(ROOT, "data", "misconceptions.json")))["families"]}

    if args.recheck:
        return recheck(families)

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


    # One pool across every file, not a pool per file.
    #
    # A bank file holds eight to sixteen items, so batching inside a file gave
    # one or two batches and eight workers sat idle while 140 files went
    # through one at a time. Flattening the work list is the difference
    # between hours and minutes, and the per-file write still happens the
    # moment that file's last batch lands - so a run that dies partway keeps
    # everything it has already proved.
    jobs = []
    pending = Counter()
    loaded = {}
    for path in files:
        items = json.load(open(path))
        todo = [it for it in items if it.get("status") != "verified"]
        if not todo:
            continue
        loaded[path] = items
        for i in range(0, len(todo), args.batch):
            jobs.append((path, todo[i:i + args.batch]))
            pending[path] += 1

    if not jobs:
        print("nothing to verify")
        return

    print(f"{sum(len(b) for _, b in jobs)} items in {len(jobs)} batches "
          f"across {len(loaded)} files, {args.workers} at a time\n", flush=True)

    write_lock = threading.Lock()
    reports_by_path = defaultdict(list)

    def finish(path, reports):
        """Write a file once every batch in it has come back."""
        items = loaded[path]
        by_id = {r["id"]: r for r in reports}
        counts = Counter()
        for it in items:
            r = by_id.get(it["id"])
            if not r:
                continue
            v = verdict(r)
            counts[v] += 1
            totals[v] += 1
            it["status"] = "verified" if v == "pass" else v
            it["verification"] = r
        json.dump(items, open(path, "w"), indent=1)
        name = os.path.basename(path)
        print(f"{name:34} pass {counts['pass']:3}  review {counts['review']:3}  "
              f"fail {counts['fail']:3}  error {counts['error']:3}", flush=True)
        return reports

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(verify_batch, batch, families, shingles,
                               args.model, fragments): path
                   for path, batch in jobs}
        for fut in as_completed(futures):
            path = futures[fut]
            try:
                got = fut.result()
            except Exception as exc:
                print(f"  batch failed in {os.path.basename(path)}: "
                      f"{str(exc)[:120]}", flush=True)
                got = []
            with write_lock:
                reports_by_path[path] += got
                pending[path] -= 1
                if pending[path] == 0:
                    reports = finish(path, reports_by_path.pop(path))
                else:
                    reports = []
            for r in reports:
                v = verdict(r)
                if v not in ("fail", "review"):
                    continue
                why = (r["structure"] or
                       ([f"solver said {r.get('solver_answer')}"] if not r.get("agrees") else []) or
                       ([f"shares {r['residue']} words of original expression "
                         f"with the CB corpus"] if r.get("residue", 0) >= RESIDUE_REVIEW else []) or
                       (["genuinely ambiguous: " + str(r.get("second_defensible"))]
                        if r.get("ambiguous") else []) or
                       ["solver not confident"])
                print(f"   {v:6} {r['id']}: {why[0]}", flush=True)

    print(f"\ntotal: {totals['pass']} pass, {totals['review']} review, "
          f"{totals['fail']} fail, {totals['error']} error")
    print("Only 'verified' items are served to students.")

    with run("verify", model=args.model, batch=args.batch,
             files=len(files)) as r:
        r.count(**totals)
        # The alert rules live in build_agent_feed.py, in one place. Noting
        # the same condition here too just prints it twice on the dashboard.


if __name__ == "__main__":
    main()
