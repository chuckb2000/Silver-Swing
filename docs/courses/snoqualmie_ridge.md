# TPC Snoqualmie Ridge

Course id: `snoqualmie_ridge` (data folder `data/snoqualmie_ridge/`), branch `course/snoqualmie_ridge`.

## Build summary

Built by a course chat on 2026-11-13/14. OSM maps the course fully: 18 hole lines, greens,
fairways, bunkers, tee boxes and pins. Elevation is the USGS 3DEP 1 m DEM
(WA_KingCounty_2021_B21); trees come from the same 2021 King County lidar (six tiles over
three fetch runs), which is class 1 only, so `roof_last_share` 0.85 is used. One tee set,
Mt. Si (the back set; GolfPass, 7,234 yd, 75.4/142); built 7,165 yd. 16 holes are within
3 %; 2 (-3.9 %) and 14 (-5.2 %, measured from the developer's tee along a redrawn dogleg)
are flags. The world is 2,560 m east-west, over the 2,048 m guideline (approved). New
theme `snoqualmie_ridge`; the logo is an axe in a stump. Every hole was looked at in the
game (tee shot and overview).

## Facts

-   **Location:** Snoqualmie Ridge, Snoqualmie, King County, Washington, on a forested
    ridge in the Cascade foothills facing Mount Si. `state` WA.
-   **Design:** Jack Nicklaus, opened 1999; a TPC course until 2016, now The Club at
    Snoqualmie Ridge (GolfPass, the club).
-   **UTM zone:** 10 N (EPSG:32610). World 2,560 x 2,048 m, origin (584507, 5264594): the
    OSM boundary (way 677694568, 2,324 x 1,744 m) plus 118 m. Theme `snoqualmie_ridge`
    (new). Wind 1-7 mph (standing default, Pacific Northwest).
-   **Data** (release `data-snoqualmie_ridge`, all from the GitHub Actions workflow
    2026-11-13; `make fetch NAME=snoqualmie_ridge`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed).
    -   Elevation: 3DEP elevation service export at 1 m, EPSG:32610 (`raw/usgs_dem_m.tif`,
        committed); the 1 m DEM under the course is WA_KingCounty_2021_B21.
    -   Lidar: USGS LPC WA_KingCounty_2021_B21 (WA_KingCo_2_2021), tiles King_1888-1890 and
        1956-1958, Washington North state plane (US ft), class 1 only; clipped by
        `intake.py laz --keep-evlrs`.
    -   Photo: NAIP from the USGS National Map service, four exports resampled onto one
        0.6 m grid by `data/snoqualmie_ridge/make_ortho.py` (`raw/naip.tif`, committed).
    -   Card: GolfPass (read 2026-11-13); Offcourse's older Black row compared.
-   **Water:** the four OSM penalty areas and the 1.9 ha pond inside the boundary mapped
    only as natural water (`red_water_osm`), all red. A swimming pool by the clubhouse
    plays as rough. Out of bounds: the OSM boundary.
-   **Trees:** 3,519 lidar trees inside the boundary; one top in a penalty area dropped;
    tops on the ridge's mapped house roofs dropped. Types from crown shape.

## Scorecard

GolfPass, The Club at Snoqualmie Ridge (read 2026-11-13), unverified (third party; the
club's card is not online). "Built" is what the game plays (adjusted yards).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 3 | 36 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 3 | 5 | 36 | 72 |
| HCP | 7 | 15 | 11 | 9 | 1 | 17 | 3 | 5 | 13 | | 12 | 4 | 6 | 18 | 2 | 10 | 8 | 16 | 14 | | |
| Mt. Si | 551 | 407 | 460 | 424 | 472 | 224 | 374 | 532 | 208 | 3652 | 351 | 480 | 425 | 207 | 425 | 589 | 380 | 210 | 515 | 3582 | 7234 |
| Built | 549 | 391 | 458 | 423 | 469 | 222 | 375 | 532 | 208 | 3627 | 352 | 474 | 425 | 204 | 403 | 587 | 373 | 205 | 515 | 3538 | 7165 |

Mt. Si 75.4/142. Offcourse has the older Black row (7,264 yd, 75.8/143) and another men's
handicap row (open item).

## Default tee

Mt. Si: the longest set (standing default 4.1).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; a world over 2,048 m
    approved; a new theme; an original logo (a single object on a small base).
-   2026-11-13: hole 14 "is fine it's just the way you calculated the dogleg": his Mt. Si
    tee from the tracing desk (`desk/hole14.json`) and a redrawn 14th line
    (`proposed/hole14.geojson`).

### Developer's calls pending

"Other open items" in `data/snoqualmie_ridge/validation_report.md`: the card (1), 2's flag
(3), the unmapped stream (4), card hole, theme and logo (6).

## New pipeline keys or theme

-   No new config key, no pipeline change.
-   New theme `snoqualmie_ridge`: `assets-src/palettes/snoqualmie_ridge.json`,
    `assets-src/trees_snoqualmie_ridge.py` (Douglas fir; bigleaf maple). Logo
    `assets-src/course_logos/snoqualmie_ridge.py`.

## Open items

See "Developer's calls pending" and `data/snoqualmie_ridge/validation_report.md`.

## Lessons

-   **King County lidar tiles are 340-480 MB and rockyweb is slow** (about an hour a tile
    on a runner, with HTTP 429s): six tiles took three fetch runs against the 5 h job limit.
    List the tiles first and split them over runs from the start.
-   **NAIP exports with different pixel sizes** (the edge strips) stop `intake.py ortho`;
    a small `make_ortho.py` that resamples them onto one grid fixes it.
-   **A dogleg measured through the wrong bend** can make a hole look 10 % short: put the
    bend on the fairway centreline at the corner before calling the tee wrong.
