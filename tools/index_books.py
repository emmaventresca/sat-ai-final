#!/usr/bin/env python3
"""Index third-party SAT books so our own text can be checked against them.

Emma's rule, and the project's: these books are other people's work. They can
be read for what they tell us about the exam - which recognitions exist, how a
question is framed, what the grid-in format demands - and none of their
expression may end up in ours. Those are facts and methods, which 17 U.S.C.
102(b) puts outside copyright; the prose, the worked examples and the
questions are theirs.

Reading them is not the risk. Writing afterwards is. So this builds the same
thing we build for the College Board corpus: an index of every 8-word sequence
in the books, which check_derived.py and verify_items.py can test our own text
against. The books themselves are never copied into the repo, and the index
stores hashes rather than text so the artefact carries no readable prose.

    python3 tools/index_books.py ~/Downloads/*.pdf

Output: corpus/books/index.json (git-ignored), plus a provenance record of
what was indexed, which is the part that gets committed.
"""
import argparse, hashlib, json, os, re, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "corpus", "books")
N = 8

NUM = re.compile(r"\b\d[\d,.]*\b")
WORD = re.compile(r"[a-z']+|__num__")


def normalize(text):
    """Same shape as the College Board normaliser, minus the variable slots.

    Book text is extracted from a PDF, so maths comes through as loose glyphs
    rather than as LaTeX - there is no reliable variable span to collapse.
    Numbers still are, because an exercise reused with different numbers is
    the same exercise.
    """
    return NUM.sub(" __num__ ", (text or "")).lower()


def shingles(text, n=N):
    w = WORD.findall(normalize(text))
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def digest(sh):
    """Store hashes, not text.

    An index of their sentences would be a copy of their book with extra
    steps. A set of truncated hashes answers the only question we ask of it -
    "did we write this?" - and reconstructs nothing.
    """
    return hashlib.blake2b(sh.encode(), digest_size=8).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdfs", nargs="+")
    args = ap.parse_args()

    try:
        import pypdf
    except ImportError:
        sys.exit("pip install pypdf")

    os.makedirs(OUT, exist_ok=True)
    index, provenance = set(), []
    for path in args.pdfs:
        reader = pypdf.PdfReader(path)
        meta = reader.metadata or {}
        text = []
        for page in reader.pages:
            try:
                text.append(page.extract_text() or "")
            except Exception:
                pass
        blob = "\n".join(text)
        sh = shingles(blob)
        index |= {digest(s) for s in sh}
        provenance.append({
            "file": os.path.basename(path),
            "title": str(meta.get("/Title") or "").strip() or None,
            "author": str(meta.get("/Author") or "").strip() or None,
            "pages": len(reader.pages),
            "sequences": len(sh),
            "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()[:16],
        })
        print(f"{os.path.basename(path):44} {len(reader.pages):5} pages  "
              f"{len(sh):7,} sequences")

    json.dump({"ngram_size": N, "hashes": sorted(index)},
              open(os.path.join(OUT, "index.json"), "w"))
    json.dump({"indexed_on": date.today().isoformat(), "sources": provenance},
              open(os.path.join(ROOT, "data", "book_provenance.json"), "w"), indent=2)
    print(f"\n{len(index):,} distinct sequences -> corpus/books/index.json")
    print("provenance -> data/book_provenance.json (committed; the books are not)")


if __name__ == "__main__":
    main()
