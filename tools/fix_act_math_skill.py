#!/usr/bin/env python3
"""Give the 167 ACT math questions filed under skill "Math" a real domain.

167 questions carry the placeholder skill "Math", so a student opening the
Math land is offered a sub-land also called "Math" - the name tells them
nothing and the questions sit outside the five real ACT math domains.

Every one of them is already classified at the subtype level (Logarithm
properties, Two way tables, Arcs chords tangents...), and the subtype is a
clean signal. Unlike the section repair there is no second signal to check
it against: these 12 subtypes appear under "Math" and nowhere else, so the
mapping below is a judgement, not a measurement. That is why it is written
out by hand rather than inferred.

Ten of the twelve are not really debatable - two-way tables are statistics,
interior angles are geometry. Two are, and ACT's own taxonomy is read both
ways by reasonable people:

  Trig identities      -> Geometry. ACT reports trigonometry inside its
                          Geometry category, so that is where a student
                          looking for it will expect it.
  Logarithm properties -> Functions. These are manipulations of log and
                          exponential expressions, which ACT groups with
                          functions rather than with Number & Quantity.

Emma, if you read either of those the other way, change the one line and
re-run - nothing else depends on it.
"""
import argparse, collections, json, sys

PLACEHOLDER = 'Math'

SUBTYPE_SKILL = {
    'Two way tables':           'Statistics & Probability',
    'Scatterplot regression':   'Statistics & Probability',
    'Probability geometric':    'Statistics & Probability',
    'Systems word problems':    'Algebra',
    'Absolute value equations': 'Algebra',
    'Piecewise functions':      'Functions',
    'Function from table':      'Functions',
    'Logarithm properties':     'Functions',   # judgement - see docstring
    'Transformations geometry': 'Geometry',
    'Polygons interior angles': 'Geometry',
    'Arcs chords tangents':     'Geometry',
    'Trig identities':          'Geometry',    # judgement - see docstring
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--path', default='data/act/questions.json')
    ap.add_argument('--write', action='store_true')
    args = ap.parse_args()

    doc = json.load(open(args.path))
    items = doc.get('items', doc)

    known = {i['skill'] for i in items if i.get('skill') and i['skill'] != PLACEHOLDER}
    unknown = sorted(set(SUBTYPE_SKILL.values()) - known)
    if unknown:
        print(f'refusing to run: these are not skills this bank uses: {unknown}')
        return 1

    moved, stranded = collections.Counter(), collections.Counter()
    for it in items:
        if it.get('skill') != PLACEHOLDER:
            continue
        target = SUBTYPE_SKILL.get(it.get('subtype_name') or it.get('subtype'))
        if not target:
            stranded[it.get('subtype_name') or it.get('subtype')] += 1
            continue
        moved[target] += 1
        if args.write:
            it['skill'] = target

    if args.write and moved:
        json.dump(doc, open(args.path, 'w'), indent=1, ensure_ascii=False)

    print(f'{sum(moved.values()) + sum(stranded.values())} questions filed under "{PLACEHOLDER}"')
    for skill, n in moved.most_common():
        print(f'  {n:4} -> {skill}')
    for sub, n in stranded.most_common():
        print(f'  {n:4} left alone: no mapping for subtype "{sub}"')
    if not args.write:
        print('\nDRY RUN - nothing written. Re-run with --write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
