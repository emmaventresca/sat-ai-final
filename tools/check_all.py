#!/usr/bin/env python3
"""Every guard, in one command.

Each of these exists because something shipped broken: items we could not
legally serve, a module calling a name it never imported, a question naming a
table it did not show. Running them one at a time means forgetting one.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKS = ["check_licensing.py", "check_derived.py", "check_books.py",
          "check_imports.py", "check_figures.py"]


def main():
    failed = []
    for name in CHECKS:
        print(f"\n=== {name} " + "=" * (56 - len(name)))
        if subprocess.run([sys.executable, str(ROOT / "tools" / name)]).returncode:
            failed.append(name)
    print()
    if failed:
        print(f"FAILED: {', '.join(failed)}")
        return 1
    print(f"all {len(CHECKS)} guards pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
