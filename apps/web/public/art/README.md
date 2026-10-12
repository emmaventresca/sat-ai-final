# Background artwork

Sixty files go here, one per slot. Paths are
`public/art/<theme>/<scene>.webp` and the slugs are fixed by
`src/journey/backdrops.ts` — see `docs/ART_DIRECTION.md` for what each slot
is a picture of.

```
art/highland/   stack-field-low-tide  loch-under-cloud  ruined-broch …
art/water/      open-horizon  lagoon-reef-line  headland-lighthouse …
art/parks/      slot-canyon-floor  sequoia-grove  geyser-basin-dawn …
art/exposition/ wheel-from-beneath  canal-with-gondolas  peristyle-reflected …
art/ice/        base-camp-predawn  prayer-flag-pass  the-icefall …
art/gold/       ocean-drive  hotel-across-pool  lifeguard-stand …
```

## Specs

- **2560×1440**, WebP, quality ~82. They are scaled with `object-fit: cover`
  and sit behind a card, so detail below about 1600px wide is wasted bytes.
- **Composed around the UI.** The card covers roughly the middle 60%. Detail
  and dark values belong at the edges; the middle band stays quiet and
  low-contrast. The focal element goes in a third the card does not cover.
- Target **under 400KB each**, 24MB for the set. Above that, drop to 1920×1080
  before dropping quality — a soft painting survives downscaling better than
  it survives compression artefacts.

## Turning one on

A file on disk is not enough — add its `theme/scene` key to `SHIPPED` in
`src/journey/backdrops.ts`. That is deliberate. A build that silently picks
up a half-finished render is worse than one that waits to be told, and the
explicit list is what makes "how many are actually done" answerable.

Until a slot is listed, it renders the old drawn SVG with a `<title>` saying
which scene it stands in for.
