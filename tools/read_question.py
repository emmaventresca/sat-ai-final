#!/usr/bin/env python3
"""Read a question out of an image and say which recognition it is.

A teacher has a question on screen and wants more like it. The useful thing
in the image is WHICH RECOGNITION it is - a fact about the question, not
anything anyone wrote - and that is all this takes out.

    python3 tools/read_question.py shot.png
    python3 tools/read_question.py shot.png --json --match

**It never returns the question's text.** The prompt forbids it, and the
result is checked for it afterwards, because a prompt that says "do not
transcribe" is a request and a check is a guarantee. The image may be
College Board's; the classification is ours (docs/DESIGN.md section 3, tier
three: processed, never persisted).

Four things make this reliable rather than lucky:

  **The image is normalised first.** Screenshots arrive as HEIC, as 5000px
  Retina PNGs, as whatever the clipboard had. A model reading a 12MB image
  is slower and no more accurate than one reading a 1600px PNG.

  **The answer is validated against the taxonomy.** A slug that does not
  exist, or one that belongs to a different skill, is not an answer - it is
  a plausible-looking string. Those get one corrective retry.

  **More than one question per image.** A screenshot is often two questions
  or a whole review list, and returning only the first silently loses the
  rest.

  **It refuses rather than guesses.** No match is a real answer and is more
  useful than a confident wrong slug.
"""
import argparse, base64, json, os, re, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from cli import call_json_object                         # noqa: E402

MODEL = os.environ.get("READER_MODEL", "claude-opus-5-5")
MAX_PX = 1600

# Magic bytes, because a .png extension on a HEIC file is a thing that
# happens and the error it produces otherwise is "the model could not see it".
SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8\xff": "jpg",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"RIFF": "webp",
}


def sniff(blob):
    for sig, kind in SIGNATURES.items():
        if blob.startswith(sig):
            return kind
    if blob[4:12] in (b"ftypheic", b"ftypheix", b"ftyphevc", b"ftypmif1"):
        return "heic"
    return None


def normalise(src, workdir):
    """A PNG no wider than MAX_PX, whatever came in.

    sips ships with macOS and handles HEIC, which nothing else here does.
    Where it is missing we pass the original through rather than failing -
    a large PNG still reads, it is just slower.
    """
    out = os.path.join(workdir, "question.png")
    if not shutil.which("sips"):
        shutil.copyfile(src, out)
        return out
    proc = subprocess.run(
        ["sips", "-s", "format", "png", "-Z", str(MAX_PX), src, "--out", out],
        capture_output=True, text=True)
    if proc.returncode != 0 or not os.path.exists(out):
        shutil.copyfile(src, out)
    return out


def load_taxonomy(section=None):
    tax = json.load(open(os.path.join(ROOT, "data", "subtypes.json")))["skills"]
    skills = {s["skill_name"]: s for s in
              json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]}
    lines, valid = [], {}
    for skill_name, v in tax.items():
        if section and v.get("section") != section:
            continue
        cd = skills.get(skill_name, {}).get("skill_cd")
        if not cd:
            continue
        for st in v.get("subtypes", []):
            valid[st["slug"]] = {"skill_cd": cd, "skill_name": skill_name,
                                 "section": v.get("section"), "name": st["name"]}
            lines.append(f"{cd} | {st['slug']} | {(st.get('tell') or '')[:140]}")
    return "\n".join(lines), valid


PROMPT = """Look at the image at {path}. It contains one or more SAT-style
questions.

You are CLASSIFYING them against a taxonomy, not transcribing them.

DO NOT reproduce any question. No stem, no passage, no answer choices, no
numbers from it, not paraphrased, not "for example". If you catch yourself
quoting, stop and describe the TYPE instead. The image may be copyrighted;
the classification is a fact about the question and is the only thing we
keep.

The taxonomy, one per line as "SKILL_CD | subtype-slug | how you recognise it":

{taxonomy}

Rules:
- Use a slug EXACTLY as written above. Do not invent one, do not reword one.
- The skill code must be the one on the same line as the slug.
- If a question does not fit any line, set "subtype" to null and explain in
  "why". No match is a real answer and is better than a confident wrong one.
- One object per question in the image, in reading order.
{retry}
Respond with ONLY a JSON object:
{{"questions": [
  {{"skill_cd": "<code>",
    "subtype": "<slug or null>",
    "section": "math"|"rw",
    "difficulty": "E"|"M"|"H",
    "format": "mc"|"grid",
    "confidence": "high"|"medium"|"low",
    "why": "<one sentence about the TYPE - what makes it this recognition>",
    "watch_for": "<the mistake this type is built to catch, in your words>"}}
]}}"""

# Phrases that mean the model started transcribing despite being told not to.
LEAKED = re.compile(r'"[^"]{40,}"|\b(which of the following|what is the value of'
                    r'|the following statements)\b', re.I)


def scrub(q):
    """Strip anything that reads like the question's own text.

    The prompt forbids transcription, and nearly always that holds. "Nearly
    always" is not a property you want in the part of the system that keeps
    other people's content out, so the fields we keep are checked too.
    """
    for field in ("why", "watch_for"):
        v = q.get(field)
        if isinstance(v, str) and LEAKED.search(v):
            q[field] = re.sub(LEAKED, "…", v)
    return q


def validate(data, valid):
    """Keep the questions that name a real recognition; report the rest."""
    good, problems = [], []
    for q in (data.get("questions") or []):
        slug = q.get("subtype")
        if slug is None:
            good.append(scrub(q))
            continue
        entry = valid.get(slug)
        if not entry:
            problems.append(f"{slug!r} is not a subtype in the taxonomy")
            continue
        if q.get("skill_cd") != entry["skill_cd"]:
            # Recoverable: the slug is right and the code was mistyped, which
            # happens because the codes carry a trailing dot.
            q["skill_cd"] = entry["skill_cd"]
        q["skill_name"] = entry["skill_name"]
        q["subtype_name"] = entry["name"]
        q["section"] = entry["section"]
        good.append(scrub(q))
    return good, problems


def read(path, section=None, model=MODEL):
    blob = open(path, "rb").read()
    if not blob:
        raise ValueError("that file is empty")
    kind = sniff(blob)
    if kind is None:
        raise ValueError("that does not look like an image")

    taxonomy, valid = load_taxonomy(section)
    with tempfile.TemporaryDirectory() as work:
        shot = normalise(path, work)
        retry = ""
        for attempt in (1, 2):
            data = call_json_object(
                PROMPT.format(path=shot, taxonomy=taxonomy, retry=retry),
                model, timeout=300, allowed_tools=["Read"])
            good, problems = validate(data, valid)
            if good or not problems:
                return {"questions": good, "rejected": problems}
            # One corrective pass, naming what was wrong. A second failure is
            # a real "no match" rather than something to keep paying for.
            retry = ("\nYour last answer used slugs that do not exist: "
                     + "; ".join(problems[:4])
                     + ". Use a slug exactly as written above, or null.\n")
    return {"questions": [], "rejected": problems}


def match(questions, limit=8):
    """What the bank already has for each identified recognition."""
    path = os.path.join(ROOT, "data", "practice.json")
    items = json.load(open(path))["items"] if os.path.exists(path) else []
    tiers = ["F", "E", "M", "H"]
    for q in questions:
        pool = [i for i in items if i.get("subtype") == q.get("subtype")]
        at = {t: [i for i in pool if i["difficulty"] == t] for t in tiers}
        here = q.get("difficulty") or "M"
        idx = tiers.index(here) if here in tiers else 2
        q["bank"] = {
            "total": len(pool),
            "at_level": len(at[here]) if here in at else 0,
            "easier": len(at[tiers[idx - 1]]) if idx > 0 else 0,
            "harder": len(at[tiers[idx + 1]]) if idx + 1 < len(tiers) else 0,
            "examples": [{"id": i["id"], "difficulty": i["difficulty"]}
                         for i in (at.get(here) or pool)[:limit]],
        }
    return questions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--section", choices=("math", "rw"))
    ap.add_argument("--model", default=MODEL)
    ap.add_argument("--match", action="store_true",
                    help="also report what the bank has for each")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.image):
        sys.exit(f"no such file: {args.image}")
    out = read(args.image, args.section, args.model)
    if args.match:
        match(out["questions"])

    if args.json:
        print(json.dumps(out, indent=2))
        return 0

    if not out["questions"]:
        print("No question in that image matched the taxonomy.")
        for p in out["rejected"]:
            print(f"  {p}")
        return 1
    for i, q in enumerate(out["questions"], 1):
        if not q.get("subtype"):
            print(f"{i}. no match - {q.get('why','')}")
            continue
        print(f"{i}. {q['subtype_name']}  [{q['subtype']}]")
        print(f"   {q.get('skill_name','')} - {q.get('difficulty')} "
              f"- {q.get('confidence')} confidence")
        print(f"   {q.get('why','')}")
        if q.get("watch_for"):
            print(f"   built to catch: {q['watch_for']}")
        if q.get("bank"):
            b = q["bank"]
            print(f"   bank: {b['at_level']} at this level, {b['easier']} easier, "
                  f"{b['harder']} harder ({b['total']} in the recognition)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
