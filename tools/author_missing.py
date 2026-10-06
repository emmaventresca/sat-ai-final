#!/usr/bin/env python3
"""Fill the subtypes that have no questions, worst gap first.

The bank was built skill by skill, so coverage is lumpy: a few recognitions
have thirty questions and a few have none at all. A student who opens
"perpendicular and parallel slopes" and finds an empty practice list has been
told what they are losing and then handed nothing to do about it.

Three decisions here, all about not wasting calls:

  - **Size by what the real test asks.** A recognition that appears 24 times
    in the bank earns all three tiers; one that appears twice earns Easy and
    Medium. Authoring Hard questions for a recognition the test barely uses
    is work no student will ever see.

  - **Hard needs Medium.** The app's ladder only reaches Hard through Medium
    in the same subtype, so a subtype with Hard and no Medium has a tier
    nobody can get to.

  - **Resume, do not restart.** Every subtype is checked against the bank
    before it is authored, so a run that dies halfway costs nothing to redo.

Verification and difficulty rating are deliberately NOT run here. Both are
batch jobs that work far better across the whole bank at once than file by
file - run them afterwards:

    python3 tools/verify_items.py --workers 12 --batch 8
    python3 tools/check_difficulty.py
    python3 tools/build_bank_index.py
"""
import argparse, glob, json, os, subprocess, sys, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BANK = os.path.join(ROOT, "data", "bank")
sys.path.insert(0, HERE)
from cli import Exhausted                               # noqa: E402

# Consecutive failed cells before a run gives up. Low enough that an outage
# costs minutes, high enough that a few genuinely bad subtypes do not stop
# a long run.
STOP_AFTER = 6


def load(name):
    return json.load(open(os.path.join(ROOT, "data", name)))


def authored_counts():
    """What is in the bank by subtype and tier: everything, and what passed.

    The gap-finding modes count everything, because an item that failed
    verification still cost a call to write and authoring ten more on top of
    it is how you pay twice for the same gap. `broken` is the exception - a
    cell whose items were all demoted has nothing a student can actually
    practise, however much it cost.
    """
    total, good, pending = Counter(), Counter(), Counter()
    for path in glob.glob(os.path.join(BANK, "*.json")):
        for it in json.load(open(path)):
            if not it.get("subtype"):
                continue
            key = (it["subtype"], it["difficulty"])
            total[key] += 1
            status = it.get("status")
            if status == "verified":
                good[key] += 1
            elif status in (None, "unverified"):
                pending[key] += 1
    return total, good, pending


def plan(counts, good, pending, per_tier, floor, mode):
    """What to author: (skill_cd, subtype, tier, n), worst gap first.

    `mode` decides what counts as a gap, and it matters a lot - topping every
    cell in the taxonomy up to eight is two and a half thousand items, which
    is not the same job as giving the empty subtypes something to practise.

      empty   subtypes with no questions at all - the student-visible hole
      broken  cells where most of what exists failed verification
      thin    empty, plus any cell below half the target
      all     every cell below the target
      exam    every cell the exam actually asks, sized by how often it asks
              it there. This is the mode that serves the whole score range:
              a student aiming at 1500 needs the Hard end of every
              recognition, and a student aiming at 1100 needs the Easy end,
              so the target for a cell comes from the exam's own per-tier
              counts rather than from one number applied everywhere.
    """
    freq = load("subtype_counts.json")["subtypes"]
    skills = {s["skill_name"]: s for s in load("skills.json")["skills"]}

    jobs = []
    for slug, meta in freq.items():
        skill = skills.get(meta["skill"])
        if not skill:
            continue
        total = meta.get("count_total", 0)

        if mode == "exam":
            for tier, key in (("E", "count_e"), ("M", "count_m"), ("H", "count_h")):
                asks = meta.get(key, 0)
                if not asks:
                    continue          # the exam does not ask it at this tier
                # Proportional, with a floor so a rare cell still has enough
                # to practise and a ceiling so a common one does not eat the
                # whole run.
                want = max(per_tier, min(10, round(asks / 2)))
                have = counts[(slug, tier)]
                if have >= want:
                    continue
                jobs.append({
                    "skill_cd": skill["skill_cd"], "subtype": slug, "tier": tier,
                    "n": want - have, "frequency": total, "have": have,
                    "name": meta["skill"], "asks": asks,
                })
            continue
        # Hard only where the test actually asks it, and never without the
        # Medium tier that the app's ladder reaches it through.
        tiers = ["E", "M"]
        if total >= floor and meta.get("count_h", 0):
            tiers.append("H")
        in_subtype = sum(counts[(slug, t)] for t in ("E", "M", "H"))
        if mode in ("empty", "thin") and mode == "empty" and in_subtype:
            continue
        for tier in tiers:
            have = counts[(slug, tier)]
            usable = good[(slug, tier)]
            if mode == "broken":
                # The cell exists and most of it did not survive. A cell that
                # is merely small is not broken - it was authored small - so
                # the test is the failure rate, not the count.
                # An item that has not been verified yet has not failed. A
                # cell with work still in the queue is not broken, it is
                # untested - re-authoring it would double-pay for the gap.
                if pending[(slug, tier)]:
                    continue
                if not have or usable * 2 >= have:
                    continue
                jobs.append({
                    "skill_cd": skill["skill_cd"], "subtype": slug, "tier": tier,
                    "n": per_tier - usable, "frequency": total, "have": usable,
                    "name": meta["skill"],
                })
                continue
            if have >= per_tier:
                continue
            if mode == "thin" and in_subtype and have >= per_tier // 2:
                continue
            jobs.append({
                "skill_cd": skill["skill_cd"], "subtype": slug, "tier": tier,
                "n": per_tier - have, "frequency": total, "have": have,
                "name": meta["skill"],
            })
    # Empty cells first - a cell with nothing in it is a student opening a
    # tier and finding a blank page, which is worse than a thin one.
    jobs.sort(key=lambda j: (j["have"] > 0, -j.get("asks", j["frequency"]),
                             -j["frequency"], j["subtype"], j["tier"]))
    return jobs


def author(job, model):
    cmd = [sys.executable, os.path.join(HERE, "author_items.py"),
           "--skill", job["skill_cd"], "--subtype", job["subtype"],
           "--difficulty", job["tier"], "--n", str(job["n"]),
           "--model", model, "--seed", str(abs(hash(job["subtype"])) % 99991)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        return False, (proc.stderr or proc.stdout).strip()[-200:]
    return True, proc.stdout.strip().splitlines()[0] if proc.stdout.strip() else "wrote items"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-tier", type=int, default=8,
                    help="items to hold in each subtype/tier cell")
    ap.add_argument("--floor", type=int, default=6,
                    help="real-test frequency a subtype needs to earn a Hard tier")
    ap.add_argument("--limit", type=int, default=0, help="stop after N jobs")
    ap.add_argument("--workers", type=int, default=6,
                    help="authoring calls to run at once. Each job writes its "
                         "own bank file, so they do not contend.")
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--mode", default="empty",
                    choices=("empty", "broken", "thin", "all", "exam"),
                    help="empty: subtypes with nothing (default); "
                         "broken: cells where nothing survived verification; "
                         "thin: those plus half-full cells; all: every gap; "
                         "exam: every cell the exam asks, sized by how often")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    total, good, pending = authored_counts()
    jobs = plan(total, good, pending, args.per_tier, args.floor, args.mode)
    if args.limit:
        jobs = jobs[:args.limit]

    if not jobs:
        print("every subtype already has questions at every tier it earns")
        return 0

    want = sum(j["n"] for j in jobs)
    subs = len({j["subtype"] for j in jobs})
    print(f"{want} items to write across {len(jobs)} cells in {subs} subtypes\n")
    for j in jobs[:12]:
        print(f"  {j['frequency']:4} on the real test  {j['subtype']:38} "
              f"{j['tier']}  +{j['n']}")
    if len(jobs) > 12:
        print(f"  ... and {len(jobs) - 12} more")
    if args.dry_run:
        return 0

    print(f"\nrunning {args.workers} at a time\n")
    done = failed = 0
    # Each job is a subprocess, so the CLI wrapper's circuit breaker lives in
    # the child and the driver never sees it. Count the run of failures here
    # instead: when nothing is getting through, stop asking.
    streak = 0
    stopped = False
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(author, j, args.model): j for j in jobs}
        for k, fut in enumerate(as_completed(futures), 1):
            j = futures[fut]
            head = f"[{k}/{len(jobs)}] {j['subtype']} {j['tier']} +{j['n']}"
            try:
                ok, msg = fut.result()
            except Exhausted as exc:
                ok, msg = False, str(exc)[:160]
            except Exception as exc:
                ok, msg = False, str(exc).strip().splitlines()[-1][:160]
            with lock:
                if ok:
                    done += 1
                    streak = 0
                    print(f"{head:62} {msg}", flush=True)
                else:
                    failed += 1
                    streak += 1
                    print(f"{head:62} FAILED: {msg}", flush=True)
                # The limit is gone, not the work. Stop asking, leave the rest
                # on the to-do list, and say so plainly - a log full of
                # "FAILED" reads like 287 bad cells when it is one outage.
                if streak >= STOP_AFTER and not stopped:
                    stopped = True
                    print(f"\n{streak} cells in a row failed - stopping rather "
                          f"than working through the rest of the queue.",
                          flush=True)
                    for f in futures:
                        f.cancel()
            if stopped:
                break

    print(f"\n{done} cells written, {failed} failed")
    if stopped:
        print("the rest were not attempted - rerun this command when the "
              "usage limit resets and it will pick up where it stopped")
    print("now run: verify_items.py, then check_difficulty.py, "
          "then build_bank_index.py")
    return 1 if failed and not done else 0


if __name__ == "__main__":
    sys.exit(main())
