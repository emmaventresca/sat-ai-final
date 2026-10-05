#!/usr/bin/env python3
"""Author student-produced response items, in the proportion the exam uses.

27% of the real math section has no answer choices - 394 of the 1,463 math
questions in our corpus. A bank that is entirely multiple choice leaves a
quarter of the section unpractised, and not the forgiving quarter: a grid-in
takes away elimination, backsolving, and recognising the right-looking form.

Where they go is decided by the corpus rather than by taste. Every math
subtype gets grid-ins in proportion to how often College Board actually uses
the format for that skill, so a skill the exam almost never grids does not
get a pile of them here.
"""
import argparse, glob, json, os, subprocess, sys, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "data", "bank")
CORPUS = os.path.join(ROOT, "corpus", "bank")
sys.path.insert(0, HERE)
from sanitize import sanitize                            # noqa: E402,F401


def grid_share_by_skill():
    """How often the exam grids each skill, measured not assumed."""
    total, grid = Counter(), Counter()
    for path in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(path).startswith("_"):
            continue
        try:
            d = json.load(open(path))
        except Exception:
            continue
        skill = (d.get("_meta") or {}).get("skill_cd")
        if not skill:
            continue
        total[skill] += 1
        if not (d.get("answerOptions") or []):
            grid[skill] += 1
    return {s: grid[s] / n for s, n in total.items() if n >= 10}


def have_grid():
    counts = Counter()
    for path in glob.glob(os.path.join(BANK, "*-grid.json")):
        for it in json.load(open(path)):
            if it.get("subtype"):
                counts[(it["subtype"], it["difficulty"])] += 1
    return counts


def author(job, model):
    cmd = [sys.executable, os.path.join(HERE, "author_items.py"),
           "--skill", job["skill_cd"], "--subtype", job["subtype"],
           "--difficulty", job["tier"], "--n", str(job["n"]),
           "--format", "grid", "--model", model,
           "--seed", str(abs(hash(job["subtype"] + job["tier"])) % 99991)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        return False, (proc.stderr or proc.stdout).strip()[-200:]
    first = proc.stdout.strip().splitlines()
    return True, first[0] if first else "wrote items"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-cell", type=int, default=4)
    ap.add_argument("--min-share", type=float, default=0.15,
                    help="skip skills the exam grids less often than this")
    ap.add_argument("--min-frequency", type=int, default=10,
                    help="real-test frequency a subtype needs to qualify")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    share = grid_share_by_skill()
    freq = json.load(open(os.path.join(ROOT, "data", "subtype_counts.json")))["subtypes"]
    skills = {s["skill_name"]: s for s in
              json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}
    counts = have_grid()

    jobs = []
    for slug, meta in freq.items():
        if meta.get("section") != "math":
            continue
        skill = skills.get(meta["skill"])
        if not skill or share.get(skill["skill_cd"], 0) < args.min_share:
            continue
        if meta.get("count_total", 0) < args.min_frequency:
            continue
        # Grid-ins are concentrated in the middle and upper tiers on the real
        # exam; an Easy grid-in is usually just an Easy question with the
        # choices removed, which is the least useful version of the format.
        for tier in ("M", "H"):
            if tier == "H" and not meta.get("count_h"):
                continue
            have = counts[(slug, tier)]
            if have >= args.per_cell:
                continue
            jobs.append({"skill_cd": skill["skill_cd"], "subtype": slug,
                         "tier": tier, "n": args.per_cell - have,
                         "frequency": meta["count_total"],
                         "share": share[skill["skill_cd"]]})
    jobs.sort(key=lambda j: (-j["frequency"], j["subtype"], j["tier"]))

    if not jobs:
        print("every qualifying cell already has its grid-ins")
        return 0
    print(f"{sum(j['n'] for j in jobs)} grid-ins across {len(jobs)} cells in "
          f"{len({j['subtype'] for j in jobs})} subtypes")
    for j in jobs[:10]:
        print(f"  {j['frequency']:4} on the real test  {j['subtype']:36} "
              f"{j['tier']}  +{j['n']}  (exam grids this skill {j['share']:.0%})")
    if args.dry_run:
        return 0

    print(f"\nrunning {args.workers} at a time\n")
    done = failed = 0
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(author, j, args.model): j for j in jobs}
        for k, fut in enumerate(as_completed(futures), 1):
            j = futures[fut]
            head = f"[{k}/{len(jobs)}] {j['subtype']} {j['tier']} +{j['n']}"
            try:
                ok, msg = fut.result()
            except Exception as exc:
                ok, msg = False, str(exc)[:160]
            with lock:
                if ok:
                    done += 1
                    print(f"{head:62} {msg}", flush=True)
                else:
                    failed += 1
                    print(f"{head:62} FAILED: {msg}", flush=True)
    print(f"\n{done} cells written, {failed} failed")
    return 1 if failed and not done else 0


if __name__ == "__main__":
    sys.exit(main())
