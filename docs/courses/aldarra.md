# Aldarra Golf Club

Course id: `aldarra` (data folder `data/aldarra/`), branch `course/aldarra`.

## Build summary

Built by a course chat on 2026-11-13/14. OSM maps the course fully: 18 hole lines, greens,
fairways, bunkers, tee boxes and pins (no fairway on the par-3 9th). Elevation is the USGS
3DEP 1 m DEM (WA_KingCounty_2021_B21); trees come from the same 2021 King County lidar (six
tiles; 2158 took five fetch runs past rockyweb's rate limit), which is class 1 only, so
`roof_last_share` 0.85 is used. One tee set, Aldarra (the back set; GolfPass, 6,926 yd,
74.0/147); built 6,899 yd. 17 holes are within 3 %; 9 is a flag (-3.5 % from the back of
its box). The world is 2,560 x 2,304 m, over the 2,048 m guideline (approved). New theme
`aldarra`; the logo is an elk antler. Every hole was looked at in the game (tee shot and
overview).

## Facts

-   **Location:** Sammamish, King County, Washington, on the Sammamish Plateau east of
    Seattle; holes cut through second-growth fir and cedar forest. `state` WA.
-   **Design:** Tom Fazio, opened 2001 (GolfPass, the club).
-   **UTM zone:** 10 N (EPSG:32610). World 2,560 x 2,304 m, origin (577178, 5269617): the
    OSM boundary (way 255315612, 2,071 x 2,022 m) plus 120 m. Theme `aldarra` (new). Wind
    1-7 mph (standing default, Pacific Northwest).
-   **Data** (release `data-aldarra`, all from the GitHub Actions workflow 2026-11-13/14;
    `make fetch NAME=aldarra`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed).
    -   Elevation: 3DEP elevation service export at 1 m, EPSG:32610 (`raw/usgs_dem_m.tif`,
        committed); the 1 m DEM under the course is WA_KingCounty_2021_B21.
    -   Lidar: USGS LPC WA_KingCounty_2021_B21 (WA_KingCo_1_2021 and WA_KingCo_2_2021),
        tiles King_2157-2159 and 2229-2231, Washington North state plane (US ft), class 1
        only; clipped by `intake.py laz --keep-evlrs`. Tiles 2086-2088 lie south of the
        world and are not used.
    -   Photo: NAIP from the USGS National Map service, four exports resampled onto one
        0.6 m grid by `data/aldarra/make_ortho.py` (`raw/naip.tif`, committed).
    -   Card: GolfPass (read 2026-11-13); Offcourse's rating compared.
-   **Water:** the pond OSM maps as golf=water_hazard (tagged red, standing default) and two
    wetlands and a pond mapped only as natural water (`red_water_osm`), all red. Four streams
    in the wooded ravines between holes have no penalty area. Out of bounds: the OSM boundary.
-   **Trees:** 14,451 lidar trees inside the boundary; one top in a bunker dropped and one
    47 m fir 59 m in front of the 15th tee dropped. Types from crown shape.

## Scorecard

GolfPass, Aldarra Golf Club (read 2026-11-13), unverified (third party; private club).
"Built" is what the game plays (adjusted yards).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 5 | 4 | 4 | 3 | 5 | 4 | 3 | 35 | 4 | 5 | 5 | 3 | 4 | 3 | 4 | 4 | 4 | 36 | 71 |
| HCP | 5 | 9 | 1 | 7 | 11 | 15 | 13 | 3 | 17 | | 14 | 2 | 18 | 12 | 16 | 4 | 8 | 10 | 6 | | |
| Aldarra | 433 | 181 | 564 | 369 | 445 | 193 | 524 | 467 | 155 | 3331 | 359 | 528 | 522 | 251 | 450 | 229 | 476 | 343 | 437 | 3595 | 6926 |
| Built | 433 | 185 | 559 | 364 | 444 | 192 | 523 | 469 | 150 | 3319 | 358 | 515 | 519 | 254 | 449 | 232 | 476 | 340 | 437 | 3580 | 6899 |

Aldarra 74.0/147 (GolfPass; Offcourse rates 6,926 at 74.9/151). Also in `scorecard.csv`,
not built: Championship 6,596, Champ/Member 6,271, Member 6,195, Member/Club 5,723, Club
5,592, Club/Forward 5,076, Forward 5,070.

## Default tee

Aldarra: the longest set (standing default 4.1).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; a world over 2,048 m
    approved; a new theme; an original logo (a single object on a small base).

### Developer's calls pending

"Other open items" in `data/aldarra/validation_report.md`: the card and rating (1), 9's
flag (2), the streams (5), card hole, theme and logo (9).

## New pipeline keys or theme

-   No new config key, no pipeline change.
-   New theme `aldarra`: `assets-src/palettes/aldarra.json`, `assets-src/trees_aldarra.py`
    (western red cedar; Pacific madrone). Logo `assets-src/course_logos/aldarra.py`.

## Open items

See "Developer's calls pending" and `data/aldarra/validation_report.md`.

## Lessons

-   **rockyweb rate-limits (HTTP 429) when two fetch runs pull from it at once**: one tile
    failed on four runs and came through on the fifth, alone. Fetch one course's lidar at a
    time, list only the tiles inside the world, and leave out a `tnm` item on retries (it
    lists and re-tries every tile in the bbox). The S3 path `prd-tnm.s3.amazonaws.com/
    StagedProducts/...` does not have these LAZ files (404).
-   **Check tile extents against the world before fetching**: in state-plane feet the
    bbox query returned a row of tiles (2086-2088) wholly south of the world.
