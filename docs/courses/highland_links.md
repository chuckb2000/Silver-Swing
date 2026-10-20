# Highland Links

Course id: `highland_links` (data folder `data/highland_links/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.5 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

second course **Highland Links**
(Truro, MA; 9 holes, par 35, coastal theme), section 11.5. Phase 0 of
docs/COURSE_BUILD.md (pipeline generalised; Oswego Lake rebuilds
unchanged apart from logged id lists), `state` in the course list,
surface 16 `ob_sand`, a `tiers` term in the green model, course card
(hole 9). 137 unit tests and 3 Playwright tests pass (rebased on main
with course select). Branch `course/highland_links`.

## Facts, scorecard and open items

Built by the course chat (2026-10-18/19) following docs/COURSE_BUILD.md;
details in DECISIONS.md ("Highland Links") and
data/highland_links/validation_report.md.

-   **Location:** 10 Highland Light Road, North Truro, Barnstable County,
    Massachusetts (Cape Cod National Seashore, on the bluff beside
    Highland Light). `state` MA. Course id `highland_links`.

-   **Design:** laid out by Willard Small (c. 1892); redesigned by
    J. Henry McKinley (1913).

-   **UTM zone:** 19N (EPSG:32619). World 1,024 x 768 m.

-   **Layout:** 9 holes, par 35, Blue tees only (developer). The club's
    card plays the back nine from White tees with other pars; not built.
    Rounds are 9 holes or 18 twice around.

-   **Data:** OSM via Overpass Turbo, edited by
    data/highland_links/make_edited.py (card pars, the developer's tees,
    hole 9 green, pins); USGS 3DEP 1 m DEM (MA_CentralEastern_2021_B21);
    2021 USGS leaf-off lidar vegetation points (NOAA Data Access Viewer).
    The large downloads are assets of the GitHub release
    `data-highland-links`.

-   **Theme:** `coastal` (golden fescue rough, pitch pine and scrub oak,
    beach, ocean), a mown-rough band (about 2.3 m, drifting in width) around
    each fairway, and Highland Light (OSM building parts, drawn 2x tall).
    Surface 16 `ob_sand` for the beach and sand cliffs.
    Wind 3-14 mph. Hole 9 has a two-tier green (green model `tiers`).

-   **Scorecard** (club scorecard PDF, Feb 2020, identical to the
    developer's printed card; rating/slope 67.2/116 from the club website,
    67.0/114 on the card):

  ------------------------------------------------------------------------
  **Hole**   1     2     3     4     5     6     7     8     9    **Out**
  ---------- ----- ----- ----- ----- ----- ----- ----- ----- ----- -------
  **Par**    4     5     3     4     4     5     3     4     3     **35**

  **HCP**    11    7     15    5     1     3     13    9     17

  **Blue**   250   460   160   379   380   464   171   353   136   **2,753**

  **Built**  260   449   164   376   383   460   168   351   133   **2,745**
  ------------------------------------------------------------------------

-   **Default tee:** Blue (the only set built).

-   **Known open items:** data/highland_links/report_notes.md (hole 1
    plays +3.8 % from the developer's tee; the hole 9 tier line is
    modelled; tree types from leaf-off lidar; mown band and fescue play alike).
