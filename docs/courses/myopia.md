# Myopia Hunt Club

Course id: `myopia` (data folder `data/myopia/`), branch `course/myopia`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green, 25 fairways, 55 tee boxes, 119 bunkers, five ponds and the paths (OSM
`golf=path`, played as cart paths). Elevation and trees from USGS 3DEP (1 m DEM and the 2021
Central Eastern Massachusetts lidar, leaf-off, classes 3-5), the photo for checks from NAIP,
all fetched by the GitHub Actions workflow (three lidar tiles on retry runs). Tee set built:
Red (the tips, 6,555 yd), the default; White also playable. New theme `myopia` (North Shore
hunt country in late summer: tawny fescue rough, white pine, red oak, red maple, elm); the
logo is a brass hunting horn with a red cord lying in the fescue. Every hole passes after the
virtual tees moved within their boxes.

## Checks

- `course_play.test.ts -t myopia`: 11 passed.
- `npm test`: 1764 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole drawn sits out" fail until `make land` adds the course to the daily rotation.
- `npm run e2e`: 16 passed, 1 failed: smoke.spec "a reload while the ball is in the air keeps the stroke". It plays Oswego Lake, not this course; rerun alone it failed once and passed once, so it is flaky (it also failed on the Heron Lakes branch, PR #129).
- Pinned; a `--fresh` rebuild left git clean.
- Every hole looked at in the game (tee view, overview, first shot, putting view).

## Facts

-   **Location:** South Hamilton (Hamilton), Essex County, Massachusetts. `state` MA.
-   **Design:** Herbert C. Leeds (1894-1901; R. M. Appleton laid out the first nine);
    Gil Hanse's tree and fairway work since 2011. Four U.S. Opens (1898, 1901, 1905, 1908).
-   **UTM zone:** 19 N (EPSG:32619). World 1,792 x 1,792 m, origin (346775, 4718242),
    held to 1,792 m tall because the fetched DEM is 2,100 m tall and s00 needs the world
    + 32 m. Theme `myopia` (new). Wind 2-10 mph.
-   **Data** (release `data-myopia`; `make fetch NAME=myopia`): OSM standard Overpass
    export; 3DEP 1 m DEM (MA_CentralEastern_2021_B21); 3DEP lidar, 4 tiles, classes 3-5
    (CRS kept with `--keep-evlrs`); NAIP.
-   **Water:** five penalty areas, all red: two ponds that OSM has as `natural=water` only
    (`red_water_osm`) and three mapped `golf=water_hazard` (yellow in OSM, red by the standing
    default through edits.json). Four small streams near hole lines are 0.1-0.4 m deep in the
    DEM with no open water on the photo: rough. OB: the OSM boundary; the range is OB.
-   **Trees:** 18,665 lidar trees (4,264 inside the course), median 21.2 m, tallest 38.8 m;
    conifer or deciduous from the leaf-off returns. 1 dropped on a playing surface, 1 from
    the 4th's tee shot (28 m tall, 26 m out).
-   **Pins:** OSM maps none; every green gets the game's pins from its centre.

## Scorecard

Third-party, unverified: Stymie and GolfPass give the same current card hole by hole (Red,
White and Yellow from Stymie; Green from GolfPass), read 2026-10-24 by the scouting chat;
every row adds up. Ratings from Stymie: Red 72.7/138, White 71.1/134 (Yellow 67.1/123 and
Green, unrated, not built).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 4 | 4 | 4 | 5 | 3 | 36 | 4 | 4 | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 36 | 72 |
| HCP | 16 | 14 | 8 | 4 | 2 | 12 | 6 | 10 | 18 |  | 3 | 15 | 1 | 5 | 11 | 13 | 17 | 9 | 7 |  |  |
| Red | 276 | 488 | 252 | 385 | 417 | 255 | 401 | 473 | 138 | 3085 | 404 | 349 | 451 | 358 | 393 | 529 | 192 | 394 | 400 | 3470 | 6555 |
| Built | 269 | 484 | 246 | 382 | 407 | 251 | 396 | 472 | 135 | 3042 | 392 | 344 | 450 | 350 | 383 | 521 | 191 | 393 | 400 | 3424 | 6466 |

## Default tee

Red: the longest set (COURSE_BUILD.md 4.1; at this club Red is the tips).

## Course chat's calls (listed for the developer)

-   The three `golf=water_hazard` ponds play red (standing default).
-   OSM's `golf=path` ways are cart paths.
-   Card: the 9th green (rotating 9, 4, 12, 16).

## Open items

1.  Third-party card; a photo of the printed card would settle it.
2.  The four shallow streams play as rough (above); say if any should be a penalty area.

## Build history

-   2026-11-13: first build (course chat).
