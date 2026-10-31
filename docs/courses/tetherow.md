# Tetherow

Course id: `tetherow` (data folder `data/tetherow/`), branch `course/tetherow`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer was away. OSM maps the whole
course (18 hole lines, greens, tees, fairways, 66 bunkers, two ponds, cart paths, the range's
targets); nothing was traced except the range outline (a hull of its mapped features) and the
native areas (art only, from the photo). Elevation and trees from DOGAMI lidar (bare earth and
canopy height mosaics), photo from the Oregon Statewide Imagery Program 2024. Two tee sets:
Kidd (the tips, 7,298) and Black (one step forward, 6,961; the card has no Blue), Black the
default. A new `tetherow` theme (ponderosa pine, western juniper, desert bushes, native tones).
Every hole within 3 % of the card except Kidd 17 (-5.8 %, flag). `course_play.test.ts -t tetherow`:
13 passed.

## Facts

-   **Location:** 61240 Skyline Ranch Road, Bend, Deschutes County, Oregon; high desert at
    3,700-3,900 ft on the east flank of the Cascades, Broken Top Club next door, houses on
    most sides. `state` OR. Course id `tetherow`.
-   **Design:** David McLay Kidd, opened 2008. Playability changes 2014-2018 under the club
    (greens 7 and 17 enlarged, bunkers filled on 1, 5 and 13, native areas turned to waste).
-   **UTM zone:** 10 N (EPSG:32610). World 1,792 x 2,048 m (OSM boundary way 780645556 plus
    about 200 m of scenery). Theme `tetherow`. Wind 1-9 mph (inland high desert, no sea wind).
-   **Data** (release `data-tetherow`, fetched by the GitHub Actions workflow;
    `data/tetherow/release.json`): Overpass export; DOGAMI lidar DIGITAL_TERRAIN_MODEL_MOSAIC and
    CANOPY_HEIGHT_MODEL_MOSAIC (feet, exportImage at 1 m in EPSG:32610); OSIP 2024 0.5 m
    orthophoto (two exportImage halves, `intake.py ortho`); USGS 3DEP 1 m DEM and NAIP fetched
    for comparison, not used; Deschutes County tax lots fetched for an OB check, not used (the OB
    line stays the OSM boundary).
-   **Water:** two ponds, both red (the front-nine pond crossed on 3 and beside 6; the pond
    by the 13th green). Three Broken Top Club ponds outside the boundary are
    plain off-course water. The mapped stream by the 4th tees is dropped: a dry, shrub-filled
    channel in the 2024 photo (open item 2). Out of bounds: the OSM boundary and the driving
    range.
-   **Trees:** 7,496 lidar trees in the world, 464 inside the course; 2,749 conifers / 4,747
    deciduous by crown shape (the theme draws the broad class as western juniper, a drawing
    choice). Dropped: 171 on roofs, 27 tiny crowns, 4 in fairways (standing default).
-   **Desert bushes:** sage, bitterbrush and manzanita placed from the 2024 photo through the
    `gorse` key (pipeline/gorse.py) as sprites only; the ground plays as rough, not as the gorse
    lie (course chat's call).
-   **Native areas:** `fescue_areas` = `proposed/native.geojson` (made by `make_native.py` from
    the photo): the rough inside is drawn in native tones; physics unchanged (rough).
-   **Waste areas:** nine pumice waste areas mapped as bunkers are retagged waste sand
    (`waste_sand: true`).

## Scorecard

Stymie (stymie.golf), read 2026-10-31; Kidd row and ratings match 18Birdies; handicap row matches
18Birdies and OpenGolfAPI. Third-party, unverified; no club card online. GolfPass's older card
(Kidd 7,283, 17 at 167 yd, other handicaps, 74.9/141) not used.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 4 | 5 | 36 | 4 | 4 | 4 | 5 | 3 | 4 | 4 | 3 | 5 | 36 | 72 |
| HCP | 15 | 5 | 13 | 1 | 11 | 3 | 17 | 7 | 9 | | 14 | 6 | 8 | 4 | 16 | 10 | 2 | 18 | 12 | | |
| Kidd | 400 | 546 | 197 | 481 | 429 | 424 | 226 | 395 | 532 | 3,630 | 316 | 466 | 425 | 588 | 190 | 437 | 476 | 182 | 588 | 3,668 | 7,298 |
| Black | 388 | 534 | 172 | 442 | 418 | 409 | 189 | 389 | 499 | 3,440 | 289 | 455 | 405 | 563 | 190 | 420 | 452 | 159 | 588 | 3,521 | 6,961 |

Built (measured, after the tee moves in adjustments.json): Kidd 7,280, Black 6,985.
Ratings: Kidd 75.2/150, Black 73.7/145. Not built: Black/Tan, Tan, Tan/Sage, Sage, Sage/Red,
Red, Junior (in scorecard.csv).

## Default tee

Black: the developer's overnight call (tips plus the set one forward of them when there is no
Blue; that set is the default).

## The developer's calls

-   2026-10-30 (overnight, general): build the tips and Blue, or the set one forward when the
    card has no Blue; trace missing features with great care; over 8 % or conflicting sources:
    pick, build, flag; course chat draws the logo and may make a theme.
-   Standing defaults (4.1): all water red, OSM boundary OB, range OB, fairway trees removed.

Course chat's calls (for review): hole 9 is a par 5 (every card) though OSM tags par 4; ten
small mown pads mapped as `golf=fairway` on the lines of 3-6 are tees (photo shows separate
pads); the dry stream by 4 is dropped; desert bushes are scenery, not a penal lie; the card
shows hole 13 (and rotates 3, 17, 15).

## New pipeline keys or theme

-   Theme `tetherow` (assets-src/palettes/tetherow.json, assets-src/trees_tetherow.py,
    game/public/sprites/trees_tetherow*, shrubs_tetherow*): ponderosa pine, western juniper,
    a desert-bush painter, native-area tones.
-   No new config keys (uses existing `fescue_areas`, `gorse`, `waste_sand`).
-   Logo: Broken Top's summit behind a ponderosa pine over heather and fescue
    (assets-src/course_logos/tetherow.py). Original drawing.

## Open items

1.  **Hole 17, Kidd:** 171 yd measured vs 182 on the card (-5.8 %, flag) with the virtual tee
    at the back of the mapped box. GolfPass's older card has 167. Recommendation: accept; the
    back tee is probably newer or longer than the mapped pad.
2.  **Stream by the 4th tees:** mapped in OSM, dry and shrub-filled in the 2024 photo, so not
    built. Recommendation: leave it out unless the club plays it as a penalty area.
3.  **Card:** third-party only. Recommendation: a photo of the printed card would settle the
    handicaps and the Black row (18Birdies totals Black 6,955 vs Stymie 6,961).
4.  **Tree types:** from crown shape only (no leaf-off imagery). Recommendation: accept.

## Lessons

-   Broken Top Club next door has no course polygon in OSM, so its golf features read as
    Tetherow's until dropped by list; check for an unbounded neighbour first.
-   Small tee pads in native ground are often mapped as `golf=fairway`; the photo settles it.
-   DOGAMI's ArcGIS image services answer `exportImage` with a direct link, so the workflow
    fetched bare earth and canopy without the developer.
</content>
</invoke>
