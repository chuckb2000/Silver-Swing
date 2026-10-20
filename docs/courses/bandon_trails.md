# Bandon Trails

Course id: `bandon_trails` (data folder `data/bandon_trails/`), branch `course/bandon_trails`.

## Build summary

Built 2026-10-20 by a course chat with the standing defaults (COURSE_BUILD.md 4.1)
and the developer's two calls: a new theme (`bandon`) and the trail-marker logo.
OSM was complete (hole lines, greens, pins, tees, fairways, bunkers), so nothing
was traced; the export also held the resort's other courses, whose boundaries and
hole lines are dropped in `edits.json`. DOGAMI bare-earth DTM and canopy height
model (1 m), OSIP 2024 orthophoto for checks. Green tees (the card has no Blue).
Every hole is within 3 % of the card after moving the virtual tee within its box
on seven holes (total 6,258 yd against 6,249). Two clean builds are byte-identical.
513 unit tests (501 on main plus 12 for this course) and the Playwright tests pass;
every hole was looked at in the game.

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon; inland of
    the dunes, through dune scrub, meadow and Sitka spruce / shore pine forest; no
    hole on the ocean. `state` OR. Course id `bandon_trails`.
-   **Design:** Bill Coore and Ben Crenshaw, opened 1 June 2005 (Wikipedia, "Bandon
    Dunes Golf Resort").
-   **UTM zone:** 10N (EPSG:32610). World 1,792 x 1,792 m (x0 386501, y0 4780641):
    the boundary's box plus 144-213 m of scenery. Theme `bandon`. Wind 3-14 mph
    (open coast).
-   **Data:** OSM Overpass Turbo export of 2026-10-20 (`raw/overpass.geojson`, the
    metadata stripped by `strip_osm_meta.py`); DOGAMI lidar
    DIGITAL_TERRAIN_MODEL_MOSAIC and CANOPY_HEIGHT_MODEL_MOSAIC exportImage, 1 m,
    feet, box x 386401-388393 / y 4780541-4782533; OSIP 2024 0.5 m orthophoto
    (JPEG, look only). The rasters are in the GitHub release `bandon-trails-data`;
    `make fetch NAME=bandon_trails` puts them in `raw/` (`release.json`). The
    project year of the lidar is not given by the mosaic; the crowns match the 2024
    photo, so it post-dates the course (probably the 2008 OLC South Coast flight or
    later).
-   **Water:** all red. The two ponds by hole 11 and Round Lake beside the 7th tee
    (outside the boundary, `red_water_osm`). Fahys Lake (108 m from hole 13 through
    forest) and everything else outside the boundary is out of bounds, including the
    neighbouring Bandon Dunes, Bandon Preserve and Shortys. No driving range inside.
    Round Lake Drive (holes 3 and 18) plays as a cart path.
-   **Trees:** 25,950 from the canopy height model (5,080 on the course; median
    19.5 m, max 43.3 m). Narrow crowns drawn as Sitka spruce / Douglas fir, broad
    ones as shore pine (a drawing choice, see the theme). One 18.7 m tree inside
    hole 9's fairway removed (`trees_off_fairways_m: 2`); s06b dropped none.

## Scorecard

Bandon Dunes Golf Resort, Bandon Trails scorecard 2026 (website image, in the
release), read 2026-10-20. Every row adds up to its printed totals.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 5 | 4 | 3 | 4 | 4 | 4 | 5 | 36 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 3 | 4 | 35 | 71 |
| HCP | 13 | 17 | 3 | 5 | 15 | 9 | 7 | 11 | 1 | | 10 | 4 | 18 | 12 | 14 | 8 | 2 | 16 | 6 | | |
| Green | 356 | 166 | 532 | 365 | 124 | 359 | 406 | 299 | 522 | 3129 | 393 | 429 | 235 | 374 | 306 | 367 | 494 | 159 | 363 | 3120 | 6249 |
| Built | 347 | 168 | 533 | 365 | 121 | 354 | 394 | 306 | 524 | 3112 | 395 | 440 | 229 | 383 | 304 | 368 | 502 | 164 | 361 | 3146 | 6258 |

Ratings/slopes (men's): Black 74.9/136 (6,788), Green 72.0/137 (6,249), Gold
69.6/132 (5,751), Royal Blue 63.0/113 (3,937), Orange 66.6/125 (5,097; its own
handicap row). Black, Gold, Royal Blue and Orange are in `scorecard.csv`, not built.

## Default tee

Green: the card has no Blue, and Green is the set closest to 6,300 yd (4.1 default).

## The developer's calls

2026-10-20 (intake reply): every intake recommendation accepted: Green tees; all
water red, Round Lake a red penalty area, Fahys Lake out of bounds; the OSM boundary
as out of bounds and Round Lake Drive as a cart path; lidar trees with
`trees_off_fairways_m`; wind 3-14 mph; built on its own (not as a layout with Bandon
Dunes); the course chat picks the card hole. Logo: a wooden trail-marker post with a
spruce behind it (drawn by the course chat with permission, `assets-src/logo_bandon_trails.py`).
A new theme for the course (permission given). The developer asked for the build to
go ahead without questions while away.

## New pipeline keys or theme

-   No pipeline change and no new config key. Keys used: `red_water_osm`,
    `trees_off_fairways_m`, `rough_band_m` (Highland Links' mown band along the
    fairways, 3.5 m here).
-   New theme `bandon` (`assets-src/palettes/bandon.json`, `assets-src/trees_bandon.py`,
    sprites `game/public/sprites/trees_bandon.*`): yellow-green fescue fairways and
    greens, golden fescue rough (`F0-F2`, `lut.rough`), a greener mown band, warm tan
    dune sand, dark tannin water, olive dune scrub off the course; Sitka spruce, Douglas
    fir and older-growth spruce as the three conifer variants (pnw shapes recoloured),
    and a new wind-shaped shore pine (flat, lumpy crown leaning east) for the broad
    crowns. `make assets` leaves every other sheet byte-identical.
-   Logo: `assets-src/logo_bandon_trails.py` (`trail_post`), registered in
    `assets-src/logos.py` LOGOS as `bandon_trails` (a one-line import and one entry;
    every other logo is byte-identical). The design chat owns `logos.py`: if it would
    rather add the entry itself, the drawing module stands alone.
-   `make regress` (`python3 pipeline/regress.py --since origin/main --mine
    bandon_trails`; the new theme files are under `assets-src/`, so it rebuilt every
    course), 2026-10-20: every course unchanged except Langston, where the rebuild no
    longer drops one tree for the Royal 10 tee shot (s06b; 10 files: trees.json, three
    minimaps, a terrain chunk, the 18th green's far view, the report). A clean `main`
    worktree rebuilds Langston byte-for-byte the same way, so the drift is on `main`
    already and not caused by this branch (no file here reaches s06b). Langston's
    committed files are left as they are; a request for the design chat (open item 6).

## Open items

Details in `data/bandon_trails/validation_report.md` and `report_notes.md`.

1. **Tees moved within their boxes on holes 1, 5, 7, 8, 11, 12 and 13.** From the box
   centres, 5, 7, 11 and 12 are 8-12 % off the card: each box is a long complex
   shared by several sets. Recommendation: accept (every hole within 3 %).
2. **Unraked sand plays as rough.** The card makes sand without rakes a general
   area; OSM maps only the bunkers. Recommendation: accept.
3. **Tree species are drawn, not surveyed** (crown shape only). Recommendation: accept.
4. **Wind 3-14 mph.** Recommendation: keep; 2-12 if the forest holes play too windy.
5. **Design chat request (optional):** s07/s09 fail on a green wholly outside the
   world (`terrain_z_px`, "negative dimensions"); this course drops 11 off-map Bandon
   Dunes greens in `edits.json` to avoid it. Smallest fix: skip greens whose
   buffered bounds miss the world in s07.
6. **Design chat: Langston does not rebuild as committed on `main`.** A clean rebuild
   keeps the 44.5 m tree 19.4 m from the Royal 10 tee that the committed build dropped
   (s06b), so `make regress` reports Langston changed for every branch that touches
   `pipeline/` or `assets-src/`. Recommendation: rebuild Langston on `main` and look at
   the 10th tee shot, or list the tree in its `drop_trees`.

## Lessons

-   **A resort export holds every course in the box.** The pipeline takes every
    `leisure=golf_course` and every `golf=hole` it finds, so the neighbours' boundaries
    and hole lines must be dropped (`make_edits.py` does it by name and checks each
    line lies outside the boundary). Their greens off the map must go too, or s09 fails.
-   **Overpass exports made with metadata on** carry @user/@uid/@timestamp per feature;
    strip them before s01 (they would become OSM tags).
-   **Long shared tee complexes measure badly from the centre.** Four holes were over 8 %
    from the box centres and within 3 % once s06 moved the tee along the box. Read the
    adjusted column before calling a FAIL.
-   **On a coastal conifer course the "deciduous" crowns are pines.** A theme can draw
    the broad-crown class as shore pine; say so as a drawing choice.
-   **The 2024 orthophoto settles the lidar's age** when the mosaic gives no year:
    overlay the crowns on photo crops.
-   **`golf=path`** is still not read by s01 (COURSE_LESSONS.md 10); `make_edits.py`
    copies it as a cart path with a new id (dropping by id would otherwise remove the copy).
