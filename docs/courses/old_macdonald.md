# Old Macdonald

Course id: `old_macdonald` (data folder `data/old_macdonald/`), branch `course/old_macdonald`.

## Build summary

Built by a course chat on 2026-10-21, together with Pacific Dunes and Sheep
Ranch (one set of downloads, GitHub release `pacific-dunes-data`; the shared
build notes and lessons are in `docs/courses/pacific_dunes.md`). OSM maps the
18 holes with greens, pins, fairways and bunkers, but tee boxes only on 2-6
and 18. The OSM hole lines start on the tees (developer), and from there the
course matches the Black card, so it is built from the Black tees: 12 x 8 m
boxes on the line starts where OSM has none, and on holes 1 and 13, whose
line starts lie 16-17 % beyond the card, at the Black distance on the line.
Holes 5 and 10 share a green that OSM maps as one polygon; it is cut into one
part per hole. Elevation and canopy are DOGAMI's 2008 lidar (older than the
course), with the OSIP 2024 photo for gorse and stale trees. Theme
`bandon_dunes`; the logo is a tweed flat cap and pipe. 14 holes are within
3 % of the card and four are 3-5 % flags (6,994 yd against 6,944). The 13
course tests (`data/old_macdonald/tests/old_macdonald.test.ts`) pass when
copied into `game/tests/unit/` (unit and Playwright totals in
`pacific_dunes.md`). Robot rounds over five seeds scored 77-80 with no hole over par + 4. Every hole was looked at in the game.

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon,
    inland of Pacific Dunes and north of the Practice Center. `state` OR.
    Course id `old_macdonald`.
-   **Design:** Tom Doak and Jim Urbina, opened 2010, after Charles Blair
    Macdonald's template holes; the card names them (1 Double Plateau, 2 Eden,
    3 Sahara, 4 Hog's Back, 5 Short, 6 Long, 7 Ocean, 8 Biarritz, 9 Cape,
    10 Bottle, 11 Road, 12 Redan, 13 Leven, 14 Maiden, 15 Westward Ho, 16 Alps,
    17 Littlestone, 18 Punchbowl).
-   **UTM zone:** 10 N (EPSG:32610). World 1,280 x 1,792 m (origin 386582,
    4783827): the box of the 18 holes (965 x 1,384 m) plus 157-204 m of
    scenery. Theme `bandon_dunes`. Wind 8-16 mph (as at Bandon Dunes).
-   **Data:** as Pacific Dunes (shared release `pacific-dunes-data`; `make
    fetch NAME=old_macdonald`): the combined Overpass export, the shared
    DOGAMI DTM and CHM (OLC South Coast, flown 2008), the two OSIP 2024
    tiles, the club card (`Old-MacDonald-Scorecard.webp`) and the resort's
    map (`OldMacDonald_AerialMap.jpg`, look only).
-   **Water:** Elbow Lake (w694622373, OSM `golf=water_hazard`) is red
    (standing default). Out of bounds is the resort polygon (w362513477),
    which also holds Bandon Dunes and Pacific Dunes; their ground inside it is
    in play and their greens are wrong greens. The Practice Center and its
    range are out of bounds.
-   **Trees:**
    -   5,242 lidar trees (1,976 inside the boundary), all shore pine
        (`tree_type`); 248 that the 2024 photo no longer shows were dropped
        (`trees_need_ortho`).
    -   32,138 gorse bushes over 37.7 ha of scrub from the photo (20.1 ha
        inside the boundary), on the gorse surface (17).
    -   No tree was removed for a tee shot.

## Scorecard

Club scorecard (`Old-MacDonald-Scorecard.webp`, undated, release
`pacific-dunes-data`, read 2026-10-21). Every row adds up to its printed
totals; the yardages, pars and men's stroke index agree with GolfPass. OSM's
hole `handicap` tags are the Orange (women's) row.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 34 | 4 | 4 | 3 | 4 | 4 | 5 | 4 | 5 | 4 | 37 | 71 |
| HCP | 11 | 15 | 9 | 1 | 17 | 3 | 5 | 13 | 7 | | 6 | 4 | 16 | 18 | 14 | 12 | 2 | 10 | 8 | | |
| Black | 341 | 181 | 375 | 504 | 160 | 555 | 363 | 181 | 416 | 3076 | 465 | 445 | 237 | 346 | 370 | 535 | 455 | 546 | 469 | 3868 | 6944 |
| Built | 339 | 174 | 366 | 518 | 156 | 553 | 373 | 186 | 404 | 3069 | 473 | 466 | 245 | 346 | 370 | 549 | 473 | 542 | 461 | 3925 | 6994 |

Men's ratings and slopes: Black 74.4/134, Green 6,320 yd 71.4/127, Gold
5,658 yd 67.8/117, Orange 4,985 yd 65.1/112, Royal Blue 4,040 yd 62.6/104.
Green, Gold, Orange and Royal Blue are in `scorecard.csv` but not built.

## Default tee

Black (developer, 2026-10-21). The 4.1 default would be Green (closest to
6,300 yd), but the OSM lines start on the tees, and measured from there the
course matches the Black card: 7,143 yd from the line starts against 6,944
Black and 6,320 Green.

## The developer's calls

-   2026-10-21: "the tees are at the end of the red line" (the OSM line
    starts); Black tees, with holes 1, 13 (and Sheep Ranch 3) fixed against
    the photo and flagged; the logo (a tweed flat cap and pipe, for C.B.
    Macdonald); the standing defaults; one shared release.
-   Inherited from Bandon Dunes: wind 8-16 mph, theme `bandon_dunes`.

## New pipeline keys or theme

None (see Pacific Dunes). Course-folder helpers: `make_tees_linestart.py`
(Black boxes on the line starts), `split_double_greens.py` (the 5/10 green).

Files outside the four course folders (all new, per course; the developer
agreed 2026-10-21): `assets-src/course_logos/old_macdonald.py`,
`game/public/sprites/logos/old_macdonald.png`,
`game/public/sprites/cards/old_macdonald.png`,
`game/public/sprites/title/old_macdonald.png`.

## Requests to the design chat

1.  Add Old Macdonald to the daily rotation and move
    `data/old_macdonald/tests/old_macdonald.test.ts` into `game/tests/unit/`.
2.  A split double green is shaped as two greens (s07), each blending to the
    terrain at its edge, which leaves a seam across the shared green: a light
    band in the art and a small ridge between the parts. Shaping partner
    greens (touching greens, as `greenPartners` finds them) as one surface
    would remove it; Langdon Farms 9/18 has the same seam.
3.  The card's bushes (Pacific Dunes request 2).

## Open items

Details are in `data/old_macdonald/validation_report.md`.

1.  **Tee boxes on the line starts** (15 holes): 12 x 8 m boxes, the size
    the course chat's. Recommend keeping them.
2.  **Holes 1 and 13:** the line starts are 16-17 % beyond the Black card;
    the boxes stand 49 and 54 m ahead, where the card distance falls on the
    line. Recommend confirming, or saying where the tees are.
3.  **Flags 3-5 %:** 2 (-4.1 %), 11 (+4.7 %), 12 (+3.3 %), 16 (+4.0 %),
    measured from the line starts. Recommend accepting.
4.  **Double green 5/10**, cut in two between the holes' OSM pins. Recommend
    confirming that the two holes share it.
5.  **Hole 8's pin** at the centre of the 69 m Biarritz green (OSM's was 16 m
    off it).
6.  **Gorse** (32,138 bushes, 20 ha inside the boundary): the densest of the
    three. Recommend playing a few holes, then saying whether it is too much.
7.  **Course card hole 5** (the Short). The course chat's pick.
8.  **The north photo tile's JPEG** goes in the release (see Pacific Dunes).

## Lessons

The shared lessons are in `docs/courses/pacific_dunes.md`.

-   **A course whose OSM lines all run 8-30 % long against the default set
    may be mapped from the back tees.** Sum the lines against every card
    column first; here they matched Black within 3 %.
-   **OSM `handicap` tags can be a different row of the card** (here the
    Orange stroke index). s06 uses the card.
