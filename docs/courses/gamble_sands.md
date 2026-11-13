# Gamble Sands

Course id: `gamble_sands` (data folder `data/gamble_sands/`), branch `course/gamble_sands`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines, every
green, the fairways, 70 bunkers and most tee boxes (no pins). Elevation is the USGS 3DEP
1 m DEM (WA_NorthCentral_2021_B21); trees come from the same project's lidar, which covers
only the west third of the course; the sagebrush and rabbitbrush between the holes are
bushes read from the NAIP photo. One tee set, Medal (the longest), from the 18Birdies card
(7,305 yd); built 7,077 yd. Fourteen holes are within 3 % after tee moves inside the
mapped boxes (13 is -3.2 %); 6 (-15.7 %), 12 (-13.2 %), 14 (-22.4 %) and 18 (+8.6 %) fail
from the mapped tees and wait for the developer. New theme `gamble_sands`; the logo is an
apple on a sand mound. Every hole was looked at in the game (tee shot and overview).

## Facts

-   **Location:** 200 Sands Trail Road, Brewster, Okanogan County, Washington, on a sandy
    terrace above the Columbia River with orchards below. `state` WA.
-   **Design:** David McLay Kidd, opened 2014 (GolfPass).
-   **UTM zone:** 11 N (EPSG:32611). World 1,536 x 2,560 m, origin (301684, 5325810): the
    OSM boundary (way 876550790, 1,287 x 2,143 m) plus 120 m. Over 2,048 m north-south:
    approved by the developer 2026-11-13. Theme `gamble_sands` (new). Wind 1-7 mph
    (standing default, inland Pacific Northwest).
-   **Data** (release `data-gamble_sands`, all from the GitHub Actions workflow
    2026-11-13; `make fetch NAME=gamble_sands`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed).
    -   Elevation: 3DEP elevation service export at 1 m, EPSG:32611 (`raw/usgs_dem_m.tif`,
        committed); the 1 m DEM under the course is WA_NorthCentral_2021_B21.
    -   Lidar: USGS LPC WA_NorthCentral_2021_B21, flown 2022-03-30, UTM 11N metres, class 1
        only (no vegetation classes: `roof_last_share` 0.85). Three tiles reach the world
        and are clipped by `intake.py laz --keep-evlrs`; three more lie west of it. The
        project ends at x 302246.
    -   Photo: NAIP from the USGS National Map service, two exports placed by `intake.py
        ortho` (`raw/naip.tif`, committed).
    -   Card: 18Birdies (read 2026-11-13); Greenskeeper.org and GolfPass compared.
-   **Water:** two red penalty areas from OSM: a lateral water hazard that is really a dry
    sandy wash left of the 14th green (open item), and the pond south of the 12th, outside
    the boundary. Out of bounds: the OSM boundary and the driving range. Quicksands (the
    par-3 course) is outside the boundary.
-   **Trees:** 282 lidar trees in the world, 13 inside the boundary (orchards, cottonwoods
    and pines by the clubhouse and the creek); none east of the lidar's edge. 11,111
    bushes from the photo (`gorse` key: bushes only, no penal lie).

## Scorecard

18Birdies (read 2026-11-13), unverified third party; the club's card is not online.
"Built" is what the game plays (adjusted yards).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 3 | 4 | 3 | 5 | 4 | 4 | 36 | 3 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 11 | 13 | 1 | 17 | 3 | 9 | 7 | 15 | 5 | | 18 | 10 | 16 | 8 | 2 | 4 | 14 | 12 | 6 | | |
| Medal | 518 | 341 | 633 | 166 | 517 | 265 | 514 | 313 | 429 | 3696 | 155 | 436 | 333 | 562 | 437 | 467 | 225 | 428 | 566 | 3609 | 7305 |
| Built | 502 | 333 | 622 | 163 | 504 | 223 | 524 | 304 | 430 | 3605 | 154 | 436 | 289 | 544 | 339 | 455 | 219 | 421 | 615 | 3472 | 7077 |

Medal 74.8/131. Greenskeeper.org has 1 = 422 and 2 = 301 (7,169, 74.2/128); GolfPass an
older Medal row (7,151, 73.4/120) and another men's handicap row (open item 1).

## Default tee

Medal, the longest set (standing default 4.1).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; world over 2,048 m
    approved; a new theme; an original logo (a single object on a small base).

### Developer's calls pending

Numbered as "Other open items" in `data/gamble_sands/validation_report.md`: the card
(1), the fails on 6, 12, 14 and 18 (2-5), the dry wash mapped as water by 14 (6), the
lidar's east edge (8), Quicksands out of bounds (9), card hole, theme and logo (10).
Also: the 14th tee is OSM's small mown pad there, mapped as fairway and copied as a tee
(`proposed/tee14.geojson`, `edits.json`).

## New pipeline keys or theme

-   No new config key.
-   `pipeline/gorse.py`: bushes are also kept `clear_m` off a mapped driving range (the
    range's mown turf read as scrub). One word in a list; pinned courses are unchanged; an
    unpinned course using `gorse` with a mapped range gets no bushes on it.
-   New theme `gamble_sands`: `assets-src/palettes/gamble_sands.json`,
    `assets-src/trees_gamble_sands.py` (ponderosa pine, cottonwood; sagebrush and
    rabbitbrush as the bush). Logo `assets-src/course_logos/gamble_sands.py`.

## Open items

See "Developer's calls pending" above and `data/gamble_sands/validation_report.md`.

## Lessons

-   **Three third-party cards, three Medal rows.** Measure the mapped tees against each
    card before choosing; here the one that matched the tees on 1 and 2 was also the
    newest rating.
-   **A tee copied from another OSM kind needs a new id** in its `proposed/` file: an
    `edits.json` drop of the original id removes the copy as well.
-   **A desert course's driving range reads as scrub** to the bush rule; keep bushes off it.
-   **Check a lidar project's edge** (`intake.py laz` prints 0 points for tiles outside
    the world, and a tile's bounds end at the project's edge): here it ends inside the course.
-   **`npm install` rewrites `game/package-lock.json`** in this sandbox; don't commit it.
