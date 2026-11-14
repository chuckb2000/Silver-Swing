# San Francisco Golf Club

Course id: `sfgc` (data folder `data/sfgc/`), branch `course/sfgc`.

## Build summary

Built by a course chat on 2026-11-13/14. OSM maps the whole course: 18 hole lines with
pars, every green, fairway and bunker, most tee boxes and the paths. The Olympic Club's
features in the download box are dropped (`edits.json`). Elevation and trees from USGS 3DEP
(1 m DEM and the San Francisco B23 lidar, 16 tiles; the last four came on retry runs), the
photo for checks from NAIP, all fetched by the GitHub Actions workflow. Tee set built: Blue
(the longest, 6,808 yd), the default; White is on the card but not playable (below). New
theme `sfgc` (the summer fog belt by Lake Merced: Monterey cypress and pine, blue-grey
eucalyptus, pale dune-sand bunkers); the logo is two crossed duelling pistols over the 7th
green between the duel site's obelisks. After the virtual tees moved within their boxes,
every Blue hole is within 8 % of the card: 15 pass, the 1st (-7.4 %) and the 13th (-5.2 %)
are flags; 6,750 yd built against 6,808.

## Facts

-   **Location:** Lakeshore, San Francisco, California, south of Lake Merced and east of
    the Olympic Club. `state` CA.
-   **Design:** A. W. Tillinghast (opened 1918; remodels c. 1920-37); William P. Bell
    bunkers 1930; Tom Doak and Jim Urbina restoration 2001-06. The 7th is the Duel Hole,
    by the site of the 1859 Broderick-Terry duel.
-   **UTM zone:** 10 N (EPSG:32610). World 1,536 x 1,280 m, origin (545261, 4173096). Theme
    `sfgc` (new). Wind 3-14 mph (open coast).
-   **Data** (release `data-sfgc`; `make fetch NAME=sfgc`): OSM standard Overpass export;
    3DEP 1 m DEM; 3DEP lidar CA_SanFrancisco_B23, 16 tiles, class 1 (the tiles carry no
    vegetation classes, so trees come from class 1 with roofs dropped by
    `roof_last_share` 0.85, as at the Olympic Club), CRS kept with `--keep-evlrs`; NAIP.
-   **Water:** none in play. OB: the OSM boundary; the range is OB; roads inside the
    boundary are cart paths.
-   **Trees:** 6,463 lidar trees (1,491 inside the course), median 9.5 m, tallest 45.3 m;
    conifer or deciduous from crown shape only (the lidar is leaf-on). 14 dropped on playing
    surfaces, 1 from the 12th's tee shot (26.8 m tall, 37 m out).
-   **Pins:** OSM's pins where mapped; the game adds its own.

## Scorecard

Third-party, unverified (private club; no official card online): Stymie's per-hole card
(par, men's stroke index, Blue/White/White-Red/Legacy/Green), with GolfPass's women's
stroke index, read 2026-10-24 by the scouting chat; GolfPass differs on five cells. Ratings
from Stymie: Blue 73.6/133, White 71.3/130.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 5 | 36 | 4 | 3 | 4 | 3 | 4 | 4 | 4 | 4 | 5 | 35 | 71 |
| HCP | 15 | 1 | 5 | 11 | 13 | 3 | 17 | 9 | 7 |  | 6 | 18 | 4 | 16 | 14 | 8 | 10 | 2 | 12 |  |  |
| Blue | 522 | 455 | 405 | 223 | 384 | 430 | 187 | 376 | 611 | 3593 | 410 | 161 | 409 | 139 | 351 | 416 | 375 | 429 | 525 | 3215 | 6808 |
| Built | 483 | 453 | 402 | 218 | 379 | 428 | 188 | 372 | 611 | 3534 | 420 | 165 | 409 | 132 | 350 | 426 | 373 | 431 | 510 | 3216 | 6750 |

## Default tee

Blue: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed).

Course chat's calls (listed for the developer):

-   White is not playable: on the 11th and 12th OSM maps only the Blue box, so White
    measures +9.9 % and +11.3 % against the card.
-   The 11th's Blue tee stands on fairway at the start of the OSM hole line (no box mapped;
    accepted in `checks.json`).
-   Card: the 7th green (rotating 7, 13, 4, 15).

## Open items

1.  Third-party card; a photo of the printed card would settle it.
2.  The 11th and 13th Blue tee boxes aren't in OSM; the tees are the hole lines' starts.
    Tracing them (or a screenshot showing where they are) would fix both lengths.
3.  The 1st plays 483 yd against 522 (-7.4 %): the OSM hole line starts 57 m from the
    Blue box and was probably drawn from another tee.
4.  White on the 11th and 12th (above). Recommended: leave White unplayable unless its boxes
    get mapped.

## Build history

-   2026-11-14: first build (course chat).
