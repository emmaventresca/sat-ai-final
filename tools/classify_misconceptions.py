#!/usr/bin/env python3
"""
Tag each wrong answer choice with the misconception it represents.

College Board explains why every wrong choice is wrong, but in free prose.
Keyword matching classified only 7% of them - the language is too varied - so
this reads each rationale with a model and assigns a family from the fixed
taxonomy in data/misconceptions.json (itself derived from a stratified sample
of the same corpus rather than invented).

Nothing here generates SAT content. It reads College Board's own explanation
and labels the error it describes, so the tag is grounded in the source.

Runs through the `claude` CLI, which uses the operator's existing session - no
API key to configure or store. Results are cached per choice id, so a run can
be interrupted and resumed without repeating work.

  python3 tools/classify_misconceptions.py --limit 200      # pilot
  python3 tools/classify_misconceptions.py                  # everything
  python3 tools/classify_misconceptions.py --model claude-opus-5-5 --ids-from FILE
"""
import argparse, json, os, random, re, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORK = os.path.join(ROOT, "corpus", "classify")
ROWS = os.path.join(WORK, "wrong_choices.json")
TAXONOMY = os.path.join(ROOT, "data", "misconceptions.json")

_lock = threading.Lock()


def families(section):
    tax = json.load(open(TAXONOMY))["families"]
    return [f for f in tax if f["section"] in (section, "both")]


def prompt_for(section, batch):
    fams = families(section)
    lines = [
        "You are labelling SAT practice data for a diagnostic tutor.",
        "",
        "Each item below is College Board's own explanation of why one WRONG answer",
        "choice is wrong. Assign the misconception family that best describes the",
        "student error the explanation is pointing at.",
        "",
        "FAMILIES (use the slug exactly):",
    ]
    for f in fams:
        lines.append(f"  {f['slug']}: {f['when']}")
    lines += [
        "",
        "Rules:",
        "- Choose the family the explanation actually describes, not the one that",
        "  sounds most useful. Use \"other\" when no family genuinely fits.",
        "- confidence: \"high\" when the explanation names the error plainly,",
        "  \"low\" when you are inferring it.",
        "",
        "Respond with ONLY a JSON array, one object per item, in the same order:",
        '[{"id": "...", "family": "...", "confidence": "high"|"low"}]',
        "",
        "ITEMS:",
    ]
    for r in batch:
        lines.append(f'\n<item id="{r["id"]}" skill="{r["skill"]}">')
        lines.append(r["rationale"])
        lines.append("</item>")
    return "\n".join(lines)


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=600,
        env={**os.environ, "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:300])
    # Decode from the first "[" rather than regexing to the last "]": a greedy
    # match spans any trailing prose or a second array and then fails to parse.
    start = proc.stdout.find("[")
    if start == -1:
        raise ValueError(f"no JSON array in output: {proc.stdout[:200]}")
    try:
        parsed, _ = json.JSONDecoder().raw_decode(proc.stdout[start:])
    except json.JSONDecodeError as exc:
        raise ValueError(f"bad JSON: {exc}; head={proc.stdout[start:start + 160]!r}")
    if not isinstance(parsed, list):
        raise ValueError("expected a JSON array")
    return parsed


def run_batch(batch, model, valid, out_path):
    section = batch[0]["section"]
    try:
        results = call(prompt_for(section, batch), model)
    except Exception as exc:
        return 0, f"{exc}"

    known = {r["id"] for r in batch}
    good = 0
    with _lock:
        with open(out_path, "a") as fh:
            for r in results:
                # A hallucinated id or family is dropped rather than stored.
                if r.get("id") not in known or r.get("family") not in valid:
                    continue
                fh.write(json.dumps({"id": r["id"], "family": r["family"],
                                     "confidence": r.get("confidence", "low"),
                                     "model": model}) + "\n")
                good += 1
    return good, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--batch", type=int, default=25)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--limit", type=int)
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--out", default=os.path.join(WORK, "labels.jsonl"))
    ap.add_argument("--ids-from", help="only classify ids listed in this jsonl")
    args = ap.parse_args()

    rows = json.load(open(ROWS))
    valid = {f["slug"] for f in json.load(open(TAXONOMY))["families"]}

    if args.ids_from:
        keep = {json.loads(l)["id"] for l in open(args.ids_from) if l.strip()}
        rows = [r for r in rows if r["id"] in keep]

    done = set()
    if os.path.exists(args.out):
        for line in open(args.out):
            if line.strip():
                done.add(json.loads(line)["id"])
    todo = [r for r in rows if r["id"] not in done]
    # Deterministic shuffle. The corpus is ordered by skill, so slicing the
    # first N for a pilot samples one skill and tells you nothing about the
    # rest - the first run of this came back 98% Boundaries.
    random.Random(args.seed).shuffle(todo)
    if args.limit:
        todo = todo[:args.limit]

    if not todo:
        print(f"nothing to do ({len(done)} already labelled)")
        return

    # Batches never mix sections: the family list differs.
    batches = []
    for section in ("rw", "math"):
        rs = [r for r in todo if r["section"] == section]
        batches += [rs[i:i + args.batch] for i in range(0, len(rs), args.batch)]

    print(f"{len(todo)} to classify in {len(batches)} batches "
          f"({args.model}, {args.workers} workers, {len(done)} cached)")

    ok = errs = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run_batch, b, args.model, valid, args.out) for b in batches]
        for i, fut in enumerate(futures, 1):
            n, err = fut.result()
            ok += n
            if err:
                errs += 1
                print(f"  batch failed: {err}", flush=True)
            if i % 10 == 0 or i == len(futures):
                print(f"  {i}/{len(batches)} batches, {ok} labelled, {errs} failed",
                      flush=True)
    print(f"\nlabelled {ok}, {errs} batches failed -> {args.out}")


if __name__ == "__main__":
    main()
