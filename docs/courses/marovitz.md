# Sydney R. Marovitz Golf Course

Course id: `marovitz` (data folder `data/marovitz/`), branch `course/marovitz`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer was away (calls made and
logged under "Developer's calls pending"). OSM is complete: nine hole lines, every green with a
pin, 19 tee boxes, fairways, 39 bunkers and the pond. Elevation from the USGS 3DEP 1 m DEM and
trees from the 2017 Cook County lidar (four tiles), all fetched by the GitHub Actions workflow.
Two tee sets built, Blue (the back set, default) and White; every hole passes except White 1
(-4.0 %) and White 7 (+5.4 %), both flags. New theme `marovitz` and a clock-tower logo.
`course_play.test.ts -t marovitz`: 12 passed. After the pin, a fresh rebuild (`ARGS=--fresh`, all
15 steps) left `git status` clean. In-game look (Blue, robot round on the built game, all four
lidar tiles): every hole's tee shot and first putt seen, no page errors; trees, pond, lakefront,
bunkers and greens read correctly. `npm test` (after the pin): 1384 passed, 2 failed, both the
rotation checks `make land` clears (`player.test.ts` "marovitz is in the daily rotation",
`tour.test.ts` "a hole drawn sits out the next rounds of its par"). `npm run e2e`: 17 passed.

## Facts

-   **Location:** 3600 N. Recreation Drive, Lincoln Park, Chicago, Cook County, Illinois: a
    strip of park between Lake Shore Drive and Lake Michigan, from the Waveland clock tower
    north to Montrose Harbor. `state` IL. Course id `marovitz`.
-   **Design:** Edward B. Dearie Jr.; opened 1932 as Waveland Golf Course on land filled in
    from Lake Michigan; renamed in 1991 for Sydney R. Marovitz (club website; hmdb.org marker
    155667). Chicago Park District.
-   **UTM zone:** 16N (EPSG:32616). World 768 x 1,536 m (x0 446340, y0 4644373). Theme
    `marovitz`. Wind 3-14 mph.
-   **Data:**
    -   **OSM:** Overpass export through the fetch workflow (release `data-marovitz`,
        `marovitz_overpass.geojson`), `raw/overpass.geojson` in git.
    -   **DEM:** USGS 1 m, project IL_4_County_QL1_LiDAR_2016_B16, tile x44y465, clipped with
        `intake.py raster --fill-sea` (the lake is nodata offshore), `raw/usgs_dem_1m_clip.tif`
        in git; `lake_level_max_m` 175.65 (the flattened lake surface is 175.60).
    -   **Lidar:** the same project's point cloud, tiles LAS_17009250, 17009275, 17259250,
        17259275 (flown 17-18 April 2017), classes 3-5, rebuilt by `release.json`.
    -   **Scorecard:** the club's PDF, in the release.
    -   **NAIP 2023** (30 cm, m_4108703_ne) is in the release, not used yet.
-   **Water:** the Marovitz golf pond by the 6th green (w114835188) is red. Lake Michigan and
    the harbours are outside the boundary: out of bounds.
-   **Trees:** 3,281 lidar trees in the world, 805 on the course; type from crown shape (346
    conifers). Nine 50-79 m "trees" among the high-rises west of Lake Shore Drive dropped
    (`drop_trees`); every tee shot clears (s06b dropped none).

## Scorecard

Club card (sydneymarovitz.cpdgolf.com PDF, printed 10/2020), read 2026-10-31.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 5 | 3 | 4 | 4 | 4 | 36 |
| HCP | 5 | 2 | 8 | 3 | 1 | 9 | 4 | 7 | 6 | |
| Blue | 402 | 469 | 178 | 439 | 524 | 137 | 421 | 323 | 372 | 3265 |
| Built (Blue) | 399 | 461 | 175 | 438 | 509 | 134 | 411 | 315 | 373 | 3215 |
| White | 358 | 461 | 172 | 403 | 470 | 129 | 377 | 311 | 353 | 3034 |
| Built (White) | 344 | 461 | 175 | 404 | 471 | 132 | 397 | 312 | 355 | 3051 |
| Red | 284 | 418 | 132 | 329 | 425 | 80 | 316 | 240 | 269 | 2493 |

Ratings (men, 9 holes): Blue 35.5/127, White 34.4/122, Red 31.9/110 (women: Blue 38.4/138,
White 37.1/133, Red 34.1/120). Red is in `scorecard.csv`, not built. Other listings (not used):
GolfLink Blue 3,240 (35.1/117), Red 3,156; Hole19 White 2,774, Red 2,279.

## Default tee

Blue (developer's overnight rule: the back set, here Blue, and the next set forward, White).

## The developer's calls

None yet. **Developer's calls pending** (course chat, 2026-10-31; details and options in
`data/marovitz/validation_report.md`):

1.  Blue and White built, Blue default.
2.  White 1 (-4.0 %) and White 7 (+5.4 %) accepted as flags: White 1's forward box is small
    and the line starts at the back box; 7 has one mapped box, shared with Blue.
3.  Card par 5 on hole 2 over OSM's par 4.
4.  The pond red; Lake Michigan out of bounds.
5.  Wind 3-14 mph (the open-coast band: the course is on the open lake shore).
6.  New theme `marovitz`; card hole 6 (the pond); clock-tower logo.
7.  The clock tower made a building (OSM tags it `golf=clubhouse`); nine high-rise roofs
    dropped from the trees.

## New pipeline keys or theme

No pipeline change. New theme `marovitz`: `assets-src/palettes/marovitz.json`,
`assets-src/trees_marovitz.py` (American elm, honey locust with an open crown, cottonwood;
blue spruce for the conifer class; Lake Michigan teal water), sheets built with
`build_assets.py --theme marovitz`. Logo `assets-src/course_logos/marovitz.py`.

## Open items

1.  Confirm the calls above (recommendation: keep them).
2.  Tree types and trees changed since 2017: a check against the 2023 NAIP tile in the
    release (recommendation: only if the developer sees something wrong in play).
3.  A White box on hole 7 (and a larger one on hole 1) would need a developer screenshot to
    trace (recommendation: accept the flags).

## Lessons

-   **3DEP lidar downloads can fail on a runner** (rockyweb 429s and timeouts; the prd-tnm S3
    mirror 404s for these LPC tiles). Request only the tiles the world needs, and retry the
    same rockyweb link: it worked on the third run.
-   **A DEM with nodata over a lake** needs `intake.py raster --fill-sea` and then
    `lake_level_max_m`.
-   **`golf=clubhouse` on a building** is not drawn; copy it as a building in `edits.json`.
-   **City high-rises** read as 50-80 m trees where OSM lacks footprints: drop them.
