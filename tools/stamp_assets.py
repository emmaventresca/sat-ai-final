#!/usr/bin/env python3
"""
Version the asset URLs in the HTML so a browser cannot serve stale JS.

ES modules are cached by their own URL, independently of the page's, so
reloading the page - even with a query string on it - happily reuses an old
app.js. That cost an hour of debugging a feature that was already working: the
store returned the assignment, the served file contained the code, and the page
still rendered the previous build.

The data files need the same treatment for the same reason. They are fetched
by URL with no version on it, so a browser that loaded the bank yesterday
keeps serving yesterday's bank - which looks exactly like a feature that does
not work: questions whose figures "do not render" because the cached copy
predates the figure field.

Run after changing anything under web/assets/ or data/.
"""
import glob, hashlib, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")
DATA_FETCH = re.compile(r"""(fetch\(\s*)(['"])(\.\./data/[^'"?]+\.json)(\?v=[^'"]*)?\2""")
REF = re.compile(r'(src|href)="(assets/[^"?]+)(\?v=[^"]*)?"')
# Modules imported BY other modules never appear in the HTML, so stamping only
# the HTML leaves them cached. A stale planner.js served against a fresh
# teacher.js fails as "does not provide an export named ..." - the import is
# resolved against the old file. Rewrite the specifiers too.
IMPORT = re.compile(r"""(from\s+|import\s*\(\s*)(['"])(\./[^'"?]+\.js)(\?v=[^'"]*)?\2""")


def data_stamp():
    """One version for the whole data directory.

    Per-file stamps would be tidier, but the app loads these together and a
    mixed set is the harder bug: a fresh practice.json against a stale
    subtype_counts.json joins on keys that no longer line up.
    """
    digest = hashlib.sha1()
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "*.json"))):
        digest.update(os.path.basename(path).encode())
        digest.update(open(path, "rb").read())
    return digest.hexdigest()[:10]


def main():
    # Data first: rewriting the fetch URLs changes the modules, and the asset
    # stamp is a hash of the modules.
    dstamp = data_stamp()
    dtouched = 0
    for name in sorted(os.listdir(os.path.join(WEB, "assets"))):
        if not name.endswith(".js"):
            continue
        path = os.path.join(WEB, "assets", name)
        s = open(path).read()
        s2 = DATA_FETCH.sub(
            lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}?v={dstamp}{m.group(2)}", s)
        if s2 != s:
            open(path, "w").write(s2)
            dtouched += 1
    print(f"data stamped ?v={dstamp} in {dtouched} module(s)")

    # Hash the content with any existing stamp stripped. Hashing the stamped
    # file means every run changes the content, which changes the hash, which
    # changes the stamp - the version churns on every invocation and busts the
    # cache even when nothing was edited.
    digest = hashlib.sha1()
    for name in sorted(os.listdir(os.path.join(WEB, "assets"))):
        raw = open(os.path.join(WEB, "assets", name), "rb").read()
        digest.update(name.encode())
        digest.update(re.sub(rb"\?v=[0-9a-f]{6,}", b"", raw))
    stamp = digest.hexdigest()[:10]

    for page in ("index.html", "teacher.html"):
        path = os.path.join(WEB, page)
        s = open(path).read()
        s2 = REF.sub(lambda m: f'{m.group(1)}="{m.group(2)}?v={stamp}"', s)
        if s2 != s:
            open(path, "w").write(s2)
        print(f"{page}: assets stamped ?v={stamp}")

    touched = 0
    for name in sorted(os.listdir(os.path.join(WEB, "assets"))):
        if not name.endswith(".js"):
            continue
        path = os.path.join(WEB, "assets", name)
        s = open(path).read()
        s2 = IMPORT.sub(lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}?v={stamp}{m.group(2)}", s)
        if s2 != s:
            open(path, "w").write(s2)
            touched += 1
    print(f"{touched} module(s) had their imports stamped")


if __name__ == "__main__":
    main()
