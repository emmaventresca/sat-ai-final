#!/usr/bin/env python3
"""Take royalty-free images and wire them into the sixty backdrop slots.

Drop files anywhere, name them loosely, run this. It matches each file to a
slot, resizes and converts to WebP, records where the picture came from, and
updates the SHIPPED list in backdrops.ts so the app starts using it.

    # see the slots and what is filled
    python3 tools/add_art.py --list

    # one file into one slot
    python3 tools/add_art.py ~/Downloads/cliff.jpg --slot quest/the-high-pass \
        --source "Unsplash / Jane Doe" --url https://unsplash.com/photos/xyz

    # a folder, matched by filename
    python3 tools/add_art.py ~/Downloads/art/ --source "Pexels"

Matching is deliberately forgiving: "The High Pass.jpg", "high-pass.png" and
"quest_the_high_pass.jpeg" all find the same slot. Anything it cannot place
confidently is reported and skipped rather than guessed into the wrong world,
because a picture in the wrong slot is worse than a missing one - the slot
still looks filled.

Three sizes are written per slot. A backdrop sits behind a question card at
whatever the window is, and shipping one 4000px original to a school laptop
is how a practice round takes nine seconds to appear.
"""
import argparse, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, "apps", "web", "public", "art")
BACKDROPS = os.path.join(ROOT, "apps", "web", "src", "journey", "backdrops.ts")
CREDITS = os.path.join(ROOT, "data", "art_credits.json")

# Widths written for each slot. The 1600 is the one normally served; the
# others exist so a phone and a retina desktop are not both handed it.
SIZES = [(960, "-sm"), (1600, ""), (2400, "-lg")]
QUALITY = 82

# Quality is a starting point, not a result. A snowy forest at q82 came out
# at 1.3MB where a calm seascape came out at 86KB - detail, not dimensions,
# decides the file - and a backdrop that size is a practice round that takes
# seconds to appear on a school laptop. Each size is re-encoded downward
# until it fits, and the floor stops it chasing a budget into mush.
BUDGET_KB = {"-sm": 220, "": 420, "-lg": 900}
MIN_QUALITY = 58


def slots():
    """Every theme/scene key, read from backdrops.ts rather than duplicated."""
    src = open(BACKDROPS).read()
    themes = dict(re.findall(r"(\w+):\s*\{\s*id:\s*'([^']+)'", src))
    block = src[src.index("const SCENES"):src.index("const SHIPPED")]
    out = []
    for terrain, body in re.findall(r"(\w+):\s*\[(.*?)\]", block, re.S):
        theme = themes.get(terrain)
        if not theme:
            continue
        for scene in re.findall(r"'([^']+)'", body):
            out.append((theme, scene))
    return out


def strip_comments(block):
    """Drop // comments before reading quoted keys out of a block.

    The SHIPPED set shipped with a commented example in it, and reading the
    block naively turned that example into a live entry - a slot claiming
    artwork that does not exist, which is precisely the failure the file
    warns about, since the slot then stops rendering its placeholder.
    """
    return re.sub(r"//[^\n]*", "", block)


def shipped():
    src = open(BACKDROPS).read()
    block = src[src.index("const SHIPPED"):]
    block = block[:block.index("])")]
    return set(re.findall(r"'([^']+)'", strip_comments(block)))


def norm(s):
    """Loose key for matching: lowercase alphanumerics only."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def match(name, keys):
    """Find the one slot a filename means, or None.

    Requires a unique winner. Two plausible slots means the name was
    ambiguous, and picking the first is how a picture of Zion ends up
    labelled Yosemite.
    """
    stem = norm(os.path.splitext(os.path.basename(name))[0])
    if not stem:
        return None
    exact = [k for k in keys if norm(k.split("/")[1]) == stem]
    if len(exact) == 1:
        return exact[0]
    full = [k for k in keys if norm(k) == stem]
    if len(full) == 1:
        return full[0]
    partial = [k for k in keys
               if norm(k.split("/")[1]) in stem or stem in norm(k.split("/")[1])]
    return partial[0] if len(partial) == 1 else None


def convert(src_path, theme, scene):
    """Write the three sizes. Returns a list of (path, kb)."""
    from PIL import Image

    out_dir = os.path.join(ART, theme)
    os.makedirs(out_dir, exist_ok=True)
    written = []
    with Image.open(src_path) as im:
        im = im.convert("RGB")
        for width, suffix in SIZES:
            if im.width < width and suffix != "":
                continue                       # never upscale a small source
            scale = min(1.0, width / im.width)
            size = (round(im.width * scale), round(im.height * scale))
            dest = os.path.join(out_dir, f"{scene}{suffix}.webp")
            resized = im.resize(size, Image.LANCZOS)
            budget = BUDGET_KB.get(suffix, 420)
            q = QUALITY
            while True:
                resized.save(dest, "WEBP", quality=q, method=6)
                kb = os.path.getsize(dest) / 1024
                if kb <= budget or q <= MIN_QUALITY:
                    break
                q -= 8
            # Say so rather than shipping it quietly. Some pictures - frosted
            # forest, dense foliage - will not fit any sane budget, and the
            # honest answer is to pick a different photograph, not to grind
            # the quality into mush chasing a number.
            over = kb > budget
            written.append((dest, kb, over))
    return written


def record(key, source, url, path):
    creds = {}
    if os.path.exists(CREDITS):
        try:
            creds = json.load(open(CREDITS))
        except ValueError:
            creds = {}
    creds[key] = {k: v for k, v in {
        "source": source, "url": url,
        "original": os.path.basename(path),
    }.items() if v}
    os.makedirs(os.path.dirname(CREDITS), exist_ok=True)
    json.dump(dict(sorted(creds.items())), open(CREDITS, "w"), indent=1)


def mark_shipped(keys):
    """Add keys to SHIPPED in backdrops.ts, sorted, without duplicates."""
    src = open(BACKDROPS).read()
    start = src.index("const SHIPPED")
    open_b = src.index("[", start)
    close_b = src.index("])", start)
    have = set(re.findall(r"'([^']+)'",
                          strip_comments(src[open_b:close_b]))) | set(keys)
    body = "\n".join(f"  '{k}'," for k in sorted(have))
    new = (f"const SHIPPED = new Set<string>([\n{body}\n])"
           if have else "const SHIPPED = new Set<string>([\n])")
    src = src[:start] + new + src[close_b + 2:]
    open(BACKDROPS, "w").write(src)


def show_list():
    keys = slots()
    have = shipped()
    by_theme = {}
    for theme, scene in keys:
        by_theme.setdefault(theme, []).append(scene)
    done = 0
    for theme, scenes in by_theme.items():
        filled = [s for s in scenes if f"{theme}/{s}" in have]
        done += len(filled)
        print(f"\n{theme}  ({len(filled)}/{len(scenes)})")
        for s in scenes:
            mark = "OK  " if f"{theme}/{s}" in have else "    "
            print(f"  {mark}{theme}/{s}")
    print(f"\n{done} of {len(keys)} slots have artwork.")
    if done < len(keys):
        print("\nName a file after its scene and drop it in; "
              "'The High Pass.jpg' finds quest/the-high-pass.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", help="an image, or a folder of them")
    ap.add_argument("--slot", help="theme/scene, when the filename cannot say")
    ap.add_argument("--source", help="who made it, e.g. 'Unsplash / Jane Doe'")
    ap.add_argument("--url", help="where it came from")
    ap.add_argument("--list", action="store_true", help="show slots and exit")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.list or not args.path:
        return show_list()

    keys = [f"{t}/{s}" for t, s in slots()]
    files = []
    if os.path.isdir(args.path):
        for name in sorted(os.listdir(args.path)):
            if name.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff")):
                files.append(os.path.join(args.path, name))
    elif os.path.exists(args.path):
        files = [args.path]
    else:
        print(f"no such file: {args.path}")
        return 1

    if not files:
        print("no images found there")
        return 1
    if args.slot and len(files) > 1:
        print("--slot names one slot, so pass one file")
        return 1

    placed, skipped, done_keys = [], [], []
    for path in files:
        key = args.slot or match(path, keys)
        if not key:
            skipped.append((path, "no slot matches that name"))
            continue
        if key not in keys:
            skipped.append((path, f"{key} is not one of the sixty slots"))
            continue
        theme, scene = key.split("/", 1)
        if args.dry_run:
            placed.append((path, key, []))
            continue
        try:
            written = convert(path, theme, scene)
        except Exception as exc:
            skipped.append((path, f"could not convert: {exc}"))
            continue
        record(key, args.source, args.url, path)
        placed.append((path, key, written))
        done_keys.append(key)

    if done_keys:
        mark_shipped(done_keys)

    for path, key, written in placed:
        sizes = ", ".join(
            f"{kb:.0f}KB{'!' if over else ''}" for _, kb, over in written
        ) or "dry run"
        print(f"  {os.path.basename(path)}  ->  {key}   [{sizes}]")
    for path, why in skipped:
        print(f"  SKIPPED {os.path.basename(path)}: {why}")

    print(f"\n{len(placed)} placed, {len(skipped)} skipped")
    if done_keys:
        print(f"{len(shipped())} of {len(keys)} slots now have artwork.")
        print("backdrops.ts updated; the app will use them on the next load.")
    if skipped:
        print("\nFor a skipped file, name the slot yourself:")
        print("  python3 tools/add_art.py FILE --slot theme/scene")
    heavy = [(k, w) for _, k, w in placed
             for w in [[x for x in w if len(x) > 2 and x[2]]] if w]
    if heavy:
        print("\n! marks a file that would not fit its size budget even at the")
        print("  lowest quality. It will work, but it is a slow first paint on a")
        print("  school laptop - a less detailed photograph is the real fix.")
    if args.dry_run:
        print("\nDRY RUN - nothing was written.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
