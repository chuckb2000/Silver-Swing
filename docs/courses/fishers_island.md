# Fishers Island Club

Course id: `fishers_island` (data folder `data/fishers_island/`), branch `course/fishers_island`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data` (one of seven courses
from that release). OSM was complete: 18 hole lines, greens, tees, fairways and bunkers, but no
pins. Bare earth was gridded from the 2014 post-Sandy lidar's ground points (the release has no
DEM). The trees come from the same lidar's class-1 returns, with roofs dropped by
`roof_last_share`. The sea comes from OSM's coastline (`pipeline/propose_sea.py`) and is red.
The course plays from the tips: Black, 6,597 yd on Stymie's card (developer, 2026-10-25). It
uses the new `fishers_island` theme and a nun-buoy logo. Every hole is within 3 % of the card
once the tee is placed inside its box (6,536 yd built). Test counts are in the pull request.

## Facts

-   **Location:** the east end of Fishers Island, Town of Southold, Suffolk County, New York, in
    Block Island Sound. Private. `state` NY. Course id `fishers_island`.
-   **Design:** Seth Raynor (1925-26), completed by Charles Banks after Raynor's death; opened
    1926. Gil Hanse is the consulting architect (scouting notes).
-   **UTM zone:** 19N (EPSG:32619). World 2,048 x 1,792 m (x0 252723, y0 4573662). Theme
    `fishers_island`. Wind 3-14 mph (open coast: an exposed island).
-   **Data:**
    -   OSM: the developer's Overpass export `export.3.geojson`, through `intake.py osm`.
    -   Lidar: 2014 USGS CMGP Lidar: Post Sandy (Long Island), NOAA job J1476275 (`fishers.zip`).
        Flown 7 April 2014, leaf-off, class 1 only. NAD83(2011) / Connecticut, metres.
    -   Bare earth: the lidar's ground points gridded to 1 m by `intake.py dtm`; in git (5 MB).
    -   Photo: New York State orthoimagery ("Latest"), two JPEGs placed by their request boxes
        (`12345.jpg`, `1234.jpg`; EPSG:26919).
    -   The lidar clip and the photo mosaic are rebuilt from the release by `release.json`.
-   **Water:** the sea, a red penalty area everywhere it touches play (`proposed/sea.geojson`
    from the coastline ways). Every other penalty area is also red (standing default): the
    seven `golf=water_hazard` ponds and the three `natural=water` ponds by 5, 15 and 16-17.
    Out of bounds is the OSM boundary (way 191740591).
-   **Trees:** 9,894 from the lidar, 1,081 of them inside the boundary. Median height 9.5 m,
    tallest 22.5 m. 47 % are conifers (red cedar and pitch pine) by crown shape and the leaf-off
    flight.
    -   Dropped: 171 roof crowns (`roof_last_share` 0.85), 367 on OSM buildings, and 13 on
        greens, tees and bunkers or more than 2 m inside a fairway.
    -   Removed: one 48 m "tree" in the inlet that hole 14 plays across. It is a stray return
        over open water (`drop_trees`).

## Scorecard

Stymie's card (stymie.golf, USGA course ratings), read 2026-10-25, gives Black and Blue rows.
OpenGolfAPI gives pars, stroke index and an unlabelled row equal to Stymie's Blue. The Fried
Egg's list is the `back` column. All three are unverified; the club is private and publishes no
card.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 4 | 3 | 5 | 4 | 5 | 4 | 36 | 4 | 3 | 4 | 4 | 4 | 5 | 3 | 4 | 5 | 36 | 72 |
| HCP | 8 | 14 | 10 | 2 | 6 | 12 | 4 | 18 | 16 | | 3 | 13 | 11 | 5 | 1 | 9 | 17 | 7 | 15 | | |
| Black | 398 | 183 | 325 | 417 | 225 | 551 | 374 | 463 | 361 | 3297 | 396 | 163 | 383 | 397 | 418 | 538 | 145 | 417 | 443 | 3300 | 6597 |
| Blue | 391 | 181 | 325 | 400 | 205 | 517 | 365 | 463 | 360 | 3207 | 396 | 163 | 383 | 396 | 418 | 537 | 144 | 417 | 442 | 3296 | 6503 |
| Back (Fried Egg) | 396 | 184 | 335 | 412 | 229 | 555 | 363 | 465 | 364 | 3303 | 401 | 164 | 389 | 400 | 425 | 541 | 146 | 415 | 452 | 3333 | 6636 |
| Built (Black) | 390 | 178 | 317 | 413 | 226 | 552 | 372 | 464 | 364 | 3276 | 390 | 159 | 375 | 393 | 420 | 533 | 145 | 414 | 431 | 3260 | 6536 |

Ratings (Stymie): Black 72.8/144, Blue 72.4/142. Blue and Back are in `scorecard.csv` but not
built.

## Default tee

Black, the tips (developer, 2026-10-25: "for all of these courses lets play from the tips").

## The developer's calls (2026-10-25)

1.  **Play from the tips:** Black.
2.  **New theme** for each course, from the developer's photos: `fishers_island`.
3.  **Logo:** a house-style SVG concept, not a round badge (the developer turned down the first
    badge drafts).
4.  The standing defaults (COURSE_BUILD 4.1): every penalty area red, the OSM boundary is out of
    bounds, trees from lidar, the card hole chosen by the course chat.

## New pipeline keys and theme

-   **`fishers_island` theme:**
    -   `assets-src/palettes/fishers_island.json`: tawny fescue and grey-green links turf.
    -   `assets-src/trees_fishers_island.py`: eastern red cedar and pitch pine for the conifer
        class; wind-pruned oak and bayberry for the broad-crown class.
    -   Built with `build_assets.py --theme fishers_island`.
-   **Logo:** `assets-src/logo_concepts/fishers_island/concept1.src.svg`, a red nun buoy with a
    gull.
-   **Pipeline:** the shared changes for this release are listed in the pull request. This course
    uses `intake.py dtm`, `propose_sea.py` and s06's centre pin from the green.

## Open items

1.  **Par:** OpenGolfAPI gives par 72 (8 and 18 par 5s), but Stymie and The Fried Egg give
    par 70 with both as par 4s. OSM has 8 as a par 5 and 18 as a par 4. Built at 72.
    Recommendation: keep 72 unless the developer has a club card.
2.  **Scorecard unverified** (third-party only). Recommendation: keep it.
3.  **No pins in OSM:** each centre pin is its green's centre (the game adds the others).

## Lessons

-   A release without a DEM can still be built: `intake.py dtm` grids the lidar's ground points,
    and the result is small enough for git.
-   Island courses need the sea built from the coastline: OSM maps the Sound only as
    `natural=coastline`.
-   A tall "tree" with a tiny crown over open water is a stray return. Check the tallest crowns
    against the photo before accepting the tree list.
