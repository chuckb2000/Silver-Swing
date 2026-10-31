# Kwiniaska Golf Club

Course id: `kwiniaska` (data folder `data/kwiniaska/`), branch `course/kwiniaska`.

## Build summary

Started overnight 2026-10-30/31 by a course chat under the developer's "make the calls yourself,
log every call", and finished by a second chat on 2026-10-31. OSM maps the whole course (18 hole
lines whose pars match the card, the greens, fairways, bunkers, three ponds and most tee boxes);
nothing was traced. Every download came through the GitHub Actions fetch workflow (release
`data-kwiniaska`): the Overpass export, the USGS 3DEP 1 m DEM and two lidar tiles of
`VT_Statewide_A23` (flown 21 April 2023, leaf-off, class 1 only), the VCGI leaf-off orthophoto and
NAIP. Two tee sets, Black (the tips, default) and Gold. New theme `kwiniaska` and a Holstein logo.
Gold is within 8 % of the card on every hole (5,148 yd built against 5,235); Black is 5,583 against
5,810, with five holes 8.4-11.9 % short because their Black boxes aren't mapped (accepted, open
item 1). `course_play.test.ts`, `courses.test.ts` and `pins.test.ts` with `-t kwiniaska`: 17 passed. Every
hole was looked at in the game from Gold, and holes 1-10 from Black. Branch test totals are in the
pull request.

## Facts

-   **Location:** Spear Street, Shelburne, Chittenden County, Vermont, on a ridge south of
    Burlington looking over the Champlain Valley. Public. `state` VT.
-   **Design:** A. Bradford Caldwell (1964, for the family's dairy farm); redesigned by P.B. Dye,
    new par-70 layout opened May 2020 (club site, 2021 club handbook; unverified beyond those).
-   **UTM zone:** 18 N (EPSG:32618). World 1,024 x 1,280 m (x0 643040, y0 4916547): the OSM
    boundary (way 65856105, 562 x 881 m) plus about 120 m of scenery; the Kwini Club practice
    facility to the north fits inside and is out of bounds. Theme `kwiniaska`. Wind 2-10 mph.
-   **Data** (release `data-kwiniaska`; `make fetch NAME=kwiniaska`):
    -   OSM: the workflow's Overpass export, `raw/overpass.geojson` (in git).
    -   Elevation: USGS 3DEP 1 m DEM tile `USGS_1M_18_x64y492_VT_Statewide_A23`, clipped to the
        world + 100 m (`raw/USGS_1M_kwiniaska.tif`). 66-118 m.
    -   Lidar: tiles N2107E4445 and N2093E4445 of VT_Statewide_A23 (A23 tile names are tile
        centres in Vermont State Plane metres), each clipped to the world + 100 m into `raw/laz/`;
        class 1 only (no vegetation classes).
    -   Photo: VCGI Color 2021-2025 leaf-off orthophoto at 0.5 m (`raw/vcgi_05m.tif`) for tree
        types and checking; NAIP (`raw/naip_05m.tif`) for checking only.
-   **Water:** every penalty area red (standing default): the three OSM ponds (OSM tags them
    yellow) and Munroe Brook across holes 12-15, a lidar channel pending the developer (open
    item 3). Out of bounds: the OSM boundary; the practice facility (OSM w1228417008) is dropped
    and out of bounds.
-   **Trees:** 8,790 from the lidar (1,136 inside the course), median 17.2 m, max 33.2 m; 314 tops
    on buildings dropped, 4 on playing surfaces, 3 from tee shots (5 Black twice, 18 Black). Types
    from the leaf-off photo (new optional `tree_type_ortho` key): a crown whose core is dark green
    is a conifer, 1,395 of them; the class-1 lidar's last-return split had called the white-pine
    and hemlock rows broadleaves.

## Scorecard

The club's printed scorecard (Golf Associates, (c) 2024), supplied by the developer 2026-10-31
(`data/kwiniaska/raw/card/kwiniaska_scorecard.png`). Every row adds up to its printed totals. It
matches the GolfPass and 18Birdies rows used before on par, men's stroke index, Black and Gold, and
corrects the unbuilt White (1, 3, 11) and Gold/White (8, 18) columns. The card has no ratings:
18Birdies' are used. The older par-72 card (Blue 6,848) is the pre-2020 Caldwell layout and is not
built.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 3 | 5 | 3 | 5 | 5 | 3 | 35 | 4 | 4 | 4 | 3 | 3 | 5 | 4 | 4 | 4 | 35 | 70 |
| HCP | 5 | 13 | 7 | 15 | 1 | 9 | 3 | 11 | 17 | | 2 | 8 | 16 | 18 | 12 | 4 | 10 | 6 | 14 | | |
| Black | 355 | 208 | 397 | 118 | 564 | 172 | 460 | 480 | 129 | 2883 | 398 | 361 | 321 | 123 | 192 | 503 | 340 | 299 | 390 | 2927 | 5810 |
| Built | 325 | 197 | 377 | 104 | 559 | 157 | 437 | 466 | 114 | 2736 | 385 | 351 | 302 | 128 | 174 | 506 | 342 | 286 | 373 | 2847 | 5583 |
| Gold | 335 | 185 | 337 | 101 | 510 | 168 | 430 | 456 | 118 | 2640 | 387 | 307 | 256 | 111 | 180 | 420 | 330 | 282 | 322 | 2595 | 5235 |
| Built | 325 | 190 | 320 | 103 | 498 | 161 | 435 | 461 | 114 | 2607 | 378 | 292 | 248 | 116 | 180 | 409 | 332 | 286 | 300 | 2541 | 5148 |

Men's ratings/slopes (18Birdies): Black 68.1/120, Gold 65.1/113, White 62.2/104. Black/Gold
(5,446), Gold/White (4,855) and White (4,493) are in `scorecard.csv`, not built. Women's handicap
(card): 5, 15, 13, 9, 1, 11, 3, 7, 17 / 10, 2, 8, 16, 12, 6, 4, 14, 18.

## Default tee

Black, the longest set (developer, 2026-10-31, DECISIONS.md "The default tees are the longest
set"; `courses.test.ts` checks it). The overnight rule of 2026-10-30 said the second set (Gold);
the later call wins. Gold stays playable.

## The developer's calls

-   2026-10-30 (overnight rules): build the back set and the next one forward, both playable; make
    the stop-and-ask calls and log them; full permission for an original logo and a new theme.
-   2026-10-31: the default tee is the longest set (main).
-   2026-10-31: the club's printed scorecard (photo supplied): the par-70 card, its yardages and
    stroke index.
-   Standing defaults: every penalty area red, out of bounds = the OSM boundary, range out of
    bounds.

## Developer's calls pending

Made by the course chats under the overnight "make the call"; each can be reversed. Full text in
`data/kwiniaska/validation_report.md`.

1.  **The par-70 card** (PB Dye, 2020) is built, not the par-72 Caldwell card. Confirmed by the
    club's printed card (developer, 2026-10-31).
2.  **Default Black** rather than Gold (above).
3.  **Black on 1, 4, 6, 9 and 14 accepted 8.4-11.9 % short** (`checks.json` yardage entries): no
    Black box in OSM, no convincing lidar pad, and the photo shows road, woods, car park or cart
    path directly behind the line start.
4.  **Munroe Brook** added as a red penalty area from the lidar channel (`approved: pending`).
5.  **Hole 5 Black** tees from the box at the start of hole 4's line (-0.9 %).
6.  **Hole lines 12, 15 and 18** start 56-74 m from the Gold box that matches the card; measured
    from that box.
7.  **Theme, logo and card hole** (13, rotating 3, 7, 16): course chat's choices.
8.  **Green 17 without bumps** (`green_tilt`, bumps 0): with one bump this small green (fitted tilt
    6.2 %) kept only its centre pin and failed `pins.test.ts`; now 3.8 % at most.
9.  **The rebuild's 67 extra trees** on the south edge of the world (outside the course): the
    first chat's lidar clip wasn't in `release.json`; the reproducible clip is used.

## New pipeline keys or theme

-   New optional key `tree_type_ortho` (s05, `pipeline/s05_trees.py`, +33 lines): tree types from
    a leaf-off orthophoto (a dark-green crown core is a conifer). No-op without the key, so no
    finished course changes (they are pinned in any case).
-   New theme `kwiniaska`: `assets-src/palettes/kwiniaska.json` (Champlain Valley ridge at first
    colour: fescue-gold rough) and `assets-src/trees_kwiniaska.py` (sugar and red maple, paper
    birch, eastern white pine, hemlock); sheets built with `build_assets.py --theme kwiniaska`.
-   Logo: `assets-src/course_logos/kwiniaska.py`, a Holstein's head (original; the club's own logo
    was fetched only to avoid it).

## Open items

1.  **Black boxes on 1, 4, 6, 9 and 14.** The printed card confirms the Black yardages, so the
    boxes really are missing from the data. Recommendation: keep as built, or trace the five boxes
    in QGIS over `raw/vcgi_05m.tif` (or send Google screenshots of those tee areas with control
    points) if Black matters.
2.  **Stroke index:** settled by the printed card (the 18Birdies index already used).
3.  **Munroe Brook penalty area** pending. Recommendation: approve (it follows the creek in the
    photo).
4.  **Pond colours:** OSM says yellow, built red (standing default). Recommendation: keep red.
5.  **3-8 % flags** on Black 2, 3, 7, 10, 12, 13, 17, 18 and Gold 3, 6, 9, 11, 12, 13, 18.
    Recommendation: accept.

## Lessons

-   Put every lidar clip into `release.json` as it is made. The first chat's clips weren't, so the
    second chat's rebuild came out with a slightly different tree set and had to be explained.
-   On a course renovated after its OSM mapping, check that the missing back tees aren't simply
    absent on the ground before searching the lidar: here road, woods and the car park sit right
    behind the line starts.
-   Run `pins.test.ts -t <id>` with the course test, not only in the full suite: green 17 failed it
    and nothing else caught it.
-   Check `main` for new developer calls before handing off: the default-tee rule changed during
    the overnight build and is enforced by a test.
