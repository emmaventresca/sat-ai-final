#!/usr/bin/env python3
"""
Fetch the full SAT educator question bank: every item in all 8 domains, with
College Board's own skill code, difficulty and rationale.

Endpoints are unauthenticated. See docs/DESIGN.md sect 1-2 for why we cache this
privately rather than exposing it, and tools/README.md for the API gotchas.

Usage:  python3 tools/fetch_bank.py          # all domains
        python3 tools/fetch_bank.py H P      # named domains only
"""
import json, os, sys, time, urllib.request, urllib.error

BASE = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank"
HEADERS = {"Content-Type": "application/json",
           "Origin": "https://satsuiteeducatorquestionbank.collegeboard.org"}

# domain code -> (test section, human name).  test 1 = Reading & Writing, 2 = Math.
DOMAINS = {
    "INI": (1, "Information and Ideas"),
    "CAS": (1, "Craft and Structure"),
    "EOI": (1, "Expression of Ideas"),
    "SEC": (1, "Standard English Conventions"),
    "H":   (2, "Algebra"),
    "P":   (2, "Advanced Math"),
    "Q":   (2, "Problem-Solving and Data Analysis"),
    "S":   (2, "Geometry and Trigonometry"),
}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "corpus", "bank")


def _post(path, payload, tries=4):
    body = json.dumps(payload).encode()
    for attempt in range(tries):
        try:
            req = urllib.request.Request(BASE + path, data=body, headers=HEADERS)
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt == tries - 1:
                raise
            time.sleep(2 ** attempt)


def lookup():
    return json.loads(urllib.request.urlopen(BASE + "/lookup", timeout=60).read())


def main():
    wanted = [d.upper() for d in sys.argv[1:]] or list(DOMAINS)
    bad = [d for d in wanted if d not in DOMAINS]
    if bad:
        sys.exit(f"unknown domain(s) {bad}; choose from {list(DOMAINS)}")

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "_lookup.json"), "w") as fh:
        json.dump(lookup(), fh)
    print("saved taxonomy -> _lookup.json", flush=True)

    for domain in wanted:
        test, name = DOMAINS[domain]
        dest = os.path.join(OUT, domain)
        os.makedirs(dest, exist_ok=True)

        # The int types matter: passing strings silently returns {"isLogged": true}.
        items = _post("/digital/get-questions",
                      {"asmtEventId": 99, "test": test, "domain": domain})
        print(f"\n{domain} ({name}): {len(items)} items", flush=True)

        # Keep the listing: it carries difficulty and skill codes that the
        # per-item response does not always repeat.
        with open(os.path.join(dest, "_listing.json"), "w") as fh:
            json.dump(items, fh)

        fetched = skipped = failed = 0
        for i, q in enumerate(items, 1):
            eid = q.get("external_id")
            if not eid:
                continue
            path = os.path.join(dest, eid + ".json")
            if os.path.exists(path):
                skipped += 1
                continue
            try:
                rec = _post("/digital/get-question", {"external_id": eid})
                rec["_meta"] = {k: q.get(k) for k in
                                ("difficulty", "skill_cd", "skill_desc",
                                 "primary_class_cd", "primary_class_cd_desc",
                                 "external_id", "questionId")}
                rec["_meta"]["domain"] = domain
                rec["_meta"]["test"] = test
                with open(path, "w") as fh:
                    json.dump(rec, fh)
                fetched += 1
            except Exception as exc:
                failed += 1
                print(f"  ! {eid}: {exc}", flush=True)
            time.sleep(0.35)          # be polite
            if i % 100 == 0:
                print(f"  {i}/{len(items)}  (+{fetched} ={skipped} !{failed})", flush=True)
        print(f"{domain} done: {fetched} new, {skipped} cached, {failed} failed", flush=True)


if __name__ == "__main__":
    main()
