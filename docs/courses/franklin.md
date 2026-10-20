# Franklin Country Club

Course id: `franklin` (data folder `data/franklin/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.17 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Franklin Country Club,
Franklin MA (18 holes, par 71, Blue tees, `bayside`), section 11.17, on
branch `course/franklin`. Complete OSM layout (pins added at green
centres); USGS 3DEP DEM and leaf-off lidar (37,340 trees); all water
red, including Uncas Pond across 14 and Uncas Brook from the lidar
channel. Every hole within 3 % of the card. No pipeline change; other
courses untouched. 338 unit and 4 Playwright tests pass (after merging
main with Eastmoreland and Willamette Valley).

## Facts, scorecard and open items

Built by a course chat (2026-10-19) following docs/COURSE_BUILD.md;
details in DECISIONS.md ("Franklin Country Club") and
data/franklin/validation_report.md.

-   **Location:** 672 East Central Street, Franklin, Norfolk County,
    Massachusetts, on the Franklin-Wrentham line. `state` MA. Course id
    `franklin` (logo: turtle).
-   **History:** founded 1899 as the Franklin Rod and Gun Club; 18 holes
    laid out in the early 1920s by Wayne Stiles and John Van Kleek, later
    work by Phil Wogan and William F. Mitchell (countryclubmag.com, Golf
    Digest; unverified).
-   **UTM zone:** 19N (EPSG:32619). World 1,792 x 2,048 m (the 2,048 m
    limit). Theme `bayside`. Wind 1-9 mph.
-   **Data:** OSM (the developer's openstreetmap.org export, converted to
    Overpass GeoJSON by `data/franklin/osm_to_geojson.py`); USGS 3DEP 1 m
    DEM (MA_CentralEastern_2021_B21, tiles x30y466 and x30y467, clipped by
    `data/franklin/clip_dem.py`); the same project's lidar points (NOAA
    Data Access Viewer, flown 21 March 2021, leaf-off). Originals in the
    GitHub release `franklin-data`.
-   **Water:** all red (developer). Five OSM ponds, two more ponds OSM maps
    only as `natural=water`, Uncas Pond across the par-3 14th (outside the
    boundary, `red_water_osm`), Uncas Brook and an unnamed stream across 7,
    9 and 16 (penalty areas from the lidar channels). No internal out of
    bounds; the driving range is out of bounds.
-   **Trees:** 37,340 from lidar (3,633 on the course), 34 % conifers from
    the leaf-off returns. One broadleaf left of the 18th tee removed
    (approved).
-   **Scorecard** (Stymie, retrieved 2026-10-19, unverified; the club
    website has no card). Blue 72.3/128.

  -------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     4   4   4   3   4   4   5   3   4   35    4   4   4   4   3   5   3   4   5   36    71
  HCP     5   13  3   17  11  1   7   15  9         4   14  2   18  8   10  16  6   12
  Blue    414 357 418 144 365 429 538 178 404 3247  425 343 382 398 213 505 175 408 506 3355  6602
  Built   403 353 415 144 357 417 527 176 403 3195  418 342 375 404 211 505 176 401 503 3335  6530
  -------------------------------------------------------------------------------------

Black (6,745), Members (6,367), White (6,139), Gold (5,719), Red (5,496) and
Green (4,827) are in scorecard.csv, not built.

-   **Default tee:** Blue (developer), the only set built. Every hole within
    3 % of the card.
-   **Accepted by the developer (2026-10-19):** the unnamed stream and the
    two extra ponds as red penalty areas, the hole 18 tree removed, the
    Stymie scorecard until a printed card turns up, wind 1-9 mph, course
    card hole 8, the tree count and load time, pins at green centres.
-   **Known open items:** data/franklin/report_notes.md (scorecard and
    stroke index unverified).
