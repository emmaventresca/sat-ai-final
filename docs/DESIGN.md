# SAT AI — design notes

Successor to `sat-mills` (one student, six static decks, shared-password gate).
This version is multi-student, has real logins, a teacher view, and an adaptive
engine driven by each student's own missed questions.

---

## 1. Where the content comes from, and the accuracy/difficulty tradeoff

**The concern about third-party questions is correct, and it is worth being
strict about.** Princeton Review / Kaplan / Barron's items fail in four specific,
diagnosable ways:

1. **Distractor construction.** College Board distractors encode *named
   misconceptions* — each wrong answer is the answer you get if you make one
   particular error. Third-party distractors are frequently arbitrary. A student
   who practices on arbitrary distractors learns "eliminate the weird one"
   instead of "recognize which error I just made," which is the single most
   transferable SAT skill.
2. **Register and length of answer choices.** CB choices are tightly
   length-matched and parallel. Third-party choices are not, which leaks answers
   and teaches a heuristic that fails on test day.
3. **Stimulus length distribution.** CB R&W stimuli sit in a narrow band. Third
   party runs long.
4. **Math framing.** CB math is increasingly "signal → Desmos move." Third-party
   math is written for hand algebra, so it trains the slower method.

**Recommendation: do not use third-party items at all.** The tradeoff is not
worth it, and — critically — the "CB isn't hard enough" problem has a better
fix than importing worse questions.

### The "College Board content isn't challenging enough" problem is a sampling artifact

The digital SAT is **multistage adaptive**. Module 1 is a fixed mixed-difficulty
set. Module 2 is selected based on Module 1 performance: do well and you get the
*hard* module. So the hardest real test-day questions a 1400 student sees are
drawn almost entirely from the upper difficulty tier.

College Board's question bank **does contain those items** — every item carries a
difficulty code (E/M/H) and a skill code. The bank feels easy because its
*default mix* is flat across E/M/H, while a high scorer's actual Module 2 is
nearly all M/H.

So the fix is not third-party content. The fix is **difficulty-filtered sampling
from CB's own bank**, which is exactly the adaptive engine described in §4. This
is a happy result: the highest-fidelity source and the difficulty problem have
the same solution.

### Where CB's own material is genuinely thin

Three real gaps, each with a legitimate fill:

| Gap | Fill |
|---|---|
| No adaptive full-length timing experience outside Bluebook | Send them to Bluebook. Do not rebuild it. |
| Thin at the top of Geometry/Trig — of 348 geometry items, Circles and Right-Triangle Trig have only 12 Easy items between them, and few items overall | Original items written to CB's published skill descriptors, clearly labeled as ours |
| Underlying *instruction* (the bank has rationales, not lessons) | Khan Academy Official SAT Practice (a CB partnership) + OpenStax |

### Source ranking

1. **CB educator question bank API** — ~3,200 items, each with skill code,
   difficulty, and CB's own rationale. Official, free, unauthenticated.
2. **Official practice tests 4–10** — three public PDFs each: the test, a scoring
   guide (answer key + raw→scaled conversion table), and full answer
   explanations. Roughly 120 items per test with CB-written rationales.
   `https://satsuite.collegeboard.org/media/pdf/sat-practice-test-{N}-digital.pdf`
   `.../scoring-sat-practice-test-{N}-digital.pdf`
   `.../sat-practice-test-{N}-answers-digital.pdf`
   (N = 4..10 only; 1–3 return an HTML error page with a 200 status.)
3. **Khan Academy Official SAT Practice** — CC BY-NC-SA 4.0, so it is genuinely
   reusable with attribution. **Caveat: the NC clause bites the moment this is
   monetized.** See §2.
4. **OpenStax / Illustrative Mathematics** — CC BY, for underlying math
   instruction. Cleanest license of the set.
5. **Originally authored items** — written to CB's published skill descriptors,
   used to fill the gaps above. Always labeled as ours, never as CB's.

---

## 2. Legal posture

The design goal is that the legally safe architecture and the pedagogically
better architecture are the same one. They are.

**Question bank items.** CB copyright. The educator bank exists for educators to
use with students, which is what this is. Stay inside that: gate everything
behind a login, do not expose a bulk export or a public searchable clone, cache
politely and attribute.

**Student screenshots of their own Bluebook results — the important one.**
The strongest-footing version of this workflow is: the *student* made the copy of
their *own* results page and sent it to *their own* tutor. Risk appears only when
those images are **persisted and redistributed**.

So the rule is **process, extract, discard**:

- The upload is processed in memory.
- What gets written to the database is a **fingerprint**: `skill_cd`,
  `difficulty`, `module`, the answer the student chose, the correct answer, and a
  misconception tag.
- The image and the verbatim stem are **never persisted** past processing.

This also happens to be the FERPA-friendly design and the cheap one, and it
forces the system to reason about *skills* rather than about individual items —
which is what makes it generalize to the next student.

**Khan Academy's NC clause.** Fine for tutoring your own students. If this ever
becomes a paid product, Khan-derived content has to be stripped or relicensed.
Tag every Khan-derived object with its provenance now so that is a query, not an
archaeology project.

**Bluebook ToS** prohibits reverse-engineering or automating the app. Screenshots
taken by a student of their own results page are not that. Do not build anything
that logs into Bluebook on a student's behalf.

---

## 3. Intake: how missed questions actually get in

### A finding that kills the obvious shortcut

The tempting shortcut is: student says "I missed Q12, Q17, Q23 on Practice Test
4," and we map question numbers to the published PDF. **This does not work**, and
it is worth recording why.

The linear PDF form and the Bluebook adaptive form of the same numbered test are
**different forms with different lengths**:

| | Bluebook (adaptive) | Linear PDF |
|---|---|---|
| Reading & Writing | 54 questions | 66 (33 + 33) |
| Math | 44 questions | 54 (27 + 27) |

Verified against Practice Test 4's scoring guide answer key and against a real
student score report. Question numbers do not correspond. There is no shortcut.

### Three tiers of intake

**Tier 1 — the score report PDF (once per test, near-zero friction).**
Bluebook emits `NAME_SAT_PRACTICE_N_DATE.pdf` containing total score, both
section scores, correct/incorrect counts per section, and performance bars across
the 8 content domains. This is enough to **seed the adaptive engine**: it sets
the band and the domain-level weakness ordering. Ask for this first, always.

**Tier 2 — the My Practice review list (the high-value one).**
In My Practice, the per-test review view lists every question with the student's
answer, the correct answer, and **the skill tag College Board assigns it**. The
metadata we need is already on that screen. So ask for screenshots of the
*scrolling review list*, not of individual questions — roughly 4–8 screenshots
covers a whole test instead of 35. This is the single biggest friction reduction
available and it should be what the upload UI asks for by name, with an example
image.

**Tier 3 — individual question screenshots.**
Only when the student wants a lesson on one specific item. Processed, never
persisted (§2).

Every tier produces the same output: a list of fingerprints.

---

## 4. The adaptive engine

The defining feature. Three pieces.

### 4a. Band → points budget

A student has a current score and a target. From the raw→scaled conversion tables
in the official scoring guides (which we ingest once), we can compute how many
questions they actually need, which becomes a **difficulty budget**:

- 1000 → 1300 math: roughly 2 of 3 correct. Every Easy item is non-negotiable,
  Medium is where the points are, Hard is *deliberately* guess-and-move.
- 1300 → 1450: Easy is assumed, Medium must be near-perfect, Hard becomes the
  battleground.
- 1450+: Hard is mandatory and timing is the binding constraint.

This is the `00 TRIAGE` card from the Mills math deck, generalized into a
function. It is what stops the system from over-teaching.

**Guessing yield matters, and including it is what makes the numbers match the
deck's advice.** An unstudied question is not worth zero — a four-choice
question pays 25% by guessing (grid-ins pay ~0, and they are 14 of 54 math
items, so math's effective rate is 18.75%). If you study `s` questions and guess
the rest, `correct = N·guess + (1−guess)·s`, so the studied requirement is
`(need − N·guess) / (1 − guess)`.

With that term in, the Hard tier comes out at **exactly zero for every math
target up to 600**, and only 9% at 650. That is the deck's "deliberately
guess-and-move on Hard" — derived from the official conversion tables rather
than asserted. Without the term, the model demanded 26% of Hard at a 650 target
and would have marched a 1300-bound student into circle equations.

### 4b. Mastery

Per `(skill_cd, difficulty)` cell: a Leitner box plus rolling accuracy. Simple
and **explainable on purpose** — a teacher has to be able to read why the system
is doing what it is doing. No opaque IRT.

### 4c. Selection

Score every candidate item by:

```
value = P(student misses it) × how often that skill appears on the test × band_weight(difficulty)
```

`band_weight` is the §4a budget. This single term does all the work:

- A 1000-level student is never served Hard circle-equation items, because
  `band_weight(H)` is near zero for that band — even though they would certainly
  miss them.
- A 1400-level student is never served Easy linear-equation drill, because
  `P(miss)` is near zero — even though those items are frequent.

### 4d. Reachability — which part of a partial tier to spend on

When a band requires only *part* of a tier — 9% of Hard at a 650 math target —
those points should come from skills the student is already close in, not from
their worst skill. So there is a fourth term: **Hard is earned by mastering
Medium in the same skill, and Medium by mastering Easy.**

This is not decoration. Without it the engine sends a student who is shaky
everywhere straight at Hard circle questions, because circles are *hard-weighted
in the item pool* and therefore score well on frequency. That is precisely the
over-teaching the design exists to prevent, and it showed up as a failing test
before it showed up in front of a student.

The full score is:

```
value = P(miss) × skill frequency × band_weight(difficulty) × reachability × type boost
```

**Promotion is automatic**, and now happens two ways. As a cell saturates,
`P(miss)` falls and `reachability` at the tier above rises; as the student's
score rises, `band_weight` shifts upward. Harder material enters the queue on
its own, with no manual reassignment.

---

## 5. Strategy and intuition are a first-class content type

The thing that made the Mills decks work was not the question coverage. It was
`00 TRIAGE`, `01 DESMOS`, the trap cards, and the "here is what CB is actually
testing when you see this phrasing" cards. That has to be built in from the
start, not bolted on.

Five content types, all tagged to the same taxonomy:

| Type | What it is |
|---|---|
| `lesson` | How a skill works |
| `item` | A practice question |
| `card` | Flashcard, spaced repetition |
| `strategy` | Pattern recognition, traps, Desmos moves, elimination |
| `triage` | Band-specific: what to attempt, what to skip, how to spend time |

Two things make `strategy` adaptive rather than static:

1. **Trigger-based surfacing.** A strategy card carries a trigger condition.
   Miss three transitions that are all the same error, and the trap card
   surfaces — because the *pattern* was detected, not just the count.

   The tags come from `data/misconceptions.json`, a 14-family taxonomy derived
   from a stratified sample of College Board's own wrong-choice rationales
   rather than invented, then applied across the corpus by a model (see
   `tools/classify_misconceptions.py`). 76% of items carry at least one
   high-confidence tag. Regex managed 7% — the prose is too varied.

   Only high-confidence labels count. Measured against a second model on 240
   items, the classifier's "high" labels agreed 91% of the time and its "low"
   labels 57%, so the confidence flag is calibrated and the low ones are stored
   but never shown.

   **Practice feeds this, not just uploads.** A miss whose wrong choice is
   tagged writes a fingerprint, so three transition-logic errors surface the
   trap card whether they happened here or on a real Bluebook test.
2. **Band-specific variants.** The triage advice for 1000→1300 ("guess and move
   on Hard") is *wrong advice* for 1400→1550. Same slot, different card, selected
   by band.

---

## 6. Data model (sketch)

```
students        id, email, name, teacher_id, current_score, target_score, band
skills          skill_cd, domain, test_section, description, bank_item_count
content         id, type, skill_cd, difficulty, band_floor, band_ceiling,
                body, source, license, trigger
attempts        student_id, content_id, correct, ms, chosen, created_at
fingerprints    student_id, test_id, skill_cd, difficulty, module,
                chosen, correct_answer, misconception   -- no image, no stem
mastery         student_id, skill_cd, difficulty, box, rolling_accuracy, due_at
assignments     teacher_id, student_id, content_filter, due_at
```

`content.source` and `content.license` are not optional — they are what makes the
Khan NC question answerable later (§2).

---

## 7. Stack

Supabase for Postgres + **real** auth + row-level security, replacing the
browser-side password check in `sat-mills` (which was honest about being
obfuscation). RLS gives: a student sees only their own rows, a teacher sees their
roster, nobody sees anyone else's.

Front end stays simple and static-deployable. The Mills practice UI — Leitner
boxes, free navigation, browse mode, flagging, offline queue in `localStorage` —
is good and should be ported rather than redesigned.

---

## 8. Open questions

- **Does the Tier-2 review list actually show the skill tag for every question,
  or only for some?** Needs one real screenshot to confirm. Determines whether
  classification is a lookup or a judgment call.
- **Runtime AI or authoring-time AI?** See §3. Classifying an upload at runtime
  costs a fraction of a cent; authoring lessons at runtime is expensive and
  unreviewable. Current recommendation: classify at runtime, author lessons ahead
  of time per (skill × band), and use runtime generation only for
  "explain this specific item to me."
