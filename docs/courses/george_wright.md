# George Wright Golf Course

Course id: `george_wright` (data folder `data/george_wright/`), branch `course/george_wright`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data`, one of seven courses
from it. The course wasn't scouted; it was identified from the lidar order's footprint.

-   **Map data:** OSM is complete, with no pins.
-   **Elevation and trees:** bare earth is gridded from the 2021 Massachusetts lidar's ground
    points. Trees come from the same survey's vegetation classes (3-5).
-   **Out of bounds:** the 11th green crossed the OSM boundary by 34 m2, so the boundary is grown
    3 m around that green.
-   **Tee:** Blue, already the tips (6,506 yd). Hole 8's tee box is tagged to the hole.
-   **Theme and logo:** a new autumn `george_wright` theme. The logo is a golf ball with
    baseball stitching on an oak leaf, for George Wright the ballplayer.
-   **Yardage:** every hole is within 3 % of the card after tee placement, except 5 (−3.3 %)
    and 8 (−4.3 %). Built total: 6,402 yd.
-   **Tests:** counts are in the pull request.

## Facts

-   **Location:** 420 West Street, Hyde Park, Boston, Suffolk County, Massachusetts. A City of
    Boston course on rocky, wooded ground next to the Stony Brook Reservation. `state` MA.
    Course id `george_wright`.
-   **Design:** Donald Ross. Built by the Works Progress Administration and opened 23 April 1938
    (City of Boston). Named for George Wright, the baseball pioneer who brought golf to Boston.
-   **UTM zone:** 19N (EPSG:32619). World 1,280 x 1,792 m (x0 323420, y0 4680796). Theme
    `george_wright`. Wind 1-9 mph (inland New England).
-   **Data:**
    -   OSM: the developer's export `export.5.geojson`.
    -   Lidar: 2021 USGS Lidar: Central Eastern Massachusetts (NOAA job J1476274), flown
        20 March 2021, leaf-off, vegetation classes 3-5.
    -   Bare earth: the lidar's ground points gridded to 1 m (`intake.py dtm`; in git, 7 MB).
    -   Photo: NAIP, one JPEG (`12.jpg`).
    -   The lidar clip and the photo are rebuilt from the release by `release.json`.
-   **Water:** every penalty area is red: ten `golf=water_hazard` areas (tagged red) and four
    ponds mapped `natural=water` in the woods west of 4-7 and north of 3.
-   **Out of bounds:** the OSM boundary (way 29830747), grown around the 11th green
    (`proposed/boundary.geojson`).
-   **Trees:** 23,833 from the lidar, 4,617 inside the boundary. Median height 16.5 m, tallest
    31.8 m. 20 % are conifers (white pine and hemlock), judged by crown shape and the leaf-off
    flight. One 49.8 m "conifer" among the apartment blocks at the north-west corner was
    removed; it is a structure (`drop_trees`).

## Scorecard

Stymie, read 2026-10-25: Blue, White, Gold and Red per hole, par 70, with stroke index.
OpenGolfAPI's Blue row is the same. The card is unverified.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 4 | 35 | 4 | 4 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 35 | 70 |
| HCP | 11 | 13 | 5 | 17 | 3 | 7 | 9 | 15 | 1 | | 2 | 10 | 6 | 8 | 16 | 4 | 14 | 18 | 12 | | |
| Blue | 394 | 364 | 527 | 159 | 426 | 384 | 433 | 167 | 449 | 3303 | 462 | 350 | 412 | 386 | 189 | 507 | 346 | 167 | 384 | 3203 | 6506 |
| White | 379 | 329 | 504 | 149 | 413 | 367 | 422 | 155 | 438 | 3156 | 442 | 345 | 402 | 369 | 174 | 500 | 325 | 160 | 364 | 3081 | 6237 |
| Built (Blue) | 391 | 355 | 524 | 158 | 412 | 374 | 444 | 160 | 441 | 3259 | 450 | 341 | 410 | 376 | 184 | 508 | 337 | 162 | 375 | 3143 | 6402 |

Rating: Blue 71.9/133 (Stymie; Wikipedia agrees). White, Gold and Red are in `scorecard.csv`
but not built.

## Default tee

Blue, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Blue.
2.  **New theme** for each course, from the developer's photos: `george_wright`, in autumn.
    The first version was all red; it was retoned to a mix of red maple, green oak, sugar maple
    and birch, and russet oak.
3.  **Logo:** a house-style SVG concept.
4.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`george_wright` theme:** `assets-src/palettes/george_wright.json` and
    `assets-src/trees_george_wright.py`.
    -   Conifers: white pine and hemlock.
    -   Broad crowns, autumn: red maple or green oak, sugar maple or birch, and green or russet
        oak.
-   **Logo:** `assets-src/logo_concepts/george_wright/concept1.src.svg`.
-   **Pipeline:** the release's shared changes are listed in the pull request. This course uses
    `intake.py dtm` and s06's centre pin from the green.

## Open items

1.  **Hole 5 (−3.3 %):** it shares a large tee complex (w671002702, 913 m2) with hole 7, which
    s06 gives to 7. Measured from the complex's centre, 5 would be 431 yd (+1.2 %).
    Recommendation: accept, or cut the box in two as at Cypress Point.
2.  **Hole 8 (−4.3 %):** plays from its tagged box. The pads `propose_tees.py` found were not
    plausible (east of the green). Recommendation: accept.
3.  **Hole 4:** plays from the line's start. No Blue box is mapped; it measures within 1 % of
    the card.
4.  **Scorecard unverified** (Stymie). Recommendation: keep it.

## Lessons

-   **Courses can be found from the lidar order:** the order's footprint centre named the
    course when there was no scouting brief.
-   **A green that crosses the OSM boundary would be out of bounds:** grow the boundary around
    it rather than editing OSM's line.
-   **A 50 m "conifer" in a town is a building or mast:** check the tallest crowns.
