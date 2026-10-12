-- ---------------------------------------------------------------------------
-- Teacher codes
--
-- Registration is invite-only: a student needs a code from their teacher or
-- they do not get an account. The whole value of that is security, so the
-- design rule is that THE BROWSER CAN NEVER READ THE CODE TABLE.
--
-- A client-side check - fetch the codes, compare in JavaScript - would let
-- anyone open the network tab and read every code we ever issued. So:
--
--   * `teacher_codes` has row-level security with no select policy for
--     students at all. A teacher sees only their own.
--   * Redemption goes through `redeem_teacher_code`, a SECURITY DEFINER
--     function. The browser sends a candidate code and gets back yes or no.
--     It never receives a list and cannot enumerate one.
--   * Codes are single-use by default and carry an expiry.
--
-- Run after schema.sql.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.teacher_codes (
  code        text primary key,
  teacher_id  uuid not null references auth.users on delete cascade,
  -- What the teacher wrote on it, so a sheet of codes is usable on paper.
  label       text,
  -- Null until redeemed; then the student who used it.
  used_by     uuid references auth.users on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '90 days'),
  -- A class code can be reused; a per-student code cannot.
  max_uses    int not null default 1,
  uses        int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists teacher_codes_teacher on public.teacher_codes (teacher_id);

alter table public.teacher_codes enable row level security;

-- A teacher sees and manages their own codes. There is deliberately NO policy
-- that lets a student select from this table at all - not even their own row,
-- because "select your own row" still requires guessing a code to find it,
-- and a guessable-row policy is how enumeration starts.
do $$ begin
  create policy teacher_codes_own on public.teacher_codes
    for all to authenticated
    using (teacher_id = auth.uid())
    with check (teacher_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Redemption
--
-- SECURITY DEFINER so it can read the table the caller cannot. It is the only
-- door, and it only ever answers one question: does THIS code work right now.
--
-- Comparison is case-insensitive and ignores the dashes people type, because
-- a code read off a whiteboard is going to arrive in whatever shape the
-- student's fingers produced.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_teacher_code(candidate text)
returns table (ok boolean, teacher_id uuid, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.teacher_codes%rowtype;
  norm text := upper(regexp_replace(coalesce(candidate, ''), '[^a-zA-Z0-9]', '', 'g'));
begin
  if auth.uid() is null then
    return query select false, null::uuid, 'not signed in'; return;
  end if;
  if length(norm) < 6 then
    return query select false, null::uuid, 'that code is too short'; return;
  end if;

  select * into row from public.teacher_codes c
   where upper(regexp_replace(c.code, '[^a-zA-Z0-9]', '', 'g')) = norm
   limit 1;

  if not found then
    -- Deliberately the same wording as an expired code: telling an attacker
    -- "that one exists but is used up" is telling them the format is right.
    return query select false, null::uuid, 'that code is not valid'; return;
  end if;
  if row.expires_at < now() or row.uses >= row.max_uses then
    return query select false, null::uuid, 'that code is not valid'; return;
  end if;

  update public.teacher_codes
     set uses = uses + 1,
         used_by = coalesce(used_by, auth.uid()),
         used_at = coalesce(used_at, now())
   where code = row.code;

  insert into public.roster (teacher_id, student_id)
  values (row.teacher_id, auth.uid())
  on conflict do nothing;

  update public.profiles set role = 'student' where id = auth.uid();

  return query select true, row.teacher_id, null::text;
end $$;

revoke all on function public.redeem_teacher_code(text) from public;
grant execute on function public.redeem_teacher_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Issuing
--
-- Generated in the database, not the browser: a code minted client-side is a
-- code whose randomness depends on whatever the laptop felt like doing, and
-- it would also have to be inserted by a client that can write the table.
--
-- The alphabet drops I, O, 0 and 1 - these get read aloud and written down.
-- ---------------------------------------------------------------------------
create or replace function public.mint_teacher_code(
  student_label text default null,
  uses int default 1,
  days int default 90
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  body text := '';
  i int;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  for i in 1..8 loop
    body := body || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  body := substr(body, 1, 4) || '-' || substr(body, 5, 4);

  insert into public.teacher_codes (code, teacher_id, label, max_uses, expires_at)
  values (body, auth.uid(), student_label, greatest(1, uses),
          now() + make_interval(days => greatest(1, days)));
  return body;
end $$;

revoke all on function public.mint_teacher_code(text, int, int) from public;
grant execute on function public.mint_teacher_code(text, int, int) to authenticated;
