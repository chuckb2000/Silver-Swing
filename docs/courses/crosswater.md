# Crosswater

Course id: `crosswater` (data folder `data/crosswater/`), branch `course/crosswater`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green and pin, fairways, 93 tee boxes, 89 bunkers, the river, ponds and the marsh on
the river's old oxbows. The
neighbouring Sunriver Meadows and Caldera Links courses are dropped. Elevation and canopy
from DOGAMI lidar (DTM and CHM, feet), the photo for checks from OSIP 2024, all fetched by
the GitHub Actions workflow. The world is 1,536 x 2,816 m, over the 2,048 m limit
(developer approved, 2026-11-13). Tee set built: Championship (7,683 yd), the default; Black
also playable. New theme `crosswater` (meadow-gold rough, ponderosa and lodgepole pine,
aspen and willow, dark river water); the logo is a cedar canoe and paddle on the river. Every
hole passes or is a small flag after the virtual tees moved within their boxes: 7,648 yd
built against 7,683.

## Checks

- `course_play.test.ts -t crosswater`: 11 passed.
- `npm test`: 1754 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole drawn sits out" fail until `make land` adds the course to the daily rotation.
- `npm run e2e`: 16 passed, 1 failed in the hand-off run: clicks.spec "after the first tap, a press on a button beside the swing button" (timing; another build was running on the machine). Rerun alone with nothing else running: clicks.spec 3 passed.
- Pinned; a `--fresh` rebuild left git clean.
- Every hole looked at in the game (tee view, overview, first shot, putting view).

## Facts

-   **Location:** Sunriver, Deschutes County, Oregon, where the Deschutes and Little
    Deschutes meet. `state` OR.
-   **Design:** Bob Cupp with John Fought (1995). The Tradition (2007-10), PGA Professional
    National Championships.
-   **UTM zone:** 10 N (EPSG:32610). World 1,536 x 2,816 m, origin (623913, 4855215).
    Theme `crosswater` (new). Wind 2-10 mph (high desert).
-   **Data** (release `data-crosswater`; `make fetch NAME=crosswater`): OSM standard
    Overpass export; DOGAMI DTM and CHM mosaics (feet); OSIP 2024, 0.5 m.
-   **Water:** five penalty areas, all red: the Little Deschutes where OSM maps it as
    golf=water_hazard (three polygons along several holes) and two ponds, all tagged red by
    the standing default. OSM's 41 natural=wetland polygons on the river's old oxbows (marsh
    grass, little open water) play as rough on their lidar ground (`flatten_wetlands` false).
    The river's OSM line runs through the boundary's two cut-outs, which are out of bounds.
-   **Trees:** 37,037 from the canopy model (4,918 inside the course), median 10.0 m,
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

-   Sunriver Meadows and Caldera Links (boundaries and golf features) dropped, except the
    three features inside Crosswater's boundary that the first build dropped by mistake
    (the Little Deschutes polygon w206873531 and two cart paths), put back 2026-11-14.
-   2026-11-14 (after the developer's "it looks like an ocean"): the oxbow wetlands play as
    rough, not water. The first build had listed 30 of them in `red_water_osm` as ponds.
-   The clubhouse copied as a building.
-   Card: the par-3 7th inside the river's loop (rotating 7, 2, 6, 12).

## Open items

1.  Load time and memory with a 2,816 m world haven't been measured beyond the hand-off's
    in-game look at every hole.
2.  The oxbow creeks: the narrow channels inside the marsh aren't mapped in OSM as water,
    and the photo (2024) and the lidar ground show little open water there, so they play as
    rough. If some should be penalty areas, tracing them, or a screenshot with control
    points, would let them be drawn at their real width.
3.  Third-party card.

## Build history

-   2026-11-13: first build (course chat).
-   2026-11-14: wetlands are rough, not water; the river polygon along holes 7-9 and two
    cart paths restored.
