#!/usr/bin/env python3
"""
Fold the classifier's labels back into data/items.json.

Only high-confidence labels are treated as authoritative. Measured against a
second model on a 240-item sample, Sonnet's "high" labels agreed 91% of the
time and its "low" labels 57% - so the confidence flag is well calibrated, and
low-confidence labels are stored but marked unreliable rather than used to
drive anything a student sees.
"""
import json, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LABELS = os.path.join(ROOT, "corpus", "classify", "labels.jsonl")
ITEMS = os.path.join(ROOT, "data", "items.json")
TAXONOMY = os.path.join(ROOT, "data", "misconceptions.json")


def main():
    if not os.path.exists(LABELS):
        raise SystemExit("no labels yet - run tools/classify_misconceptions.py")

    labels = {}
    for line in open(LABELS):
        if line.strip():
            r = json.loads(line)
            labels[r["id"]] = r

    blob = json.load(open(ITEMS))
    items = blob["items"]
    fams = {f["slug"]: f for f in json.load(open(TAXONOMY))["families"]}

    applied = Counter()
    n_items = 0
    for it in items:
        parts = it.get("per_choice") or {}
        tags, low = {}, {}
        for letter in parts:
            if letter == "correct":
                continue
            lab = labels.get(f"{it['id']}:{letter}")
            if not lab or lab["family"] == "other":
                continue
            if lab["confidence"] == "high":
                tags[letter] = lab["family"]
                applied[lab["family"]] += 1
            else:
                low[letter] = lab["family"]
        if tags:
            it["misconceptions"] = tags
            n_items += 1
        elif "misconceptions" in it:
            del it["misconceptions"]
        if low:
            it["misconceptions_low_confidence"] = low

    blob["misconception_taxonomy"] = TAXONOMY
    json.dump(blob, open(ITEMS, "w"))

    print(f"{n_items} of {len(items)} items carry at least one high-confidence tag "
          f"({n_items / len(items):.0%})")
    print(f"{sum(applied.values())} wrong choices tagged\n")
    for slug, n in applied.most_common():
        print(f"  {n:5}  {slug:30} {fams[slug]['label'][:54]}")


if __name__ == "__main__":
    main()
