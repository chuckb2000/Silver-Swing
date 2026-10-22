# RedTail Golf Center

Course id: `redtail` (data folder `data/redtail/`), branch `course/redtail`.

## Build summary

Built 2026-10-22 by a course chat following docs/COURSE_BUILD.md. OSM maps the whole course (boundary, 18 hole lines, 18 pins, 22 greens, 57 tee boxes, 25 fairways, 45 bunkers, 7 ponds, the range), so nothing was traced. Two OSM fixes in `edits.json`: a 2.5 km cart-path loop mapped as a closed way had been read as an 8.5 ha cart-path area over holes 2-7 (now a line), and every pond is tagged red. DOGAMI bare-earth DTM and canopy height model (1 m, feet); 5,584 lidar trees. Blue tees, `pnw` theme. 17 holes within 3 % of the card; hole 3 is a flag (-4.9 %). Course 6,654 yd against 6,682. No pipeline change. On the branch (after merging `main`): 761 unit tests pass, 1 fails (`player.test.ts`: `redtail` is not yet in the daily rotation, which the design chat adds after the merge); 13 course checks in `data/redtail/tests/redtail.test.ts` pass; 9 Playwright tests pass.

## Facts

-   **Location:** 8200 SW Scholls Ferry Road, Beaverton, Washington County, Oregon; a Portland Parks & Recreation course among houses and shops between Scholls Ferry Road and SW Hall Boulevard. `state` OR. Course id `redtail`.
-   **Design:** Progress Downs, designed by Erv Thoreson (Portland Parks landscape architect), construction from 1966, opened 1968; completely redesigned by John Zoller (PP&R golf manager) in 1999 and renamed RedTail after the red-tailed hawks nesting nearby (Portland Parks & Recreation course page, read 2026-10-22).
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,280 m, origin (516930, 5033321): the OSM boundary (920 x 1,021 m) + 130-180 m of scenery. Theme `pnw`. Wind 1-7 mph.
-   **Data:** OSM Overpass export 2026-10-22 (`raw/overpass.geojson`, in git). DOGAMI lidar DIGITAL_TERRAIN_MODEL_MOSAIC and CANOPY_HEIGHT_MODEL_MOSAIC, `exportImage` at 1 m in EPSG:32610, box x 516830-518310 / y 5033221-5034701, downloaded by the developer 2026-10-22; OSIP 2024 0.5 m orthophoto (JPEG, look-only checks). Originals in the GitHub release `redtail-data`; `make fetch NAME=redtail` puts them in `raw/` (`release.json`). Elevation 65.9-92.7 m.
-   **Water:** seven ponds, all red penalty areas (standing default; `penalty=red` in `edits.json`). Out of bounds: outside the OSM boundary, and the driving range. Parking aisles, service roads and paths inside the boundary are cart paths. Four practice greens are wrong greens. No stream crosses the course.
-   **Trees:** 5,584 from the DOGAMI canopy height model (1,446 inside the boundary), 23 % drawn as conifers from crown shape (no leaf-off data). 2,728 tops on building footprints dropped, 60 over ponds and one on a tee of hole 1. No tree stood in a fairway (`trees_off_fairways_m: 2`) and s06b removed none for tee shots.

## Scorecard

Club scorecard (Golf ScoreCards Inc., printed 6/2012; `scorecard-large.jpg` in the release), read 2026-10-22. Every row adds up to its printed Out/In/Total. golfingrecord.com lists the same Blue yardages.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 4 | 4 | 3 | 5 | 4 | 5 | 36 | 4 | 4 | 3 | 4 | 5 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 13 | 17 | 15 | 3 | 5 | 11 | 1 | 9 | 7 | | 12 | 4 | 18 | 8 | 16 | 2 | 14 | 6 | 10 | | |
| Blue | 353 | 150 | 322 | 409 | 394 | 161 | 621 | 371 | 493 | 3274 | 376 | 441 | 176 | 407 | 446 | 451 | 202 | 437 | 472 | 3408 | 6682 |
| Built | 352 | 148 | 306 | 421 | 384 | 156 | 612 | 369 | 488 | 3236 | 374 | 442 | 181 | 409 | 457 | 448 | 197 | 450 | 460 | 3418 | 6654 |

Men's ratings/slopes: Black 74.4/135, Blue 72.6/130, White 70.6/126, Red 67.4/118; Yellow has no rating. golfingrecord.com gives Blue 72.3/128. The handicap row is the card's men's row (the ladies' row for Red and Yellow differs). Black (7,107), White (6,267), Red (5,551) and Yellow (4,220) are in `scorecard.csv`, not built.

## Default tee

Blue, the standing default (COURSE_BUILD.md 4.1); the only set built.

## The developer's calls

-   2026-10-22: the card's rating and slope for Blue, 72.6/130 (not 72.3/128).
-   2026-10-22: the logo is a fox. The developer chose the design chat's fox (`assets-src/course_logos/redtail.py`, merged on `main` in PR #35) over the course chat's drawing; this branch takes main's.
-   Standing defaults used without asking: Blue tees, all water red, OSM boundary as OB with the range OB, trees from lidar, `pnw`, wind 1-7 mph, course card hole the course chat's pick.

## New pipeline keys or theme

None. `make regress` was not needed (no change in `pipeline/`, the shared `assets-src/` code or the `Makefile`).

## Open items

Details in `data/redtail/validation_report.md` ("Other open items").

1.  **Hole 3 is 306 yd against 322 (-4.9 %).** OSM has no Blue box; s06 uses the White-length box. The back box would be +7 %. Recommendation: accept the flag.
2.  **Two edge trees over the OSM lines of 7 and 10** (21 m and 26 m broadleaves in the left rough, 182-188 m out). A drive at the middle of the fairway clears them. Recommendation: keep.
3.  **Tree types from crown shape:** some of the Douglas firs along 4, 5 and 10 are drawn as broadleaves. Recommendation: accept for now; an orthophoto-based typing key in s05 is possible later.
4.  **Card hole:** 6 (the green out in the pond), the course chat's pick; the card also rotates through 9, 3 and 17.
5.  **Daily rotation:** add `redtail` to `game/src/data/dailyRoster.ts` at the merge (design chat), or `player.test.ts` fails on `main`.
6.  **s06's stroke-index note** names "GolfPass" and "spec 11.4" (Oswego Lake text) for every course. Request to the design chat: name the course's own scorecard source.

## Lessons

-   **A closed cart-path way becomes an area.** osmtogeojson (Overpass Turbo's export) turns a closed `golf=cartpath` way into a polygon, and s01 then reads it as a cart-path area. Here one loop round six holes became 8.5 ha of cart path; only the OSM plot showed it (grey over holes 2-7). Plot every kind on the overview before s04, and check cart-path polygons by area; `make_edits.py` turns them back into lines.
-   **Check `main` for the course's logo before drawing one.** The design chat drew and merged a RedTail fox while this chat drew its own; the developer chose the design chat's. COURSE_BUILD.md 12 says to use an existing logo; fetch `main` (DECISIONS.md, `assets-src/course_logos/`) right before drawing.
-   **The centre-line tree test is stricter than the standing default.** It flags real edge trees where OSM draws the hole line along the edge of the fairway. Look at the photo before removing them; s06b's fairway-middle test is the one the defaults ask for.
-   **A new course fails `player.test.ts`** until it is in `DAILY_ROSTER`; say so in the PR rather than editing the shared file.
-   **The in-game look runs at about 50 s a hole here** (5 views) with nothing else running: `playwright-report/look/` (git-ignored) with its own config, started in the background.
