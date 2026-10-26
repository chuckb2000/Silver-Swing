# Eastward Ho! Country Club

Course id: `eastward_ho` (data folder `data/eastward_ho/`), branch `course/eastward_ho`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data` (one of seven courses
from it).

-   **OSM:** complete, but with no pins. Two stray features were dropped: the Cape Cod National
    boundary and a second hole 12 line.
-   **Elevation and trees:** bare earth comes from the 2021 Massachusetts lidar's ground points.
    Trees come from the same survey's vegetation classes. The survey (April 2021) predates the
    2024 Kyle Franz restoration.
-   **Water:** Pleasant Bay, Crows Pond and the pond by the 5th are red.
-   **Tees:** the course plays from the tips, Championship 6,728 yd (developer, 2026-10-25).
    -   The 18th's new back box, mapped in OSM 2024-25 and 80 m behind the line's start, is
        tagged to the hole. It measures 531 yd against the card's 546.
    -   Hole 6 can't reach its Championship 510. It plays 454, the card's Black, and the
        developer accepted that.
    -   Elsewhere the Championship boxes that aren't mapped play from the Black ones. Holes 3,
        7, 11, 12, 13 and 16 are flags of 4-7 %.
-   **Totals:** 6,514 yd built. The new `eastward_ho` theme; quahog-shell logo. Test counts are
    in the pull request.

## Facts

-   **Location:** Fox Hill Road, Chatham, Barnstable County, Massachusetts, on a peninsula
    between Pleasant Bay and Crows Pond. `state` MA. Course id `eastward_ho`.
-   **Design:** Herbert Fowler, opened 3 July 1922 as Chatham Country Club.
    -   Keith Foster (2004, 2007): 13 bunkers and 13 greens restored, all tees and bunkers
        renovated, about 20 acres of native grasses.
    -   Kevin Hargrave (2004, 2007, 2014).
    -   Kyle Franz from 2019, with a full restoration in 2024 (scouting notes).
-   **UTM zone:** 19N (EPSG:32619). World 2,048 x 1,536 m (x0 417261, y0 4617930). Theme
    `eastward_ho`. Wind 2-12 mph (bays).
-   **Data:**
    -   OSM: the developer's export `export.2.geojson`.
    -   Lidar: 2021 USGS Lidar: Central Eastern Massachusetts (NOAA job J1476268). Flown 4-9
        April 2021, leaf-off, vegetation classes 3-5.
    -   Bare earth: the lidar's ground points gridded to 1 m (`intake.py dtm`; in git, 7 MB).
    -   Photo: NAIP, two JPEGs (`4323.jpg` west, `2343.jpg` east).
    -   The lidar clip and photo are rebuilt from the release by `release.json`.
-   **Water:** Pleasant Bay (w83116684), Crows Pond (w82282412) and the pond by the 5th
    (w82421594), all mapped `natural=water`, plus one `golf=water_hazard`. All are red
    wherever they lie, including outside the boundary.
-   **Out of bounds:** the OSM boundary (way 29848550).
-   **Trees:** 8,760 from the lidar, 1,241 of them inside the boundary. Median height 12.9 m,
    tallest 24.6 m. 36 % are conifers (pitch pine and red cedar), judged by crown shape and the
    leaf-off flight.

## Scorecard

GolfPass, read 2026-10-24 by the scouting chat. It is the current card after the 2024
restoration (new back tees on 15 and 18), with seven tees per hole and men's par 71. Its
back-nine stroke-index row is shifted one cell; it was read with hole 10 = 16, which matches
OpenGolfAPI. The card is unverified, and the older card on Stymie (Black 6,437) differs.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 4 | 35 | 3 | 5 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 36 | 71 |
| HCP | 7 | 9 | 11 | 17 | 3 | 1 | 15 | 13 | 5 | | 16 | 2 | 8 | 12 | 14 | 18 | 4 | 10 | 6 | | |
| Championship | 387 | 350 | 348 | 182 | 525 | 510 | 181 | 364 | 396 | 3243 | 201 | 507 | 349 | 354 | 371 | 187 | 433 | 537 | 546 | 3485 | 6728 |
| Black | 387 | 350 | 326 | 182 | 525 | 455 | 181 | 364 | 396 | 3166 | 201 | 507 | 349 | 354 | 371 | 187 | 407 | 537 | 530 | 3443 | 6609 |
| Blue | 380 | 334 | 310 | 165 | 492 | 415 | 168 | 325 | 381 | 2970 | 190 | 485 | 337 | 331 | 369 | 145 | 380 | 516 | 504 | 3257 | 6227 |
| Built (Championship) | 379 | 352 | 324 | 178 | 518 | 454 | 173 | 364 | 392 | 3134 | 196 | 484 | 331 | 332 | 371 | 185 | 411 | 534 | 536 | 3380 | 6514 |

Ratings (men): Championship 73.3/149, Black 73.0/142, Blue 70.8/137. The other sets are in
`scorecard.csv` but not built.

## Default tee

Championship, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Championship.
2.  **Hole 6 accepted at −10.9 %:** it plays from the farthest-back mapped tee, 454 yd against
    510 (the card's Black is 455). Recorded in `checks.json` `yardage.max`.
3.  **New theme** from the developer's photos: `eastward_ho`. Its rough was retoned twice
    because it read too tan and orange.
4.  **Logo:** a house-style SVG concept, a quahog shell (a seal was already taken).
5.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`eastward_ho` theme:** `assets-src/palettes/eastward_ho.json` and `assets-src/trees_eastward_ho.py`.
    -   Conifers: pitch pine and cedar.
    -   Broad crowns: oak, bronze oak and bayberry.
    -   Ground: copper heath in the rough band beyond the mown edge (`rough_band_m` 5).
-   **Logo:** `assets-src/logo_concepts/eastward_ho/concept1.src.svg`.
-   **Pipeline:** the release's shared changes are listed in the pull request. This course uses
    `intake.py dtm`, s09's skip for a green outside the world (a neighbour's green in the
    export's margin) and s06's centre pin from the green.

## Open items

1.  **Championship tees not in OSM:**
    -   On 3, 7, 11, 12, 13 and 16 the line's start or the Black box is used: flags of −4.3 to
        −7.0 %.
    -   On 6, the 510 tee is 55 yd behind anything mapped. A box 30 m west across the 8th green
        complex measures 537 yd, but it belongs to another hole as far as the map shows.

    Recommendation: accept, or trace the 2024 tees when a newer photo is available.
2.  **Trees after the 2024 restoration:** the lidar is from 2021. The NAIP photo's year isn't
    stated by the service, so it can't show the clearing either. Recommendation: when a 2025
    photo is available, set `trees_need_ortho` to drop the removed trees.
3.  **Par:** OSM gives 11 as a par 4; the card has it as a par 5. Built from the card.
4.  **Pins:** OSM's pins on 8, 9 and 12 stand 2.5-3.1 m from their greens' edges, nearer than
    the game's 10 ft for every hole location. Those holes' centre pins are their greens' centres
    (s06).
5.  **Scorecard unverified** (GolfPass). Recommendation: keep it.

## Lessons

-   **Swapped photo tiles:** the two NAIP tiles were first mosaicked swapped. Check a photo
    mosaic against the DEM (water edges, roads) before tracing anything from it.
-   **New back tees sit behind the line's start:** look behind the start for mapped boxes (s06
    now does this for boxes whose `tee=*` names the set), or tag them to the hole.
