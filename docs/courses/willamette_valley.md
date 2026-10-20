# Willamette Valley Country Club

Course id: `willamette_valley` (data folder `data/willamette_valley/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.15 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Willamette Valley
Country Club, Canby, OR ("Willamette Valley CC"), branch
`course/willamette_valley`: 18 holes, par 72, Blue tees, `pnw`, OSM +
DOGAMI DTM and canopy model; hole 13's green traced from the OSIP 2022
orthophoto, hole 3's Blue tee placed by the developer, the hole 9 and 14
fairways (tagged as tees in OSM) and the cart paths (`golf=path`)
relabelled in `edits.json`. Every hole within 3 % (6,513 yd vs 6,514).
No pipeline code changed. 319 unit tests and 4 Playwright tests
pass (after merging main with Eastmoreland). Section 11.15; open items:
data/willamette_valley/report_notes.md.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) on branch `course/willamette_valley`;
details in DECISIONS.md ("Willamette Valley"),
data/willamette_valley/validation_report.md and report_notes.md.

-   **Location:** 900 Country Club Place, Canby, Clackamas County, Oregon,
    on a terrace above the Willamette River. `state` OR. Course id
    `willamette_valley` (logo exists); card name "Willamette Valley CC".
    Shirley Stone, opened 1962 (golfn.com).
-   **UTM zone:** 10N (EPSG:32610). World 1,024 x 1,792 m. Theme `pnw`.
    Wind 1-7 mph.
-   **Data:** OSM (developer's Overpass Turbo export); DOGAMI bare-earth DTM
    and canopy height model (1 m, release `willamette-valley-data`); Oregon
    Statewide Imagery Program 2022 orthophoto (hole 13 green, hole 3 tee,
    checks); club scorecard PDF.
-   **Water:** five ponds, all red. The Willamette River (outside the
    boundary) is out of bounds.
-   **Trees:** 5,317 from the canopy model (1,671 on the course), type from
    crown shape; `tee_shot_margin_m` 0.5.

### Scorecard

(club card PDF, Golf ScoreCards Inc. 10/2023, from the
developer; every row adds up)

  ---------------------------------------------------------------------------------------------------------
  Hole     1   2   3   4   5   6   7   8   9   Out    10  11  12  13  14  15  16  17  18  In     Total
  -------- --- --- --- --- --- --- --- --- --- ------ --- --- --- --- --- --- --- --- --- ------ ------
  Par      4   5   3   4   4   5   4   3   4   36     4   5   4   3   5   3   4   4   4   36     72
  HCP      5   3   17  13  11  1   7   15  9          10  2   6   18  12  16  14  8   4
  Blue     385 535 162 347 369 551 361 180 393 3,283  366 545 383 151 470 201 353 365 397 3,231  6,514
  Built    392 534 162 353 365 539 356 183 403        371 544 390 149 463 196 353 364 398        6,513
  ---------------------------------------------------------------------------------------------------------

Black (7,017, 74.2/133), White (5,979), Orange (5,423), Yellow (4,702) and
Maroon (4,168) are on the card (`scorecard.csv`), not built. Blue rating/slope
71.6/129 (card).

-   **Default tee:** Blue (developer), the only set built.
-   **Developer's calls (2026-10-19):** Blue tees; hole 13's green is the one
    left of the pond (traced); hole 3's Blue tee on the fairway from the 2nd
    green (box placed at 162 yd, approved); practice greens are wrong greens;
    the maintenance no-play zone (14-16) is not modelled; OB = the course
    boundary.
-   **Accepted by the developer (2026-10-19):** course card hole 3; lidar
    year not recorded (tree types from crown shape). Notes in
    data/willamette_valley/report_notes.md.
