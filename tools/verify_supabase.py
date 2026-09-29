#!/usr/bin/env python3
"""
Check a configured Supabase project: schema, seed data, and - the part that
actually matters - that row-level security is switched on.

The anon key is public. It ships in every browser, so the only thing standing
between it and every student's data is RLS. This script asserts that an
unauthenticated caller holding that key can read nothing, which is the check
worth having automated.

Reads the URL and key straight out of web/assets/config.js so there is one
place to configure.

  python3 tools/verify_supabase.py
"""
import json, os, re, sys, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONFIG = os.path.join(ROOT, "web", "assets", "config.js")

TABLES = ["profiles", "roster", "skills", "content", "attempts",
          "fingerprints", "test_results", "mastery", "assignments"]
# Tables holding student data. None of these may be readable anonymously.
PRIVATE = ["profiles", "roster", "attempts", "fingerprints",
           "test_results", "mastery", "assignments"]


def config():
    s = open(CONFIG).read()
    url = re.search(r'SUPABASE_URL:\s*"([^"]*)"', s)
    key = re.search(r'SUPABASE_ANON_KEY:\s*"([^"]*)"', s)
    if not (url and key and url.group(1) and key.group(1)):
        sys.exit("web/assets/config.js has no Supabase URL/key yet")
    return url.group(1).rstrip("/"), key.group(1)


def get(url, key, path):
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}",
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body


def main():
    url, key = config()
    print(f"project: {url}\n")
    ok = True

    print("schema")
    missing = []
    for t in TABLES:
        status, body = get(url, key, f"{t}?select=*&limit=1")
        if status == 404 or (isinstance(body, dict) and body.get("code") == "PGRST205"):
            missing.append(t)
            print(f"  MISSING  {t}")
        else:
            print(f"  ok       {t}")
    if missing:
        print(f"\n{len(missing)} table(s) missing. Paste supabase/setup.sql into")
        print("Supabase -> SQL Editor -> New query -> Run, then re-run this.")
        sys.exit(1)

    print("\nseed data")
    status, body = get(url, key, "skills?select=skill_cd")
    n = len(body) if isinstance(body, list) else 0
    expected = len(json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"])
    if n == expected:
        print(f"  ok       skills: {n}")
    else:
        ok = False
        print(f"  PROBLEM  skills: {n}, expected {expected}")

    print("\nrow-level security (anonymous caller must see no student data)")
    for t in PRIVATE:
        status, body = get(url, key, f"{t}?select=*&limit=5")
        rows = len(body) if isinstance(body, list) else None
        if status in (401, 403):
            print(f"  ok       {t}: refused ({status})")
        elif rows == 0:
            print(f"  ok       {t}: readable but returns no rows")
        elif rows is None:
            ok = False
            print(f"  PROBLEM  {t}: unexpected response {status} {body}")
        else:
            ok = False
            print(f"  EXPOSED  {t}: returned {rows} row(s) to an anonymous caller")

    # Content is meant to be readable by signed-in users only.
    status, body = get(url, key, "content?select=id&limit=5")
    rows = len(body) if isinstance(body, list) else None
    print(f"  {'ok      ' if rows in (0, None) else 'note    '} content: "
          f"{rows if rows is not None else status}")

    print("\nauth")
    try:
        req = urllib.request.Request(f"{url}/auth/v1/settings",
                                     headers={"apikey": key})
        with urllib.request.urlopen(req, timeout=30) as r:
            settings = json.loads(r.read())
        print(f"  ok       email signup enabled: "
              f"{not settings.get('disable_signup', False)}")
        if settings.get("mailer_autoconfirm") is False:
            print("  note     email confirmation is ON - students must click a link "
                  "before they can sign in.")
            print("           Turn it off under Authentication -> Sign In / Providers")
            print("           while testing, or confirm each address.")
    except Exception as e:
        print(f"  note     could not read auth settings: {e}")

    print("\n" + ("all checks passed" if ok else "problems above"))
    print("\nStill needs a human: sign up in the app, then in the SQL editor run")
    print("  update public.profiles set role = 'teacher' where email = 'you@example.com';")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
