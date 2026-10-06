#!/usr/bin/env python3
"""Write the groundwork a student needs before the exam's easiest tier.

College Board's "Easy" still assumes you can solve 3x + 7 = 22 and take 15%
of 80. A student at 330 cannot, and pointing them at Easy questions is how a
tool tells someone their problem is unfixable - they miss, miss again, and
conclude the thing is not for them.

Foundations is the skill underneath the recognition with the test wrapped
off. It is deliberately not an exam tier: the band model answers "what does
my target require", and the honest answer for a groundwork item is nothing.
So it is never ranked, never promoted into, and never counted toward a tier.
A student chooses it, or we suggest it when the easy tier is not going in.

Where it goes is decided by frequency: the recognitions a low-scoring student
will meet most often are the ones worth unlocking first.
"""
import argparse, glob, json, os, subprocess, sys, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "data", "bank")
sys.path.insert(0, HERE)
from cli import Exhausted                               # noqa: E402

STOP_AFTER = 6


def have():
    counts = Counter()
    for path in glob.glob(os.path.join(BANK, "*-F.json")):
        for it in json.load(open(path)):
            if it.get("subtype"):
                counts[it["subtype"]] += 1
    return counts


def author(job, model):
    cmd = [sys.executable, os.path.join(HERE, "author_items.py"),
           "--skill", job["skill_cd"], "--subtype", job["subtype"],
           "--difficulty", "F", "--n", str(job["n"]), "--model", model,
           "--seed", str(abs(hash(job["subtype"])) % 99991)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        return False, (proc.stderr or proc.stdout).strip().splitlines()[-1][:160]
    out = proc.stdout.strip().splitlines()
    return True, out[0] if out else "wrote items"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-subtype", type=int, default=4)
    ap.add_argument("--min-frequency", type=int, default=8,
                    help="real-test frequency a recognition needs to qualify")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    freq = json.load(open(os.path.join(ROOT, "data", "subtype_counts.json")))["subtypes"]
    skills = {s["skill_name"]: s for s in
              json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}
    counts = have()

    jobs = []
    for slug, meta in freq.items():
        skill = skills.get(meta["skill"])
        if not skill or meta.get("count_total", 0) < args.min_frequency:
            continue
        # Groundwork only helps where the exam has an easy end to reach. A
        # recognition that only ever appears Hard is not where a struggling
        # student should be spending time.
        if not meta.get("count_e"):
            continue
        n = args.per_subtype - counts[slug]
        if n <= 0:
            continue
        jobs.append({"skill_cd": skill["skill_cd"], "subtype": slug, "n": n,
                     "frequency": meta["count_total"]})
    jobs.sort(key=lambda j: -j["frequency"])

    if not jobs:
        print("every qualifying recognition already has its groundwork")
        return 0
    print(f"{sum(j['n'] for j in jobs)} groundwork questions across "
          f"{len(jobs)} recognitions")
    for j in jobs[:10]:
        print(f"  {j['frequency']:4} on the real test  {j['subtype']:38} +{j['n']}")
    if args.dry_run:
        return 0

    print(f"\nrunning {args.workers} at a time\n")
    done = failed = streak = 0
    stopped = False
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(author, j, args.model): j for j in jobs}
        for k, fut in enumerate(as_completed(futures), 1):
            j = futures[fut]
            head = f"[{k}/{len(jobs)}] {j['subtype']} +{j['n']}"
            try:
                ok, msg = fut.result()
            except Exhausted as exc:
                ok, msg = False, str(exc)[:160]
            except Exception as exc:
                ok, msg = False, str(exc).strip().splitlines()[-1][:160]
            with lock:
                if ok:
                    done += 1; streak = 0
                    print(f"{head:56} {msg}", flush=True)
                else:
                    failed += 1; streak += 1
                    print(f"{head:56} FAILED: {msg}", flush=True)
                if streak >= STOP_AFTER and not stopped:
                    stopped = True
                    print(f"\n{streak} in a row failed - stopping.", flush=True)
                    for f in futures:
                        f.cancel()
            if stopped:
                break
    print(f"\n{done} written, {failed} failed")
    if stopped:
        print("rerun when the usage limit resets; it picks up where it stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
