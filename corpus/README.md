# corpus/

Not in version control. Rebuild it:

```bash
python3 tools/fetch_bank.py          # ~3,200 bank items, a few hours (rate limited)
python3 tools/fetch_tests.py         # 21 PDFs for practice tests 4-10
python3 tools/parse_explanations.py  # 840 items + College Board's own rationales
python3 tools/build_keys.py          # reconcile the two answer sources
python3 tools/build_bands.py         # -> data/bands.json
```

`tests/*-key.json` and `tests/*-explanations.json` are derived and *are* tracked,
since they are small and everything downstream depends on them.

The PDFs and bank items are College Board's copyright. They are cached here for
use with your own students, which is what the educator bank is for. Do not
redistribute them or expose them through a public endpoint. See `docs/DESIGN.md`
section 2.
