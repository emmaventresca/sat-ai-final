# What we use, and on what basis

A standing audit, not a one-off. Anything added to this project should be
placed in one of the rows below before it ships.

---

## The rule this project runs on

**Process, extract, discard — and never republish expression.**

There is a line running through everything here:

- **Facts about the test** — which answer is correct, how many items exist for a
  skill, what a raw score converts to — are not copyrightable. They are tracked,
  published, and reasoned over freely.
- **Expression** — the wording of a question, a passage, College Board's
  explanation of *why* an answer is right — is theirs. It is cached locally for
  use with your own students, shown to those students behind a login, and
  **never committed, published, or served to the open internet.**

Where those two land differently for the same file, the file gets split.

---

## Inventory

| What | Source | Basis | Where it lives |
|---|---|---|---|
| ~3,300 bank items (stems, passages, choices) | CB educator question bank | CB copyright. The bank exists for educators to use with students; that is this. | `corpus/bank/` — **git-ignored** |
| Practice pool served to students | derived from the above | same | `data/items.json` — **git-ignored** |
| CB's per-item rationales | question bank + answer-explanation PDFs | same | git-ignored; shown in-app after an answer |
| Practice-test PDFs 4–10 | `satsuite.collegeboard.org` | published free by CB | `corpus/tests/*.pdf` — **git-ignored** |
| Answer keys (question № → letter) | derived from the PDFs | **fact, not expression** | `corpus/tests/*-key.json` — tracked |
| Raw→scaled conversion tables | official scoring guides | **fact** (a table of numbers) | `data/bands.json` — tracked |
| Skill taxonomy + item counts per skill/difficulty | bank listings | **fact** | `data/skills.json` — tracked |
| All 35 lessons, 144 sections | **written for this project** | ours | `data/lessons.json` — tracked |
| Student fingerprints from uploads | the student's own results | see below | database; no image, no stem |

---

## The three things most likely to cause trouble

### 1. Publishing item text

`data/items.json` and `corpus/` are git-ignored **and must stay that way.** The
repository is public. A published site backed by this repo has no practice pool
unless the items are supplied some other way, and that is deliberate — it forces
the decision to be made consciously rather than by a stray `git add -f`.

If this is ever deployed for real students, the pool belongs **behind the login**
(served from the database under RLS, or from a host that requires a session), not
in a public static bundle.

> Caught once already: 1.64 million characters of verbatim CB rationale were
> sitting in tracked files before anything had been pushed. The answer keys
> carried a `rationale` field in addition to the explanations files. Both were
> removed and the history rewritten. This is the failure mode to watch for —
> a *derived* artifact quietly carrying the source's prose.

### 2. Student uploads of their own Bluebook results

The defensible version: the **student** copied their **own** results and sent
them to **their own** tutor. Risk appears on persistence and redistribution.

So `fingerprints` has no image column and no stem column. What persists is
`skill_cd`, `difficulty`, the answer chosen, and a misconception tag. The upload
is processed in memory and discarded.

That is also why the engine reasons about skills rather than items — which is
what makes it generalise to the next student.

### 3. Khan Academy's non-commercial clause

Khan's Official SAT Practice is **CC BY-NC-SA 4.0**. Reusable with attribution,
share-alike, **non-commercially**.

Nothing currently in this project is Khan-derived. If any is added, tag it in
`content.source` and `content.license` at the moment it is added — those columns
exist precisely so "what would we have to strip if this became paid?" is a
query rather than an archaeology project.

**If this is ever monetised, NC content has to come out.**

---

## Fidelity — the other half of "no BS"

A separate concern from copyright, and just as important.

**Every practice question a student answers here is a real College Board item**,
with CB's own difficulty code, skill code, and rationale. No SAT questions are
generated for this project, and no third-party questions are used.

That is a deliberate stance, not laziness. Third-party items fail in four
diagnosable ways: arbitrary distractors (CB's encode *named misconceptions*),
answer choices that are not length-matched, stimulus lengths outside CB's band,
and math written for hand algebra rather than the signal→Desmos structure the
digital test rewards. A student drilling arbitrary distractors learns "eliminate
the odd one out" instead of recognising their own error — the opposite of what
transfers.

Where original writing *is* used:

- **Lessons, strategy and triage** are written for this project. They teach
  method and cite the bank's real distribution, but they are not CB's prose.
- **Any original practice item** — if ever added to fill a thin spot such as the
  top of Geometry — must be labelled as ours in `content.source` and never
  presented as College Board's.

---

## Trademark and impersonation

SAT®, PSAT/NMSQT®, Bluebook™ and Khan Academy® are their owners' marks. Use them
to say what the app prepares you for; never in a way implying endorsement,
affiliation, or that this is an official product. Don't name the app after them.

## Things this project will not do

- Log into Bluebook or College Board on a student's behalf, or automate either.
  Bluebook's terms prohibit it, and a student screenshotting their own results
  page is not that.
- Expose a bulk item export or a public searchable clone of the question bank.
- Present generated questions as College Board's.
