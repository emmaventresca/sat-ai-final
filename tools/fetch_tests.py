#!/usr/bin/env python3
"""
Download the three public PDFs that exist for each official practice test, and
extract the two machine-readable pieces we need from them:

  * the answer key            (question number -> correct answer, per module)
  * the raw -> scaled score conversion table   (drives the band model, DESIGN 4a)

Only tests 4..10 exist. Tests 1-3 return an HTML error page with a 200 status,
so we check the content type rather than trusting the status code.
"""
import json, os, re, sys, urllib.request

BASE = "https://satsuite.collegeboard.org/media/pdf"
TESTS = range(4, 11)
KINDS = {
    "test":    "sat-practice-test-{n}-digital.pdf",
    "scoring": "scoring-sat-practice-test-{n}-digital.pdf",
    "answers": "sat-practice-test-{n}-answers-digital.pdf",
}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "corpus", "tests")


# The CDN 403s urllib's default User-Agent, so send a browser one.
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"}


def download(n, kind):
    url  = f"{BASE}/{KINDS[kind].format(n=n)}"
    dest = os.path.join(OUT, f"test{n}-{kind}.pdf")
    if os.path.exists(dest) and os.path.getsize(dest) > 50_000:
        return dest
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r:
        if "application/pdf" not in r.headers.get("Content-Type", ""):
            raise RuntimeError(f"not a PDF (test {n} {kind} does not exist)")
        data = r.read()
    with open(dest, "wb") as fh:
        fh.write(data)
    return dest


ANSWER_RE = re.compile(r"^(?:[A-D]|[\d./;\-\s]+)$")


def _answer_pairs(text):
    """'12 B' or '21 361/8; 45.12' -> (12, 'B'). Rejects prose, which is how
    page headers and body copy get filtered out."""
    out = []
    for num, val in re.findall(r"^\s*(\d{1,2})\s+(\S.*?)\s*$", text, re.MULTILINE):
        val = val.strip()
        if ANSWER_RE.match(val) and not re.fullmatch(r"\d{3}(\s+\d{3})+", val):
            out.append((int(num), val))
    return out


def parse_answer_key(pdf_path):
    """The key is a single page laid out in four column groups, in reading order:
    R&W module 1, R&W module 2, Math module 1, Math module 2. Each group restarts
    numbering at 1, so a non-increasing question number marks a module boundary.

    Choosing the page is the fiddly part. 'Answer Key' appears in the instructions
    too, and the instructions page extracts with the key's question numbers but
    the *wrong* values attached. So score every page by what fraction of its
    number-value pairs land inside a clean module run, and take the cleanest: the
    real key page is almost entirely key, while any page that merely mentions it
    is mostly prose and score-conversion rows."""
    from pypdf import PdfReader
    best_score, best = 0, None
    for page in PdfReader(pdf_path).pages:
        pairs = _answer_pairs(page.extract_text() or "")
        if not pairs:
            continue
        groups, current, last = [], [], 0
        for num, ans in pairs:
            if num <= last and current:
                groups.append(current)
                current = []
            current.append({"q": num, "answer": ans})
            last = num
        if current:
            groups.append(current)

        groups = [g for g in groups
                  if len(g) >= 20 and [c["q"] for c in g] == list(range(1, len(g) + 1))]
        if len(groups) != 4:
            continue
        score = sum(len(g) for g in groups) / len(pairs)
        if score > best_score:
            best_score, best = score, groups

    if best is None or best_score < 0.9:
        return None
    return dict(zip(["rw-1", "rw-2", "math-1", "math-2"], best))


def parse_conversion(pdf_path):
    """Raw score -> [lower, upper] scaled, per section. Rows carry four numbers
    while both sections are still in range, then two once Math (54 questions)
    runs out and only R&W (66) continues."""
    from pypdf import PdfReader
    text = "\n".join((p.extract_text() or "") for p in PdfReader(pdf_path).pages)
    rw, math = {}, {}
    for line in text.splitlines():
        m = re.fullmatch(r"\s*(\d{1,2})\s+(\d{3})\s+(\d{3})(?:\s+(\d{3})\s+(\d{3}))?\s*", line)
        if not m:
            continue
        raw = int(m.group(1))
        rw[raw] = [int(m.group(2)), int(m.group(3))]
        if m.group(4):
            math[raw] = [int(m.group(4)), int(m.group(5))]
    return {"rw": rw, "math": math}


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for n in TESTS:
        entry = {"test": n, "files": {}}
        for kind in KINDS:
            try:
                path = download(n, kind)
                entry["files"][kind] = os.path.basename(path)
                print(f"test {n} {kind:8} -> {os.path.getsize(path):>9,} bytes", flush=True)
            except Exception as exc:
                print(f"test {n} {kind:8} -> {exc}", flush=True)
        scoring = os.path.join(OUT, f"test{n}-scoring.pdf")
        if os.path.exists(scoring):
            try:
                entry["answer_key"] = parse_answer_key(scoring)
                entry["conversion"] = parse_conversion(scoring)
                counts = {k: len(v) for k, v in (entry["answer_key"] or {}).items()}
                print(f"         key: {counts}", flush=True)
            except Exception as exc:
                print(f"         parse failed: {exc}", flush=True)
        manifest[n] = entry

    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=1)
    print("\nwrote corpus/tests/manifest.json")


if __name__ == "__main__":
    main()
