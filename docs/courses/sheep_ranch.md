# Sheep Ranch

Course id: `sheep_ranch` (data folder `data/sheep_ranch/`), branch `course/sheep_ranch`.

## Build summary

Built by a course chat on 2026-10-21, together with Pacific Dunes and Old
Macdonald (one set of downloads, GitHub release `pacific-dunes-data`; the
shared build notes and lessons are in `docs/courses/pacific_dunes.md`). OSM
maps the 18 holes with greens, pins and fairways, but only three tiny tee
markers. The OSM hole lines start on the tees (developer), and from there the
course matches the Black card, so it is built from the Black tees: 12 x 8 m
boxes on the line starts, and on hole 3, whose line starts beside the 2nd
green, at the Black distance on the line. Holes 3 and 16 share the green on
the point, which OSM maps as one polygon; it is cut into one part per hole.
Elevation and canopy are DOGAMI's 2008 lidar (twelve years older than the
course), with the sea filled in, and the OSIP 2024 photo gives the gorse and
drops stale trees. Theme `bandon_dunes`; the logo is a black-faced sheep on a
clifftop. 16 holes are within 3 % of the card and two are 5 % flags (6,620 yd
against 6,636). The 13 course tests
(`data/sheep_ranch/tests/sheep_ranch.test.ts`) pass when copied into
`game/tests/unit/` (unit and Playwright totals in `pacific_dunes.md`). Robot
rounds over five seeds scored 74-79 with no hole over par + 4. Every hole was
looked at in the game.

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon, on
    the headland at the north end of the resort, above the Pacific. `state`
    OR. Course id `sheep_ranch`.
-   **Design:** Bill Coore and Ben Crenshaw, opened 2020 (the headland held an
    earlier layout of greens without fairways).
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 1,792 m (origin 386377,
    4785036): the box of the 18 holes (684 x 1,412 m) plus 170-190 m of
    scenery. The course polygon reaches 207 m east of the world (its east
    edge holds no holes). Theme `bandon_dunes`. Wind 8-16 mph (as at Bandon
    Dunes).
-   **Data:** as Pacific Dunes (shared release `pacific-dunes-data`; `make
    fetch NAME=sheep_ranch`), plus `fill_sea.py`: the 2008 lidar has no data
    over the ocean, which the world's north-west corner reaches, so those
    cells get the water-line height (scenery only). The club card
    (`Sheep-Ranch-Scorecard_2022-scaled.webp`); an older card with other
    ratings (`images.jpg`) and the resort's map (`SheepRanchGC_AerialMap.jpg`)
    are look only.
-   **Water:** none on the course. Out of bounds is the course polygon
    (w823626858); the beach, the ocean and the driving range north-east of the
    course are out of bounds. The card's no-play zones (1, 3, 5, 6, 7, 9, 15,
    16, 17) are not modelled.
-   **Trees:**
    -   3,216 lidar trees (838 inside the boundary), all shore pine; 558 that
        the 2024 photo no longer shows were dropped (`trees_need_ortho`).
    -   13,668 gorse bushes over 15.9 ha of scrub from the photo (4.3 ha
        inside the boundary), on the gorse surface (17).
    -   No tree was removed for a tee shot.

## Scorecard

Club scorecard, 2022 (`Sheep-Ranch-Scorecard_2022-scaled.webp`, release
`pacific-dunes-data`, read 2026-10-21). Every row adds up to its printed
totals; the yardages, pars and stroke index agree with GolfPass (whose
ratings are the older card's).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 3 | 4 | 3 | 4 | 4 | 34 | 4 | 5 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 38 | 72 |
| HCP | 5 | 13 | 17 | 3 | 11 | 1 | 15 | 7 | 9 | | 6 | 4 | 2 | 10 | 8 | 14 | 16 | 12 | 18 | | |
| Black | 549 | 318 | 120 | 474 | 198 | 460 | 155 | 429 | 399 | 3102 | 390 | 529 | 440 | 510 | 403 | 321 | 151 | 326 | 464 | 3534 | 6636 |
| Built | 558 | 334 | 118 | 482 | 193 | 452 | 151 | 424 | 397 | 3109 | 389 | 531 | 417 | 514 | 401 | 329 | 147 | 326 | 457 | 3511 | 6620 |

Men's ratings and slopes (2022 card): Black 71.9/121, Green 6,245 yd
70.0/116, Gold 5,810 yd 67.9/109, Orange 5,144 yd 65.0/102, Royal Blue
3,943 yd 61.0/97. Green, Gold, Orange and Royal Blue are in `scorecard.csv`
but not built.

## Default tee

Black (developer, 2026-10-21): the OSM lines start on the tees, and measured
from there the course matches the Black card (6,677 yd from the line starts
against 6,636 Black and 6,245 Green, the 4.1 default).

## The developer's calls

-   2026-10-21: the tees are at the start of the OSM hole lines; Black tees,
    hole 3 fixed against the photo and flagged; the logo (a sheep on a
    clifftop); the standing defaults; one shared release.
-   Inherited from Bandon Dunes: wind 8-16 mph, theme `bandon_dunes`.

## New pipeline keys or theme

None (see Pacific Dunes). Course-folder helpers: `make_tees_linestart.py`,
`split_double_greens.py` (the 3/16 green), `fill_sea.py` (run by `make
fetch`).

Files outside the four course folders (all new, per course; the developer
agreed 2026-10-21): `assets-src/course_logos/sheep_ranch.py`,
`game/public/sprites/logos/sheep_ranch.png`,
`game/public/sprites/cards/sheep_ranch.png`,
`game/public/sprites/title/sheep_ranch.png`.

## Requests to the design chat

1.  Add Sheep Ranch to the daily rotation and move
    `data/sheep_ranch/tests/sheep_ranch.test.ts` into `game/tests/unit/`.
2.  The seam on a split double green (Old Macdonald request 2).
3.  The card's bushes (Pacific Dunes request 2).

## Open items

Details are in `data/sheep_ranch/validation_report.md`.

1.  **Tee boxes on the line starts** (16 holes; OSM's markers serve 1 and
    16): 12 x 8 m boxes, the size the course chat's. Recommend keeping them.
2.  **Hole 3:** the line starts beside the 2nd green, 183 yd out against a
    120-yd card; the box stands 57 m ahead, where the card distance falls on
    the line (118 yd). Recommend confirming, or saying where the tee is.
3.  **Flags:** 2 (+5.2 %) and 12 (-5.2 %), measured from the line starts.
    Recommend accepting.
4.  **Double green 3/16** on the point, cut in two between the holes' OSM
    pins.
5.  **Course card hole 6:** the green on the cliff edge. The course chat's
    pick.
6.  **The north photo tile's JPEG** goes in the release (see Pacific Dunes).

## Lessons

The shared lessons are in `docs/courses/pacific_dunes.md`.

-   **Lidar that isn't hydro-flattened has no data over the sea.** A world
    that reaches the ocean stops s00 (nodata over the world + 32 m); fill the
    sea cells joined to the raster's edge with the water-line height in a
    course helper run by `make fetch` (`fill_sea.py`), and s04's
    `lake_level_max_m` turns them into sea.
-   **A hole line can start at the previous green** (hole 3): when one hole
    is far over every card column, look at where its line starts before
    measuring tee boxes.
