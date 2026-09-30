#!/usr/bin/env python3
"""
Version the asset URLs in the HTML so a browser cannot serve stale JS.

ES modules are cached by their own URL, independently of the page's, so
reloading the page - even with a query string on it - happily reuses an old
app.js. That cost an hour of debugging a feature that was already working: the
store returned the assignment, the served file contained the code, and the page
still rendered the previous build.

Run after changing anything under web/assets/.
"""
import hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")
REF = re.compile(r'(src|href)="(assets/[^"?]+)(\?v=[^"]*)?"')


def main():
    digest = hashlib.sha1()
    for name in sorted(os.listdir(os.path.join(WEB, "assets"))):
        with open(os.path.join(WEB, "assets", name), "rb") as fh:
            digest.update(name.encode())
            digest.update(fh.read())
    stamp = digest.hexdigest()[:10]

    for page in ("index.html", "teacher.html"):
        path = os.path.join(WEB, page)
        s = open(path).read()
        s2 = REF.sub(lambda m: f'{m.group(1)}="{m.group(2)}?v={stamp}"', s)
        if s2 != s:
            open(path, "w").write(s2)
        print(f"{page}: assets stamped ?v={stamp}")


if __name__ == "__main__":
    main()
