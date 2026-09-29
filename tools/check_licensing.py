#!/usr/bin/env python3
"""
Guard against publishing College Board's expression.

The failure this catches is specific and has happened once already: a *derived*
artifact quietly carrying the source's prose. The answer keys looked like a
table of letters and also held a rationale field, so 1.64 million characters of
CB text were staged for a public repository.

Run before pushing:  python3 tools/check_licensing.py
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Phrases that only appear in College Board's own rationale prose.
PROSE = [
    "is the best answer because",
    "is the best answer.",
    "Choice A is incorrect",
    "Choice B is incorrect",
    "Choice C is incorrect",
    "Choice D is incorrect",
    "may result from conceptual errors",
]

# Paths that must never be tracked.
FORBIDDEN = [
    re.compile(r"^corpus/bank/"),
    re.compile(r"^corpus/tests/.*\.pdf$"),
    re.compile(r"^corpus/tests/.*-explanations\.json$"),
    re.compile(r"^data/items\.json$"),
]


def tracked():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT,
                         capture_output=True, text=True, check=True)
    return [p for p in out.stdout.splitlines() if p]


def main():
    problems = []
    files = tracked()

    for path in files:
        for rx in FORBIDDEN:
            if rx.match(path):
                problems.append(f"{path}: must not be tracked (College Board content)")

    for path in files:
        full = os.path.join(ROOT, path)
        if not os.path.exists(full) or os.path.getsize(full) > 8_000_000:
            continue
        # Skip the documents that necessarily quote these phrases to explain them.
        if path in ("docs/LICENSING.md", "tools/check_licensing.py",
                    "tools/parse_explanations.py", "tools/build_keys.py"):
            continue
        try:
            text = open(full, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        for phrase in PROSE:
            if phrase in text:
                problems.append(f"{path}: contains College Board rationale prose "
                                f"({phrase!r})")
                break

    # Every lesson must declare where it came from.
    lessons_path = os.path.join(ROOT, "data", "lessons.json")
    if os.path.exists(lessons_path):
        for l in json.load(open(lessons_path))["lessons"]:
            if not l.get("source") or not l.get("license"):
                problems.append(f"lesson {l['id']}: missing source/license")
            if l.get("license", "").upper().startswith("CC BY-NC"):
                problems.append(f"lesson {l['id']}: non-commercial licence - "
                                f"must be stripped before this is monetised")

    print(f"checked {len(files)} tracked files")
    if problems:
        print()
        for p in problems:
            print(f"  PROBLEM  {p}")
        print(f"\n{len(problems)} problem(s). See docs/LICENSING.md.")
        sys.exit(1)
    print("no College Board expression in tracked files")
    print("see docs/LICENSING.md for the full inventory")


if __name__ == "__main__":
    main()
