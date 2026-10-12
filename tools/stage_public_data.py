#!/usr/bin/env python3
"""Copy ONLY the data files a student's browser is allowed to have.

The first version of this symlinked data/ into the build's public folder,
which would have published data/items.json - 18MB of College Board's item
bank, git-ignored precisely because serving it to students is the line this
project does not cross (docs/LICENSING.md section 4). A convenient symlink
is how that kind of thing ships.

So the published set is an allowlist, not an exclusion list. An exclusion
list fails open: add a new file to data/ and it goes out by default. This
fails closed - a file nobody has named here never reaches the browser.

    python3 tools/stage_public_data.py
"""
import json, os, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data")
DEST = os.path.join(ROOT, "apps", "web", "public", "data")

# Everything the student and teacher apps actually fetch. Our own content
# only: authored items under CC BY, and the derived taxonomies.
# The banks ship SPLIT: a light index plus one chunk per recognition. The
# whole-bank files stay out of the published set deliberately - shipping
# 19MB of question bodies to render a list of topic names is what made this
# unusable on a school network, which is the one place it has to work.
PUBLISH = [
    "sat/index.json",
    "act/index.json",
    "act/taxonomy.json",
    "bands.json",
    "lessons.json",
    "subtypes.json",
    "subtype_counts.json",
    "misconceptions.json",
    "skills.json",              # domain grouping, for the journey map
    "difficulty_style.json",
]

# Named so the check below can say WHY, rather than just refusing.
FORBIDDEN = {
    "items.json": "College Board's item bank - cannot be served to students",
    "bank": "unverified and failed items, which never reach a student",
    "standard_stems.json": "an analysis artefact, not content",
    "book_provenance.json": "an analysis artefact, not content",
    "agent_feed.json": "internal tooling telemetry",
    "lesson_pool": ("questions written for a teacher's generated lesson. They "
                    "are variants of bank items - same recognition, different "
                    "numbers - and the point of them is that a student meets "
                    "them once, on a shared screen, with a teacher talking "
                    "over them. Serving them in practice too would undo that."),
}


# Directories copied wholesale: the per-recognition chunks, which are too
# many to name one by one and are all our own content by construction - they
# are produced from the published banks by tools/split_bank.py.
PUBLISH_DIRS = ["sat/q", "act/q", "lessons"]


def main():
    if os.path.isdir(DEST) or os.path.islink(DEST):
        if os.path.islink(DEST):
            os.unlink(DEST)
        else:
            shutil.rmtree(DEST)

    copied, missing = [], []
    for rel in PUBLISH:
        src = os.path.join(SRC, rel)
        if not os.path.exists(src):
            missing.append(rel)
            continue
        dst = os.path.join(DEST, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        copied.append((rel, os.path.getsize(src)))

    for rel in PUBLISH_DIRS:
        src = os.path.join(SRC, rel)
        if not os.path.isdir(src):
            missing.append(rel)
            continue
        dst = os.path.join(DEST, rel)
        shutil.copytree(src, dst)
        size = sum(os.path.getsize(os.path.join(dst, f)) for f in os.listdir(dst))
        copied.append((f"{rel}/ ({len(os.listdir(dst))} files)", size))

    # Belt and braces: if anything forbidden is sitting in the staged folder,
    # stop. The allowlist should make this impossible, which is exactly why
    # it is worth checking.
    leaked = []
    for root, _dirs, files in os.walk(DEST):
        for name in files:
            rel = os.path.relpath(os.path.join(root, name), DEST)
            for bad, why in FORBIDDEN.items():
                if rel == bad or rel.startswith(bad + os.sep):
                    leaked.append(f"{rel}: {why}")
    if leaked:
        print("REFUSING TO PUBLISH:")
        for line in leaked:
            print(f"  {line}")
        return 1

    total = sum(size for _, size in copied)
    print(f"staged {len(copied)} file(s), {total / 1e6:.1f}MB -> "
          f"{os.path.relpath(DEST, ROOT)}")
    for rel, size in sorted(copied, key=lambda c: -c[1]):
        print(f"  {size / 1e6:6.2f}MB  {rel}")
    if missing:
        print(f"\nnot found (build them first): {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
