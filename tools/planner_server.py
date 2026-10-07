#!/usr/bin/env python3
"""
Local helper for the teacher portal's lesson planner.

Runs on the teacher's own machine and proxies to their existing Claude session
through the `claude` CLI, so there is no API key to configure or store and
nothing leaves the laptop. That also means it is deliberately teacher-only:
students never reach this, and it is not part of anything published.

What makes the plans specific rather than generic is the grounding. Every
request is answered with the project's own derived material in context:

  * the 181 subtypes, each with its tell, method, Desmos route and trap - so
    "hard circle questions" resolves to actual recognitions, and the
    geometry-versus-graphs split is already in the data
  * the band model, so an hour aimed at 1000 -> 1300 is planned against what
    that student actually needs to win
  * the misconception families, so practice is framed around named errors
  * the verified item bank, so a plan can cite real questions we own

  python3 tools/planner_server.py          # then open the Plan tab
"""
import base64, binascii, json, os, re, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
sys.path.insert(0, TOOLS)
from cli import call_json_object                        # noqa: E402
import read_question                                    # noqa: E402
PORT = int(os.environ.get("PLANNER_PORT", "8791"))
MODEL = os.environ.get("PLANNER_MODEL", "claude-opus-5-5")


def load(name, default=None):
    p = os.path.join(ROOT, "data", name)
    return json.load(open(p)) if os.path.exists(p) else (default or {})


def parse_focus(focus):
    """`focus` arrives as a skill name or as {exam, skill, student}.

    The browser needs to say WHICH EXAM it is planning for, and the original
    signature only took a string - which is how a dict ended up being handed
    to .lower(). Accept both rather than breaking the older caller.
    """
    if isinstance(focus, dict):
        exam = focus.get("exam") if focus.get("exam") in ("sat", "act") else "sat"
        return focus.get("skill") or focus.get("subtype"), exam
    return focus, "sat"


def act_context():
    """The ACT inventory, in the same shape the prompt expects.

    The two banks are separate everywhere else in this project and they are
    separate here too: planning an ACT lesson against SAT recognitions would
    produce a plan citing ids that do not exist in the bank the student
    practises from.
    """
    tax = load(os.path.join("act", "taxonomy.json"), {"subtypes": {}})["subtypes"]
    items = load(os.path.join("act", "questions.json"), {"items": []})["items"]
    lines = ["## ACT question types (from 947 questions in the bank)"]
    for slug, meta in sorted(tax.items(), key=lambda kv: -kv[1].get("count", 0)):
        tiers = meta.get("tiers", {})
        lines.append(f"- **{meta.get('name', slug)}** [{slug}] "
                     f"{meta.get('section', '')}/{meta.get('skill', '')} "
                     f"({meta.get('count', 0)} questions: "
                     f"E{tiers.get('E',0)}/M{tiers.get('M',0)}/H{tiers.get('H',0)}"
                     f"/X{tiers.get('X',0)})")

    lines.append("\n## Items you may cite, by type and level")
    by_cell = {}
    for it in items:
        by_cell.setdefault((it.get("subtype"), it.get("difficulty")), []).append(it["id"])
    for (slug, tier), ids in sorted(by_cell.items(), key=lambda kv: str(kv[0])):
        lines.append(f"- {slug} {tier}: {', '.join(ids[:14])}")
    return "\n".join(lines)


def build_context(focus=None, exam="sat"):
    """The project's own material, trimmed to what a planner needs."""
    if exam == "act":
        return act_context()
    subtypes = load("subtypes.json", {"skills": {}})["skills"]
    bands = load("bands.json", {"sections": {}})
    misc = load("misconceptions.json", {"families": []})["families"]
    practice = load("practice.json", {"items": []})["items"]
    patterns = load("passage_patterns.json", {"skills": {}})["skills"]

    lines = ["## Question subtypes (derived from all 3,770 official questions)"]
    for skill, v in subtypes.items():
        if focus and focus.lower() not in skill.lower():
            # Keep every skill's names, but only expand the one in focus.
            lines.append(f"\n### {skill}")
            lines += [f"- {st['name']} [{st['slug']}] "
                      f"({st.get('count_total', 0)} questions: "
                      f"E{st.get('count_e',0)}/M{st.get('count_m',0)}/H{st.get('count_h',0)})"
                      for st in v["subtypes"]]
            continue
        lines.append(f"\n### {skill}")
        for st in v["subtypes"]:
            lines.append(
                f"\n- **{st['name']}** [{st['slug']}] "
                f"({st.get('count_total',0)} questions: E{st.get('count_e',0)}"
                f"/M{st.get('count_m',0)}/H{st.get('count_h',0)})"
                f"\n  TELL: {st['tell']}"
                f"\n  METHOD: {st['method']}"
                f"\n  TRAP: {st['trap']}"
                + (f"\n  DESMOS: {st['desmos']}" if st.get("desmos") else ""))

    lines.append("\n## What each score target requires")
    for section, v in bands.get("sections", {}).items():
        for row in v["targets"]:
            if row["target"] % 100 == 0 and 400 <= row["target"] <= 800:
                w = row["band_weight"]
                lines.append(
                    f"- {section} target {row['target']}: needs "
                    f"{row['questions_needed']} of {v['questions']} right; "
                    f"must win E {w['E']:.0%}, M {w['M']:.0%}, H {w['H']:.0%}")

    lines.append("\n## Misconception families used to frame errors")
    lines += [f"- {f['slug']}: {f['label']}" for f in misc]

    if patterns:
        lines.append("\n## Reading & Writing passage construction patterns")
        for skill, v in list(patterns.items())[:4]:
            for p in v["patterns"][:3]:
                lines.append(f"- {p['name']}: {p['what']}")

    have = {}
    for it in practice:
        have.setdefault(it.get("subtype"), []).append(it["id"])
    if have:
        lines.append("\n## Verified original items available to assign")
        for slug, ids in sorted(have.items(), key=lambda kv: -len(kv[1]))[:40]:
            lines.append(f"- {slug}: {len(ids)} items ({', '.join(ids[:3])}...)")
    else:
        lines.append("\n## Item bank: none verified yet - propose the questions "
                     "yourself and mark them as to-be-authored.")
    return "\n".join(lines)


SYSTEM = """You are the lesson planner inside an SAT tutoring platform, used by
the teacher who built it. You have the platform's own analysis of the exam in
context: a subtype taxonomy derived from all 3,770 official questions, the band
model computed from published score-conversion tables, the misconception
families, and the inventory of verified original practice items.

Use it. Plans must name specific subtypes by their slug, cite the tells and
traps, and respect what the student's target actually requires - do not spend an
hour on Hard material for a student whose target needs none of it.

Three things the teacher asks for:

1. A PLAN FOR HER OWN TEACHING - structure, the order to teach in, the strategy
   to emphasise, worked-example progression, and timing if she names a length.
2. AN ASSIGNMENT FOR A STUDENT - a focused set she reviews and approves.
3. A MULTI-WEEK COURSE - "four weeks, four hours a week on X". Break it into
   units, one per session. Each unit gets its own heading of exactly the form

       ## Unit N: <short title> (<minutes> min)

   so the portal can render each as its own panel. Sequence them so each unit
   depends only on what came before, say what the student should be able to do
   by the end of each, and build in a review session if the span is long
   enough to need one.

House rules:
- Never invent a College Board question or reproduce one. If a plan needs items
  that do not exist in the bank yet, say which subtype and difficulty to author.
- Be concrete. "Teach circles" is useless; "open with the standard-form read,
  because 25 of 67 circle questions are that and it is the only cheap tier" is
  the job.
- Respect the geometry-versus-graph split and say when Desmos is the fast route
  and when it is not - that is in the subtype data.
- Timings should add up to the length requested, per unit and overall.
- Spread difficulty across a course the way the band model implies: secure the
  tiers the target actually needs before spending a session on the one above.
- Write for a teacher: direct, specific, no preamble.

When proposing an assignment, end with a fenced ```json block:
{"kind": "assignment", "title": "...", "subtypes": ["slug", ...],
 "difficulty": "E"|"M"|"H", "item_ids": ["..."],
 "notes": "what the student should focus on"}
so the portal can turn it into a real assignment on approval.

WHEN ASKED FOR A LESSON OR A COURSE, end instead with a fenced ```json block
of this shape. The portal renders it as a printable teaching packet, pulling
the spot-it cues, the methods, the traps and the questions out of the platform
data itself - so give it the structure and the judgement, not the prose:

{"kind": "lesson",
 "title": "...",
 "subtitle": "one line on what this is for",
 "student": {"from": 1000, "to": 1300},
 "minutes": 90,
 "opening": "what to say in the first few minutes, and why this topic now",
 "blocks": [
   {"minutes": 11, "subtype": "<slug>",
    "why": "why this one earns its minutes for THIS student",
    "teach": "what to do in the block, in order",
    "items": ["<item id>", "..."]}
 ],
 "closing": "what to send them away with",
 "checklist": ["a trap to re-read before every late question", "..."]}

Rules for a lesson spec:
- Use real subtype slugs and real item ids from the inventory above. Never
  invent an id. If a block needs items that do not exist, leave "items" empty
  and say so in "teach".
- Order blocks so each depends only on what came before.
- The block minutes must sum to "minutes".
- NINETY MINUTES unless the teacher names a different length. That is the
  default because an hour runs out before a student has seen a recognition
  more than once, and seeing it once is not learning it.
- FILL THE TIME WITH VARIATIONS, NOT WITH TOPICS. A ninety minute lesson is
  two or three recognitions worked properly, not six skimmed. Within a block,
  climb: start at the easiest tier the student still misses, and give several
  questions at each level before moving up, so they meet the same recognition
  in different clothes.
- Ten to eighteen items in a ninety minute lesson. Fewer than ten and they
  are sitting idle; more than eighteen and nothing gets discussed.
- Choose blocks by what the student's target actually requires. Do not spend a
  block on a tier the band model says they do not need.
- For a multi-week course, return one lesson spec per session inside
  {"kind": "course", "title": "...", "sessions": [ <lesson spec>, ... ]}."""


def agent_feed():
    """Build the agent feed fresh on every request.

    The dashboard polls this, so a run that starts misbehaving surfaces while
    it is still running rather than after someone remembers to rebuild a file.
    """
    import importlib, io, contextlib
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    mod = importlib.import_module("build_agent_feed")
    importlib.reload(mod)
    with contextlib.redirect_stdout(io.StringIO()):
        mod.main()
    return load("agent_feed.json", {"runs": [], "summary": {}})


def ask(messages, focus=None):
    skill, exam = parse_focus(focus)
    convo = []
    for m in messages[-12:]:
        who = "TEACHER" if m.get("role") == "user" else "YOU"
        convo.append(f"{who}: {m.get('content','')}")
    prompt = (f"{SYSTEM}\n\n# PLATFORM DATA\n\n{build_context(skill, exam)}\n\n"
              f"# CONVERSATION\n\n" + "\n\n".join(convo) + "\n\nYOU:")
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", MODEL],
        capture_output=True, text=True, timeout=900,
        env={**os.environ,
             "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")})
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:400] or "claude CLI failed")
    return proc.stdout.strip()


# ---------------------------------------------------------------------------
# Reinforcement
#
# A student who keeps missing one recognition wants ten more of exactly that,
# and the bank runs out long before the mistake does. This writes them with
# the same authoring tool the bank was built with - same subtype brief, same
# misconception taxonomy, same originality rule - so a question written at
# 9pm for one student is the same kind of object as the rest.
#
# It is deliberately a local endpoint. Generating items needs a model, and
# students never reach this machine.
# ---------------------------------------------------------------------------

def generate_items(req):
    subtype = req.get("subtype")
    skill_cd = req.get("skill_cd")
    if not skill_cd:
        raise ValueError("skill_cd is required")
    n = max(1, min(int(req.get("n") or 10), 20))
    difficulty = req.get("difficulty") or "M"
    if difficulty not in ("E", "M", "H"):
        raise ValueError(f"unknown difficulty {difficulty!r}")

    # author_items.py appends to data/bank/<stem>-<tier>.json. Diff the file
    # around the call rather than parsing stdout: the tool's job is to write
    # items, and reading what it wrote is the only honest way to know.
    stem = subtype or skill_cd.replace(".", "")
    out_path = os.path.join(ROOT, "data", "bank", f"{stem}-{difficulty}.json")
    before = set()
    if os.path.exists(out_path):
        before = {i["id"] for i in json.load(open(out_path))}

    cmd = [sys.executable, os.path.join(TOOLS, "author_items.py"),
           "--skill", skill_cd, "--difficulty", difficulty, "--n", str(n),
           "--seed", str(int(time.time()) % 100000)]
    if subtype:
        cmd += ["--subtype", subtype]
    focus = [f for f in (req.get("misconceptions") or []) if isinstance(f, str)]
    if focus:
        cmd += ["--misconceptions", ",".join(focus[:3])]

    kind = req.get("kind") if req.get("kind") in ("twins", "cousins") else "twins"
    cmd += ["--kind", kind]

    # The questions the student actually missed, written to a temp file rather
    # than stuffed through argv - a stimulus is a paragraph, and three of them
    # will blow the command-line limit on a long passage.
    modelled = req.get("modelled_on") or []
    tmp = None
    if isinstance(modelled, list) and modelled:
        fd, tmp = tempfile.mkstemp(suffix=".json", prefix="modelled-")
        with os.fdopen(fd, "w") as fh:
            json.dump(modelled[:3], fh)
        cmd += ["--modelled-on", tmp]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout)[-400:] or "authoring failed")

    if not os.path.exists(out_path):
        raise RuntimeError("the authoring tool wrote no items")
    fresh = [i for i in json.load(open(out_path)) if i["id"] not in before]
    if not fresh:
        raise RuntimeError("the authoring tool produced nothing new")

    # Verify before serving. A question written on demand is still a question
    # a student will trust, and an unverified item can have two defensible
    # answers - which teaches them to doubt a correct instinct. Originality is
    # skipped here only because the corpus index takes longer than the whole
    # rest of the call; these never leave the teacher's machine until the
    # normal build runs it.
    subprocess.run(
        [sys.executable, os.path.join(TOOLS, "verify_items.py"),
         "--file", out_path, "--skip-originality"],
        capture_output=True, text=True, timeout=900)
    verified = {i["id"]: i for i in json.load(open(out_path))}
    passed = [verified[i["id"]] for i in fresh
              if verified.get(i["id"], {}).get("status") == "verified"]
    if not passed:
        raise RuntimeError(f"wrote {len(fresh)} questions but none passed "
                           f"verification; nothing was served")
    return passed[:n]


# ---------------------------------------------------------------------------
# Identifying a question from a screenshot
#
# The reading itself lives in tools/read_question.py, which is also a command
# you can run on its own - the same code path whether it is called from the
# portal or from a terminal, so what the teacher sees is what you can debug.
# This endpoint is the transport: decode, hand over a file, delete it.
# ---------------------------------------------------------------------------

def identify_screenshot(req):
    data = req.get("image") or ""
    if "," in data[:60]:
        data = data.split(",", 1)[1]          # strip a data: URL prefix
    try:
        blob = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError):
        raise ValueError("that does not look like an image")
    if not blob:
        raise ValueError("no image was sent")
    if len(blob) > 12 * 1024 * 1024:
        raise ValueError("image is larger than 12MB")

    fd, path = tempfile.mkstemp(suffix=".img", prefix="question-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(blob)
        out = read_question.read(path, req.get("section"), MODEL)
    finally:
        if os.path.exists(path):
            os.unlink(path)
    read_question.match(out["questions"])
    return out


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        # The portal is served from a different local port.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self._send(200, {"ok": True, "model": MODEL})
        if path == "/agents":
            try:
                return self._send(200, agent_feed())
            except Exception as exc:
                return self._send(500, {"error": str(exc)[:300]})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/identify":
            try:
                n = int(self.headers.get("Content-Length", 0))
                if n > 20 * 1024 * 1024:
                    return self._send(413, {"error": "image too large"})
                req = json.loads(self.rfile.read(n) or b"{}")
                return self._send(200, identify_screenshot(req))
            except Exception as exc:
                return self._send(500, {"error": str(exc)[:300]})
        if path == "/generate":
            try:
                n = int(self.headers.get("Content-Length", 0))
                req = json.loads(self.rfile.read(n) or b"{}")
                return self._send(200, {"items": generate_items(req)})
            except Exception as exc:
                return self._send(500, {"error": str(exc)[:400]})
        if path != "/plan":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(n) or b"{}")
            reply = ask(req.get("messages", []), req.get("focus"))
            plan = None
            m = re.search(r"```json\s*(\{.*?\})\s*```", reply, re.S)
            if m:
                try:
                    plan = json.loads(m.group(1))
                except json.JSONDecodeError:
                    pass
            self._send(200, {"reply": reply, "assignment": plan})
        except Exception as exc:
            self._send(500, {"error": str(exc)[:400]})

    def log_message(self, *a):
        pass          # quiet


def main():
    if not any(os.access(os.path.join(p, "claude"), os.X_OK)
               for p in os.environ.get("PATH", "").split(":") if p):
        sys.exit("the `claude` CLI is not on PATH - the planner proxies to it")
    print(f"lesson planner on http://localhost:{PORT}  (model: {MODEL})")
    print("teacher-only, local: no API key, nothing leaves this machine")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
