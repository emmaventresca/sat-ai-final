#!/usr/bin/env python3
"""Two agents: one reads what makes a tier, one writes to it.

    python3 tools/build_tiers.py --dry-run
    python3 tools/build_tiers.py --tiers F,E,M,H,X --workers 3

**The reader** is tools/derive_difficulty_style.py. It measures the College
Board corpus - how long a question runs at each tier, how many conditions it
holds at once, how many steps its official explanation takes, how often it
drops the answer choices - and writes data/difficulty_style.json. That file
is the brief every authoring call is held to, which is what "make it feel
official" has to mean if it is to mean anything checkable.

The authority is deliberately the official corpus and not a prep publisher's
practice test. Those are imitations, and the ones on this machine imitate
the retired paper exam; shaping our register from them would move it away
from official rather than toward it.

**The writer** is tools/author_items.py, run per subtype and tier with that
brief attached. Five tiers now, two of which are ours and labelled as such:

    F  groundwork below the exam's easiest level
    E  M  H   the exam's own three
    X  above the exam's hardest, for the last few marks

Where each tier goes is decided by the corpus too. E, M and H are sized by
how often the exam asks that recognition at that tier; F goes where there is
an easy end to reach; X goes where the exam already has a Hard end to go
beyond.
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
ALL_TIERS = ("F", "E", "M", "H", "X")


def counts():
    have = Counter()
    for path in glob.glob(os.path.join(BANK, "*.json")):
        for it in json.load(open(path)):
            if it.get("subtype"):
                have[(it["subtype"], it["difficulty"])] += 1
    return have


def plan(tiers, base, have):
    freq = json.load(open(os.path.join(ROOT, "data", "subtype_counts.json")))["subtypes"]
    skills = {s["skill_name"]: s for s in
              json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}
    jobs = []
    for slug, meta in freq.items():
        skill = skills.get(meta["skill"])
        if not skill:
            continue
        total = meta.get("count_total", 0)
        asks = {"E": meta.get("count_e", 0), "M": meta.get("count_m", 0),
                "H": meta.get("count_h", 0)}
        for tier in tiers:
            if tier in ("E", "M", "H"):
                if not asks[tier]:
                    continue                 # the exam does not ask it there
                want = max(base, min(10, round(asks[tier] / 2)))
            elif tier == "F":
                # Groundwork only helps where there is an easy end to reach.
                if not asks["E"] or total < 8:
                    continue
                want = base
            else:                            # X
                # Only above a recognition the exam already takes to Hard.
                if not asks["H"] or total < 10:
                    continue
                want = max(2, base // 2)
            here = have[(slug, tier)]
            if here >= want:
                continue
            jobs.append({"skill_cd": skill["skill_cd"], "subtype": slug,
                         "tier": tier, "n": want - here, "have": here,
                         "frequency": total, "asks": asks.get(tier, 0)})
    # Empty cells first, then by how much the exam leans on the recognition.
    jobs.sort(key=lambda j: (j["have"] > 0, ALL_TIERS.index(j["tier"]),
                             -j["frequency"], j["subtype"]))
    return jobs


def author(job, model):
    cmd = [sys.executable, os.path.join(HERE, "author_items.py"),
           "--skill", job["skill_cd"], "--subtype", job["subtype"],
           "--difficulty", job["tier"], "--n", str(job["n"]), "--model", model,
           "--seed", str(abs(hash(job["subtype"] + job["tier"])) % 99991)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout).strip().splitlines()
        return False, (tail[-1][:160] if tail else "authoring failed")
    out = proc.stdout.strip().splitlines()
    return True, out[0] if out else "wrote items"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiers", default="F,E,M,H,X")
    ap.add_argument("--per-cell", type=int, default=5)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-measure", action="store_true")
    args = ap.parse_args()

    tiers = [t.strip().upper() for t in args.tiers.split(",") if t.strip()]
    bad = [t for t in tiers if t not in ALL_TIERS]
    if bad:
        sys.exit(f"unknown tier(s): {bad}; choose from {list(ALL_TIERS)}")

    style = os.path.join(ROOT, "data", "difficulty_style.json")
    if not args.skip_measure or not os.path.exists(style):
        print("=== reading what makes each tier, off the College Board corpus ===")
        subprocess.run([sys.executable, os.path.join(HERE,
                        "derive_difficulty_style.py")], check=False)
        print()

    jobs = plan(tiers, args.per_cell, counts())
    if args.limit:
        jobs = jobs[:args.limit]
    if not jobs:
        print("every cell already has what it needs")
        return 0

    by_tier = Counter(j["tier"] for j in jobs)
    print(f"{sum(j['n'] for j in jobs)} questions across {len(jobs)} cells")
    print("  " + "  ".join(f"{t}:{by_tier[t]}" for t in ALL_TIERS if by_tier[t]))
    for j in jobs[:10]:
        print(f"  {j['tier']}  {j['subtype']:38} +{j['n']:2}  "
              f"(exam asks this recognition {j['frequency']}x)")
    if args.dry_run:
        return 0

    print(f"\nwriting, {args.workers} at a time\n")
    done = failed = streak = 0
    stopped = False
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(author, j, args.model): j for j in jobs}
        for k, fut in enumerate(as_completed(futures), 1):
            j = futures[fut]
            head = f"[{k}/{len(jobs)}] {j['tier']} {j['subtype']} +{j['n']}"
            try:
                ok, msg = fut.result()
            except Exhausted as exc:
                ok, msg = False, str(exc)[:160]
            except Exception as exc:
                ok, msg = False, str(exc).strip().splitlines()[-1][:160]
            with lock:
                if ok:
                    done += 1; streak = 0
                    print(f"{head:60} {msg}", flush=True)
                else:
                    failed += 1; streak += 1
                    print(f"{head:60} FAILED: {msg}", flush=True)
                if streak >= STOP_AFTER and not stopped:
                    stopped = True
                    print(f"\n{streak} in a row failed - stopping rather than "
                          f"working through the rest of the queue.", flush=True)
                    for f in futures:
                        f.cancel()
            if stopped:
                break

    print(f"\n{done} cells written, {failed} failed")
    if stopped:
        print("rerun when the usage limit resets; it picks up where it stopped")
    print("then: verify_items.py, then build_bank_index.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
