# Wannamoisett Country Club

Course id: `wannamoisett` (data folder `data/wannamoisett/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.19 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Wannamoisett Country
Club, Rumford RI (18 holes, par 69, Blue and Black tees), section
11.19, branch `course/wannamoisett`. New `seekonk` theme (very early
fall). Pipeline gained `roof_last_share` (s05: roofs of unmapped houses
in class-1 lidar are not trees) and `join_boundary` now fills a mapped
pond cut out of the course; every other course rebuilds as
committed. 398 unit tests and 4 Playwright tests pass; 416 unit
and 4 Playwright tests pass on main with Waverley merged.

## Facts, scorecard and open items

Built by a course chat (2026-10-19) following docs/COURSE_BUILD.md;
details in DECISIONS.md ("Wannamoisett Country Club") and
data/wannamoisett/validation_report.md.

-   **Location:** 96 Hoyt Avenue, Rumford (East Providence), Providence
    County, Rhode Island, near the Seekonk River. `state` RI. Course id
    `wannamoisett` (logo: a hockey skate, design chat).
-   **Design:** Willie Campbell (nine holes, 1899); Donald Ross (18 holes,
    1914; revamped 1926). Host of the 1931 PGA Championship and the
    Northeast Amateur.
-   **UTM zone:** 19N (EPSG:32619). World 1,024 x 1,280 m. Theme
    `seekonk` (very early fall: about a third of the leafy trees are maples
    starting to turn yellow or orange). Wind 2-10 mph.
-   **Data:** OSM via Overpass Turbo (complete apart from pins and the pars
    of 10-18); USGS 3DEP 1 m DEM and the 2022 USGS RI statewide lidar
    (flown leaf-off, March 2022), release `data-wannamoisett`.
-   **Water:** two ponds, both red (developer): beside 14 (cut out of the
    OSM course relation; `join_boundary` puts it back inside the boundary)
    and across 1 and 9.
-   **Trees:** 5,356 from lidar class 1, 728 on the course (15 % pines);
    1,824 roofs of unmapped houses dropped (`roof_last_share`).
-   **Scorecard** (GolfPass and the developer's screenshot, unverified; no
    club card. Blue 71.3/132, Black 72.8/135):

  -------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     4   4   3   4   4   4   4   3   4   34    4   4   3   4   4   3   4   5   4   35    69
  HCP     9   3   17  1   11  7   13  15  5         6   10  16  14  8   18  2   12  4
  Blue    420 456 127 429 364 415 335 175 428 3149  399 386 200 361 353 187 426 533 423 3268  6417
  Built   418 450 127 429 364 419 337 174 431 3149  393 383 200 359 353 187 424 527 422 3248  6397
  Black   430 505 137 438 372 437 345 190 453 3307  421 391 211 383 365 196 444 558 456 3425  6732
  Built   418 503 137 429 372 437 337 191 456 3280  416 383 195 380 360 196 442 557 445 3374  6654
  -------------------------------------------------------------------------------------

The club website now lists Black 6,901 / Blue 6,430 / White 6,132 after
new tees were built; no per-hole figures. Green and Gold not built.

-   **Default tee:** Blue (developer); Black also built.
-   **Known open items:** data/wannamoisett/report_notes.md (scorecard
    unverified; Black 12 -7.4 %; pins at green centres; tree type
    off the course unverified; all accepted by the developer).
