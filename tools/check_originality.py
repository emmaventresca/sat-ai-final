#!/usr/bin/env python3
"""
Check any deck or item file for verbatim overlap with the College Board corpus.

The claim this project makes is that its content is original. That deserves a
measurement rather than an assertion - especially for material already live.

Compares every 8-word sequence against every 8-word sequence in the locally
cached bank. Eight words is short enough to catch a lifted clause and long
enough that ordinary English does not collide by chance.

  python3 tools/check_originality.py ~/sat-practice/decks/*.tsv
  python3 tools/check_originality.py data/bank/*.json
"""
import csv, glob, json, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "corpus", "bank")
TAG = re.compile(r"<[^>]+>")
N = 8


def words(t):
    return re.findall(r"[a-z']+", TAG.sub(" ", t or "").lower())


def shingles(t, n=N):
    w = words(t)
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def standard_stems():
    """Instruction lines exempt from the overlap check - see the rationale in
    data/standard_stems.json. Short functional phrases, established as
    boilerplate by College Board's own reuse of them across hundreds of items.
    The exemption is for instruction lines only; passages, choices and
    rationales stay strictly checked."""
    p = os.path.join(ROOT, "data", "standard_stems.json")
    if not os.path.exists(p):
        return set()
    out = set()
    for s in json.load(open(p))["stems"]:
        out |= shingles(s["text"])
    return out


def corpus_index():
    out = set()
    for p in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(p).startswith("_"):
            continue
        try:
            d = json.load(open(p))
        except Exception:
            continue
        for f in ("stem", "stimulus", "rationale"):
            out |= shingles(d.get(f))
        for o in d.get("answerOptions") or []:
            out |= shingles(o.get("content"))
    return out


def texts_from(path):
    """-> [(label, text)] for a TSV deck or a JSON item file."""
    if path.endswith(".tsv"):
        for row in csv.reader(open(path, encoding="utf-8"), delimiter="\t"):
            if len(row) >= 2:
                yield row[0][:60], row[0] + " " + row[1]
    else:
        for it in json.load(open(path)):
            if isinstance(it, dict):
                yield it.get("id", "?"), " ".join(filter(None, [
                    it.get("stimulus"), it.get("stem"),
                    " ".join(it.get("choices") or []),
                    it.get("explanation")]))


def main():
    paths = sys.argv[1:]
    if not paths:
        sys.exit(__doc__)
    if not os.path.isdir(CORPUS):
        sys.exit("no local corpus to compare against")

    print("indexing College Board corpus...", flush=True)
    idx = corpus_index()
    exempt = standard_stems()
    idx -= exempt
    print(f"  {len(idx):,} 8-word sequences "
          f"({len(exempt):,} excluded as standard instruction lines)\n")

    grand = 0
    for path in paths:
        n = hits = 0
        found = Counter()
        for label, text in texts_from(path):
            n += 1
            over = shingles(text) & idx
            if over:
                hits += 1
                for o in list(over)[:3]:
                    found[o] += 1
        grand += hits
        flag = "CLEAN" if hits == 0 else f"{hits} WITH OVERLAP"
        print(f"{os.path.basename(path):32} {n:5} entries   {flag}")
        for phrase, c in found.most_common(4):
            print(f'      x{c}  "{phrase}"')

    print()
    if grand == 0:
        print("No verbatim overlap with College Board content anywhere.")
    else:
        print(f"{grand} entries share an 8-word sequence with the corpus - "
              f"review each above.")
    sys.exit(1 if grand else 0)


if __name__ == "__main__":
    main()
