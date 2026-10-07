#!/usr/bin/env python3
"""A question that names a picture has to show one.

Items are authored as text, so it is easy to write "the bar graph shows the
results" and ship nothing to look at - or worse, to describe the picture in
prose ("week 3 reaches the 10th gridline"), which does the reading for the
student and leaves them arithmetic. Both shipped before this check existed.

A reference counts as satisfied by a pipe table in the stimulus or a `figure`
spec on the item. Descriptions of a graph that no one needs to see - "the
graph of f passes through (4, 23)" - are not references to a display, so the
pattern below deliberately requires a deictic: the table *shows*, data *from*
the graph, *shown in* the figure.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANKS = ["data/practice.json", "data/act/questions.json"]

DISPLAY = r"(table|graph|chart|figure|bar graph|scatterplot|histogram|diagram)"
REFERS = re.compile(
    rf"(data (from|in) the {DISPLAY}"
    rf"|the {DISPLAY} (shows|shown|above|below|displays|presents|gives)"
    rf"|(shown|given|represented) in the {DISPLAY}"
    rf"|according to the {DISPLAY}"
    rf"|based on the {DISPLAY})",
    re.I,
)
# Prose that stands in for a picture instead of being one.
NARRATES = re.compile(r"\b(gridlines?|the \d+(st|nd|rd|th) (horizontal|vertical) line)\b", re.I)



def has_pipe_table(stim):
    """A table is a run of two or more consecutive lines carrying a pipe.

    Items write them both ways - with markdown's outer pipes and without - so
    counting pipes per line is the wrong test; adjacency is the right one.
    """
    run = 0
    for line in stim.split("\n"):
        run = run + 1 if "|" in line else 0
        if run >= 2:
            return True
    return False


FIGURE_TYPES = {"bar", "line", "scatter", "curve"}


def has_display(item):
    # The stem as well as the stimulus: a short data question often has no
    # passage at all and carries its table in the question itself, and
    # looking only at the stimulus called 33 of those unanswerable.
    both = f"{item.get('stimulus') or ''}\n{item.get('stem') or ''}"
    if "<table" in both or has_pipe_table(both):
        return True
    # Already-rendered displays, which is how the ACT bank carries them.
    if item.get("figure_html"):
        return True
    figures = item.get("figures")
    if isinstance(figures, list) and figures:
        return True
    fig = item.get("figure")
    return isinstance(fig, dict) and fig.get("type") in FIGURE_TYPES


def check_figure(item):
    """A spec we cannot draw is the same as no picture at all."""
    # The ACT bank's specs are drawn by the ACT project's own renderers at
    # import time, and anything they refused never got this far.
    if item.get("figure_html"):
        return []
    fig = item.get("figure")
    if not isinstance(fig, dict):
        return []
    t = fig.get("type")
    if t not in FIGURE_TYPES:
        return [f"figure type {t!r} is not one we draw"]
    if t == "bar":
        cats, vals = fig.get("categories") or [], fig.get("values") or []
        if not cats or len(cats) != len(vals):
            return [f"bar figure has {len(cats)} categories and {len(vals)} values"]
    elif not fig.get("points"):
        return [f"{t} figure has no points"]
    return []


def main():
    bad = []
    seen = 0
    for rel in BANKS:
        path = ROOT / rel
        if not path.exists():
            continue
        for item in json.loads(path.read_text()).get("items", []):
            seen += 1
            text = f"{item.get('stimulus') or ''}\n{item.get('stem') or ''}"
            where = f"{rel}:{item['id']}"
            if REFERS.search(text) and not has_display(item):
                bad.append(f"{where}: names a display but shows none")
            if NARRATES.search(text):
                bad.append(f"{where}: describes the picture in prose instead of drawing it")
            bad += [f"{where}: {m}" for m in check_figure(item)]

    print(f"checked {seen} items")
    if bad:
        print(f"\n{len(bad)} problem(s):")
        for b in bad:
            print(f"  {b}")
        return 1
    print("every question that names a table or a graph shows one")
    return 0


if __name__ == "__main__":
    sys.exit(main())
