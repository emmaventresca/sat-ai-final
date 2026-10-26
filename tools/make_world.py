#!/usr/bin/env python3
"""Compose one continuous country out of the ACT's four land plates.

The SAT got a world map because its two lands are a coast and an ocean,
which is one honest photograph. The ACT's four are an alpine range, a
national park, a pier at dusk and a tropical shore, and no single
photograph holds those - so there was no world above the ACT at all.

This builds one. Not by pasting four pictures in a row, which is the
stock-photo collage the brief rules out, but by making them agree:

  ORDER      inland to sea, so the geography is at least plausible -
             peaks, forest, pier, warm shore.
  GRADE      every panel is pulled toward one colour and contrast, so
             four cameras on four days stop being four cameras.
  SEAM       the joins are wide, and warped by noise rather than
             straight, because a vertical edge is the one thing the eye
             finds instantly.
  HAZE       distance-blue toward the horizon and warmth at the bottom,
             which is what actually makes separate ridges read as one
             country receding.

It is still a composite and it is not pretending otherwise. It is a
trial-run plate so the ACT has a world to stand in while real art is
commissioned, and tools/make_world.py is here so that replacing it is one
command rather than an afternoon.
"""
import argparse, os, sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "apps", "web", "public", "art")
OUT = os.path.join(ART, "worlds")

# Inland to sea. The order is the whole reason this can read as one coast.
PANELS = [
    ("alpine/mountain-ridge", "english"),
    ("parks/yosemite-valley", "science"),
    ("boardwalk/the-boardwalk", "reading"),
    ("hawaii/hawaiian-sunset", "math"),
]

W, H = 2400, 900
# Narrower than it started. A 320px join double-exposed anything detailed
# inside it - the pier's flagpoles came through the forest as ghosts hanging
# in mid-air - and the fix is less overlap carrying more warp, not more
# overlap carrying more blur.
SEAM = 170          # how wide each join is, in pixels
HORIZON = 0.42      # where the haze sits


def graded(im: Image.Image, target: tuple[np.ndarray, np.ndarray]) -> Image.Image:
    """Pull a panel's colour toward the group's, without flattening it."""
    a = np.asarray(im, dtype=np.float32)
    mean, std = a.reshape(-1, 3).mean(0), a.reshape(-1, 3).std(0) + 1e-6
    tmean, tstd = target
    # Partway, not all the way: matched exactly, every panel turns grey.
    k = 0.74
    out = (a - mean) / std * (std * (1 - k) + tstd * k) + (mean * (1 - k) + tmean * k)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    r = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
    l = (im.width - w) // 2
    t = int((im.height - h) * 0.52)
    return im.crop((l, t, l + w, t + h))


def warped_ramp(h: int, w: int, rng: np.random.Generator) -> np.ndarray:
    """A 0..1 ramp across `w`, with its midline pushed about by noise.

    A straight vertical blend reads as a seam no matter how wide it is.
    Warping the ramp per row turns the join into a coastline.
    """
    wobble = rng.normal(0, 1, (h // 24 + 2,))
    wobble = np.interp(np.linspace(0, len(wobble) - 1, h),
                       np.arange(len(wobble)), wobble)
    wobble = wobble * (w * 0.46)
    xs = np.arange(w)[None, :]
    mid = (w / 2) + wobble[:, None]
    t = (xs - mid) / (w * 0.55) + 0.5
    return np.clip(t, 0, 1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--name", default="the-four-coasts")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = np.random.default_rng(args.seed)

    span = W // len(PANELS)
    raw = [Image.open(os.path.join(ART, p + ".webp")).convert("RGB")
           for p, _ in PANELS]

    # One grade for the group, taken from all four so none of them wins.
    stack = np.concatenate([np.asarray(cover(im, span, H), dtype=np.float32)
                            .reshape(-1, 3) for im in raw])
    target = (stack.mean(0), stack.std(0))

    panels = [np.asarray(graded(cover(im, span + SEAM, H), target),
                         dtype=np.float32) for im in raw]

    canvas = np.zeros((H, W, 3), dtype=np.float32)
    weight = np.zeros((H, W, 1), dtype=np.float32)
    for i, p in enumerate(panels):
        x0 = i * span - SEAM // 2
        pw = p.shape[1]
        ramp = np.ones((H, pw, 1), dtype=np.float32)
        if i > 0:
            ramp[:, :SEAM, 0] *= warped_ramp(H, SEAM, rng)
        if i < len(panels) - 1:
            ramp[:, -SEAM:, 0] *= warped_ramp(H, SEAM, rng)[:, ::-1]
        xs = max(0, x0)
        xe = min(W, x0 + pw)
        ps, pe = xs - x0, xs - x0 + (xe - xs)
        canvas[:, xs:xe] += p[:, ps:pe] * ramp[:, ps:pe]
        weight[:, xs:xe] += ramp[:, ps:pe]
    canvas /= np.maximum(weight, 1e-6)

    # Distance haze: cool and pale toward the horizon, warm low down. This
    # is what makes four separate ridges read as one country receding.
    ys = np.linspace(0, 1, H)[:, None, None]
    band = np.exp(-((ys - HORIZON) ** 2) / (2 * 0.085 ** 2))
    haze = np.array([168, 186, 203], dtype=np.float32)
    canvas = canvas * (1 - band * 0.46) + haze * (band * 0.46)
    warm = np.clip((ys - 0.62) / 0.38, 0, 1) ** 1.5
    canvas = canvas * (1 - warm * 0.13) + np.array([96, 74, 48]) * (warm * 0.13)

    im = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=42, threshold=3))

    print(f"  {len(PANELS)} panels -> {im.width}x{im.height}")
    for p, land in PANELS:
        print(f"    {land:9} {p}")
    if args.write:
        os.makedirs(OUT, exist_ok=True)
        im.save(os.path.join(OUT, args.name + ".webp"), "WEBP", quality=84)
        small = im.copy()
        small.thumbnail((1200, 1200), Image.LANCZOS)
        small.save(os.path.join(OUT, args.name + "-sm.webp"), "WEBP", quality=82)
        print(f"\n  wrote art/worlds/{args.name}.webp")
    else:
        print("\nDRY RUN - nothing written. Re-run with --write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
