# Wine Valley Golf Club

Course id: `wine_valley` (data folder `data/wine_valley/`), branch `course/wine_valley`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines whose pars
match the card, every green, fairways, 73 bunkers and 87 tee boxes (no pins). Elevation is
the USGS 3DEP 1 m DEM (WA_3_County_QL1_2017); trees come from the 2017 USGS Washington 3
County lidar (9 tiles, class 1 only). One tee set, Gold (the longest), from GolfPass
(7,600 yd); built 7,548 yd, every hole within 3.3 % (15 is -3.3 %, accepted as a flag).
New theme `wine_valley`; the logo is a Walla Walla sweet onion. Every hole was looked at in
the game (tee shot and overview).

## Facts

-   **Location:** 176 Wine Valley Road, Walla Walla, Walla Walla County, Washington, in
    the rolling dryland wheat hills west of the town. `state` WA.
-   **Design:** Dan Hixson, opened 2009 (GolfLink, AllSquare).
-   **UTM zone:** 11 N (EPSG:32611). World 1,792 x 1,792 m, origin (382874, 5100752): the
    OSM boundary (way 436979104, 1,550 x 1,395 m) plus 120 m. Theme `wine_valley` (new).
    Wind 1-7 mph (standing default, inland Pacific Northwest).
-   **Data** (release `data-wine_valley`, all from the GitHub Actions workflow 2026-11-13;
    `make fetch NAME=wine_valley`):
    -   OSM: the standard Overpass export (`raw/overpass.geojson`, committed).
    -   Elevation: 3DEP elevation service export at 1 m, EPSG:32611 (`raw/usgs_dem_m.tif`,
        committed); the 1 m DEM under the course is WA_3_County_QL1_2017.
    -   Lidar: USGS LPC WA_3_County_QL2_2017 (LAS 2019), 9 tiles, NAD83(2011) / Washington
        South US ft, class 1 only (`roof_last_share` 0.85), clipped by `intake.py laz
        --keep-evlrs`. Tile 00876 came on the third run.
    -   Photo: NAIP from the USGS National Map service (`raw/naip.tif`, committed).
    -   Card: GolfPass (read 2026-11-13); Greenskeeper.org compared.
-   **Water:** three ponds (OSM golf=water_hazard), red by the standing default. Out of
    bounds: the OSM boundary (joined with the 9th hole's back tee) and the driving range.
-   **Trees:** 37 from the lidar in the world, 1 inside the boundary; 25 crowns on roofs
    dropped. Types from crown shape (drawn as Lombardy poplar and black locust).

## Scorecard

GolfPass (read 2026-11-13), unverified third party. "Built" is what the game plays.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 4 | 4 | 3 | 5 | 3 | 4 | 36 | 5 | 3 | 4 | 4 | 3 | 5 | 3 | 4 | 5 | 36 | 72 |
| HCP | 7 | 11 | 3 | 15 | 1 | 17 | 9 | 13 | 5 | | 6 | 16 | 4 | 2 | 18 | 12 | 14 | 8 | 10 | | |
| Gold | 470 | 410 | 575 | 390 | 515 | 210 | 625 | 255 | 480 | 3930 | 610 | 180 | 435 | 505 | 175 | 515 | 195 | 470 | 585 | 3670 | 7600 |
| Built | 460 | 404 | 574 | 387 | 508 | 206 | 622 | 257 | 478 | 3896 | 609 | 179 | 437 | 508 | 174 | 498 | 190 | 462 | 595 | 3652 | 7548 |

Gold 76.4/133. The other eight sets (Cabernet to Red) are in `scorecard.csv`, not built.
Greenskeeper.org has an older Gold row (7,360) and handicap row (open item 1).

## Default tee

Gold, the longest set (standing default 4.1).

## The developer's calls

-   2026-11-13: default tee the longest set; standing defaults; a new theme; an original
    logo (a single object on a small base).

### Developer's calls pending

"Other open items" in `data/wine_valley/validation_report.md`: the card (1), 15's flag
(2), 6's tee (3), the boundary joined round the 9th tee (4), card hole, theme, logo (8).

## New pipeline keys or theme

-   No new config key, no pipeline change.
-   New theme `wine_valley`: `assets-src/palettes/wine_valley.json`,
    `assets-src/trees_wine_valley.py` (Lombardy poplar, black locust). Logo
    `assets-src/course_logos/wine_valley.py`. Course script `data/wine_valley/make_boundary.py`.

## Open items

See "Developer's calls pending" and `data/wine_valley/validation_report.md`.

## Lessons

-   **A tee that crosses the boundary by a few square metres** makes the default tee out of
    bounds in the game test (s03 reports it); join the box onto the boundary.
-   **A NAIP export strip outside the world** has a different pixel size and stops
    `intake.py ortho`; leave it out.
