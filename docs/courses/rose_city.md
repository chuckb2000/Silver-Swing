# Rose City Golf Course

Course id: `rose_city` (data folder `data/rose_city/`), branch `course/rose_city`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines (no
par tags; the card's pars are used), every green and pin, 17 fairways, 46 tee boxes,
22 bunkers and the three ponds. The boundary is mapped as two parts either side of
NE 72nd Drive, joined with `join_boundary_parts` (the road stays out of bounds).
Elevation and trees come from DOGAMI's bare-earth and canopy-height mosaics (OLC
Metro 3DEP 2019 lidar), the photo checks from OSIP 2024, all fetched by the GitHub
Actions workflow. Tee set built: Tournament (the longest), the default. New theme
`rose_city`; the logo is a 1920s board-track racer for the Rose City Speedway the
course was built on. 16 holes within 3 % of the card; hole 7 -6.4 % (flag, no tee box
farther back) and hole 15 -9.5 % (fail, open item 1); 6,408 yd built against 6,437.
Checks on the branch (2026-11-13): `course_play.test.ts -t rose_city` 12 passed; `npm test` 1,739 passed, 2 failed (the two that fail for every new course until `make land` adds it to the daily rotation: `player.test.ts` "the real rotation", `tour.test.ts` "a hole drawn sits out"); `npm run e2e` 16 passed, 1 failed ("course data is exact when the browser adds noise", which loads Aberdeen, the first course in the list: Aberdeen has 68,428 out-of-bounds surface pixels inside its boundary on `main` too, so not this branch); pinned, and a `--fresh` rebuild left git clean. Every hole looked at in the game (tee view, overview, first shot, putting view).

## Facts

-   **Location:** 2200 NE 71st Avenue, Portland, Multnomah County, Oregon, in the
    Rose City Park neighbourhood of NE Portland; the course lies either side of NE
    72nd Drive, front nine east, back nine west. `state` OR. Course id `rose_city`.
-   **Design:** George Otten (GolfPass, Stymie); the first nine was played in 1922
    on the site of the old Rose City Speedway, 18 holes by 1923; the second-oldest
    municipal course in Portland (GolfPass's history). City of Portland.
-   **UTM zone:** 10 N (EPSG:32610). World 1,792 x 768 m, origin (531092, 5042591).
    Theme `rose_city` (new). Wind 1-7 mph (inland Pacific Northwest).
-   **Data** (release `data-rose_city`; `make fetch NAME=rose_city`; fetched by the
    GitHub Actions workflow 2026-11-13, `data/rose_city/fetch.json`):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC at 1 m, feet (newest project
        OLC_METRO_3DEP_2019);
    -   canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, same flight;
    -   photo: OSIP 2024 at 0.5 m, two pieces (checks only);
    -   scorecard: stymie.golf and GolfPass (third-party, below).
-   **Water:** three ponds, all red (standing default): by the 5th green, beside the
    9th and 10th, and on the 14th (GolfPass: water in play on 10, 11, 14 and 15).
    Out of bounds: the OSM boundary (two parts) and NE 72nd Drive between them; the
    driving range is out of bounds.
-   **Trees:** 4,253 from the DOGAMI canopy model (1,399 inside the course), tallest
    44 m; 3 dropped on fairways (listed in `validation_report.md`); s06b found no tee
    shot to clear. Types from crown shape only: 761 conifer, 3,492 deciduous (the
    crown-shape rule undercounts the course's Douglas firs, see Lessons).

## Scorecard

Third-party, unverified: stymie.golf's "Blue Tournament" card (par, handicap and
yardage per hole, 71.0/120), read 2026-11-13; GolfPass (course 11365) has the same
yardages hole for hole in its "Tournament" row and every other row in
`scorecard.csv`. The two disagree on the front-nine stroke indexes (GolfPass: 7, 3,
15, 13, 17, 1, 9, 5, 11); Stymie's are used.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 35 | 5 | 5 | 3 | 4 | 4 | 3 | 5 | 4 | 4 | 37 | 72 |
| HCP | 9 | 5 | 15 | 13 | 17 | 3 | 11 | 7 | 1 |  | 6 | 12 | 10 | 8 | 14 | 18 | 16 | 4 | 2 |  |  |
| Tournament | 367 | 388 | 502 | 341 | 171 | 425 | 364 | 216 | 384 | 3158 | 475 | 465 | 200 | 367 | 329 | 133 | 473 | 414 | 423 | 3279 | 6437 |
| Built | 366 | 395 | 501 | 340 | 172 | 426 | 341 | 211 | 386 | 3138 | 479 | 464 | 198 | 373 | 325 | 120 | 467 | 420 | 424 | 3270 | 6408 |

Ratings (Stymie, men): Tournament 6,437 yd 71.0/120, Blue 6,406 70.9/119, Blue/White
6,166 69.4/116, White 6,009 68.6/116, White/Green 5,696 67.4/112, Green 5,471
66.4/108, Gold 4,354 62.1/100. Only Tournament is built; the others are in
`scorecard.csv`.

## Default tee

Tournament: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM
    boundary, range OB, fairway trees removed, wind 1-7 mph), listed in the intake
    message; Rose City picked as one of the Portland-metro courses.

Course chat's calls (listed for the developer):

-   `join_boundary_parts` (max gap 16 m): the two halves either side of NE 72nd
    Drive play as one course; the road between them is out of bounds.
-   The clubhouse (`golf=clubhouse` + `building=yes`) copied as a building.
-   Hole 7 plays 341 yd against the card's 364 (-6.4 %): its only box is at the line
    start and the photo shows mown grass, no pad, behind it.
-   Card hole: the 5th (green beyond the pond); rotation 5, 7, 15, 9.

## New pipeline keys or theme

-   No new config key; no pipeline change.
-   New theme `rose_city`: `assets-src/palettes/rose_city.json` (deep, slightly blue
    emerald turf, moss rough, pale warm-grey sand, dark slate ponds) and
    `assets-src/trees_rose_city.py` (the pnw shapes recoloured: blue-green Douglas
    fir; olive white oak, bright bigleaf maple and, for a third of the broadleaf
    trees, the copper-beech and purple-plum red of the street trees round the
    course). Sheets `game/public/sprites/trees_rose_city*`
    (`build_assets.py --theme rose_city`).

## Open items

1.  **Hole 15 plays 120 yd against the card's 133 (-9.5 %, over the 8 % line).** Its
    tee is the back-most of the mapped boxes, under the firs by the houses on NE
    Sacramento St; the photo shows no box farther back. Recommend accepting it
    (`checks.json` allows 10 %) unless someone who knows the course places a back tee.
2.  **Hole 7 -6.4 % (flag).** No pad behind the mapped box. Recommend accepting.
3.  **Third-party card.** Stroke indexes differ between Stymie and GolfPass on the
    front nine. Recommend a photo of the printed card when convenient.
4.  **The plum and copper-beech colouring** of a third of the broadleaf trees is a
    drawing choice for the theme. Say if it reads too autumnal.

## Lessons

-   **A boundary split by a public road** is one relation with two outer rings here
    (not two ways, as at Langdon): `join_boundary_parts` handles both.
-   **Leaf-on canopy and crown shape undercount conifers** in a mixed Portland park:
    the photo shows dense Douglas firs round the 15th green that the lidar calls
    deciduous. It changes only the sprites.
-   **`build_assets.py --help` runs the full asset build** (it has no help flag) and
    rewrites the shared sheets: revert them with `git checkout` if it happens.
