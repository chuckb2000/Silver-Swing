# Needham Golf Club

Course id: `needham` (data folder `data/needham/`), branch `course/needham`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer slept (calls logged below and in
`data/needham/validation_report.md`). OSM maps all nine holes (lines, tees, fairways, greens,
bunkers); the GitHub fetch workflow brought the Overpass export, the club's 2026 scorecard PDF, the
2021 USGS 1 m DEM and one 2021 lidar tile. The course is nine holes played twice from different tees,
built as the card's 18 on the nine greens (holes 10-18 replay 1-9 from the second-nine tees). Tee sets
Blue/White (default, 6,040 yd built vs 6,070 card) and White/Green (5,848 built vs 5,848). Every hole
is within 3 % of the card after s06's tee moves, except 18 White/Green (+4.2 %). Theme `bayside`; new
logo (a town pump).

## Facts

-   **Location:** 49 Green Street, Needham, Norfolk County, Massachusetts; town watershed land along
    Alder Brook, in houses north-east of Needham centre. `state` MA. Course id `needham`.
-   **Design:** Wayne Stiles, 1923 ("A Wayne Stiles Design", 1923, club card 2026); built by
    superintendent John Graham to Stiles's plan; Brian Silva (mid-1980s) and Mark Mungeam later
    (Mass Golf centennial article, 2023). The land: the Colburn farm, bought by the town in 1899 for
    its watershed, leased to the club from 1923.
-   **UTM zone:** 19N (EPSG:32619). World 1,024 x 1,024 m (x0 316669, y0 4682067). Theme `bayside`.
    Wind 1-9 mph.
-   **Data:** OSM (Overpass export via the fetch workflow, `needham_overpass2.geojson`); USGS 3DEP 1 m
    DEM MA_CentralEastern_2021_B21 tile x31y469 (clip in git, 3 MB); 2021 USGS lidar tile 19TCG316681,
    classes 3-5 (release `data-needham`, `release.json`).
-   **Water:** all red. Four ponds (`red_water_osm`) and Alder Brook in two pieces, traced from the DEM
    channel (`proposed/channels_lidar.geojson`). The MassGIS wetlands play as rough.
-   **Out of bounds:** the OSM boundary, two parts joined across the road (`join_boundary_parts`).
-   **Trees:** 5,903 from the leaf-off lidar (1,392 on the course), conifer/deciduous by the
    last-return share; 1 dropped from hole 5's Blue/White tee shot (s06b), 2 on playing surfaces.

## Scorecard

Club scorecard PDF, 2026 (needhamgolfclub.com/documents/20124/110138/NEEDHAM_2026.pdf), fetched
2026-10-31; it agrees with the club's "Explore the Course" page. Full card (every combination, par and
index) in `data/needham/scorecard_full.csv`.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 36 | 5 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 9 | 11 | 13 | 5 | 7 | 1 | 17 | 15 | 3 | | 10 | 12 | 14 | 6 | 8 | 2 | 18 | 16 | 4 | | |
| Blue/White | 501 | 201 | 297 | 378 | 347 | 398 | 166 | 296 | 525 | 3109 | 481 | 184 | 287 | 374 | 324 | 379 | 137 | 281 | 514 | 2961 | 6070 |
| Built (Blue/White) | 498 | 206 | 293 | 373 | 352 | 388 | 162 | 290 | 531 | 3093 | 478 | 179 | 280 | 373 | 332 | 369 | 136 | 274 | 527 | 2948 | 6041 |
| White/Green | 481 | 184 | 287 | 374 | 324 | 379 | 137 | 281 | 514 | 2961 | 468 | 177 | 279 | 369 | 308 | 371 | 132 | 281 | 502 | 2887 | 5848 |
| Built (White/Green) | 478 | 179 | 280 | 373 | 332 | 369 | 136 | 274 | 527 | 2948 | 462 | 173 | 277 | 373 | 316 | 366 | 136 | 274 | 523 | 2900 | 5848 |
| Red/Yellow (not built) | 468 | 177 | 279 | 369 | 308 | 371 | 132 | 281 | 502 | 2887 | 400 | 166 | 274 | 315 | 301 | 367 | 117 | 206 | 400 | 2546 | 5433 |

Ratings (card): men Blue/Gold 70.2/128, Blue/White 69.8/129, White/Green 68.5/124; ladies Red/Yellow
72.0/123, Blue/White 75.2/136. Not built: Blue/Gold (par 70: hole 8 a 206-yd par 3, hole 10 a 401-yd
par 4; needs per-tee pars) and Red/Yellow (ladies' stroke index).

## Default tee

Blue/White: the developer's overnight rule (Blue and the back-most set); Blue/Gold, the back-most, can't
be built with one par per hole, so White/Green (next forward) is the second set.

## The developer's calls

Pending (made by the course chat overnight, each reversible; details in validation_report.md):
1. The card's 18 on nine greens rather than a 9-hole course played twice.
2. Blue/White and White/Green built; Blue/Gold waits for per-tee pars.
3. Tee boxes picked per hole and set from the card's yardages (OSM has no tee colours).
4. All water red; Alder Brook from the DEM channel; wetlands as rough.
5. Holes 6/15: the default-aim test skips the fairway pond (a lay-up hole).
6. Card holes 1, 8, 3, 5; logo the town pump; theme `bayside`.

## New pipeline keys or theme

None. `data/needham/make_second_nine.py` writes the second nine's hole lines and tee copies (and the
clubhouse as a building) into `proposed/`.

## Open items

1. Per-tee pars (design request) to build Blue/Gold, the back tees.
2. Approve the tee-box choices and the 18-on-9 model.
3. Hole 18 White/Green +4.2 %: its forward tee is not mapped separately.
4. The north lidar tile (19TCG316683) timed out; only scenery north of the course lacks trees.

## Lessons

-   A nine played twice: copy the hole lines as 10-18 and tag tee-box copies `hole`/`tee_set`; the
    game needs nothing new, and shared greens keep one pin model.
-   The first Overpass box from the coordinator was on the wrong club (Wellesley CC): check the
    `golf_courses` name in the fetch log before anything else.
-   `remote_fetch.py wait` can crash on a 404 while the log asset is replaced: just run it again.
