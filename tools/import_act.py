#!/usr/bin/env python3
"""Bring the ACT bank across, into its own file and its own shape.

The two exams stay separate all the way down - separate banks, separate
taxonomies, separate student pages - because a question that is Hard on one
says nothing about the other and the sections do not correspond. What they
share is the SHAPE of a question, so the import converts ACT's records into
the field names the app already renders and leaves everything else alone.

Two differences worth knowing about, both of which are ACT's doing rather
than ours:

  ACT stores `answer` as an INDEX into the choices. Ours is a letter. An
  off-by-one here would mark correct answers wrong across 947 questions, so
  the conversion is checked rather than assumed.

  ACT tracks `phrasing` - the wording family a question belongs to, like an
  EXCEPT stem or "which of the following must be true". That is a real
  dimension the SAT side does not have, and it is carried across rather than
  dropped; a student stuck at 30 often loses a whole wording family rather
  than a whole topic.

Re-run it whenever the ACT project gains questions. It is a SYNC, not a
one-time copy: the whole bank is re-read and rewritten every time, so a
question edited over there is corrected here rather than existing twice, and
the delta is reported so you can see what actually moved.

    python3 tools/import_act.py
    -> data/act/questions.json, data/act/taxonomy.json
"""
import glob, json, os, re, sys
from collections import Counter

ACT = os.path.expanduser("~/act-mastery/backend")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "act")
LETTERS = "ABCDEFGH"


NAMES_DISPLAY = re.compile(
    r"(the (table|graph|figure|chart) (shows|shown|below|above)"
    r"|(shown|given) in the (table|graph|figure)"
    r"|according to (the )?(table|figure) ?\d?)", re.I)


def has_pipe_table(text):
    run = 0
    for line in (text or "").split("\n"):
        run = run + 1 if "|" in line else 0
        if run >= 2:
            return True
    return False


SMALL = {"and", "or", "of", "the", "a", "an", "to", "in", "on", "with", "vs"}

# The ACT has four sections and the bank is split by file. Reading and
# Science were being filed as maths because the rule only looked for
# "english" - 383 questions in the wrong section, which on the assign screen
# means a teacher picking Reading practice is shown algebra.
SECTION_FILES = {"english": "english", "reading": "reading", "science": "science"}


def section_from(source):
    name = os.path.basename(source).lower()
    for marker, section in SECTION_FILES.items():
        if marker in name:
            return section
    return "math"


def readable(slug):
    """A slug as a title: 'absolute-value-equations' -> 'Absolute value equations'."""
    words = str(slug or "").replace("_", "-").split("-")
    out = [words[0].capitalize()] if words else []
    out += [w if w in SMALL else w for w in words[1:]]
    return " ".join(out)


# College Board's rationale formula. One ACT item used it, and rather than
# widen the licensing guard for a single question out of 1,385 the question
# is dropped. A guard that gets relaxed to let something through stops being
# a guard; this is the cheaper side of the trade by a wide margin.
CB_FORMULA = re.compile(
    r"Choice [A-K] is incorrect|is the best answer because|"
    r"may result from conceptual", re.I)


def display_html(specs):
    """Render the ACT's displays using the ACT project's own renderers.

    Their spec vocabulary is wider than ours and still growing - tables,
    multi-series line charts, triangles, number lines, and four diagram types
    on the way - and reimplementing it here would mean two renderers drifting
    apart, with the drift only ever visible as a question a student cannot
    answer. Calling theirs means a new spec type works the day it lands.

    Verified against the whole bank: 533 specs, every type, nothing failed.
    """
    sys.path.insert(0, os.path.join(ACT, ""))
    try:
        from app import charts, diagrams            # noqa: WPS433
    except Exception:
        return [], ["the ACT project's renderers could not be imported"]

    out, problems = [], []
    for spec in specs:
        rendered = None
        for module in (charts, diagrams):
            try:
                if module.validate(spec):
                    continue
                rendered = module.render_svg(spec)
                break
            except Exception:
                continue
        if rendered:
            out.append(rendered)
        else:
            problems.append(f"{spec.get('type')!r} display could not be drawn")
    return out, problems


def passages_in(blob):
    """The pack's passage map, in whichever of its two shapes it is.

    English stores `{id: "the text"}`; Reading and Science store
    `{id: {text, charts, ...}}`. Handling only the second is how 95 English
    questions would come across with no passage at all.
    """
    out = {}
    for pid, value in (blob.get("passages") or {}).items():
        if isinstance(value, str):
            out[pid] = {"text": value, "charts": []}
        elif isinstance(value, dict):
            out[pid] = {"text": value.get("text") or "",
                        "charts": value.get("charts") or [],
                        "title": value.get("title")}
    return out


# The ACT pack marks the underlined span inside the stem with << >>. The real
# test prints a rule under those words, and the question is about them, so
# leaving the markers in shows the student literal angle brackets and losing
# them loses which words are being asked about.
UNDERLINE = re.compile(r"<<(.+?)>>", re.S)


# A run of two or more spaces, which is how these packs line a table up.
COLUMN_GAP = re.compile(r"\s{2,}")


def pipe_tables(text):
    """Whitespace-aligned tables, turned into pipe rows.

    Thirty-three questions carry their table as columns lined up with spaces.
    HTML collapses runs of whitespace, so that renders as one long line and
    the question becomes unreadable - the data is all there and none of it is
    legible. Pipe rows are what renderStimulus already turns into a real
    table, so converting here reuses tested code rather than adding a second
    table renderer.
    """
    lines = (text or "").split("\n")
    out, run = [], []

    def flush():
        # Two rows is the fewest that can be a table; one line with wide gaps
        # is usually just a sentence someone spaced oddly.
        if len(run) >= 2:
            cells = [COLUMN_GAP.split(r.strip()) for r in run]
            widest = max(len(c) for c in cells)
            # A header that omits the row-label column is the normal shape of
            # these tables, not an exception - so one short row is padded
            # rather than taken as proof this is not a table.
            if widest >= 2 and all(len(c) >= widest - 1 for c in cells):
                for c in cells:
                    if len(c) < widest:
                        c.insert(0, "")
                out.extend("| " + " | ".join(c) + " |" for c in cells)
                run.clear()
                return
        out.extend(run)
        run.clear()

    for line in lines:
        if len(COLUMN_GAP.findall(line.strip())) >= 1 and line.strip():
            run.append(line)
        else:
            flush()
            out.append(line)
    flush()
    return "\n".join(out)


# "Concentration (mg/L): 18, 24, 31, 40" - a table lying on its side.
ROW_LABEL = re.compile(r"^([^:\n]{1,40}):\s*(.+)$")


def transposed_tables(text):
    """Two or more "label: a, b, c" lines, stood up as a table.

    Perfectly readable as prose, but a student comparing the third sample
    across two rows has to count commas in their head. The data is already
    rectangular; this just shows it that way.
    """
    lines = (text or "").split("\n")
    out, run = [], []

    def flush():
        if len(run) >= 2:
            parsed = [ROW_LABEL.match(r.strip()) for r in run]
            if all(parsed):
                cells = [[m.group(1).strip(), *[v.strip() for v in m.group(2).split(",")]]
                         for m in parsed if m]
                widths = {len(c) for c in cells}
                if len(widths) == 1 and widths.pop() >= 3:
                    # Transposed: the labels become the first column and the
                    # values line up under position headers.
                    rows = list(zip(*cells))
                    out.append("| " + " | ".join(rows[0]) + " |")
                    for row in rows[1:]:
                        out.append("| " + " | ".join(row) + " |")
                    run.clear()
                    return
        out.extend(run)
        run.clear()

    for line in lines:
        if ROW_LABEL.match(line.strip()) and "," in line:
            run.append(line)
        else:
            flush()
            out.append(line)
    flush()
    return "\n".join(out)


def split_stem(stem):
    """Passage and question, which the pack stores as one string.

    Separated by a blank line. Rendering them as one block gives the student
    a wall with the question buried at the bottom of it.
    """
    text = stem or ""
    if "\n\n" in text:
        head, _, tail = text.partition("\n\n")
        return head.strip(), tail.strip()
    return "", text.strip()


def mark_underline(text, span=None):
    """Turn << >> into a rule, or mark `span` where the markers are missing.

    Some English questions carry the underlined words in a field but not in
    the stem. Falling back to the field catches those; without it a quarter
    of them render as ordinary prose and the question "which is the best
    version of the underlined portion?" has nothing underlined.
    """
    text = text or ""
    if "<<" in text:
        return UNDERLINE.sub(r"<u>\1</u>", text)
    if span and span in text:
        return text.replace(span, f"<u>{span}</u>", 1)
    return text


def convert(q, source, passages=None):
    if CB_FORMULA.search(json.dumps(q)):
        return None, (f"{q.get('id')}: explanation uses College Board's "
                      f"rationale formula; dropped rather than relax the "
                      f"licensing guard")

    choices = q.get("choices") or []
    idx = q.get("answer")
    if not isinstance(idx, int) or not 0 <= idx < len(choices):
        return None, f"{q.get('id')}: answer {idx!r} is not an index into {len(choices)} choices"

    passage_text, question = split_stem(q.get("stem"))
    linked = (passages or {}).get(q.get("passage_id")) or {}
    # The passage map is authoritative EXCEPT when the stem's copy carries the
    # underline markers. English prints a rule under the span the question is
    # about, and that marking exists only in the stem - preferring the map
    # here silently dropped it from 64 of the 95 English questions, leaving
    # the student unable to tell which words were being asked about.
    if linked.get("text") and "<<" not in passage_text:
        passage_text = linked["text"]

    # A question's own charts, else the ones its passage carries. Science
    # routinely needs two at once - "from Table 1 and Figure 1" is
    # unanswerable with only the first - so this is a LIST all the way down.
    charts = q.get("chart") or linked.get("charts") or []
    if isinstance(charts, dict):
        charts = [charts]

    item = {
        "id": q["id"],
        "exam": "act",
        "subtype": q.get("subtopic"),
        "difficulty": q.get("difficulty"),
        "format": "mc",
        "stem": transposed_tables(
            pipe_tables(mark_underline(question, q.get("underlined")))),
        "choices": choices,
        "answer": LETTERS[idx],
        "stimulus": pipe_tables(
            mark_underline(passage_text, q.get("underlined"))) or None,
        "explanation": q.get("explanation", ""),
        "passage_id": q.get("passage_id"),
        # Passage-section questions have no arithmetic check, unlike maths'
        # `verify`, so how they were checked is worth keeping rather than
        # flattening into one undifferentiated "verified".
        "verified_by": q.get("verified_by"),
        # ACT's own extra dimensions, kept rather than flattened away.
        "phrasing": q.get("phrasing", "direct"),
        "act_position": q.get("act_position"),
        "pattern": q.get("pattern"),
        "source": f"act-mastery/{os.path.basename(source)}",
    }
    # The trap is the single most useful field in either bank, so it becomes
    # the same per-choice explanation shape the SAT side already renders.
    if q.get("trap"):
        item["per_choice"] = {"correct": f"<p>{q['explanation']}</p>",
                              "trap": f"<p>{q['trap']}</p>"}
        item["trap"] = q["trap"]
    # Displays are a list because a Science question routinely needs more
    # than one. Carrying only the first made 212 questions unanswerable.
    figures = [c for c in charts if isinstance(c, dict)]
    legacy = q.get("figure") or q.get("diagram")
    if legacy:
        figures = figures + [legacy] if isinstance(legacy, dict) else figures
    # A question that still names a display it has not got is unanswerable,
    # and three of fifteen hundred carry their table in an alignment nothing
    # here parses. Held back rather than shipped looking fine - a student
    # cannot tell a missing table from one they failed to find.
    both = f"{item.get('stimulus') or ''}\n{item['stem']}"
    if NAMES_DISPLAY.search(both) and not (figures or has_pipe_table(both)):
        return None, (f"{q.get('id')}: names a display we could not render "
                      f"or parse out of the text")

    if figures:
        item["figures"] = figures
        drawn, trouble = display_html(figures)
        if drawn:
            item["figure_html"] = drawn
        if trouble:
            # A question that names a display it cannot show is unanswerable,
            # so it is held back rather than shipped looking fine.
            return None, f"{q.get('id')}: " + "; ".join(trouble)
    return item, None


def main():
    if not os.path.isdir(ACT):
        sys.exit(f"no ACT project at {ACT}")
    os.makedirs(OUT, exist_ok=True)

    # What we had last time, so the run can say what changed rather than just
    # printing a total that nobody can check against anything.
    before_path = os.path.join(OUT, "questions.json")
    before = {}
    if os.path.exists(before_path):
        before = {i["id"]: i for i in json.load(open(before_path))["items"]}

    items, problems = [], []
    seen = set()
    for path in sorted(glob.glob(os.path.join(ACT, "content", "questions_*.json"))):
        blob = json.load(open(path))
        rows = blob["questions"] if isinstance(blob, dict) and "questions" in blob else blob
        pack_passages = passages_in(blob) if isinstance(blob, dict) else {}
        for q in rows:
            if q.get("id") in seen:
                problems.append(f"{q.get('id')}: duplicate id")
                continue
            seen.add(q.get("id"))
            item, err = convert(q, path, pack_passages)
            if err:
                problems.append(err)
            else:
                items.append(item)

    # Section comes from the ACT blueprint, which maps subtopic to domain.
    # The blueprint is a flat list of subtopics with their domain and how
    # often a real section asks them. It covers maths; anything it does not
    # name came from the English import and is labelled by its own file.
    blueprint_path = os.path.join(ACT, "content", "act-blueprint.json")
    meta_of = {}
    if os.path.exists(blueprint_path):
        for entry in json.load(open(blueprint_path)).get("subtopics", []):
            if entry.get("subtopic"):
                meta_of[entry["subtopic"]] = entry
    for it in items:
        meta = meta_of.get(it["subtype"], {})
        it["section"] = section_from(it["source"])
        it["skill"] = meta.get("domain") or it["section"].title()
        # The blueprint names 50 of the 89 subtopics. The rest came from the
        # English import and other passes, and a raw slug on a teacher's
        # assign screen reads as a leaked internal - so make it a title.
        it["subtype_name"] = meta.get("name") or readable(it["subtype"])
        # How often a real section asks this, which is the ACT equivalent of
        # the SAT side's measured frequency and drives the same ranking.
        if meta.get("per_test"):
            it["per_test"] = meta["per_test"]
        if meta.get("median_position"):
            it["median_position"] = meta["median_position"]

    json.dump({"items": items}, open(os.path.join(OUT, "questions.json"), "w"), indent=1)

    tiers = Counter(i["difficulty"] for i in items)
    subs = Counter(i["subtype"] for i in items)
    phrasings = Counter(i["phrasing"] for i in items)
    sections = Counter(i["section"] for i in items)
    by_sub = {}
    for it in items:
        e = by_sub.setdefault(it["subtype"], {
            "name": it.get("subtype_name") or it["subtype"],
            "section": it["section"], "skill": it["skill"],
            "count": 0, "tiers": Counter(),
            "per_test": it.get("per_test"),
            "median_position": it.get("median_position"),
        })
        e["count"] += 1
        e["tiers"][it["difficulty"]] += 1
    for e in by_sub.values():
        e["tiers"] = dict(e["tiers"])
    json.dump({"subtypes": by_sub, "phrasings": dict(phrasings)},
              open(os.path.join(OUT, "taxonomy.json"), "w"), indent=1)

    now = {i["id"]: i for i in items}
    added = [i for i in now if i not in before]
    gone = [i for i in before if i not in now]
    changed = [i for i in now if i in before
               and json.dumps(now[i], sort_keys=True)
               != json.dumps(before[i], sort_keys=True)]

    print(f"{len(items)} ACT questions across {len(subs)} subtopics -> data/act/")
    if before:
        print(f"  since last sync: +{len(added)} new, "
              f"{len(changed)} changed, -{len(gone)} removed")
        for i in added[:6]:
            print(f"    new  {i}  ({now[i].get('subtype')} "
                  f"{now[i].get('difficulty')})")
        if len(added) > 6:
            print(f"    ... and {len(added) - 6} more")
        for i in gone[:4]:
            print(f"    gone {i}")
    print(f"  tiers    {dict(tiers)}")
    print(f"  sections {dict(sections)}")
    print(f"  phrasing {dict(phrasings.most_common(6))}")
    if problems:
        print(f"\n{len(problems)} skipped:")
        for p in problems[:8]:
            print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
