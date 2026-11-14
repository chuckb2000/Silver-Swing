# The Old Course, St Andrews

Course id: `st_andrews_old` (data folder `data/st_andrews_old/`), branch `course/st_andrews_old`.

## Build summary

Built by a course chat on 2026-11-13, the first course outside North America with
Lofoten Links. OSM maps the whole of the St Andrews Links, the Old Course with its 18
named hole lines, every green (the seven double greens as one polygon each, with a
pin for each hole), 110 bunkers, the Swilcan Burn and the walls; the export also holds
the New, Jubilee, Eden, Strathtyrum and Balgove courses, whose hole lines and course
polygons are dropped (`make_edits.py`, as at the Bandon resort). Elevation and the
canopy model are the Scottish Public Sector LiDAR Phase 5 (50 cm DTM and DSM, Open
Government Licence) through the GitHub Actions workflow. The double greens are cut
in half per hole; the road behind the 17th and Grannie Clark's Wynd are integral
objects (PR #133); the wall behind the 17th is a thin building. New theme
`old_course`; the whins are gorse (surface 17) from OSM's mapped scrub; the logo is
the stone footbridge over the burn. Black tees: 17 holes within 3 % of the card after
the tee moves, hole 17 −3.9 % (a flag), 6,548 yd against 6,670.

## Facts

-   **Location:** the Links, St Andrews, Fife, Scotland, between the town (the R&A
    clubhouse behind the 1st tee and 18th green), the Old Course Hotel (17), the
    West Sands and the Eden estuary. `state` EU (the course select's europe button,
    PR #128). Course id `st_andrews_old`.
-   **Design:** no designer: golf on the links since the 15th century; the double
    greens from Allan Robertson's time (1840s-50s), the 1st and 18th greens by Old
    Tom Morris (from 1865) (St Andrews Links Trust, Wikipedia; unverified).
-   **UTM zone:** 30 N (EPSG:32630). World 1,792 x 2,048 m, origin (510582,
    6244229): the Old Course polygon's box (1,445 x 2,007 m), 174 m of scenery east
    and west and 20 m north and south (the 2,048 m limit). Theme `old_course` (new).
    Wind 6-16 mph (developer).
-   **Data** (GitHub release `data-st_andrews_old`; `make fetch NAME=st_andrews_old`):
    -   OSM: the workflow's Overpass export and a coastline query, merged by
        `intake.py osm` into `raw/overpass.geojson` (committed).
    -   Elevation and canopy: Scottish Public Sector LiDAR Phase 5, 50 cm DTM and
        DSM, tiles NO41NE and NO51NW (EPSG:27700), from the srsp-open-data bucket
        (registry.opendata.aws/scottish-lidar); mosaicked and clipped by
        `data/st_andrews_old/mosaic_lidar.py`. Fife is also covered by phases 1, 2
        and 4; the bucket has no "composite" folder.
    -   Photo: none open (Scotland's aerial imagery isn't open data).
    -   Card: the St Andrews Links Old Course scorecard 2026 (PDF from the
        developer) and the standrews.com hole pages (developer's screenshots).
-   **Water:** the Swilcan Burn (five OSM polygons) and the North Sea and the Eden
    estuary (one feature, `sea`, from the coastline by `pipeline/propose_sea.py`, a
    penalty area wherever it lies), all red. The card marks parts of the burn
    yellow; kept red (standing default). Out of bounds: the line is the Old, New and
    Jubilee course polygons joined (`make_boundary.py`), with the road and path
    behind the 17th green taken in up to the wall: out of bounds by the town, the
    Old Course Hotel, the wall and fence right of 14-16 and the Links' outer edge,
    as the card's local rule 1; a shot onto the New or Jubilee is in play.
-   **Integral objects** (card, local rule 4): Grannie Clark's Wynd (OSM
    w382065281) and the road and path behind the 17th green (w30712459, w1053387973)
    with the wall: no free relief, the lie reads "road". The 17th's area runs
    beside the green (within 75 m of it): the two black and yellow posts that start
    it on the course aren't in OSM.
-   **Trees and whins:** 1,830 trees from the DSM - DTM canopy model, 5 inside the
    boundary (the links are treeless; the rest are in the town and the hotel
    grounds). 7,286 gorse bushes over the mapped scrub (OSM natural=scrub and heath,
    1.5 ha inside the boundary), on the gorse lie.

## Scorecard

St Andrews Links Old Course scorecard 2026 (developer's PDF, read 2026-11-13).
Pars are men's (the card prints 4/5 for women on 2, 4, 13 and 17).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 36 | 4 | 3 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 36 | 72 |
| SI | 10 | 6 | 16 | 8 | 2 | 12 | 4 | 14 | 18 | | 15 | 7 | 3 | 11 | 1 | 9 | 13 | 5 | 17 | | |
| Black | 367 | 400 | 366 | 413 | 519 | 368 | 359 | 170 | 349 | 3311 | 341 | 173 | 309 | 414 | 527 | 415 | 377 | 449 | 354 | 3359 | 6670 |
| Blue | 355 | 385 | 344 | 402 | 509 | 358 | 347 | 157 | 290 | 3147 | 310 | 164 | 299 | 391 | 514 | 391 | 346 | 427 | 366 | 3208 | 6355 |
| Green | 346 | 368 | 322 | 397 | 462 | 324 | 340 | 143 | 263 | 2965 | 296 | 154 | 299 | 379 | 492 | 369 | 327 | 417 | 346 | 3079 | 6044 |
| Built | 358 | 392 | 367 | 405 | 504 | 361 | 350 | 166 | 348 | | 341 | 169 | 301 | 404 | 514 | 407 | 370 | 431 | 361 | | 6548 |

Men's ratings/slopes: Black 73.4/136, Blue 71.8/133, Green 70.2/127 (women's Green
76.5/140, par 76). Blue and Green are in `scorecard.csv`, not built.

## Default tee

Black, the longest set on the 2026 card (COURSE_BUILD.md 4.1).

## The developer's calls

All 2026-11-13.

-   Elevation from the Scottish lidar through the workflow; the Swilcan Burn and the
    Eden estuary penalty areas; out of bounds by the town and the hotel.
-   The 2026 card (supplied); wind 6-16 mph.
-   A theme of its own (`old_course`); logo option a, the bridge over the burn (no
    name on it: the card lists "Swilcan Bridge" as a trademark of St Andrews Links).
-   Integral objects (design chat, PR #133): the road and path behind 17 and Grannie
    Clark's Wynd; the wall behind 17 a thin building.
-   World 1,792 x 2,048 m.

Course chat's calls (listed for the developer):

-   The OB line: the Old, New and Jubilee polygons joined (card local rule 1).
-   The double greens cut on the perpendicular bisector of the two holes' OSM pins.
-   The 8th from its large teeing ground (w180275548), not the box OSM starts the
    line on (the Open tee, +10.6 %).
-   The Road Hole green's centre as its centre pin (OSM's pin, 15 m along the
    narrow green, fell outside the close-up putting view).
-   Card hole 11 (the Eden estuary).

## New pipeline keys or theme

-   `green_views_fit` (s09b, default off = the fixed windows, as before): each
    putting-view window grows to take in the hole's green and every green touching
    it, with half a standard window to spare on each side, so the camera can
    centre a ball or pin anywhere on a double green (developer, 2026-11-13: "I
    can't center this guy here"). At most 4,000 px a side.

-   `pipeline/gorse.py`: without an orthophoto, the thickets are only the
    `extra_areas` (before, the step needed a photo).
-   `pipeline/s09_render.py`: a building tagged barrier=wall keeps a tagged height
    under 3 m (0.8 m at least); other buildings are 3-14 m as before.
-   `integral` (PR #133) used: see Facts.
-   New theme `old_course`: `assets-src/palettes/old_course.json`,
    `assets-src/trees_old_course.py` (sycamore; the `bandon_dunes` shore pine and
    gorse bush), sheets `game/public/sprites/trees_old_course*`, `shrubs_old_course*`.

## Open items

1.  **The 17th's integral area** starts beside the green, not at the two black and
    yellow posts (not mapped). Recommend leaving it.
2.  **The burn is all red**; the card marks some of it yellow. Recommend keeping it.
3.  **Hole 17 plays 431 yd against 449 (−3.9 %).** Recommend accepting the flag.
4.  **Whins only where OSM maps scrub** (no open imagery to find more).

## Tests

Run 2026-11-13 on the branch merged with main (ef748e9d), pinned:

-   `make course NAME=st_andrews_old ARGS=--fresh`: 15 steps, `git status` unchanged.
-   `course_play.test.ts -t st_andrews_old`: 12/12; `st_andrews_old.test.ts`: 5/5
    (both roads integral, lie "road", no relief; a cart path elsewhere gives
    relief; the wall at 17 is 1.5 m).
-   `npm test`: 1,770 passed, 2 failed, both from the daily rotation (the course
    isn't in `dailyRoster.ts` until `make land`): `player.test.ts` "the real
    rotation" and `tour.test.ts` "a hole drawn sits out". Both pass on main.
-   `npm run e2e` (after `npm run build`): 17/17.

## Lessons

-   **Scottish lidar:** the srsp-open-data bucket lists with
    `?list-type=2&prefix=lidar/phase-N/dtm/27700/gridded/NO` through a workflow `url`
    item; 5 km 50 cm tiles are named like `NO41NE_50CM_DTM_PHASE5.tif`.
-   **A links of several courses:** the Old Course's own polygon hugs its holes;
    the OB line is the neighbours joined, so read the card's local rules first.
-   **Roads the course plays across** may lie outside OSM's course polygon (the road
    behind the 17th): check every integral object is inside the line.
-   **Rebuilds under a running Vite dev server** leave it serving its index page for
    replaced files: restart it before screenshots.
