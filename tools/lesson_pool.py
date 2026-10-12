#!/usr/bin/env python3
"""
Questions for a teacher's generated lesson - teacher portal only.

A lesson that works the same items the student already practised is a lesson
the student can sit through on memory. So the planner names a recognition and
a few bank items as the *model*, and this writes fresh ones against them:
same recognition, same trap, different numbers.

Two things make it a pool rather than a list.

  * It is over-provisioned. The planner's timing says eight items; this writes
    thirteen or fourteen, because a teacher reading a question five minutes
    before a session needs to be able to drop one without the block falling
    apart.
  * It spreads across tiers - one below the block's target, the target, one
    above - so she can take the lesson up or down once she sees who turned up.
    She picks. Nothing here decides for her.

The pool is written to data/lesson_pool/, NOT data/bank/. That separation is
the whole point: anything in the bank is something a student can meet in
practice, and an item written to be worked on a shared screen with a teacher
talking over it should never also show up in a solo round two days later.
stage_public_data.py is an allowlist, so this directory is private by
construction rather than by anyone remembering to exclude it.

  python3 tools/lesson_pool.py --subtype flat-figure-plug-in --difficulty M --n 8
"""
import argparse, json, os, re, subprocess, sys, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
POOL = os.path.join(ROOT, "data", "lesson_pool")

LADDER = ["F", "E", "M", "H", "X"]

# How far over the asked-for count to go. The planner's number is what fills
# the minutes; the teacher's number is what lets her choose, and those are not
# the same number.
OVER = 1.7
MIN_PER_TIER = 2


def load(*parts, default=None):
    p = os.path.join(ROOT, "data", *parts)
    return json.load(open(p)) if os.path.exists(p) else (default or {})


def spread(difficulty, n):
    """Tier -> how many to write, centred on the block's target.

    The target tier alone has to cover the block with room to drop a couple.
    That is the part worth stating: the neighbours are not a way of making up
    the count. A teacher who takes the lesson exactly as planned should never
    find herself short two questions and reaching into the Hard set to fill
    the gap - that is not a choice, that is the tool having rounded down.

    The neighbours are smaller, but never trivial: two items at a tier is
    enough to tell whether a student is actually there, one is a coin toss.
    """
    i = LADDER.index(difficulty) if difficulty in LADDER else 2
    out = {LADDER[i]: max(MIN_PER_TIER, int(round(n * OVER)))}
    side = max(MIN_PER_TIER, int(round(n * 0.4)))
    for j in (i - 1, i + 1):
        if 0 <= j < len(LADDER):
            out[LADDER[j]] = side
    return out


# ---------------------------------------------------------------------------
# Resolving a recognition back to the skill the authoring tool wants
# ---------------------------------------------------------------------------

def resolve(subtype=None, skill_cd=None, exam="sat"):
    """(skill_cd, subtype) for the authoring tool, from whatever the portal has.

    The planner speaks in subtype slugs because that is what a recognition is.
    author_items.py speaks in College Board skill codes because that is what
    the item bank is keyed by. One of them has to do the translation and it
    should not be the model.
    """
    if skill_cd and not subtype:
        return skill_cd, None
    if exam == "act":
        tax = load("act", "taxonomy.json", default={"subtypes": {}})["subtypes"]
        meta = tax.get(subtype)
        if not meta:
            raise ValueError(f"unknown ACT subtype {subtype!r}")
        return skill_cd or meta.get("skill"), subtype

    skills = load("skills.json", default={"skills": []})["skills"]
    by_name = {s["skill_name"]: s["skill_cd"] for s in skills}
    for name, entry in load("subtypes.json", default={"skills": {}})["skills"].items():
        for st in entry["subtypes"]:
            if st["slug"] == subtype:
                cd = by_name.get(st.get("skill")) or by_name.get(name)
                if not cd:
                    raise ValueError(f"no skill code for {subtype!r}")
                return cd, subtype
    raise ValueError(f"unknown subtype {subtype!r}")


def seeds(item_ids, exam="sat", limit=3):
    """The bank items the new ones are modelled on."""
    if not item_ids:
        return []
    wanted = set(item_ids)
    found = []
    name = os.path.join("act", "questions.json") if exam == "act" else "practice.json"
    for it in load(name, default={"items": []})["items"]:
        if it["id"] in wanted:
            found.append({k: it.get(k) for k in
                          ("id", "stimulus", "stem", "choices", "answer",
                           "difficulty", "subtype")})
        if len(found) >= limit:
            break
    return found


# ---------------------------------------------------------------------------
# "Different numbers" has to be checked, not assumed
# ---------------------------------------------------------------------------

_WORD = re.compile(r"[a-z0-9]+")


def shingles(text):
    words = _WORD.findall((text or "").lower())
    return {tuple(words[i:i + 4]) for i in range(max(0, len(words) - 3))}


def too_close(item, against, threshold=0.55):
    """Reject a variant that is the model with the serial numbers filed off.

    Twins are supposed to be close - same recognition, same trap - so the test
    is not whether the wording rhymes. It is whether the whole stem, numbers
    included, is substantially the thing the student already sat. A high
    overlap on four-word runs means the model changed the frame and not the
    problem.
    """
    mine = shingles(f"{item.get('stimulus') or ''} {item.get('stem') or ''}")
    if not mine:
        return False
    for other in against:
        theirs = shingles(f"{other.get('stimulus') or ''} {other.get('stem') or ''}")
        if not theirs:
            continue
        overlap = len(mine & theirs) / min(len(mine), len(theirs))
        if overlap >= threshold:
            return True
    return False


# ---------------------------------------------------------------------------

def author(skill_cd, subtype, tier, n, modelled, model="claude-opus-5-5"):
    """One authoring run, into the lesson pool rather than the bank."""
    os.makedirs(POOL, exist_ok=True)
    stem = subtype or skill_cd.replace(".", "")
    out_path = os.path.join(POOL, f"{stem}-{tier}.json")
    before = set()
    if os.path.exists(out_path):
        before = {i["id"] for i in json.load(open(out_path))}

    cmd = [sys.executable, os.path.join(TOOLS, "author_items.py"),
           "--skill", skill_cd, "--difficulty", tier, "--n", str(n),
           "--kind", "twins", "--model", model,
           "--seed", str(int(time.time() * 1000) % 100000),
           "--out-dir", POOL]
    if subtype:
        cmd += ["--subtype", subtype]

    tmp = None
    if modelled:
        fd, tmp = tempfile.mkstemp(suffix=".json", prefix="lesson-model-")
        with os.fdopen(fd, "w") as fh:
            json.dump(modelled, fh)
        cmd += ["--modelled-on", tmp]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout)[-400:] or "authoring failed")
    if not os.path.exists(out_path):
        raise RuntimeError("the authoring tool wrote no items")

    written = json.load(open(out_path))
    fresh = [i for i in written if i["id"] not in before]

    # Same verification the bank gets. A question that is going up on a shared
    # screen with a teacher reading it out is the worst place to discover that
    # two choices are defensible.
    subprocess.run(
        [sys.executable, os.path.join(TOOLS, "verify_items.py"),
         "--file", out_path, "--skip-originality"],
        capture_output=True, text=True, timeout=900)
    verified = {i["id"]: i for i in json.load(open(out_path))}
    return [verified[i["id"]] for i in fresh
            if verified.get(i["id"], {}).get("status") == "verified"]


def build(subtype=None, skill_cd=None, difficulty="M", n=8, exam="sat",
          item_ids=None, model="claude-opus-5-5"):
    """The pool for one lesson block, tier by tier."""
    skill_cd, subtype = resolve(subtype, skill_cd, exam)
    modelled = seeds(item_ids or [], exam)
    plan = spread(difficulty, n)

    # Everything the student could already have met for this recognition, so
    # "different numbers" can be enforced rather than hoped for.
    name = os.path.join("act", "questions.json") if exam == "act" else "practice.json"
    known = [it for it in load(name, default={"items": []})["items"]
             if it.get("subtype") == subtype]

    tiers, rejected = [], 0
    for tier in LADDER:
        want = plan.get(tier)
        if not want:
            continue
        # Ask for a couple extra: some will come back too close to the model.
        got = author(skill_cd, subtype, tier, want + 2, modelled, model)
        keep = []
        for item in got:
            if too_close(item, known + keep):
                rejected += 1
                continue
            keep.append(item)
        if keep:
            tiers.append({"difficulty": tier, "wanted": want, "items": keep[:want + 2]})

    if not tiers:
        raise RuntimeError("nothing survived verification; no questions were written")
    return {
        "subtype": subtype, "skill_cd": skill_cd, "exam": exam,
        "target": difficulty, "asked_for": n,
        "tiers": tiers,
        "total": sum(len(t["items"]) for t in tiers),
        "modelled_on": [m["id"] for m in modelled],
        "rejected_as_too_close": rejected,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--subtype")
    ap.add_argument("--skill")
    ap.add_argument("--exam", default="sat", choices=("sat", "act"))
    ap.add_argument("--difficulty", default="M", choices=LADDER)
    ap.add_argument("--n", type=int, default=8, help="items the block needs")
    ap.add_argument("--modelled-on", nargs="*", default=[],
                    help="bank item ids the variants should be built against")
    ap.add_argument("--model", default="claude-opus-5-5")
    args = ap.parse_args()
    if not (args.subtype or args.skill):
        ap.error("give --subtype or --skill")
    out = build(args.subtype, args.skill, args.difficulty, args.n,
                args.exam, args.modelled_on, args.model)
    for tier in out["tiers"]:
        print(f"{tier['difficulty']}: {len(tier['items'])} "
              f"(block needs {tier['wanted']})")
    print(f"{out['total']} questions for a block that needs {out['asked_for']}; "
          f"{out['rejected_as_too_close']} rejected as too close to the bank")


if __name__ == "__main__":
    main()
