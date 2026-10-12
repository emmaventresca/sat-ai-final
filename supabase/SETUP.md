# Connecting Supabase

Two steps, in this order. Until both are done the app runs in **local mode**:
accounts live in one browser and teacher codes are not secure. The login
screen says so on itself, deliberately.

## 1. Credentials

Supabase dashboard → Project settings → API. Copy the Project URL and the
`anon` public key.

```bash
cp apps/web/.env.example apps/web/.env.local
# then fill in the two values
```

`.env.local` is gitignored. The anon key is designed to be public — it is the
key a browser is supposed to hold — so the thing that actually protects the
data is row-level security, not key secrecy. That is why every table below has
policies and why the codes table has none for students.

## 2. Schema

SQL Editor → New query → paste and run, in this order:

1. `supabase/schema.sql` — profiles, roster, attempts, mastery, assignments
2. `supabase/teacher_codes.sql` — invite codes

Then restart the dev server so Vite picks up the new env vars.

## Checking it worked

The login screen drops the "Local mode" notice. Mint a code in the teacher
portal and look at `teacher_codes` in the table editor — the row is there, and
signing in as a student and running

```sql
select * from teacher_codes;
```

from the SQL editor **as that student's role** returns nothing. That is the
property worth testing: a student cannot read the table even though the browser
holds a valid key.

## Why redemption is a function, not a query

The obvious version — fetch the codes, compare in JavaScript — puts every code
ever issued one network-tab click away. `redeem_teacher_code` is SECURITY
DEFINER, so it reads a table the caller cannot, and it answers exactly one
question: does this code work right now. A wrong guess returns the same message
whether the code never existed or was spent last week, because "that one exists
but is used up" tells an attacker the format is right.
