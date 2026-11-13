# Shaughnessy Golf and Country Club

Course id: `shaughnessy` (data folder `data/shaughnessy/`), branch `course/shaughnessy`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars
and handicaps, every green and pin, 20 fairways, 48 tee boxes and 65 bunkers. The 4th's
back tee lies just outside OSM's course boundary; `make_boundary.py` joins it on. Elevation
and trees come from Natural Resources Canada's HRDEM (DTM and DSM, 1 m) through the NRCan
datacube WCS, fetched by the GitHub Actions workflow; no open orthophoto was found, so
nothing was traced or checked against a photo. Tee set built: Black (the longest), the
default. New theme `shaughnessy` (silty Fraser water, tall firs and cedars); the logo is a
tug towing a log boom on the Fraser. 6,879 yd built against 7,045: four holes (6, 8, 12,
17) are more than 8 % short because their Black boxes are not mapped (open item 1).

## Facts

-   **Location:** 4300 SW Marine Drive, Vancouver (Southlands), British Columbia, Canada,
    on the North Arm of the Fraser River. `state` BC. Course id `shaughnessy`.
-   **Design:** A. Vernon Macan, 1960 (the club's present course; the club was founded
    in 1911 as Shaughnessy Heights Golf Club).
-   **UTM zone:** 10 N (EPSG:32610). World 2,048 x 1,536 m, origin (483753, 5452810).
    Theme `shaughnessy` (new). Wind 2-10 mph (on the river near its mouth).
-   **Data** (release `data-shaughnessy`; `make fetch NAME=shaughnessy`; fetched by the
    GitHub Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: NRCan HRDEM DTM 1 m (WCS coverage `dtm`), CGVD2013 m;
    -   canopy: the HRDEM DSM (coverage `dsm`), canopy = DSM - DTM;
    -   scorecard: GolfPass (third-party, below).
-   **Water:** no penalty area on the course. Out of bounds: the OSM boundary (with the
    4th's back tee joined on); the range is out of bounds.
-   **Trees:** 10,616 from the HRDEM surface model (1,944 inside the course), median
    29.2 m, tallest 61.8 m; 1 dropped on a tee. Types from crown shape only: 6,029 conifer,
    4,587 deciduous. 115 of OSM's 187 mapped trees match a lidar tree within 4 m.

## Scorecard

Third-party, unverified: GolfPass (course 26767), par, men's handicap and Black yardage per
hole, read 2026-11-13; each row adds up to its total. The handicaps match OSM's hole lines.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 5 | 4 | 5 | 3 | 4 | 37 | 4 | 5 | 3 | 4 | 4 | 5 | 4 | 3 | 4 | 36 | 73 |
| HCP | 9 | 5 | 17 | 1 | 11 | 15 | 3 | 13 | 7 |  | 4 | 10 | 16 | 2 | 14 | 6 | 12 | 18 | 8 |  |  |
| Black | 475 | 389 | 200 | 418 | 471 | 428 | 551 | 210 | 421 | 3563 | 453 | 520 | 173 | 442 | 315 | 577 | 372 | 158 | 472 | 3482 | 7045 |
| Built | 471 | 386 | 198 | 408 | 464 | 362 | 548 | 177 | 422 | 3436 | 448 | 534 | 157 | 438 | 307 | 578 | 368 | 141 | 472 | 3443 | 6879 |

Rating (GolfPass, men): Black 74.8/134.

## Default tee

Black: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed), listed in the intake message.

Course chat's calls (listed for the developer):

-   The 4th's back tee (w687491740) joined to the course boundary
    (`data/shaughnessy/make_boundary.py`, `proposed/boundary.geojson`).
-   The clubhouse (w316174946) copied in as a building.
-   Black tees on 11 and 16: OSM's hole lines start on forward boxes; the only boxes on
    each line's extension (11: w687503986, 57 m back; 16: w687506294, 43 m back) are
    assigned to Black in `edits.json`. Both then pass (+2.6 %, -1.1 %).
-   `checks.json`: wind 2-10; holes 6, 8, 12 and 17 accepted over 8 % until the developer
    decides (open item 1); the 4th's default aim is skipped (open item 2).
-   Card: the 5th green (rotating 5, 9, 13, 18).

## Open items

1.  **Holes 6, 8, 12 and 17 are short** (Black, measured from the start of OSM's hole
    line; no box mapped behind it): 6 362 vs 428 yd (-15.5 %), 8 177 vs 210 (-15.8 %), 12
    157 vs 173 (-9.4 %), 17 141 vs 158 (-10.5 %). With no open photo I can't trace the
    back boxes. Options: (a) accept for now and play them short (what the build does);
    (b) the developer supplies Google or Bing screenshots with control points and I trace
    the Black boxes (recommended); (c) scale each hole (not allowed past 5 %).
2.  **The 4th's tee shot:** the game's default aim passes 4-6 m from three 26-28 m firs
    68-96 m out (lidar); a perfect drive clips a crown and kicks out of bounds. Options:
    (a) leave it (recommended: the chute is real); (b) remove the nearest tree.
3.  Tree types from crown shape only; no photo to check.

## Build history

-   2026-11-13: first build (course chat).
