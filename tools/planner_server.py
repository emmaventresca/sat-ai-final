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
import json, os, re, subprocess, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PLANNER_PORT", "8791"))
MODEL = os.environ.get("PLANNER_MODEL", "claude-opus-5-5")


def load(name, default=None):
    p = os.path.join(ROOT, "data", name)
    return json.load(open(p)) if os.path.exists(p) else (default or {})


def build_context(focus=None):
    """The project's own material, trimmed to what a planner needs."""
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

Two things the teacher asks for:

1. A PLAN FOR HER OWN TEACHING - structure, the order to teach in, the strategy
   to emphasise, worked-example progression, and timing if she names a length.
2. AN ASSIGNMENT FOR A STUDENT - a focused set she reviews and approves.

House rules:
- Never invent a College Board question or reproduce one. If a plan needs items
  that do not exist in the bank yet, say which subtype and difficulty to author.
- Be concrete. "Teach circles" is useless; "open with the standard-form read,
  because 25 of 67 circle questions are that and it is the only cheap tier" is
  the job.
- Respect the geometry-versus-graph split and say when Desmos is the fast route
  and when it is not - that is in the subtype data.
- Timings should add up to the length requested.
- Write for a teacher: direct, specific, no preamble.

When proposing an assignment, end with a fenced ```json block:
{"title": "...", "subtypes": ["slug", ...], "difficulty": "E"|"M"|"H",
 "item_ids": ["..."], "notes": "what the student should focus on"}
so the portal can turn it into a real assignment on approval."""


def ask(messages, focus=None):
    convo = []
    for m in messages[-12:]:
        who = "TEACHER" if m.get("role") == "user" else "YOU"
        convo.append(f"{who}: {m.get('content','')}")
    prompt = (f"{SYSTEM}\n\n# PLATFORM DATA\n\n{build_context(focus)}\n\n"
              f"# CONVERSATION\n\n" + "\n\n".join(convo) + "\n\nYOU:")
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", MODEL],
        capture_output=True, text=True, timeout=900,
        env={**os.environ,
             "PATH": os.environ["PATH"] + ":" + os.path.expanduser("~/.local/bin")})
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[:400] or "claude CLI failed")
    return proc.stdout.strip()


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
        if urlparse(self.path).path == "/health":
            return self._send(200, {"ok": True, "model": MODEL})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if urlparse(self.path).path != "/plan":
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
