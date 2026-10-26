# Presidio Golf Course

Course id: `presidio` (data folder `data/presidio/`), branch `course/presidio`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data`, the seventh course from it. The course wasn't
scouted; the developer added the lidar.

-   **OSM:** complete (18 hole lines, greens, tees, fairways, bunkers and pins).
-   **Elevation:** bare earth gridded from the 2023 Bay Area lidar's ground points (the first order, ground only).
-   **Trees:** from a second order of the same survey with all classes. The survey has no vegetation classes, so trees
    come from class 1. High noise more than 60 m above the ground is dropped (new key `laz.max_height_m`).
-   **Water:** none in play.
-   **Tees:** played from the tips, Black 6,481 yd. The Black pads on 3 and 8 come from the lidar; the developer
    approved them. 16 holes are within 3 %; 2 (−7.7 %) and 13 (+7.1 %) are flags. 6,443 yd built.
-   **Theme and logo:** new `presidio` theme and a fort-gun logo. The card hole is the 4th.
-   **Tests:** counts are in the pull request.

## Facts

-   **Location:** 300 Finley Road, the Presidio of San Francisco, California, in the old army post's wooded hills
    above the Golden Gate. Part of the Golden Gate National Recreation Area. `state` CA. Course id `presidio`.
-   **Design:** opened 1895 as nine holes (San Francisco Golf and Country Club); 18 holes by 1910; enlarged by Fowler &
    Simpson, 1920 (club history page).
-   **UTM zone:** 10N (EPSG:32610). World 1,536 x 1,024 m (x0 546200, y0 4182317). Theme `presidio`.
    Wind 3-12 mph: a sheltered, wooded site between the bay band and the open coast.
-   **Data:**
    -   OSM: the developer's export `export.7.geojson`.
    -   Bare earth: the ground points (class 2) of the 2023 USGS Lidar: San Francisco Bay Area, NOAA job J1476298,
        gridded to 1 m by `intake.py dtm` (in git, 5 MB).
    -   Trees: the same survey, NOAA job J1476365 (`ca2023_sanfran_J1476365.zip`, all classes), flown 20 April 2023.
        It is clipped to the world + 100 m by `intake.py laz`, and `release.json` rebuilds the clip.
    -   No orthophoto.
-   **Out of bounds:** the OSM boundary (way 16650363). The driving range is out of bounds (standing default).
    Mountain Lake and the MacArthur Meadow wetlands are outside the course.
-   **Trees:** 6,536 from the lidar, 1,095 of them inside the boundary. Median height 19.1 m, tallest 60 m. 39 % are
    conifers by crown shape.
    -   The flight was in April, so the crowns aren't leaf-off; the stands are mostly evergreen.
    -   The theme draws Monterey pine for the conifers, and eucalyptus, Monterey cypress and coast live oak for the
        broad crowns.
    -   1,244 crowns on OSM buildings were dropped, and two on playing surfaces.
    -   One more was removed over the 17th's tee shot: a 24 m tree with an 11.6 m crown, 69 m out (`drop_trees`).

## Scorecard

The club's card (presidiogolf.com, PGC-Scorecard.pdf, March 2026), read 2026-10-25. Its back-nine stroke-index rows
are shifted one cell; they are read with hole 10 = 10, as GolfPass prints it. Black 11 is 419: GolfPass gives it, and
the card's printed totals need it.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 5 | 36 | 5 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 7 | 15 | 1 | 17 | 13 | 3 | 5 | 9 | 11 | | 10 | 4 | 2 | 12 | 14 | 16 | 8 | 6 | 18 | | |
| Black | 372 | 472 | 385 | 130 | 307 | 388 | 219 | 378 | 524 | 3175 | 501 | 419 | 453 | 180 | 344 | 171 | 382 | 350 | 506 | 3306 | 6481 |
| White | 349 | 435 | 365 | 118 | 298 | 361 | 184 | 356 | 493 | 2959 | 486 | 387 | 442 | 169 | 326 | 147 | 364 | 343 | 480 | 3144 | 6103 |
| Blue | 339 | 411 | 348 | 108 | 289 | 347 | 175 | 348 | 440 | 2805 | 469 | 373 | 368 | 156 | 304 | 133 | 338 | 335 | 465 | 2941 | 5746 |
| Built (Black) | 371 | 436 | 385 | 131 | 304 | 388 | 219 | 379 | 522 | 3135 | 505 | 422 | 442 | 193 | 346 | 170 | 382 | 341 | 507 | 3308 | 6443 |

Rating: Black 72.5/136. White, Blue and Red are in `scorecard.csv` but not built.

## Default tee

Black, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Black.
2.  **Black tee pads on 3 and 8 kept** ("keep the pads"), from `proposed/tees_black.geojson`. Both are raised flat
    pads that `propose_tees.py` found in the bare earth. They measure 385 yd (card 385) and 379 yd (card 378).
3.  **Lidar:** the developer ordered the survey again with all classes, after the vegetation-only order failed (the
    survey has none).
4.  **New theme** from the developer's photos: `presidio`. **Logo:** a house-style SVG concept.
5.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`laz.max_height_m`** (s00): returns more than this far above the bare earth are skipped when the canopy is
    made. It removes high noise left in class 1: here, returns 110 m over the eucalyptus had made 80-113 m "trees".
    Without the key nothing changes.
-   **s05:** the canopy raster is found by listing the build folder instead of `exists()`, so the step cache reruns the
    tree step when lidar arrives after a first build (here it had kept the OSM fallback).
-   **`presidio` theme:**
    -   `assets-src/palettes/presidio.json` and `assets-src/trees_presidio.py`;
    -   Monterey pine (`trees_monterey.pine`) for the conifers;
    -   eucalyptus, Monterey cypress and coast live oak for the broad crowns.
-   **Logo:** `assets-src/logo_concepts/presidio/concept1.src.svg`, a fort gun with a golf ball.

## Open items

1.  **Hole 2 (−7.7 %):** it plays 435 yd against 472 from the mapped tee. No box or pad behind it.
    Recommendation: accept.
2.  **Hole 13 (+7.1 %):** it plays 193 yd against 180. No forward box is mapped. Recommendation: accept.
3.  **No photo:** the trees and pads couldn't be checked against imagery. Recommendation: add a NAIP export if
    anything looks off in the game.

## Lessons

-   **Check a survey's classes before ordering vegetation:** many USGS surveys keep only 1 (unclassified), 2 and noise
    classes, and a vegetation-only order fails after processing. Order all classes and take trees from class 1.
-   **Class 1 can hold high noise:** look at the tallest crowns. A smooth height tail that ends near 55 m, with a few
    returns far above it, is noise; `laz.max_height_m` drops them.
