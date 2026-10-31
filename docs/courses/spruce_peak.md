# The Mountain Course at Spruce Peak

Course id: `spruce_peak` (data folder `data/spruce_peak/`), branch `course/spruce_peak`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer slept (overnight calls
below). OSM maps the whole course (18 hole lines, 72 tee boxes, every green, fairway and
bunker; no pins), so nothing was traced except two centre pins. Bare earth and canopy are the
VCGI 2023 statewide lidar (DEM and DSM image services, exported at 1 m through the GitHub
Actions fetch); photo the VCGI 0.3 m orthos. Two tee sets: Black (the tips) and Blue (the
default). Theme `spruce_peak` (new): Stowe in the first week of October, spruce spires and red,
gold and turning hardwoods. Black: 3 holes fail against the card (no back tee mapped or found on
4, 8, 13), 5 flag 3-6 %; Blue: every hole within 8 % (8 at -7.4 %, 10 +5.8 %, 4 -5.4 %).
Built totals Black 6,043 yd (card 6,411), Blue 5,844 (card 5,887).

## Facts

-   **Location:** 7412 Mountain Road area, Spruce Peak base, Stowe, Lamoille County, Vermont;
    a mountainside course at 405-560 m below Spruce Peak's ski trails, corridors cut through
    spruce-fir and northern hardwood forest, one central pond. `state` VT. Course id
    `spruce_peak`.
-   **Design:** Bob Cupp, opened 2007, for the Stowe Mountain Club at Spruce Peak
    (OpenGolfAPI: established 2007; architect from the club's descriptions, not a primary
    source). Private.
-   **UTM zone:** 18 N (EPSG:32618). World 1,280 x 1,536 m at (676362, 4932328). Theme
    `spruce_peak`. Wind 1-9 mph.
-   **Data:** OSM via the Actions Overpass export (git: `raw/overpass.geojson`); VCGI lidar
    DEM (`IMG_VCGI_LIDARDEM_SP_NOCACHE_v1`, spring 2023 QL1, 0.35 m) and DSM
    (`IMG_VCGI_LIDARDSM_SP_NOCACHE_V1`), exported at 1 m in EPSG:32618; VCGI colour orthos
    (`IMG_VCGI_CLR2021_2025_SP_NOCACHE`, 0.3 m, four JPEG tiles) and a NAIP export. All in
    the release `data-spruce_peak` (`release.json`; `make fetch` tested from an empty raw/).
    The DEM export had three voids by the 11th green (45 cells 100-160 m deep): filled with
    their 9 x 9 median by `data/spruce_peak/fix_dem.py` (run from release.json).
-   **Water:** the pond in the middle of the course (w458067715, golf=water_hazard) is red.
    The two reservoirs south of the 8th and the West Branch Little River are outside the
    boundary (out of bounds).
-   **Out of bounds:** OSM's boundary (w510265958) traces only the mown turf along the tree
    lines and leaves out the 13th. Built with a joined and grown boundary
    (`make_proposals.py`): joined to the 13th, grown 20 m into the woods, less 5 m strips along
    roads and 6 m round buildings (47.6 ha -> 59.1 ha). Open item 1.
-   **Trees:** 35,559 from the lidar CHM (DSM - DTM), 5,377 inside the boundary, heights p50
    13.6 m, max 30.2 m; 148 dropped on buildings. Types by crown shape only (18,081 conifer,
    17,478 deciduous); summer photo, no leaf-off. `trees_off_fairways_m` 2; s06b: every tee
    shot at the middle of the fairway clears the trees.

## Scorecard

Stymie (stymie.golf, "Stowe Mountain Club"), read 2026-10-31; Black row also GolfPass,
18Birdies, OpenGolfAPI (identical); totals and ratings 18Birdies. Third-party, unverified; no
club card online.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 4 | 3 | 4 | 5 | 4 | 36 | 4 | 5 | 4 | 3 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 6 | 16 | 4 | 18 | 12 | 10 | 14 | 2 | 8 | | 7 | 1 | 13 | 15 | 3 | 11 | 17 | 5 | 9 | | |
| Black | 499 | 228 | 415 | 381 | 338 | 194 | 333 | 606 | 339 | 3,333 | 351 | 506 | 359 | 252 | 394 | 271 | 171 | 279 | 495 | 3,078 | 6,411 |
| Built | 486 | 222 | 405 | 337 | 327 | 194 | 325 | 514 | 335 | 3,145 | 341 | 492 | 345 | 156 | 378 | 264 | 166 | 268 | 488 | 2,898 | 6,043 |
| Blue | 451 | 210 | 365 | 358 | 321 | 155 | 314 | 559 | 317 | 3,050 | 321 | 480 | 342 | 160 | 380 | 253 | 160 | 266 | 475 | 2,837 | 5,887 |
| Built | 456 | 215 | 357 | 339 | 326 | 159 | 322 | 518 | 314 | 3,006 | 340 | 470 | 341 | 156 | 375 | 258 | 164 | 262 | 472 | 2,838 | 5,844 |

Ratings: Black 72.1/141, Blue 70.0/132 (18Birdies; Stymie prints 73.7/151 and 71.2/146).
Not built: White 5,442, Green 4,742, Red 4,018 (in `scorecard.csv`). OSM tags 17 as a par 3;
every card says par 4 (279 yd): the card is used.

## Default tee

Blue (the developer, 2026-10-30: "the furthest back tees and the blue tees"; Blue the default).

## The developer's calls

-   2026-10-30 (before the overnight run): build the tips and Blue; trace what OSM lacks with
    care; a hole over 8 % or conflicting sources: pick the best-supported option, build, flag.
-   Everything below "Open items" was decided by the course chat overnight and waits for the
    developer.

## New pipeline keys or theme

-   Theme `spruce_peak` (`assets-src/palettes/spruce_peak.json`,
    `assets-src/trees_spruce_peak.py`, `sprites/trees_spruce_peak.*`): spruce/fir drawn as the
    pnw cone at 70 % width (spires); deciduous variant 0 sugar maple red, 1 birch gold on a pale
    trunk, 2 beech green with an orange patch; leaf-litter russet mixed into the off-course
    woods floor (`lut.ob_woods`). Colours by variant are a drawing choice.
-   No new config keys and no pipeline change. Course scripts: `fix_dem.py` (DEM voids),
    `make_proposals.py` (cart paths, boundary, two centre pins).

## Open items

1.  **Out-of-bounds line.** OSM's boundary is the turf edge; built with it joined to the 13th
    and grown 20 m into the woods (roads and houses stay OB). Options: (a) as built; (b) OSM's
    line plus only the 13th (every ball in the trees is OB); (c) a wider band. Recommendation:
    (a).
2.  **Black tees on 4, 8 and 13** (FAIL): no box at the card distance in OSM, the lidar pads
    or the photo; Black plays from the farthest mapped box: 4 337 yd (card 381), 8 514 (606),
    13 156 (252). On 4 a raised pad by the 3rd green (lidar_tee_2, 365 yd) and the 17th's
    box w1058402468 (379 yd through the bend) would fit, but both mean driving over the 3rd
    green: not used. Accepted in `checks.json`. Options: accept; or the developer places the
    tees (DATA_REQUEST.md 2). Recommendation: accept until a photo or description says where
    they are.
3.  **Blue on 8** -7.4 % (518 vs 559): the mapped back box is the only one near the card;
    the card may count a longer route. Recommendation: accept.
4.  **Blue card row.** Stymie's per-hole Blue (5,887, matches 18Birdies' total) used; GolfPass
    has 5,824 per hole and 6,041 in its tee table. Recommendation: keep until a card photo.
5.  **Stroke index 10/18:** GolfPass, 18Birdies, OpenGolfAPI 7/9 (used); Stymie 9/7.
6.  **Small greens.** OSM greens are 136-420 m2 (photo agrees where they are visible). 7, 16
    and 17 get a gentler plane and no bumps (`green_tilt`); 7 and 17 get centre pins at the
    middle of their long axis (`make_proposals.py`) so each has three hole locations.
    `pins.test.ts` "an 18-hole round mixes ... at most 4 centre pins" still fails for
    spruce_peak (5 centre picks: few middle-depth spots on small greens): request to the
    design chat below.
7.  **16 plays 31 m downhill:** the auto club (6-iron) flies a perfect shot 50 m long into
    the woods; `default_aim` skips 16 in `checks.json`. Request to the design chat below.
8.  **Tree types** by crown shape only (no leaf-off photo); the theme colours by variant.

## Requests to the design chat

1.  Auto club on steep holes: merge `fix/auto-club-downhill` (or equivalent), so 16's default
    club allows for the 31 m drop; then drop `default_aim.skip` from `checks.json`.
2.  `pins.test.ts` "mixes front, middle and back": spruce_peak's small greens leave mostly
    front/back extra spots, so the sheet takes 5 centre pins (limit 4). Smallest change: count
    the limit as `max(4, holes with fewer than 3 middle-or-extra spots)`, or let the test skip
    courses whose median green is under ~300 m2.

## Lessons

-   VCGI (Vermont) serves its 2023 lidar DEM and DSM as ArcGIS ImageServers with exportImage:
    one direct URL each, fetched by the Actions workflow in seconds, already on the course grid
    (bboxSR/imageSR = the course EPSG). Far faster than 700 MB LAZ tiles. Check the export for
    voids (median filter) before using it.
-   The 3DEP listing found the same 2023 project (VT_Statewide_A23); the LAZ tiles were 0.5-0.9
    GB each.
-   Small greens: check `pins.test.ts` before rendering; centre the pin on the long axis of
    the area 10 ft inside the edge.
