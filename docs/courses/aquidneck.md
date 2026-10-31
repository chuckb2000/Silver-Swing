# The Aquidneck Club

Course id: `aquidneck` (data folder `data/aquidneck/`), branch `course/aquidneck`.

## Build summary

Built 2026-10-30/31 by course chats. Every download came through the GitHub Actions fetch
workflow (release `data-aquidneck`): the Overpass export and the coastline, the USGS 3DEP 1 m
DEM tile, the 2022 Rhode Island lidar tiles and two NAIP exports.

-   **Map data:** OSM is complete except for pins. The bay is built from OSM's coastline.
-   **Lidar:** all twelve tiles arrived. Rockyweb and the S3 mirror failed on three of them
    for a while; the last one came through the TNM API's own link. Eleven reach the world. The
    twelfth (387500_192500) holds only points in the 100 m margin, so it is not used and is
    not in `release.json`.
-   **Tees:** Gold (the tips) and Green, with Gold the default.
-   **Yardage:** every hole is within 8 % of the card except 8 Gold. That hole plays from the
    developer's marked tee at 212 yd against 233 (−8.8 %), which the developer accepted. Built
    totals: Gold 6,511 yd (card 6,675), Green 6,268 yd (card 6,325).
-   **Theme and logo:** theme `newport`; logo of the 1778 field gun over the bay.
-   **Tests:** the counts are in the pull request.

## Facts

-   **Location:** Portsmouth, Newport County, Rhode Island, on Aquidneck Island along the east
    shore of Narragansett Bay. `state` RI. Course id `aquidneck`.
-   **Design:** Donald Steel and Tom Mackenzie. It opened in 2000 as the Carnegie Abbey Club
    and was renamed The Aquidneck Club after its members bought it.
-   **UTM zone:** 19N (EPSG:32619). World 1,536 x 2,048 m (x0 310395, y0 4607497). Theme
    `newport`. Wind 2-12 mph.
-   **Data:**
    -   **OSM:** Overpass export `aquidneck_overpass.geojson`, plus `aquidneck_coastline.geojson`
        for the bay. Both are in git as `raw/overpass.geojson`.
    -   **DEM:** USGS 3DEP 1 m, tile x31y461, project RI_Statewide_D22 (published 2024-01-26).
        Clipped into git as `raw/usgs_1m_x31y461_clip.tif`.
    -   **Lidar:** USGS 3DEP point cloud, project RI_Statewide_D22, flown 28 March 2022
        (leaf-off). The tiles are 2,500 ft, in RI State Plane ftUS, class 1 only. They are in
        the release and rebuilt by `make fetch`.
    -   **Photo:** NAIP from the USGS National Map ImageServer, 0.5 m (`naip_s.jpg`,
        `naip_n.jpg`), placed as `raw/ortho_naip.tif`. It is used for checks and the tracing
        desk only.
-   **Water:** every penalty area is red (standing default):
    -   the seven `golf=water_hazard` ponds, tagged `penalty=red` in `edits.json`;
    -   the pond between the 17th tees and green, and the wetland at (610, 1309) (`red_water_osm`);
    -   Narragansett Bay, built from the coastline by `propose_sea.py`.
-   **Out of bounds:**
    -   the OSM boundary (w325263047);
    -   the practice ground, the boundary's southern lobe south of y = 540 m local, which is
        drawn as rough with OB stakes (`range_art`).
-   **Trees:** 18,807 from the lidar, 5,430 of them inside the boundary. Median height 14.1 m,
    tallest 44.8 m.
    -   **Types:** 5,100 conifers. The type comes from the leaf-off share of last returns
        (`laz.leaf_off`), as at Newport and Wannamoisett.
    -   **Dropped:**
        -   856 roof crowns (`roof_last_share` 0.85). Inside the course these are the clubhouse
            roof, the ridge of an unmapped building at about (650, 1825), and one dense
            evergreen beside a house at (399.5, 1549.5).
        -   428 on OSM buildings.
        -   1 on the 18th Gold tee.
-   **Clubhouse:** mapped `golf=clubhouse` + `building=yes`, which s01 reads as a golf feature.
    It is copied as a building (`w940801546_building`). Without it the art drew lidar "trees"
    on its roof beside the 18th green.

## Scorecard

GolfPass (golfpass.com/courses/28943-the-aquidneck-club/scorecard-and-layout), read 2026-10-31.

-   The card has seven sets per hole: Gold, Gold/Green, Green, Green/White, White, Yellow and
    Red. Par is 71.
-   OpenGolfAPI has the same Gold row and men's index. 18Birdies has the same Gold row but a
    different men's stroke index.
-   Unverified: the club publishes no card.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 5 | 35 | 4 | 3 | 5 | 4 | 4 | 5 | 4 | 3 | 4 | 36 | 71 |
| HCP | 9 | 17 | 11 | 3 | 15 | 1 | 7 | 13 | 5 | | 12 | 16 | 10 | 6 | 4 | 8 | 2 | 18 | 14 | | |
| Gold | 521 | 186 | 382 | 410 | 163 | 411 | 395 | 233 | 500 | 3201 | 424 | 225 | 520 | 444 | 426 | 541 | 412 | 202 | 280 | 3474 | 6675 |
| Green | 508 | 151 | 350 | 405 | 150 | 399 | 385 | 192 | 490 | 3030 | 400 | 210 | 502 | 414 | 409 | 508 | 400 | 177 | 275 | 3295 | 6325 |
| Built (Gold) | 513 | 183 | 373 | 400 | 153 | 415 | 386 | 212 | 488 | 3123 | 416 | 222 | 511 | 433 | 404 | 526 | 405 | 199 | 273 | 3389 | 6511 |
| Built (Green) | 513 | 147 | 347 | 400 | 150 | 409 | 386 | 187 | 488 | 3028 | 390 | 208 | 493 | 408 | 400 | 504 | 405 | 163 | 268 | 3240 | 6268 |

Ratings (men's): Gold 72.5/132, Green 70.6/128. The other sets are in `scorecard.csv` and are
not built.

## Default tee

Gold, the longest set. Main's rule since 2026-10-31 is that the default is the longest set
built, and `courses.test.ts` checks it. The course was first configured with Green as the
default and was switched when main was merged in.

## The developer's calls

1.  **Gold and Green built** (2026-10-30). The card has no Blue.
2.  **Hole 8 Gold** (2026-10-31): the tee marked in the tracing desk (`desk/hole08.json`) is
    accepted as marked.
    -   A tee box (96 m²) at the mark, tagged `golf=tee hole=8 tee_set=Gold tee_pos=centroid`,
        written by `pipeline/desk_to_proposed.py` to `proposed/approved.geojson`.
    -   The game's tee is the box's centroid (1179.16, 1069.97), with no virtual-tee move.
    -   The hole line starts there (`hole8_desk_tee`, which replaces OSM's w951590882).
    -   It plays 212.5 yd against 233 (−8.8 %): accepted, `checks.json` `yardage.max` 0.09.
    -   `checks.json` asserts that the mark is tee surface and that no tree stands within 7 m of it.
3.  **Missing lidar:** finish on what arrived. All tiles came, so no photo fill was needed.
4.  **Holes more than 8 % off otherwise:** pick the best-supported option. None is left after
    the allowed virtual-tee moves.
5.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys or theme

-   **`desk_to_proposed.py`:** the desk tee is tagged with trace_spec's `desk.tee`. The default
    is Blue only on a course that has Blue. It stops if the set isn't one of the course's tee
    sets (it used to tag Blue silently). trace_spec `desk.tee_pos` adds a `tee_pos` tag.
-   **`s06_holes.py`:** the tag `tee_pos=centroid` puts the tee at the box's centroid, measures
    from there, and makes no virtual-tee or tee-shot move. Without the tag nothing changes.
-   **Pins:** finished courses are pinned, so neither change affects them.
-   **Theme:** none new (`newport`).

## Open items

1.  **Gold pads on 3 and 17** (`tee_3_gold`, `tee_17_gold`): raised flat pads from the 2022
    DEM, seen on NAIP. 3 plays 373 yd (card 382) and 17 plays 199 yd (card 202).
    Recommendation: accept.
2.  **Flags within 8 %:**
    -   5 Gold: 153 against 163 (−6.3 %).
    -   14 Gold: 404 against 426 (−5.3 %).
    -   17 Green: 163 against 177 (−7.7 %).

    Each plays from the farthest usable spot in its mapped box. Recommendation: accept.
3.  **Hole 9 line:** OSM's line ran up the right edge of the fairway through the woods. It is
    rebent on the fairway's main axis 250 yd out, and plays 488 yd (card 500).
    Recommendation: keep.
4.  **Default tee:** Gold rather than the Green first configured (main's longest-set rule).
    Recommendation: keep Gold. Green means one config line plus an exception in
    `courses.test.ts`.
5.  **Scorecard unverified** (GolfPass). 18Birdies' men's stroke index differs.
    Recommendation: keep GolfPass.
6.  **Unmapped buildings:** a large building at about (650, 1825) inside the boundary
    plays as rough; the lidar roof filter removed the false trees on it. The outdoor pool by
    the clubhouse (w940802256, 153 m²) plays as rough. Recommendation: leave both; neither is
    near a line of play.

## Lessons

-   **A tee "accepted as marked" needs `tee_pos=centroid`.** Otherwise s06 slides the virtual
    tee along the box toward the card and the tee isn't where the developer put it.
-   **A desk tee tagged with a set the course doesn't have** is ignored by s06 without a word.
    `desk_to_proposed.py` now refuses it.
-   **`golf=clubhouse` + `building=yes`** is still a golf feature, and a tag edit doesn't change
    the kind: copy it as a building (Newport did the same). With class-1 lidar, an undrawn
    clubhouse also becomes a stand of trees.
-   **Same flight, same keys:** the 2022 RI lidar is leaf-off, class 1 only. Set
    `laz.leaf_off` and `roof_last_share` from the start, as Newport and Wannamoisett do.
-   **`intake.py` errors on a tile that doesn't reach the world:** drop it from `release.json`.
-   **The repo's Playwright (1.56) expects chromium build 1194;** the sandbox has 1243. Link
    `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux` to the 1243 headless shell
    (with a `headless_shell` name) to run `npm run e2e`.
