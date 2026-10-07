# services/api

The FastAPI service for the merged SAT/ACT platform. Today it holds one
module, ported from the ACT project.

## `app/worksheet.py` — printable worksheets and answer keys

Given a set of question ids and a one-line brief from the tutor, it produces
two printable HTML documents:

- a **student worksheet** — the questions, numbered, with room to work and no
  answer anywhere on the page;
- a **teacher answer key** — the same numbering, the answer, a short worked
  solution, and the named misconception each wrong choice is built to catch.

Both are self-contained HTML with a print stylesheet. Open and print; there is
no PDF toolchain and no CDN to depend on.

### How it works

Two model passes, as in the ACT original, with numbering assigned between them:

1. **Layout pass.** Groups the chosen questions into teaching sections and
   decides the order. It does not choose, write or reword questions.
2. **Renumber.** Final question numbers are assigned here, in the layout
   agent's teaching order, so the printed page reads 1, 2, 3 down the sheet.
3. **Key pass.** Given the *final* numbers, writes the worked steps and one
   sentence for the tutor to say. It is explicitly not asked for the answer or
   the traps — those come from the bank, so every factual line on the key is
   traceable to a verified item.

Both passes go through `tools/cli.py` (`call_json_object`), the same `claude`
CLI path the rest of the repo uses, so they inherit its retry and
circuit-breaker behaviour. There is no OpenAI or Portkey dependency.

If either pass fails, the packet still builds — the caller's own order, our own
explanations in the key — and says so in `notes`.

### One packet, one exam

`build_packet` takes `exam="sat"` or `exam="act"` and reads only that exam's
bank (`packages/schema/exams.json` names them). An id belonging to the other
exam raises `MixedExams` rather than being silently dropped. A worksheet
missing three questions still looks like a worksheet, and nobody checks.

Items that are not ours to print — anything whose `source`/`license` does not
mark it as originally authored — are refused before any of their text reaches a
prompt (`docs/LICENSING.md` §4).

### What it does with our data

- `explanation` / `per_choice` — the key's fallback solution, and the prose for
  each wrong choice.
- `misconceptions` — the slug naming each distractor's error, printed next to
  it as a tag.
- `format: "grid"` — a student-produced response has no choices, so it gets a
  ruled answer box instead of empty choice letters, and the key lists every
  accepted form of the answer plus the `common_errors` values.
- `figure` — drawn as inline SVG, ported from `web/assets/mathfmt.js` so the
  printed figure matches the one on screen.
- ACT items alternate answer letters A–E / F–K by question parity, as the real
  test does. SAT items are A–D.

### Running it

Python 3.10, standard library only. The `claude` CLI must be on `PATH` for the
model passes.

```python
from app.worksheet import build_packet, MixedExams, WorksheetError

packet = build_packet(
    exam="sat",
    question_ids=["orig-arc-length-sec-H-b1bea8", "orig-addition-and-e-F-15d793"],
    brief="45 minutes on circles for a student at 1200 aiming for 1350",
)
open("worksheet.html", "w").write(packet["worksheet_html"])
open("answer-key.html", "w").write(packet["answer_key_html"])
```

`packet` also carries `title`, `question_count`, `sections`, the final
`question_ids` in print order, `unsectioned_questions`,
`questions_without_written_solution`, and `notes`.

Pass `use_model=False` to build a packet without any model call — the fast path
for exercising layout, numbering and rendering:

```
python3 -c "import sys; sys.path.insert(0,'services/api'); \
  from app.worksheet import build_packet; \
  print(build_packet('sat', ['orig-arc-length-sec-H-b1bea8'], use_model=False)['title'])"
```

Override the model with `WORKSHEET_MODEL`.

### Not wired up yet

There are no routes here. The ACT version's `POST /packet`,
`GET /packet/{id}/worksheet` and `GET /packet/{id}/answer-key` persisted PDFs
to SQLite; where the merged app stores packets is a separate decision, so
`worksheet.py` returns documents and leaves storage to its caller. FastAPI is
not installed in this checkout.
