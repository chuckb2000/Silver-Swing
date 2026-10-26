# Strawberry Farms Golf Club

Course id: `strawberry_farms` (data folder `data/strawberry_farms/`), branch `course/strawberry_farms`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data` (one of seven courses
from it).

-   **Map data:** OSM is nearly complete. The export also held Shady Canyon's boundary and three
    of its hole lines, which were dropped. The 10th green is mapped `golf=tee`; it is copied as
    a green. OSM's hole lines start at the White tees, while the Black boxes are mapped, and
    tagged `tee=black`, 50-70 m behind them. s06 now finds such named boxes behind a line's
    start.
-   **Elevation:** the 2023 USGS "California Gaps" lidar DEM.
-   **Trees:** the only point cloud, the 2011 USGS Orange County lidar, stops south of the
    reservoir (65 % of the course). The developer checked that NOAA has nothing newer. South of
    that line, holes 10-17, the trees come from the NAIP photo (new key `trees_ortho`), with a
    classifier and heights learnt from the lidar part.
-   **World:** 1,536 x 2,816 m, over the 2,048 m limit, approved by the developer.
-   **Tee:** the course plays from the tips, Black 6,700 yd. Every hole is within 3 % of the card
    once the tee is placed in its box, except hole 2 (−3.9 %); 6,605 yd built.
-   **Theme and logo:** the new `strawberry_farms` theme and a strawberry-flag logo.
-   **Tests:** counts are in the pull request.

## Facts

-   **Location:** 11 Strawberry Farms Road, Irvine, Orange County, California. The course is in
    a canyon along Sand Canyon Reservoir, below the Turtle Rock and Shady Canyon hills. `state`
    CA. Course id `strawberry_farms`.
-   **Design:** Jim Lipe (Golden Bear / Nicklaus associate), opened November 1997.
    -   The 10th tee was damaged by land movement in October 2023.
    -   Rebuilding it is part of a ~$5.3 M programme agreed in September 2024; its status is
        unknown (scouting notes).
-   **UTM zone:** 11N (EPSG:32611). World 1,536 x 2,816 m (x0 425072, y0 3721879). Theme
    `strawberry_farms`. Wind 2-10 mph (inland Orange County, about 8 km from the sea).
-   **Data:**
    -   **OSM:** the developer's export `export.1.geojson`.
    -   **DEM:** 2023 USGS Lidar DEM: California Gaps (`strawberry.farms.zip`), in feet.
    -   **Lidar:** 2011 USGS Lidar: Orange County (NOAA job J1476278), flown 24-28 December
        2011, class 1 only. It covers the north 65 % of the course.
    -   **Photo:** NAIP, two JPEGs (`34312.jpg` south, `432311.jpg` north).
    -   **In the release:** the DEM clip, the lidar clip and the photo, rebuilt by `release.json`.
-   **Water:** Sand Canyon Reservoir (w213565026) is a red penalty area. The other two
    `natural=water` features in `red_water_osm` don't reach play.
-   **Out of bounds:** the OSM boundary (way 213565038). The neighbouring Shady Canyon Golf Club
    (relation 19559718) and its hole lines 7-9 were dropped.
-   **Trees:** 15,407 in all, 3,774 of them inside the boundary. Median height 7.1 m, tallest
    38.7 m. 96 % have broad crowns: eucalyptus, sycamore, live oak and willow in the theme;
    Aleppo pine for the conifer class.
    -   **Lidar, north of the line:** class 1 crowns. Roofs were dropped by `roof_last_share`
        0.85, plus 2,258 crowns on OSM buildings.
    -   **Photo, south of the line:** 8,125 trees from the photo, most of them scenery on the
        hills and in the housing outside the boundary.
    -   **Water:** no tree stands in water (`trees_off_water`, developer: "don't put trees in the
        water"). 361 crowns on the reservoir's reedy south end and other water were dropped.
    -   **The classifier:** excess green above 0.09, darkness below 95 and texture above 4,
        chosen on the lidar part by F0.5. It scores F1 0.39 against the lidar canopy.
    -   **Heights:** 5.8-8.9 m by crown size.
    -   **Fidelity:** lower than lidar. The willow and sycamore woods south of the reservoir are
        well captured; isolated dark scrub can read as small trees.

## Scorecard

GolfPass, read 2026-10-24 by the scouting chat: all five tees per hole, men's par 71. Rows add
up to the printed totals. Unverified; there is no club card online. Stymie measures Blue 6,302,
and SCGA's current totals are 6,680 / 6,271 / 5,841 / 5,218 / 4,648.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 4 | 4 | 5 | 3 | 4 | 5 | 36 | 4 | 3 | 5 | 4 | 4 | 3 | 5 | 3 | 4 | 35 | 71 |
| HCP | 13 | 5 | 9 | 1 | 3 | 11 | 17 | 15 | 7 | | 12 | 14 | 2 | 6 | 8 | 18 | 10 | 16 | 4 | | |
| Black | 410 | 422 | 211 | 437 | 446 | 521 | 177 | 317 | 558 | 3499 | 369 | 180 | 630 | 432 | 343 | 166 | 501 | 177 | 403 | 3201 | 6700 |
| Blue | 390 | 377 | 179 | 420 | 429 | 497 | 151 | 295 | 514 | 3252 | 361 | 163 | 595 | 410 | 324 | 144 | 479 | 163 | 385 | 3024 | 6276 |
| Built (Black) | 400 | 406 | 206 | 425 | 445 | 515 | 174 | 310 | 559 | 3440 | 369 | 178 | 628 | 427 | 340 | 162 | 491 | 174 | 396 | 3165 | 6605 |

Ratings (men, GolfPass): Black 72.7/136, Blue 70.7/131 (SCGA's current Blue: 71.0/129). White,
Gold and Red are in `scorecard.csv` but not built.

## Default tee

Black, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Black.
2.  **World 1,536 x 2,816 m approved** (TPC Boston and Oregon Golf Club are 2,304 m). The
    alternative, 2,560 m, would have left about 37 m beyond each end of the course.
    `world.over_limit_approved`.
3.  **No newer point cloud:** NOAA's Data Access Viewer offers only the 2011 lidar here, and the
    2023 product is a DEM. Trees south of the 2011 survey therefore come from the photo.
4.  **No trees in the water** (`trees_off_water`).
5.  **New theme** from the developer's photos: `strawberry_farms`. **Logo:** a house-style SVG
    concept.
6.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`trees_ortho`** (s05, `pipeline/ortho_canopy.py`): canopy from the orthophoto on the cells
    the lidar doesn't cover.
    -   Classifier: excess green, darkness and texture, with thresholds chosen on the lidar part
        by F-beta (beta 0.5) against CHM > 3 m.
    -   Heights: the lidar's median per metre in from the canopy edge.
    -   Options: `close_m`, `canopy_m`, `min_patch_m2`, `beta` and `sample`.
    -   Without the key nothing changes.
-   **`trees_off_water`** (s05): `natural=water` joins the surfaces on which a crown top is
    dropped. Without the key nothing changes: Langston keeps the trees on Kingman Lake's islands.
-   **`world.over_limit_approved`** (intake check, s03): the developer's approval of a world over
    2,048 m, recorded as `"<who, date>"`. It turns the stop into a fact. Without it, the check
    still stops.
-   **s06:** a tee box whose OSM `tee=*` tag names the tee set may stand up to 150 m behind the
    line's start (within 35 m of the line run backwards). Before, s06 looked only 40 m around the
    start. Courses without such tags are unchanged.
-   **`strawberry_farms` theme:** `assets-src/palettes/strawberry_farms.json` and
    `assets-src/trees_strawberry_farms.py`.
    -   Broad crowns: eucalyptus (`trees_peninsula._eucalyptus`), sycamore, coast live oak and
        willow.
    -   Conifer: Aleppo pine.
    -   Ground: dry hills.
-   **Logo:** `assets-src/logo_concepts/strawberry_farms/concept1.src.svg`.

## Open items

1.  **The 10th tee:** it was damaged in 2023, and the status of the repair is unknown. The hole
    plays 369 yd from its Black box, exactly as on the card. Recommendation: keep it.
2.  **Photo trees south of the reservoir:** lower fidelity. Recommendation: look at holes 10-17
    in the game; any stand that is wrong can go in `not_trees_areas`.
3.  **Hole 2 (−3.9 %):** plays from its Black box. Recommendation: accept.
4.  **Scorecard unverified** (GolfPass; Stymie and SCGA differ slightly). Recommendation: keep it.

## Lessons

-   **Read OSM's `tee=*` colours:** here every back box was mapped and named, just not where the
    line starts. Seven holes went from 15-22 % short to passing once s06 looked behind the
    start.
-   **A `golf=tee` with the pin and the line's end on it is a green.** Check the "hole line ends
    N m from the nearest green" audit line first.
-   **When the lidar stops partway,** calibrate a photo classifier on the part it covers rather
    than leaving the rest bare.
