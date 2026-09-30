#!/usr/bin/env python3
"""
An append-only record of every agent run, so nothing runs unobserved.

Agents here are batch jobs, not chat: they author items, verify them, classify
rationales. They fail in quiet ways - a stale allowlist rejecting everything, a
model drifting off-spec, a resume check re-running work already done. Each of
those has happened on this project and each was found by chance.

So every run writes a row: what it did, how much, how long, what it produced,
and whether anything looks wrong. build_agent_feed.py turns that into the
dashboard's queue, where a bad run surfaces instead of being discovered later.

  from agentlog import run
  with run("author", subtype="circles", difficulty="H") as r:
      ...
      r.count(authored=8)
"""
import json, os, time, uuid
from contextlib import contextmanager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, "corpus", "agent_runs.jsonl")


class Run:
    def __init__(self, kind, **meta):
        self.row = {"id": uuid.uuid4().hex[:10], "kind": kind,
                    "started_at": time.time(), "meta": meta,
                    "counts": {}, "notes": []}

    def count(self, **kw):
        for k, v in kw.items():
            self.row["counts"][k] = self.row["counts"].get(k, 0) + v

    def note(self, text):
        self.row["notes"].append(str(text)[:300])


@contextmanager
def run(kind, **meta):
    r = Run(kind, **meta)
    try:
        yield r
        r.row["status"] = "ok"
    except BaseException as exc:
        r.row["status"] = "error"
        r.note(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        r.row["seconds"] = round(time.time() - r.row["started_at"], 1)
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a") as fh:
            fh.write(json.dumps(r.row) + "\n")


def read():
    if not os.path.exists(LOG):
        return []
    out = []
    for line in open(LOG):
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out
