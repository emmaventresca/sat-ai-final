#!/usr/bin/env python3
"""
Parse an official 'Answer Explanations' PDF into per-question records:
module, question number, correct answer, and College Board's own rationale.

This is the authoritative key. The scoring guide also contains an answer key,
but its PDF extracts two pages of identical shape with different letters, so it
is only trusted for the raw-to-scaled conversion table. The explanations state
the answer in prose ("Choice B is the best answer", "The correct answer is 9"),
which is unambiguous.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TESTS = os.path.join(ROOT, "corpus", "tests")

SECTION_RE  = re.compile(r"(READING AND WRITING|MATH)\s*:?\s*MODULE\s*(\d)", re.I)
QUESTION_RE = re.compile(r"\bQUESTION\s+(\d{1,2})\b")
# R&W says "is the best answer"; Math says "is correct". The \b keeps this from
# matching the "Choice A is incorrect" sentences that follow.
CHOICE_RE   = re.compile(r"Choice\s+([A-D])\s+is\s+(?:the\s+best\s+answer|\bcorrect\b)", re.I)
GRIDIN_RE   = re.compile(r"The\s+correct\s+answer\s+is\s+(.+?)\.\s", re.I | re.S)


def parse(pdf_path):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)

    # Walk pages in order, tracking which module the running header names, and
    # split each page's body on QUESTION markers.
    records, module = [], None
    for page in reader.pages:
        text = page.extract_text() or ""
        m = SECTION_RE.search(text)
        if m:
            sect = "rw" if m.group(1).upper().startswith("READING") else "math"
            module = f"{sect}-{m.group(2)}"
        if module is None:
            continue

        parts = QUESTION_RE.split(text)
        # parts = [preamble, qnum, body, qnum, body, ...]
        for qnum, body in zip(parts[1::2], parts[2::2]):
            records.append({"module": module, "q": int(qnum), "body": body})

    # A question's explanation can run across a page break, so merge consecutive
    # fragments that carry the same (module, q).
    merged = []
    for r in records:
        if merged and merged[-1]["module"] == r["module"] and merged[-1]["q"] == r["q"]:
            merged[-1]["body"] += "\n" + r["body"]
        else:
            merged.append(r)

    out = []
    for r in merged:
        body = re.sub(r"\s*\n\s*", " ", r["body"]).strip()
        body = re.sub(r"SAT ANSWER EXPLANATIONS.*?EXPLANATIONS", " ", body)
        body = re.sub(r"\s{2,}", " ", body)

        choice = CHOICE_RE.search(body)
        if choice:
            answer, kind = choice.group(1).upper(), "mcq"
        else:
            g = GRIDIN_RE.search(body)
            if not g:
                continue
            answer, kind = g.group(1).strip(), "gridin"
        out.append({"module": r["module"], "q": r["q"], "answer": answer,
                    "kind": kind, "rationale": body})
    return out


def main():
    manifest_path = os.path.join(TESTS, "manifest.json")
    manifest = json.load(open(manifest_path))
    for n in sorted(manifest, key=int):
        pdf = os.path.join(TESTS, f"test{n}-answers.pdf")
        if not os.path.exists(pdf):
            print(f"test {n}: no answers PDF"); continue
        recs = parse(pdf)
        counts = {}
        for r in recs:
            counts[r["module"]] = counts.get(r["module"], 0) + 1
        with open(os.path.join(TESTS, f"test{n}-explanations.json"), "w") as fh:
            json.dump(recs, fh, indent=1)
        manifest[n]["explanations"] = f"test{n}-explanations.json"
        manifest[n]["explanation_counts"] = counts
        print(f"test {n}: {len(recs)} explanations {counts}", flush=True)
    json.dump(manifest, open(manifest_path, "w"), indent=1)


if __name__ == "__main__":
    main()
