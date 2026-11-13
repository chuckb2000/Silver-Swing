# Eugene Country Club

Course id: `eugene_cc` (data folder `data/eugene_cc/`), branch `course/eugene_cc`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green, fairways, tee boxes, bunkers and four ponds. The neighbouring Oakway Golf
Course's boundary and golf features overlap the world and are dropped. Elevation and
canopy from DOGAMI lidar (DTM and CHM, feet), the photo for checks from OSIP 2024 (0.5 m);
everything fetched by the GitHub Actions workflow. Tee set built: Championship (the
longest), the default. New theme `eugene_cc` (deep fir greens with a gold maple for the
club's colours); the logo is a mallard drake on a pond (the developer's call). 6,848 yd built
against 7,015; hole 9 is 9.8 % short (open item 1), 11 is a flag.

## Facts

-   **Location:** Eugene, Lane County, Oregon (Cal Young). `state` OR. Course id `eugene_cc`.
-   **Design:** H. Chandler Egan (1923-27); Robert Trent Jones Sr. redesigned it in 1967,
    reversing the routing so the old greens became tees.
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 1,280 m, origin (492489, 4878626).
    Theme `eugene_cc` (new). Wind 1-7 mph (inland Pacific Northwest).
-   **Data** (release `data-eugene_cc`; `make fetch NAME=eugene_cc`; fetched by the GitHub
    Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC, 1 m, feet (newest project at the
        course OLC_WILLAMETTE_VALLEY_2023_SOUTH);
    -   canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, same box;
    -   photo (checks only): OSIP 2024, 0.5 m;
    -   scorecard: GolfPass (third-party, below).
-   **Water:** four ponds, all red (tagged in `edits.json`). Out of bounds: the OSM
    boundary; the range is out of bounds.
-   **Trees:** 4,251 from the DOGAMI canopy model (1,182 inside the course), median 13.5 m,
    tallest 60.1 m; 28 dropped on playing surfaces. Types from crown shape only: 1,067
    conifer, 3,184 deciduous. 318 of OSM's 668 mapped trees match a lidar tree within 4 m.

## Scorecard

Third-party, unverified: GolfPass (course 11296), par, men's handicap and yardage per tee
set, read 2026-11-13; the Championship row adds up to 7,015. Rating/slope 74.6/140 from
stymie.golf (which prints the tee as 7,030 yd).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 4 | 3 | 5 | 3 | 5 | 4 | 35 | 4 | 4 | 3 | 5 | 4 | 4 | 5 | 4 | 4 | 37 | 72 |
| HCP | 9 | 13 | 7 | 3 | 15 | 1 | 17 | 11 | 5 |  | 8 | 10 | 14 | 2 | 16 | 4 | 12 | 18 | 6 |  |  |
| Championship | 390 | 228 | 425 | 408 | 192 | 545 | 200 | 485 | 450 | 3323 | 401 | 424 | 183 | 525 | 405 | 440 | 522 | 347 | 445 | 3692 | 7015 |
| Built | 380 | 225 | 423 | 396 | 187 | 534 | 199 | 484 | 406 | 3234 | 397 | 392 | 184 | 513 | 404 | 432 | 518 | 340 | 434 | 3614 | 6848 |

## Default tee

Championship: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed), listed in the intake message.

Course chat's calls (listed for the developer):

-   Oakway Golf Course (OSM r12932854) and all its golf features dropped: it is a separate
    course, and one of its greens crossed the world's edge.
-   `checks.json`: wind 1-7; hole 9 accepted at -9.8 % until the developer decides.
-   Card: the 6th green on its pond (rotating 6, 4, 7, 14).

## Open items

1.  **Hole 9** (card 450 yd) measures 406 from the start of OSM's hole line, the only box
    mapped there (-9.8 %, over the 8 % line). On the photo there are firs behind it and no
    farther box I can see. Options: (a) accept 406 (recommended unless the club has a back
    tee I can't see); (b) the developer points me at the back box; (c) check the card.
2.  **Hole 11** (card 424) measures 392 (-7.7 %, a flag); the only box on the line's
    extension is 83 m back, which would make it 14 % long. Recommended: accept.
3.  Holes 2, 11 and 14: no Championship box is mapped; the tees are the starts of OSM's
    hole lines (2 and 14 pass).
4.  Tree types from crown shape only.

## Build history

-   2026-11-13: first build (course chat).
