#!/usr/bin/env python3
"""
Settle disagreements between the generator and the blind solver.

275 of 333 failures were the solver answering differently from the generator.
Discarding all of them throws away work already paid for, and assumes the
solver is right - which is not obvious, because the solver sees the question
cold while the generator built it deliberately.

So a third opinion adjudicates: a stronger model sees the question, both
proposed answers, and nothing about who proposed which. It rules the item
CORRECT (the generator's key stands), WRONG (the solver is right and the key
is broken), or AMBIGUOUS (both defensible, so the item is unfixable).

Only CORRECT items are restored. WRONG and AMBIGUOUS stay failed. That keeps
the rule the whole pipeline rests on - the agent that wrote the question is
never the sole authority on its answer - while recovering the items where the
solver simply misread.

One adjudication call covers ten items; re-authoring ten costs more and starts
from nothing.
"""
import argparse, glob, json, os, subprocess, sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from agentlog import run                                # noqa: E402

BANK = os.path.join(ROOT, "data", "bank")
LETTERS = "ABCD"


def one(it):
    v = it["verification"]
    body = [f'<item id="{it["id"]}">']
    if it.get("stimulus"):
        body.append(it["stimulus"])
    body.append(it["stem"])
    for i, c in enumerate(it["choices"]):
        body.append(f"{LETTERS[i]}) {c}")
    # Deliberately unattributed: which model proposed which answer is not
    # evidence, and naming it invites deference.
    pair = sorted({it["answer"], v.get("solver_answer")} - {None})
    body.append(f"Two readers disagree. One says {pair[0]}, the other {pair[-1]}.")
    body.append("</item>")
    return "\n".join(body)


PROMPT = """You are adjudicating SAT practice questions where two independent
readers chose different answers. Decide which reading is right, or whether the
question is genuinely ambiguous.

For each item, work the question yourself before looking at either proposed
answer. Then rule:

- "answer": the letter that is actually correct
- "verdict": "clear" if one answer is defensible and the other is not;
             "ambiguous" if a careful, well-prepared student could justify both
- "why": one sentence

Be strict about ambiguity. A question with two defensible answers is broken and
must not be used, however good it looks.

{items}

Respond with ONLY a JSON array, one object per item, in order:
[{{"id": "...", "answer": "A"|"B"|"C"|"D", "verdict": "clear"|"ambiguous", "why": "..."}}]"""


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=900,
        env={**os.environ,
             "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")})
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:200])
    i = proc.stdout.find("[")
    if i == -1:
        raise ValueError("no JSON array")
    return json.JSONDecoder().raw_decode(proc.stdout[i:])[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(BANK, "*.json")))
    disputed = []
    for f in files:
        for it in json.load(open(f)):
            v = it.get("verification") or {}
            if (it.get("status") == "fail" and not v.get("structure")
                    and not v.get("overlap") and v.get("agrees") is False
                    and v.get("solver_answer")):
                disputed.append((f, it))
    if not disputed:
        print("no generator/solver disagreements to adjudicate")
        return

    print(f"{len(disputed)} disputed items -> "
          f"{-(-len(disputed) // args.batch)} adjudication calls", flush=True)

    with run("adjudicate", model=args.model, disputed=len(disputed)) as r:
        groups = [disputed[i:i + args.batch]
                  for i in range(0, len(disputed), args.batch)]

        def do(group):
            try:
                return call(PROMPT.format(items="\n\n".join(one(it) for _, it in group)),
                            args.model)
            except Exception as exc:
                r.note(f"batch failed: {exc}")
                return []

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            results = [x for g in pool.map(do, groups) for x in g]

        ruling = {x.get("id"): x for x in results}
        tally = Counter()
        by_file = {}
        for f, it in disputed:
            by_file.setdefault(f, []).append(it)

        for f, its in by_file.items():
            data = json.load(open(f))
            index = {x["id"]: x for x in data}
            for it in its:
                x = ruling.get(it["id"])
                if not x:
                    tally["no ruling"] += 1
                    continue
                target = index[it["id"]]
                target.setdefault("verification", {})["adjudication"] = x
                if x.get("verdict") == "ambiguous":
                    tally["ambiguous - stays failed"] += 1
                elif x.get("answer") == it["answer"]:
                    target["status"] = "verified"
                    tally["generator was right - restored"] += 1
                else:
                    tally["solver was right - key broken"] += 1
            json.dump(data, open(f, "w"), indent=1)

        for k, v in tally.items():
            r.count(**{k.replace(" ", "_"): v})
        print()
        for k, v in tally.most_common():
            print(f"  {v:4}  {k}")
        restored = tally["generator was right - restored"]
        print(f"\nrestored {restored} of {len(disputed)} "
              f"({restored / len(disputed):.0%}) for "
              f"{len(groups)} calls instead of ~{len(disputed) // 8} re-authoring runs")


if __name__ == "__main__":
    main()
