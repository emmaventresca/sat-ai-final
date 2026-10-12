# Backlog

Things Emma asked for that are **not done yet and have not been superseded**.

This file exists because sessions end mid-task — usually on a token limit, in
the middle of something — and the next session starts with a summary that
compresses away the half-finished asks. A request that got one sentence of
acknowledgement and no code is indistinguishable, after compaction, from one
that shipped. So it gets written down here instead.

**Rules for whoever is working:**

1. At the start of a session that resumes from a stop, read this file and ask
   Emma which of these she wants to pick up. Don't silently start on one.
2. Anything about **design or UI** gets done rather than asked about — that was
   the explicit instruction. Ask about scope and sequencing, not about whether.
3. When a request is superseded by a later strategy, move it to **Dropped**
   with the reason. Deleting it loses the fact that it was considered.
4. Close an item only when it is actually in the app and `npx tsc --noEmit`
   passes — not when the data layer behind it exists.

Status: `open` · `partial` (data layer done, nothing surfaced) · `blocked` ·
`needs-verification` (built, never seen working)

---

## Open

### ACT importer: one re-run left
`partial` — relayed 2026-10-08, re-audited 2026-10-12

The bug that mattered is fixed. Explanations reference choices by LETTER now:
`tools/fix_choice_refs.py` rewrote 221 refs across 86 items in
`data/act/questions.json` (verified: no `choice <digit>` left in any
`explanation` field there or in the `data/act/q/` shards; 45 deliberately left
where the digit is a value, e.g. "the choice 5 + sqrt(169)i", which live in
`trap`/`per_choice`, and the UI does not read those). `import_act.py` gained
`letter_choices()` so a re-import cannot reintroduce it. chart-as-list,
`passage_id` and the underlined handling were already in the importer
(audited 2026-10-11).

Left: `tools/sync_act.sh` has **not** been re-run since. The repair was applied
to the committed output, not the source: `~/act-mastery/backend/content/`
still carries the 0-based refs (194 `choice <digit>` hits, some of them values).
Re-run once and confirm the diff to `data/act/` is empty or explained, so the
fix is shown to survive a real import rather than assumed.

### Sixty environmental concept art backdrops (real artwork)
`partial` — manifest done, assets do not exist. Audited 2026-10-11.

`journey/backdrops.ts` holds the 60 slots; `artProgress()` would return
0/60 and nothing outside the file calls it. The flat-poster scenes below are
the stand-in, not the artwork. Needs image files dropped at the documented
paths (see `docs/ART_DIRECTION.md`) and the question screen wired to prefer
them over the code-drawn scene.

### Mini lessons themed like the rest of the quest
`open` — asked 2026-10-08, re-checked 2026-10-11
(waterfall/mushroom art exists only in the question scenes, not the stop pages)

Waterfalls, trees, forests, mushrooms. The stop pages are the one screen that
still looks like a document.

### Student accounts gated by a teacher code
`partial` — asked 2026-10-08, built the same day

Done: the login screen (`auth/Login.tsx`) on the same sunrise as the chooser;
`auth/auth.ts` with a Supabase path and a local dev fallback that says on
screen that it is not secure; `supabase/teacher_codes.sql` with the codes
table, row-level security that gives students **no select policy at all**, a
`redeem_teacher_code` SECURITY DEFINER function so the browser can ask "does
this code work" without ever receiving a list, and `mint_teacher_code` so
codes are generated in the database rather than the browser. Teacher-only
routes are guarded by role. `Codes.tsx` in the portal mints and copies them.

Left: connect a real Supabase project (`apps/web/.env.local` from
`.env.example`, then run the two SQL files). Until then it is local mode.

Students register with a username, a password, and a **teacher code**. No valid
code, no account. A registered student appears on Emma's board automatically.
Emma generates a code per student.

Security is the whole point of the feature, so: codes never in the repo, never
in the published bundle, never in `apps/web/public/`. Supabase holds them with
row-level security; the browser only ever gets to ask "is this code valid",
never to read the list. `tools/stage_public_data.py` is already an allowlist,
which helps, but the codes must not live under `data/` at all.

### Gem seals on the world map
`open` — noticed 2026-10-08, re-checked 2026-10-11: `WorldMap.tsx` has no gem code

Gems render on the realm card and the path, not yet on the SVG map itself.
A realm whose paths all carry gems should show it on the map.

### Blend ACT ← SAT
`blocked` — on Emma's ACT bank settling (1384 → 1519 → 1734 this session)

ACT has no Foundations or Super-hard tier and no misconception slugs. Deliberately
deferred: blending against a moving bank means doing it twice.

### Math font for plain-text algebra
`open` — started and interrupted; nothing landed that I can see (2026-10-11)

About 154 SAT items carry algebra written as plain text with no `$...$`, so
`lesson/math.ts` never typesets them. Figure is Emma's session count, not
re-measured here. Needs a detector or a re-author, then a render check.

### Four original practice tests per exam
`open` — nothing built (no practice-test code in `apps/web/src`)

Timed and untimed modes, highlighter, cross-out, a Desmos prompt, slightly
harder than the bank. The highlighter exists (`practice/Annotatable.tsx`) and
`Round.tsx` now has a clock (off by default), previous/next, flag and a
question navigator; a Desmos prompt, test-length timed mode and the test
assembly do not.

### Re-author the failed items, review the flagged ones
`open` — re-measured 2026-10-12 from `data/bank/*.json`: **188** `fail`,
**100** `review`, **7** `unverified`, **10,155** `verified`

(Was 176 / 69 / 185 / 7,712 on 2026-10-11. The unverified backlog is cleared;
fail and review rose because more items were verified and some of them
failed, not because anything regressed.) The bank files carry no reason string
at item level, so the old breakdown (tables named but not shown, correct
answer far longer than the distractors, unknown misconception family) is not
re-derived; re-run `verify_items.py` reporting to get it. Items in `fail`
and `review` do not reach students.

### ACT passage stems: 155 still duplicate the passage
`open` — new 2026-10-12

`tools/fix_act_stems.py` fixed 917 of 1,072 stems that repeated the passage
text (committed in 9fc09ae). The 155 left are all Reading, concentrated in
rhetorical-choice, vocabulary-in-context and point-of-view. Count is as
reported by the session that ran it; not re-measured here.

### Tokenomics: what it costs to run the app
`partial` — asked, metering built 2026-10-12, no view

Emma wants to see the cost of authoring questions, developing lesson plans,
and students requesting more questions. Done: `tools/cli.py` records real
per-call cost and tokens to `corpus/usage.jsonl` (model, usd, in/out, cache
read/write), tagged by activity (so far the tag seen is `verify`). Left: a
summariser tool and a page that shows it; nothing reads `usage.jsonl` yet.
Also check every authoring/planner caller actually passes a `tag`, or the
split by activity will be one lump.

### Mystical cave: student-generated question banks
`open` — asked 2026-10-12, nothing built (no code for it in `apps/web/src` or `tools/`)

A student asks for e.g. "another systems question that's a word problem", has
it generated, and saves it to their own personal bank, as the teacher side
does but for students. **Teachers must be able to see each student's search
history and generated questions, and the student must be told on screen that
teachers can see it.** Constraint: generation runs through the local `claude`
CLI (`tools/cli.py`), so like the teacher Planner it works only on Emma's
machine, not for a deployed student. Needs a decision on that before
building. Keep SAT and ACT banks separate for students.

### Assign page: create more and add to bank
`open` — asked 2026-10-12, not built

A button on the Assign page that generates questions on demand for a chosen
category and adds them to the platform. `teacher/Assign.tsx` has no generation
call. Same local-CLI constraint as above; the planner server is the likely
route.

### Clickable attempt rows in StudentDetail
`needs-verification` — implemented 2026-10-12 (committed bdd74c6; `QuestionPeek`
is imported in `StudentDetail.tsx`), never seen rendering

A student detail page cannot be reached in local mode (the roster does not
surface one without Supabase), so the peek panel has not been looked at.
`tsc` passes, which says nothing about it working. Needs Supabase connected,
or a seeded local roster, and a look.

### Retire the old vanilla app at `web/`
`open`

Only once the React app is confirmed to cover it. `web/` still exists (app.js, charts.js, index.html).

---

## In flight

### Variety: the kinds of question, not the count
Measured 2026-10-10 by `tools/check_variety.py`.

Coverage was answering the wrong question. A recognition can hold forty
questions and still only ever ask ONE way, and a student who has met it forty
times phrased directly has not met the way the test asks it.

Two dimensions the bank was blind to:

* **Wording.** 112 of 181 recognitions ask only one way. The whole bank
  carries **eight** "NOT ... EXCEPT" questions — 0.1%. A student loses a whole
  wording family across six different topics and a topic-only report hides it
  completely.
* **Format.** Grid-ins are 15.9% of our maths against **27%** on the real
  paper, and **36 of 109** maths recognitions have none at all. A student who
  only ever sees multiple choice has an eliminating strategy that works on
  three quarters of the section and nothing for the rest.

Re-measured 2026-10-12 by `check_variety.py`: **0** recognitions ask only one
way (was 112, then 64); **0** maths recognitions lack a grid-in; grid-ins are
**26.8%** of maths against 27% on the real paper (the checker's own reachable
ceiling is 25.1%, so it is at or past it; worth Emma knowing). `not_except` is
2.2% (224 questions, was 8).

**Remaining: 71 cells / 105 questions** (was 557 / 1,844).

`author_items.py` gained `--phrasing`, with a written brief per family; it
already had `--format grid`. Authored items now record the family so the bank
can be measured on variety rather than only on topic and tier.

### Ten questions at every level, in every recognition
Started 2026-10-09. `tools/check_coverage.py` measures it; `author_missing.py`
is running against the gaps.

The floor is ten each at Easy, Medium, Hard and **Challenge** for every
subtype — the smallest grouping a student practises from. Below ten a round
repeats itself and a streak means nothing.

At the start: SAT 3,572 short, ACT 3,231. Measured 2026-10-12 by
`check_coverage.py`: **3,348 still to author** for ten at E/M/H/X.

* SAT: 1,025 — E 63, M 8, H 386, X 568; 96 of 182 recognitions complete.
  What is left is mostly Hard and Challenge.
* ACT: 2,323 — E 684, M 529, H 498, X 612 (unchanged since 2026-10-11).
  Only 1 of 123 ACT recognitions is complete.

A long job: 2,406 items on the SAT side in this pass. **ACT authoring belongs
in the ACT project**, not here — this repo imports that bank one way, and
writing ACT questions on both sides would fork it.

## Done this session

### Shipped 2026-10-12 (commits b0b0f64 .. bdd74c6)
Verified in code unless marked; `npx tsc --noEmit` passes from `apps/web`.

- **ACT map draws a route across all four sections.** `grouping()` in
  `journey/map.ts` files ACT stops under the reporting category. From
  `data/act`: English 5 chapters, Math 8, Reading 10, Science 3, 148
  recognitions. Emma confirmed it on screen. (Moved here from Open.)
- ACT explanations say "Choice C", not "Choice 2" (see the importer item for
  what is left).
- ACT passages show line numbers (`practice/LineNumbers.tsx`, used by
  `Annotatable.tsx`); underlines render in the passage. ACT English is
  passage-grouped (`PASSAGE_SECTIONS` in `journey/passages.ts`).
- Round: Previous/Next (skip records nothing), flag, question navigator, clock.
- Shared header `ui/TopNav.tsx`, mounted from `App.tsx`.
- `Homework.tsx` reads the signed-in student, not `roster()[0]`. If no roster
  entry matches the signed-in account it now shows nothing rather than someone
  else's work.
- Error log headings show skill names, not codes.
- World maps: a dot per recognition, the traveller steps one dot per stop
  cleared (`WorldMap.tsx`). This replaced the dropped trail map below.
- Global CSS: `input,select{width:100%}` no longer stretches checkboxes (was
  breaking the Assign page).
- `tools/cli.py` meters real per-call cost to `corpus/usage.jsonl`.
- 917 of 1,072 duplicated ACT stems fixed (remainder is an Open item).

### Verifier no longer hides good items; variety tooling fixes
Shipped 2026-10-11, verified in code. `verify_items.py` no longer overwrites
status with "error" when the solve never happened (it had stamped 1,251 good
items, which `build_bank_index.py` then withheld from students); all 1,251
were reset to `unverified`. `author_items.py` rule 4 no longer emits the
subtype name as the misconception slug. `check_variety.py` reports the
reachable grid-in ceiling. `npx tsc --noEmit` passes.
Committed since (HEAD is bdd74c6, 2026-10-12). The 1,251 reset items have since
been re-verified down to 7 unverified.

### Challenge gate, traveller, worked examples
Found built 2026-10-11 (now committed): `challengeGate` is wired in `Stage.tsx`
with a locked tile; `Traveller.tsx` is mounted in `WorldMap.tsx`;
`WorkedExample` renders in `Stage.tsx`. Difference from the ask: the gate
opens when every Hard question has been *attempted*, not ~ten answered right,
a deliberate choice stated in `promotion.ts`. Worth Emma confirming.

### Sixty backdrops: ten DISTINCT scenes per world (code-drawn)
Shipped in code 2026-10-08/09 (moved from Open 2026-10-11). — asked 2026-10-08, sharpened the same day

Not ten tints of one view — **ten different places in the same world**, each
its own composition. For the World's Fair world that means a boardwalk, a
pier at dusk, the ferris wheel up close, beaux-arts pavilions along a canal
with boats, a midway, and so on; the others get the same treatment in their
own register.

Done: `journey/Scene.tsx` with the plumbing — stable variant per question id
(`variantOf`), wired into `Round.tsx`, drawn from the world palettes so it
ships as nothing and can never drift from the maps.

**Sky pass 2026-10-09.** Every two-stop sky in all six worlds deepened to
four stops. A two-stop ramp is a wash; four is a sky going somewhere, and on
a flat poster where nothing else is modelled it is the only depth the upper
half gets. 45 palettes changed.

**All six worlds done 2026-10-08.** Sixty scenes, verified 10/10 distinct per
world by rendering every variant off-screen and diffing the markup.

- `FairScenes.tsx` — the wheel from beneath, a canal with gondolas, the
  peristyle, the midway, a bandstand, the entrance arch, the electric tower,
  under the pier, a high view over the domes, the carousel.
- `PeaksScenes.tsx` — base camp pre-dawn, the prayer-flag pass, the icefall,
  the summit ridge, down a glacier, the monastery terrace, a sea of cloud,
  the south face, the frozen lake, night with only the summit lit.
- `TropicScenes.tsx` — Ocean Drive, a hotel across a pool, the lifeguard
  stand, the coast road, the marina, a volcanic ridge, a corner bay, the pool
  deck after dark, a jungle valley, the causeway.
- `ParkScenes.tsx` — slot canyon, sequoia grove, geyser basin, alpine lake,
  hoodoo amphitheatre, waterfall, the rim overlook, a glacial valley, a
  natural arch, a thermal pool.
- `CoastScenes.tsx` — highland: stack field, loch, broch, glen, sea arch,
  standing stones, harbour, storm wall, the pass, clifftop in a gale. Ocean:
  open horizon, reef, lighthouse, tidal flats, dune crest, boats, sandbar,
  clearing squall, clifftop, night swell.

The generic ridge stack now survives only as the near foreground band; every
world draws its own subject. `Land.tsx` and `Frame.tsx` are deleted.

Earlier note, kept because the diagnosis generalises — — ten real compositions in
`FairScenes.tsx`, built from drawn architecture in `Boardwalk.tsx`: the wheel
from beneath its leg trusses, a canal with gondolas closing on a lit arch, the
peristyle, the midway from the pier head, a bandstand with a crowd in
silhouette, the entrance arch, the electric tower across the lagoon, under the
pier, a high view over the domes, and the carousel. Every lamp is a drawn bead
on a real architectural edge — a blurry glow layer reads as a filter, beads
read as 1904 — and the brightest value sits in the midground, which is the
hour.

Still to do, in world-sized batches: peaks, tropic, park, cliffs, ocean. The
three research briefs in the session history name all ten scenes for each.

### Error log, and a counting correction behind it
Shipped 2026-10-09.

**The correction first, because it changed numbers everywhere.** A missed
question used to count as done. A stop would say "all 21 done" and fill its
bar when what happened was that the student met 21 questions and got six
wrong. That was the one place the app flattered somebody instead of telling
them where they stand. A question is finished when it has been answered
CORRECTLY; until then it stays in `left`, and `serveOrder` puts it back in
front of them.

`errors/log.ts` derives the log from attempt history rather than storing it,
so it can never drift from what the student actually did. `errors/ErrorLog.tsx`
is the tab, at `/:exam/errors` with an open count on it.

Three things a student can do there: re-solve the exact question, write what
went wrong in their own words, and see which recognitions keep producing
mistakes. **There is no dismiss button, deliberately** — a list you can clear
without fixing anything becomes a list nobody trusts. A mistake leaves the
open list by being answered right and by nothing else.

Teacher side: open/fixed counts, the worst topics, and the student's own
notes — the one thing on that page nobody generated.

11 tests. The one worth keeping: a correct answer BEFORE the miss does not
count as a fix. Right on Monday, wrong on Wednesday is still open.

Teacher can now set a student their own mistakes as homework
(`teacher/AssignErrors.tsx`): the most useful assignment available and one
that could not be made before — not "twenty more Percentages questions" but
"the four you got wrong, again". Open errors only; a question they have
already come back and fixed is not homework, and listing it would teach them
that fixing something does not get it off the list.

### ACT figures: 2,129 displays that never rendered
Shipped 2026-10-09.

Every ACT Science question that said "Table 1 shows…" rendered no table.
Unanswerable, silently, across the whole section.

The data was fine. `renderFigure` only understood chart SPECS, and the ACT
bank ships its figures as finished SVG — drawn by that project's own chart
and diagram renderers, which is right, because they know about apparatus
diagrams and cross-sections and cycles this module has never heard of. They
arrived as strings, hit `if (!isFigureSpec(spec)) return ''`, and vanished.

Fixed by passing drawn markup through (guarded so only something that starts
as a display is allowed), and by rendering `type: 'table'` specs as real
tables — the commonest display in the section and falling through the same
gap. 2,129 figures across 759 Science questions.

### ACT Reading served by passage, and passage type as a dimension
Shipped 2026-10-09.

`journey/passages.ts` serves Reading and Science rounds by taking passages
WHOLE. Practising those one question at a time means reading a fresh passage
for every question — four minutes of reading for forty seconds of question,
and nothing like the real section, where you read once and answer ten. A
passage is never split across rounds, because the half met tomorrow costs a
second full read. Round length therefore varies, and the level tile says
"2 passages · 17 questions a round" so a student knows what they are agreeing
to. 9 tests in `tests/passages_test.mjs`.

`passage_type` is now its own dimension: carried through the importer, into
the light index, and onto the teacher's student page as accuracy by genre.
A student can be fine on Craft & Structure in a science passage and lost in
prose fiction, and a subtype average reports one number covering both.

**A real bug found while wiring it.** `section_from()` in the importer derived
the section from the FILENAME and fell back to `"math"` when nothing matched.
`questions_mirrors_passage.json` matched no marker, so 69 Reading questions
were filed as maths. Nothing failed — they just appeared in the wrong world,
and the serving code read the section off `pool[0]`, so two stray maths items
in a 70-question Reading recognition turned passage grouping off for the whole
thing. Silently, because a wrong section never throws.

Fixed in three places, because one was not enough:
* the importer now decides from the skill when the filename cannot, and a
  question with a shared `passage_id` is never maths (69 strays → 41);
* the taxonomy takes the MAJORITY section per subtype, not the first question;
* the serving code does the same, so remaining strays cannot switch a feature
  off.

The import now reports subtypes spanning two sections instead of hiding them.
First attempt at the fallback over-corrected — I treated `stimulus` as a
passage signal and moved 156 maths word problems into Reading, since a maths
scenario has a stimulus too. Only `passage_id` counts.

### Backgrounds: flat poster illustration, world 1 of 6
Shipped 2026-10-08, SAT Math approved by Emma.

The diagnosis that finally stuck: four attempts failed not because of the
palette but because authored vector shapes were being used to fake a
PAINTING — soft blurred masses, haze gradients, atmospheric falloff. Those
are a painter's tools and code imitating them produces blurry abstract blobs,
which is exactly what Emma kept rejecting. Vector is natively excellent at
flat poster illustration instead (WPA parks posters, vintage travel posters,
Eyvind Earle), and that register looks deliberate rather than like failed
painting.

`poster.ts` holds the ten palettes as a single walk — read the planes column
down the page and the journey is visible before any shape is drawn.
`QuestScenes.tsx` holds the ten scenes, each built from specific shapes: a
round-doored cottage, a mill with a wheel, a stair with worn treads, a gate
with one lamp lit. `Sheet.tsx` at `/#/sheet` is the contact sheet, and it
renders a stand-in question card over every scene — a background judged on
its own always looks better than it does in use, which is how four rounds got
approved in my head and rejected on screen.

Two fixes after first review: the card covers 76% of the frame and the
subjects were all behind it, so everything moved to the outer eighths and the
bottom; and the trees were a circle on a stick, so broadleaves became a crown
of seven overlapping lobes on a forked trunk and conifers went from four
symmetrical tiers to six uneven leaning ones.

**All six worlds done 2026-10-08.** Sixty scenes, verified 10/10 distinct per
world by rendering every variant and diffing the markup.

- `QuestScenes.tsx` — From Countryside to Final Ascent (SAT Math)
- `VoyageScenes.tsx` — The Great Sea Voyage (SAT Reading & Writing)
- `ParksPosters.tsx` — America the Beautiful (ACT Science)
- `FairPosters.tsx` — The Boardwalk (ACT Reading)
- `AlpinePosters.tsx` — Alpine Expedition (ACT English)
- `TropicPosters.tsx` — Retro Hawaiian Vacation (ACT Math)

`/#/sheet` switches between all six. The painterly `Scene` is off the question
screen entirely.

**The recipe, learned from the one scene Emma picked out** (the ferris wheel):
a four-stop sky with somewhere to go, ONE big hero pushed to an edge, one
clean dark horizontal, warm points of light, and almost no line work. The
scenes that read as empty were two-stop skies with no hero; the ones that read
as "chopped" were many small forms where one long one would do.

Two corrections worth keeping:

* **ACT Reading is a BOARDWALK, not an exposition.** It had drifted inland to
  domes, colonnades and a formal garden. The references were Atlantic City and
  Myrtle Beach — a wooden deck by the ocean — so every scene now has sand,
  water or planks, and most have all three.
* **Crowds out.** Thirty tiny figures at this size is speckle, not life. A
  balustrade or a lamp standard does the same job as one shape.

### Practice-recent-mistakes tab
Shipped 2026-10-08. A tab at the top of each exam, above the map, with the
miss count on it. `review/recent.ts` builds a 10-20 question set without the
student having to choose: the questions that actually beat them first, then
twins built to catch the same named error, round-robin across up to five
recognitions weighted by how often each is going wrong — twenty questions on
one recognition confirms they are bad at it; three worked properly moves a
score. Recommended lesson pages underneath, each with the student's own record
as the reason to open it. Three-week window.

Teacher side needed nothing: the set records through the same `record()` path,
so `metricsFor` already surfaces it as weakest recognitions, wording families,
named errors and the recent attempt log in `StudentDetail`.

### Submit button, selection ring, maths scaffold
Shipped 2026-10-08. Tapping a choice selects; Submit commits — instant grading
punished re-reading the stem and made a mis-tap unrecoverable. Selection is a
ring on the letter rather than a slab behind the row. The tinted chip around
rendered maths now appears only at Foundations and Easy, where a student is
still learning to see an expression as one object, and disappears from Medium
up — which is how the real test sets it.

### Unit quizzes and the two gem tiers
Shipped 2026-10-08. `quizRefs` in `map.ts` draws 12 round-robin across a
path's recognitions so no two in a row share a stop; `gems.ts` holds the three
states; the quiz screen says plainly that clearing the stops already earned the
gem and that a polished path can be re-sat any time to brush up.

### `left` / `fresh` surfaced, serve order and promotion wired
Shipped 2026-10-08. Partial bars and "N of M left" on every level tile, stop,
path and realm; "N new" badges; `serveOrder` puts newly written questions
first in a round; `promotionFor` offers the next level mid-round, with the
streak required to have happened in *that* round rather than carried in.

### Lesson-plan questions as variants, teacher portal only
Asked and shipped 2026-10-07.

`tools/lesson_pool.py` writes variants of the items a plan cites — same
recognition, same trap, different numbers — over-provisioned and spread a tier
either side of what the block asked for. `/lesson-items` on the planner server,
`FreshQuestions.tsx` in the portal, `mergeFresh` to swap them in. The pool is
written to `data/lesson_pool/`, which `stage_public_data.py` refuses to
publish and git ignores, so the student meets them once.

### A ledger for unfinished requests
Asked and shipped 2026-10-07. This file, `.claude/agents/backlog.md`, and the
start-of-session rule in `CLAUDE.md`.

---

## Dropped

### Zoom notetaker with recording/transcription
Superseded 2026-10-06 by Emma: *"i dont want to deal w the legal stuff here"* —
replaced by a local logout prompt that nudges her to the teacher portal to
enter what the homework should be generated from. That replacement is built.

### Treasure map / winding trail, and a student-chosen traveller avatar
Dropped 2026-10-12. Built, shown to Emma, rejected: *"i hate that, put it back
to the way it was"*. Fully reverted (`TrailMap.tsx` and `Avatars.tsx` deleted,
`Journey.tsx` and `greenwood.css` restored; neither file name exists in
`apps/web/src/journey` now). She asked instead for small dots on the EXISTING
world maps with the traveller walking per sub-sub-unit, which is done (see
Done). **Do not rebuild a trail map or avatar picker.**

---

## Deliberately not done

### Deploy
Emma said explicitly on 2026-10-12: do NOT publish anything public yet.
`DEPLOY.md` documents Cloudflare Pages behind Access. The repo is private, no
site exists, and `.github/workflows/ci.yml` builds but its own comment says
deployment is Cloudflare's job, not the workflow's. Do not connect the Pages
project or turn on a deploy step until she says so.
