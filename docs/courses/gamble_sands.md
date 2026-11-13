# Gamble Sands

Course id: `gamble_sands` (data folder `data/gamble_sands/`), branch `course/gamble_sands`.

## Build summary

Built by a course chat on 2026-11-13 with the developer (the club's card and screenshots
of the tees). OSM maps the whole course: 18 hole lines, every green, the fairways, 70
bunkers and most tee boxes (no pins). Elevation is the USGS 3DEP 1 m DEM
(WA_NorthCentral_2021_B21); trees come from the same project's lidar, which covers only
the west third; the sagebrush and rabbitbrush are bushes read from the NAIP photo. One tee
set, Medal (the longest), from the club's printed card (7,151 yd, 73.4/120); built 6,977
yd. The tees are effectively part of the fairway (developer), so on 1, 12 and 18 the Medal
tee is placed on the fairway at the card distance. All sand plays as waste sand, as the
card's local rule says. Fourteen holes are within 3 %, 7 and 13 are flags (+5.5 %,
-3.2 %), 6 (-15.4 %) and 14 (-23.8 %) are accepted fails waiting for the developer.
New theme `gamble_sands`; the logo is an apple on a sand mound. Every hole was looked at
in the game (tee shot and overview).

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
    -   Card: the club's printed card (07/24), from the developer 2026-11-13.
-   **Water:** one red penalty area, the pond south of the 12th, outside the boundary. The
    dry sandy wash left of the 14th green (OSM: lateral water hazard) and every bunker
    are waste sand (the card's local rule). Out of bounds: the OSM boundary and the driving range. Quicksands (the
    par-3 course) is outside the boundary.
-   **Trees:** 282 lidar trees in the world, 13 inside the boundary (orchards, cottonwoods
    and pines by the clubhouse and the creek); none east of the lidar's edge. 11,111
    bushes from the photo (`gorse` key: bushes only, no penal lie).

## Scorecard

The club's printed scorecard (dated 07/24), photographed and sent by the developer
2026-11-13. "Built" is what the game plays (adjusted yards).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 3 | 4 | 3 | 5 | 4 | 4 | 36 | 3 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 7 | 11 | 1 | 15 | 5 | 13 | 3 | 17 | 9 | | 14 | 6 | 18 | 12 | 2 | 8 | 10 | 4 | 16 | | |
| Medal | 430 | 340 | 632 | 165 | 501 | 264 | 493 | 310 | 421 | 3556 | 147 | 426 | 327 | 562 | 445 | 470 | 220 | 420 | 578 | 3595 | 7151 |
| Built | 429 | 332 | 622 | 163 | 489 | 223 | 520 | 304 | 430 | 3512 | 151 | 436 | 323 | 544 | 339 | 458 | 215 | 421 | 578 | 3465 | 6977 |

Medal 73.4/120; Back 70.7/114, Sands 69.4/111, Regular 68.6/109, Intermediate 66.0/103,
Forward 66.4/102 (women's) are in `scorecard.csv`, not built. 18Birdies and
Greenskeeper.org show other Medal rows (7,305 and 7,169): the club's card wins.

The card's local rules: all sandy areas are played as waste areas; all desert areas are
red penalty areas, their edge where grass and desert meet (Model Local Rule B-1).

## Default tee

Medal, the longest set (standing default 4.1).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; world over 2,048 m
    approved; a new theme; an original logo (a single object on a small base).
-   2026-11-13: the club's printed card (photo); screenshots of 1, 6, 12 and 14: "the tee
    boxes look like they are effectively part of the fairway" (tees on 1, 12, 18 placed on
    the fairway at the card distance).

### Developer's calls pending

"Other open items" in `data/gamble_sands/validation_report.md`: 6 and 14 accepted as
mapped (3, 4), the desert penalty-area request (6), card hole, theme and logo (9).

### Request for the design chat

The card's local rule makes every desert area (the sand, sage and bunchgrass outside the
grass) a red penalty area, its edge where grass and desert meet. Today a penalty area is
drawn and played as water, so the course keeps the desert as rough. Smallest change: a
course config key (e.g. `"desert_penalty": true`) that makes the native ground inside the
boundary (rough outside the mown band, `fescue_areas`-style) a red penalty area for the
rules (relief options, one stroke) while s09 keeps drawing it as native ground.

## New pipeline keys or theme

-   No new config key (`"waste_sand": true` is main's key; every bunker is tagged `sand=waste`).
-   `pipeline/gorse.py`: bushes are also kept `clear_m` off a mapped driving range (the
    range's mown turf read as scrub). One word in a list; pinned courses are unchanged; an
    unpinned course using `gorse` with a mapped range gets no bushes on it.
-   New theme `gamble_sands`: `assets-src/palettes/gamble_sands.json`,
    `assets-src/trees_gamble_sands.py` (ponderosa pine, cottonwood; sagebrush and
    rabbitbrush as the bush). Logo `assets-src/course_logos/gamble_sands.py`.

## Open items

See "Developer's calls pending" above and `data/gamble_sands/validation_report.md`.

## Lessons

-   **Three third-party cards, three Medal rows, and the club's card matched only one.** Ask
    for the printed card early when sources disagree.
-   **Where tees are part of the fairway**, OSM maps only the distinct pads; a hole 15 %
    off is usually measured from the wrong pad. Place the tee on mown grass at the card
    distance and check it on the photo.
-   **A tee copied from another OSM kind needs a new id** in its `proposed/` file: an
    `edits.json` drop of the original id removes the copy as well.
-   **A desert course's driving range reads as scrub** to the bush rule; keep bushes off it.
-   **Check a lidar project's edge** (`intake.py laz` prints 0 points for tiles outside
    the world, and a tile's bounds end at the project's edge): here it ends inside the course.
-   **`npm install` rewrites `game/package-lock.json`** in this sandbox; don't commit it.
