# Langston Golf Course

Course id: `langston` (data folder `data/langston/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.10 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Langston Golf Course,
Washington DC (Kingman Lake), branch `course/langston` from main: 18
holes, Royal (default, the developer's "Blue") and White tees, new
`anacostia` theme (murky olive water, loblolly pine, oak, sycamore,
willow; no blossoms). The two OSM boundary parts are joined across
Kingman Lake as one red penalty area (`join_boundary`); hole 10 has a
back tee across the lake; the creek on 3 is a red penalty area from the
lidar; ten tees from lidar pads; a two-tier green on 13. Oswego Lake,
Highland Links and East Potomac rebuild byte-identical. 224 unit tests
and 4 Playwright tests pass. Section 11.10; open items in
data/langston/validation_report.md; requests in
docs/requests/langston_design_requests.md.

## Facts, scorecard and open items

### Facts

-   **Location:** 2600 Benning Road NE, on the west shore of Kingman Lake
    and on Kingman Island (Anacostia Park; National Park Service land run by
    the National Links Trust). Course id `langston`, `state` DC.
-   **History:** opened 1939 (front nine; George Parish, built by the CCC
    and WPA), back nine 1955. On the National Register of Historic Places.
    The holes are named after Black pioneers of American golf (card).
-   **Built as:** one world 1,536 x 1,536 m (UTM 18N, EPSG:32618), theme
    `anacostia`. Holes 1-9 and 14-18 on the mainland, 10-13 on Kingman
    Island; the part of Kingman Lake between them is a red penalty area
    inside the one out-of-bounds line (DECISIONS.md, Langston).
-   **Data:** OSM (Overpass Turbo export, release `data-langston`), DC GIS
    / OCTO 1 m lidar DEM and normalized surface model (release
    `data-washington-dc`, clipped), club scorecard PDF.
-   **Terrain:** low river terraces (0-10 m) with wooded bluffs to the
    north (up to 67 m in the National Arboretum, off the course).
-   **Water:** Kingman Lake (red) beside 10-12 and 14-18, a carry from the
    hole 10 back tee and over the par-3 13th; the creek across hole 3
    (red, from the lidar). The Anacostia east of the island is out of bounds.
-   **Hole 13:** two-tier green (developer): a small front tier 1.37 m
    (4.5 ft) below the bigger back tier; pin on the back tier.
-   **Trees:** 12,929 from lidar (3,143 inside the boundary), 34 % pines by
    crown shape.

### Scorecard

(club card PDF, supplied by the developer 2026-10-19)

  -------------------------------------------------------------------------------------------
  Hole         1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------------ --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par          5   4   5   3   4   4   4   3   4   36    5   4   4   3   4   3   5   4   4   36    72
  Handicap     10  9   1   16  17  12  18  8   5         6   14  3   11  15  7   2   13  4
  Royal        472 395 508 157 350 398 341 205 400 3226  538 406 444 175 341 203 540 396 383 3426  6652
  White        465 376 492 157 350 358 328 194 388 3108  438 383 412 152 305 170 508 340 345 3053  6161
  Built Royal  456 384 508 153 351 351 326 205 391       526 408 446 178 341 203 517 398 386       6528
  Built White  456 376 480 153 351 358 320 198 380       448 389 416 148 312 168 504 339 344       6140
  -------------------------------------------------------------------------------------------

Gold (5,544) and Wake-Robin (5,307) are on the card, not built. Ratings
(GolfPass, unverified; the card prints none): Royal 70.9/121, White 68.6/115.

### Default tee

Royal (developer, 2026-10-19: "Blue should be the default because it's
such a short course otherwise").

### Known open items

(details and recommendations in
data/langston/validation_report.md)

1.  Royal 6 plays 351 yd vs 398 (-11.9 %) from the White box: no Royal
    tee box in OSM or the lidar; accepted for play by the developer.
2.  Hole 10 Royal tee and nine other tee boxes come from lidar pads
    (`edits.json`), approved by the developer; the creek on 3 is a lidar
    channel.
3.  Royal 1, 7 and 16 are flags (-3.5 to -4.3 %).
4.  Four lidar trees stand inside fairways (holes 2, 3, 16).
5.  Ratings unverified; lidar year not recorded.
