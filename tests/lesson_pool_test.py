#!/usr/bin/env python3
"""The lesson pool's two real decisions: how wide to spread, and what counts
as "different numbers" rather than the same question again."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools"))
import lesson_pool as lp

ok = fail = 0
def test(name, fn):
    global ok, fail
    try:
        fn(); ok += 1; print(f"  ok   {name}")
    except AssertionError as e:
        fail += 1; print(f"  FAIL {name}\n       {e}")


def over_provisions():
    s = lp.spread("M", 8)
    assert sum(s.values()) > 8, f"a block needing 8 got only {sum(s.values())}"
    assert s["M"] >= 8, f"the target tier should still cover the block: {s}"


def spreads_either_side():
    s = lp.spread("M", 8)
    assert set(s) == {"E", "M", "H"}, s
    assert all(v >= lp.MIN_PER_TIER for v in s.values()), s


def clamps_at_the_ends():
    assert set(lp.spread("F", 6)) == {"F", "E"}
    assert set(lp.spread("X", 6)) == {"X", "H"}


def catches_a_reskin():
    model = {"stem": "A rectangle has length 8 and width 5. What is its area?"}
    same = {"stem": "A rectangle has length 8 and width 5. What is its area?"}
    assert lp.too_close(same, [model])


def allows_a_real_variant():
    model = {"stem": "A rectangle has length 8 and width 5. What is its area?"}
    fresh = {"stem": "A garden plot measures 14 metres by 9 metres. Tiles cost "
                     "3 dollars per square metre. What is the total cost?"}
    assert not lp.too_close(fresh, [model])


def empty_stem_is_not_a_duplicate():
    assert not lp.too_close({"stem": ""}, [{"stem": "anything at all here"}])


def resolves_a_subtype_to_a_skill_code():
    cd, slug = lp.resolve("flat-figure-plug-in")
    assert cd and slug == "flat-figure-plug-in", (cd, slug)


for fn in (over_provisions, spreads_either_side, clamps_at_the_ends,
           catches_a_reskin, allows_a_real_variant, empty_stem_is_not_a_duplicate,
           resolves_a_subtype_to_a_skill_code):
    test(fn.__name__.replace("_", " "), fn)

print(f"\n{ok} passed, {fail} failed")
sys.exit(1 if fail else 0)
