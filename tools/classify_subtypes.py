#!/usr/bin/env python3
"""
Label every question in the export with its subtype.

The derived subtypes carry the model's *estimate* of how common each one is.
Estimates are not good enough to drive selection - the engine multiplies by
frequency, so a wrong share sends students at the wrong thing. This measures it
instead: each question is assigned to one of its own skill's subtypes, and the
counts become the frequency term.

Only the resulting counts are kept and committed. The question text stays in
the git-ignored export.
"""
import argparse, json, os, random, re, subprocess, sys, threading
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from derive_subtypes import fields, body, call          # noqa: E402

WORK = os.path.join(ROOT, "corpus", "classify")
_lock = threading.Lock()


def prompt_for(skill, subtypes, batch):
    lines = [
        "Assign each SAT question below to exactly one subtype of its skill.",
        "", f"SKILL: {skill}", "", "SUBTYPES:"]
    for st in subtypes:
        lines.append(f"  {st['slug']}: {st['tell']}")
    lines += [
        "",
        "Use the subtype whose tell actually matches the question. If none",
        'fits, use "other".',
        "",
        'Respond with ONLY a JSON array: [{"id": "...", "subtype": "..."}]',
        "", "QUESTIONS:"]
    for r in batch:
        lines.append(f'\n<q id="{r["id"]}">\n{body(r)[:700]}\n</q>')
    return "\n".join(lines)


def run_batch(skill, subtypes, batch, model, out_path):
    valid = {st["slug"] for st in subtypes} | {"other"}
    try:
        res = call.__wrapped__(prompt_for(skill, subtypes, batch), model) \
            if hasattr(call, "__wrapped__") else _call_list(
                prompt_for(skill, subtypes, batch), model)
    except Exception as exc:
        return 0, str(exc)[:120]
    known = {r["id"] for r in batch}
    n = 0
    with _lock:
        with open(out_path, "a") as fh:
            for r in res:
                if r.get("id") in known and r.get("subtype") in valid:
                    fh.write(json.dumps({"id": r["id"], "skill": skill,
                                         "subtype": r["subtype"]}) + "\n")
                    n += 1
    return n, None


def _call_list(prompt, model):
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
    ap.add_argument("--model", default="claude-sonnet-5-5")
    ap.add_argument("--batch", type=int, default=20)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    os.makedirs(WORK, exist_ok=True)
    out_path = os.path.join(WORK, "subtype_labels.jsonl")
    # Read the cache immediately before building jobs, and tolerate a
    # partially-written final line. An earlier run re-labelled most of the
    # corpus because this check ran against a file still being flushed.
    def already_done():
        if not os.path.exists(out_path):
            return set()
        out = set()
        for line in open(out_path):
            line = line.strip()
            if not line:
                continue
            try:
                out.add(json.loads(line)["id"])
            except json.JSONDecodeError:
                continue          # torn last line; it will simply be redone
        return out

    done = already_done()

    tax = json.load(open(os.path.join(ROOT, "data", "subtypes.json")))["skills"]
    rows = []
    for section in ("rw", "math"):
        for line in open(os.path.join(ROOT, "corpus", "export", f"{section}.jsonl")):
            r = json.loads(line)
            s, d = fields(r)
            r["skill"], r["difficulty"] = s, d
            rows.append(r)

    by_skill = defaultdict(list)
    for r in rows:
        if r["skill"] in tax and r["id"] not in done:
            by_skill[r["skill"]].append(r)

    jobs = []
    for skill, rs in by_skill.items():
        sts = tax[skill]["subtypes"]
        for i in range(0, len(rs), args.batch):
            jobs.append((skill, sts, rs[i:i + args.batch]))
    if not jobs:
        print(f"nothing to do ({len(done)} labelled)")
        return
    print(f"{sum(len(j[2]) for j in jobs)} questions in {len(jobs)} batches "
          f"({len(done)} cached)", flush=True)

    ok = errs = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = [pool.submit(run_batch, s, st, b, args.model, out_path)
                for s, st, b in jobs]
        for i, f in enumerate(futs, 1):
            n, e = f.result()
            ok += n
            errs += bool(e)
            if i % 20 == 0 or i == len(futs):
                print(f"  {i}/{len(jobs)} batches, {ok} labelled, {errs} failed",
                      flush=True)
    print(f"\nlabelled {ok} -> {out_path}")


if __name__ == "__main__":
    main()
