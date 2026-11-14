# Worcester Country Club

Course id: `worcester_cc` (data folder `data/worcester_cc/`), branch `course/worcester_cc`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars
(the 18th's par added from the card), every green, 22 fairways, 76 tee boxes, 74 bunkers,
cart paths and four ponds. Elevation and trees from USGS 3DEP (1 m DEM and the 2021 Central
Eastern Massachusetts lidar, leaf-off, classes 3-5), the photo for checks from NAIP, all
fetched by the GitHub Actions workflow (one lidar tile on a second run). Tee set built: Red
(the tips, 6,711 yd), the default; Black also playable. New theme `worcester_cc` (Ross
parkland in early fall: oaks, sugar and red maples turning, white pine); the logo is a sugar
maple in fall colour behind a fieldstone wall. Every hole passes or is a small flag after the
virtual tees moved within their boxes.

## Checks

- `course_play.test.ts -t worcester_cc`: 11 passed.
- `npm test`: 1751 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole drawn sits out" fail until `make land` adds the course to the daily rotation.
- `npm run e2e`: 16 passed, 1 failed in the hand-off run: clicks.spec "after the first tap, a press on a button beside the swing button" (timing; another build was running on the machine). Rerun alone with nothing else running: clicks.spec 3 passed.
- Pinned; a `--fresh` rebuild left git clean.
- Every hole looked at in the game (tee view, overview, first shot, putting view).

## Facts

-   **Location:** 2 Rice Street, Worcester, Massachusetts. `state` MA.
-   **Design:** Donald Ross (1913-14); restoration by Gil Hanse and Jim Wagner. The 1925
    U.S. Open, the first Ryder Cup (1927) and the 1960 U.S. Women's Open.
-   **UTM zone:** 19 N (EPSG:32619). World 1,280 x 1,536 m, origin (270225, 4688710).
    Theme `worcester_cc` (new). Wind 1-9 mph.
-   **Data** (release `data-worcester_cc`; `make fetch NAME=worcester_cc`): OSM standard
    Overpass export; 3DEP 1 m DEM (MA_CentralEastern_2021_B21); 3DEP lidar, 5 tiles, classes
    3-5 (CRS kept with `--keep-evlrs`); NAIP.
-   **Water:** seven penalty areas, all red: four ponds (`red_water_osm`) and the three
    brooks that cross the course, drawn along their DEM channels (`propose_channels.py`,
    3.5-4.9 m wide, 0.35-0.58 m deep). A ditch with no channel stays rough. OB: the OSM
    boundary; the range is OB.
-   **Trees:** 17,057 lidar trees (498 inside the course), median 21.8 m, tallest 37.9 m;
    3 dropped in bunkers.

## Scorecard

Third-party, unverified: Stymie's card (par, men's handicap, eleven tee rows; Red the tips),
read 2026-11-13; every row adds up. Ratings from the same card: Red 74.0/133, Black 70.8/128.
Other sites print older totals (Black 6,422 71.7/130; Gold 6,711 72.8/134).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 4 | 3 | 5 | 3 | 4 | 3 | 4 | 35 | 3 | 4 | 4 | 3 | 4 | 5 | 4 | 4 | 4 | 35 | 70 |
| HCP | 13 | 3 | 9 | 11 | 7 | 15 | 5 | 17 | 1 |  | 18 | 8 | 2 | 12 | 16 | 6 | 10 | 4 | 14 |  |  |
| Red | 387 | 563 | 388 | 235 | 483 | 207 | 412 | 195 | 410 | 3280 | 178 | 408 | 438 | 197 | 401 | 588 | 413 | 460 | 348 | 3431 | 6711 |
| Built | 381 | 559 | 386 | 230 | 471 | 200 | 406 | 196 | 401 | 3230 | 176 | 404 | 424 | 196 | 399 | 579 | 406 | 448 | 342 | 3374 | 6604 |

## Default tee

Red: the longest set (COURSE_BUILD.md 4.1; at this club Red is the tips).

## Course chat's calls (listed for the developer)

-   The 18th's par (4) added; OSM's line had none.
-   The 15th's Red tee is the OSM box w966020199 (tagged ref=15), 47 m behind the line's
    start: 579 yd from it against the card's 588 (the line's start gave 526, -10.6 %).
-   The brooks as red penalty areas along their DEM channels (above).
-   Card: the 7th green (rotating 7, 9, 11, 16).

## Open items

1.  Third-party card; a photo of the printed card would settle it.
2.  Holes 6 and 12 (Red) are -3.5 % and -3.3 % after the tee moves (flags).

## Build history

-   2026-11-13: first build (course chat).
