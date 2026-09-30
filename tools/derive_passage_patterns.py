#!/usr/bin/env python3
"""
Derive how Reading & Writing passages are BUILT.

Subtypes tell a student what a question is asking. This tells them how the
passage in front of them was constructed - which is where the answer is usually
hiding.

The clearest example, and the one that started this: the test clusters
near-synonymous adjectives. A passage says "the slow, sluggish dog", and the
question asks about the dog. Two adjectives pointing the same way is the author
handing you the characterisation twice. A student who knows to look for paired
modifiers finds the answer without re-reading.

Patterns like that are construction technique - the uncopyrightable
idea/method layer (17 USC 102(b)) - and they are exactly what a tutor teaches.
The output describes the pattern and invents its own illustrations; it never
quotes or paraphrases a real passage.
"""
import argparse, json, os, random, re, subprocess, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from derive_subtypes import fields, body, call          # noqa: E402

PROMPT = """You are a tutor reverse-engineering how SAT Reading and Writing
passages are constructed, so students can find answers faster.

Below are real passages and the explanations of how each question is answered.

Identify {n} CONSTRUCTION PATTERNS - recurring techniques the test uses when
BUILDING a passage, which a student can exploit on sight.

A worked example of what counts, to calibrate you:

  slug: paired-modifiers
  name: Clustered near-synonyms
  what: Two adjectives or adverbs pointing the same way are placed together
        ("slow, sluggish"). The author is giving you the characterisation
        twice.
  exploit: When a question asks about that noun, the paired modifiers are the
        answer in compressed form. Find the pair, and you rarely need to
        reread.

Look for patterns of that kind - where information is placed, how contrast or
concession is signalled, what a semicolon or dash is doing structurally, how
the last sentence relates to the first, where a hedge ("may", "suggests")
changes what can be concluded, how a named researcher's claim is positioned
against a finding.

SKILL AREA: {skill}

PASSAGES AND HOW THEY ARE ANSWERED:
{sample}

For each pattern give:
- "slug": kebab-case
- "name": short and concrete
- "what": the construction technique itself, one or two sentences
- "exploit": what a student DOES with it, in the second person - the action,
  not the observation
- "example": a SHORT illustration you invent yourself. Never reuse or
  paraphrase any sentence above.
- "frequency": "very common" | "common" | "occasional"

Do not quote or paraphrase any passage above. Describe the technique and
illustrate it with your own writing.

Respond with ONLY JSON: {{"patterns": [...]}}"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skill")
    ap.add_argument("--sample", type=int, default=24)
    ap.add_argument("--chars", type=int, default=1100)
    ap.add_argument("--n", type=int, default=7)
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--out-file")
    args = ap.parse_args()

    rows = [json.loads(l) for l in open(os.path.join(ROOT, "corpus", "export", "rw.jsonl"))]
    by_skill = defaultdict(list)
    for r in rows:
        s, d = fields(r)
        r["skill"], r["difficulty"] = s, d
        by_skill[s].append(r)

    skills = [args.skill] if args.skill else list(by_skill)
    out_path = args.out_file or os.path.join(ROOT, "data", "passage_patterns.json")
    blob = (json.load(open(out_path))
            if os.path.exists(out_path) and not args.out_file else {"skills": {}})

    for skill in skills:
        rs = by_skill.get(skill)
        if not rs:
            sys.exit(f"no questions for {skill!r}")
        random.Random(11).shuffle(rs)
        sample = "\n\n".join(body(r)[:args.chars] for r in rs[:args.sample])
        print(f"deriving passage patterns for {skill} ({len(rs)} questions)...", flush=True)
        res = call(PROMPT.format(skill=skill, sample=sample, n=args.n), args.model)
        blob["skills"][skill] = {"questions_analysed": len(rs),
                                 "patterns": res["patterns"]}
        json.dump(blob, open(out_path, "w"), indent=1)
        for p in res["patterns"]:
            print(f"    - {p['name']} ({p.get('frequency','?')})")


if __name__ == "__main__":
    main()
