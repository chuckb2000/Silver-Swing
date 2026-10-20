# Stone Creek Golf Club

Course id: `stone_creek` (data folder `data/stone_creek/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11.12 until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Build history

Stone Creek Golf Club,
Oregon City, OR, branch `course/stone_creek` from main: 18 holes, Blue
tees, `pnw` theme, DOGAMI DTM and canopy model, three red ponds, OB =
the OSM boundary. Every hole within 3 % except hole 6 (-3.1 %). New
optional config key `tee_shot_margin_m` (tee-shot tree check);
Oswego Lake, Highland Links, East Potomac, Langston and Indian Island
rebuild byte-identical. 260 unit tests and 4 Playwright tests pass.
Section 11.12; open items in data/stone_creek/validation_report.md.

## Facts, scorecard and open items

### Facts

-   **Location:** 14603 S Stoneridge Drive, Oregon City, Clackamas County,
    Oregon. Course id `stone_creek` (logo already made), `state` OR.
-   **Design:** Peter Jacobsen and Jim Hardy; opened 2002 (golfn; the OGA
    lists 2003). About 120 acres among old-growth Douglas firs, with ponds
    and wetlands (OGA).
-   **Built as:** one world 1,280 x 1,280 m (UTM 10N, EPSG:32610), theme
    `pnw`. Out of bounds = the OSM course boundary (developer).
-   **Data:** OSM (Overpass Turbo export, 2026-10-19), DOGAMI 1 m bare-earth
    DTM and canopy height model (exportImage, feet), club scorecard image;
    all in release `stone-creek-data`, the DOGAMI files also in
    `data/stone_creek/raw/` (9 MB each).
-   **Terrain:** 90-166 m; fairway slopes p50 5.7 %. Beaver Creek's wooded
    ravine and a reed-bed wetland lie just north of the boundary.
-   **Water:** three ponds, all red (developer): between 3 and 4, in front
    of the 6th green, and by the 17th green / 15th and 18th tees.
-   **Trees:** 5,661 from the DOGAMI canopy model (1,210 inside the
    boundary), up to 57 m; type from crown shape.

### Scorecard

(club scorecard image, supplied by the developer
2026-10-19; every tee set adds up to the printed totals)

  -------------------------------------------------------------------------------------------
  Hole         1   2   3   4   5   6   7   8   9   Out   10  11  12  13  14  15  16  17  18  In    Total
  ------------ --- --- --- --- --- --- --- --- --- ----- --- --- --- --- --- --- --- --- --- ----- -----
  Par          4   3   4   5   4   3   4   5   4   36    4   5   4   4   3   4   3   4   5   36    72
  Men's HCP    8   18  10  2   12  16  6   4   14        9   1   11  3   15  7   17  13  5
  Blue         373 156 374 475 409 149 349 508 358 3151  408 513 396 422 134 376 144 408 504 3305  6456
  Built Blue   373 156 368 467 403 144 346 510 363       413 512 392 412 137 367 144 404 517       6428
  -------------------------------------------------------------------------------------------

Jacobsen 6,840 (73.8/140), White 5,925 (69.1/127) and Gold 5,123
(70.3/121) are on the card, not built; ladies' handicaps in
`data/stone_creek/scorecard_full.csv`. Blue rating/slope 71.7/135 (card).

### Default tee

Blue (developer, 2026-10-19), the only set built.

### Known open items

(details in data/stone_creek/validation_report.md)

1.  Hole 6 plays 144 yd vs 149 (-3.1 %, flag), accepted by the developer;
    every other hole passes.
2.  Hole 16's tee is the OSM line start, inside the large back tee
    polygon (accepted).
3.  The wetland north of 12/13 plays as woods, not a penalty area
    (accepted).
4.  Tree types from crown shape only.
