#!/usr/bin/env python3
"""
Homework completion, worked out from rows rather than in the database.

A teacher looking at a week of homework asks three questions, and this module
answers all three from plain data so the answers can be tested without a
database, reused by the worksheet grader, and read by a human:

  1. HOW MUCH IS DONE. Per item and overall. Completion has two sources and
     only two: platform questions are *derived* from attempts, links and
     printed worksheets are *self-reported* by the student. Nothing else is
     ever treated as evidence of work.

  2. WHEN DOES AN ATTEMPT COUNT. Only if it happened at or after the
     assignment's assigned_at. A student who happened to answer a question
     last month has not done this week's homework, and a progress bar that
     says otherwise is measuring coincidence. This is the one rule most
     likely to be re-broken by someone optimising a query later.

  3. WHAT ARE THEY MISSING. The wrong answers, grouped by the recognition
     (the subtype slug - the "tell" in data/subtypes.json) they belong to,
     because "six wrong" is not actionable and "six wrong, five of them
     addition-vs-contrast transitions" is the whole point of the platform.

Exam-agnostic on purpose. An assignment carries its exam and its question ids
come from that exam's bank; nothing here reaches for a bank, so the SAT and
ACT stay as separate as packages/schema/exams.json says they are.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Sequence

KIND_QUESTION = "question"
KIND_WORKSHEET = "worksheet"
KIND_LINK = "link"

# Why an item counts as done. Carried through to the UI so a teacher can see at
# a glance which green ticks the platform observed and which a student claimed.
SOURCE_ATTEMPT = "attempt"
SOURCE_SELF = "self-reported"
SOURCE_NONE = "not-done"

UNKNOWN_RECOGNITION = "unclassified"


def _as_dt(value: Any) -> datetime | None:
    """Accept what a row gives us: a datetime, an ISO string, or nothing.

    Supabase hands back timestamps as strings with a trailing Z, which
    fromisoformat refused before 3.11, so it is normalised here rather than at
    every call site.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return _aware(value)
    text = str(value).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return _aware(datetime.fromisoformat(text))


def _aware(dt: datetime) -> datetime:
    # Comparing a naive datetime with an aware one raises, and the two sources
    # here are a database (aware) and a test or a fixture (usually naive).
    # Treating naive as UTC is the only reading that cannot silently shift a
    # deadline by the server's local offset.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@dataclass(frozen=True)
class Attempt:
    """One answer, as stored in public.attempts."""
    question_id: str
    created_at: Any
    correct: bool | None = None
    chosen: str | None = None

    @property
    def at(self) -> datetime | None:
        return _as_dt(self.created_at)


@dataclass(frozen=True)
class Item:
    """One row of public.assignment_item."""
    id: str
    kind: str
    question_id: str | None = None
    worksheet_id: str | None = None
    url: str | None = None
    title: str | None = None
    expected_minutes: int | None = None
    required: bool = True
    day_index: int | None = None


@dataclass(frozen=True)
class Assignment:
    """One row of public.homework_assignment plus its items."""
    id: str
    exam: str
    assigned_at: Any
    items: Sequence[Item] = ()
    title: str = ""
    due_at: Any = None


@dataclass(frozen=True)
class ItemStatus:
    item_id: str
    kind: str
    done: bool
    source: str
    required: bool = True
    day_index: int | None = None
    label: str = ""
    question_id: str | None = None
    attempts: int = 0
    first_attempt_at: datetime | None = None
    correct: bool | None = None
    expected_minutes: int | None = None


@dataclass(frozen=True)
class Miss:
    """A question the student answered and got wrong, with where it came from."""
    question_id: str
    recognition: str
    recognition_name: str = ""
    skill_cd: str | None = None
    difficulty: str | None = None
    chosen: str | None = None
    attempts: int = 1


@dataclass
class Progress:
    assignment_id: str
    exam: str
    statuses: list[ItemStatus] = field(default_factory=list)
    misses: list[Miss] = field(default_factory=list)
    done: int = 0
    total: int = 0
    optional_done: int = 0
    optional_total: int = 0
    percent: float = 0.0
    complete: bool = False
    questions_answered: int = 0
    questions_correct: int = 0
    minutes_remaining: int = 0

    @property
    def accuracy(self) -> float | None:
        if not self.questions_answered:
            return None
        return round(100.0 * self.questions_correct / self.questions_answered, 1)

    def by_day(self) -> dict[int | None, tuple[int, int]]:
        """(done, total) per day_index, for rendering a week as a week."""
        out: dict[int | None, list[int]] = {}
        for s in self.statuses:
            if not s.required:
                continue
            slot = out.setdefault(s.day_index, [0, 0])
            slot[1] += 1
            slot[0] += 1 if s.done else 0
        return {k: (v[0], v[1]) for k, v in out.items()}

    def by_recognition(self) -> dict[str, list[Miss]]:
        return group_by_recognition(self.misses)


def attempts_in_window(attempts: Iterable[Attempt], assigned_at: Any) -> list[Attempt]:
    """The attempts that count toward an assignment handed out at assigned_at.

    Inclusive of the boundary: a teacher who assigns a question and watches the
    student answer it in the same second has watched the homework get done.
    """
    start = _as_dt(assigned_at)
    kept = []
    for a in attempts:
        at = a.at
        if at is None:
            continue
        if start is None or at >= start:
            kept.append(a)
    return kept


def _by_question(attempts: Iterable[Attempt]) -> dict[str, list[Attempt]]:
    out: dict[str, list[Attempt]] = {}
    for a in attempts:
        out.setdefault(a.question_id, []).append(a)
    for rows in out.values():
        rows.sort(key=lambda a: a.at or datetime.min.replace(tzinfo=timezone.utc))
    return out


def _recognition(meta: Mapping[str, Any] | None) -> tuple[str, str]:
    if not meta:
        return UNKNOWN_RECOGNITION, ""
    slug = meta.get("subtype") or meta.get("recognition") or UNKNOWN_RECOGNITION
    return str(slug), str(meta.get("subtype_name") or meta.get("recognition_name") or "")


def _report_done_at(value: Any) -> datetime | None:
    """A self-report is a timestamp, but callers hand us a bare True as often
    as a done_at, and a checkbox that has been ticked is still a tick."""
    if value is None or value is False:
        return None
    if value is True:
        return datetime.now(timezone.utc)
    return _as_dt(value)


def item_status(
    item: Item,
    attempts_by_question: Mapping[str, Sequence[Attempt]],
    self_reports: Mapping[str, Any] | None = None,
) -> ItemStatus:
    """Completion for one item.

    self_reports maps item id -> done_at (or anything truthy). It is consulted
    only for the kinds whose completion cannot be observed; a self-report on a
    platform question is ignored rather than honoured, so the two sources can
    never disagree about the same tick.
    """
    reports = self_reports or {}

    if item.kind == KIND_QUESTION:
        rows = list(attempts_by_question.get(item.question_id or "", ()))
        if not rows:
            return ItemStatus(item.id, item.kind, False, SOURCE_NONE, item.required,
                              item.day_index, item.title or (item.question_id or ""),
                              item.question_id, 0, None, None, item.expected_minutes)
        last = rows[-1]
        return ItemStatus(item.id, item.kind, True, SOURCE_ATTEMPT, item.required,
                          item.day_index, item.title or (item.question_id or ""),
                          item.question_id, len(rows), rows[0].at, last.correct,
                          item.expected_minutes)

    done_at = _report_done_at(reports.get(item.id))
    label = item.title or item.url or item.worksheet_id or item.id
    return ItemStatus(item.id, item.kind, done_at is not None,
                      SOURCE_SELF if done_at is not None else SOURCE_NONE,
                      item.required, item.day_index, str(label), None, 0, None, None,
                      item.expected_minutes)


def compute_progress(
    assignment: Assignment,
    attempts: Iterable[Attempt],
    self_reports: Mapping[str, Any] | None = None,
    catalog: Mapping[str, Mapping[str, Any]] | None = None,
) -> Progress:
    """Everything the teacher tab shows for one assignment.

    `attempts` may be the student's whole history; the window is applied here
    so no caller has to remember to apply it. `catalog` maps question id ->
    bank metadata (subtype, subtype_name, skill_cd, difficulty) and is only
    needed to name the recognitions behind the misses.
    """
    window = attempts_in_window(attempts, assignment.assigned_at)
    assigned_ids = {i.question_id for i in assignment.items
                    if i.kind == KIND_QUESTION and i.question_id}
    # A student practising on their own during homework week should not inflate
    # the bar, so only attempts on assigned questions survive.
    by_q = _by_question(a for a in window if a.question_id in assigned_ids)

    statuses = [item_status(i, by_q, self_reports) for i in assignment.items]

    required = [s for s in statuses if s.required]
    optional = [s for s in statuses if not s.required]
    done = sum(1 for s in required if s.done)
    total = len(required)

    answered = sum(s.attempts for s in statuses if s.kind == KIND_QUESTION)
    correct_items = sum(1 for s in statuses if s.kind == KIND_QUESTION and s.correct)

    misses = []
    for s in statuses:
        if s.kind != KIND_QUESTION or not s.done or s.correct is not False:
            continue
        meta = (catalog or {}).get(s.question_id or "")
        slug, name = _recognition(meta)
        rows = by_q.get(s.question_id or "", ())
        misses.append(Miss(s.question_id or "", slug, name,
                           (meta or {}).get("skill_cd"), (meta or {}).get("difficulty"),
                           rows[-1].chosen if rows else None, len(rows)))

    return Progress(
        assignment_id=assignment.id,
        exam=assignment.exam,
        statuses=statuses,
        misses=misses,
        done=done,
        total=total,
        optional_done=sum(1 for s in optional if s.done),
        optional_total=len(optional),
        # An assignment with nothing in it is a draft, not a finished week. It
        # reads as 0% so an empty one cannot sit at the top of the teacher's
        # list wearing a tick nobody earned.
        percent=round(100.0 * done / total, 1) if total else 0.0,
        complete=total > 0 and done == total,
        questions_answered=answered,
        questions_correct=correct_items,
        minutes_remaining=sum(s.expected_minutes or 0 for s in required if not s.done),
    )


def group_by_recognition(misses: Iterable[Miss]) -> dict[str, list[Miss]]:
    """Misses bucketed by recognition, heaviest bucket first.

    Ordering is the useful part: the first key is what to reteach.
    """
    out: dict[str, list[Miss]] = {}
    for m in misses:
        out.setdefault(m.recognition, []).append(m)
    return dict(sorted(out.items(), key=lambda kv: (-len(kv[1]), kv[0])))


def summarise(progress: Progress) -> dict[str, Any]:
    """A flat dict for an API response, once there are routes to return it."""
    buckets = progress.by_recognition()
    return {
        "assignment_id": progress.assignment_id,
        "exam": progress.exam,
        "done": progress.done,
        "total": progress.total,
        "percent": progress.percent,
        "complete": progress.complete,
        "accuracy": progress.accuracy,
        "minutes_remaining": progress.minutes_remaining,
        "by_day": {str(k): v for k, v in progress.by_day().items()},
        "weak_recognitions": [
            {"recognition": slug,
             "name": rows[0].recognition_name,
             "missed": len(rows),
             "question_ids": [m.question_id for m in rows]}
            for slug, rows in buckets.items()
        ],
    }
