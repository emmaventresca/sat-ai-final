#!/usr/bin/env python3
"""A full-length SAT practice test, on paper, out of our own bank.

services/api/app/worksheet.py refuses more than 40 questions, and says why:
"a worksheet of more than 40 questions is a mock, not a worksheet". This is
the mock. It borrows that module's renderers - the LaTeX-to-print pass, the
figure drawing, the print stylesheet - so a question looks the same here as
it does on a worksheet, and only the selection and the covers are new.

What it builds:

  practice-test.pdf   student copy - reference sheet, four timed modules,
                      no answer anywhere in the file
  answer-key.pdf      teacher copy - answers at a glance, then every
                      question worked, with the traps named

The shape is the digital SAT's, laid out for paper: two Reading and Writing
modules of 27 and two Maths modules of 22, 98 questions over 2 hours 14
minutes. The adaptive test's second module is harder than its first, so the
tier mix here steps up in module 2 as well - a student who has only ever
practised one difficulty should meet that change before test day.

Two deliberate limits:

  - Tiers F and X never appear. Both are ours, not the exam's: F is the
    skill underneath with the test wrapped off, X is past anything the SAT
    asks. On a practice test they would misrepresent the exam.
  - The reference sheet is set here from the standard formulas rather than
    reproduced from College Board's own sheet. The formulas are mathematics
    and belong to nobody; their page is theirs, and tools/check_books.py
    exists because this project does not copy other people's pages.
"""
import argparse, collections, html, json, os, random, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "services", "api"))

from app.worksheet import (  # noqa: E402
    CSS, Numbered, load_bank, number_items, render_figure, render_text,
    to_text, _is_ours,
)

CHROME = ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

# The exam's own tiers. F and X are ours and are not the SAT.
REAL_TIERS = ("E", "M", "H")

BLUEPRINT = {
    "rw": {
        "label": "Reading and Writing",
        "per_module": 27,
        "minutes": 32,
        # College Board's published domain weights for the section.
        "domains": {
            "Craft and Structure": 0.28,
            "Information and Ideas": 0.26,
            "Standard English Conventions": 0.26,
            "Expression of Ideas": 0.20,
        },
        # The section presents its domains in this order.
        "order": ["Craft and Structure", "Information and Ideas",
                  "Standard English Conventions", "Expression of Ideas"],
    },
    "math": {
        "label": "Math",
        "per_module": 22,
        "minutes": 35,
        "domains": {
            "Algebra": 0.35,
            "Advanced Math": 0.35,
            "Problem-Solving and Data Analysis": 0.15,
            "Geometry and Trigonometry": 0.15,
        },
        "order": None,            # maths mixes its domains
        "grid_share": 0.25,       # student-produced responses, placed last
    },
}

# Module 2 of the adaptive test is the harder one.
TIER_MIX = {
    1: {"E": 0.40, "M": 0.45, "H": 0.15},
    2: {"E": 0.20, "M": 0.45, "H": 0.35},
}


def apportion(total: int, weights: dict[str, float]) -> dict[str, int]:
    """Largest remainder, so the parts always sum to the whole."""
    raw = {k: total * w for k, w in weights.items()}
    out = {k: int(v) for k, v in raw.items()}
    short = total - sum(out.values())
    for k, _ in sorted(raw.items(), key=lambda kv: kv[1] - int(kv[1]),
                       reverse=True)[:short]:
        out[k] += 1
    return out


def domains() -> dict[str, str]:
    skills = json.load(open(os.path.join(ROOT, "data", "skills.json")))["skills"]
    return {s["skill_cd"]: s["domain_name"] for s in skills}


def pick(pool: list[dict], n: int, rng: random.Random,
         used_subtypes: collections.Counter) -> list[dict]:
    """n questions, spreading recognitions rather than drawing one twice.

    A twenty-two question module that asks the same recognition five times
    is not a practice test, it is a drill wearing one.
    """
    rng.shuffle(pool)
    pool.sort(key=lambda i: used_subtypes[i.get("subtype")])
    out = []
    for item in pool:
        if len(out) == n:
            break
        out.append(item)
        used_subtypes[item.get("subtype")] += 1
    return out


def build_module(bank: list[dict], section: str, module: int,
                 rng: random.Random, used: set[str],
                 used_subtypes: collections.Counter,
                 dom: dict[str, str]) -> list[dict]:
    spec = BLUEPRINT[section]
    want = spec["per_module"]
    by_domain = apportion(want, spec["domains"])
    tiers = TIER_MIX[module]

    chosen: list[dict] = []
    for domain, count in by_domain.items():
        by_tier = apportion(count, tiers)
        got: list[dict] = []
        for tier, k in by_tier.items():
            if k == 0:
                continue
            pool = [i for i in bank
                    if i["id"] not in used
                    and i.get("section") == section
                    and dom.get(i.get("skill_cd")) == domain
                    and i.get("difficulty") == tier]
            take = pick(pool, k, rng, used_subtypes)
            if len(take) < k:
                # Say so rather than silently shipping a short module.
                print(f"  note: {domain} tier {tier} had {len(take)} of {k}",
                      file=sys.stderr)
            got += take
        for i in got:
            used.add(i["id"])
        chosen += got

    if section == "math":
        grids = [i for i in chosen if i.get("format") == "grid"]
        mcs = [i for i in chosen if i.get("format") != "grid"]
        target = round(want * spec["grid_share"])
        # Trade multiple-choice for grid-ins until the mix is right.
        if len(grids) < target:
            for i in list(mcs):
                if len(grids) >= target:
                    break
                swap = [c for c in bank
                        if c["id"] not in used
                        and c.get("section") == "math"
                        and c.get("format") == "grid"
                        and c.get("difficulty") == i.get("difficulty")
                        and dom.get(c.get("skill_cd")) == dom.get(i.get("skill_cd"))]
                if not swap:
                    continue
                rng.shuffle(swap)
                used.discard(i["id"])
                mcs.remove(i)
                grids.append(swap[0])
                used.add(swap[0]["id"])
        order = {"E": 0, "M": 1, "H": 2}
        mcs.sort(key=lambda i: order.get(i.get("difficulty"), 1))
        grids.sort(key=lambda i: order.get(i.get("difficulty"), 1))
        return mcs + grids

    order = spec["order"]
    rank = {d: n for n, d in enumerate(order)}
    tier_rank = {"E": 0, "M": 1, "H": 2}
    chosen.sort(key=lambda i: (rank.get(dom.get(i.get("skill_cd")), 99),
                               tier_rank.get(i.get("difficulty"), 1)))
    return chosen


# --------------------------------------------------------------------------- #
# The reference sheet
#
# Set from the standard formulas, not reproduced from College Board's page.
# The mathematics is nobody's; their layout is theirs.
# --------------------------------------------------------------------------- #

REFERENCE = [
    ("Circle", [("A = &pi;r&sup2;", "area"), ("C = 2&pi;r", "circumference")]),
    ("Rectangle", [("A = &#8467;w", "area")]),
    ("Triangle", [("A = &frac12;bh", "area")]),
    ("Right triangle", [("c&sup2; = a&sup2; + b&sup2;", "Pythagorean theorem")]),
    ("Rectangular solid", [("V = &#8467;wh", "volume")]),
    ("Right cylinder", [("V = &pi;r&sup2;h", "volume")]),
    ("Sphere", [("V = (4/3)&pi;r&sup3;", "volume")]),
    ("Right cone", [("V = (1/3)&pi;r&sup2;h", "volume")]),
    ("Pyramid", [("V = (1/3)&#8467;wh", "volume")]),
]

SPECIAL = [
    ("30&deg;&ndash;60&deg;&ndash;90&deg;", "sides are x, x&radic;3, 2x"),
    ("45&deg;&ndash;45&deg;&ndash;90&deg;", "sides are s, s, s&radic;2"),
]

FACTS = [
    "The number of degrees of arc in a circle is 360.",
    "The number of radians of arc in a circle is 2&pi;.",
    "The sum of the measures in degrees of the angles of a triangle is 180.",
]


def reference_sheet() -> str:
    cells = []
    for name, lines in REFERENCE:
        rows = "".join(
            f'<div class="rf-line"><span class="rf-f">{f}</span>'
            f'<span class="rf-w">{w}</span></div>' for f, w in lines)
        cells.append(f'<div class="rf-cell"><p class="rf-n">{name}</p>{rows}</div>')
    for name, text in SPECIAL:
        cells.append(f'<div class="rf-cell"><p class="rf-n">{name} triangle</p>'
                     f'<div class="rf-line"><span class="rf-f">{text}</span></div></div>')
    facts = "".join(f"<li>{f}</li>" for f in FACTS)
    return (
        '<section class="sheet ref">'
        '<p class="eyebrow">Reference</p>'
        '<h2 class="ref-h">Formulas you may use on the Math modules</h2>'
        '<p class="ref-sub">You are given these on the real test too. Nothing '
        'here needs to be memorised &mdash; but knowing which one you want '
        'before you look is most of the speed.</p>'
        f'<div class="rf-grid">{"".join(cells)}</div>'
        f'<ul class="rf-facts">{facts}</ul>'
        "</section>")


def cover(title: str, seed: int, counts: dict) -> str:
    rows = "".join(
        f"<tr><td>{html.escape(m['name'])}</td>"
        f"<td>{m['n']} questions</td><td>{m['minutes']} minutes</td></tr>"
        for m in counts["modules"])
    return (
        '<section class="sheet cover">'
        '<p class="eyebrow">Ventresca Tutoring</p>'
        f"<h1>{html.escape(title)}</h1>"
        '<p class="sub">A full-length practice test, written for this bank. '
        'Every question here is ours.</p>'
        '<hr class="rule">'
        f'<table class="plan"><tr><th>Module</th><th>Length</th>'
        f"<th>Time</th></tr>{rows}"
        f'<tr class="tot"><td>Total</td><td>{counts["total"]} questions</td>'
        f'<td>{counts["minutes"]} minutes</td></tr></table>'
        '<p class="how">Work in order. Time each module separately and stop '
        'when the time is up &mdash; a module you finished in forty minutes '
        'tells you something different from one you finished in thirty-five. '
        'Take a ten-minute break between the second and third modules. '
        'A calculator is allowed on both Math modules.</p>'
        '<p class="how">Answer every question. Nothing is deducted for a '
        'wrong answer, so a guess is always worth more than a blank.</p>'
        f'<p class="foot">Form {seed}. Student copy &mdash; no answers in '
        'this file.</p>'
        "</section>")


def module_head(name: str, n: int, minutes: int, note: str) -> str:
    return ('<section class="modhead">'
            f'<p class="eyebrow">{html.escape(name)}</p>'
            f'<p class="modtime">{n} questions &middot; {minutes} minutes</p>'
            f'<p class="how">{note}</p></section>')


EXTRA_CSS = """
.sheet { page-break-after:always; break-after:page; }
.modhead { page-break-before:always; break-before:page; margin:0 0 18px; }
.eyebrow { font-size:8.5pt; letter-spacing:.18em; text-transform:uppercase;
           color:var(--key); margin:0 0 6px; font-weight:bold; }
.cover h1 { font-size:30pt; line-height:1.1; margin:0 0 6px; }
.modtime { font-size:13pt; color:var(--accent); margin:0 0 10px;
           border-bottom:1px solid var(--rule); padding-bottom:7px; }
table.plan { border-collapse:collapse; margin:0 0 18px; width:100%;
             font-size:10.5pt; }
table.plan th { text-align:left; font-size:8.5pt; letter-spacing:.1em;
                text-transform:uppercase; color:var(--muted);
                border-bottom:1px solid var(--rule); padding:5px 8px; }
table.plan td { border-bottom:1px solid var(--rule); padding:6px 8px; }
table.plan tr.tot td { font-weight:bold; border-bottom:2px solid var(--key); }
.ref-h { font-size:15pt; margin:0 0 4px; color:var(--ink); border:0; padding:0; }
.ref-sub { color:var(--muted); font-size:10pt; margin:0 0 14px; }
.rf-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px 16px; }
.rf-cell { border:1px solid var(--rule); border-radius:5px; padding:8px 11px;
           background:var(--tint); break-inside:avoid; }
.rf-n { font-size:8.5pt; letter-spacing:.07em; text-transform:uppercase;
        color:var(--muted); margin:0 0 4px; font-weight:bold; }
.rf-line { display:flex; justify-content:space-between; align-items:baseline;
           gap:10px; }
.rf-f { font-family:'DejaVu Sans',Verdana,sans-serif; font-size:11pt; }
.rf-w { font-size:8.5pt; color:var(--muted); }
.rf-facts { margin:14px 0 0; padding-left:18px; font-size:10pt;
            color:var(--slate); }
.rf-facts li { margin:0 0 3px; }
.keyrow { border-bottom:1px solid var(--rule); padding:9px 0;
          break-inside:avoid; }
.keyrow .hd { font-weight:bold; margin:0 0 3px; }
.keyrow .meta { font-size:8.5pt; letter-spacing:.06em; text-transform:uppercase;
                color:var(--muted); margin:0 0 5px; }
.keyrow .why { margin:0 0 5px; }
.keyrow .trap { font-size:9.5pt; color:var(--slate); margin:0 0 3px;
                padding-left:12px; border-left:2px solid var(--rule); }
.glance { width:100%; }
.glance td { text-align:center; font-family:'DejaVu Sans',Verdana,sans-serif; }
.glance td.q { color:var(--muted); font-size:8.5pt; background:#fff; }
.foot { font-size:9pt; color:var(--muted); margin-top:20px; }
@page { margin:0.7in; }
"""


def page(title: str, body: str) -> str:
    return ("<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">"
            f"<title>{html.escape(title)}</title>"
            f"<style>{CSS}{EXTRA_CSS}</style></head><body>{body}</body></html>\n")


def question_html(nq: Numbered) -> str:
    # Working space only where there is working to do. A ruled box under a
    # Reading question is a tenth of a page that nobody writes in, and over
    # fifty-four of them it was the difference between a test a student will
    # print and one they will not.
    maths = nq.item.get("section") == "math"
    out = ['<div class="q">']
    if nq.item.get("stimulus"):
        out.append(f'<p class="stim">{render_text(nq.item["stimulus"])}</p>')
    out.append(render_figure(nq.item.get("figure")))
    out.append(f'<p class="stem"><span class="n">{nq.number}.</span> '
               f'{render_text(nq.item.get("stem", ""))}</p>')
    if nq.is_grid:
        out.append('<div class="gridbox"><p class="lbl">Answer &mdash; write '
                   'one value</p><div class="box"></div></div>')
    else:
        out.append('<ol class="choices">')
        for i, c in enumerate(nq.item.get("choices") or []):
            out.append(f'<li><span class="lt">{nq.letters[i]}.</span> '
                       f'{render_text(c)}</li>')
        out.append("</ol>")
    if maths and not nq.is_grid:
        out.append('<div class="work"></div>')
    out.append("</div>")
    return "".join(out)


def key_rows(numbered: list[Numbered], dom: dict[str, str]) -> str:
    out = []
    for nq in numbered:
        it = nq.item
        ans = (nq.answer_text if nq.is_grid
               else f"{nq.answer_letter}. {to_text(nq.answer_text)}")
        meta = " &middot; ".join(x for x in (
            dom.get(it.get("skill_cd"), ""), it.get("subtype_name") or "",
            {"E": "Easy", "M": "Medium", "H": "Hard"}.get(
                it.get("difficulty"), "")) if x)
        out.append(f'<div class="keyrow"><p class="hd">{nq.number}. '
                   f'{html.escape(ans)}</p>'
                   f'<p class="meta">{meta}</p>')
        if it.get("explanation"):
            out.append(f'<p class="why">{render_text(it["explanation"])}</p>')
        for label, _t, slug, why in nq.distractors():
            if why:
                out.append(f'<p class="trap"><b>{label}</b> '
                           f'{render_text(why)}</p>')
        out.append("</div>")
    return "".join(out)


def glance(numbered: list[Numbered]) -> str:
    cells, head = [], []
    for nq in numbered:
        head.append(f'<td class="q">{nq.number}</td>')
        cells.append(f"<td>{html.escape(nq.answer_letter if not nq.is_grid else nq.answer_text)}</td>")
    rows = []
    per = 11
    for i in range(0, len(cells), per):
        rows.append("<tr>" + "".join(head[i:i + per]) + "</tr>")
        rows.append("<tr>" + "".join(cells[i:i + per]) + "</tr>")
    return f'<table class="glance">{"".join(rows)}</table>'


def to_pdf(html_path: str, pdf_path: str) -> bool:
    if not os.path.exists(CHROME):
        print(f"  no Chrome at {CHROME} - HTML written, PDF skipped",
              file=sys.stderr)
        return False
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={pdf_path}", "file://" + os.path.abspath(html_path)],
        check=True, capture_output=True, timeout=180)
    return os.path.exists(pdf_path)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1,
                    help="the form number; same seed, same test")
    ap.add_argument("--out", default="out/practice-test")
    ap.add_argument("--title", default="SAT Practice Test")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    dom = domains()
    bank = [i for i in load_bank("sat").values() if _is_ours(i)]
    bank = [i for i in bank if i.get("difficulty") in REAL_TIERS]
    print(f"{len(bank)} questions in the bank at the exam's own tiers")

    used: set[str] = set()
    subs: collections.Counter = collections.Counter()
    modules, n = [], 1
    for section in ("rw", "math"):
        spec = BLUEPRINT[section]
        for m in (1, 2):
            items = build_module(bank, section, m, rng, used, subs, dom)
            numbered = number_items(items, "sat", start=n)
            n += len(numbered)
            modules.append({
                "name": f"Module {m}: {spec['label']}",
                "minutes": spec["minutes"],
                "n": len(numbered),
                "numbered": numbered,
                "note": ("Read each passage or statement, then answer its "
                         "question. Each question refers only to its own text."
                         if section == "rw" else
                         "A calculator is allowed. The last questions ask you "
                         "to write a value rather than choose one."),
            })
            print(f"  {modules[-1]['name']}: {len(numbered)} questions")

    counts = {"modules": [{"name": m["name"], "n": m["n"],
                           "minutes": m["minutes"]} for m in modules],
              "total": sum(m["n"] for m in modules),
              "minutes": sum(m["minutes"] for m in modules)}

    body = [cover(args.title, args.seed, counts), reference_sheet()]
    for m in modules:
        body.append(module_head(m["name"], m["n"], m["minutes"], m["note"]))
        body += [question_html(nq) for nq in m["numbered"]]
    test_html = page(args.title, "".join(body))

    allnum = [nq for m in modules for nq in m["numbered"]]
    kbody = [f'<h1>{html.escape(args.title)} &mdash; Answer Key</h1>',
             '<p class="sub">Teacher copy. Do not hand this to the student.</p>',
             '<hr class="rule">', '<p class="lbl">Answers at a glance</p>',
             glance(allnum)]
    for m in modules:
        kbody.append(f'<h2>{html.escape(m["name"])}</h2>')
        kbody.append(key_rows(m["numbered"], dom))
    kbody.append(f'<p class="foot">Form {args.seed}. '
                 f'{len(allnum)} questions, all written for this bank.</p>')
    key_html = page(args.title + " - Answer Key", "".join(kbody))

    out = os.path.join(ROOT, args.out)
    os.makedirs(out, exist_ok=True)
    paths = {}
    for name, markup in (("practice-test", test_html), ("answer-key", key_html)):
        hp = os.path.join(out, name + ".html")
        open(hp, "w").write(markup)
        pp = os.path.join(out, name + ".pdf")
        paths[name] = pp if to_pdf(hp, pp) else hp

    print(f"\n{counts['total']} questions, {counts['minutes']} minutes")
    for k, v in paths.items():
        size = os.path.getsize(v) / 1024
        print(f"  {os.path.relpath(v, ROOT)}  ({size:.0f}KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
