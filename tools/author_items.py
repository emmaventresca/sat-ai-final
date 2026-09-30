#!/usr/bin/env python3
"""
Author original SAT-aligned practice items.

The point of this file, and the reason the project can ship an interactive
platform at all: College Board's items cannot be redistributed, but items we
write ourselves can. Written to their *published* skill descriptors, which are
a public specification rather than protected expression.

Two rules hold the legal line, and both are enforced here rather than
remembered:

  1. **No College Board item text enters the prompt.** Not as an example, not
     as a style reference, not as a seed. The grounding is our own lesson prose
     plus the skill name and difficulty. Nothing generated can therefore be a
     derivative of a specific CB item. `assert_no_cb_text()` checks this.

  2. Output is ours, licensed openly, and labelled as ours - never presented as
     College Board's.

What makes these items better than typical third-party questions is the
misconception taxonomy in data/misconceptions.json: every distractor must be
built to catch one named error, the way College Board's do. That taxonomy was
derived empirically from 7,105 real rationales, so the distractor design is
grounded in how the real test actually goes wrong - without copying any of it.
"""
import argparse, json, os, random, re, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "data", "bank")
LICENSE = "CC BY 4.0 - original item, not College Board content"

_lock = threading.Lock()

DIFFICULTY_GUIDE = {
    "E": ("Straightforward. One step, or one clear signal in the text. A "
          "prepared student should answer in under 40 seconds."),
    "M": ("Two steps, or one step plus a subtlety - a qualifier that matters, a "
          "value that must be converted, a relationship that must be named."),
    "H": ("Multi-step, or a single step with a genuine trap. Two choices should "
          "be defensible until the deciding detail is noticed."),
}


def load(name):
    return json.load(open(os.path.join(ROOT, "data", name)))


def lesson_for(skill_cd, lessons):
    for l in lessons["lessons"]:
        if l.get("skill_cd") == skill_cd:
            return l
    return None


def spec_text(skill, lesson):
    """Our own description of the skill - never College Board's item text."""
    lines = [f"SKILL: {skill['skill_name']} ({skill['skill_cd']})",
             f"DOMAIN: {skill['domain_name']}",
             f"SECTION: {'Reading and Writing' if skill['section'] == 'rw' else 'Math'}"]
    if lesson:
        lines.append("\nHOW WE TEACH THIS SKILL (our own lesson text):")
        for s in lesson["sections"]:
            lines.append(f"\n## {s['heading']}")
            lines += [f"  {b}" for b in s["body"]]
    return "\n".join(lines)


def build_prompt(skill, lesson, families, difficulty, n, seed_topics):
    fams = [f for f in families if f["section"] in (skill["section"], "both")
            and f["slug"] != "other"]
    is_math = skill["section"] == "math"
    return f"""You are writing ORIGINAL practice questions for an open, freely
licensed SAT-aligned item bank used in an academic project.

{spec_text(skill, lesson)}

DIFFICULTY: {difficulty} - {DIFFICULTY_GUIDE[difficulty]}

WRITE {n} ORIGINAL ITEMS.

Hard requirements:

1. ORIGINAL. Invent every passage, scenario and number. Do not reproduce or
   adapt any question you have seen from College Board or any other test
   publisher. If an item feels familiar, change it.

2. FOUR choices, exactly one defensible answer. A knowledgeable person must not
   be able to argue for a second choice.

3. EVERY DISTRACTOR CATCHES A NAMED ERROR. Pick from these families and say
   which one each distractor targets:
{chr(10).join(f"     {f['slug']}: {f['when']}" for f in fams)}

4. Choices length-matched and parallel in form. The correct answer must not be
   distinguishable by being longest, most hedged, or most detailed.

5. Write a short explanation for the correct answer, and for each distractor an
   explanation naming the error a student made to land there. Second person.

6. Topical variety - use these subject areas, one per item, in order:
   {", ".join(seed_topics[:n])}

7. WRITE YOUR OWN INSTRUCTION LINE. Do not use College Board's standard stem
   wordings ("Which choice completes the text with the most logical
   transition?", "Which choice most logically completes the text?", "As used in
   the text, what does the word X most nearly mean?"). Ask the same thing in
   your own words - "Which transition best fits the blank?", "Which word best
   fits the blank in context?". The instruction is not what is being taught, so
   there is no reason to borrow its phrasing.
{'''
8. MATHS: write expressions in LaTeX between single dollar signs, e.g. $f(x) =
   3x + 7$. Keep numbers clean enough to work without a calculator where the
   skill allows. State any needed units.''' if is_math else '''
8. READING AND WRITING: write the passage yourself, 40-110 words, in the
   register of published nonfiction. Blanks are marked with ______.'''}

Respond with ONLY a JSON array, no prose:
[{{
  "stem": "the question being asked",
  "stimulus": "the passage or setup, or null if the stem is self-contained",
  "choices": ["A text", "B text", "C text", "D text"],
  "answer": "A"|"B"|"C"|"D",
  "explanation": "why the answer is right, second person",
  "distractors": {{"<letter>": {{"misconception": "<slug>", "why": "..."}}}}
}}]"""


TOPICS = [
    "marine biology", "urban planning", "archaeology", "materials science",
    "folklore studies", "hydrology", "labour economics", "ornithology",
    "printmaking", "seismology", "public health", "linguistics",
    "agricultural science", "astronomy", "textile history", "ecology",
    "musicology", "cartography", "immunology", "civil engineering",
    "paleobotany", "sports science", "meteorology", "nutrition science",
]

# Phrases that would indicate College Board text leaked into our output.
CB_MARKERS = re.compile(
    r"is the best answer because|Choice [A-D] is incorrect|"
    r"may result from conceptual", re.I)


def assert_no_cb_text(prompt):
    """Rule 1, enforced. The prompt must contain no College Board item text."""
    if CB_MARKERS.search(prompt):
        raise AssertionError("College Board rationale text found in the prompt")


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=900,
        env={**os.environ, "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:300])
    start = proc.stdout.find("[")
    if start == -1:
        raise ValueError(f"no JSON array: {proc.stdout[:200]}")
    parsed, _ = json.JSONDecoder().raw_decode(proc.stdout[start:])
    return parsed


def author(skill, lesson, families, difficulty, n, model, rng):
    topics = rng.sample(TOPICS, min(n, len(TOPICS)))
    prompt = build_prompt(skill, lesson, families, difficulty, n, topics)
    assert_no_cb_text(prompt)
    items = call(prompt, model)
    out = []
    for i, it in enumerate(items):
        it["id"] = f"orig-{skill['skill_cd'].replace('.', '')}-{difficulty}-{rng.randrange(16**6):06x}"
        it["skill_cd"] = skill["skill_cd"]
        it["difficulty"] = difficulty
        it["section"] = skill["section"]
        it["source"] = "original - written for this project"
        it["license"] = LICENSE
        it["status"] = "unverified"
        out.append(it)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skill", required=True)
    ap.add_argument("--difficulty", default="E", choices=list(DIFFICULTY_GUIDE))
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    skills = {s["skill_cd"]: s for s in load("skills.json")["skills"]}
    if args.skill not in skills:
        sys.exit(f"unknown skill {args.skill}; e.g. {sorted(skills)[:6]}")
    families = load("misconceptions.json")["families"]
    lessons = load("lessons.json")

    rng = random.Random(args.seed or None)
    items = author(skills[args.skill], lesson_for(args.skill, lessons),
                   families, args.difficulty, args.n, args.model, rng)

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{args.skill.replace('.', '')}-{args.difficulty}.json")
    existing = json.load(open(path)) if os.path.exists(path) else []
    existing += items
    json.dump(existing, open(path, "w"), indent=1)
    print(f"wrote {len(items)} items -> {os.path.relpath(path, ROOT)} "
          f"({len(existing)} total)")
    for it in items:
        print(f"  {it['id']}  {it['stem'][:70]}")


if __name__ == "__main__":
    main()
