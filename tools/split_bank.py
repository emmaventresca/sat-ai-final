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
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BANKS = {
    "sat": os.path.join(ROOT, "data", "practice.json"),
    "act": os.path.join(ROOT, "data", "act", "questions.json"),
}

# What the index carries. Everything here is used to DECIDE what to show;
# anything used to show it belongs in a chunk.
INDEX_FIELDS = ("id", "section", "skill", "skill_cd", "subtype",
                "subtype_name", "difficulty", "format", "phrasing")

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

    index, chunks = [], {}
    for it in items:
        entry = {k: it[k] for k in INDEX_FIELDS if it.get(k) is not None}
        # Which chunk to fetch. Stored rather than recomputed in the browser
        # so the two can never disagree about how a slug becomes a filename.
        entry["chunk"] = chunk_name(it.get("subtype"))
        entry["teaser"] = teaser(it)
        index.append(entry)
        chunks.setdefault(entry["chunk"], []).append(it)

    json.dump({"items": index}, open(os.path.join(out_dir, "index.json"), "w"))
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
        "biggest": biggest,
    }


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
        print(f"     a student opening one recognition downloads the index "
              f"plus one chunk; the largest is {size / 1e3:.0f}KB ({name})")
        total["index"] += stats["index_mb"]
    print(f"\nfirst load is now {total['index']:.2f}MB for both exams, "
          f"against 19MB before")
    return 0


if __name__ == "__main__":
    sys.exit(main())
