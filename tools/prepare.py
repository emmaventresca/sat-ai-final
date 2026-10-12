#!/usr/bin/env python3
"""Make a fresh clone runnable: build the derived bank, then stage it.

`data/practice.json` and `data/act/questions.json` are committed; the split
indexes, the per-recognition chunks and the lesson pages are generated from
them and gitignored, because they are 47MB of derivable duplication.

Nothing rebuilt them on a clean checkout. A fresh clone therefore started,
staged 2MB of taxonomy, printed "not found (build them first)" and served an
app with no SAT questions at all - which is the whole app. This runs the
split first when its outputs are missing, so `npm run dev` is genuinely the
only command needed.

Idempotent and quick on an already-built tree: it checks for the outputs and
skips straight to staging.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

# What split_bank.py produces. Any one missing means the split has not run.
BUILT = [
    os.path.join(DATA, "sat", "index.json"),
    os.path.join(DATA, "sat", "q"),
    os.path.join(DATA, "act", "q"),
    os.path.join(DATA, "lessons"),
]


def run(tool):
    proc = subprocess.run([sys.executable, os.path.join(HERE, tool)],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(f"{tool} failed:\n{proc.stderr[-800:]}\n")
        return False
    return True


def main():
    missing = [p for p in BUILT if not os.path.exists(p)]
    if missing:
        print(f"first run: building the bank from source "
              f"({len(missing)} of {len(BUILT)} outputs missing)...")
        if not run("split_bank.py"):
            sys.stderr.write(
                "\nCould not build the question bank. The app will start but "
                "will have no questions.\n")
            return 1
    return 0 if run("stage_public_data.py") else 1


if __name__ == "__main__":
    sys.exit(main())
