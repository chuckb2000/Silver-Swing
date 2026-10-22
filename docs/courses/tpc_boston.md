# TPC Boston

Course id: `tpc_boston` (data folder `data/tpc_boston/`), branch `course/tpc_boston`.

## Build summary

Built 2026-10-20/21 by a course chat (Claude Opus 5.5), mostly overnight while the
developer slept (asked to finish the course unattended). OSM was nearly complete
(18 hole lines with par and handicap, 82 tee boxes, every green and fairway); the
layout needed edits only: the neighbouring Norton Country Club dropped or redrawn
as scenery, every penalty area red, hole 14's par from the club card, three tee
boxes tagged, paths, clubhouse and green-centre pins. Elevation from the USGS 3DEP
1 m service, trees from the 2021 Central Eastern Massachusetts lidar (leaf-off,
49,992 trees). Black and Gold tees, Black the default; theme `bayside`. Every hole
of both sets is within 3 % of the club's card after the tee moves. No pipeline
change. On the branch (built on `main` 24e20f2): 637 of 638 unit tests and all 8
Playwright tests pass; the one failure is `player.test.ts` "every course is in the
daily rotation", which clears when the design chat adds `tpc_boston` to
`game/src/data/dailyRoster.ts` after the merge (as for Triggs and Bandon Dunes).
A scratch copy of the per-course checks (COURSE_BUILD.md 8.2; not committed, see
Lessons) passes 15 of 15; every hole was looked at in the game. Two clean
`make course` runs, `raw/` fetched from the release, gave identical files (254).

## Facts

-   **Location:** 400 Arnold Palmer Boulevard, Norton, Bristol County,
    Massachusetts; wooded, with ponds and marshes through the middle of the
    course and Norton Country Club next door to the west. `state` MA. Course id
    `tpc_boston` (logo: a baby blue pair of lederhosen).
-   **Design:** Arnold Palmer (opened 2002); redesigned by Gil Hanse with Brad
    Faxon (2007); 18th green rebuilt 2011-12 (tpc.com, Wikipedia). Host of the
    PGA Tour's Deutsche Bank / Dell Technologies Championship (2003-2018), The
    Northern Trust (2020, 2022) and the FM Championship (2024, 2025), on a par-71
    or 73 tour card.
-   **UTM zone:** 19N (EPSG:32619). World 1,792 x 2,304 m (over the 2,048 m
    limit, approved by the developer 2026-10-20; the boundary is 2,020 m
    north-south). Theme `bayside` (developer: Franklin's theme). Wind 1-9 mph.
-   **Data** (originals in the GitHub release `data-tpc-boston`;
    `make fetch NAME=tpc_boston` puts the big ones in `raw/`):
    -   OSM: the developer's Overpass-format export (`export.1.geojson`, 2026-10-21),
        cut to the download box by `clip_osm.py` into `raw/overpass.geojson` (in git).
    -   Elevation: USGS 3DEP 1 m bare earth from the 3DEPElevation ImageServer
        (float32, EPSG:26919, world + 100 m; the 1 m source is the 2021 Central
        Eastern Massachusetts lidar), `exportImage.10.tiff`, 31.5-54.4 m.
    -   Trees: the same 2021 lidar's points (NOAA Data Access Viewer dataset 9777,
        job J1473646, two LAZ files, 200 M points, MA State Plane metres, flown
        early April 2021, leaf-off), classes 3-5.
    -   Scorecard: the club's 2024 printed card (`2024_Scorecard.pdf`).
-   **Water:** every penalty area red (standing default): 17 OSM ponds and
    marshes, plus a pond mapped only as `natural=water` and four wetlands mapped
    only as `natural=wetland` (`red_water_osm`), one of them under the par-3
    11th's line. Out of bounds: the course boundary; the driving range; Norton
    Country Club (its ponds drawn as plain water).
-   **Trees:** 49,992 from the lidar, 8,437 inside the course; 45 % conifers from
    the leaf-off returns; median 21 m, tallest 35 m. `trees_off_fairways_m` 2;
    52 dropped on playing surfaces (47 in penalty areas whose OSM outlines take in
    wooded marsh and bank); none needed for the tee shots.

## Scorecard

The club's 2024 printed scorecard (release `data-tpc-boston`; also
tpc.com/boston/wp-content/uploads/sites/20/2024/11/2024_Scorecard.pdf), read
2026-10-21; every row adds up to its printed total.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 4 | 4 | 5 | 3 | 4 | 36 | 4 | 3 | 5 | 4 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 11 | 1 | 15 | 7 | 9 | 5 | 3 | 17 | 13 | | 14 | 18 | 10 | 6 | 8 | 4 | 16 | 12 | 2 | | |
| Gold | 365 | 542 | 184 | 298 | 410 | 456 | 579 | 192 | 396 | 3422 | 425 | 211 | 486 | 427 | 495 | 421 | 161 | 412 | 530 | 3568 | 6990 |
| Built | 358 | 556 | 180 | 298 | 405 | 454 | 568 | 193 | 397 | | 424 | 206 | 494 | 426 | 496 | 417 | 161 | 407 | 532 | | 6972 |
| Black | 339 | 493 | 166 | 254 | 375 | 429 | 505 | 184 | 373 | 3118 | 402 | 192 | 465 | 394 | 458 | 388 | 144 | 389 | 504 | 3336 | 6454 |
| Built | 347 | 498 | 169 | 260 | 366 | 423 | 495 | 188 | 379 | | 402 | 195 | 465 | 388 | 460 | 382 | 140 | 379 | 497 | | 6436 |

Ratings (card): Championship 77.2/154, Gold 74.6/144, Black 72.1/139, Blended
70.9/135, White 70.1/132, Blue 66.1/122. Championship (7,282), White (6,035) and
Blue (5,147) are in `scorecard.csv`, not built; Blended (6,213) is printed as a
total only.

## Default tee

Black (developer, 2026-10-20): the standing default would have been the card's
Blue, which here is the forward set (5,147 yd); Black is the single set closest
to 6,300 yd. Gold is built too (developer).

## The developer's calls

-   2026-10-20: Black and Gold tees, Black the default; the club card (par 72,
    hole 14 a par 4) over the tour card; world 1,792 x 2,304 m; theme `bayside`;
    logo a baby blue pair of lederhosen; the standing defaults.
-   Everything else is the course chat's call, listed under Open items for
    review.

## Requests for the design chat

-   Add `tpc_boston` to `DAILY_ROSTER` in `game/src/data/dailyRoster.ts` (from the
    day after the merge).
-   Optional: a per-course test file (`game/tests/unit/tpc_boston.test.ts`); the
    scratch copy used here is Triggs' file with the id, state (MA), tees (Black,
    Gold), par 72 and theme (`bayside`) changed.
-   s06's open-item wording calls every card stroke index "GolfPass" and every
    tagged box "the developer's call".

## New pipeline keys or theme

None. No pipeline file changed, so `make regress` was not needed.

## Open items

See `data/tpc_boston/report_notes.md` (16 items, each with a recommendation)
and `data/tpc_boston/validation_report.md`. The ones to look at first:

1. Three tee boxes assigned by tag (6 Black, 3 Gold, 16 Black). Recommendation: accept.
2. Wetlands mapped only as `natural=wetland` are red penalty areas, including
   the marsh under 11's line. Recommendation: keep.
3. 47 lidar trees dropped inside OSM penalty areas (marsh by 5, bank of the pond
   by 18). Recommendation: accept.
4. Course card hole 16 (course chat's pick).

## Lessons

-   **Compressing a GeoTIFF with an image tool destroys it.** The first DEM
    upload arrived as two 1 MB 8-bit JPEG-in-TIFF pictures with no
    georeferencing. Check dtype, CRS and value range on arrival. The fix was a
    smaller request, not a bigger upload: the USGS 3DEPElevation ImageServer
    `exportImage` (float32 GeoTIFF, bbox in EPSG:26919, 1 m) gives the course
    area in one click (21 MB); `place_dem.py` puts it in `raw/` under a
    `USGS_1M_*` name so the existing `.gitignore` keeps it out of git.
-   **A neighbouring course's `golf=water_hazard` ponds export as yellow penalty
    areas outside the boundary**, and the game checks water before out of
    bounds. Dropping the other course's boundary and hole lines is not enough:
    redraw its hazards as plain `natural=water`.
-   **Long tee complexes hold several sets.** OSM drew two 40-60 m complexes as
    one box each; measuring the yardage range 2.5 m inside each box found the
    missing Gold 3 and Black 16 at their back ends. A tee set can be forced onto
    a box another set already uses (`hole` + `tee_set` tags, one set per tag).
-   **The developer's draft release isn't visible to `make fetch`**
    (`releases/tags/<tag>` returns 404 for drafts); ask for it to be published.
-   **Course-specific tests without editing `game/tests`:** when the developer
    limits a course chat to its own folders, a copy of another course's test file
    named `game/tests/unit/_scratch_<id>.test.ts`, listed in `.git/info/exclude`,
    runs the 8.2 checks without committing anything.
