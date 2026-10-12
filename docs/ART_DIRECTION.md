# 60 backgrounds: the visual system

**Status: awaiting approval. No code has been written against this.**

## Read first: these are assets, not drawings

The 60 backgrounds **do not exist**. What is on screen today is drawn in SVG
from code — authored paths, gradients, filters. That is the approach being
rejected and rejecting it is right: vector shapes cannot carry texture,
painterly edges, or the accumulated imperfection that makes an environment
read as a place. Four attempts failed because I kept treating a *medium*
problem as a *palette* problem.

I cannot produce painted illustration from here, so I have not faked it.
`src/journey/backdrops.ts` is a manifest expecting 60 real files; nothing
renders as art until its file lands and its key is listed. `artProgress()`
currently returns `0 / 60`, honestly.

## Two naming decisions I made, and why

**1. No borrowed names anywhere, including in our own notes.** The Math world
is **From Countryside to Final Ascent**. Earlier drafts of this table kept a
"reference" column with borrowed place-names in it to preserve the intent —
that column is gone. A term that only lives in an internal document still
ends up in a filename, a commit message and an art brief sent to an
illustrator, and the brief is exactly where it does damage. The emotional
progression is unchanged; every name below is ours.

**2. The ACT Math world drops the neon.** I had built it as Miami synthwave.
Your brief says retro means "nostalgic, colorful, cute, sunny, polished,
resort-like" and explicitly not cyberpunk — so the vocabulary is now vintage
travel-poster Hawaii: hand-painted resort, not night city.

---

# SAT · two worlds, one fantasy universe

Both read as the same hand-painted literary fantasy. They are told apart by
**axis and element**: Math travels *over land, forward and upward*, and its
story is a climb. English travels *over water, outward*, and its story is
widening mystery. Math gets roads, stone, forest and snow; English gets sail,
fog, island and star. Neither borrows the other's vocabulary.

## SAT Math · From Countryside to Final Ascent

**Progression** — the point of the world: safe to epic, low to high, green to
stone, in sequence. Slot 1 should feel like stepping out of a warm door. Slot
10 should feel like standing at the foot of something enormous and beginning
to climb it. Every darkened scene stays *beautiful* — polished, never horror.
The palette walks one line: warm green → gold → grey-blue → white → slate →
last light on high stone.

A note on the climax: it is an **ascent**, not a battle and not a volcano.
Architecture does the work — an ancient road cut up a mountain, stairs, a
gate — rather than fire and ruin. That also keeps it clear of the ACT's
Alpine Expedition, which is modern, equipment-led and above the treeline;
this is a hand-painted fantasy road with stonework on it.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **The Green Country** | Rolling hedged fields, cottages dug into hillsides, chimney smoke, a lane and a wooden gate | Late summer morning, warm and hazy, long soft shadows | Cottages and hedges hug the lower corners; fields and sky open across the middle |
| 2 | **The Long Road** | A cart road curving between hedgerows toward distant blue hills, a milestone, a traveller's pack | Midday, high cloud, clear air | The road's vanishing point sits left of centre; right side open |
| 3 | **The Elder Wood** | Enormous moss-furred trunks, roots across the path, ferns, one shaft through the canopy | Green underwater light with a single hard shaft | Trunks frame both edges; the lit path is the quiet middle |
| 4 | **The River Crossing** | A stone bridge over a rushing beck, a mill, sheep-cropped slopes, first real peaks behind | Afternoon, cooling, the first grey entering the palette | Bridge low-left; peaks distant and hazed |
| 5 | **The Watchtower** | A weathered stone tower on a bluff, a beacon basket, the road winding past and upward | Low gold on the tower's west face, valley already in shade | Tower at the right third; valley is the quiet centre |
| 6 | **The High Pass** | A road cut into a cliff face, a cairn, cloud boiling up from the drop, snow beginning | Thin bright light, wind, mist rising | Cliff wall is the right edge; cloud fills the middle softly |
| 7 | **The White Silence** | Snowfield between black rock teeth, a line of footprints, a half-buried waymarker | Overcast, flat, almost shadowless | Lowest-contrast scene in the set, by design |
| 8 | **The Stair of Kings** | A vast ancient stairway cut into the mountainside, worn carvings, cloud below the steps | Late afternoon raking across the treads | The stair runs corner to corner, missing the centre |
| 9 | **The Last Gate** | A great stone gateway in a wall across a col, one lamp lit, the summit beyond it | Dusk; the lamp is the only warm note | Gate opening is small, bright and off-centre |
| 10 | **The Final Ascent** | The summit road above the cloud line, the peak enormous ahead, a tiny figure climbing | Last light on high stone; everything below in blue shadow | The mountain is huge and *behind*; the road enters bottom-left |

## SAT English · The Great Sea Voyage

**Progression**: harbour → open water → strangeness → the edge of the known.
Where Math descends into danger, English *widens*. The emotional line is "we
do not know what lies beyond the horizon," and the palette walks warm
harbour-gold → clear blue → silver fog → storm iron → green-gold enchantment
→ star-dark → dawn.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **The Home Harbour** | Stone quay, fishing boats, gulls, crooked waterfront houses, nets drying | Early morning gold, calm water, smoke rising straight | Houses line the left edge; harbour water is the quiet centre |
| 2 | **The Departure** | A tall ship under way seen from the headland, crowd small on the quay behind, full sail | Bright midday, fresh wind, spray | Ship at the right third; open sea across the middle |
| 3 | **The Misted Isles** | Rock islands fading in rank into fog, a bird's wheeling arc, glassy water | Flat silver fog; contrast falls off fast with distance | Intrinsically the softest scene — fog *is* the quiet middle |
| 4 | **The Singing Coast** | A cliff coast with slender waterfalls, white stone stairs cut into rock, lamps among trees | Green-gold late light, warm against cool rock | Cliff fills the left; the lit stair is a narrow vertical |
| 5 | **The Storm** | The ship heeled over, a wave wall, torn cloud, one break of light on the horizon | Iron grey with a single hot slot of sky | High contrast at the edges; the trough beneath the card is dark and flat |
| 6 | **The Drowned Ruins** | Half-sunk columns and a stair rising from calm water, vines, a tilted statue base | Still, overcast, pale; everything slightly green | Columns flank; open water in the middle |
| 7 | **The Cold Sea** | Ice floes, a low sun that never rises far, long shadows across water, distant white mountains | Low-angle, almost horizontal light; very long shadows | Floes are small and scattered — no large mass anywhere central |
| 8 | **The Narrow Strait** | A channel between two enormous carved cliff faces, the ship tiny between them | Light only from the slot above; cliffs in deep shade | The two cliffs are the frame; the lit channel runs up the middle, soft |
| 9 | **The World's Edge** | The sea falling away into cloud and stars, horizon curving, impossible scale | Night and dawn at once; starfield above, gold below | Stars are fine texture, never a bright mass |
| 10 | **The Far Shore** | A new coast at sunrise — white cliffs, a river mouth, green hills, no sign of people | Full dawn, warm, clear, everything ahead | The warmest scene; detail at the edges, open water near |

---

# ACT · four worlds

Told apart by four different things, deliberately — not four palettes:

| World | Axis | Built form | Palette | Texture |
|---|---|---|---|---|
| **Science** | Horizontal, vast, natural | Almost none — a boardwalk, a trail sign | Saturated earth: ochre, rust, deep green, cobalt | Rock strata, bark, water |
| **Reading** | Vertical, built, crowded | Everything — Beaux-Arts, domes, lattice, bunting | Warm electric gold on dusk violet-teal | Plaster, gilt, bulb glass |
| **English** | Vertical, hostile, empty | Only what you carry — tents, rope, ladders | Cold: blue-white, slate, one rose note | Snow, ice, nylon, frost |
| **Math** | Horizontal, warm, inhabited | Low resort — lanai, tiki roofs, a surf shack | Turquoise, coral, cream, sunset orange | Rattan, palm, painted wood |

The one that previously failed was English-vs-Science, because both were
"mountains". The fix is vocabulary, not hue: **Science has trees, trails and
water; English has none of those.** English is above the treeline in every
one of its ten. If a fir appears in the ice world, the scene is wrong.

## ACT Science · America the Beautiful

NPS-poster language: flat planes of saturated colour, strong silhouette,
reverence. Named places, so each is unmistakable.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **Sequoia Grove** | Trunks too wide to frame, cut off top and bottom, a trail and a tiny figure | Shafts through high canopy; dim floor | Trunks are the frame; the lit trail is the quiet centre |
| 2 | **Yellowstone Geyser Basin** | Terraced mineral rings, steam columns of different heights, boardwalk corner | Low gold turning steam into solid light | Steam is inherently soft and low-contrast |
| 3 | **Grand Canyon** | Receding buttes in mauve ranks, the river a thread, a rim ledge near | Late afternoon haze; contrast collapses with distance | Flat receding planes behind the card |
| 4 | **Glacier National Park** | Hanging valley, ribbon falls, a turquoise lake, bear-grass in the foreground | Clear cold alpine light | Falls are narrow verticals at a third |
| 5 | **Zion** | Sheer cream-and-rust walls either side, cottonwoods on the canyon floor, the Virgin River | Reflected bounce light on the walls | Walls are the frame; the floor is the middle |
| 6 | **Yosemite Valley** | The great granite face, a meadow, a lone pine, falls on the left wall | Early morning, mist in the meadow | Face is a huge flat plane — ideal behind the card |
| 7 | **Sedona** | Red rock spires, juniper, a red dirt trail, blue sky | High contrast, hard noon shadow, saturated | Spires at the edges; sky open |
| 8 | **Acadia Coast** | Pink granite shore, spruce, surf, a lighthouse small on the point | Cool coastal morning, clean light | Shore detail along the bottom only |
| 9 | **Great Smoky Mountains** | Ridge on ridge fading blue, mist in the hollows, a split-rail fence near | Dawn mist, the softest in the world | Pure atmospheric recession |
| 10 | **Joshua Tree at Night** | Yucca silhouettes, boulder piles, the Milky Way, one lit tent | Starlight, no moon, very dark | Darkest scene; stars are fine texture |

## ACT Reading · The World's Fair

1893–1910. Beaux-Arts, ragtime, electric light as the attraction. Historical
and charming, never futuristic. The brightest value is always a *lamp*, and
lamps are drawn as beads on real architectural edges.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **Grand Fair Entrance** | Triumphal arch, flagpoles, crowd in period dress, banners | Afternoon, pennants snapping | Arch frames; the opening is off-centre |
| 2 | **The Ferris Wheel** | Seen from below: paired spoke cables, outside-hung cars, A-frame legs | Dusk, bulbs just lit on the rim | Wheel upper-left, crowd along the bottom |
| 3 | **The Midway** | A corridor of booths and banner signs narrowing to a distant dome, bunting overhead | Warm light both sides, dark down the middle | The dark corridor centre is where the card sits |
| 4 | **Palace of Fine Arts** | Domed classical building reflected in a still basin, statuary on the roofline | Soft afternoon, perfect reflection | Horizontal band high, mirror low, quiet between |
| 5 | **Industrial Exhibition** | Vast iron-and-glass hall interior, machinery, a gallery of onlookers above | Daylight through a glazed roof, dusty beams | Roof structure is fine lattice — texture not mass |
| 6 | **Transportation Pavilion** | A golden-doored hall, early motor cars and a locomotive on display, flags | Bright, celebratory, gilt | Pavilion at the right third |
| 7 | **The Fair at Night** | The whole grounds outlined in bulbs, reflected in the lagoon, searchlight beams | Blue hour; electric light wins | Beams cross high above the card |
| 8 | **Garden Exhibition** | Formal parterres, a glasshouse, parasols, a fountain | Soft summer morning, pastel | Lowest-contrast of the ten |
| 9 | **International Pavilion** | A row of national pavilions in different architectural styles, flags of many countries | Clear midday | A rhythm of small forms, no single mass |
| 10 | **Ragtime Afternoon** | A bandstand, a crowd listening, a boy with a balloon, long shadows | Late golden afternoon, warm and nostalgic | Bandstand off-centre; crowd backs in the dark foreground |

## ACT English · Alpine Expedition

Above the treeline in all ten. The value structure is **inverted**: dark sky,
blazing snow in the distance, near-black foreground. Snow shadow is blue and
snow light is warm — never grey.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **Base Camp** | Bright tents on grey moraine, strung lines, crates, the mountain enormous above | Pre-dawn; only the summit is lit | Camp bottom-left; lit summit high and off-centre |
| 2 | **Glacier Crossing** | A rope team on a snowfield, crevasse lines, wands marking the route | Flat whiteout light, no shadows | Almost no contrast anywhere — the quietest |
| 3 | **Mountain Ridge** | Knife-edge corniced ridge corner to corner, two climbers, air on both sides | Hot alpenglow along the ridge line | The ridge runs corner to corner, missing the centre |
| 4 | **Ice Wall** | A vertical blue-ice face filling the frame, screws and rope, one climber | Raking light across the flutes | Flutes are fine even texture |
| 5 | **Summit Push** | A near-vertical snow slope, fixed line, oxygen mask, the curve of the earth behind | Brutal high sun, hard shadow | Slope is one clean plane |
| 6 | **Alpine Sunrise** | Peak tips catching first rose light, everything below still blue | The alpenglow moment | Lit tips are small and high |
| 7 | **Mountain Pass** | Prayer flags across a col, a cairn, the range beyond through them | Wind; flags in shadow, range lit | Flags cross the upper third as thin colour |
| 8 | **Storm on the Mountain** | Spindrift, a buried line of climbers, visibility gone | Violent, monochrome, almost no form | Deliberately the most abstract |
| 9 | **Frozen Lake** | Turquoise ice pan with pressure ridges, the wall reflected faintly, a yak train | Cold with one warm band on the wall above | Lake surface is the quiet middle |
| 10 | **Above the Clouds** | Only peak tips above a flat white cloud ocean, dark sky, a lone figure | Thin air; the sky is darker than the ground | Cloud sea is a soft field |

## ACT Math · Retro Hawaiian Vacation

Vintage travel-poster Hawaii, 1960s–80s. Nostalgic, cheerful, polished,
sunny. **No neon, no cyberpunk.** This is the most playful world and should
feel like a postcard someone kept.

| # | Scene | Key visual elements | Lighting / atmosphere | UI compatibility |
|---|---|---|---|---|
| 1 | **Waikiki Beach** | Diamond Head behind, outrigger canoes, striped umbrellas, a 60s hotel strip | Bright, cheerful midday | Headland is a flat mass at one side |
| 2 | **Retro Hotel Pool** | Kidney-shaped pool, springboard, curved loungers, breeze-block screen wall | Hard sun, crisp pool shadows, turquoise | Pool is the quiet middle |
| 3 | **Hawaiian Sunset** | Palms in silhouette, a wide banded sky, a catamaran on the horizon | Full sunset; palms backlit | Sky is a clean graded field |
| 4 | **Surf Shack** | Weathered wooden hut, boards on a rack, hibiscus, a bicycle, sandy path | Warm late afternoon, dappled | All detail is one small cluster off-centre |
| 5 | **Tropical Garden** | Monstera, heliconia, ti, a stone path, a koi pond | Green shade with sun gaps | Dense at the edges, open path centre |
| 6 | **Road to Hana** | A one-lane bridge, waterfall, dense jungle either side, a convertible | Humid, soft, green | Jungle frames; the road is the quiet middle |
| 7 | **Volcanic Coast** | Black lava rock, white surf exploding, a sea arch, green cliffs behind | High contrast at the water's edge | Contrast is all along the bottom |
| 8 | **Retro Tiki Resort** | Thatched A-frames, torches, rattan, a lanai with a hula skirt silhouette | Early evening, torchlight, warm | Torches are small warm points |
| 9 | **Catamaran Day** | A sail boat from the water, snorkellers, turquoise shallows, a reef | Full tropical sun, water impossibly clear | Water is a soft turquoise field |
| 10 | **Hawaiian Night** | Tiki torches down a beach, stars, a lit resort behind, moonlight on the water | Night but warm; nothing cold anywhere | Darkest, but warm — contrast for the card |

---

## Rules binding all 60

- **No scene may be another scene recoloured.** Each has its own subject.
- **Three depths minimum**, separated by brightness, not hue.
- **One named light source**, producing a visible warm rim.
- **A foreground element cropped by the frame** — the single device that
  separates concept art from illustration.
- **Something at human scale** in every scene. Grandeur is relational.
- **Shadows carry hue.** Grey shadow is the failure tell in all six worlds.
- **The middle stays quiet.** If a focal point would land behind the card,
  recompose — do not dim it.

## Asset spec

`public/art/<world>/<scene>.webp`, 2560×1440, quality ~82, under 400KB each.
A file is not enough: its key also goes in `SHIPPED` in
`src/journey/backdrops.ts`, so "how many are actually done" stays answerable.
