# Lofoten Links

Course id: `lofoten` (data folder `data/lofoten/`), branch `course/lofoten`.

## Build summary

Built by a course chat on 2026-11-13, the first course outside North America with
Old Course. OSM maps the whole course: 18 hole lines whose pars match the card,
every green and pin, fairways, bunkers, rough and seven penalty areas, and 69 tee
boxes, though not the 61 (back) tee on several holes. Elevation and trees come from
Kartverket's national DTM and DOM 1 m through their WCS (fetched by the GitHub
Actions workflow). The sea is built from OSM's coastline and, with the bare shore up
to the boundary, is one red penalty area the holes play over. New theme `lofoten`
(heather, grey rock, white shell sand, cold sea; low birch); the logo is a
white-tailed sea eagle. 61 tees: 12 holes within 3 % of the card; the doglegs 1, 3, 7, 13, 14 and 16
measure 4-10 % short (the card measures doglegs longer; accepted by the developer),
6,469 yd against 6,662. See "Tests" for what ran.

## Facts

-   **Location:** Tore Hjortsvei 389, Hov, Gimsøysand, on the north-west shore of
    Gimsøya, Vågan, Nordland, Norway (68.34 N, 14.13 E), between the Norwegian Sea
    and the Gimsøymyrene bogs, under the peak of Hoven. `state` EU (the course
    select's europe button, PR #128). Course id `lofoten`.
-   **Design:** Jeremy Turner: nine holes in 1998, eighteen from 2015 (club,
    GolfPass, top100golfcourses.com; unverified).
-   **UTM zone:** 33 N (EPSG:32633). World 1,792 x 1,280 m, origin (463502,
    7580435): the boundary's box (1,448 x 1,019 m) plus 130-172 m of scenery.
    Theme `lofoten` (new). Wind 4-18 mph (open Arctic coast; course chat's proposal).
-   **Data** (GitHub release `data-lofoten`; `make fetch NAME=lofoten`):
    -   OSM: the workflow's Overpass export and a coastline query, merged by
        `intake.py osm` into `raw/overpass.geojson` (committed).
    -   Elevation: Kartverket, Nasjonal høydemodell DTM 1 m (WCS 1.0.0 GetCoverage,
        coverage `nhm_dtm_topo_25833`, EPSG:25833, NN2000 heights), CC BY 4.0.
        WCS 2.0.1 GetCoverage answered 400 for every form tried; 1.0.0 with the
        coverage id works.
    -   Canopy: Kartverket DOM 1 m (`nhm_dom_topo_25833`), the same way.
    -   Photo: none open (Norge i bilder is under the Norge digitalt licence).
    -   Card: the club's 2025 scorecard PDF (lofotenlinks.no), in metres.
-   **Water:** the sea and the inlets (one red penalty area, `sea`: OSM coastline
    by `pipeline/propose_sea.py` plus the bare shore between it and the boundary by
    `data/lofoten/make_shore.py`), the two lakes and the five smaller ponds and
    hazards, all red. Out of bounds is the OSM course polygon (relation 5314623)
    joined with its tee boxes grown 3 m (`make_boundary.py`: the 3rd's back tee on
    the rocks straddled the line); the bogs east and south of the course
    (Gimsøymyrene) are out of bounds and drawn as open ground, not woods
    (`wetland_woods: false`).
-   **Trees:** 678 from the DOM - DTM canopy model, 29 inside the course, none on a
    playing surface; median height 6 m (low birch), types by crown shape (7
    conifers). Drawn as downy birch and Norway spruce.

## Scorecard

Lofoten Links scorecard 2025 (club PDF, read 2026-11-13). Lengths in metres;
`scorecard.csv` has yards (1 yd = 0.9144 m, each hole rounded). The card prints no
ratings: men's ratings from GolfPass and Hole19 (unverified).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 4 | 4 | 3 | 5 | 5 | 4 | 36 | 4 | 4 | 3 | 5 | 4 | 4 | 4 | 3 | 4 | 35 | 71 |
| HCP | 15 | 7 | 13 | 11 | 9 | 17 | 3 | 1 | 5 | | 10 | 8 | 6 | 16 | 2 | 14 | 4 | 18 | 12 | | |
| 61 (m) | 301 | 138 | 420 | 375 | 344 | 149 | 481 | 518 | 321 | 3047 | 343 | 383 | 222 | 478 | 381 | 319 | 430 | 146 | 343 | 3045 | 6092 |
| 55 (m) | 287 | 134 | 304 | 312 | 311 | 145 | 449 | 476 | 300 | 2718 | 315 | 357 | 201 | 437 | 326 | 283 | 402 | 131 | 329 | 2781 | 5499 |
| 48 (m) | 272 | 111 | 286 | 276 | 270 | 130 | 389 | 415 | 260 | 2409 | 273 | 283 | 149 | 384 | 323 | 273 | 311 | 115 | 284 | 2395 | 4804 |
| 42 (m) | 196 | 97 | 267 | 237 | 227 | 84 | 389 | 391 | 260 | 2148 | 235 | 233 | 98 | 351 | 258 | 233 | 311 | 107 | 242 | 2068 | 4216 |
| 61 (yd) | 329 | 151 | 459 | 410 | 376 | 163 | 526 | 566 | 351 | 3331 | 375 | 419 | 243 | 523 | 417 | 349 | 470 | 160 | 375 | 3331 | 6662 |
| Built | 298 | 155 | 433 | 403 | 382 | 159 | 499 | 549 | 349 | | 371 | 413 | 241 | 501 | 399 | 342 | 449 | 158 | 368 | | 6469 |

Men's ratings/slopes (GolfPass, Hole19): 61 74.3/143, 55 71.4/137, 48 68.0/129,
42 65.2/124 (GolfPass's tee table also gives 73.5/136 for 61). 55, 48 and 42 are in
`scorecard.csv`, not built.

## Default tee

61, the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

All 2026-11-13.

-   Elevation from Kartverket's lidar through the workflow; the sea a penalty area.
-   New theme `lofoten` approved ("excited for the lofoten theme").
-   Logo: the sea eagle ("let's do the bird").
-   Location "Gimsøya, Vågan, Nordland, Norway", `state` EU.
-   The yardage flags and hole 1 accepted: the holes are traced right, the card
    measures its doglegs longer.

Course chat's calls (listed for the developer):

-   The standing defaults: 61 only, every penalty area red, OB = the OSM boundary
    (joined with the tee boxes), fairway trees removed.
-   The shore between the boundary and the sea joined to the sea (as at Cypress
    Point).
-   Card hole 7.

## New pipeline keys or theme

-   `wetland_woods` (s08, default true = as before): false draws OSM
    natural=wetland outside the boundary as plain out-of-bounds ground instead of
    woods (Lofoten's open bogs).
-   New theme `lofoten`: `assets-src/palettes/lofoten.json`,
    `assets-src/trees_lofoten.py` (birch, spruce, heather bushes), sheets
    `game/public/sprites/trees_lofoten*` and `shrubs_lofoten*`.

## Open items

1.  **Hole 1 (−9.6 %) and flags 3, 7, 13, 14, 16 (−4 to −6 %): accepted** by the
    developer (2026-11-13) after checking them on the tracing desk: the holes are
    traced right; the card measures its doglegs longer than our tee-bend-green
    line. All six are doglegs. Hole 1's limit is in `checks.json` (10 %).
2.  **Greens 6, 10 and 12** sit on ground the DTM reads as 27-44 % steep (rock
    edges); shaped to 2.5 % like every green. Recommend playtesting.
3.  **Ratings** are third-party (the card prints none).
4.  **No heather bushes**: without an open photo the gorse/bush step has nothing
    to place them from; the rough is drawn as heather.

## Tests

Run 2026-11-13 on the branch merged with main (ef748e9d), pinned:

-   `make course NAME=lofoten ARGS=--fresh`: 15 steps, `git status` unchanged.
-   `course_play.test.ts -t lofoten`: 12/12.
-   `npm test`: 1,765 passed, 2 failed, both from the daily rotation (the course
    isn't in `dailyRoster.ts` until `make land`): `player.test.ts` "the real
    rotation" and `tour.test.ts` "a hole drawn sits out" (the test counts every
    course's holes in the pool; the plan leaves out courses not in the roster).
    Both pass on main.
-   `npm run e2e` (after `npm run build`): 14 passed, 3 failed on timing while the
    machine was busy (clicks 135, smoke 226 and 335); each passed when run again.

## Lessons

-   **Kartverket WCS:** 2.0.1 GetCoverage refused every subset form (400); 1.0.0
    `coverage=<id>&crs=EPSG:25833&bbox=...&width&height&format=GeoTIFF` works. The
    capabilities give the ids (`nhm_dtm_topo_25833`, `nhm_dom_topo_25833`).
-   **Coastal OSM boundaries stop short of the sea.** Look at what lies between the
    boundary and the coastline on every hole that plays along or over the water.
-   **OSM wetlands are drawn as woods** by default; on open bog that is wrong.
