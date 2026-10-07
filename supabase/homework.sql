-- ---------------------------------------------------------------------------
-- SAT AI - homework, lesson log and turn-in
--
-- Runs ON TOP of schema.sql: profiles, roster, attempts, content and the
-- teaches()/is_teacher() helpers must already exist. Re-runnable, like
-- schema.sql - every object is guarded and every policy is dropped before it
-- is recreated, so pasting this into the SQL editor twice is harmless.
--
-- Two exams live side by side here and never mix. An assignment belongs to
-- exactly one exam, because a student working through ACT Science has no use
-- for an SAT Transitions item and should never be handed one by a join.
-- See packages/schema/exams.json.
--
-- The existing `assignments` table is left alone. It is the old
-- filter-a-set-of-skills assignment; this file adds the richer one the teacher
-- asked for (mixed items, several days, turn-in) under its own names, so
-- nothing in flight breaks while the UI moves over.
-- ---------------------------------------------------------------------------

do $$ begin create type exam_id as enum ('sat', 'act');
exception when duplicate_object then null; end $$;

-- A worksheet handed out on paper and a quiz answered in the browser are the
-- same object - a fixed set of questions with an answer key. Only the delivery
-- differs, and delivery is what decides whether completion can be observed.
do $$ begin create type worksheet_delivery as enum ('print', 'online');
exception when duplicate_object then null; end $$;

do $$ begin create type assignment_item_kind as enum ('question', 'worksheet', 'link');
exception when duplicate_object then null; end $$;

do $$ begin create type submission_kind as enum ('worksheet', 'photo', 'file', 'note', 'quiz');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Which exams a student is enrolled in
-- ---------------------------------------------------------------------------

-- The teacher asked to "assign either or both to each student but still be
-- able to toggle between". Enrolment is a row per exam rather than a column on
-- profiles, so adding ACT to a student is an insert and nothing about their
-- SAT history moves. `active` is the toggle: a student who has finished the SAT
-- keeps their rows and their history, they just stop being offered the tab.
create table if not exists public.student_exam (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  exam         exam_id not null,
  active       boolean not null default true,
  target_score int,
  test_date    date,
  added_by     uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (student_id, exam)
);
create index if not exists student_exam_active on public.student_exam (student_id) where active;

-- ---------------------------------------------------------------------------
-- What happened in the lesson
-- ---------------------------------------------------------------------------

-- Written by the teacher after a session: the compiled "lesson stuff from the
-- day" that sits next to the homework in the teacher tab. Per student and per
-- day, because the same hour with two students is two different lessons.
--
-- `covered` is free markdown on purpose. The structured parts - which skills,
-- which questions were worked through live - are separate columns so the
-- student page can link them back to the bank without parsing prose.
create table if not exists public.lesson_log (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  exam          exam_id not null,
  taught_on     date not null default current_date,
  title         text not null,
  covered       text,
  skill_cds     text[] not null default '{}',
  -- Ids from that exam's bank. Not a foreign key: the SAT bank is in
  -- public.content but the ACT bank is its own file set, and a constraint that
  -- only one exam can satisfy is worse than none.
  question_ids  text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists lesson_log_student on public.lesson_log (student_id, taught_on desc);
create index if not exists lesson_log_teacher on public.lesson_log (teacher_id, taught_on desc);

-- ---------------------------------------------------------------------------
-- Worksheets and online quizzes
-- ---------------------------------------------------------------------------

-- A generated artefact, authored once and assignable to several students, so
-- it is its own table rather than a blob on the assignment. The PDF lives in
-- Supabase Storage; only the path is kept here, matching how the rest of the
-- project refuses to put content bytes in rows it has to serve.
create table if not exists public.worksheet (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  exam          exam_id not null,
  title         text not null,
  delivery      worksheet_delivery not null default 'print',
  question_ids  text[] not null default '{}',
  answer_key    jsonb,
  pdf_path      text,
  key_pdf_path  text,
  created_at    timestamptz not null default now()
);
create index if not exists worksheet_teacher on public.worksheet (teacher_id, created_at desc);

-- ---------------------------------------------------------------------------
-- The assignment
-- ---------------------------------------------------------------------------

-- "A healthy week's worth of work" is a span, not a sitting. assigned_at opens
-- it, due_at closes it, and each item carries the day it is meant for, so the
-- student page can show Monday-to-Friday instead of one undifferentiated pile.
--
-- assigned_at is separate from created_at because it is load-bearing for
-- progress (see homework-notes.md) and a teacher must be able to post-date a
-- draft without the clock having already run.
create table if not exists public.homework_assignment (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references public.profiles(id) on delete cascade,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  exam           exam_id not null,
  lesson_log_id  uuid references public.lesson_log(id) on delete set null,
  title          text not null,
  note           text,
  assigned_at    timestamptz not null default now(),
  due_at         timestamptz,
  days           int not null default 5 check (days between 1 and 31),
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint homework_assignment_due_after_assigned
    check (due_at is null or due_at >= assigned_at)
);
create index if not exists homework_assignment_student
  on public.homework_assignment (student_id, exam, due_at);
create index if not exists homework_assignment_teacher
  on public.homework_assignment (teacher_id, created_at desc);

-- One row per thing the student has to do. Three kinds share the table because
-- the student's list is one ordered list; splitting them into three tables
-- would mean three queries and a merge sort to render a single week.
--
-- The check constraint is what keeps that honest: each kind must carry its own
-- payload and nothing else's.
create table if not exists public.assignment_item (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.homework_assignment(id) on delete cascade,
  position       int not null default 0,
  day_index      int check (day_index >= 1),       -- null = any time this week
  kind           assignment_item_kind not null,
  question_id    text,                             -- kind = 'question'
  worksheet_id   uuid references public.worksheet(id) on delete restrict,
  url            text,                             -- kind = 'link'
  title          text,
  -- The teacher's estimate, used to budget the week and to show a student how
  -- much is left. Never measured - see homework-notes.md on self-reporting.
  expected_minutes int check (expected_minutes > 0),
  required       boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint assignment_item_payload check (
    case kind
      when 'question'  then question_id is not null and worksheet_id is null and url is null
      when 'worksheet' then worksheet_id is not null and question_id is null and url is null
      when 'link'      then url is not null and title is not null
                            and question_id is null and worksheet_id is null
    end
  )
);
create index if not exists assignment_item_assignment
  on public.assignment_item (assignment_id, day_index, position);
create index if not exists assignment_item_question
  on public.assignment_item (question_id) where question_id is not null;

-- Only the items whose completion cannot be observed ever get a row here:
-- links the student watched or read, and printed worksheets. A platform
-- question's completion is derived from attempts and must never be written
-- here, or the two sources will disagree and the derived one will be right.
create table if not exists public.assignment_item_progress (
  item_id       uuid primary key references public.assignment_item(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  done_at       timestamptz,
  minutes_spent int check (minutes_spent >= 0),
  note          text,
  updated_at    timestamptz not null default now()
);
create index if not exists assignment_item_progress_student
  on public.assignment_item_progress (student_id);

-- ---------------------------------------------------------------------------
-- Turn-in
-- ---------------------------------------------------------------------------

-- Anything the student hands in: a photo of worked-out algebra, an uploaded
-- file, a typed answer, an online quiz run. item_id is nullable because a
-- student may turn in work for the week as a whole, and assignment_id is
-- nullable because they may turn in something nobody assigned.
--
-- score and feedback are the teacher's; the policies below are what stop a
-- student writing their own grade.
create table if not exists public.submission (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  assignment_id  uuid references public.homework_assignment(id) on delete cascade,
  item_id        uuid references public.assignment_item(id) on delete set null,
  exam           exam_id not null,
  kind           submission_kind not null,
  body           text,
  file_paths     text[] not null default '{}',
  submitted_at   timestamptz not null default now(),
  -- Set by the teacher, not the student. Left null until it is looked at, so
  -- "what have I not marked yet" is an index scan rather than a judgement.
  reviewed_at    timestamptz,
  score          numeric(5,2),
  feedback       text
);
create index if not exists submission_student on public.submission (student_id, submitted_at desc);
create index if not exists submission_assignment on public.submission (assignment_id);
create index if not exists submission_unreviewed
  on public.submission (submitted_at) where reviewed_at is null;

-- ---------------------------------------------------------------------------
-- Derived progress
-- ---------------------------------------------------------------------------

-- The rule in one place: a question item is done when the student attempted it
-- AFTER the assignment was handed out. Assigning something a student happened
-- to do last month must read as not started, or the teacher is looking at a
-- progress bar that measures coincidence.
--
-- A plain view, not a materialised one: it has to be correct the second a
-- student answers, and RLS on attempts has to keep applying to whoever asks.
create or replace view public.assignment_question_progress as
  select i.id              as item_id,
         i.assignment_id,
         a.student_id,
         a.exam,
         i.question_id,
         min(t.created_at) as first_attempt_at,
         count(t.id)       as attempts,
         bool_or(t.correct) as ever_correct,
         (count(t.id) > 0) as done
    from public.assignment_item i
    join public.homework_assignment a on a.id = i.assignment_id
    left join public.attempts t
           on t.student_id = a.student_id
          and t.content_id = i.question_id
          and t.created_at >= a.assigned_at
   where i.kind = 'question'
   group by i.id, i.assignment_id, a.student_id, a.exam, i.question_id;

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

-- security definer, same reason as teaches() in schema.sql: a policy on
-- assignment_item needs to read homework_assignment without tripping that
-- table's own policies and recursing.
create or replace function public.can_read_assignment(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from homework_assignment h
                  where h.id = target
                    and (h.student_id = auth.uid()
                         or h.teacher_id = auth.uid()
                         or public.teaches(h.student_id)));
$$;

create or replace function public.owns_assignment(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from homework_assignment h
                  where h.id = target and h.teacher_id = auth.uid());
$$;

create or replace function public.assigned_to_me(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from homework_assignment h
                  where h.id = target and h.student_id = auth.uid());
$$;

alter table public.student_exam              enable row level security;
alter table public.lesson_log                enable row level security;
alter table public.worksheet                 enable row level security;
alter table public.homework_assignment       enable row level security;
alter table public.assignment_item           enable row level security;
alter table public.assignment_item_progress  enable row level security;
alter table public.submission                enable row level security;

-- Student-keyed tables follow the schema.sql shape exactly: read your own rows
-- or your students', and here the teacher owns the writes - enrolment and the
-- lesson log are the teacher's record, not the student's.
drop policy if exists student_exam_select on public.student_exam;
create policy student_exam_select on public.student_exam for select to authenticated
  using (student_id = auth.uid() or public.teaches(student_id));

drop policy if exists student_exam_write on public.student_exam;
create policy student_exam_write on public.student_exam for all to authenticated
  using (public.teaches(student_id)) with check (public.teaches(student_id));

drop policy if exists lesson_log_select on public.lesson_log;
create policy lesson_log_select on public.lesson_log for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.teaches(student_id));

drop policy if exists lesson_log_write on public.lesson_log;
create policy lesson_log_write on public.lesson_log for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.teaches(student_id));

-- A worksheet is teacher-owned content, but the student it was assigned to has
-- to be able to open it, so the read test reaches through assignment_item.
drop policy if exists worksheet_select on public.worksheet;
create policy worksheet_select on public.worksheet for select to authenticated
  using (teacher_id = auth.uid()
         or exists (select 1 from public.assignment_item i
                     where i.worksheet_id = worksheet.id
                       and public.can_read_assignment(i.assignment_id)));

drop policy if exists worksheet_write on public.worksheet;
create policy worksheet_write on public.worksheet for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists homework_assignment_select on public.homework_assignment;
create policy homework_assignment_select on public.homework_assignment for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid() or public.teaches(student_id));

drop policy if exists homework_assignment_write on public.homework_assignment;
create policy homework_assignment_write on public.homework_assignment for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid() and public.teaches(student_id));

-- Items inherit the assignment's audience. Students get no write at all here:
-- the only student-side write in this file is their own progress row, below.
drop policy if exists assignment_item_select on public.assignment_item;
create policy assignment_item_select on public.assignment_item for select to authenticated
  using (public.can_read_assignment(assignment_id));

drop policy if exists assignment_item_write on public.assignment_item;
create policy assignment_item_write on public.assignment_item for all to authenticated
  using (public.owns_assignment(assignment_id))
  with check (public.owns_assignment(assignment_id));

-- Marking a link watched is the student's own claim, so only they may write it
-- - and only against an item on an assignment that is actually theirs, which
-- is what stops a crafted item_id writing into someone else's week.
drop policy if exists assignment_item_progress_select on public.assignment_item_progress;
create policy assignment_item_progress_select on public.assignment_item_progress
  for select to authenticated
  using (student_id = auth.uid() or public.teaches(student_id));

drop policy if exists assignment_item_progress_write on public.assignment_item_progress;
create policy assignment_item_progress_write on public.assignment_item_progress
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid()
              and exists (select 1 from public.assignment_item i
                           where i.id = item_id and public.assigned_to_me(i.assignment_id)));

-- Turn-in splits along the same line as attempts: the student creates the
-- work, the teacher marks it. Two separate update policies rather than one
-- shared policy, because a student must not be able to set score or feedback.
drop policy if exists submission_select on public.submission;
create policy submission_select on public.submission for select to authenticated
  using (student_id = auth.uid() or public.teaches(student_id));

drop policy if exists submission_insert on public.submission;
create policy submission_insert on public.submission for insert to authenticated
  with check (student_id = auth.uid() and reviewed_at is null and score is null and feedback is null);

drop policy if exists submission_student_update on public.submission;
create policy submission_student_update on public.submission for update to authenticated
  using (student_id = auth.uid() and reviewed_at is null)
  with check (student_id = auth.uid() and reviewed_at is null and score is null and feedback is null);

drop policy if exists submission_teacher_update on public.submission;
create policy submission_teacher_update on public.submission for update to authenticated
  using (public.teaches(student_id)) with check (public.teaches(student_id));

drop policy if exists submission_delete on public.submission;
create policy submission_delete on public.submission for delete to authenticated
  using (student_id = auth.uid() and reviewed_at is null);

-- Views run as their owner, so the base-table policies above would be bypassed
-- without this. Postgres 15+ / Supabase: security_invoker makes the view obey
-- the caller's RLS instead.
alter view public.assignment_question_progress set (security_invoker = true);
