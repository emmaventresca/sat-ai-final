#!/usr/bin/env python3
"""
Turn subtype labels into the frequency counts the engine selects on.

Where a question was labelled more than once, the majority label wins and ties
fall to the first. That duplication was accidental - a resume bug re-ran work
already done - but it produced something worth keeping: on 3,158 questions
labelled twice from identical input, the classifier reproduced its own answer
92% of the time. That is the reliability of this layer, measured rather than
assumed, and it is recorded in the output.

Only counts are committed. The question text stays in the git-ignored export.
"""
import json, os, sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from derive_subtypes import fields                      # noqa: E402

LABELS = os.path.join(ROOT, "corpus", "classify", "subtype_labels.jsonl")


def main():
    rows = [json.loads(l) for l in open(LABELS) if l.strip()]
    votes = defaultdict(list)
    for r in rows:
        votes[r["id"]].append((r["skill"], r["subtype"]))

    dup = {k: v for k, v in votes.items() if len(v) > 1}
    agree = sum(1 for v in dup.values() if len({x[1] for x in v}) == 1)
    consistency = agree / len(dup) if dup else None

    label = {}
    for qid, vs in votes.items():
        label[qid] = Counter(vs).most_common(1)[0][0]      # (skill, subtype)

    # Difficulty per question, from the export.
    diff = {}
    section_of = {}
    for section in ("rw", "math"):
        p = os.path.join(ROOT, "corpus", "export", f"{section}.jsonl")
        for line in open(p):
            r = json.loads(line)
            _, d = fields(r)
            diff[r["id"]] = d
            section_of[r["id"]] = section

    counts = defaultdict(lambda: Counter())
    section_totals = Counter()
    for qid, (skill, sub) in label.items():
        d = diff.get(qid)
        if not d:
            continue
        counts[(skill, sub)][d] += 1
        section_totals[section_of.get(qid, "rw")] += 1

    tax = json.load(open(os.path.join(ROOT, "data", "subtypes.json")))
    flat = {}
    for skill, v in tax["skills"].items():
        sec = v["section"]
        for st in v["subtypes"]:
            c = counts.get((skill, st["slug"]), Counter())
            total = c["Easy"] + c["Medium"] + c["Hard"]
            st["count_e"], st["count_m"], st["count_h"] = c["Easy"], c["Medium"], c["Hard"]
            st["count_total"] = total
            st["measured_share"] = round(total / max(v["questions_analysed"], 1), 3)
            st["section_total"] = section_totals[sec]
            st["skill"] = skill
            st["section"] = sec
            flat[st["slug"]] = {k: st[k] for k in
                                ("slug", "skill", "section", "count_e", "count_m",
                                 "count_h", "count_total", "section_total")}

    tax["label_self_consistency"] = round(consistency, 3) if consistency else None
    tax["questions_labelled"] = len(label)
    json.dump(tax, open(os.path.join(ROOT, "data", "subtypes.json"), "w"), indent=1)
    json.dump({"subtypes": flat},
              open(os.path.join(ROOT, "data", "subtype_counts.json"), "w"), indent=1)

    unlabelled = sum(1 for v in tax["skills"].values()
                     for st in v["subtypes"] if st["count_total"] == 0)
    print(f"{len(label)} questions labelled, self-consistency "
          f"{consistency:.0%} on {len(dup)} re-labelled")
    print(f"{len(flat)} subtypes carry measured counts; {unlabelled} got none")
    print()
    ex = tax["skills"]["Systems of two linear equations in two variables"]["subtypes"]
    for st in sorted(ex, key=lambda s: -s["count_total"]):
        print(f"  {st['count_total']:4}  E{st['count_e']:3} M{st['count_m']:3} "
              f"H{st['count_h']:3}   {st['name'][:52]}")


if __name__ == "__main__":
    main()
