# Homework, lesson log and turn-in

What `supabase/homework.sql` adds, why it is shaped this way, and the two
things a reader will otherwise get wrong.

Run it after `supabase/schema.sql`. It depends on `profiles`, `roster`,
`attempts`, `content` and the `teaches()` / `is_teacher()` helpers. It is
re-runnable: every table is `create table if not exists`, every enum is wrapped
in the same `do $$ ... duplicate_object ... $$` block schema.sql uses, and
every policy is dropped before it is recreated.

## The tables

| table | one row is |
| --- | --- |
| `student_exam` | a student's enrolment in SAT or ACT (or both) |
| `lesson_log` | what was covered with one student on one day |
| `worksheet` | a generated question set, printed or answered online |
| `homework_assignment` | a week of work for one student on one exam |
| `assignment_item` | one thing to do: a question, a worksheet, or a link |
| `assignment_item_progress` | a student's self-report that an item is done |
| `submission` | something the student handed in |
| `assignment_question_progress` (view) | derived completion for question items |

### Two exams, never mixed

`packages/schema/exams.json` keeps the SAT and the ACT separate all the way
down. That continues here. Enrolment is a row per exam rather than a column on
`profiles`, so adding the ACT to a student is one insert and nothing about
their SAT history moves; `student_exam.active` is the toggle the teacher asked
for, and deactivating keeps the history while removing the tab.

Every assignment, worksheet, lesson log and submission carries a non-null
`exam`. There is no "both" value and no assignment that spans the two — a week
of ACT Science and a week of SAT Transitions are two assignments, which is also
what makes the teacher's exam toggle a `where exam = $1` rather than a filter
over mixed rows.

### `question_id` is text, not a foreign key

The SAT bank is loaded into `public.content`; the ACT bank is its own file set
(`act/questions.json` per exams.json) and is not in that table. A foreign key
that only one of the two exams can satisfy is worse than no foreign key, so
`assignment_item.question_id`, `worksheet.question_ids` and
`lesson_log.question_ids` are plain text, validated by the loader rather than
by the database. If the ACT bank later lands in `content` as well, this is the
constraint to add.

### An assignment is a week, not a sitting

The teacher's phrase was "a healthy week's worth of work". So:

* `assigned_at` opens the window, `due_at` closes it, `days` says how long the
  week is meant to be (a check constraint keeps `due_at >= assigned_at`).
* `assignment_item.day_index` is the day the item is *meant* for. It is a
  suggestion, not a lock — nothing refuses a student who does Friday's work on
  Monday — but it is what lets the student page render five days instead of one
  pile of nineteen things, and it is what makes "they stopped after Tuesday"
  visible to the teacher.
* `expected_minutes` per item is how the week gets budgeted. It is the
  teacher's estimate and is never measured against the clock.

### One item table, three kinds

Questions, worksheets and links share `assignment_item` because the student's
week is one ordered list; three tables would mean three queries and a merge
sort to draw it. The `assignment_item_payload` check constraint is what keeps
that honest — each kind must carry its own payload column and must leave the
other kinds' columns null. A "link" additionally requires a `title`, because an
unlabelled URL in a homework list is not an assignment.

A printed worksheet and an online quiz are the same object — a fixed set of
questions and an answer key — so there is one `worksheet` table with a
`delivery` column. Only delivery differs, and delivery is exactly what decides
whether completion can be observed (see below).

---

## The two things to get right

### 1. Only attempts after `assigned_at` count

A question item is complete when the student has at least one row in
`attempts` for that `content_id` whose `created_at >= assignment.assigned_at`.

This is lifted from the act-mastery assignment model and it matters more than
it looks. Without it, assigning a question a student happened to answer three
weeks ago shows up as already complete the moment it is assigned. The teacher
then reads a progress bar that is measuring coincidence: it says "4 of 10" when
the student has done nothing this week. Worse, the obvious fix a future
optimiser reaches for — "just join attempts on question_id, it's faster" — puts
the bug straight back, which is why the rule lives in exactly two places and
both are commented:

* `public.assignment_question_progress`, the view;
* `compute_progress()` in `services/api/app/homework.py`.

Details that are deliberate:

* **The boundary is inclusive** (`>=`, not `>`). A teacher who assigns a
  question and watches the student answer it in the same second has watched the
  homework get done.
* **`assigned_at` is separate from `created_at`** so a draft can be written on
  Sunday and handed out on Monday without the clock having already run.
* **Wrong still counts as done.** Answering is the work; correctness is a
  separate axis, reported as misses. An item is "not done" only if it was never
  attempted. The teacher asked to see "how much they completed/where they are
  missing questions" — those are two different numbers and the model keeps them
  two different numbers.
* **Only attempts on assigned questions count.** A student grinding unrelated
  practice during homework week does not move the bar.
* **Re-assigning is free.** The same question handed out again next month opens
  a new window, so the second assignment starts empty even though the first one
  is full. That is the behaviour you want for a reteach.

The view is a plain view, not materialised: it has to be correct the second a
student answers. It is marked `security_invoker = true` (Postgres 15+), without
which the view would run as its owner and quietly bypass the RLS on `attempts`.

### 2. External-link completion has to be self-reported

We cannot observe a student watching a Khan Academy video, reading an article
or working a printed worksheet. There is no callback, no completion webhook we
control, and an embedded page cannot be trusted to report progress about a
third-party site even if it offered to. So for `link` and `worksheet` items,
completion is a row in `assignment_item_progress` written by the student — a
checkbox, with an optional minutes-spent and a note.

The consequence, which the teacher UI must show rather than hide: a tick on a
link is a **claim**, and a tick on a question is **evidence**. Both appear in
the same progress number, so `ItemStatus.source` carries which one it was
(`self-reported` vs `attempt`) all the way to the surface. A teacher looking at
80% should be able to see at a glance how much of that 80% the platform
actually watched happen.

Two rules follow from this and are enforced:

* **A self-report can never tick a platform question.** The derived answer is
  the right one, so a progress row against a question item is ignored by
  `item_status()` rather than honoured. If both sources could write the same
  tick they would eventually disagree, and the wrong one would win half the
  time.
* **A student cannot write a progress row against someone else's item.** The
  insert policy checks `assigned_to_me(item.assignment_id)`, not just
  `student_id = auth.uid()` — otherwise a crafted `item_id` lets a student
  stamp "done" into another student's week.

The real check on a link is the `submission`: a photo of notes, a quiz score, a
paragraph typed into the box. That is the teacher's evidence when the checkbox
is not enough, which is why turn-in is a first-class table and not a column.

---

## Row-level security

RLS is the whole access-control story here, same as in schema.sql; nothing is
enforced in the browser. Every one of the seven tables has it enabled.

The shape repeats:

* **Read**: `student_id = auth.uid() or public.teaches(student_id)`. A student
  sees their own rows; a teacher sees their roster's.
* **Write**: whoever owns the record. Enrolment, lesson logs, assignments,
  items and worksheets are teacher-owned (`teacher_id = auth.uid()`, plus a
  `with check` that the target student is actually on the roster, so a teacher
  cannot assign to a stranger). Progress rows and submissions are
  student-owned.

Tables with no `student_id` of their own — `assignment_item`, and `worksheet`
when a student opens one — reach through to the parent assignment using three
`security definer` helpers added here: `can_read_assignment()`,
`owns_assignment()` and `assigned_to_me()`. They are `security definer` for the
same reason `teaches()` is: a policy on the child table has to read
`homework_assignment` without tripping that table's own policies and recursing.

`submission` is the one table with split update policies. A student may edit
their submission only while `reviewed_at is null`, and their `with check`
forbids setting `score`, `feedback` or `reviewed_at` at all; the teacher's
update policy is the only path to a grade. Delete is student-only and also only
before review, so marked work cannot be made to disappear.

What this does **not** cover: Supabase Storage. Worksheet PDFs and submitted
photos are paths (`worksheet.pdf_path`, `submission.file_paths`), and storage
buckets carry their own policies. Those need writing separately — a correct row
policy over a world-readable bucket protects nothing.

---

## The Python side

`services/api/app/homework.py` computes all of the above from plain data —
an assignment spec, a list of attempts, a map of self-reports, and optionally
the bank metadata for the assigned questions. No FastAPI, no database driver,
standard library only, so the rules are unit-testable and the same code can
serve a route, a nightly report or the worksheet grader.

`compute_progress()` returns per-item status, overall done/total/percent,
minutes remaining, a per-day breakdown, and the missed questions grouped by
**recognition** — the subtype slug from `data/subtypes.json`, the "tell" the
question is testing. Grouping is what makes the misses useful: "six wrong" is
not actionable, "six wrong, five of them addition-vs-contrast transitions" is
a lesson plan. Buckets come back heaviest-first, so the first key is what to
reteach.

Two choices worth knowing:

* **Percent is over required items only.** Optional items are reported
  separately (`optional_done` / `optional_total`) so a stretch reading cannot
  drag a finished week below 100%.
* **An empty assignment is 0%, not 100%.** It is a draft, not a finished week.
  The vacuous-truth reading would sort empty drafts to the top of the teacher's
  list wearing a tick nobody earned.

Tests: `python3 services/api/tests/test_homework.py` (pytest is not installed;
plain asserts and a `__main__` runner).
