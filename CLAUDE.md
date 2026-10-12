# SAT/ACT tutoring platform

## Start of session

If this session resumes after a stop (token limit, crash, or a `/compact`),
read `BACKLOG.md` first and ask Emma which open item to pick up. Don't start
one silently, and don't assume the summary covered them — a summary flattens
"she asked and I never built it" into the same shape as "shipped".

One exception, her instruction: **anything about design or UI, just do it.**
Ask about scope and order, not about whether.

Use the `backlog` agent to audit and rewrite `BACKLOG.md` rather than editing it
by hand at the end of a long session, when context is thinnest and items are
most likely to be dropped.

## House rules

- SAT and ACT banks and lessons stay **separate** for students. Only the
  teacher crosses between them.
- Never copy third-party or College Board questions. The books are for
  studying how a question is *asked*; `tools/check_books.py` is the gate.
- `npx tsc --noEmit` from `apps/web` must pass before anything is called done.
- `tools/stage_public_data.py` is an allowlist. Published data is opt-in, so a
  new file under `data/` is private until someone says otherwise.
