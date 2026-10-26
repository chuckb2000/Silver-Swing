# Newport Country Club

Course id: `newport` (data folder `data/newport/`), branch `course/newport`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data`, one of seven courses
from that release.

-   **Map data:** OSM is complete, except that it has no pins. The boundary is two parts, one on
    each side of Harrison Avenue. The parts are joined, and the road between them stays out of
    bounds.
-   **Elevation and trees:** elevation is the 2022 Rhode Island lidar DEM. The open sea, which
    has no data in it, is filled (`intake.py raster --fill-sea`). Trees come from the 2022
    statewide lidar's class-1 returns, with roofs dropped.
-   **Tee:** the tips, Black 7,109 yd (developer, 2026-10-25).
-   **Tee boxes:** two Black boxes that OSM doesn't map, on 6 and 15, come from lidar pads seen
    on the photo. The developer approved them.
-   **Yardage:** hole 11 can't reach its Black length, because no Black box is mapped or
    visible. It plays 294 yd against 321 (−8.4 %); the developer accepted that. Every other
    hole is within 3.1 % of the card. Built total: 6,994 yd.
-   **Theme and logo:** the new `newport` theme; logo of a hickory club and a gutty ball.
-   **Tests:** the counts are in the pull request.

## Facts

-   **Location:** Harrison Avenue and Ocean Avenue, Newport, Newport County, Rhode Island. The
    course is on the open ground above Rhode Island Sound. `state` RI. Course id `newport`.
-   **Design:** a nine-hole course by William F. Davis (1894), extended to 18 holes by 1897-99.
    A. W. Tillinghast re-routed it in 1921-23, adding seven holes west of Harrison Avenue. Ron
    Forse has restored it since 1995. Clubhouse by Whitney Warren (1895). Host of the first U.S.
    Open and U.S. Amateur (1895).
-   **UTM zone:** 19N (EPSG:32619). World 1,280 x 2,048 m (x0 303307, y0 4591424). Theme
    `newport`. Wind 3-14 mph (open coast).
-   **Data:**
    -   **OSM:** the developer's Overpass export `export.4.geojson`.
    -   **DEM:** 2022 USGS Lidar DEM: RI Statewide (`newport.cc.zip`), 1 ft. It is clipped, and
        the open sea is filled.
    -   **Lidar:** 2022 USGS Lidar: RI Statewide (NOAA job J1476270), flown 29 March 2022,
        leaf-off, class 1.
    -   **Photo:** NAIP, two JPEGs (`123.jpg` south, `1212.jpg` north).
    -   **In the release:** the DEM clip, the lidar clip and the photo, rebuilt by `release.json`.
-   **Water:** two `golf=water_hazard` ponds and the sea (from OSM's coastline, beyond Ocean
    Drive). All are red.
-   **Out of bounds:** the OSM boundary (relation 13922079). It has two parts, 12 m apart across
    Harrison Avenue, joined with `join_boundary_parts`; the road between them is out of
    bounds. Five clubhouse buildings mapped `golf=clubhouse` are copied as buildings.
-   **Trees:** 13,660 from the lidar, 739 of them inside the boundary. Median height 8.8 m,
    tallest 29 m. 31 % are conifers, judged by crown shape and the leaf-off flight. Dropped:
    167 roof crowns (`roof_last_share` 0.85) and 367 on OSM buildings.

## Scorecard

GolfPass, read 2026-10-24 by the scouting chat. It lists seven sets per hole, par 72, and men's
and women's stroke indexes. It is unverified; the club publishes no card. GolfPass's tee table
prints the Black as 7,083 yd at par 70 (the championship set-up). Its per-hole rows add to
7,109 at par 72, and those rows are used here.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 4 | 3 | 4 | 4 | 5 | 3 | 4 | 36 | 5 | 4 | 5 | 3 | 3 | 4 | 4 | 4 | 4 | 36 | 72 |
| HCP | 15 | 7 | 17 | 5 | 1 | 11 | 9 | 13 | 3 | | 10 | 18 | 12 | 16 | 8 | 6 | 14 | 2 | 4 | | |
| Black | 480 | 410 | 347 | 242 | 451 | 446 | 596 | 192 | 464 | 3628 | 572 | 321 | 468 | 188 | 209 | 475 | 362 | 466 | 420 | 3481 | 7109 |
| Red | 480 | 366 | 324 | 222 | 420 | 392 | 552 | 180 | 427 | 3363 | 530 | 295 | 468 | 148 | 193 | 401 | 362 | 429 | 388 | 3214 | 6577 |
| White | 442 | 366 | 306 | 209 | 410 | 361 | 514 | 166 | 408 | 3182 | 518 | 281 | 431 | 133 | 178 | 395 | 321 | 395 | 370 | 3022 | 6204 |
| Blue | 429 | 341 | 222 | 180 | 348 | 286 | 418 | 156 | 370 | 2750 | 476 | 241 | 390 | 122 | 159 | 383 | 311 | 383 | 291 | 2756 | 5506 |
| Built (Black) | 480 | 410 | 344 | 239 | 444 | 436 | 586 | 189 | 464 | 3592 | 574 | 294 | 456 | 183 | 202 | 465 | 361 | 456 | 411 | 3402 | 6994 |

Ratings (men): Black 75.5/135, Red 72.5/128, White 70.7/122, Blue 67.4/118. The combo sets are
in `scorecard.csv` (`black_red`, `red_white`, `white_blue`). Only the Black set is built.

## Default tee

Black, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").
Before that the default was White, the set closest to 6,300 yd (Newport's Blue is its forward
set).

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Black.
2.  **Hole 11 accepted at −8.4 %:** it plays from the farthest-back mapped box (294 yd against
    321); `checks.json` `yardage.max`.
3.  **Black tees on 6 and 15 approved:** `proposed/tees_black.geojson`. Both are raised flat pads
    found in the lidar DEM by `propose_tees.py` and seen as mown pads on the NAIP photo.
    -   6: 17 m behind the line's start; plays 436 yd (card 446).
    -   15: the round pad 25 m behind; plays 466 yd (card 475).
    -   Without them, 6 and 15 played 417 and 443 yd.
4.  **New theme** for each course, from the developer's photos: `newport`. **Logo:** a
    house-style SVG concept.
5.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`newport` theme:** `assets-src/palettes/newport.json` and `assets-src/trees_newport.py`.
    -   Conifers: Japanese black pine and spruce.
    -   Broad crowns: maple, oak and copper beech.
    -   Native fescue in a softened olive.
-   **Logo:** `assets-src/logo_concepts/newport/concept1.src.svg`, a hickory club and a gutty
    ball over waves.
-   **Pipeline:** the release's shared changes are listed in the pull request. This course uses
    `intake.py raster --fill-sea`, `propose_sea.py` and s06's centre pin from the green.

## Open items

1.  **Hole 11 Black tee:** not mapped and not visible on the photo. Accepted at −8.4 %.
2.  **Hole 14 (−3.1 %) and hole 8:** play from the line's start; no Black box is mapped. Both
    are within or near the pass line. Recommendation: accept.
3.  **The 11th green** (258 m2) is small: its tilt is capped at 2 % with no random undulations
    (`green_tilt`), so the game finds three hole locations on it (`pins.test.ts`).
4.  **Par:** the championship set-up is par 70, but the card's per-hole par is 72. Built at 72.
    Recommendation: keep 72.
5.  **Scorecard unverified** (GolfPass). Recommendation: keep it.

## Lessons

-   **A DEM with no data offshore:** fill the sea regions that touch the edge from their rim
    (`intake.py raster --fill-sea`). Otherwise s00 stops on the nodata.
-   **Missing back tees:** look for raised pads in the lidar (`propose_tees.py`) and confirm them
    on the photo. The two found here were exactly where the card needed them.
