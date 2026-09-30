#!/usr/bin/env python3
"""
Build the boilerplate allowlist from evidence rather than judgement.

An earlier version listed whole instruction lines. That worked for Reading and
Writing, where the stem is a fixed sentence, and failed for Math, where the
stem is a template with the variable spliced in - "Which of the following is
the best interpretation of $m$ in this context?" never matches as an exact
string even though the frame is entirely formulaic.

So allowlist *phrases* instead, and let reuse decide which ones. Any 8-word
sequence that College Board uses across many DIFFERENT items is formulaic by
demonstration: passage-specific writing does not recur across dozens of
unrelated questions, and instruction language does nothing else.

Document frequency is the whole test. Nothing here is a judgement call about
what "feels generic".
"""
import glob, json, os, re, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sanitize import sanitize, to_text

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "corpus", "bank")
TAG = re.compile(r"<[^>]+>")
N = 8

# Math stems are templates: "the best interpretation of $m$ in this context"
# and "...of $b$ in this context" are the same sentence with a different
# variable spliced in. Comparing them raw makes each look rare, so a stem that
# is plainly formulaic never clears a reuse threshold. Normalising the variable
# and number slots first lets the template be counted as the one thing it is.
VAR = re.compile(r"\$[^$]*\$|\\\(.*?\\\)")
NUM = re.compile(r"\b\d[\d,.]*\b")


def normalize(text):
    """Lowercase, with variable and number slots collapsed to sentinels.

    The sentinels are lowercase and underscore-delimited so that the word regex
    can match them without needing a capital-letter class - an earlier version
    used bare VAR/NUM and a `[a-z']+` regex, which silently dropped the first
    letter of every capitalised word ("Which" -> "hich") and corrupted every
    comparison in both directions."""
    t = TAG.sub(" ", text or "")
    t = VAR.sub(" __var__ ", t)
    t = NUM.sub(" __num__ ", t)
    return t.lower()

MIN_ITEMS = 10          # must recur across this many distinct items


def shingles(text, n=N):
    w = re.findall(r"[a-z']+|__var__|__num__", normalize(text))
    return {" ".join(w[i:i + n]) for i in range(len(w) - n + 1)}


def main():
    if not os.path.isdir(CORPUS):
        sys.exit("no local corpus")

    df = Counter()
    items = 0
    # Instruction language lives in the stem. Passages and rationales are never
    # boilerplate, so they are not considered.
    for p in glob.glob(os.path.join(CORPUS, "*", "*.json")):
        if os.path.basename(p).startswith("_"):
            continue
        try:
            d = json.load(open(p))
        except Exception:
            continue
        items += 1
        # Through the sanitizer first: the raw stem field carries the figure's
        # SVG, its <style> block and its screen-reader description, so
        # shingling it raw pulls "heavy font bold px sans serif" and "the curve
        # passes from quadrant" into what is supposed to be a list of
        # instruction lines.
        for sh in shingles(to_text(sanitize(d.get("stem")))):
            df[sh] += 1

    # The official export is deliberately NOT used here. Its text runs stem,
    # rationale and figure description together, so shingling it pulls
    # explanation prose ("from each side of this equation yields") and chart
    # descriptions into the allowlist. Exempting those would let an authored
    # item reuse College Board's teaching language and still pass the
    # originality check. The API corpus gives the stem as its own field, which
    # is the only text that is genuinely boilerplate.

    keep = {s: n for s, n in df.items() if n >= MIN_ITEMS}
    blob = {
        "ngram_size": N,
        "min_items": MIN_ITEMS,
        "items_scanned": items,
        "rationale": (
            "Eight-word sequences that College Board reuses across at least "
            f"{MIN_ITEMS} different items' stems. Reuse at that scale "
            "demonstrates formulaic instruction language rather than "
            "authorship - passage-specific writing does not recur across "
            "dozens of unrelated questions. These are exempt from the "
            "originality check so original items can ask the question the way "
            "the test asks it, which is part of what a student is practising. "
            "Short functional phrases are also outside copyright's subject "
            "matter (37 CFR 202.1(a)), and merger applies where an idea has "
            "few natural expressions. "
            "STEMS ONLY. Passages, answer choices and rationales are where the "
            "expression lives and are never exempted."),
        "phrases": [{"text": s, "items": n}
                    for s, n in sorted(keep.items(), key=lambda kv: -kv[1])],
    }
    out = os.path.join(ROOT, "data", "standard_stems.json")
    json.dump(blob, open(out, "w"), indent=1)
    print(f"scanned {items} item stems")
    print(f"{len(keep)} phrases reused across >={MIN_ITEMS} items -> data/standard_stems.json\n")
    for s, n in sorted(keep.items(), key=lambda kv: -kv[1])[:8]:
        print(f"  {n:5} items  \"{s}\"")


if __name__ == "__main__":
    main()
