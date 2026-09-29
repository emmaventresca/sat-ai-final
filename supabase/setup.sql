-- ===========================================================================
-- SAT AI - complete setup. Paste this whole file into:
--   Supabase -> SQL Editor -> New query -> Run
--
-- It is safe to run more than once.
--
-- Contents:
--   1. schema, row-level security and the new-user trigger
--   2. the skill taxonomy, seeded from College Board's question bank
--   3. (commented) how to make yourself a teacher and add students
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- SAT AI - schema
--
-- Unlike sat-mills, this uses real Supabase Auth accounts. Every student has
-- their own login; teachers see only the students on their roster. Access is
-- enforced in the database by row-level security, not in the browser, so
-- reading the client source tells an attacker nothing useful.
--
-- Run once: SQL Editor -> New query -> paste -> Run.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- One block per type: a single shared exception handler would abort the whole
-- block on the first duplicate and silently skip the types after it.
do $$ begin create type user_role as enum ('student', 'teacher');
exception when duplicate_object then null; end $$;

do $$ begin create type content_type as enum ('lesson', 'item', 'card', 'strategy', 'triage');
exception when duplicate_object then null; end $$;

do $$ begin create type difficulty as enum ('E', 'M', 'H');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  role          user_role   not null default 'student',
  full_name     text,
  email         text,
  -- Where the student is now and where they are going. These four numbers drive
  -- the whole adaptive engine (docs/DESIGN.md section 4a).
  current_rw    int, current_math  int,
  target_rw     int, target_math   int,
  created_at    timestamptz not null default now()
);

-- A teacher's roster. Many-to-many, so a student can have more than one teacher.
create table if not exists public.roster (
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (teacher_id, student_id)
);
create index if not exists roster_student on public.roster (student_id);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table if not exists public.skills (
  skill_cd      text primary key,
  domain_cd     text not null,                     -- INI CAS EOI SEC | H P Q S
  section       text not null check (section in ('rw', 'math')),
  domain_name   text,
  skill_name    text,
  -- How many official items exist for this skill, by tier. This is the
  -- "how often does it appear on the test" term in the selection formula.
  bank_count_e  int not null default 0,
  bank_count_m  int not null default 0,
  bank_count_h  int not null default 0
);

create table if not exists public.content (
  id            text primary key,
  type          content_type not null,
  skill_cd      text references public.skills(skill_cd),
  difficulty    difficulty,
  -- The score window in which this object is worth a student's time. A 1000
  -- student is never shown band_floor 1400 material even if they would miss it.
  band_floor    int not null default 200,
  band_ceiling  int not null default 1600,
  title         text,
  body          jsonb not null,                    -- stem, choices, rationale, ...
  -- A strategy card can fire on a detected error pattern rather than on a
  -- schedule: "three contrast-vs-addition misses" surfaces the restatement trap.
  trigger       jsonb,
  -- Not optional. This is what makes "strip everything under a non-commercial
  -- licence" a query rather than an archaeology project (DESIGN.md section 2).
  source        text not null,
  license       text not null,
  created_at    timestamptz not null default now()
);
create index if not exists content_skill on public.content (skill_cd, difficulty);
create index if not exists content_type_idx on public.content (type);
create index if not exists content_band on public.content (band_floor, band_ceiling);

-- ---------------------------------------------------------------------------
-- Student activity
-- ---------------------------------------------------------------------------

create table if not exists public.attempts (
  id          bigserial primary key,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  content_id  text references public.content(id),
  session_id  text,
  correct     boolean,
  chosen      text,
  ms          int,
  flagged     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists attempts_student on public.attempts (student_id, created_at desc);
create index if not exists attempts_content on public.attempts (content_id);

-- What a student's own Bluebook results distil down to.
--
-- Deliberately narrow: there is no image column and no stem column. Uploads are
-- processed in memory and only the fingerprint is kept, which is both the
-- defensible posture on College Board's content and the thing that forces the
-- engine to reason about skills rather than items. See DESIGN.md section 2.
create table if not exists public.fingerprints (
  id            bigserial primary key,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  test_label    text,                              -- "Bluebook Practice 4"
  module        text,                              -- rw-1 | rw-2 | math-1 | math-2
  question_no   int,
  skill_cd      text references public.skills(skill_cd),
  difficulty    difficulty,
  chosen        text,
  correct_answer text,
  misconception text,
  confidence    real,                              -- how sure the classifier was
  created_at    timestamptz not null default now()
);
create index if not exists fingerprints_student on public.fingerprints (student_id, created_at desc);
create index if not exists fingerprints_skill on public.fingerprints (skill_cd);

-- Score-report level results: band seeding and the 8 domain bars.
create table if not exists public.test_results (
  id           bigserial primary key,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  test_label   text,
  taken_on     date,
  total_score  int,
  rw_score     int,
  math_score   int,
  domain_bars  jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists test_results_student on public.test_results (student_id, taken_on desc);

-- One row per (student, skill, difficulty). Leitner box plus rolling accuracy:
-- simple on purpose, because a teacher has to be able to read why the system
-- served what it served.
create table if not exists public.mastery (
  student_id       uuid not null references public.profiles(id) on delete cascade,
  skill_cd         text not null references public.skills(skill_cd),
  difficulty       difficulty not null,
  box              int  not null default 1 check (box between 1 and 5),
  seen             int  not null default 0,
  correct          int  not null default 0,
  rolling_accuracy real not null default 0,
  due_at           timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (student_id, skill_cd, difficulty)
);
create index if not exists mastery_due on public.mastery (student_id, due_at);

create table if not exists public.assignments (
  id          bigserial primary key,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  filter      jsonb not null,                      -- skills, types, difficulty
  due_at      timestamptz,
  completed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists assignments_student on public.assignments (student_id, due_at);

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

-- security definer so the policies below can consult roster and profiles
-- without recursing through those tables' own policies.
create or replace function public.teaches(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from roster r where r.teacher_id = auth.uid()
                                         and r.student_id = target);
$$;

create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher');
$$;

alter table public.profiles     enable row level security;
alter table public.roster       enable row level security;
alter table public.skills       enable row level security;
alter table public.content      enable row level security;
alter table public.attempts     enable row level security;
alter table public.fingerprints enable row level security;
alter table public.test_results enable row level security;
alter table public.mastery      enable row level security;
alter table public.assignments  enable row level security;

-- Profiles: you see yourself; a teacher also sees their roster.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.teaches(id))
  with check (id = auth.uid() or public.teaches(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- Roster: a teacher manages their own; a student may see who teaches them.
drop policy if exists roster_select on public.roster;
create policy roster_select on public.roster for select to authenticated
  using (teacher_id = auth.uid() or student_id = auth.uid());

drop policy if exists roster_write on public.roster;
create policy roster_write on public.roster for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Content and taxonomy: readable by any signed-in user, writable by nobody
-- through the API. Content is loaded by the build tools with the service key.
drop policy if exists skills_read on public.skills;
create policy skills_read on public.skills for select to authenticated using (true);

drop policy if exists content_read on public.content;
create policy content_read on public.content for select to authenticated using (true);

-- Student data: the same shape everywhere. Own rows, or your teacher's view of
-- them. Writes are always self-only, so a teacher can never fake practice.
do $$
declare t text;
begin
  foreach t in array array['attempts', 'fingerprints', 'test_results', 'mastery']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format($f$create policy %1$s_select on public.%1$s for select to authenticated
                      using (student_id = auth.uid() or public.teaches(student_id))$f$, t);

    execute format('drop policy if exists %1$s_write on public.%1$s', t);
    execute format($f$create policy %1$s_write on public.%1$s for all to authenticated
                      using (student_id = auth.uid())
                      with check (student_id = auth.uid())$f$, t);
  end loop;
end $$;

-- Assignments: the teacher writes them, the student reads their own.
drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using (student_id = auth.uid() or teacher_id = auth.uid());

drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- A student marking an assignment done is the one student-side write allowed.
drop policy if exists assignments_complete on public.assignments;
create policy assignments_complete on public.assignments for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ---------------------------------------------------------------------------
-- New signups get a profile automatically.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===========================================================================
-- 2. Skill taxonomy (29 skills)
-- ===========================================================================

-- Generated by tools/build_skills.py. Do not edit by hand.
-- Load with the service key; the anon role cannot write this table.

insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('BOU', 'SEC', 'rw', 'Standard English Conventions', 'Boundaries', 61, 55, 97)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('CID', 'INI', 'rw', 'Information and Ideas', 'Central Ideas and Details', 41, 52, 45)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('COE', 'INI', 'rw', 'Information and Ideas', 'Command of Evidence', 71, 85, 121)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('CTC', 'CAS', 'rw', 'Craft and Structure', 'Cross-Text Connections', 9, 25, 27)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('FSS', 'SEC', 'rw', 'Standard English Conventions', 'Form, Structure, and Sense', 99, 48, 61)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('H.A.', 'H', 'math', 'Algebra', 'Linear equations in one variable', 64, 28, 20)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('H.B.', 'H', 'math', 'Algebra', 'Linear functions', 82, 56, 32)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('H.C.', 'H', 'math', 'Algebra', 'Linear equations in two variables', 56, 41, 33)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('H.D.', 'H', 'math', 'Algebra', 'Systems of two linear equations in two variables', 38, 46, 42)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('H.E.', 'H', 'math', 'Algebra', 'Linear inequalities in one or two variables', 29, 29, 20)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('INF', 'INI', 'rw', 'Information and Ideas', 'Inferences', 20, 48, 72)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('P.A.', 'P', 'math', 'Advanced Math', 'Equivalent expressions', 43, 39, 34)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('P.B.', 'P', 'math', 'Advanced Math', 'Nonlinear equations in one variable and systems of equations in two variables ', 43, 60, 62)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('P.C.', 'P', 'math', 'Advanced Math', 'Nonlinear functions', 65, 92, 102)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.A.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Ratios, rates, proportional relationships, and units', 42, 32, 19)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.B.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Percentages', 28, 22, 34)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.C.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'One-variable data: Distributions and measures of center and spread', 37, 21, 26)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.D.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Two-variable data: Models and scatterplots', 34, 26, 11)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.E.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Probability and conditional probability', 24, 14, 11)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.F.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Inference from sample statistics and margin of error ', 10, 13, 5)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('Q.G.', 'Q', 'math', 'Problem-Solving and Data Analysis', 'Evaluating statistical claims: Observational studies and experiments ', 2, 3, 7)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('S.A.', 'S', 'math', 'Geometry and Trigonometry', 'Area and volume', 36, 38, 36)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('S.B.', 'S', 'math', 'Geometry and Trigonometry', 'Lines, angles, and triangles', 40, 29, 33)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('S.C.', 'S', 'math', 'Geometry and Trigonometry', 'Right triangles and trigonometry', 8, 19, 42)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('S.D.', 'S', 'math', 'Geometry and Trigonometry', 'Circles', 4, 22, 41)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('SYN', 'EOI', 'rw', 'Expression of Ideas', 'Rhetorical Synthesis', 37, 124, 43)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('TRA', 'EOI', 'rw', 'Expression of Ideas', 'Transitions', 80, 73, 41)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('TSP', 'CAS', 'rw', 'Craft and Structure', 'Text Structure and Purpose', 51, 56, 42)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;
insert into public.skills (skill_cd, domain_cd, section, domain_name, skill_name, bank_count_e, bank_count_m, bank_count_h) values ('WIC', 'CAS', 'rw', 'Craft and Structure', 'Words in Context', 142, 58, 61)
on conflict (skill_cd) do update set domain_cd = excluded.domain_cd, section = excluded.section, domain_name = excluded.domain_name, skill_name = excluded.skill_name, bank_count_e = excluded.bank_count_e, bank_count_m = excluded.bank_count_m, bank_count_h = excluded.bank_count_h;


-- ===========================================================================
-- 3. After you and your students have signed up in the app
-- ===========================================================================
--
-- Signing up creates a profile automatically. To turn your own account into a
-- teacher account, run this with your email:
--
--   update public.profiles set role = 'teacher' where email = 'you@example.com';
--
-- Then add each student to your roster:
--
--   insert into public.roster (teacher_id, student_id)
--   select t.id, s.id from public.profiles t, public.profiles s
--   where t.email = 'you@example.com' and s.email = 'student@example.com'
--   on conflict do nothing;
--
-- To check it worked:
--
--   select p.full_name, p.email, p.role, p.current_rw, p.current_math
--   from public.profiles p order by p.created_at;
