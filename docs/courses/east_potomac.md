# East Potomac Golf Links (Blue, White and Red courses)

Course id: `east_potomac` (data folder `data/east_potomac/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.9 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

East Potomac Golf
Links, Washington DC, built on branch `course/east_potomac` (main,
with Highland Links, merged in on 2026-10-19): three courses on
one island sharing one world (Blue 18, White 9, Red 9), new `potomac`
theme with flowering cherries around the island. Pipeline gained
`layouts`, `merge_edits.py`, `s02b_approaches.py` and lidar tee
proposals; Oswego Lake and Highland Links rebuild unchanged. The Blue
course plays the Blue tees (developer); a fairway-centre tee shot clears
the trees on every hole. 189 unit tests and 3 Playwright
tests pass. Open items: section 11.9.4 and
data/east_potomac/validation_report.md; requests to the design chat
in docs/requests/east_potomac_design_requests.md.

## Facts, scorecard and open items

### Facts

-   **Location:** East Potomac Park (Hains Point), an island between the
    Potomac River and the Washington Channel; National Park Service land.
-   **Courses:** Blue (18 holes, par 72, Walter Travis), White (9 holes,
    par 34) and Red (9 holes, par 27, all par 3s), both by Robert White;
    opened in stages 1921-1925.
-   **Built as:** one data folder `data/east_potomac` and one world
    (1,280 x 2,048 m, UTM 18N, EPSG:32618), exported as three courses
    `east_potomac_blue`, `east_potomac_white`, `east_potomac_red`
    (DECISIONS.md, East Potomac). Theme `potomac`.
-   **Data:** OSM (Overpass Turbo export), DC GIS / OCTO 1 m lidar DEM
    and normalized surface model (release `data-washington-dc`, clipped),
    club scorecards (PDFs, 2021 Blue card and the current Red/White card).
-   **Terrain:** flat fill land, 0-8 m above the river; raised tee pads,
    built-up greens and grass mounds.
-   **Fairways** run into every green (pipeline s02b; the OSM fairways
    stopped short of 19 greens) and no tree stands inside a fairway.
-   **Trees:** 4,171 from lidar; about 1,000 drawn as flowering cherries
    along Ohio Drive and the seawall (theme flair, species not measured).
    A perfect drive at the middle of the fairway clears the trees near
    every tee (every course build checks this: 7 tees moved within their
    boxes, 6 trees removed on Blue 9 and 13). Removed at the developer's
    request (`drop_trees`): the two trees at the front of the Blue 10 tee
    box, and a 28.5 m, 1.5 m-crown object (probably a pole or a lidar
    artefact) standing in the left side of the Blue 10 fairway, 159 m from
    the Blue tee (2026-10-20).

### Scorecards (club PDFs supplied by the developer, 2026-10-19)

  -----------------------------------------------------------------------------------------
  Blue course   1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------------- --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par           4   4   5   3   4   5   4   3   4   36    4   3   5   4   4   3   4   5   4   36    72
  Stroke index  7   3   1   13  17  5   15  9   11        16  14  10  8   4   18  2   6   12
  Blue          360 418 596 169 291 547 308 210 356 3255  311 191 499 371 410 174 432 563 393 3344  6599
  White         343 377 564 154 286 507 297 196 336 3060  302 167 456 354 389 162 419 546 371 3166  6226
  -----------------------------------------------------------------------------------------

Gold (5,706), Red (5,203) and Green (4,638) tees are on the card, not built.
Ratings (GolfNow/TeeOff, unverified): Blue 70.5/115, White 68.7/111.

  ---------------------------------------------------------------------
  White course  1   2   3   4   5   6   7   8   9   Total
  ------------- --- --- --- --- --- --- --- --- --- -----
  Par           3   4   4   4   4   3   4   4   4   34
  Stroke index  9   1   8   4   5   6   2   3   7
  White         156 381 266 285 247 190 355 286 327 2493 (card prints 2943)
  Red           141 372 259 275 214 142 294 284 295 2276 (not built)
  ---------------------------------------------------------------------

White 31.0/98, Red 32.5/104 (card). Family tees not built.

  ---------------------------------------------------------------------
  Red course    1   2   3   4   5   6   7   8   9   Total
  ------------- --- --- --- --- --- --- --- --- --- -----
  Par           3   3   3   3   3   3   3   3   3   27
  Stroke index  1   5   7   4   2   8   9   6   3
  White         208 154 102 108 171 126 176 111 158 1314
  Red           175 132 65  98  138 87  144 96  133 1068 (not built)
  ---------------------------------------------------------------------

### Default tees

Blue on the Blue course (developer, 2026-10-19), which also has its
White tees; White on the White and Red courses. Measured (adjusted)
totals: Blue course White 6,207 yd, Blue 6,514; White course 2,470;
Red course 1,292.

### Known open items

(details and recommendations in
data/east_potomac/validation_report.md)

1.  Blue 13 now plays from the back tee (developer, 2026-10-19).
2.  Blue 15 Blue tee (-8.7 %) and Red course 8 (+9.9 %) are over 8 %,
    accepted for play by the developer; Blue 6 Blue, Blue 13 White, Red 5
    and Red 6 are flags.
3.  19 tee boxes come from lidar pads (`edits.json`), approved.
4.  Forward (Red) tees of the White and Red courses not built.
5.  Blue course ratings unverified; Red course unrated.
6.  Lidar year of the DC files not recorded.
