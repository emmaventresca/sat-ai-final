#!/usr/bin/env python3
"""
A lesson for every subtype, built from the taxonomy rather than written.

The engine already diagnoses at subtype level, but the lessons were still one
per published skill - so a student told "you are losing the systems questions
that ask for x+y" had nowhere to go but a lesson covering all seven kinds of
system. These are the parallel lessons: one per recognition, so what the
diagnosis names is what the student can open.

Nothing here is generated at build time. Every section is assembled from
fields already derived and checked - the tell, the method, the Desmos route,
the trap, and the measured counts - which keeps 181 lessons consistent, free,
and traceable to the corpus. Anything genuinely new to say belongs in the
hand-written skill lessons, which stay.
"""
import json, os, re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIER_NAME = {"E": "Easy", "M": "Medium", "H": "Hard"}


def load(name):
    return json.load(open(os.path.join(ROOT, "data", name)))


def sentences(text, limit=6):
    """Split a derived field into teachable lines without mangling decimals."""
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", str(text).strip())
    return [p.strip() for p in parts if len(p.strip()) > 8][:limit]


def dominant_tier(st):
    counts = {"E": st.get("count_e", 0), "M": st.get("count_m", 0), "H": st.get("count_h", 0)}
    return max(counts, key=counts.get) if any(counts.values()) else "M"


def build(st, skill_name, skill_cd, section):
    total = st.get("count_total", 0)
    e, m, h = st.get("count_e", 0), st.get("count_m", 0), st.get("count_h", 0)
    dom = dominant_tier(st)

    sections = []

    # Where it sits - the planning fact first, as in the skill lessons.
    where = []
    if total:
        where.append(
            f"**{total} of the official questions in {skill_name} are this one** "
            f"— {e} Easy, {m} Medium, {h} Hard.")
        if h and h >= 2 * max(e, 1):
            where.append(
                "It is top-heavy: most versions are Hard, so it only earns study "
                "time once your target actually requires that tier.")
        elif e and e >= 2 * max(h, 1):
            where.append(
                "It is bottom-heavy, which makes it cheap points. Secure it early.")
        else:
            where.append(f"Most versions sit at the {TIER_NAME[dom]} tier.")
    else:
        where.append("This pattern appears rarely. Learn to recognise it, but do "
                     "not spend a session on it.")
    sections.append({"id": "where", "always": True,
                     "heading": "Where this sits for you", "body": where})

    tell = sentences(st.get("tell"))
    if tell:
        sections.append({"id": "spot", "always": True,
                         "heading": "How to spot it",
                         "body": ["You are looking at this pattern when:"] + 
                                 [f"- {t}" for t in tell]})

    method = sentences(st.get("method"))
    if method:
        sections.append({"id": "method", "always": True,
                         "heading": "The method",
                         "body": [f"- {s}" for s in method]})

    desmos = st.get("desmos")
    if desmos and str(desmos).strip().lower() not in ("none", "null", ""):
        sections.append({"id": "desmos", "tier": "M",
                         "heading": "Where Desmos fits",
                         "body": sentences(desmos, 4)})

    trap = sentences(st.get("trap"), 4)
    if trap:
        sections.append({"id": "trap", "always": True,
                         "heading": "What it is built to catch", "body": trap})
        # Surfaced again, harder, once they have actually fallen for it.
        sections.append({
            "id": "trap-again",
            "when": {"struggling": {"tier": dom, "below": 0.7}},
            "heading": "You are losing these",
            "body": ["Before you choose, say out loud what the question is "
                     "asking for — not what you solved for."] + trap[:2]})

    return {
        "id": f"lesson-sub-{st['slug']}",
        "skill_cd": skill_cd,
        "subtype": st["slug"],
        "section": section,
        "type": "lesson",
        "title": st["name"],
        "subtitle": f"{skill_name} · {total} official questions"
                    if total else skill_name,
        "source": "derived from the subtype taxonomy",
        "license": "CC BY 4.0",
        "sections": sections,
    }


def main():
    tax = load("subtypes.json")["skills"]
    skills = {s["skill_name"]: s for s in load("skills.json")["skills"]}

    out, skipped = [], 0
    for skill_name, v in tax.items():
        sk = skills.get(skill_name)
        if not sk:
            skipped += 1
            continue
        for st in v["subtypes"]:
            if not st.get("tell") or not st.get("method"):
                skipped += 1
                continue
            out.append(build(st, skill_name, sk["skill_cd"], sk["section"]))

    path = os.path.join(ROOT, "data", "subtype_lessons.json")
    json.dump({"lessons": out}, open(path, "w"), indent=1)

    by_section = Counter(l["section"] for l in out)
    gated = sum(1 for l in out for s in l["sections"] if s.get("when") or s.get("tier"))
    print(f"{len(out)} subtype lessons -> data/subtype_lessons.json")
    print(f"  {dict(by_section)}  |  {gated} adaptive sections  |  {skipped} skipped")
    print(f"  sections per lesson: "
          f"{sum(len(l['sections']) for l in out) / max(len(out),1):.1f} average")


if __name__ == "__main__":
    main()
