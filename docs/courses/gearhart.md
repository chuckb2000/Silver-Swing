# Gearhart Golf Links

Course id: `gearhart` (data folder `data/gearhart/`), branch `course/gearhart`.

## Build summary

Built by a course chat on 2026-10-20 following docs/COURSE_BUILD.md. OSM was
complete (18 hole lines, 18 pins, every green, tee boxes and fairways; holes 14
and 15 renumbered). Elevation and canopy are DOGAMI's lidar mosaics, which here
predate the 2013-15 renovation, so the 737 lidar trees inside the boundary that
the OSIP 2024 photo shows as fescue were removed. Black tees (the card has no
Blue). A new `gearhart` theme: straw fescue rough traced from the 2024 photo
(art only), mown green rough, grey-white coastal sand, slate water, shore pine
and Sitka spruce. Every hole within 3 % of the card (6,166 yd built vs 6,176).
One new pipeline key, `fescue_areas`; `make regress` shows every other course
unchanged. Unit and Playwright test counts are in the pull request.

## Facts

-   **Location:** 1157 N Marion Ave, Gearhart, Clatsop County, Oregon, on the
    Clatsop Plains about 700 m from the Pacific beach. Neacoxie Creek runs
    along the east edge of the front nine. `state` OR. Course id `gearhart`
    (logo: the wrecked ship, `assets-src/logos.py`).
-   **Design:** front nine 1892, back nine 1913; a 2013-15 renovation took out
    many trees to restore the open links (Wikipedia; unverified, no designer
    named). Managed by Greenway Golf (GolfPass).
-   **UTM zone:** 10N (EPSG:32610). World 1,024 x 1,792 m (x0 428261,
    y0 5097199): the boundary's box (572 x 1,364 m) plus about 220 m of
    scenery on every side. Theme `gearhart`. Wind 3-14 mph (open coast).
-   **Data:** all in the GitHub release `gearhart-data` and committed in
    `data/gearhart/raw/` (`release.json`, `make fetch NAME=gearhart`):
    OSM (Overpass Turbo export of the world + 150 m, 2026-10-20 15:13 UTC,
    `export.2.geojson`); DOGAMI `DIGITAL_TERRAIN_MODEL_MOSAIC` and
    `CANOPY_HEIGHT_MODEL_MOSAIC` (exportImage at 1 m in EPSG:32610, feet;
    `exportImage.14.tiff`, `.15.tiff`), most likely the 2008-09 North Coast
    flight; OSIP 2024 orthophoto (0.5 m JPEG placed by its request box,
    `exportImage.jpg`; alignment against OSM greens and bunkers within about
    1 m); the club's scorecard PDF. Download links in `DATA_REQUEST.md`.
-   **Water:** all red: three ponds by the 5th-7th greens (OSM
    `lateral_water_hazard`) and Neacoxie Creek (w422896233, a `natural=water`
    polygon partly inside the boundary by the 6th and 8th tees,
    `red_water_osm`). Out of bounds: the OSM boundary, Gearhart Lane through
    the course (`ob_highways`) and the three parking lots (cut out of the
    boundary), per the card's local rule. No driving range.
-   **Trees:** 7,133 from the DOGAMI canopy model, 329 on the course after
    removing 737 the 2024 photo shows as gone (`check_trees.py`), 17 on
    playing surfaces, and one in the 2nd tee shot (s06b). Types by crown
    shape: narrow = Sitka spruce, broad = shore pine (every third red alder)
    in the theme's sprites; flair, not surveyed.

## Scorecard

Club scorecard PDF (Golf ScoreCards Inc., 03/2020, "Version 1"), supplied by
the developer 2026-10-20. Every row adds up to its printed Out, In and Total.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 4 | 36 | 4 | 3 | 4 | 5 | 4 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 16 | 4 | 18 | 14 | 2 | 10 | 12 | 6 | 8 | | 7 | 11 | 5 | 1 | 9 | 17 | 13 | 15 | 3 | | |
| The Stones | 370 | 356 | 268 | 217 | 369 | 348 | 339 | 487 | 373 | 3127 | 361 | 262 | 428 | 544 | 371 | 122 | 349 | 347 | 640 | 3424 | 6551 |
| Black | 324 | 349 | 263 | 176 | 360 | 338 | 334 | 456 | 346 | 2946 | 343 | 221 | 386 | 528 | 363 | 116 | 344 | 341 | 588 | 3230 | 6176 |
| Built | 333 | 347 | 264 | 177 | 357 | 336 | 332 | 461 | 341 | 2948 | 348 | 226 | 389 | 534 | 356 | 113 | 335 | 344 | 573 | 3218 | 6166 |

White (5,741) and Green (5,157) and the ladies' handicap row are in
`scorecard_full.csv`; White, Green and The Stones (as `stones`) are in
`scorecard.csv`, not built. Ratings from GolfPass (unverified; the card
prints none): The Stones 72.7/139, Black 70.8/137, White 69.3/130, Green
66.1/121.

## Default tee

Black, the only set built: the card has no Blue and Black is the set closest
to 6,300 yd (COURSE_BUILD.md 4.1).

## The developer's calls

2026-10-20, intake (all three recommendations accepted):

1. OSM's holes 15, 16, 16 are holes 14, 15, 16 (`edits.json` renumbers
   ways 1322722942 and 1322722943).
2. The card's local rule applies: Gearhart Lane and the parking lots are out
   of bounds.
3. Lidar trees no longer standing in the 2024 photo are removed and listed,
   not asked about one by one.

Also on 2026-10-20: a new theme designed for Gearhart (developer: "you have
permission to design a new theme"). The developer confirmed the red circles
on the tree check are fescue, not trees.

Standing defaults used without asking (4.1): Black tees, all water red, OB =
the OSM boundary, pins at the mapped `golf=pin`, trees from lidar with
fairway and tee-shot trees removed (`trees_off_fairways_m: 2`), wind by
region, card hole 7 (the course chat's pick: the green between two ponds
with spruce and the creek behind it), the existing logo.

## New pipeline keys or theme

-   **`fescue_areas`** (s09 and s09b, `rough_band_mask` in
    `pipeline/s09_render.py`): a GeoJSON file of areas of the rough left long.
    With it, rough inside those areas is drawn in the theme's rough tones and
    the rest of the rough in its `rough_band` (mown) tones; physics is
    unchanged. Without the key nothing changes (`make regress`: every other
    course unchanged). For COURSE_BUILD.md 3.3:
    `"fescue_areas": "proposed/fescue.geojson"   // optional, art only: rough inside these areas is drawn as long fescue, the rest as mown rough (Gearhart)`.
-   **Theme `gearhart`** (`assets-src/palettes/gearhart.json`,
    `assets-src/trees_gearhart.py`, `game/public/sprites/trees_gearhart.*`):
    the pnw keys plus F0-F2 fescue straw; rough mapped to F0-F2, mown band
    G3-G5; turf a cooler olive green; grey-white sand; slate grey-teal water;
    Sitka spruce (conifer), wind-sheared shore pine and red alder
    (deciduous). `make assets` leaves every other sheet byte-identical.
    Side-by-side with pnw: `data/gearhart/proposed/theme_side_by_side_*.png`.
-   Existing keys used: `red_water_osm`, `ob_highways`, `trees_off_fairways_m`,
    `drop_trees` (737 entries from `check_trees.py`), `rough_band_m` (2.0 m:
    a mown first cut beside the fairways inside the fescue).

## Open items

See `data/gearhart/report_notes.md` (in `validation_report.md`). The ones
that may want a decision:

1. The DEM is the same pre-renovation flight as the trees: reshaped ground
   since 2013 is not in the heights. Recommendation: accept; newer lidar
   would fix it if DOGAMI publishes one.
2. Fescue areas are traced from the 2024 photo by a colour rule. Recommendation:
   keep; redraw any area that looks wrong in the tracing desk.
3. Ratings are GolfPass's (unverified). Recommendation: keep until the club
   publishes them.

## Lessons

-   **Check the lidar's date against the course's history.** The DOGAMI
    mosaic here predates a renovation that removed most trees; the first
    tree pass put 1,067 trees on an open links. Comparing every crown with
    the latest state orthophoto (dark-canopy share in the crown, best within
    2.5 m for the lean of tall crowns in the photo) separated the 737 gone
    from the 248 standing cleanly; the developer confirmed the result at a
    glance.
-   **`drop_trees` clears the canopy too**, so removing hundreds of trees
    leaves no woods patches behind; keep the list one entry per line.
-   **The pipeline takes every `leisure=golf_course` polygon as a boundary**
    (`boundary_name` is not read). A second export with a wider box pulled in
    two unnamed course polygons nearby; drop them in `edits.json`.
-   **A long teeing ground can hold a set its centroid misses.** s06 assigns
    boxes by centroid, so a 46 m box covering 130-180 yd was skipped for a
    176 yd card; measure every box's yardage range before taking a lidar pad.
    The pad here was rough in the 2024 photo.
-   **Fescue vs mown rough is one colour rule on a summer photo** (green minus
    red: turf +10 to +26, fescue -10 to +1); OSM's `golf=rough` covered only
    part of it.
-   **Playwright ignores specs inside its own output folder** (`test-results/`)
    and wipes it at the start of a run; keep a throwaway look script under
    `playwright-report/` (also git-ignored) with its own config.
