# Tokatee Golf Club

Course id: `tokatee` (data folder `data/tokatee/`), branch `course/tokatee`.

## Build summary

Built by a course chat on 2026-11-13. OSM maps the whole course: 18 hole lines with pars,
every green and pin, 20 fairways, 50 tee boxes, 20 bunkers, six penalty areas and nine more
ponds and creek pieces (made red with `red_water_osm`). Elevation and trees come from
DOGAMI's bare-earth and canopy-height mosaics (McKenzie River 2021 lidar, flown after the
2020 Holiday Farm Fire), the photo checks from OSIP 2024, all fetched by the GitHub
Actions workflow. Tee set built: Black (the longest), the default. New theme `tokatee`; the
logo is a McKenzie River drift boat. After the virtual tees moved within their boxes, 17
holes are within 3 % of the card; hole 17 plays 150 yd against the card's 195 (-23 %, open
item 1); 6,769 yd built against 6,838.

## Facts

-   **Location:** 54947 McKenzie Highway, McKenzie Bridge (Blue River), Lane County,
    Oregon, in the old-growth forest of the McKenzie River valley below the Three Sisters.
    `state` OR. Course id `tokatee`.
-   **Design:** Ted Robinson, opened 1966 (golflink.com, Stymie). Tokatee is said to come
    from the Chinook Jargon for "pretty" (unverified).
-   **UTM zone:** 10 N (EPSG:32610). World 2,048 x 1,024 m, origin (562109, 4891689).
    Theme `tokatee` (new). Wind 1-7 mph (a sheltered Cascade valley).
-   **Data** (release `data-tokatee`; `make fetch NAME=tokatee`; fetched by the GitHub
    Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC at 1 m, feet (newest projects
        McKenzie River 2021 topobathy and 3DEP);
    -   canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, same flights;
    -   photo: OSIP 2024 at 0.5 m (checks only);
    -   scorecard: GolfPass and Stymie (third-party, below).
-   **Water:** 13 penalty areas, all red: the six OSM golf penalty areas and seven
    `natural=water` ponds and creek pieces inside the boundary (`red_water_osm`; two more
    listed there lie outside). Out of bounds: the OSM boundary; the range is out of bounds.
-   **Trees:** 14,461 from the DOGAMI canopy model (3,554 inside the course), median
    27.4 m; 24 dropped on playing surfaces; s06b dropped three from tee shots (two in front
    of the 12th Black tee, one on the 18th). Types from crown shape: 9,326 conifer, 5,135
    deciduous. The tallest crowns (65-77 m) are old-growth firs on the valley slope 100-170 m
    north of the boundary (`checks.json` allows 78 m).

## Scorecard

Third-party, unverified: GolfPass (course 1352), par, men's handicap and Black, Blue, White
and Yellow yardages per hole, read 2026-11-13; each row adds up to its total. OSM's
handicap tags differ (an older card?); the card is used.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 3 | 4 | 5 | 4 | 3 | 4 | 36 | 4 | 3 | 5 | 4 | 4 | 4 | 5 | 3 | 4 | 36 | 72 |
| HCP | 15 | 3 | 9 | 17 | 5 | 13 | 1 | 7 | 11 |  | 4 | 8 | 16 | 2 | 12 | 10 | 14 | 18 | 6 |  |  |
| Black | 406 | 437 | 554 | 166 | 388 | 506 | 417 | 202 | 359 | 3435 | 416 | 188 | 534 | 410 | 358 | 364 | 528 | 195 | 410 | 3403 | 6838 |
| Built | 406 | 434 | 553 | 165 | 386 | 504 | 416 | 197 | 353 | 3414 | 406 | 188 | 535 | 413 | 360 | 355 | 528 | 150 | 420 | 3355 | 6769 |

Ratings: Black 6,838 yd 73.0/129 (Stymie; GolfPass prints 72.8/125 against an older
6,806), Blue 69.8/121, White 68.4/117, Yellow 68.3/114 (GolfPass). Only Black is built;
the others are in `scorecard.csv`.

## Default tee

Black: the longest set (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = the OSM boundary,
    range OB, fairway trees removed, wind 1-7 mph), listed in the intake message.

Course chat's calls (listed for the developer):

-   Nine `natural=water` ponds and creek pieces inside the boundary made red penalty areas
    with `red_water_osm` (standing default: every penalty area red).
-   The clubhouse (`golf=clubhouse`) copied as a building.
-   `checks.json`: the 12th's default aim is skipped. 12 drives along the edge of the
    valley forest; after merging main (2026-11-13) the game's default aim for a perfect
    drive finishes a few metres into OSM's woods on the right (it passed before).
-   Card hole: the 14th, its green on a point in the pond; rotation 14, 11, 18, 7.

## New pipeline keys or theme

-   No new config key; no pipeline change.
-   New theme `tokatee`: `assets-src/palettes/tokatee.json` (warm olive summer turf,
    golden rough, grey-tan volcanic sand, emerald-teal McKenzie water) and
    `assets-src/trees_tokatee.py` (the pnw shapes recoloured: Douglas fir and western red
    cedar by variant; vine maple, black cottonwood and red alder). Sheets
    `game/public/sprites/trees_tokatee*`.

## Open items

1.  **Hole 17 plays 150 yd against the card's Black 195 (-23 %; Blue 125).** Its tee is the
    back-most of five mapped boxes; the 2024 photo shows a cleared strip and a path behind
    it but no pad at 195 yd. Recommend accepting 150 yd unless someone who knows the course
    can place the Black tee (it may be new since the photo).
2.  **Third-party card; OSM's stroke indexes differ.** Recommend a photo of the printed card
    when convenient.
3.  **12's tee shot:** the default aim finds the woods at the forest edge (above). Options:
    (a) leave it (recommended: the edge is real); (b) a design-chat look at the default aim.

## Lessons

-   **Old-growth valleys reach 70 m+ in the canopy model.** Check where the tallest crowns
    are before treating them as wires or roofs; here they are real firs off the course.
-   **`natural=water` inside the boundary** is common on mountain courses (ponds, creek
    pieces); `red_water_osm` takes them in one list.
