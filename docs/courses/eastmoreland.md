# Eastmoreland Golf Course

Course id: `eastmoreland` (data folder `data/eastmoreland/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.14 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Eastmoreland Golf Course,
Portland, OR, on branch `course/eastmoreland`: 18 holes from OSM + DOGAMI
lidar, Blue default, every hazard red (lake, pond, creek traced from
lidar), the Crystal Springs Rhododendron Garden in flower (3,164
flowering-shrub sprites, `garden`), the two-part boundary joined across SE Bybee Blvd
(`join_boundary_parts`). Other courses rebuild unchanged. 299 unit tests
and 4 Playwright tests pass. Section 11.14; open items:
data/eastmoreland/report_notes.md; request:
docs/requests/eastmoreland_design_requests.md.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) on branch `course/eastmoreland`; details in
DECISIONS.md ("Eastmoreland"), data/eastmoreland/validation_report.md and
report_notes.md.

-   **Location:** 2425 SE Bybee Blvd, Portland, Multnomah County, Oregon (a
    City of Portland course). `state` OR. Course id `eastmoreland` (logo
    exists). H. Chandler Egan, 1918 (club scorecard).
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 2,048 m (the 2,048 m limit
    binds: 53 m of scenery north and south).
-   **Layout:** 18 holes, par 72, in two parts either side of SE Bybee Blvd
    (front nine south, back nine north, joined into one OB line,
    `join_boundary_parts`). Crystal Springs Lake (holes 11, 12, 13, 17, 18), a
    pond (16/18) and Crystal Springs Creek are red penalty areas (developer).
    The Crystal Springs Rhododendron Garden on the lake's peninsula is out of
    bounds and full of flowering shrubs (3,164 `c: 3` sprites, `garden`).
-   **Data:** OSM (developer's Overpass Turbo export); DOGAMI bare-earth DTM and
    canopy height model (release `data-eastmoreland`); creek channel and hole
    18 Blue tee from the lidar DTM.
-   **Theme:** `pnw`. Wind 1-7 mph. Trees: 12,180 from lidar (2,016 inside the
    course); conifer/deciduous from crown shape.
-   **Scorecard** (club card, Golf ScoreCards Inc. 7/2007, from the developer;
    GolfPass lists a later card, open item):

  ---------------------------------------------------------------------------------------------------------
  Hole     1   2   3   4   5   6   7   8   9   Out    10  11  12  13  14  15  16  17  18  In     Total
  -------- --- --- --- --- --- --- --- --- --- ------ --- --- --- --- --- --- --- --- --- ------ ------
  Par      4   4   4   4   3   5   4   3   5   36     4   5   3   5   4   4   4   3   4   36     72
  HCP      13  3   11  9   17  1   5   15  7          14  8   18  2   12  10  4   16  6
  Blue     311 447 337 347 210 497 410 227 497 3,283  334 469 167 463 383 381 423 169 457 3,246  6,529
  White    292 427 317 325 175 489 391 202 472 3,090  325 443 140 446 365 364 392 147 394 3,016  6,106
  ---------------------------------------------------------------------------------------------------------

    Ratings/slopes (card): Blue 71.0/124, White 69.3/115, Red (women's par 74,
    5,646 yd, not built) 72.5/124.

-   **Default tee:** Blue (developer). Measured (adjusted) totals: Blue
    6,507 yd (card 6,529), White 6,104 yd (card 6,106).
-   **Accepted by the developer (2026-10-19):** hole 17 White plays from
    the Blue box (+13.3 %); the hole 18 Blue tee (lidar pad) and the creek
    channel (lidar); two trees removed on hole 11's Blue tee shot; course
    card hole 17; the 2007 scorecard stays the card (GolfPass lists a later
    one).
-   **Known open items:** hole 13 Blue -3.0 % (flag); tree types from crown
    shape (data/eastmoreland/report_notes.md).
