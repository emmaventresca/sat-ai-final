#!/usr/bin/env python3
"""
Fill the gaps in what KINDS of question exist, not how many.

A recognition can hold forty questions and still only ever ask one way. A
student who has met it forty times phrased directly has not met the way the
test actually asks it, and 112 of 181 recognitions were in exactly that
state. The whole bank held eight "NOT ... EXCEPT" questions.

Two jobs:

  WORDING   three per family per recognition, for the families that make
            sense there. Three is enough to meet a family rather than a
            quota - the point is that it EXISTS, not that it hits a share.

  GRID-INS  up to the real paper's 27% of the maths section. 36 maths
            recognitions had none at all, and a student who only ever sees
            multiple choice has an eliminating strategy that works on three
            quarters of the paper and nothing for the rest.

Resumes: every cell is re-measured against the bank before it is authored,
so a run that dies halfway costs nothing to redo.

  python3 tools/author_variety.py --dry-run
  python3 tools/author_variety.py --workers 6
"""
import argparse, collections, json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

GRID_SHARE = 0.27
WANT_PER_FAMILY = 3
STOP_AFTER = 6                      # consecutive failures before giving up

MATH_FAMILIES = ["which_expression", "must_be_true", "work_backwards",
                 "in_context", "compare"]
VERBAL_FAMILIES = ["must_be_true", "not_except", "compare"]

PROSE = re.compile(r"[A-Za-z]{2,}")


def value_answers(qs):
    """Can this recognition be asked as a grid-in at all?

    A grid-in has the student type a value, so a recognition whose answers
    are sentences cannot have one. "Which conclusion the survey supports"
    sits in the maths section - Problem-Solving and Data Analysis - and its
    answers are full claims; asking for grid-in versions of it would have
    produced nonsense questions and spent the calls to do it.

    The test is prose, not digits. Matching digits looked right and was
    wrong: the choices on "pythagorean missing side" are written $3\sqrt{5}$
    and the like, so a digits-only test threw out the most obviously
    numeric recognitions in the bank. A value answer is short and mostly
    symbols however it is typeset; a claim is a sentence. Counting words
    outside the maths separates them and does not care about notation.
    """
    seen = value = 0
    for q in qs:
        for choice in (q.get("choices") or [])[:4]:
            text = re.sub(r"\$[^$]*\$", " ", str(choice))   # drop the maths
            text = re.sub(r"\\[a-zA-Z]+", " ", text)         # and bare LaTeX
            seen += 1
            if len(PROSE.findall(text)) < 4:
                value += 1
    return seen > 0 and value / seen >= 0.6


def bank():
    """What is actually servable, plus what is queued unverified.

    Both count: a cell with eight unverified EXCEPT questions in it does not
    need eight more written on top.
    """
    items = json.load(open(os.path.join(ROOT, "data", "practice.json")))["items"]
    out = list(items)
    bankdir = os.path.join(ROOT, "data", "bank")
    for name in sorted(os.listdir(bankdir)) if os.path.isdir(bankdir) else []:
        if not name.endswith(".json"):
            continue
        try:
            out += json.load(open(os.path.join(bankdir, name)))
        except Exception:
            continue
    return out


def plan():
    items = bank()
    by_sub = collections.defaultdict(list)
    for it in items:
        if it.get("subtype"):
            by_sub[it["subtype"]].append(it)

    skill_of, name_of = {}, {}
    for it in items:
        s = it.get("subtype")
        if s and s not in skill_of and it.get("skill_cd"):
            skill_of[s] = it["skill_cd"]
            name_of[s] = it.get("subtype_name") or s

    jobs = []
    for slug, qs in sorted(by_sub.items()):
        if slug not in skill_of:
            continue                       # no skill code: cannot author it
        section = qs[0].get("section", "math")
        is_math = section == "math"
        fams = collections.Counter(q.get("phrasing") or "direct" for q in qs)
        fmts = collections.Counter(q.get("format") or "mc" for q in qs)

        if is_math and value_answers(qs):
            short = max(3, round(len(qs) * GRID_SHARE)) - fmts.get("grid", 0)
            if short > 0:
                jobs.append({"subtype": slug, "name": name_of[slug],
                             "skill_cd": skill_of[slug], "fmt": "grid",
                             "phrasing": None, "n": min(short, 8),
                             "empty": fmts.get("grid", 0) == 0})

        for fam in (MATH_FAMILIES if is_math else VERBAL_FAMILIES):
            short = WANT_PER_FAMILY - fams.get(fam, 0)
            if short > 0:
                jobs.append({"subtype": slug, "name": name_of[slug],
                             "skill_cd": skill_of[slug], "fmt": "mc",
                             "phrasing": fam, "n": short,
                             "empty": fams.get(fam, 0) == 0})

    # Grid-ins first, then cells with NOTHING of that kind, then by name.
    #
    # Grid-ins have to lead. There are five wording jobs per recognition to
    # every one grid-in job, so sorting by name alone buries them: a round
    # that ran alphabetically wrote 269 cells and the grid-in share of our
    # maths went DOWN, 15.9% to 13.2%, because the wording work grew the
    # denominator faster than the grid-ins grew the numerator. The target is
    # a share of a moving total, so the only way to converge on it is to
    # close the grid gap before adding more multiple choice.
    jobs.sort(key=lambda j: (j["fmt"] != "grid", not j["empty"], j["subtype"]))
    return jobs


def run(job, model):
    cmd = [sys.executable, os.path.join(HERE, "author_items.py"),
           "--skill", job["skill_cd"], "--subtype", job["subtype"],
           "--difficulty", "M", "--n", str(job["n"]), "--model", model,
           "--format", job["fmt"],
           "--seed", str(abs(hash(job["subtype"] + str(job["phrasing"]))) % 99991)]
    if job["phrasing"]:
        cmd += ["--phrasing", job["phrasing"]]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if proc.returncode != 0:
        return False, (proc.stderr or proc.stdout).strip()[-200:]
    first = proc.stdout.strip().splitlines()
    return True, first[0] if first else "wrote items"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", choices=("grid", "mc"),
                    help="author only grid-ins, or only the wording families")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    jobs = plan()
    if args.only:
        jobs = [j for j in jobs if j["fmt"] == args.only]
    if args.limit:
        jobs = jobs[:args.limit]
    total = sum(j["n"] for j in jobs)
    empty = sum(1 for j in jobs if j["empty"])
    print(f"{total} questions across {len(jobs)} cells "
          f"({empty} where that kind does not exist at all)")

    if args.dry_run:
        for j in jobs[:40]:
            what = "grid-in" if j["fmt"] == "grid" else j["phrasing"]
            mark = "NEW " if j["empty"] else "    "
            print(f"  {mark}+{j['n']:2d}  {what:18s} {j['name'][:48]}")
        if len(jobs) > 40:
            print(f"  ... and {len(jobs) - 40} more")
        return 0

    done = failed = streak = 0
    stopped = False
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run, j, args.model): j for j in jobs}
        for n, fut in enumerate(as_completed(futures), 1):
            job = futures[fut]
            what = "grid-in" if job["fmt"] == "grid" else job["phrasing"]
            label = f"[{n}/{len(jobs)}] {job['subtype']} {what} +{job['n']}"
            try:
                ok, msg = fut.result()
            except Exception as exc:
                ok, msg = False, str(exc)[-200:]
            if ok:
                done += 1
                streak = 0
                print(f"{label:62s} {msg}")
            else:
                failed += 1
                streak += 1
                print(f"{label:62s} FAILED {msg}")
            if streak >= STOP_AFTER and not stopped:
                stopped = True
                print(f"\n{streak} cells in a row failed - stopping rather than "
                      f"working through the rest of the queue.")
                for f in futures:
                    f.cancel()
                break

    print(f"\n{done} cells written, {failed} failed")
    if stopped:
        print("rerun when the usage limit resets; it picks up where it stopped")
    print("now run: verify_items.py, then build_bank_index.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
