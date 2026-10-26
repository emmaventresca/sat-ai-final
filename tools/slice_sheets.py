#!/usr/bin/env python3
"""Cut usable plates out of the design sheets in assets/sheets/.

The sheets are concept boards: a world map, six realm maps and a row of
location tiles, all packed into 1536x1024. Everything on them is small, so
anything taken out has to be enlarged - and enlarging cannot invent detail,
only stop it looking soft. Lanczos then a restrained unsharp is the whole
trick; pushed harder it looks sharpened rather than sharp.

Regions are listed here rather than detected. A board has no grid to find,
and a crop two pixels out puts a frame edge through the picture.
"""
import argparse, os, sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets", "sheets")
ART = os.path.join(ROOT, "apps", "web", "public", "art")

# sheet, box, scale, destination, and anything to paint out.
CUTS = [
    {
        "sheet": "realm-of-knowledge",
        "box": (8, 8, 832, 388),
        "scale": 2.5,
        "to": "worlds/the-realm-of-knowledge",
        # The board signs off with a line adapted from Tolkien. Darkening
        # the corner left it legible through the wash, so the crop stops
        # above it instead: a borrowed line is exactly what this project
        # has been asked to stay clear of, and cropping is the only
        # removal that actually removes. Every realm is above the cut.
        "dim": [],
    },
]


def enlarge(im: Image.Image, scale: float) -> Image.Image:
    out = im.resize((round(im.width * scale), round(im.height * scale)),
                    Image.LANCZOS)
    # Light: the source is soft because it is small, and a hard unsharp on
    # an upscale produces halos that read as a bad photocopy.
    return out.filter(ImageFilter.UnsharpMask(radius=2.2, percent=58, threshold=3))


def dim_corners(im: Image.Image, boxes) -> Image.Image:
    if not boxes:
        return im
    layer = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(layer)
    for x1, y1, x2, y2 in boxes:
        d.rectangle([x1 * im.width, y1 * im.height, x2 * im.width, y2 * im.height],
                    fill=255)
    layer = layer.filter(ImageFilter.GaussianBlur(im.width * 0.028))
    dark = Image.new("RGB", im.size, (6, 10, 14))
    return Image.composite(dark, im, layer)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    for cut in CUTS:
        src = os.path.join(SHEETS, cut["sheet"] + ".webp")
        if not os.path.exists(src):
            print(f"  missing sheet: {cut['sheet']}", file=sys.stderr)
            continue
        im = Image.open(src).convert("RGB").crop(cut["box"])
        im = dim_corners(im, cut.get("dim"))
        im = enlarge(im, cut["scale"])
        dest = os.path.join(ART, cut["to"] + ".webp")
        print(f"  {cut['sheet']} {cut['box']} x{cut['scale']} -> "
              f"{cut['to']}  {im.width}x{im.height}")
        if args.write:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            im.save(dest, "WEBP", quality=86)
            small = im.copy()
            small.thumbnail((1280, 1280), Image.LANCZOS)
            small.save(os.path.join(ART, cut["to"] + "-sm.webp"), "WEBP", quality=84)
    if not args.write:
        print("\nDRY RUN - nothing written. Re-run with --write.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
