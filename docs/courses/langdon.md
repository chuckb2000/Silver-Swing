# Langdon Farms Golf Club

Course id: `langdon` (data folder `data/langdon/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.20 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Langdon Farms Golf Club,
Aurora OR (`langdon`; 18 holes, par 71, Tee 7, `pnw`), section 11.20, on
branch `course/langdon`. OSM had only hole 1: every other hole was traced
from the OSIP 2024 orthophoto and corrected by the developer in the
tracing desk, which also took every Tee 7 box. 9 and 18 share a double
green round the clubhouse pond; OR 551 between the course's two parts is
out of bounds (`join_boundary_parts` with separate features); the barns
on 8 and by 18 are drawn red (`building_colours`). Five holes are flags,
none over 8 %. Every other course rebuilds byte-identical.
Merged 2026-10-20 (developer: "merge any unmerged courses") and rebuilt
with the centred tees and rounded fairways; the smoke tests now find a
course on any page (request 1 in docs/requests/langdon_design_requests.md).

## Facts, scorecard and open items

Built by a course chat (2026-10-19) following docs/COURSE_BUILD.md and
docs/COURSE_TRACING.md; details in DECISIONS.md ("Langdon Farms Golf Club")
and data/langdon/validation_report.md.

-   **Location:** 24377 NE Airport Road, Aurora, Clackamas County, Oregon,
    between I-5 and NE Airport Road. `state` OR. Course id `langdon` (logo
    already made). Public.
-   **Design:** John Fought and Bob Cupp, 1995 (OGA, GolfPass).
-   **UTM zone:** 10N (EPSG:32610). World 1,024 x 2,048 m (the 2,048 m
    limit). Theme `pnw`. Wind 1-7 mph.
-   **Layout:** two parts either side of OR 551 (holes 10-15 west of it,
    the rest east), joined by a cart path under the highway; the highway
    strip is out of bounds. 9 and 18 share one green wrapped round the north
    end of the clubhouse pond (9 on the east side). The driving range plays
    in bounds, as rough (developer).
-   **Data:** OSM (the developer's Overpass export: boundary, hole 1, ten
    bunkers, cart paths, ponds); every other green, fairway, bunker and tee
    traced from the Oregon Statewide Imagery Program 2024 orthophoto (1 ft,
    exported as JPEG: TIFF exports failed) and corrected by the developer in
    the tracing desk (`data/langdon/desk/`); DOGAMI bare-earth DTM and canopy
    height model (1 m). Originals in the GitHub release `data-langdon`.
-   **Water:** the clubhouse pond (9, 18) and the pond between 12 and 13,
    both red (`red_water_osm`), and the creek on hole 7 between the fairway
    and the approach (red, from the lidar channel; not in OSM; developer confirmed 2026-10-20).
-   **Barns:** the barn on the left of the 8th fairway and the event barn by
    the 18th green are drawn barn red (`building_colours`); free relief, as
    for every building inside the boundary (developer).
-   **Trees:** 5,043 from the canopy model (799 on the course), type from
    crown shape.
-   **Scorecard** (club card, 2/2020, supplied by the developer; identical to
    GolfPass). Tees are named Tee 8 to Tee 1; Tee 7 71.5/133.

  -------------------------------------------------------------------------------------
  Hole    1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par     4   4   3   4   4   3   5   4   4   35    4   5   4   3   4   4   4   3   5   36    71
  HCP     13  11  17  9   7   15  3   1   5         12  2   4   18  14  10  8   16  6
  Tee 7   372 368 173 322 403 115 512 449 409 3123  365 607 425 166 379 340 411 204 502 3399  6522
  Built   396 373 166 330 400 117 508 440 428 3158  358 606 427 165 378 351 407 213 500 3405  6563
  -------------------------------------------------------------------------------------

Tee 8 (6,931, 73.7/133), Tee 5 (6,052), Tee 3 (5,246) and Tee 1 (4,190) are
in scorecard.csv, not built; Tee 6, 4 and 2 are combinations on the card.

-   **Default tee:** Tee 7 (developer), the only set built. Holes 1 (+6.4 %),
    3, 9, 15 and 17 are flags; none over 8 %.
-   **Known open items:** data/langdon/report_notes.md.
