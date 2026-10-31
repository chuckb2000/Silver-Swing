# Rancho San Joaquin Golf Course

Course id: `rancho_san_joaquin` (data folder `data/rancho_san_joaquin/`), branch
`course/rancho_san_joaquin`.

## Build summary

Started overnight 2026-10-30/31 by a course chat under the developer's "make the calls yourself,
log every call", and finished by a second chat on 2026-10-31. OSM maps the whole course (18 hole
lines whose pars match the card, tees, greens, fairways, bunkers, four ponds); nothing was traced.
Every download came through the GitHub Actions fetch workflow (release `data-rancho_san_joaquin`):
the Overpass export, the USGS 3DEP 1 m DEM and six 1 km lidar tiles of the 2023 California Gaps
project, NAIP and the club's printed scorecard. Two tee sets, Black (the tips, default) and Blue.
Theme `strawberry_farms` (reused), an American avocet logo. Blue is within 3 % of the card on every
hole (6,122 yd built against 6,158); Black is 6,287 against 6,431, with holes 2 and 13 short
because their Black boxes aren't mapped (accepted, open item 1). `course_play.test.ts`,
`courses.test.ts` and `pins.test.ts` with `-t rancho_san_joaquin`: 17 passed. Every hole was looked
at in the game from Black. Branch test totals are in the pull request.

## Facts

-   **Location:** One Ethel Coplen Way, Irvine, Orange County, California (the club's site).
    Public (American Golf Corporation runs it). `state` CA.
-   **Design:** William F. Bell (1964); some listings add Robert Muir Graves (unverified).
-   **UTM zone:** 11 N (EPSG:32611). World 1,280 x 1,792 m (x0 422108, y0 3724318): the OSM
    boundary (way 171532123, 1,007 x 1,391 m) plus about 120-200 m of scenery. Theme
    `strawberry_farms`. Wind 2-10 mph (as Strawberry Farms, about 7 km from the sea).
-   **Data** (release `data-rancho_san_joaquin`; `make fetch NAME=rancho_san_joaquin`):
    -   OSM: the workflow's Overpass export, `raw/overpass.geojson` (in git).
    -   Elevation: USGS 3DEP 1 m DEM tile `USGS_1M_11_x42y373_CA_CaliforniaGaps_B23`, clipped to
        the world + 100 m. 4-26 m.
    -   Lidar: CA_CaliforniaGaps_B23 tiles 11SMT422724-726 and 423724-726 (1 km), flown
        8 November 2023, class 1 only, each clipped to the world + 100 m with
        `intake.py laz --keep-evlrs` (new flag: these LAS 1.4 tiles keep their CRS in an EVLR).
        423725 timed out on rockyweb twice and was 404 on the S3 mirror; a `tnm` request found it.
    -   Photo: NAIP at 0.5 m (`raw/naip_05m.tif`), checking only.
    -   Card: the club's printed scorecard (`raw/card/`).
-   **Water:** four ponds, all red (standing default; OSM tags them yellow). Out of bounds: the OSM
    boundary; the range is out of bounds and drawn as rough (`range_art`).
-   **Trees:** 8,709 from the lidar (1,391 inside the course), median 9.6 m, max 36.7 m; 3,842 tops
    on OSM building footprints dropped (the houses around the course); 29 on playing surfaces.
    Types from crown shape only (726 conifers).

## Scorecard

The club's printed scorecard (RanchoSanJoaquin-Scorecard-Inside.jpg on ranchosanjoaquin.com,
uploaded 2021-06, fetched 2026-10-31). Every row adds up to its printed totals. greenskeeper.org
has the same yardages and handicaps.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 5 | 4 | 4 | 3 | 4 | 36 | 4 | 4 | 5 | 3 | 4 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 5 | 17 | 15 | 11 | 1 | 3 | 9 | 13 | 7 | | 10 | 6 | 2 | 14 | 8 | 12 | 4 | 18 | 16 | | |
| Black | 519 | 157 | 339 | 355 | 517 | 387 | 369 | 176 | 431 | 3250 | 363 | 388 | 537 | 181 | 366 | 167 | 410 | 300 | 469 | 3181 | 6431 |
| Built | 506 | 141 | 329 | 346 | 504 | 377 | 354 | 180 | 427 | 3164 | 361 | 391 | 524 | 166 | 357 | 163 | 412 | 292 | 457 | 3123 | 6287 |
| Blue | 505 | 142 | 325 | 336 | 502 | 366 | 346 | 166 | 414 | 3102 | 355 | 368 | 527 | 157 | 348 | 156 | 396 | 292 | 457 | 3056 | 6158 |
| Built | 506 | 139 | 329 | 328 | 496 | 359 | 350 | 162 | 424 | 3093 | 361 | 372 | 518 | 152 | 339 | 160 | 388 | 290 | 449 | 3029 | 6122 |

Men's ratings/slopes (card): Black 70.5/126, Blue 69.4/123, White 66.5/116 (women's 76.8/131,
75.2/129, 73/127). White (5,709) is in `scorecard.csv` and `tee_sets` (not playable), not built.

## Default tee

Black, the longest set (developer, 2026-10-31, DECISIONS.md "The default tees are the longest
set"; `courses.test.ts` checks it). The overnight rule of 2026-10-30 said Blue; the later call
wins. Blue stays playable.

## The developer's calls

-   2026-10-30 (overnight rules): build the back set and Blue, both playable; make the
    stop-and-ask calls and log them; full permission for an original logo and theme.
-   2026-10-31: the default tee is the longest set (main).
-   Standing defaults: every penalty area red, out of bounds = the OSM boundary, range out of
    bounds, trees from lidar.

## Developer's calls pending

Made by the course chats; each can be reversed. Full text in
`data/rancho_san_joaquin/validation_report.md`.

1.  **The club's card and its ratings** (70.5/126, 69.4/123) over greenskeeper's.
2.  **Default Black** rather than Blue.
3.  **Black on 2 and 13 accepted 10.3 % and 8.1 % short** (`checks.json`): no Black box in OSM or
    the lidar, and the photo shows a cart path, fence and lot behind 2 and the road behind 13.
4.  **Hole 7 Black** -4.1 %: accepted flag.
5.  **The four ponds red** (OSM: yellow).
6.  **Theme, logo and card hole** (`strawberry_farms`, the avocet, hole 13): course chats' choices.

## New pipeline keys or theme

-   `pipeline/intake.py laz --keep-evlrs` (+4 lines): copies a LAS 1.4 tile's EVLRs (here the CRS
    WKT) into the clip's VLRs. Opt-in, so no other course's clip or hash changes.
-   No new config key; no new theme. Logo `assets-src/course_logos/rancho_san_joaquin.py` (with
    the first chat's concepts in `assets-src/logo_concepts/rancho_san_joaquin/`).

## Open items

1.  **Black boxes on 2 and 13.** Recommendation: keep as built unless you know where those tees
    are.
2.  **Ratings:** the club's card vs greenskeeper. Recommendation: keep the card's.
3.  **Pond colours:** OSM yellow, built red. Recommendation: keep red.
4.  **Tree types** are from crown shape only (no leaf-off photo for a mostly evergreen course).
    Recommendation: accept; it only changes the sprite.

## Lessons

-   `penalty_default: red` doesn't override OSM's explicit `golf=water_hazard`: tag each pond in
    `edits.json`, and check the penalty colours in `course.json` after the first build.
-   Guessed lidar URLs fail when a tile is missing from rockyweb or S3; a `tnm` item with `only`
    set to the tile name finds the real one.
-   Check a clipped LAZ still has its CRS (`make intake`): LAS 1.4 tiles can keep it in an EVLR,
    which the clip dropped.
