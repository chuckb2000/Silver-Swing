# Needham Golf Club

Course id: `needham` (data folder `data/needham/`), branch `course/needham`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer slept, first as the card's 18 on
nine greens; rebuilt the same day as the nine it is, Highland Links style (developer, 2026-10-31
09:20). OSM maps all nine holes (lines, tees, fairways, greens, bunkers); the GitHub fetch workflow
brought the Overpass export, the club's 2026 scorecard PDF, the 2021 USGS 1 m DEM and one 2021 lidar
tile. Rounds are 9 holes or 18 twice around. Tee sets Blue (default, 3,093 yd built vs 3,109 card) and
White (2,947 vs 2,961), par 36. Every hole is within 3 % of the card after s06's tee moves. Theme
`bayside`; new logo (a town pump).

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
    last-return share; 1 dropped from hole 5's Blue tee shot (s06b), 2 on playing surfaces.

## Scorecard

Club scorecard PDF, 2026 (needhamgolfclub.com/documents/20124/110138/NEEDHAM_2026.pdf), fetched
2026-10-31; it agrees with the club's "Explore the Course" page. Full card (every combination, par and
index) in `data/needham/scorecard_full.csv`.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 36 |
| HCP | 9 | 11 | 13 | 5 | 7 | 1 | 17 | 15 | 3 | |
| Blue | 501 | 201 | 297 | 378 | 347 | 398 | 166 | 296 | 525 | 3109 |
| Built (Blue) | 498 | 206 | 293 | 373 | 353 | 388 | 163 | 290 | 531 | 3093 |
| White | 481 | 184 | 287 | 374 | 324 | 379 | 137 | 281 | 514 | 2961 |
| Built (White) | 479 | 179 | 280 | 373 | 332 | 369 | 136 | 274 | 527 | 2947 |
| Red (not built) | 468 | 177 | 279 | 369 | 308 | 371 | 132 | 281 | 502 | 2887 |

Built: the card's rows 1-9. Blue, White and Red are the front nines of the card's Blue/White,
White/Green and Red/Yellow. The card rates only 18-hole combinations; each set carries the one that
starts on it: Blue 69.8/129 (men Blue/White), White 68.5/124 (men White/Green), Red 72.0/123 (ladies
Red/Yellow). Also on the card: men Blue/Gold 70.2/128, ladies Blue/White 75.2/136. Stroke index: the
men's Blue/White row 1-9.

Not built (dropped with the 18-hole build, 2026-10-31): the second-nine tees (rows 10-18: Gold, and
White, Green and Yellow as the back nine) and the 18-hole combinations Blue/White, White/Green,
Blue/Gold and Red/Yellow. Blue/Gold's front nine is Blue but for hole 8 (a 206-yd par 3); its back
nine has hole 1 as a 401-yd par 4.

## Default tee

Blue: the furthest-back set on rows 1-9 and the Blue set (developer's overnight rule: the back set and
Blue; the back set is Blue, so Blue and the next set forward, White).

## The developer's calls

- 2026-10-31 09:20: build it as a nine, Highland Links style (9 holes, played as 9 or 18 twice
  around), Blue and the next set forward.

Pending (made by the course chat, each reversible; details in validation_report.md):
1. Tee sets Blue and White (front nines of Blue/White and White/Green), each with its combination's
   18-hole rating. All sets on rows 1-9 have the same pars, so the earlier design request (per-tee pars,
   for Blue/Gold) is not needed for this layout.
2. Tee boxes picked per hole and set from the card's yardages (OSM has no tee colours).
3. All water red; Alder Brook from the DEM channel; wetlands as rough.
4. Hole 6: the default-aim test skips the fairway pond (a lay-up hole).
5. Card holes 1, 8, 3, 5; logo the town pump; theme `bayside`.

## New pipeline keys or theme

None. `data/needham/make_clubhouse.py` writes the clubhouse as a building into `proposed/` (it was
`make_second_nine.py`, which also wrote holes 10-18 for the 18-hole build).

## Open items

1. Approve the tee-box choices and the ratings (18-hole combination ratings on a nine).
2. Hole 9: Blue and White share one large box (w1271766412); White's forward tee is not mapped
   (+2.5 % after the move).
3. The north lidar tile (19TCG316683) timed out; only scenery north of the course lacks trees.

## Lessons

-   A nine whose card prints it twice from other tees is built as the nine (Highland Links style),
    not as an 18 on nine greens (developer, 2026-10-31).
-   The first Overpass box from the coordinator was on the wrong club (Wellesley CC): check the
    `golf_courses` name in the fetch log before anything else.
-   `remote_fetch.py wait` can crash on a 404 while the log asset is replaced: just run it again.
