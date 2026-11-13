# The Olympic Club (Lake)

Course id: `olympic_club_lake` (data folder `data/olympic_club/`, one layout), branch
`course/olympic_club`. The Cliffs, the club's nine par 3s, is its own course on the same
branch: `data/olympic_club_cliffs/`, `docs/courses/olympic_club_cliffs.md`.

## Build summary

Built by a course chat on 2026-11-13, at the developer's request (the Lake instead of
Pebble Beach, plus the Cliffs). OSM maps all three of the club's courses; the Lake is
built inside its own OSM boundary (way 1417078425), the Ocean course is not built and its
holes are dropped, and the neighbours' features (SFGC, TPC Harding Park, Lake Merced) are
dropped. Elevation from the USGS 3DEP 1 m DEM and trees from 3DEP lidar (CA San Francisco
B23, class 1, with roofs dropped by `roof_last_share`), all fetched by the GitHub Actions
workflow; the NAIP photo did not arrive, so nothing was checked against a photo. Tee set
built: Champ (the longest, the post-2023 Hanse card); Black also playable. New theme
`olympic_club` (dense cypress, pine and eucalyptus, deep fog-belt greens); logos for the
club (a cable car on its rails, for the downtown clubhouse on the Powell Street line) and the Lake (a wind-bent cypress over Lake
Merced). All 18 holes pass after the virtual tees moved within their boxes: 7,178 yd built
against 7,214.

## Checks

- `course_play.test.ts -t olympic_club`: 22 passed (the Lake and the Cliffs).
- `npm test`: 1769 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole drawn sits out" fail until `make land` adds the courses to the daily rotation.
- `npm run e2e`: 17 passed.
- Both data folders pinned; a `--fresh` rebuild of each left git clean.
- Every hole looked at in the game: all 18 Lake holes and all 9 Cliffs holes (tee view, overview, first shot, putting view).

## Facts

-   **Location:** 599 Skyline Boulevard, San Francisco, California, between Lake Merced
    and the Pacific. `state` CA.
-   **Design:** Willie Watson and Sam Whiting (1924), Whiting's rebuild (1927), Robert
    Trent Jones Sr. (1954), Bill Love (2009), Gil Hanse (2023). Five U.S. Opens.
-   **UTM zone:** 10 N (EPSG:32610). World 1,792 x 1,792 m, origin (543733, 4172760),
    shared with the Cliffs. Theme `olympic_club` (new). Wind 3-14 mph (open coast).
-   **Data** (release `data-olympic_club`; `make fetch NAME=olympic_club`; fetched by the
    GitHub Actions workflow 2026-11-13): OSM standard Overpass export; 3DEP 1 m DEM; 3DEP
    lidar CA_SanFrancisco_B23, 11 tiles in San Francisco CS13 (EPSG:7131), classes 1, 2, 7,
    9, 20 delivered (no vegetation classes), clipped with their CRS kept (`--keep-evlrs`).
-   **Water:** none in play. OB: the Lake's OSM boundary; the range is OB.
-   **Trees:** 4,148 lidar trees (1,690 inside the club), median 9.8 m, tallest 40.3 m;
    14 dropped on playing surfaces, 4 from tee shots (Lake 2, 5, 15).

## Scorecard

Third-party, unverified: GolfPass's Lake card (course 14938), read 2026-11-13, every row adds
up. Ratings: Champ 76.2/143, Black 75.2/141 (18Birdies, against 7,214 and 7,024); GolfPass's
tee table prints 76.7/145 and 75.9/143 against 7,232 and 7,050.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 35 | 4 | 4 | 4 | 3 | 4 | 3 | 5 | 5 | 4 | 36 | 71 |
| HCP | 13 | 5 | 11 | 3 | 1 | 7 | 17 | 15 | 9 |  | 10 | 4 | 8 | 16 | 6 | 18 | 2 | 14 | 12 |  |  |
| Champ | 533 | 436 | 255 | 421 | 502 | 492 | 316 | 209 | 455 | 3619 | 426 | 442 | 457 | 195 | 428 | 155 | 620 | 523 | 349 | 3595 | 7214 |
| Built | 520 | 435 | 260 | 430 | 502 | 485 | 311 | 209 | 444 | 3596 | 430 | 443 | 453 | 194 | 417 | 156 | 618 | 522 | 349 | 3582 | 7178 |

## Default tee

Champ: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the Olympic Club Lake instead of Pebble Beach; add the Cliffs; the Cliffs
    as a separate course (it couldn't be a layout: below).

Course chat's calls (listed for the developer):

-   OSM tags the 17th par 4; the current card has it a par 5 (523 yd), so it is tagged 5.
-   The Ocean course's hole lines are dropped; its ground stays as club scenery.
-   `golf=path` ways copied as cart paths; the clubhouse copied as a building.
-   `tee_shot_margin_m` 0.5: the tee-shot check passed the 7th while the game's drive
    clipped a canopy 20 m out.
-   Card: the 18th green (rotating 18, 3, 8, 15).

## Open items

1.  Third-party card and ratings (two sources differ by 0.5-0.7 on rating); a photo of the
    printed card would settle them.
2.  No photo checked: the workflow's NAIP export didn't arrive.
3.  Design-chat request: a site with `layouts` keeps only the largest boundary part
    (`common.play_boundary`), even with `join_boundary_parts`; that's why the Cliffs is a
    course of its own.

## Build history

-   2026-11-13: first build (course chat).
