# The Country Club

Course id: `tcc_brookline` (data folder `data/tcc_brookline/`), branch `course/tcc_brookline`.

## Build summary

Built by a course chat on 2026-11-13. The club has 27 holes; the developer chose to build
only the Main course, the Clyde (1-9) and Squirrel (10-18) nines, and leave out Primrose.
OSM maps the Main course fully: 18 hole lines, every green, fairways, bunkers and tee boxes
(no pins). Elevation is the USGS 3DEP 1 m DEM (MA_CentralEastern_2021_B21); trees come from
the same 2021 lidar, which has vegetation classes. One tee set, Blue (the longest with
per-hole yardages; 18Birdies, 6,588 yd, 73.6/139); built 6,525 yd. Every hole is within
3 % except 3 (+4.0 %, a flag). New theme `tcc_brookline`; the logo is a curling stone.
Every hole was looked at in the game (tee shot and overview).

## Facts

-   **Location:** 191 Clyde Street, Chestnut Hill (Brookline), Norfolk County,
    Massachusetts, among the leafy suburbs south-west of Boston. `state` MA.
-   **Design:** Willie Campbell's first nine and eighteen (1893-1899), new holes by club
    members (1908); Primrose nine by William S. Flynn (1927, not built); restorations by
    Rees Jones (1988) and Gil Hanse (where2golf, foretee, top100golfcourses).
-   **UTM zone:** 19 N (EPSG:32619). World 1,792 x 1,536 m, origin (321870, 4686052): the
    OSM boundary (way 29870415, 1,371 x 1,232 m) plus 120 m. Theme `tcc_brookline` (new).
    Wind 1-9 mph (standing default, inland New England).
-   **Data** (release `data-tcc_brookline`, all from the GitHub Actions workflow
    2026-11-13; `make fetch NAME=tcc_brookline`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed).
    -   Elevation: 3DEP elevation service export at 1 m, EPSG:32619 (`raw/usgs_dem_m.tif`,
        committed); the 1 m DEM under the course is MA_CentralEastern_2021_B21.
    -   Lidar: USGS LPC MA_CentralEastern_2021_B21, 4 of the 6 tiles reach the world,
        UTM 19N metres, vegetation classes 3-5, flown leaf-off 2021-03-20; clipped by
        `intake.py laz --keep-evlrs`.
    -   Photo: NAIP from the USGS National Map service (`raw/naip.tif`, committed).
    -   Card: 18Birdies (read 2026-11-13); GolfPass's Main par row compared.
-   **Water:** 21 OSM penalty areas, all red (standing default). Out of bounds: the OSM
    boundary; the Robert T. Lynch Municipal course to the west is another course (dropped).
-   **Trees:** 3,809 lidar trees inside the boundary; 72 on mapped playing surfaces and 5
    in front of the 11th and 15th tees dropped. Types from crown shape.

## Scorecard

18Birdies, Main / Championship Course (read 2026-11-13), unverified (private club).
"Built" is what the game plays.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 35 | 4 | 5 | 3 | 4 | 5 | 4 | 3 | 4 | 4 | 36 | 71 |
| HCP | 5 | 15 | 1 | 9 | 7 | 17 | 11 | 13 | 3 | | 18 | 8 | 16 | 2 | 12 | 4 | 14 | 10 | 6 | | |
| Blue | 450 | 289 | 451 | 335 | 432 | 310 | 197 | 378 | 426 | 3268 | 334 | 513 | 131 | 402 | 534 | 432 | 186 | 370 | 418 | 3320 | 6588 |
| Built | 439 | 282 | 469 | 327 | 421 | 310 | 192 | 374 | 419 | 3233 | 334 | 516 | 131 | 406 | 527 | 421 | 183 | 365 | 409 | 3292 | 6525 |

Blue 73.6/139. 18Birdies also lists Black 6,599 (74.6/144), White 6,299 (71.8/134) and
Red 5,577 without per-hole yardages.

## Default tee

Blue: the longest set with per-hole yardages (standing default 4.1; Black has none).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; a new theme; an original
    logo (a single object on a small base).
-   2026-11-13: "we don't need the primrose 9": the Main course only.

### Developer's calls pending

"Other open items" in `data/tcc_brookline/validation_report.md`: the card and tee set (2),
3's flag (3), card hole, theme and logo (8).

## New pipeline keys or theme

-   No new config key, no pipeline change.
-   New theme `tcc_brookline`: `assets-src/palettes/tcc_brookline.json`,
    `assets-src/trees_tcc_brookline.py` (eastern white pine; red oak and elm). Logo
    `assets-src/course_logos/tcc_brookline.py`.

## Open items

See "Developer's calls pending" and `data/tcc_brookline/validation_report.md`.

## Lessons

-   **OSM may map only part of a 27-hole club** (here Primrose had three hole lines and a
    green missing, and one green drawn as a building). Ask early which nines are wanted.
-   **A neighbouring course in the export** (Lynch Municipal) brings 18 hole lines with the
    same refs: drop its polygon and lines in `edits.json` before the audit.
-   **Tournament courses keep their grandstands in OSM.** TCC had 69 grandstands, tents
    and trailers from the 2022 U.S. Open mapped on the course. Filter buildings inside the
    boundary by `building=grandstand|tent|mobile_home`, check them on the photo, and drop
    them in `edits.json`.
