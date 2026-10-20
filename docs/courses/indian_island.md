# Indian Island Golf Course

Course id: `indian_island` (data folder `data/indian_island/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.11 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Indian Island Golf
Course, Riverhead NY (section 11.11), branch `course/indian_island`.
OSM mapped only holes 1-8: the rest was traced from NYS imagery and
lidar and corrected by the developer in a tracing desk page, which
also took every Blue tee. New `bayside` theme, `ob_highways` (Route 105
out of bounds), trees from the 2024 NYS lidar. Other courses rebuild
unchanged. 241 unit tests and 4 Playwright tests pass (after merging main with Langston). Open items:
section 11.11.4; request in docs/requests/indian_island_design_requests.md.

## Facts, scorecard and open items

### Facts

-   **Location:** Indian Island County Park, Riverhead, Suffolk County,
    New York, on the Peconic River where it opens into Flanders Bay.
    Suffolk County Parks course. `state` NY, course id `indian_island`.
-   **Design:** William F. Mitchell (1972).
-   **UTM zone:** 18N (EPSG:32618). World 1,792 x 1,024 m.
-   **Layout:** 18 holes, par 72. Holes 1-10 on the bay side, 11-18 west of
    Route 105 (Cross River Drive), which is out of bounds (`ob_highways`).
    Penalty areas are all red (developer): the river and bay strip along
    the shore and the inlet pond between 7 and 9.
-   **Data:** OSM (holes 1-8, hole 10's line and tee); hole 9, 10's green
    and fairway and 11-18 traced from the NYS orthoimagery and DEM by the
    course chat (`pipeline/propose_trace.py`) and corrected by the developer
    in the tracing desk (`data/indian_island/desk/`); NYS 2024 Long Island
    1 m DEM; NYS 2024 lidar (flown 25 March 2024, leaf-off) for 15,429 trees.
    Originals in the GitHub release `data-indian-island`.
-   **Theme:** `bayside` (cooler turf, yellower rough, white sand, estuary
    water, pitch pine, oak and maple). Wind 2-12 mph.

### Scorecard

(Suffolk County Parks card, PDF from the developer, 2026-10-19)

  ----------------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     4   5   4   4   3   5   4   3   4   36    5   3   4   4   4   5   4   3   4   36    72
  HCP     1   9   13  11  17  5   3   15  7         4   6   12  14  18  2   16  10  8
  Blue    454 504 370 384 188 496 429 172 395 3392  461 216 347 353 327 485 340 200 395 3124  6516
  Built   442 504 363 380 183 499 415 171 387 3344  451 213 342 339 320 462 340 200 384 3051  6395
  ----------------------------------------------------------------------------------------------

Ratings (county): Blue 71.5/126, White 69.4/122, Red 71.3/118. White
(6,077), Gold (5,787) and Red (5,545) are on the card, not built.

### Default tee

Blue, the only set built (developer).

### Known open items

(details in data/indian_island/validation_report.md)

1.  Holes 7 (-3.3 %), 13 (-3.9 %) and 15 (-4.7 %) are flags; none over 8 %.
2.  Card yellow stakes (5, 6, 7) not modelled: all red (developer).
3.  Driving range not mapped; plays as rough.
4.  E-5 drop on Route 105 measured from where the ball stopped (design request 1).
5.  Pins at green centres; a few lidar crowns on unmapped houses off the course.
