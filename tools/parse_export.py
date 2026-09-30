#!/usr/bin/env python3
"""
Parse College Board's official question-bank export into structured records.

The export is obtained through the bank's own download button - the sanctioned
educator route - not by scraping. It is analysed locally to derive an original,
finer-grained taxonomy of question subtypes; the text itself is never committed
and never served. corpus/export/ is git-ignored.

What we are extracting is the layer copyright does not reach (17 USC 102(b)):
what each question type asks you to do, how its prompt is framed, where the
answer lives, and what the numbers look like. The output of the analysis is our
own abstraction, not their expression.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "corpus", "export")

HEADER = re.compile(r"Question ID:\s*([0-9a-f]+)", re.I)
# The export de-ligatures and letter-spaces headings, so match loosely.
FIELDS = re.compile(
    r"Assessment\s*T\s*est\s*Domain\s*Skill\s*Difficulty\s*(.+?)\s*Question\b",
    re.S | re.I)


def clean(t):
    # The PDF inserts spaces inside words for kerning: "Inf er ences".
    t = t.replace("­", "")
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()


def split_pages(reader):
    for i, page in enumerate(reader.pages):
        yield i, clean(page.extract_text() or "")


def parse(pdf_path, label):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    records, current = [], None
    for i, text in split_pages(reader):
        m = HEADER.search(text)
        if m:
            if current:
                records.append(current)
            current = {"id": m.group(1), "source_file": label,
                       "pages": [i], "text": text}
        elif current:
            current["pages"].append(i)
            current["text"] += "\n" + text
        if (i + 1) % 400 == 0:
            print(f"  {label}: page {i+1}", flush=True)
    if current:
        records.append(current)
    return records


def main():
    os.makedirs(OUT, exist_ok=True)
    files = [("rw", os.path.expanduser("~/Downloads/questionbank-export-2026-9-29.pdf")),
             ("math", os.path.expanduser("~/Downloads/questionbank-export-2026-9-29 (1).pdf"))]
    total = 0
    for label, path in files:
        if not os.path.exists(path):
            print(f"missing: {path}")
            continue
        print(f"parsing {label}...", flush=True)
        recs = parse(path, label)
        with open(os.path.join(OUT, f"{label}.jsonl"), "w") as fh:
            for r in recs:
                fh.write(json.dumps(r) + "\n")
        print(f"  {len(recs)} questions -> corpus/export/{label}.jsonl", flush=True)
        total += len(recs)
    print(f"\n{total} questions parsed")


if __name__ == "__main__":
    main()
