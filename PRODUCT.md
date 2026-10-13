# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the students Emma tutors for the SAT and ACT.** High-effort
students — "grinders" — whose complaint is specific and confirmed: *the
practice material is not as hard as the real test*. They are working to move a
score that is already decent, which makes a topic-level report useless to them.

**Secondary: Emma herself, as the teacher.** The teacher portal is her
workbench, not a reporting afterthought. Her job before a session is working
out what to teach this student next.

**Later: other tutors.** Confirmed intent — built for Emma's practice now, but
structured so another tutor could run their own roster on it. Nothing should be
hard-coded to one teacher where a configurable version costs little.

## Product Purpose

Adaptive SAT and ACT practice built on **recognitions** rather than topics, so
a student can be told which specific question-types are costing them marks and
work on exactly those. Success is a measurable score movement attributable to
work done here, and a teacher who spends less time deciding what to teach.

## Positioning

The mechanism a neighbouring product could not truthfully copy:

1. The bank is classified at **recognition** grain — 182 of them — not topic.
2. **Every wrong answer carries the named error that produces it**, so the app
   can drill a mistake across topics instead of drilling a topic.
3. Two tiers that **do not exist on the real exam**: Foundations below it and
   Challenge above it. Challenge exists because of the students' own complaint.
4. **A missed question never counts as completed.** It returns until answered
   correctly, and Challenge will not open until every Hard question is right.

## Operating Context

Two confirmed use scenes, and the design serves both:

- **Laptop at home, in the evening, alone.** The grind session: long focused
  stretches, unsupervised. Must stay engaging across a long sitting.
- **Beside Emma in a tutoring session.** The screen is a conversation prop —
  two people reading one display, at an angle, across a desk.

School networks block Google Fonts, which is why the type stack is
locally-installed-first. This is a standing constraint, not a preference.

## Capabilities and Constraints

- Two banks, SAT and ACT, kept **separate for students**; only the teacher
  crosses between them.
- **No third-party or College Board question text is ever copied.** The source
  books are for studying how a question is *asked*. `tools/check_books.py` is
  the gate.
- Question authoring runs through the local `claude` CLI, so on-demand
  generation works on Emma's machine only; a deployed student cannot trigger it.
- `tools/stage_public_data.py` is an allowlist: a new file under `data/` is
  private until someone adds it.
- `npx tsc --noEmit` from `apps/web` must pass before anything is called done.
- Not deployed, deliberately. The login is client-side and the bank is static
  JSON, so any public host serves the questions to anyone with the URL.

## Brand Commitments

Name: **Prep**.

Binding visual constraint, volunteered by Emma and recorded without expansion:

- The reference is the Impeccable gallery's **boutique hotel** example,
  specifically its committed material world, human voice, and treatment of
  photographs as physical objects rather than flat rectangles.
- The feeling wanted is **being on a journey** — scrollable, engaging, the
  opposite of a tutoring dashboard.
- Imagery should read as **real and considered**, not as generic illustration.
- **Do not copy characters, costumes, locations, logos, or specific imagery
  from any copyrighted franchise.** Standing instruction.
- The six world names and their ten scenes each are Emma's own and are fixed;
  `docs/ART_DIRECTION.md` is their source of truth.

## Evidence on Hand

- 13,712 questions; 10,167 verified and served. Measured, in `data/`.
- Real per-call cost and token counts in `corpus/usage.jsonl`.
- 67 passing tests.
- `docs/ART_DIRECTION.md`: sixty scene descriptions across six worlds.
- **No user testimonials or outcome data yet.** Emma is collecting feedback
  from five real students. Nothing may be fabricated in their place.
- The 60 painted backdrop assets **do not exist**; the scenes are drawn in code.

## Product Principles

1. **Say what the evidence supports, and say when it does not.** Thin evidence
   is reported as thin. A report that always finds something to say is one
   nobody checks twice.
2. **Diagnosis before practice.** The point is knowing what to work on, not
   having more to work on.
3. **Missing a question is not finishing it.** Completion is earned.
4. **The teacher's scarce resource is deciding, not marking.**
5. **Nothing leaves the machine that was not opted in.**

## Accessibility & Inclusion

Confirmed accommodations, with a confirmed default:

- **Extended time at 1.5x and 2x** on any timed mode.
- **Printable on paper**, with an answer key, for students with a paper
  accommodation.
- **Screen reader and keyboard-only operation**, and **larger type with high
  contrast** — both available as **options the student turns on**. Emma was
  explicit: the default formatting stays normal and these are editable
  settings, not an always-on treatment.
