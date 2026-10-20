# Bandon Dunes

Course id: `bandon_dunes` (data folder `data/bandon_dunes/`), branch `course/bandon_dunes`.

## Build summary

Built by a course chat on 2026-10-20 while the developer was away ("work
without asking"); the calls it made are listed under open items. OSM maps all
18 holes with tees, greens, pins and bunkers. Elevation and canopy are the
developer's DOGAMI DTM and CHM exports, and the OSIP 2024 orthophoto is used
for the gorse and to check the older lidar. The course is built from the Green
tees in a new `bandon_dunes` theme (shore pine, yellow-flowering gorse, fescue,
beach), with a seal logo. Every hole but the 1st is within 3 % of the card;
the 1st has no forward tee, so it plays 394 yd against 352. With the 13 course
tests (`data/bandon_dunes/tests/bandon_dunes.test.ts`) copied into
`game/tests/unit/`, all 565 unit tests pass (after merging `main` and `design/gorse`), and all 7 Playwright tests pass. Robot rounds over five seeds scored 73-80 with
no hole over par + 4.

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon,
    on a bluff about 30 m above the Pacific. `state` OR. Course id
    `bandon_dunes`. The resort's other courses (Pacific Dunes to the
    north, Bandon Trails and the Preserve to the south) share its
    `leisure=golf_course` polygon or sit beside it.
-   **Design:** David McLay Kidd; opened 19 May 1999. Since then gorse
    has been cleared in large amounts (Wikipedia, "Bandon Dunes Golf
    Resort").
-   **UTM zone:** 10 N (EPSG:32610). World 1,280 x 1,792 m (origin
    386060, 4782028). The box of the 18 holes is 1,000 x 1,442 m; the world
    adds 140-175 m of scenery. Theme `bandon_dunes` (new; Bandon Trails has `bandon`). Wind 8-16 mph
    (developer).
-   **Data** (GitHub release `bandon-dunes-data`; `make fetch
    NAME=bandon_dunes` puts the rasters in place):
    -   OSM: the developer's Overpass Turbo export of the full world
        (`export.4.geojson` -> `raw/overpass.geojson`, committed).
    -   DOGAMI lidar DTM (`exportImage.18.tiff`) and CHM
        (`exportImage.19.tiff`): 1 m, EPSG:32610, feet.
    -   OSIP 2024 orthophoto (`exportImage.jpg`): 0.5 m JPEG, georeferenced
        from the request box by `make_ortho.py`.
    -   The club scorecard (2026), plus look-only photos and the resort's
        plan map.
-   **Water:** the pond near the 11th (w777788176) is a red penalty area.
    Out of bounds is the resort polygon (w362513477), so Pacific Dunes
    ground inside it is in play and its greens are wrong greens. The beach
    and ocean, Chrome Lake, Round Lake and the driving range are out of
    bounds. The card's no-play zones are not modelled (developer).
-   **Trees:**
    -   3,692 lidar trees (1,182 on the course), all drawn as shore pine
        (`tree_type`).
    -   407 lidar trees missing from the 2024 photo were dropped
        (`trees_need_ortho`): the lidar predates the Preserve and parts of
        the Punchbowl.
    -   14,549 gorse bushes over 16.9 ha of scrub, taken from the photo
        (`gorse`). They are exported as trees.json `c: 3` and drawn from the
        theme's own bush sheet (`sprites/shrubs_bandon_dunes`, the mechanism
        `main` added for Gearhart). Under them the ground is the gorse surface
        (17, the design chat's gorse lie): a penal lie, at most 20-50 yd out with a tiny
        sweet spot. Outside the boundary it is ob_woods.
    -   No tree was removed for a tee shot.

## Scorecard

Club scorecard, 2026 (`Website-Bandon-Scorecard-2026.jpg`, read
2026-10-20). Every row adds up to its printed totals.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 5 | 4 | 4 | 3 | 4 | 4 | 5 | 36 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 13 | 15 | 3 | 5 | 1 | 17 | 7 | 11 | 9 | | 8 | 2 | 18 | 6 | 16 | 14 | 10 | 12 | 4 | | |
| Green | 352 | 155 | 489 | 362 | 400 | 153 | 372 | 342 | 520 | 3145 | 339 | 351 | 153 | 537 | 332 | 131 | 345 | 375 | 513 | 3076 | 6221 |
| Built | 394 | 155 | 486 | 363 | 410 | 157 | 371 | 350 | 515 | 3201 | 336 | 344 | 157 | 524 | 325 | 134 | 354 | 369 | 522 | 3065 | 6266 |

Men's ratings and slopes:
- Black 6,732 yd: 73.5/143
- Green: 71.1/133
- Gold 5,716 yd: 69.1/124
- Royal Blue 3,986 yd: 61.6/105
- Orange 5,040 yd: 65.5/114

The women's ratings are in `course_config.json`. Black, Gold, Royal Blue and
Orange are in `scorecard.csv` but not built.

## Default tee

Green (developer, 2026-10-20). The card has no Blue set. Green is the set
closest to 6,300 yd (the 4.1 rule). Royal Blue is a 3,986-yd forward set.

## The developer's calls

All made on 2026-10-20:
- **Tees:** Green.
- **Water and out of bounds:** every hazard red; out of bounds is the resort
  polygon.
- **Trees:** from lidar.
- **Sand:** the mapped sand is all bunkers already (no waste-area surface).
- **No-play zones:** not modelled.
- **Wind:** 8-16 mph, "in very rare cases dropping from 3-8".
- **Theme:** a new theme of its own.
- **Gorse:** the yellow-flowering shrub, designed by the course chat.
- **Logo:** a seal, drawn by the course chat.

## New pipeline keys or theme

Three new keys, each optional; without them every step does what it did
before.

`make regress` result (2026-10-20, all 16 courses rebuilt): 14 other courses
are unchanged. Langston differs in 10 files (`trees.json`, hole 18's putting
views and some minimaps: s06b no longer drops the 44.5 m tree on Royal 10). A
clean `main` worktree rebuilds Langston byte-for-byte the same way as this
branch, so the difference is already on `main` and is not caused by these keys.
Langston's committed files are left as they were (a design-chat item).

-   **`gorse`** (`pipeline/gorse.py`, run from s05 and s08): thickets
    classified in the orthophoto (`cfg["ortho"]`) become bushes of type
    `shrub`, which s10 exports as `c: 3`. The theme's bush painter draws
    them. `"ground": "gorse"` makes the ground under them the gorse surface
    (the design chat's `uses_gorse_ground` in s08, on `main`). Parameters
    and defaults are in the module docstring.
-   **`tree_type`** (s05): every lidar tree gets this type (`"conifer"`
    here).
-   **`trees_need_ortho`** (s05, `gorse.missing_in_ortho`): drops lidar
    trees whose crowns are not dark canopy in the orthophoto.
-   **Theme `bandon_dunes`** (renamed from `bandon`, which Bandon Trails
    uses on `main`):
    -   `assets-src/palettes/bandon_dunes.json`: the pnw keys plus F0-F2 for the
        fescue rough.
    -   `assets-src/trees_bandon_dunes.py`: `shore_pine` is the coastal pitch pine
        recoloured and sheared east by the wind. `gorse_bush` is the theme's
        bush painter (palette `"trees": {"shrub": ...}`): a low mound with
        yellow pea flowers, in 8 bloom levels (index % 8).
    -   `make assets` writes `sprites/trees_bandon_dunes.*` and
        `sprites/shrubs_bandon_dunes.*`. Every other sheet is byte-identical.
-   **Logo:** `assets-src/course_logos/bandon_dunes.py` (the per-course logo
    file `main` added): a grey, spotted harbor seal on a sea rock.
    `python3 assets-src/logos.py bandon_dunes` writes
    `sprites/logos/bandon_dunes.png`.

Files outside the course chat's own folders, all new except one pipeline
edit:
- `pipeline/gorse.py`, plus small edits to `pipeline/s05_trees.py` (the
  keys above; s08's gorse ground is the design chat's code on `main`)
- `assets-src/palettes/bandon_dunes.json`, `assets-src/trees_bandon_dunes.py`,
  `assets-src/course_logos/bandon_dunes.py`
- `game/public/sprites/trees_bandon_dunes.*`, `game/public/sprites/shrubs_bandon_dunes.*`
- `game/public/sprites/logos/bandon_dunes.png`
- `game/public/sprites/cards/bandon_dunes.png`
- `game/public/sprites/title/bandon_dunes.png`

## Requests to the design chat

1.  **A rare calm round** (developer: 8-16 mph, "in very rare cases"
    3-8). `roundWinds` draws one range per course. Smallest change: an
    optional `wind.calm = {share, minMph, maxMph}` in `course.json`; with
    probability `share` (seeded) a round uses that range. Bandon would use
    `{share: 0.05, minMph: 3, maxMph: 8}`, noted in `course_config.json`
    `wind_note`.
2.  **Move `data/bandon_dunes/tests/bandon_dunes.test.ts` into
    `game/tests/unit/`.** The course chat was asked to write only in its own
    folders. The test passes when copied there.
3.  **Langston no longer rebuilds to its committed files on `main`.**
    `make course NAME=langston` on a clean `main` keeps a tree that the
    committed build dropped from Royal 10's tee shot (see above). Rebuild and
    commit Langston, or find why s06b's result changed.
4.  Optional: a waste-sand surface for the card's "sand areas are general
    areas" rule. Not needed now, since OSM maps only bunkers.

## Open items

Details are in `data/bandon_dunes/validation_report.md`.

1.  **Hole 1 plays 394 yd against 352 (+11.8 %).** The only tee near the
    line start is a Black-length pad (406 yd from its centre). Recommend
    accepting it; the alternatives are a -5 % scale, or placing the Green tee
    on the tracing desk.
2.  **Tee boxes picked by the course chat** on holes 1, 2, 3, 11 and 12,
    each measured against the card and checked on the photo. Recommend
    keeping them. Hole 11's OSM line starts at boxes 445-463 yd out, longer
    than any card set.
3.  **Gorse extent and look.** It comes from a photo classifier; the
    species and bloom are flair. Recommend playing a few holes, then saying
    whether it is too dense or too yellow.
4.  **All trees drawn as shore pine.** A few spruce and broadleaves stand
    in the ravine south of the course, out of play.
5.  **Course card hole 2:** dune sand, gorse and pines around the green.
    It is the course chat's pick, and the developer can change it.

## Lessons

-   **Resort polygons hold several courses.** Drop the other courses'
    `golf=hole` lines and course polygons in `edits.json`, keep their
    surfaces, and drop their greens outside the world. s09 crashed on a
    green beyond the world edge (negative raster size).
-   **Old lidar, new course.** The DOGAMI South Coast lidar predates parts
    of the resort. Comparing tree crowns with a recent photo
    (`trees_need_ortho`) removed 407 trees standing on what are now greens
    and fairways of the Preserve.
-   **Shrubs under 4 m are invisible to the tree finder.** The thickets
    that define this course had to come from the photo. A simple colour
    rule (dark, blue-green, textured) separated them from the fescue cleanly
    in the late-summer OSIP image.
-   **The crown-shape rule misreads coastal pines** (86 % "deciduous"):
    wind-sheared shore pines are broad and flat. Look at the photo before
    trusting the split.
-   **A mapped beach that starts outside the world gives s08 nothing to
    grow from.** Propose the beach from the DEM instead (`make_beach.py`).
-   **Tee boxes beside the line.** s06 looks 25 m either side of the hole
    line. Boxes 26-33 m out (holes 2 and 3) and a tee complex 100 m from a
    misdrawn line start (hole 11) needed `hole`/`tee_set` tags. Measuring
    every box within 160 m against the card found them in one pass.
-   **A sprite outline that uses `np.roll`** wraps a solid bottom row onto
    the top row (a stray line above every gorse bush). Pad before rolling.
