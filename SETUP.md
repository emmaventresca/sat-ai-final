# Setup

Three steps. The only thing that needs your attention is step 2.

## 1. Build the content

The corpus is not in version control — it is College Board's, cached locally for
use with your own students. Rebuild it:

```bash
python3 tools/fetch_bank.py          # ~3,300 items, a few hours, rate limited
python3 tools/fetch_tests.py         # practice tests 4-10
python3 tools/parse_explanations.py
python3 tools/build_keys.py
python3 tools/build_skills.py
python3 tools/build_bands.py
python3 tools/build_lessons.py
python3 tools/build_items.py
```

## 2. Create the Supabase project

1. [supabase.com](https://supabase.com) → **New project**.
2. **SQL Editor → New query** → paste all of
   [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
   That creates the schema, the row-level security policies, the new-user
   trigger, and seeds all 29 skills. It is safe to re-run.
3. **Project Settings → Data API**, and copy two values into
   [`web/assets/config.js`](web/assets/config.js):
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

The anon key is public by design — it ships to every browser. What protects the
data is the row-level security in step 2, not the key. **Never put the
`service_role` key in `config.js`.**

## 3. Make yourself a teacher

Sign up in the app first so the account exists, then in the SQL editor:

```sql
update public.profiles set role = 'teacher' where email = 'you@example.com';
```

Add each student once they have signed up:

```sql
insert into public.roster (teacher_id, student_id)
select t.id, s.id from public.profiles t, public.profiles s
where t.email = 'you@example.com' and s.email = 'student@example.com'
on conflict do nothing;
```

---

## Running it

```bash
python3 -m http.server 8770
```

Students: `http://localhost:8770/web/`
You: `http://localhost:8770/web/teacher.html`

To publish, push to GitHub and turn on **Settings → Pages → Deploy from a
branch → main / (root)**. Note that `data/items.json` is gitignored, so a
published site needs the practice pool supplied another way — see
`docs/DESIGN.md` section 2 before putting item text on a public host.

## Running without a backend

Leave `config.js` blank and everything still works, storing progress in that
browser only. Useful for trying it out. The teacher view shows the single local
student so the dashboard can be seen working.

## Checking it

```bash
node tests/engine.test.mjs     # 24 tests - selection, bands, mastery
node tests/lessons.test.mjs    # 19 tests - lesson adaptivity
```
