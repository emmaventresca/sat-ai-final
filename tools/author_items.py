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
    "F": ("Groundwork, BELOW the exam's easiest level. Not an SAT question: "
          "the single skill the recognition rests on, with the test wrapped "
          "off. One step, plain numbers, no scenario unless the scenario IS "
          "the skill. A student who cannot do this cannot start the real "
          "question, and telling them to try harder on Easy is how a tool "
          "tells someone their problem is unfixable."),
    "E": ("Straightforward. One step, or one clear signal in the text. A "
          "prepared student should answer in under 40 seconds."),
    "M": ("Two steps, or one step plus a subtlety - a qualifier that matters, a "
          "value that must be converted, a relationship that must be named."),
    "H": ("Multi-step, or a single step with a genuine trap. Two choices should "
          "be defensible until the deciding detail is noticed."),
    "X": ("Beyond the hardest the exam asks. For a student who already wins "
          "the Hard tier and is reaching for the last few marks: more steps "
          "than a Hard question, or a second-order trap that survives the "
          "first correct insight. Still fair, still one defensible answer, "
          "still solvable in about two minutes by someone who sees it."),
}


def style_brief(section, difficulty):
    """What an official question at this tier actually looks like, measured.

    "Make it feel like a real one" is the hardest instruction to give a
    writer, because the thing wanted is a register rather than a rule. These
    are counts off the College Board corpus, so the brief can be checked
    instead of hoped for. Built by tools/derive_difficulty_style.py.
    """
    path = os.path.join(ROOT, "data", "difficulty_style.json")
    if not os.path.exists(path):
        return ""
    blob = json.load(open(path))
    tiers = blob.get("sections", {}).get(section, {})
    # Extra hard has no measurements of its own - nothing in the corpus is
    # labelled that - so it is described as a step beyond Hard.
    base = "H" if difficulty in ("X", "F") else difficulty
    t = tiers.get(base)
    if not t:
        return ""

    def med(k):
        return t[k].get("median", t[k].get("share", 0))

    lines = [
        f"HOW AN OFFICIAL {base} QUESTION IN THIS SECTION MEASURES "
        f"(medians over {t['items']} real items):",
        f"  question: {med('stem_words'):.0f} words",
    ]
    if med("stimulus_words"):
        lines.append(f"  passage/setup: {med('stimulus_words'):.0f} words")
    lines += [
        f"  conditions to hold at once: about {t['clauses']['mean']:.1f}",
        f"  steps in the official explanation: about "
        f"{t['rationale_sentences']['mean']:.1f}",
        f"  share with no answer choices: {t['grid_in']['share']:.0%}",
    ]
    if difficulty == "X":
        lines.append("  YOU ARE WRITING ABOVE THIS. Take the step count past "
                     "the Hard figure; do not take the word count past it. "
                     "Longer is not harder - more to hold at once is.")
    elif difficulty == "F":
        lines.append("  YOU ARE WRITING FAR BELOW THIS. One step, no setup.")
    else:
        lines.append("  Land near these. A question that runs long reads as "
                     "a different tier even when the mathematics is right.")
    return "\n".join(lines) + "\n"


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


def modelled_block(modelled_on, kind):
    """Write questions aimed at the ones a student actually got wrong.

    These are our own items, so the shape can be used directly - there is
    nothing to launder. What matters is the instruction attached to it, and
    the two kinds want opposite things:

      twins    reproduce the structure and the trap, change everything else.
               The closest honest thing to "that question again" without
               testing whether they remember the answer.
      cousins  same recognition, deliberately a different route in, so a
               student who has learnt one worked pattern is caught out.
    """
    if not modelled_on:
        return ""
    lines = []
    for i, m in enumerate(modelled_on[:3], 1):
        lines.append(f"  QUESTION {i}")
        if m.get("stimulus"):
            lines.append(f"    setup:  {str(m['stimulus'])[:400]}")
        lines.append(f"    asks:   {str(m.get('stem',''))[:300]}")
        if m.get("error"):
            lines.append(f"    the student went wrong by: {m['error']}")
    body = "\n".join(lines)
    if kind == "cousins":
        return (f"""
0. A STUDENT KEEPS MISSING THESE. They are ours, shown so you can go a
   DIFFERENT way. Same recognition, a different route in - a different given,
   a different direction of reasoning, a different surface. A student who has
   memorised one worked pattern should not be able to coast through yours.
   Do not reuse these scenarios, numbers or phrasings.

{body}

""")
    return (f"""
0. A STUDENT KEEPS MISSING THESE. They are ours, shown so you can write the
   closest honest thing to "that question again": keep the STRUCTURE and the
   TRAP, change the scenario, the numbers, the names and the wording
   completely. They must not be recognisable as the same question, and must
   go wrong in the same way for the same reason.

{body}

""")


# ---------------------------------------------------------------------------
# Wording families
#
# A dimension of its own, separate from topic. A student can lose every
# "which of the following must be true" across six different subjects, and a
# topic-only breakdown hides it completely - which is why the bank tracks it.
#
# It also turned out to be the biggest hole in the bank's VARIETY: 105 of 181
# recognitions had only one wording family, and the whole bank carried eight
# "EXCEPT" questions. A student who has only ever met a recognition phrased
# directly has not met the way the test actually asks it.
# ---------------------------------------------------------------------------
PHRASING_BRIEF = {
    "must_be_true": (
        "Phrase every item as a MUST-BE-TRUE question: give a situation or a "
        "relationship and ask which statement must be true, rather than "
        "asking for a value. The work is testing claims against what is "
        "given, not solving. Wrong choices should be statements that are "
        "sometimes true, or true of a different quantity."),
    "not_except": (
        "Phrase every item as a NEGATIVE question - 'which of the following "
        "is NOT', or 'all of the following EXCEPT'. Put the negative word in "
        "capitals, as the test does. Three choices must be genuinely true or "
        "valid and exactly one must fail; the trap is a student who finds a "
        "true statement and picks it."),
    "which_expression": (
        "Ask which EXPRESSION or EQUATION represents the situation, not what "
        "value it produces. The answer choices are expressions. A student "
        "should be able to answer without arriving at a number, and the wrong "
        "choices should be the expressions produced by the common setup "
        "errors."),
    "work_backwards": (
        "Write items where testing the answer choices is faster than deriving "
        "the result - the choices are candidate values and the efficient "
        "route is substitution. Keep the algebra genuinely awkward so the "
        "backward route really is the better one."),
    "in_context": (
        "The computation is done or nearly done; the question asks what a "
        "number MEANS in the situation - what the slope represents, what the "
        "intercept is in the story's own units. Wrong choices should swap the "
        "two, or give the right meaning in the wrong units."),
    "compare": (
        "Give two quantities, two groups or two scenarios and ask about the "
        "GAP between them - how much greater, how many times as many, which "
        "is larger and by how much. The trap is answering about one of them "
        "instead of the difference."),
}


def build_prompt(skill, lesson, families, difficulty, n, seed_topics,
                 subtype=None, patterns=None, focus=None, fmt="mc",
                 modelled_on=None, kind="twins", phrasing=None):
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

{style_brief(skill["section"], difficulty)}
{FOUNDATION_RULES if difficulty == "F" else ""}{EXTRA_HARD_RULES if difficulty == "X" else ""}
{("WORDING: " + PHRASING_BRIEF[phrasing]) if phrasing in PHRASING_BRIEF else ""}

WRITE {n} ORIGINAL ITEMS.

Hard requirements:

1. ORIGINAL. Invent every passage, scenario and number. Do not reproduce or
   adapt any question you have seen from College Board or any other test
   publisher. If an item feels familiar, change it.

{"2. ONE defensible answer, reachable by a correct method. A knowledgeable person must not be able to argue for a different value." if fmt == "grid" else "2. FOUR choices, exactly one defensible answer. A knowledgeable person must not be able to argue for a second choice."}

3. EVERY ITEM MUST BE THIS SUBTYPE. A student should be able to read it and
   recognise the subtype from the tell above. Do not drift into a neighbouring
   subtype of the same skill.

{modelled_block(modelled_on, kind)}{focus_block(families, focus)}4. EVERY DISTRACTOR CATCHES A NAMED ERROR. "misconception" must be one of the
   slugs listed below, copied exactly. It is not the subtype name and not a
   phrase of your own - items came back naming the subtype as the
   misconception, which is the one thing it cannot be. The subtype's own trap
   is still one of these slugs: pick the one it falls under. At least one
   distractor per item must be that trap:
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

FOUNDATION_RULES = """
THIS IS GROUNDWORK, NOT AN EXAM QUESTION. Strip the test away:

  - No context paragraph unless the context is the skill being practised.
    "Solve 3x + 7 = 22" is the question. A story about a food truck is not.
  - One step. If the student has to notice something before they can start,
    it belongs at Easy, not here.
  - Plain numbers. Small integers, clean fractions, percentages that divide.
  - Name what it is for. The explanation should say which real question type
    this unlocks, so the student knows why they are doing it.
  - The distractors still catch named errors - that is the whole point of
    groundwork. The error a student makes on 3x + 7 = 22 is the error they
    will make inside a word problem.

Do NOT use the skill's real instruction line here. These are not test
questions and must not pretend to be.
"""

EXTRA_HARD_RULES = """
THIS IS ABOVE THE EXAM'S HARDEST TIER. It is for a student who already wins
Hard and is chasing the last few marks, so it has to be harder in the way
the test is hard, not in the way a textbook is:

  - More to hold at once, not more to read. Add a condition, not a sentence.
  - The trap survives the first correct insight. A student who sees the key
    idea should still be able to land on a wrong answer by finishing it the
    obvious way. That is what makes the last few questions hard.
  - Still exactly one defensible answer, and still about two minutes for
    someone who sees it. If it needs five, it is not a harder SAT question -
    it is a different exam.
  - No obscure content. Everything must sit inside what the real test
    covers; the difficulty comes from the combination, not from knowing
    something extra.
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
    return call_json_array(prompt, model, tag="author")


def author(skill, lesson, families, difficulty, n, model, rng,
           subtype=None, patterns=None, focus=None, fmt="mc",
           modelled_on=None, kind="twins", phrasing=None):
    topics = rng.sample(TOPICS, min(n, len(TOPICS)))
    prompt = build_prompt(skill, lesson, families, difficulty, n, topics,
                          subtype, patterns, focus, fmt, modelled_on, kind,
                          phrasing)
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
        # Record the family it was written in, so the bank can be measured
        # on variety rather than only on topic and tier.
        if phrasing:
            it["phrasing"] = phrasing
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
    ap.add_argument("--phrasing", choices=sorted(PHRASING_BRIEF),
                    help="write in one wording family. A student can lose a "
                         "whole family across six topics, and 105 of 181 "
                         "recognitions carried only 'direct'.")
    ap.add_argument("--format", default="mc", choices=("mc", "grid"),
                    dest="fmt",
                    help="grid: student-produced response, no answer choices. "
                         "27%% of the real math section.")
    ap.add_argument("--modelled-on", dest="modelled_on",
                    help="JSON file of questions a student missed; the new "
                         "ones are written against their shape")
    ap.add_argument("--kind", default="twins", choices=("twins", "cousins"),
                    help="twins: same structure and trap. cousins: same "
                         "recognition, a different route in.")
    ap.add_argument("--out-dir", dest="out_dir", default=OUT_DIR,
                    help="where to write. Defaults to data/bank - the pool "
                         "students practise from. The lesson planner points "
                         "this elsewhere so a question written to be worked "
                         "on a shared screen never also turns up in a solo "
                         "round two days later.")
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
                       fmt=args.fmt,
                       modelled_on=(json.load(open(args.modelled_on))
                                    if args.modelled_on else None),
                       kind=args.kind, phrasing=args.phrasing)
        r.count(authored=len(items))
        if len(items) < args.n:
            r.note(f"asked for {args.n}, got {len(items)}")

    out_dir = args.out_dir or OUT_DIR
    os.makedirs(out_dir, exist_ok=True)
    stem = (args.subtype if args.subtype else args.skill.replace(".", ""))
    # Grid-ins live in their own file: they are a different format of the same
    # recognition, and keeping them apart means a cell's counts stay readable.
    suffix = "-grid" if args.fmt == "grid" else ""
    path = os.path.join(out_dir, f"{stem}-{args.difficulty}{suffix}.json")
    existing = json.load(open(path)) if os.path.exists(path) else []
    existing += items
    json.dump(existing, open(path, "w"), indent=1)
    print(f"wrote {len(items)} items -> {os.path.relpath(path, ROOT)} "
          f"({len(existing)} total)")
    for it in items:
        print(f"  {it['id']}  {it['stem'][:70]}")


if __name__ == "__main__":
    main()
