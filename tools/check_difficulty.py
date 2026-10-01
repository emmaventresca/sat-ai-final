#!/usr/bin/env python3
"""
Independently rate each item's difficulty, and re-tier it when the author was
wrong.

Items are authored "at tier E/M/H", but nothing has been checking that they
actually ARE that difficulty. That matters more here than in most banks: the
whole adaptive engine keys on tier. An item filed as Easy that is really Hard
makes a struggling student look worse than they are, and the band model will
happily recommend a tier built on bad labels.

So a second pass rates each item cold - it sees the question and the answer,
never the tier it was written for - and the result is reconciled:

  agrees          keep the tier
  one step off    re-tier to the rater's call, since the rater had no anchor
  two steps off   flag for review rather than silently moving it

Rating is cheap next to authoring, so ten items go in one call.

  python3 tools/check_difficulty.py
"""
import argparse, glob, json, os, subprocess, sys, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from agentlog import run                                # noqa: E402

BANK = os.path.join(ROOT, "data", "bank")
LETTERS = "ABCD"
ORDER = {"E": 0, "M": 1, "H": 2}

PROMPT = """You are rating SAT practice questions for difficulty, as an
independent check on the person who wrote them. You are not told what level
each was written for; judge each on its own.

Use College Board's own sense of the tiers:

  E  One step, or one clear signal. A prepared student answers in under 40
     seconds and the distractors are easy to rule out.
  M  Two steps, or one step plus a subtlety - a qualifier that matters, a
     conversion, a relationship that must be named first. Roughly a minute.
  H  Multi-step, or a single step with a real trap: two choices stay
     defensible until a deciding detail is noticed. Over a minute, and a
     well-prepared student can still miss it.

Judge the WORK REQUIRED, not the topic. A circle question can be Easy and a
linear equation can be Hard.

{items}

Respond with ONLY a JSON array, one object per question, in order:
[{{"id": "...", "level": "E"|"M"|"H", "seconds": <estimate>, "why": "one clause"}}]"""


def render(it):
    out = [f'<question id="{it["id"]}">']
    if it.get("stimulus"):
        out.append(it["stimulus"])
    out.append(it["stem"])
    for i, c in enumerate(it["choices"]):
        out.append(f"{LETTERS[i]}) {c}")
    out.append(f"(correct answer: {it['answer']})")
    out.append("</question>")
    return "\n".join(out)


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=900,
        env={**os.environ,
             "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")})
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip()[:200] or f"exit {proc.returncode}")
    i = proc.stdout.find("[")
    if i == -1:
        raise ValueError("no JSON array")
    return json.JSONDecoder().raw_decode(proc.stdout[i:])[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-haiku-4-5")
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    todo = []
    for f in sorted(glob.glob(os.path.join(BANK, "*.json"))):
        for it in json.load(open(f)):
            if it.get("status") == "verified" and "rated_level" not in it:
                todo.append((f, it))
    if not todo:
        print("every verified item already has an independent rating")
        return

    groups = [todo[i:i + args.batch] for i in range(0, len(todo), args.batch)]
    print(f"rating {len(todo)} items in {len(groups)} calls ({args.model})", flush=True)

    lock = threading.Lock()
    ratings = {}

    def do(group):
        try:
            res = call(PROMPT.format(items="\n\n".join(render(it) for _, it in group)),
                       args.model)
        except Exception as exc:
            return str(exc)[:120]
        with lock:
            for r in res:
                if r.get("level") in ORDER:
                    ratings[r.get("id")] = r
        return None

    errs = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, err in enumerate(pool.map(do, groups), 1):
            errs += bool(err)
            if i % 20 == 0 or i == len(groups):
                print(f"  {i}/{len(groups)} calls, {len(ratings)} rated, {errs} failed",
                      flush=True)

    tally = Counter()
    by_file = {}
    for f, it in todo:
        by_file.setdefault(f, []).append(it)

    with run("difficulty", model=args.model, rated=len(ratings)) as r:
        for f, its in by_file.items():
            data = json.load(open(f))
            index = {x["id"]: x for x in data}
            for it in its:
                rating = ratings.get(it["id"])
                if not rating:
                    tally["no rating"] += 1
                    continue
                target = index[it["id"]]
                target["rated_level"] = rating["level"]
                target["rated_why"] = rating.get("why", "")[:160]
                gap = abs(ORDER[rating["level"]] - ORDER[it["difficulty"]])
                if gap == 0:
                    tally["agreed"] += 1
                elif gap == 1 and not args.dry_run:
                    target["authored_difficulty"] = it["difficulty"]
                    target["difficulty"] = rating["level"]
                    tally[f"re-tiered {it['difficulty']}->{rating['level']}"] += 1
                elif gap == 1:
                    tally[f"would re-tier {it['difficulty']}->{rating['level']}"] += 1
                else:
                    target["status"] = "review"
                    tally["two tiers off - flagged"] += 1
            if not args.dry_run:
                json.dump(data, open(f, "w"), indent=1)
        for k, v in tally.items():
            r.count(**{k.replace(" ", "_").replace("->", "_to_"): v})

    print()
    for k, v in tally.most_common():
        print(f"  {v:5}  {k}")
    agreed = tally["agreed"]
    print(f"\nauthor and rater agreed on {agreed}/{len(ratings)} "
          f"({agreed / max(len(ratings),1):.0%})")


if __name__ == "__main__":
    main()
