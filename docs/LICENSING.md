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

> **Read §4 first if students will use this.** The inventory below describes a
> local, undistributed cache. Serving any of it to other people is a different
> question with a different answer.

| What | Source | Basis | Where it lives |
|---|---|---|---|
| ~3,300 bank items (stems, passages, choices) | CB educator question bank | CB copyright. **Their educator terms prohibit reproducing, uploading, reposting or distributing this content without express written permission, and prohibit scraping or data-mining.** An undistributed local cache used for analysis is defensible as research; serving it to students is not. See §4. | `corpus/bank/` — **git-ignored** |
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

### 3. Khan Academy is NOT a usable source — corrected

An earlier version of this document said Khan's Official SAT Practice is
CC BY-NC-SA 4.0 and therefore reusable with attribution. **That was wrong.**

Khan's site-wide Creative Commons licence explicitly carves out the College
Board partnership content. Their own licence notice for it reads, in full:

> "This content is copyrighted by Khan Academy and the College Board. Creative
> Commons licenses do not apply."
> — <https://cdn.kastatic.org/KA-share/sat/KA_CB_license.pdf>

So Khan's SAT material is doubly restricted, not openly licensed. Do not treat
it as a source. Khan's *non-SAT* content (and OpenStax, CC BY) remains usable
under its own terms.

The `source` / `license` columns still exist and are still mandatory — the
lesson from this correction is that a source's headline licence may not cover
the specific content you want, so record the licence of the **content**, not of
the site it came from.

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


---

## 4. Serving items to students — the line that actually matters

College Board's [educator legal terms](https://privacy.collegeboard.org/educator-legal-terms)
state that educators may not "distribute, downloaded, uploaded, modified,
reused, performed, reproduced, reposted, retransmitted, disseminated, sold,
published, broadcast, or circulated" their content without permission, nor
"attempt to decompile, reverse engineer, scrape, or data-mine" it.

Two things follow, and neither is cured by putting a login in front:

- **Serving bank items to students is distribution.** Access control governs
  *who* receives a copy, not *whether* copies are made and sent. A login does
  not convert redistribution into private use.
- **`tools/fetch_bank.py` is bulk retrieval**, which is what the scraping clause
  names. The sanctioned route is the bank's own export, for your own materials.
  The retrieval scripts are therefore **no longer published** - they are
  git-ignored and stay on the machine that ran them. Publishing a working
  how-to for scraping someone's service is downside with no upside.

**Therefore: do not wire the item pool into the app for other people to use.**
No Supabase `content` load, no published `data/items.json`, no authenticated
item endpoint. The schema supports it; the licence does not.

What remains fully available, because none of it is College Board's expression:

- the 35 lessons, strategy and triage — original writing
- the band model — derived from published scoring tables (facts)
- the skill taxonomy and item counts (facts)
- the misconception taxonomy — our categories, derived from reading their prose
- the adaptive engine, mastery model, and teacher dashboard

An interactive student platform is buildable on all of that. What it needs is an
item source we are allowed to distribute — originally authored items, or
students practising in College Board's own tools and uploading their results.


---

## 5. Standard instruction lines — used verbatim, deliberately

Original items use the test's **real instruction line**:

> "Which choice completes the text with the most logical transition?"

This is a deliberate exception to "write everything ourselves", on two
independent grounds.

**It is not protectable expression.** The US Copyright Office does not register
"words and short phrases" (37 CFR 202.1(a)), and merger applies where an idea
has only a few natural expressions — there are not many ways to ask a student to
pick the transition that fits. College Board's own usage settles the character
of the text: **420 items in the bank carry one identical instruction line**, and
ten lines account for over 1,100 items. A sentence repeated verbatim across
hundreds of items is a form field, not authorship.

**Paraphrasing it would cost something real.** Recognising the actual stem is
part of the skill being practised. A student who has only ever seen reworded
instructions is measurably less prepared on test day, and trading exam fidelity
to avoid reusing one functional sentence is a bad trade.

The allowlist is in `data/standard_stems.json`, built from the corpus by
reuse count (≥10 items) rather than by judgement, and both originality checkers
exempt exactly those lines — 47 eight-word sequences out of 167,458.

**The exemption covers instruction lines only.** Passages, answer choices and
rationales are where the expression actually lives, and the check stays strict
on every one of them. Our items currently show zero overlap outside the
allowlist.

### The same reasoning, applied to sat-mills

An audit of all 882 live Mills cards found 872 with zero overlap. The ten
matches are standard mathematical statements — "is perpendicular to the radius
at the point", "the x-coordinate of the vertex is -b/2a", "What is the minimum
value of f?" — two of which are theorems. There is no other way to say them in
English, and a signal-to-method card exists precisely to show the phrasing a
student will meet.

They were left as they are. Rewording would cost exam fidelity to fix a
non-problem, and a documented measurement is a better position than a
silent assumption.
