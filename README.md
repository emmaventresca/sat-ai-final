# Task and Compass — A Grand Quest Toward Mastery

An AI-powered adaptive SAT/ACT tutoring platform with immersive world-building, gamified gem progression, and intelligent error classification. Like Lord of the Rings meets college prep: students journey through themed fantasy realms, earning gems by mastering each skill tier.

**Live app:** https://emmaventresca.github.io/sat-ai-final/
**Final project report:** [View MGT 409 submission](./report.html)
**Slides:** [10-slide presentation](./slides.html)

**Run it locally:** two commands, below. No API key needed.

---

## Run it (fresh clone, ~2 minutes)

**Requirements:** Node 18+ and Python 3.9+. Nothing else. No key, no database,
no network calls at runtime.

```bash
git clone https://github.com/emmaventresca/sat-ai-final.git
cd sat-ai-final/apps/web
npm install
npm run dev
```

Then open the URL it prints (**http://localhost:5173**).

At the sign-in screen click **"I'm the teacher"** to go straight in. That is
the local-mode bypass; see *Accounts* below for why it exists.

### What `npm run dev` does before starting

`predev` runs `tools/stage_public_data.py`, which copies the question bank out
of `data/` into `apps/web/public/data/`. That folder is **generated and
gitignored**, so this step is what puts the ~10,500 questions in place. If you
skip it and run `vite` directly, the app loads with no questions.

If `python3` is not on your PATH the install still works but the bank will be
missing. Run `python3 tools/stage_public_data.py` from the repo root by hand,
then `npx vite`.

---

## What to look at

The parts that are specific to this project rather than generic to a quiz app:

| Where | What it shows |
|---|---|
| Pick **SAT** or **ACT** → a region → a chapter → a stop | The five-level map: section → domain → skill → **recognition** → questions |
| Any stop page | Five tiers. **Foundations** and **Challenge** are ours, not the exam's; Challenge is locked until every Hard question here is answered correctly |
| Start a round | Submit-to-answer, flag, skip, question navigator, optional clock |
| An ACT Reading or English round | Passage-grouped serving, line numbers in the margin, the underlined clause marked in the passage |
| **Error log** tab | Mistakes by skill and recognition. A question leaves the list by being answered right — missing it never counts as done |
| **Teacher portal** → a student | Accuracy, pace, consistency, where misses cluster, by passage type |
| **Teacher portal** → Assign | Already-assigned questions hidden by default so the same one is not set twice |

---

## Accounts

The app runs in **local mode** out of the box: accounts live in one browser,
and the sign-in screen says so on screen. This is deliberate — it means the
app is runnable from a fresh clone with no credentials.

Connecting a real Supabase project turns on student registration gated by a
**teacher code** (no valid code, no account):

```bash
cp apps/web/.env.example apps/web/.env.local   # then fill both values
```

Then run `supabase/schema.sql` and `supabase/teacher_codes.sql` in the SQL
editor. Codes live in the database behind row-level security that gives
students **no select policy at all**; the browser can only ask "is this code
valid" through a `SECURITY DEFINER` function, never receive a list. No key is
in this repo — `.env.example` is an empty template.

---

## Authoring (optional, not needed to run the app)

The question bank in `data/` is already built and committed, so none of this
is required to try the app. It is here because the bank is the project.

`tools/` is a pipeline of single-purpose agents that call a model through one
place (`tools/cli.py`):

```
author_items.py   write questions for a recognition and tier
      |
verify_items.py   blind-solve each one; only "verified" is ever served
      |
adjudicate.py     a third opinion where author and verifier disagree
      |
check_difficulty.py   re-tier against how it actually behaves
      |
build_bank_index.py -> split_bank.py -> stage_public_data.py
```

Supporting checks: `check_coverage.py` (ten per cell), `check_variety.py`
(wording families and grid-in share), `check_books.py` (originality gate),
`check_render.mjs` (every question actually renders).

Running these needs the `claude` CLI on your PATH and will use your own
account. Every call records its real cost and token counts to
`corpus/usage.jsonl`.

---

## Layout

```
apps/web/        the React app (TypeScript, Vite, HashRouter)
  src/journey/   the map, stops, tiers, gems
  src/practice/  rounds, question rendering, highlighter
  src/errors/    the error log
  src/teacher/   portal, planner, assign, per-student metrics
data/            the question bank and taxonomy (committed)
tools/           the authoring and checking pipeline
supabase/        schema and row-level security
corpus/          run logs and measured usage
```

## House rules

- SAT and ACT banks stay **separate** for students; only the teacher crosses.
- No third-party or College Board question text is ever copied. The books are
  for studying how a question is *asked*; `tools/check_books.py` is the gate.
- `npx tsc --noEmit` from `apps/web` must pass before anything is called done.
- `tools/stage_public_data.py` is an **allowlist**: a new file under `data/`
  is private until someone adds it.

## Deployment

Not deployed on purpose. The app's login is client-side and the bank is static
JSON, so any public host serves `/data/act/questions.json` to anyone with the
URL. `DEPLOY.md` documents the intended setup — Cloudflare Pages behind
Cloudflare Access, which gates the whole site rather than just the app.
