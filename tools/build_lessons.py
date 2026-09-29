#!/usr/bin/env python3
"""
Compile the authored lessons into data/lessons.json.

Validates as it goes, because a lesson that references a skill code the bank
does not have would silently never be shown to anyone: the engine looks the
skill up to get its section and frequency, finds nothing, and scores it zero.
That is a failure mode with no error message, so it is checked here instead.
"""
import json, os, sys, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, "lessons"))

MODULES = ["rw_core", "rw_evidence", "rw_grammar", "math_algebra", "triage"]
TIERS = {"E", "M", "H"}
WHEN_KEYS = {"unseen", "struggling", "mastered", "missed", "count"}


def load_skills():
    path = os.path.join(ROOT, "data", "skills.json")
    if not os.path.exists(path):
        return {}, []
    blob = json.load(open(path))
    return ({s["skill_cd"]: s for s in blob["skills"]},
            blob.get("incomplete_domains", []))


def validate(lesson, skills, incomplete, problems, warnings):
    lid = lesson["id"]
    cd = lesson.get("skill_cd")

    if cd is None:
        if not lesson.get("pinned"):
            problems.append(f"{lid}: no skill_cd and not pinned - nothing would show it")
        if not lesson.get("section"):
            warnings.append(f"{lid}: pinned lesson with no section, will show in both")
    elif cd not in skills:
        # Distinguish a typo from a domain that simply has not downloaded yet.
        domain = cd.split(".")[0]
        if domain in incomplete:
            warnings.append(f"{lid}: skill {cd} not verifiable yet ({domain} still downloading)")
        else:
            problems.append(f"{lid}: unknown skill_cd {cd!r}")

    seen_ids = set()
    for s in lesson["sections"]:
        sid = f"{lid}/{s.get('id')}"
        if not s.get("id"):
            problems.append(f"{lid}: a section has no id")
        elif s["id"] in seen_ids:
            problems.append(f"{sid}: duplicate section id")
        seen_ids.add(s.get("id"))

        if not s.get("heading"):
            problems.append(f"{sid}: no heading")
        if not s.get("body"):
            problems.append(f"{sid}: no body")
        if s.get("tier") and s["tier"] not in TIERS:
            problems.append(f"{sid}: bad tier {s['tier']!r}")
        band = s.get("band")
        if band and (len(band) != 2 or band[0] >= band[1]):
            problems.append(f"{sid}: bad band {band!r}")
        when = s.get("when")
        if when:
            unknown = set(when) - WHEN_KEYS
            if unknown:
                problems.append(f"{sid}: unknown gate(s) {sorted(unknown)}")

    # A lesson every one of whose sections is gated can render empty.
    if not any(s.get("always") for s in lesson["sections"]):
        warnings.append(f"{lid}: no 'always' section - can render empty for some students")


def main():
    skills, incomplete = load_skills()
    lessons, problems, warnings = [], [], []

    for name in MODULES:
        mod = importlib.import_module(name)
        for lesson in mod.LESSONS:
            lesson.setdefault("type", "lesson")
            lesson.setdefault("source", "original")
            lesson.setdefault("license", "proprietary")
            validate(lesson, skills, incomplete, problems, warnings)
            skill = skills.get(lesson.get("skill_cd"))
            if skill and not lesson.get("section"):
                lesson["section"] = skill["section"]
            lessons.append(lesson)

    ids = [l["id"] for l in lessons]
    for i in set(ids):
        if ids.count(i) > 1:
            problems.append(f"duplicate lesson id {i!r}")

    for w in warnings:
        print(f"  warn  {w}")
    for p in problems:
        print(f"  ERROR {p}")
    if problems:
        sys.exit(f"\n{len(problems)} problem(s); nothing written")

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "lessons.json"), "w") as fh:
        json.dump({"lessons": lessons}, fh, indent=1)

    print(f"\n{'lesson':22} {'skill':7} {'sec':5} {'type':9} sections  gated")
    for l in lessons:
        gated = sum(1 for s in l["sections"] if s.get("band") or s.get("tier") or s.get("when"))
        print(f"{l['id']:22} {str(l.get('skill_cd')):7} {str(l.get('section')):5} "
              f"{l['type']:9} {len(l['sections']):8}  {gated}")
    total = sum(len(l["sections"]) for l in lessons)
    gated = sum(1 for l in lessons for s in l["sections"]
                if s.get("band") or s.get("tier") or s.get("when"))
    print(f"\n{len(lessons)} lessons, {total} sections, {gated} adaptive "
          f"({gated / total:.0%})")
    print("wrote data/lessons.json")


if __name__ == "__main__":
    main()
