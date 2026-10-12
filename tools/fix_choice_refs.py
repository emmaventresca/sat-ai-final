#!/usr/bin/env python3
"""Rewrite 0-based choice references in ACT explanations as letters.

The ACT pack numbers choices from zero inside explanation prose - "Choice 2
adds an independent clause" - while the answer key uses letters. Checked
against the keys, the mapping is unambiguous: an item answered "C" explains
itself as "Choice 2", "D" as "Choice 3", "B" as "Choice 1".

So a student reading "Choice 2" looks at the SECOND choice, which is B, and
is shown the wrong one. It fails silently: the explanation is fluent, the
question is fine, and nothing anywhere errors.

Converted to the letter the student can actually see. Only digits that are
real indices into this item's own choices are touched, so a "Choice 7" on a
four-choice item - which would mean the convention does not hold there - is
left alone and reported rather than guessed at.
"""
import argparse, json, re, sys

# "choice" only, deliberately. Every one of the 224 real references uses that
# word; allowing "answer 3" or "option 3" as well would one day rewrite a
# maths explanation that says "the answer 3" - the value, not a position -
# into "the answer D", which is nonsense that nothing would catch.
REF = re.compile(r'\b(choice)(\s+)([0-9])\b', re.I)


def convert(text, choices):
    """Returns (new_text, changed, skipped).

    Two ways a digit is NOT a position, and both are left alone:

    - It is out of range. "The choice 5 + sqrt(169)i" on a four-choice item
      is quoting the choice's value.
    - A choice's own value IS that digit. On an item whose choices are
      2, 4, 8, 16, "the choice 2" almost certainly means the one that equals
      two, not the third one. Converting that to "choice C" would silently
      point the student at 8 - the exact failure this script exists to fix,
      reintroduced from the other direction.
    """
    plain = [re.sub(r'<[^>]+>', '', c).strip() for c in choices]
    changed = skipped = 0

    def sub(m):
        nonlocal changed, skipped
        digit = m.group(3)
        idx = int(digit)
        if idx >= len(plain) or digit in plain:
            skipped += 1
            return m.group(0)
        changed += 1
        return f'{m.group(1)}{m.group(2)}{chr(65 + idx)}'

    return REF.sub(sub, text), changed, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--path', default='data/act/questions.json')
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()

    doc = json.load(open(args.path))
    items = doc.get('items', doc) if isinstance(doc, dict) else doc

    touched = refs = skipped = 0
    samples = []
    for it in items:
        n = len(it.get('choices') or [])
        if not n:
            continue
        dirty = False
        for field in ('explanation',):
            text = it.get(field)
            if not text or not REF.search(text):
                continue
            new, c, s = convert(text, it.get('choices') or [])
            refs += c
            skipped += s
            if new != text:
                if len(samples) < 3:
                    was = REF.search(text).group(0)
                    idx = int(REF.search(text).group(3))
                    samples.append((it['id'], it.get('answer'), was,
                                    f'Choice {chr(65 + idx)}'))
                if args.write:
                    it[field] = new
                dirty = True
        # Per-choice notes carry the same prose and the same problem.
        per = it.get('per_choice')
        if isinstance(per, dict):
            for k, v in list(per.items()):
                if isinstance(v, str) and REF.search(v):
                    new, c, s = convert(v, it.get('choices') or [])
                    refs += c
                    skipped += s
                    if new != v:
                        if args.write:
                            per[k] = new
                        dirty = True
        if dirty:
            touched += 1

    if args.write:
        json.dump(doc, open(args.path, 'w'), indent=1, ensure_ascii=False)

    print(f'{len(items)} items')
    print(f'  {touched} had a numbered choice reference')
    print(f'  {refs} references rewritten as letters')
    print(f'  {skipped} left alone (digit was not a valid choice index)')
    for qid, ans, was, now in samples:
        print(f'    {qid} (answer {ans}): "{was}" -> "{now}"')
    if not args.write:
        print('\nDRY RUN - nothing written. Re-run with --write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
