# Waverley Country Club

Course id: `waverley` (data folder `data/waverley/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.18 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Waverley Country Club,
Milwaukie OR, branch `course/waverley` from main: 18 holes, Blue tees,
new `pnw_club` theme. OSM had no holes: traced from the OSIP 2024
orthoimagery and DOGAMI lidar, corrected by the developer in the tracing
desk. The Willamette and the pond are red penalty areas; hole 11's green
keeps its slope (`green_tilt`); hole 17 accepted short (developer). Other
courses rebuild unchanged. 394 unit tests and 4 Playwright tests pass.
Section 11.18; open items in
data/waverley/report_notes.md.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) on branch `course/waverley`; details in
DECISIONS.md ("Waverley"), data/waverley/validation_report.md and
report_notes.md.

-   **Location:** 1100 SE Waverly Dr, Milwaukie, Clackamas County, Oregon, on
    the east bank of the Willamette. `state` OR. Course id `waverley` (logo
    exists). Club founded 1896; Jack Moffat's routing (1898), H. Chandler
    Egan's current routing, bunkers and greens (1912-1924), restoration by
    Gil Hanse (c. 2012).
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,792 m.
-   **Layout:** 18 holes, par 72, Blue tees (developer). The Willamette
    beside the course is a red penalty area (a 60 m strip inside a grown
    boundary; beyond it out of bounds); the pond by 11-13 is red. Hole 15
    plays north; holes 9 and 10 share a tee area by the clubhouse.
-   **Data:** OSM (boundary, fairways, pond, clubhouse only); greens, tees,
    bunkers and hole lines traced from the OSIP 2024 orthoimagery and the
    DOGAMI DEM by the course chat and corrected by the developer in the
    tracing desk (`data/waverley/desk/`); DOGAMI DTM and canopy height model;
    club website scorecard. Originals in the GitHub release `waverley-data`.
-   **Theme:** `pnw_club` (pnw with cleaner mown turf and whiter sand). Wind
    1-7 mph. Trees: 7,852 from lidar (860 inside the course), types from
    crown shape. Hole 11's green slopes hard back to front (`green_tilt`
    3.5 %).
-   **Scorecard** (club website, screenshot from the developer, 2026-10-19):

  ---------------------------------------------------------------------------------------------------------
  Hole     1   2   3   4   5   6   7   8   9   Out    10  11  12  13  14  15  16  17  18  In     Total
  -------- --- --- --- --- --- --- --- --- --- ------ --- --- --- --- --- --- --- --- --- ------ ------
  Par      4   4   4   4   5   3   4   5   3   36     4   3   4   5   3   4   3   5   5   36     72
  HCP      11  13  7   9   3   15  5   1   17         12  14  6   4   16  2   18  8   10
  Blue     324 392 347 406 451 157 373 568 119 3,137  400 156 400 491 137 354 215 490 558 3,201  6,338
  Built    325 413 356 427 449 161 379 567 121 3,198  401 160 403 485 137 353 213 409 539 3,100  6,297
  ---------------------------------------------------------------------------------------------------------

    Ratings/slopes (card): Black 72.8/135 (6,668, par 71), Blue 71.2/130,
    White 69.1/128 (5,913). Black and White not built.

-   **Default tee:** Blue (the only set built).
-   **Hole 14:** five ring bunkers (moved 1.5 m out, `data/waverley/make_hole14.py`)
    around a round green the developer shaped in the desk, with fairway
    between green and sand (developer).
-   **Accepted by the developer (2026-10-19):** hole 17 plays 409 yd vs 490
    (-16.6 %) from the developer's Blue tee.
-   **Known open items:** holes 2, 4, 18 are flags
    (data/waverley/report_notes.md).
