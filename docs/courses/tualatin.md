# Tualatin Country Club

Course id: `tualatin` (data folder `data/tualatin/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.13 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Tualatin Country Club,
Tualatin OR (18 holes, par 72, Blue tees, `pnw`), section 11.13, on
branch `course/tualatin`. OSM had no hole lines or pins: the
developer gave the routing and the lines are drawn through the mapped
fairways (`data/tualatin/make_holes.py`). Pipeline gained
`red_water_osm` (the river is a red penalty area outside the
boundary) and `drop_trees` (four trees, on holes 8 and 13); every other
course rebuilds as committed. Approved by the developer and merged
2026-10-19.

2026-10-22 (developer): two more trees removed, in front of the hole 17
tee (a 30 m broadleaf by the pond and a 39 m fir), so six in all.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) following docs/COURSE_BUILD.md;
details in DECISIONS.md ("Tualatin Country Club") and
data/tualatin/validation_report.md.

-   **Location:** Tualatin, Washington County, Oregon, on a terrace above
    the Tualatin River. `state` OR. Course id `tualatin`.
-   **Design:** George Junor (the original nine, 1913, now the back
    nine); H. Chandler Egan (the second nine, 1919, now the front nine);
    redesign by Bob Cupp and John Fought (1992); later work by Dan
    Hixson (club history PDF).
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,536 m. Theme `pnw`.
    Wind 1-7 mph.
-   **Data:** OSM via Overpass Turbo (no hole lines or pins in OSM: the
    developer gave the routing, `data/tualatin/make_holes.py` draws the
    lines through the mapped fairways, `edits.json` adds them); DOGAMI
    bare-earth DTM and canopy height model (1 m, release `data-tualatin`).
-   **Water:** two ponds (holes 9 and 18) and the Tualatin River (holes
    7, 9, 10), all red; the river is a penalty area although it lies
    outside the course boundary (`red_water_osm`).
-   **Trees:** 9,018 from lidar, 1,743 on the course (39 % conifers);
    two firs in front of the hole 13 green, two broadleaves before the
    hole 8 green and a broadleaf and a fir in front of the hole 17 tee
    removed (developer, `drop_trees`). A drive down the centre of every par 4 and 5 is clear
    of trees (unit test).
-   **Scorecard** (GolfPass, retrieved 2026-10-19, unverified; no printed
    card available). Blue 70.4/130.

  -------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     4   4   4   4   3   5   4   4   5   37    3   5   4   4   4   3   4   4   4   35    72
  HCP     11  17  5   3   15  9   1   7   13        14  16  4   12  8   18  6   10  2
  Blue    339 285 384 398 200 518 390 346 498 3358  155 482 380 364 341 135 375 380 400 3012  6370
  Built   331 278 388 388 198 518 389 378 492 3360  168 483 372 371 337 132 384 389 400 3036  6396
  -------------------------------------------------------------------------------------

Black (6,700), White (5,940), Red (5,450) and Gold (4,364) are in
scorecard.csv, not built.

-   **Default tee:** Blue (the only set built). Holes 8 and 10 play
    from the back tees (developer): +9.2 % and +8.3 % on the Blue card.
-   **Known open items:** data/tualatin/report_notes.md (hole lines and
    pins are proposals from the developer's routing; scorecard
    unverified).
