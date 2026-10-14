#!/usr/bin/env python3
"""Put ACT questions back in the section they belong to.

41 questions sit in a section their own skill does not belong to - ACT
Science items about gas volume and lux filed under Reading, an English
"Punctuation" skill appearing inside Math. On the map that means a student
walking Reading is handed Science questions, and the Reading land shows ten
skills when the section has three.

Two independent signals have to agree before anything moves:

  SKILL   the section that skill overwhelmingly lives in
  ID      the section that id prefix overwhelmingly means (sc- is science
          595 times out of 621, re- is reading 389 out of 389)

Where they agree, the question is moved. Where they disagree it is reported
and left alone, because two weak signals pointing different ways is not
evidence - it is a question that needs a human to look at it.
"""
import argparse, collections, json, re, sys

PREFIX = re.compile(r'^([a-z]{2})-')

# Nine questions the two signals could not clear on their own: their skill is
# an English skill (0.95+) but the ex- prefix is only 0.889 english, under the
# bar. I read all nine stems - comma splices, faulty parallelism, transitions,
# add/delete rhetoric, every one of them an ACT English editing item. Listing
# them here rather than lowering the threshold, so the bar still protects the
# 3,243 questions nobody has read.
REVIEWED = {
    'ex-add-or-delet-x001-m': 'english',
    'ex-commas-nones-h001-m': 'english',
    'ex-dashes-paren-x005-m': 'english',
    'ex-opening-clos-x001-m': 'english',
    'ex-parallel-str-x002-m': 'english',
    'ex-relevance-fo-h001-m': 'english',
    'ex-sentence-pla-h001-m': 'english',
    'ex-transitions--x001-m': 'english',
    'ex-unnecessary--h001-m': 'english',
}


def majority(pairs):
    """key -> the section it mostly belongs to, and how dominant that is."""
    tally = collections.defaultdict(collections.Counter)
    for key, section in pairs:
        tally[key][section] += 1
    out = {}
    for key, counts in tally.items():
        section, n = counts.most_common(1)[0]
        out[key] = (section, n / sum(counts.values()))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--path', default='data/act/questions.json')
    ap.add_argument('--write', action='store_true')
    # Below this, a signal is not dominant enough to move anything on.
    ap.add_argument('--confidence', type=float, default=0.9)
    args = ap.parse_args()

    doc = json.load(open(args.path))
    items = doc.get('items', doc) if isinstance(doc, dict) else doc

    by_skill = majority([(it['skill'], it['section']) for it in items
                         if it.get('skill') and it.get('section')])
    by_id = majority([(PREFIX.match(it['id']).group(1), it['section'])
                      for it in items
                      if it.get('section') and PREFIX.match(it.get('id') or '')])

    moved, split, weak = [], [], 0
    reviewed = []
    for it in items:
        sec, skill = it.get('section'), it.get('skill')
        if not sec or not skill:
            continue
        s_sec, s_conf = by_skill.get(skill, (None, 0))
        m = PREFIX.match(it.get('id') or '')
        i_sec, i_conf = by_id.get(m.group(1), (None, 0)) if m else (None, 0)

        if s_sec == sec:
            continue                       # already where its skill lives
        if it['id'] in REVIEWED:
            reviewed.append((it['id'], sec, REVIEWED[it['id']], skill))
            if args.write:
                it['section'] = REVIEWED[it['id']]
            continue
        if s_conf < args.confidence or i_conf < args.confidence:
            weak += 1
            continue
        if s_sec != i_sec:
            split.append((it['id'], sec, skill, s_sec, i_sec))
            continue
        moved.append((it['id'], sec, s_sec, skill))
        if args.write:
            it['section'] = s_sec

    if args.write and (moved or reviewed):
        json.dump(doc, open(args.path, 'w'), indent=1, ensure_ascii=False)

    print(f'{len(items)} ACT questions')
    print(f'  {len(moved)} moved to the section both signals agree on')
    print(f'  {len(split)} left alone: the two signals disagree')
    print(f'  {len(reviewed)} moved by hand after I read the stem')
    print(f'  {weak} left alone: neither signal is dominant enough')
    for qid, was, now, skill in moved[:6]:
        print(f'    {qid:24} {was} -> {now}   ({skill})')
    for qid, was, skill, s_sec, i_sec in split[:6]:
        print(f'    SPLIT {qid}: in {was}, skill says {s_sec}, id says {i_sec}')
    if not args.write:
        print('\nDRY RUN - nothing written. Re-run with --write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
