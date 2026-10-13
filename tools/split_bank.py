#!/usr/bin/env python3
"""Split each bank into a light index and per-recognition chunks.

The app was shipping 19MB of question bodies to open a page that shows a
list of topic names. On a school network - the one place this has to work,
and the reason every library is vendored rather than fetched from a CDN -
that is the difference between a tool and a spinner.

Almost nothing needs the bodies. The journey map, the assign picker, the
ranking engine and the teacher's metrics all work off id, section, skill,
recognition, level and wording: 1.2MB for both exams together. The stem,
the passage, the choices, the explanations and the drawn figures are only
needed once a student opens one recognition, so they travel per recognition.

    python3 tools/split_bank.py
    -> data/<exam>/index.json          every question, named but not written
    -> data/<exam>/q/<subtype>.json    the bodies, one file per recognition
"""
import json, os, re, shutil, sys
from datetime import date
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BANKS = {
    "sat": os.path.join(ROOT, "data", "practice.json"),
    "act": os.path.join(ROOT, "data", "act", "questions.json"),
}

# What the index carries. Everything here is used to DECIDE what to show;
# anything used to show it belongs in a chunk.
INDEX_FIELDS = ("id", "section", "skill", "skill_cd", "subtype",
                "subtype_name", "difficulty", "format", "phrasing",
                # One line on what the recognition tests. The ACT bank
                # carries it; it is what a stop shows before there is a
                # written page for it.
                "tests",
                # Which passage a question hangs off, and what kind of
                # passage it is. Both are DECISIONS, not display: the serving
                # order groups a Reading round by passage so a student reads
                # one passage and answers ten questions on it rather than
                # meeting a fresh passage every question, and passage type is
                # a dimension of its own - a student can be fine on Craft &
                # Structure in a science passage and lost in prose fiction,
                # which a topic average hides completely.
                "passage_id", "passage_type")

# One line of the stem, so a picker can show WHICH question without pulling
# the body. Ninety characters across both banks costs about half a megabyte
# and is the difference between a usable list and a list of identical rows -
# forty transition questions all read "Which choice completes the text...".
TEASER = 110
MATH = re.compile(r"\$[^$]*\$")


def teaser(item):
    text = MATH.sub("…", item.get("stem") or "")
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:TEASER] + ("…" if len(text) > TEASER else "")

SAFE = re.compile(r"[^a-z0-9-]+")


def chunk_name(subtype):
    """A filename for a recognition, or the bucket for questions without one."""
    if not subtype:
        return "_unsorted"
    return SAFE.sub("-", str(subtype).lower()).strip("-") or "_unsorted"


def first_seen(exam, ids):
    """When each question entered the bank.

    The bank gains questions constantly, and a student who has worked
    through a recognition should be told when new ones land rather than
    having to notice the count went up. Nothing in the item records this, so
    it is kept beside the bank: ids already known keep their date, ids that
    are new get today.

    Written back every run, so a question added this morning is still marked
    new tomorrow and not re-dated.
    """
    path = os.path.join(ROOT, "data", exam, "added.json")
    known = {}
    if os.path.exists(path):
        known = json.load(open(path))
    today = date.today().isoformat()
    # The first ever run would mark the whole bank as new, which would mean
    # a student's first visit screams NEW at all 4,275 questions. Treat a
    # cold start as "already here".
    cold = not known
    for qid in ids:
        if qid not in known:
            known[qid] = "" if cold else today
    # Drop anything no longer in the bank, so the file does not grow forever.
    known = {k: v for k, v in known.items() if k in ids}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(known, open(path, "w"))
    return known, sum(1 for v in known.values() if v == today)


def traps_of(item):
    """The misconception slugs this question's wrong answers are built on.

    Lifted into the INDEX rather than left in the body, because a drill on
    "you keep flipping the inequality" has to select questions by the error
    they punish, and selecting by that in the browser would otherwise mean
    downloading all 47MB of bodies to read a handful of slugs.

    Deduplicated and sorted so the index is stable between builds - an index
    that churns on every rebuild makes every diff unreadable.
    """
    found = set()
    for v in (item.get("distractors") or {}).values():
        if isinstance(v, dict) and v.get("misconception"):
            found.add(str(v["misconception"]))
    for e in item.get("common_errors") or []:
        if isinstance(e, dict) and e.get("misconception"):
            found.add(str(e["misconception"]))
    return sorted(found)


def split(exam, path):
    if not os.path.exists(path):
        return None
    items = json.load(open(path))["items"]
    out_dir = os.path.join(ROOT, "data", exam)
    chunks_dir = os.path.join(out_dir, "q")
    # Rebuilt from scratch: a recognition that loses its last question should
    # lose its file too, or the app keeps serving questions the bank dropped.
    if os.path.isdir(chunks_dir):
        shutil.rmtree(chunks_dir)
    os.makedirs(chunks_dir, exist_ok=True)

    seen, fresh = first_seen(exam, {it["id"] for it in items})

    index, chunks, vocab = [], {}, {}
    for it in items:
        entry = {k: it[k] for k in INDEX_FIELDS if it.get(k) is not None}
        # Which chunk to fetch. Stored rather than recomputed in the browser
        # so the two can never disagree about how a slug becomes a filename.
        entry["chunk"] = chunk_name(it.get("subtype"))
        entry["teaser"] = teaser(it)
        # Stored as indices into a per-file vocabulary. The slugs repeat
        # across thousands of questions, so writing them out in full added
        # about 600KB to an index every student downloads first.
        traps = traps_of(it)
        if traps:
            entry["traps"] = [vocab.setdefault(t, len(vocab)) for t in traps]
        if seen.get(it["id"]):
            entry["added"] = seen[it["id"]]
        index.append(entry)
        chunks.setdefault(entry["chunk"], []).append(it)

    json.dump({
        "items": index,
        # slug -> id, so the browser can read `traps` without the bodies.
        "traps": [slug for slug, _ in sorted(vocab.items(), key=lambda kv: kv[1])],
    }, open(os.path.join(out_dir, "index.json"), "w"))
    for name, rows in chunks.items():
        json.dump({"items": rows},
                  open(os.path.join(chunks_dir, f"{name}.json"), "w"))

    index_size = os.path.getsize(os.path.join(out_dir, "index.json"))
    body = sum(os.path.getsize(os.path.join(chunks_dir, f))
               for f in os.listdir(chunks_dir))
    biggest = max(
        (os.path.getsize(os.path.join(chunks_dir, f)), f)
        for f in os.listdir(chunks_dir))
    return {
        "items": len(items), "chunks": len(chunks),
        "index_mb": index_size / 1e6, "body_mb": body / 1e6,
        "biggest": biggest, "fresh": fresh,
    }


def split_lessons():
    """One file per recognition's written page.

    Every stop on the map was fetching all 183 pages - half a megabyte - to
    show one. Same argument as the bank: what a page costs should be what
    the student is actually reading.
    """
    src = os.path.join(ROOT, "data", "subtype_lessons.json")
    if not os.path.exists(src):
        return None
    out_dir = os.path.join(ROOT, "data", "lessons")
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    lessons = json.load(open(src))["lessons"]
    for lesson in lessons:
        name = chunk_name(lesson.get("subtype"))
        json.dump(lesson, open(os.path.join(out_dir, f"{name}.json"), "w"))
    total = sum(os.path.getsize(os.path.join(out_dir, f))
                for f in os.listdir(out_dir))
    return len(lessons), total


def main():
    os.makedirs(os.path.join(ROOT, "data", "sat"), exist_ok=True)
    total = Counter()
    for exam, path in BANKS.items():
        stats = split(exam, path)
        if not stats:
            print(f"{exam}: no bank at {os.path.relpath(path, ROOT)}")
            continue
        size, name = stats["biggest"]
        print(f"{exam}: {stats['items']} questions -> "
              f"index {stats['index_mb']:.2f}MB + "
              f"{stats['chunks']} chunks ({stats['body_mb']:.1f}MB total)")
        if stats["fresh"]:
            print(f"     {stats['fresh']} added today, and marked new for "
                  f"students who have already been through that recognition")
        print(f"     a student opening one recognition downloads the index "
              f"plus one chunk; the largest is {size / 1e3:.0f}KB ({name})")
        total["index"] += stats["index_mb"]
    lessons = split_lessons()
    if lessons:
        count, size = lessons
        print(f"\nlessons: {count} pages -> one file each "
              f"({size / 1e6:.2f}MB total, read one at a time)")
    print(f"\nfirst load is now {total['index']:.2f}MB for both exams, "
          f"against 19MB before")
    return 0


if __name__ == "__main__":
    sys.exit(main())
