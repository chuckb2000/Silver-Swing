# Crosswater

Course id: `crosswater` (data folder `data/crosswater/`), branch `course/crosswater`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green and pin, fairways, 93 tee boxes, 89 bunkers, the ponds and river arms. The
neighbouring Sunriver Meadows and Caldera Links courses are dropped. Elevation and canopy
from DOGAMI lidar (DTM and CHM, feet), the photo for checks from OSIP 2024, all fetched by
the GitHub Actions workflow. The world is 1,536 x 2,816 m, over the 2,048 m limit
(developer approved, 2026-11-13). Tee set built: Championship (7,683 yd), the default; Black
also playable. New theme `crosswater` (meadow-gold rough, ponderosa and lodgepole pine,
aspen and willow, dark river water); the logo is a cedar canoe and paddle on the river. Every
hole passes or is a small flag after the virtual tees moved within their boxes: 7,648 yd
built against 7,683.

## Facts

-   **Location:** Sunriver, Deschutes County, Oregon, where the Deschutes and Little
    Deschutes meet. `state` OR.
-   **Design:** Bob Cupp with John Fought (1995). The Tradition (2007-10), PGA Professional
    National Championships.
-   **UTM zone:** 10 N (EPSG:32610). World 1,536 x 2,816 m, origin (623913, 4855215).
    Theme `crosswater` (new). Wind 2-10 mph (high desert).
-   **Data** (release `data-crosswater`; `make fetch NAME=crosswater`): OSM standard
    Overpass export; DOGAMI DTM and CHM mosaics (feet); OSIP 2024, 0.5 m.
-   **Water:** 34 penalty areas, all red: 30 ponds and river arms mapped as natural=water
    (`red_water_osm`) and four golf=water_hazard tagged red. The Little Deschutes' OSM line
    runs through the boundary's two cut-outs, which are out of bounds.
-   **Trees:** 37,038 from the canopy model (4,919 inside the course), median 10.0 m,
    tallest 40.7 m.

## Scorecard

Third-party, unverified: Stymie's card (eleven tee sets), read 2026-11-13; every row adds up
(Championship 7,683, as GolfPass and Wikipedia). Ratings from Stymie: Championship 76.8/147,
Black 74.9/144 (GolfPass: 76.5/145, 74.6/141).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 4 | 5 | 3 | 4 | 4 | 36 | 4 | 4 | 5 | 3 | 4 | 4 | 5 | 3 | 4 | 36 | 72 |
| HCP | 11 | 13 | 17 | 5 | 1 | 3 | 15 | 7 | 9 |  | 8 | 16 | 2 | 18 | 4 | 14 | 12 | 6 | 10 |  |  |
| Championship | 386 | 582 | 188 | 413 | 460 | 635 | 206 | 427 | 456 | 3753 | 412 | 480 | 687 | 171 | 468 | 414 | 598 | 244 | 456 | 3930 | 7683 |
| Built | 382 | 573 | 183 | 407 | 468 | 637 | 205 | 430 | 454 | 3739 | 415 | 485 | 677 | 163 | 459 | 415 | 594 | 247 | 454 | 3909 | 7648 |

## Default tee

Championship: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: build it although the world is over 2,048 m (`world.over_limit_approved`).

Course chat's calls (listed for the developer):

-   Sunriver Meadows and Caldera Links (boundaries and golf features) dropped.
-   The clubhouse copied as a building.
-   Card: the par-3 7th inside the river's loop (rotating 7, 2, 6, 12).

## Open items

1.  Load time and memory with a 2,816 m world haven't been measured beyond the hand-off's
    in-game look at every hole.
2.  The Little Deschutes has no water polygon in OSM where it passes the holes; it plays as
    out of bounds through the boundary's cut-outs rather than as a penalty area.
3.  Third-party card.

## Build history

-   2026-11-13: first build (course chat).
