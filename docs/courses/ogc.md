# Oregon Golf Club

Course id: `ogc` (data folder `data/ogc/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.16 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Oregon Golf Club,
West Linn, OR (`ogc`), 18 holes from OSM and DOGAMI lidar, Blue and
White tees, a 1,280 x 2,304 m world, the driving range out of bounds
and drawn as rough; branch `course/ogc` (merged after `course/tualatin`). Pipeline keys `remove_wires` (s05) and
`range_art` (s09, s09b, s10); every other course rebuilds unchanged.
338 unit tests and 4 Playwright tests pass. Open items: section 11.16.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) following docs/COURSE_BUILD.md;
details in DECISIONS.md ("Oregon Golf Club") and
data/ogc/validation_report.md.

-   **Location:** West Linn (Stafford area), Clackamas County, Oregon, on
    the slopes of Pete's Mountain above the Willamette River. `state` OR.
    Course id `ogc` (logo: great blue heron).
-   **Design:** Peter Jacobsen and Jim Hardy with Ken Kavanaugh (1992;
    GolfPass).
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 2,304 m (taller than
    the 2,048 m limit: the course is 2,120 m north-south; developer
    approved). Theme `pnw`. Wind 1-7 mph.
-   **Data:** OSM via Overpass Turbo (all 18 hole lines, pins and 70 tee
    boxes mapped); DOGAMI bare-earth DTM and canopy height model (1 m,
    release `ogc-data`). Power lines removed from the canopy before the
    tree search (`remove_wires`).
-   **Water:** Hershiser Reservoir (holes 7 and 9), the hole 8 creek and
    ponds and the hole 4 pond, all red (developer).
-   **Driving range** (target greens P3-P9): out of bounds, drawn by
    the developer in the tracing desk, drawn as rough with OB stakes
    (`range_art`; developer: the range is rough on the ground). Hole 9's
    fairway was also corrected there (`data/ogc/desk/`).
-   **Trees:** 12,289 from lidar, 2,902 on the course (46 % conifers).
    Every tee shot to the middle of the fairway is clear (s06b removed
    nothing).
-   **Scorecard** (GolfPass, retrieved 2026-10-19, unverified; no printed
    card available). Blue 72.5/136, White 69.7/133.

  -------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     5   4   4   3   5   4   4   3   4   36    4   4   3   5   4   5   4   3   4   36    72
  HCP     3   15  11  17  5   1   7   13  9         18  8   16  12  10  6   4   14  2
  Blue    523 341 404 162 555 435 384 193 325 3322  361 368 155 484 398 517 410 182 432 3307  6629
  Built   520 343 398 164 567 435 380 187 325 3319  343 370 152 479 392 515 403 184 434 3272  6591
  White   491 304 384 162 504 408 361 185 308 3107  324 345 131 443 363 488 383 182 314 2973  6080
  Built   488 306 378 164 523 408 357 187 315 3126  337 346 128 438 356 486 377 184 315 2967  6093
  -------------------------------------------------------------------------------------

Black (7,070), Green (5,313), Yellow (4,204) and the combo tees are in
scorecard_full.csv, not built.

-   **Default tee:** Blue (developer); White is built too.
-   **Accepted by the developer (2026-10-19):** the hole 7 fir in front
    of the green removed (`drop_trees`); hole 16 White tee from the box
    beside the line; flags on 5 White and 10 Blue/White; course card
    hole 8; the world's load time; no range balls (stakes only); the
    parts of ponds W7/W8 outside the boundary stay out of bounds.
-   **Known open items:** scorecard unverified
    (data/ogc/report_notes.md).
