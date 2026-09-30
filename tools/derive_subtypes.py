#!/usr/bin/env python3
"""
Derive a finer-grained taxonomy of question subtypes than College Board publishes.

Their skill labels are too coarse to teach from. "Systems of two linear
equations" covers a word problem, a bare system, and a no-solution parameter
question - three different recognitions and three different methods. A student
cannot pattern-match on a category that broad.

So: read the corpus, and for each published skill propose the subtypes that
actually occur, each with the tell that identifies it, the method that solves
it, whether Desmos is the fast route, and the traps.

This is analysis of uncopyrightable structure (17 USC 102(b) - procedure,
process, method of operation), producing our own abstraction. No College Board
text is reproduced in the output.
"""
import argparse, json, os, re, subprocess, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT = os.path.join(ROOT, "corpus", "export")

SKILL_RE = re.compile(
    r"Assessment\s*T\s*est\s*Domain\s*Skill\s*Difficulty\s*(.*?)\s*Question\b",
    re.S | re.I)
DIFF_RE = re.compile(r"\b(Eas y|Easy|Medium|Har d|Hard)\b")


def despace(t):
    """The export letter-spaces words for kerning: 'Inf er ences'."""
    t = re.sub(r"\s+", " ", t)
    for a, b in [("Eas y", "Easy"), ("Har d", "Hard"), ("Medi um", "Medium")]:
        t = t.replace(a, b)
    return t.strip()


def canonical_skills():
    """The published skill names, from data/skills.json.

    The PDF letter-spaces words for kerning ("Algebr a", "pr opor tional"), so
    the header cannot be read literally. Matching on the space-stripped form
    against the known names recovers the real label without guessing."""
    path = os.path.join(ROOT, "data", "skills.json")
    out = {}
    for s in json.load(open(path))["skills"]:
        key = re.sub(r"[^a-z]", "", s["skill_name"].lower())
        out[key] = s
    return out


CANON = None


def fields(rec):
    m = SKILL_RE.search(rec["text"])
    head = despace(m.group(1)) if m else ""
    diff = None
    for d in ("Easy", "Medium", "Hard"):
        if d in head:
            diff = d
            head = head.replace(d, " ")
            break
    head = despace(head)
    head = re.sub(r"^SAT\s*(Reading and Writing|Math)\s*", "", head, flags=re.I)

    global CANON
    if CANON is None:
        CANON = canonical_skills()
    squashed = re.sub(r"[^a-z]", "", head.lower())
    # Longest match wins: "nonlinearfunctions" contains "linearfunctions", so
    # first-match folds Nonlinear Functions into Linear Functions.
    best = None
    for key, s in CANON.items():
        if key and key in squashed and (best is None or len(key) > len(best[0])):
            best = (key, s)
    return (best[1]["skill_name"] if best else head.strip()), diff


def body(rec):
    """Question text and rationale, with the header stripped."""
    t = rec["text"]
    i = t.find("Question")
    return despace(t[i + 8:]) if i != -1 else despace(t)


def call(prompt, model):
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=900,
        env={**os.environ,
             "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")})
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:200])
    i = proc.stdout.find("{")
    if i == -1:
        raise ValueError(f"no JSON: {proc.stdout[:200]}")
    return json.JSONDecoder().raw_decode(proc.stdout[i:])[0]


PROMPT = """You are building a diagnostic taxonomy for SAT tutoring. Below are
real questions from one published skill category, with the explanation of how
each is solved.

The published category is too coarse to teach from. Your job is to identify the
SUBTYPES that actually occur within it - the distinct recognitions a student
has to make, each with its own method.

For example, "Systems of two linear equations" is really several things: solve a
bare system; solve a system given in words; find the parameter that makes it
have no solution; interpret the intersection on a graph. A student pattern-
matches on those, not on the category name.

SKILL: {skill}

QUESTIONS AND THEIR SOLUTION METHODS:
{sample}

Identify {n_min}-{n_max} subtypes. For each:
- "slug": kebab-case
- "name": short, concrete, how a tutor would name it
- "tell": how a student RECOGNISES this subtype in the first few seconds -
  the phrasing, the shape of what is given, the form of the answer choices
- "method": the fastest reliable route to the answer, in 1-3 steps
- "desmos": for maths only - how the built-in graphing calculator shortcuts
  this, or null if it does not help and why
- "trap": the specific mistake this subtype is designed to catch
- "share": your estimate of what fraction of this skill's questions are this
  subtype, as a decimal

Write in the second person for "tell", "method" and "trap". Be concrete and
specific - "the question gives you two equations and asks for x+y rather than
x" is useful; "solve the system carefully" is not.

Do NOT quote or paraphrase any question or explanation above. Describe the
pattern, never the instance.

Respond with ONLY JSON: {{"subtypes": [...]}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", choices=["rw", "math"], required=True)
    ap.add_argument("--skill")
    ap.add_argument("--sample", type=int, default=28)
    ap.add_argument("--chars", type=int, default=900)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--list", action="store_true")
    args = ap.parse_args()

    rows = [json.loads(l) for l in open(os.path.join(EXPORT, f"{args.section}.jsonl"))]
    by_skill = defaultdict(list)
    for r in rows:
        skill, diff = fields(r)
        if skill:
            r["skill"], r["difficulty"] = skill, diff
            by_skill[skill].append(r)

    if args.list:
        for s, rs in sorted(by_skill.items(), key=lambda kv: -len(kv[1])):
            d = Counter(x["difficulty"] for x in rs)
            print(f"  {len(rs):5}  {s:58} E{d['Easy']:4} M{d['Medium']:4} H{d['Hard']:4}")
        return

    skills = [args.skill] if args.skill else list(by_skill)
    out_path = os.path.join(ROOT, "data", "subtypes.json")
    existing = json.load(open(out_path)) if os.path.exists(out_path) else {"skills": {}}

    for skill in skills:
        rs = by_skill.get(skill)
        if not rs:
            sys.exit(f"no questions for {skill!r}; try --list")
        import random
        random.Random(5).shuffle(rs)
        sample = "\n\n".join(f"[{r['difficulty']}] {body(r)[:args.chars]}"
                             for r in rs[:args.sample])
        n = len(rs)
        prompt = PROMPT.format(skill=skill, sample=sample,
                               n_min=4 if n < 120 else 5,
                               n_max=6 if n < 120 else 8)
        print(f"deriving subtypes for {skill} ({n} questions)...", flush=True)
        res = call(prompt, args.model)
        existing["skills"][skill] = {
            "section": args.section, "questions_analysed": n,
            "subtypes": res["subtypes"],
        }
        json.dump(existing, open(out_path, "w"), indent=1)
        print(f"  {len(res['subtypes'])} subtypes")
        for st in res["subtypes"]:
            print(f"    - {st['name']}  ({st.get('share','?')})")


if __name__ == "__main__":
    main()
