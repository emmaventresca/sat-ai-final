#!/usr/bin/env python3
"""
Tests for the homework completion rules.

pytest is not installed on this machine, so these are plain functions with
plain asserts and a runner at the bottom:

  python3 services/api/tests/test_homework.py
"""
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app"))

from homework import (                                          # noqa: E402
    Assignment, Attempt, Item, KIND_LINK, KIND_QUESTION, KIND_WORKSHEET,
    SOURCE_ATTEMPT, SOURCE_NONE, SOURCE_SELF, UNKNOWN_RECOGNITION,
    attempts_in_window, compute_progress, group_by_recognition, summarise,
)

ASSIGNED = datetime(2026, 10, 5, 16, 0, tzinfo=timezone.utc)


def at(**delta):
    return ASSIGNED + timedelta(**delta)


CATALOG = {
    "orig-addition-and-e-F-15d793": {
        "subtype": "addition-and-emphasis",
        "subtype_name": "Adding another point, or doubling down",
        "skill_cd": "TRA", "difficulty": "F",
    },
    "orig-addition-and-e-M-77aa01": {
        "subtype": "addition-and-emphasis",
        "subtype_name": "Adding another point, or doubling down",
        "skill_cd": "TRA", "difficulty": "M",
    },
    "orig-number-of-solu-H-9b2c44": {
        "subtype": "number-of-solutions",
        "subtype_name": "No solution or infinitely many",
        "skill_cd": "LEQ", "difficulty": "H",
    },
}


def question(n, qid, day=None, required=True):
    return Item(id=f"item-{n}", kind=KIND_QUESTION, question_id=qid, day_index=day,
                required=required)


def week_of_questions():
    return Assignment(
        id="a1", exam="sat", assigned_at=ASSIGNED, title="Transitions week",
        items=[question(1, "orig-addition-and-e-F-15d793", day=1),
               question(2, "orig-addition-and-e-M-77aa01", day=2),
               question(3, "orig-number-of-solu-H-9b2c44", day=3)],
    )


# --- the rule the whole thing turns on ------------------------------------

def test_attempts_before_assigned_at_do_not_count():
    a = week_of_questions()
    stale = [Attempt("orig-addition-and-e-F-15d793", at(days=-30), correct=True),
             Attempt("orig-addition-and-e-M-77aa01", at(days=-1), correct=True),
             Attempt("orig-number-of-solu-H-9b2c44", at(minutes=-1), correct=True)]

    p = compute_progress(a, stale, catalog=CATALOG)

    assert p.done == 0, p.done
    assert p.total == 3
    assert p.percent == 0.0
    assert p.complete is False
    assert all(s.source == SOURCE_NONE for s in p.statuses)
    assert p.questions_answered == 0


def test_the_boundary_second_counts():
    a = week_of_questions()
    p = compute_progress(a, [Attempt("orig-addition-and-e-F-15d793", ASSIGNED, True)],
                         catalog=CATALOG)
    assert p.done == 1
    assert p.statuses[0].source == SOURCE_ATTEMPT


def test_attempts_in_window_filters_and_keeps_order():
    rows = [Attempt("q", at(days=-2)), Attempt("q", at(hours=1)), Attempt("q", at(days=3))]
    kept = attempts_in_window(rows, ASSIGNED)
    assert [r.at for r in kept] == [at(hours=1), at(days=3)]


def test_iso_strings_from_the_database_are_accepted():
    a = Assignment(id="a1", exam="act", assigned_at="2026-10-05T16:00:00Z",
                   items=[question(1, "act-eng-0001")])
    p = compute_progress(a, [Attempt("act-eng-0001", "2026-10-06T09:30:00Z", True)])
    assert p.done == 1 and p.exam == "act"


# --- partial completion ----------------------------------------------------

def test_partial_completion():
    a = week_of_questions()
    attempts = [Attempt("orig-addition-and-e-F-15d793", at(days=1), correct=True),
                Attempt("orig-addition-and-e-M-77aa01", at(days=2), correct=False,
                        chosen="C")]

    p = compute_progress(a, attempts, catalog=CATALOG)

    assert (p.done, p.total) == (2, 3)
    assert p.percent == 66.7, p.percent
    assert p.complete is False
    # Getting it wrong is still doing it; only never answering is "not done".
    assert p.statuses[1].done is True and p.statuses[1].correct is False
    assert p.questions_answered == 2 and p.questions_correct == 1
    assert p.accuracy == 50.0
    assert p.by_day() == {1: (1, 1), 2: (1, 1), 3: (0, 1)}


def test_misses_are_grouped_by_recognition():
    a = week_of_questions()
    attempts = [Attempt("orig-addition-and-e-F-15d793", at(days=1), correct=False,
                        chosen="A"),
                Attempt("orig-addition-and-e-M-77aa01", at(days=2), correct=False,
                        chosen="D"),
                Attempt("orig-number-of-solu-H-9b2c44", at(days=3), correct=True)]

    p = compute_progress(a, attempts, catalog=CATALOG)

    assert p.complete is True and p.percent == 100.0
    assert [m.question_id for m in p.misses] == ["orig-addition-and-e-F-15d793",
                                                 "orig-addition-and-e-M-77aa01"]
    buckets = p.by_recognition()
    assert list(buckets) == ["addition-and-emphasis"]
    assert len(buckets["addition-and-emphasis"]) == 2
    assert p.misses[0].skill_cd == "TRA"
    assert p.misses[1].chosen == "D"

    weak = summarise(p)["weak_recognitions"]
    assert weak[0]["recognition"] == "addition-and-emphasis" and weak[0]["missed"] == 2


def test_a_retry_that_fixes_it_is_no_longer_a_miss():
    a = Assignment(id="a1", exam="sat", assigned_at=ASSIGNED,
                   items=[question(1, "orig-number-of-solu-H-9b2c44")])
    attempts = [Attempt("orig-number-of-solu-H-9b2c44", at(days=1), correct=False, chosen="B"),
                Attempt("orig-number-of-solu-H-9b2c44", at(days=1, minutes=4), correct=True)]

    p = compute_progress(a, attempts, catalog=CATALOG)

    assert p.misses == []
    assert p.statuses[0].attempts == 2
    assert p.statuses[0].first_attempt_at == at(days=1)


def test_a_question_with_no_catalog_entry_still_lands_somewhere():
    a = Assignment(id="a1", exam="act", assigned_at=ASSIGNED,
                   items=[question(1, "act-sci-0099")])
    p = compute_progress(a, [Attempt("act-sci-0099", at(days=1), correct=False)])
    assert list(p.by_recognition()) == [UNKNOWN_RECOGNITION]


def test_practice_outside_the_assignment_does_not_inflate_the_bar():
    a = week_of_questions()
    attempts = [Attempt("orig-addition-and-e-F-15d793", at(days=1), correct=True),
                Attempt("some-other-item-M-000000", at(days=1), correct=True)]
    p = compute_progress(a, attempts, catalog=CATALOG)
    assert p.done == 1 and p.questions_answered == 1


# --- mixed assignments -----------------------------------------------------

def mixed_week():
    return Assignment(
        id="a2", exam="sat", assigned_at=ASSIGNED, title="A healthy week",
        due_at=at(days=7),
        items=[
            Item("i1", KIND_LINK, url="https://www.khanacademy.org/sat-transitions",
                 title="Khan: transition words", expected_minutes=25, day_index=1),
            Item("i2", KIND_LINK, url="https://example.org/video",
                 title="Desmos for linear systems", expected_minutes=12, day_index=2),
            question(3, "orig-addition-and-e-F-15d793", day=2),
            question(4, "orig-number-of-solu-H-9b2c44", day=3),
            Item("i5", KIND_WORKSHEET, worksheet_id="w-77", title="Transitions set B",
                 expected_minutes=40, day_index=4),
            Item("i6", KIND_LINK, url="https://example.org/extra", title="Optional read",
                 expected_minutes=15, day_index=5, required=False),
        ],
    )


def test_mixed_assignment_links_are_self_reported_questions_are_derived():
    a = mixed_week()
    attempts = [Attempt("orig-addition-and-e-F-15d793", at(days=2), correct=False,
                        chosen="A")]
    reports = {"i1": at(days=1), "i6": True}

    p = compute_progress(a, attempts, reports, catalog=CATALOG)

    kinds = {s.item_id: (s.done, s.source) for s in p.statuses}
    assert kinds["i1"] == (True, SOURCE_SELF)
    assert kinds["i2"] == (False, SOURCE_NONE)
    assert kinds["item-3"] == (True, SOURCE_ATTEMPT)
    assert kinds["item-4"] == (False, SOURCE_NONE)
    assert kinds["i5"] == (False, SOURCE_NONE)

    assert (p.done, p.total) == (2, 5)
    assert (p.optional_done, p.optional_total) == (1, 1)
    assert p.percent == 40.0
    # The optional read is done but must not be in the week's minutes left.
    assert p.minutes_remaining == 12 + 40
    assert p.by_day() == {1: (1, 1), 2: (1, 2), 3: (0, 1), 4: (0, 1)}
    assert [m.recognition for m in p.misses] == ["addition-and-emphasis"]


def test_a_self_report_cannot_tick_a_platform_question():
    a = week_of_questions()
    p = compute_progress(a, [], {"item-1": True, "item-2": at(days=1)}, catalog=CATALOG)
    assert p.done == 0
    assert all(s.source == SOURCE_NONE for s in p.statuses)


def test_a_worksheet_marked_done_counts():
    a = Assignment(id="a3", exam="act", assigned_at=ASSIGNED,
                   items=[Item("i1", KIND_WORKSHEET, worksheet_id="w-1",
                               title="ACT English drill", expected_minutes=30)])
    p = compute_progress(a, [], {"i1": at(days=3)})
    assert p.complete is True and p.percent == 100.0 and p.minutes_remaining == 0


# --- degenerate shapes -----------------------------------------------------

def test_empty_assignment():
    a = Assignment(id="a4", exam="sat", assigned_at=ASSIGNED, items=[])
    p = compute_progress(a, [Attempt("anything", at(days=1), correct=True)],
                         catalog=CATALOG)

    assert (p.done, p.total) == (0, 0)
    # A draft with nothing in it is not a finished week, so it must not read
    # as 100% or it sorts to the top of the teacher's list wearing a tick.
    assert p.percent == 0.0
    assert p.complete is False
    assert p.statuses == [] and p.misses == []
    assert p.accuracy is None
    assert p.by_day() == {} and p.by_recognition() == {}
    assert summarise(p)["weak_recognitions"] == []


def test_assignment_of_only_links_with_nothing_reported():
    a = Assignment(id="a5", exam="act", assigned_at=ASSIGNED,
                   items=[Item("i1", KIND_LINK, url="https://example.org/a", title="A",
                               expected_minutes=20)])
    p = compute_progress(a, [])
    assert (p.done, p.total, p.percent) == (0, 1, 0.0)
    assert p.minutes_remaining == 20


def test_group_by_recognition_puts_the_heaviest_bucket_first():
    from homework import Miss
    misses = [Miss("q1", "rare-one"), Miss("q2", "common-one"), Miss("q3", "common-one")]
    assert list(group_by_recognition(misses)) == ["common-one", "rare-one"]


def main():
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    failed = []
    for name, fn in tests:
        try:
            fn()
            print(f"  ok    {name}")
        except AssertionError as e:
            failed.append(name)
            print(f"  FAIL  {name}: {e}")
        except Exception as e:                                  # noqa: BLE001
            failed.append(name)
            print(f"  ERROR {name}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - len(failed)}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
