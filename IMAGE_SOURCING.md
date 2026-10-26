# Map Image Sourcing Guide

All inner maps (Level 2) are now coded and routed. Four images need to be sourced to complete the zoom-in effect from world realms (Level 1) to inner maps (Level 2).

## Image Requirements

Each map should be:
- **Illustrated/painted style** (matches Emberwood aesthetic—avoid photorealism)
- **High detail** with distinct landmarks/locations
- **Landscape orientation** (~1200-2000px wide)
- **License-free or CC-BY** for use in your project

---

## Maps to Source

### 1. Tropical Isles (ACT Math)
**Purpose:** Beach/island theme for functions, geometry, statistics  
**Zoom from:** Hawaiian sunset world realm  
**Visual style:** Aerial view of tropical islands with beaches, reefs, lagoons, palm groves

**Search queries:**
- "tropical island map illustration"
- "fantasy beach island map"
- "aerial tropical island artwork"
- "resort island map illustration"

**Suggested sources:**
- Pinterest: search "tropical map illustration" + filter for "not pinned from pinterst.com"
- Etsy: "tropical island map art" (look for CC-BY or creator permissions)
- OpenGameArt.org: underwater/island maps
- DeviantArt: search "tropical island fantasy map"

**Places to label:** Coral Reef, Beach Shack, Island Peak, Palm Grove, Lagoon, Sunset Point

---

### 2. Boardwalk (ACT Reading)
**Purpose:** Pier/carnival theme for reading comprehension  
**Zoom from:** Boardwalk world realm  
**Visual style:** Detailed overhead view of an amusement park pier with rides, games, shops

**Search queries:**
- "carnival boardwalk map illustration"
- "amusement park overhead view"
- "pier carnival map artwork"
- "fantasy market fair map"

**Suggested sources:**
- Instagram: search "boardwalk illustration" + "map"
- Etsy: "carnival pier map" or "amusement park art"
- OpenGameArt.org: town/market maps
- ArtStation: search "boardwalk map"

**Places to label:** Carousel, Game Arcade, Ferris Wheel, Pier Head

---

### 3. Alpine Peaks (SAT Math + ACT English)
**Purpose:** Mountain/alpine theme for math and English  
**Zoom from:** Alpine/peaks world realm  
**Visual style:** Detailed mountain range with trails, peaks, passes, camp locations

**Search queries:**
- "mountain range map illustration"
- "alpine hiking map artwork"
- "fantasy mountain map"
- "D&D mountain terrain map"

**Suggested sources:**
- ArtStation: search "mountain map"
- DeviantArt: "alpine fantasy map"
- OpenGameArt.org: mountain/cave maps
- Tolkien-inspired map artists (check licensing)

**Places to label:** Base Camp, Ridge Trail, Summit, Glacier Pass

---

### 4. National Park (ACT Science)
**Purpose:** Wilderness/park theme for science  
**Zoom from:** National park world realm  
**Visual style:** Overhead view of a park with canyon, forest, waterfall, visitor facilities

**Search queries:**
- "national park map illustration"
- "canyon landscape map artwork"
- "wilderness park map illustration"
- "Yellowstone-style map art"

**Suggested sources:**
- USGS: vintage park maps (public domain) + art over them
- Etsy: "park map art"
- ArtStation: "landscape map"
- OpenGameArt.org: outdoor/nature maps

**Places to label:** Visitor Center, Canyon Rim, Forest Trail, Waterfall

---

## Installation Steps

1. **Find suitable image** using queries/sources above
2. **Download** in WebP format (or PNG, convert to WebP with ImageMagick if needed)
3. **Resize** to 1200-1600px wide, landscape
4. **Place** in `apps/web/public/art/maps/`:
   - `tropical-isles.webp`
   - `boardwalk.webp`
   - `alpine-peaks.webp`
   - `national-park.webp`

5. **Test**: Navigate to ACT Math / ACT Reading / ACT Science in the app—should load your maps

---

## Alternative: Quick Placeholder

If sourcing takes too long before Monday 6pm, I can generate simple SVG placeholder maps to keep the structure working while you source real images later.

---

## Legal Notes

- Always check image license before using (CC-BY, public domain, Etsy artist permission)
- If sourcing from Pinterest/Instagram, click through to original artist
- OpenGameArt.org and OpenClipArt.org are safest for CC licenses
- For commercial education use, avoid strict "non-commercial" CC licenses

Good luck!
