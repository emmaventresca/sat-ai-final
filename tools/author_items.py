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
sys.path.insert(0, HERE)
from agentlog import run                                # noqa: E402
from cli import call_json_array                         # noqa: E402
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


def subtype_spec(st, patterns):
    """The brief for one subtype: what it is, how it is recognised and solved,
    and what it is designed to catch. This is what makes an authored item a
    specific recognition rather than a generic question about the skill."""
    lines = [
        f"SUBTYPE: {st['name']} ({st['slug']})",
        f"HOW A STUDENT RECOGNISES IT: {st['tell']}",
        f"THE METHOD: {st['method']}",
        f"THE TRAP IT IS BUILT TO CATCH: {st['trap']}",
    ]
    if st.get("desmos"):
        lines.append(f"DESMOS: {st['desmos']}")
    if st.get("count_total"):
        lines.append(f"FREQUENCY: {st['count_total']} of this skill's questions "
                     f"are this subtype "
                     f"(E{st['count_e']}/M{st['count_m']}/H{st['count_h']})")
    if patterns:
        lines.append("\nPASSAGE CONSTRUCTION PATTERNS to build in, where they fit "
                     "naturally. Use at least one:")
        for p in patterns:
            lines.append(f"  - {p['name']}: {p['what']}")
    return "\n".join(lines)


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


# The instruction line the real test uses for each skill. Recognising it is
# part of what a student is practising, and these are standard boilerplate
# (data/standard_stems.json), so items use them verbatim.
SKILL_STEMS = {
    "TRA": "Which choice completes the text with the most logical transition?",
    "WIC": "Which choice completes the text with the most logical and precise word or phrase?",
    "BOU": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "FSS": "Which choice completes the text so that it conforms to the conventions of Standard English?",
    "SYN": None,   # the goal statement carries the instruction
    "CID": "Which choice best states the main idea of the text?",
    "TSP": "Which choice best states the main purpose of the text?",
    "INF": "Which choice most logically completes the text?",
    "COE": None,
    "CTC": "Based on the texts, both authors would most likely agree with which statement?",
}


def focus_block(families, focus):
    """Aim the distractors at the error this student keeps making.

    Reinforcement rounds exist because one wrong move keeps recurring. A set
    of ten that never offers that move again does not test whether they have
    stopped making it.
    """
    if not focus:
        return ""
    by = {f["slug"]: f for f in families}
    named = [by[s] for s in focus if s in by]
    if not named:
        return ""
    lines = "\n".join(f"     {f['slug']}: {f['when']}" for f in named)
    return ("0. AIM AT THESE ERRORS. This student keeps making them, so every\n"
            "   item must offer at least one distractor that is exactly this\n"
            "   move - tempting, not obviously wrong:\n" + lines + "\n\n")


GRID_RULES = """
THIS IS A STUDENT-PRODUCED RESPONSE SET. There are NO answer choices. The
student types the answer into a box, so:

  - There is nothing to eliminate and nothing to backsolve from. The question
    must be answerable forwards, and must have a determinate answer.
  - Give every acceptable form in "keys": the exact decimal, a truncated and
    a rounded four-character decimal where the value does not terminate, and
    the fraction in lowest terms. 15/17 and .8823 and .8824 are all the same
    answer and all three must be accepted.
  - The answer must be a single number. No units, no commas, no percent
    signs, no mixed numbers, no variables. If the natural answer is negative
    or longer than six characters, change the numbers.
  - "If the question has more than one correct answer, give only one" is a
    real format on this exam. Use it where the mathematics genuinely allows
    several, and then set "any_of" true and put several in "keys".

The distractor taxonomy still applies, because the point of it is diagnosis.
Instead of four choices, give "common_errors": the WRONG VALUES a student
actually produces here, each with the misconception it comes from. Those are
what the app matches a wrong entry against, so they must be the values the
named error really yields - compute them, do not invent them.
"""


def build_prompt(skill, lesson, families, difficulty, n, seed_topics,
                 subtype=None, patterns=None, focus=None, fmt="mc"):
    stem_line = SKILL_STEMS.get(skill["skill_cd"])
    stem_line = (f'"{stem_line}"' if stem_line else
                 "write the instruction the test would use for this skill, in "
                 "its plain standard form")
    fams = [f for f in families if f["section"] in (skill["section"], "both")
            and f["slug"] != "other"]
    is_math = skill["section"] == "math"
    return f"""You are writing ORIGINAL practice questions for an open, freely
licensed SAT-aligned item bank used in an academic project.

{spec_text(skill, lesson)}

{subtype_spec(subtype, patterns) if subtype else ""}

DIFFICULTY: {difficulty} - {DIFFICULTY_GUIDE[difficulty]}

WRITE {n} ORIGINAL ITEMS.

Hard requirements:

1. ORIGINAL. Invent every passage, scenario and number. Do not reproduce or
   adapt any question you have seen from College Board or any other test
   publisher. If an item feels familiar, change it.

{"2. ONE defensible answer, reachable by a correct method. A knowledgeable person must not be able to argue for a different value." if fmt == "grid" else "2. FOUR choices, exactly one defensible answer. A knowledgeable person must not be able to argue for a second choice."}

3. EVERY ITEM MUST BE THIS SUBTYPE. A student should be able to read it and
   recognise the subtype from the tell above. Do not drift into a neighbouring
   subtype of the same skill.

{focus_block(families, focus)}4. EVERY DISTRACTOR CATCHES A NAMED ERROR. Pick from these families and say
   which one each distractor targets. At least one distractor per item must
   be the subtype's own trap, described above:
{chr(10).join(f"     {f['slug']}: {f['when']}" for f in fams)}

{"5. Nothing in the wording may give the answer away, and nothing may make it ambiguous - say what form you want only when the mathematics leaves a real choice." if fmt == "grid" else "5. Choices length-matched and parallel in form. The correct answer must not be distinguishable by being longest, most hedged, or most detailed."}

{"6. Write a short explanation of the method, second person, and list the wrong values a student actually produces with the error each comes from." if fmt == "grid" else "6. Write a short explanation for the correct answer, and for each distractor an explanation naming the error a student made to land there. Second person."}

7. Topical variety - use these subject areas, one per item, in order:
   {", ".join(seed_topics[:n])}

8. {"ASK IT PLAINLY. A student-produced response has no instruction line of its own - the question simply asks for the value." if fmt == "grid" else "USE THE REAL INSTRUCTION LINE. For this skill, ask the question exactly as the test asks it:"}

       {"" if fmt == "grid" else stem_line}

   Recognising the real stem is part of the skill, so do not paraphrase it.
   These lines are standard boilerplate - see data/standard_stems.json. Every
   other word of the item must be yours.
{'''
9. MATHS: write expressions in LaTeX between single dollar signs, e.g. $f(x) =
   3x + 7$. Keep numbers clean enough to work without a calculator where the
   skill allows. State any needed units.''' if is_math else '''
9. READING AND WRITING: write the passage yourself, 40-110 words, in the
   register of published nonfiction. Blanks are marked with ______.'''}

{FIGURE_RULES}
{GRID_RULES if fmt == "grid" else ""}
Respond with ONLY a JSON array, no prose:
{GRID_SHAPE if fmt == "grid" else MC_SHAPE}"""


# ---------------------------------------------------------------------------
# Figures
#
# A large share of the real test shows the student something: a two-way table,
# a bar graph, a scatterplot with a line of best fit. Those questions cannot
# be written as prose - "the bar for week 3 reaches the 10th gridline" does
# the reading for the student and leaves them arithmetic - so the item carries
# a declarative spec the app draws.
#
# Specs are small on purpose. Anything we cannot draw is the same as no
# picture at all, so check_figures.py rejects it and the item is dropped
# rather than shipped unanswerable.
# ---------------------------------------------------------------------------

FIGURE_RULES = """
10. SHOWING SOMETHING. If the question needs the student to READ a display -
   a table, a bar graph, a scatterplot - give it one. Never describe the
   picture in words ("the bar reaches the 4th gridline"): that does the
   reading for them. Two ways to do it:

   TABLE: write it in the stimulus as pipe rows, header row first, with a
   short caption line directly above it. Nothing else on those lines.

       Average Corn Yield (bushels per acre)
       Season type | Bare soil | After rye
       Wet | 182 | 176
       Dry | 131 | 154

   CHART: set "figure" to one of these, and leave the picture out of the
   stimulus prose entirely.

       {"type":"bar","caption":"...","x_label":"...","y_label":"...",
        "categories":["A","B"],"values":[12,18],
        "y_min":0,"y_max":24,"y_step":3,"alt":"..."}

       {"type":"scatter","caption":"...","x_label":"...","y_label":"...",
        "points":[[1,4],[2,7]],"x_min":0,"x_max":10,"x_step":2,
        "y_min":0,"y_max":20,"y_step":5,"alt":"..."}

       "line" joins the points in order; "curve" draws a smooth sampled curve
       with no point markers (sample 40+ points yourself).

   Every value the question asks about must land exactly on a gridline, so
   choose y_step to divide your values. Set "figure" to null when the question
   needs no display - most do not.
"""

MC_SHAPE = """[{
  "stem": "the question being asked",
  "stimulus": "the passage or setup, or null if the stem is self-contained",
  "figure": null,
  "choices": ["A text", "B text", "C text", "D text"],
  "answer": "A"|"B"|"C"|"D",
  "explanation": "why the answer is right, second person",
  "distractors": {"<letter>": {"misconception": "<slug>", "why": "..."}}
}]"""

GRID_SHAPE = """[{
  "stem": "the question being asked",
  "stimulus": "the passage or setup, or null if the stem is self-contained",
  "figure": null,
  "keys": ["every acceptable form of the answer, as strings"],
  "any_of": false,
  "explanation": "how to get there, second person",
  "common_errors": [{"value": "17/15", "misconception": "<slug>",
                     "why": "what the student did to land here"}]
}]"""

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


FIGURE_TYPES = {"bar", "line", "scatter", "curve"}


def clean_figure(fig):
    """Keep a figure only if it is one we can actually draw.

    A spec the renderer skips leaves a question that says "based on the bar
    graph" with no bar graph - worse than no figure at all, because the item
    still reads as if there were one. Dropping it here means check_figures.py
    catches the item instead of a student catching it.
    """
    if not isinstance(fig, dict) or fig.get("type") not in FIGURE_TYPES:
        return None
    if fig["type"] == "bar":
        cats, vals = fig.get("categories"), fig.get("values")
        if not isinstance(cats, list) or not isinstance(vals, list):
            return None
        if not cats or len(cats) != len(vals):
            return None
        if not all(isinstance(v, (int, float)) for v in vals):
            return None
        return fig
    pts = fig.get("points")
    if not isinstance(pts, list) or len(pts) < 2:
        return None
    if not all(isinstance(p, list) and len(p) == 2
               and all(isinstance(v, (int, float)) for v in p) for p in pts):
        return None
    return fig


def assert_no_cb_text(prompt):
    """Rule 1, enforced. The prompt must contain no College Board item text."""
    if CB_MARKERS.search(prompt):
        raise AssertionError("College Board rationale text found in the prompt")


def call(prompt, model):
    return call_json_array(prompt, model)


def author(skill, lesson, families, difficulty, n, model, rng,
           subtype=None, patterns=None, focus=None, fmt="mc"):
    topics = rng.sample(TOPICS, min(n, len(TOPICS)))
    prompt = build_prompt(skill, lesson, families, difficulty, n, topics,
                          subtype, patterns, focus, fmt)
    assert_no_cb_text(prompt)
    items = call(prompt, model)
    out = []
    for i, it in enumerate(items):
        tag = (subtype["slug"][:14] if subtype
               else skill["skill_cd"].replace(".", ""))
        it["id"] = f"orig-{tag}-{difficulty}-{rng.randrange(16**6):06x}"
        it["skill_cd"] = skill["skill_cd"]
        it["subtype"] = subtype["slug"] if subtype else None
        it["subtype_name"] = subtype["name"] if subtype else None
        it["difficulty"] = difficulty
        it["section"] = skill["section"]
        it["source"] = "original - written for this project"
        it["license"] = LICENSE
        it["format"] = fmt
        it["status"] = "unverified"
        fig = clean_figure(it.get("figure"))
        if fig:
            it["figure"] = fig
        else:
            it.pop("figure", None)
        out.append(it)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skill", required=True)
    ap.add_argument("--subtype", help="slug from data/subtypes.json")
    ap.add_argument("--list-subtypes", action="store_true")
    ap.add_argument("--difficulty", default="E", choices=list(DIFFICULTY_GUIDE))
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--format", default="mc", choices=("mc", "grid"),
                    dest="fmt",
                    help="grid: student-produced response, no answer choices. "
                         "27%% of the real math section.")
    ap.add_argument("--misconceptions",
                    help="comma-separated family slugs to aim the distractors "
                         "at - used when a student keeps making one error")
    args = ap.parse_args()

    skills = {s["skill_cd"]: s for s in load("skills.json")["skills"]}
    if args.skill not in skills:
        sys.exit(f"unknown skill {args.skill}; e.g. {sorted(skills)[:6]}")
    families = load("misconceptions.json")["families"]
    lessons = load("lessons.json")

    skill = skills[args.skill]
    # The taxonomy is keyed by skill name. Match it exactly first: the prefix
    # fallback below picks whichever key comes first, and "Linear equations in
    # two variables" shares its first eighteen characters with "Linear
    # equations in one variable" - so every subtype of the larger skill
    # resolved against the wrong entry and came back "unknown subtype".
    tax = load("subtypes.json")["skills"]
    entry = tax.get(skill["skill_name"])
    if entry is None:
        entry = next((v for k, v in tax.items()
                      if v.get("section") == skill["section"]
                      and k.lower().startswith(skill["skill_name"].lower()[:18])), None)

    if args.list_subtypes:
        if not entry:
            sys.exit(f"no subtypes derived for {skill['skill_name']!r}")
        for st in entry["subtypes"]:
            print(f"  {st['count_total']:4}  {st['slug']:34} {st['name'][:44]}")
        return

    subtype = None
    if args.subtype:
        subtype = next((st for st in (entry or {}).get("subtypes", [])
                        if st["slug"] == args.subtype), None)
        if not subtype:
            sys.exit(f"unknown subtype {args.subtype!r}; try --list-subtypes")

    patterns = None
    if skill["section"] == "rw":
        pp = load("passage_patterns.json")["skills"].get(skill["skill_name"], {})
        patterns = pp.get("patterns", [])[:4]

    rng = random.Random(args.seed or None)
    with run("author", skill=args.skill, subtype=args.subtype,
             difficulty=args.difficulty, model=args.model, asked=args.n,
             fmt=args.fmt) as r:
        items = author(skill, lesson_for(args.skill, lessons),
                       families, args.difficulty, args.n, args.model, rng,
                       subtype, patterns,
                       focus=[f.strip() for f in (args.misconceptions or "").split(",") if f.strip()],
                       fmt=args.fmt)
        r.count(authored=len(items))
        if len(items) < args.n:
            r.note(f"asked for {args.n}, got {len(items)}")

    os.makedirs(OUT_DIR, exist_ok=True)
    stem = (args.subtype if args.subtype else args.skill.replace(".", ""))
    # Grid-ins live in their own file: they are a different format of the same
    # recognition, and keeping them apart means a cell's counts stay readable.
    suffix = "-grid" if args.fmt == "grid" else ""
    path = os.path.join(OUT_DIR, f"{stem}-{args.difficulty}{suffix}.json")
    existing = json.load(open(path)) if os.path.exists(path) else []
    existing += items
    json.dump(existing, open(path, "w"), indent=1)
    print(f"wrote {len(items)} items -> {os.path.relpath(path, ROOT)} "
          f"({len(existing)} total)")
    for it in items:
        print(f"  {it['id']}  {it['stem'][:70]}")


if __name__ == "__main__":
    main()
