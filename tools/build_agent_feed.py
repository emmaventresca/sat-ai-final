#!/usr/bin/env python3
"""
Turn the agent run log into the dashboard's queue, with alerts raised.

An alert is a rule that would have caught a real failure on this project:

  never-solved   items recorded as failures that were never actually tested -
                 219 of them, from a CLI call erroring with an empty message
  low-pass-rate  a verify run well below the established rate, which is what a
                 stale allowlist or a drifting generator looks like
  no-output      an author run that produced nothing
  stalled        a run still marked in flight long after it should have ended
  errored        the run raised

Read by the teacher dashboard so a bad run surfaces on its own, instead of
being noticed two hours later.
"""
import json, os, sys, time
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from agentlog import read                                # noqa: E402

LOW_PASS = 0.70
STALE_SECONDS = 3 * 3600


def alerts_for(row):
    out = []
    c = row.get("counts", {})
    kind = row.get("kind")

    if row.get("status") == "error":
        out.append({"level": "bad", "text": "the run raised an error"})
    if row.get("status") is None and time.time() - row.get("started_at", 0) > STALE_SECONDS:
        out.append({"level": "bad", "text": "still in flight - probably died"})

    if kind == "verify":
        checked = sum(c.get(k, 0) for k in ("pass", "review", "fail", "error"))
        if c.get("error"):
            out.append({"level": "bad",
                        "text": f"{c['error']} items were never solved - untested, "
                                f"not failed. Re-run rather than discarding them."})
        if checked and c.get("pass", 0) / checked < LOW_PASS:
            out.append({"level": "warn",
                        "text": f"pass rate {c.get('pass',0)/checked:.0%} - look for a "
                                f"systematic cause before authoring more"})
    if kind == "author" and c.get("authored", 0) == 0:
        out.append({"level": "bad", "text": "produced no items"})
    for n in row.get("notes", []):
        out.append({"level": "warn", "text": n})
    return out


def main():
    rows = read()
    feed = []
    for row in rows[-200:]:
        a = alerts_for(row)
        feed.append({
            "id": row["id"], "kind": row.get("kind"),
            "status": row.get("status", "running"),
            "started_at": row.get("started_at"),
            "seconds": row.get("seconds"),
            "meta": row.get("meta", {}),
            "counts": row.get("counts", {}),
            "alerts": a,
        })
    feed.reverse()

    summary = Counter()
    for f in feed:
        summary[f["status"]] += 1
        for a in f["alerts"]:
            summary[f"alert:{a['level']}"] += 1

    out = os.path.join(ROOT, "data", "agent_feed.json")
    json.dump({"runs": feed, "summary": dict(summary),
               "generated_at": time.time()}, open(out, "w"), indent=1)
    print(f"{len(feed)} runs -> data/agent_feed.json")
    print(f"  {dict(summary)}")
    flagged = [f for f in feed if f["alerts"]]
    for f in flagged[:6]:
        print(f"  ! {f['kind']:10} {f['alerts'][0]['text'][:80]}")


if __name__ == "__main__":
    main()
