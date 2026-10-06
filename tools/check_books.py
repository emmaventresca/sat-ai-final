#!/usr/bin/env python3
"""Nothing we wrote may reproduce the third-party books.

The books are read for what they say about the exam - which recognitions
exist, how a question is framed, what a grid-in demands. Facts and methods,
which 17 U.S.C. 102(b) puts outside copyright. Their prose, worked examples
and questions are theirs, and this is the check that keeps the distinction
real rather than aspirational.

Same instrument as the College Board check, pointed at a different corpus:
every 8-word sequence of our own text, tested against an index of theirs.
Run tools/index_books.py first; without the index this exits clean and says
so, rather than passing silently.
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from index_books import digest, normalize, WORD          # noqa: E402
from sanitize import sanitize, to_text                   # noqa: E402

INDEX = os.path.join(ROOT, "corpus", "books", "index.json")
CORPUS = os.path.join(ROOT, "corpus", "bank")
ALLOWLIST = os.path.join(ROOT, "data", "formulation_allowlist.json")
N = 8

# Calibrated, not chosen. Scoring 400 real College Board items against the
# books the same way gives 0 for all 400 once College-Board-attested
# sequences are exempt - a clean floor, because a genuine exam item was
# certainly not copied from Barron's. Our own items sit at 0 for 98% and
# shoulder off above 11, so anything at 12 or more is worth a human look.
RESIDUE_REPORT = 12
SENTINEL = re.compile(r"^__num__$")

# Our own writing, everything a student or teacher can read.
SOURCES = [
    ("data/practice.json", ("stimulus", "stem", "explanation")),
    ("data/subtypes.json", None),
    ("data/subtype_lessons.json", None),
    ("data/lessons.json", None),
]

def corpus_sequences():
    """Every 8-word sequence in the College Board corpus, book-normalised.

    This is what makes the check mean anything. Our items use the exam's real
    instruction lines on purpose, and so do the books - they are teaching to
    the same test. A sequence that appears in College Board's own bank is the
    exam's wording, not the book author's, and flagging it would make the
    check fire on exactly the phrasing we decided to keep (LICENSING section
    5). With this exemption the control is 0 for 400 of 400 real items;
    without it, 39 of 400 look like matches.
    """
    out = set()
    for path in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(path).startswith("_"):
            continue
        try:
            d = json.load(open(path))
        except Exception:
            continue
        for field in ("stem", "stimulus"):
            w = WORD.findall(normalize(to_text(sanitize(d.get(field)))))
            for i in range(len(w) - N + 1):
                out.add(digest(" ".join(w[i:i + N])))
    return out


# A standalone letter in these stems is a variable name, and which letter it
# is carries no expression - "where b and c are constants" and "where h and k
# are constants" are one sentence, not two. Without collapsing them a reviewed
# span only ever covers the letters it happened to be written with, and the
# same stem comes back flagged every time an author picks different ones.
#
# "a" and "i" are left alone: they are an article and a pronoun far more often
# than they are variables, and collapsing them would quietly rewrite ordinary
# English on both sides of the comparison.
VAR_LETTER = re.compile(r"\b(?![ai]\b)[a-z]\b")


def collapse_vars(text):
    return VAR_LETTER.sub("__v__", text)


def covered(span, reviewed):
    """Is what is left of this span, after the reviewed shapes are taken out,
    too short to be anyone's expression?

    Plain containment was too brittle at the edges: a span that is a reviewed
    stem plus two trailing variable names matched neither direction, so the
    same sentence came back flagged every time an author added a letter. Cut
    the known shapes out and measure the longest run that survives - the same
    residue idea the College Board side uses.
    """
    shape = collapse_vars(span)
    for r in reviewed:
        shape = shape.replace(r, " | ")
    return max((len(part.split()) for part in shape.split("|")), default=0) \
        < RESIDUE_REPORT


def reviewed_spans():
    """Spans a human looked at and judged to be exam formulation."""
    if not os.path.exists(ALLOWLIST):
        return []
    return [collapse_vars(e["text"]) for e in json.load(open(ALLOWLIST))["spans"]]


def spans(text, book, exempt, minlen):
    """The runs of words we share with a book that are not exam boilerplate."""
    w = WORD.findall(normalize(text))
    if len(w) < N:
        return []
    hit = [False] * len(w)
    for i in range(len(w) - N + 1):
        h = digest(" ".join(w[i:i + N]))
        if h in book and h not in exempt:
            hit[i:i + N] = [True] * N
    out, cur = [], []
    for i, m in enumerate(hit):
        if m and not SENTINEL.match(w[i]):
            cur.append(w[i])
        else:
            if len(cur) >= minlen:
                out.append(" ".join(cur))
            cur = []
    if len(cur) >= minlen:
        out.append(" ".join(cur))
    return out


def texts():
    """Every string we wrote, with its path, from the committed data files."""
    for rel, fields in SOURCES:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        data = json.load(open(path))

        def walk(node, where):
            if isinstance(node, str):
                yield where, node
            elif isinstance(node, dict):
                for k, v in node.items():
                    if fields and isinstance(v, str) and k not in fields:
                        continue
                    yield from walk(v, f"{where}.{k}")
            elif isinstance(node, list):
                for i, v in enumerate(node):
                    yield from walk(v, f"{where}[{i}]")

        yield from walk(data, rel)


def main():
    if not os.path.exists(INDEX):
        print("no book index - run tools/index_books.py to enable this check")
        return 0
    book = set(json.load(open(INDEX))["hashes"])
    exempt = corpus_sequences()
    reviewed = reviewed_spans()

    hits, checked = [], 0
    for where, text in texts():
        if len(text) < 40:
            continue
        checked += 1
        for span in spans(text, book, exempt, RESIDUE_REPORT):
            if covered(span, reviewed):
                continue
            hits.append((where, span))

    srcs = json.load(open(os.path.join(ROOT, "data", "book_provenance.json")))
    print(f"checked {checked:,} strings we wrote against {len(book):,} "
          f"sequences from {len(srcs['sources'])} third-party books")
    print(f"  {len(exempt):,} sequences exempt as College Board's own wording")
    print(f"  {len(reviewed)} span(s) reviewed and judged standard formulation")
    if hits:
        print(f"\n{len(hits)} span(s) of {RESIDUE_REPORT}+ words to look at:")
        for where, span in hits[:40]:
            print(f"  {where}\n    {span}")
        print("\nEither rewrite them, or add them to "
              "data/formulation_allowlist.json with the reason.")
        return 1
    print(f"no span of {RESIDUE_REPORT}+ words is shared with them")
    return 0


if __name__ == "__main__":
    sys.exit(main())
