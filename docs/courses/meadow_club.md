# Meadow Club

Course id: `meadow_club` (data folder `data/meadow_club/`), branch `course/meadow_club`.

## Build summary

Built by a course chat overnight 2026-10-30/31 while the developer was asleep (not scouted).
Everything came through the GitHub Actions fetch workflow; the developer supplied nothing.
OSM maps the whole course (18 hole lines, tees, greens, fairways, bunkers): nothing was traced.
The creeks OSM maps only as lines became red penalty areas from the lidar channel; the
practice range, mapped as course, was cut out as out of bounds. USGS 3DEP 1 m DEM and the
2018 USGS Northern California QL1 lidar (7 tiles, class 1) for the trees. Black (tips) and
Blue tees, Blue the default. New theme `meadow_club`. Measured with the virtual tees: Black
6,684 yd against 6,734 on the card, Blue 6,548 against 6,608; 17 of 18 holes within 3 %, hole 15
at -3.8 % (flag).

On the branch (2026-10-31): `course_play.test.ts -t meadow_club` 12 passed; `npm test` 1,384
passed, 2 failed, both from the course not yet being in `DAILY_ROSTER` (`player.test.ts` "is in
the daily rotation", and `tour.test.ts` "a hole drawn sits out the next rounds of its par", whose
rest window counts every course's holes but draws only from the rotation; both pass with
`meadow_club` added to the roster, which `make land` does); `npm run build` passed; `npm run e2e`
17 passed. `make fetch` from an empty `raw/laz/` reproduced every clip, and `make course
ARGS=--fresh` after the pin left git clean. Not done: the per-hole Playwright looks (8.3); the
whole course was checked on a render of the exported terrain with the trees drawn over it.

The first worker was stopped by the account's usage limit at about 00:15; a second one finished
the lidar, card, checks and hand-off on 2026-10-31.

## Facts

-   **Location:** 1001 Bolinas Road, Fairfax, Marin County, California, in a valley on the north
    side of Mount Tamalpais above Fairfax. `state` CA.
-   **Design:** Alister MacKenzie with Robert Hunter, opened 1927 (MacKenzie's first US
    design); restoration by Mike DeVries from 1999. The bunkers are said to follow the lobed
    leaves of the valley oaks on the hillsides (Geoff Shackelford via The Fried Egg).
-   **UTM zone:** 10N (EPSG:32610). World 1,792 x 1,536 m (x0 532795, y0 4201750): the OSM
    boundary (way 44421428, 1,498 x 1,088 m) plus scenery. Theme `meadow_club`. Wind 1-9 mph
    (a sheltered inland valley in the Marin foothills; no Californian row in the defaults).
-   **Data** (release `data-meadow_club`, all fetched by the workflow):
    -   OSM: the standard Overpass export of the box 37.955-37.984 N, 122.637-122.598 W
        (2026-10-31 03:22 UTC), `raw/overpass.geojson` (in git).
    -   DEM: USGS 3DEP 1 m, tile x53y421, project CA_NoCal_Wildfires_B5b_QL1_2018 (NAD83 / UTM
        10N, NAVD88 m), clipped by `intake.py raster` to `raw/usgs_dem_2018_1m_clip.tif` (in git).
    -   Lidar: USGS 3DEP LPC, CA_NoCal_Wildfires_B5b_QL1_2018, 1 km tiles w2285-w2287 /
        n1981-n1982 and w2286n1980 (NAD83(2011) Conus Albers, NAVD88 m), flown 3 Jan - 18 Feb
        2019. No vegetation classes (1, 2, 7 only): trees from class 1, returns over 65 m dropped
        (`max_height_m`), tops on OSM buildings dropped. The tile w2287n1980 (the world's
        south-west corner, outside the course) isn't in the project; no trees there. Four tiles
        timed out on rockyweb.usgs.gov and came on a retry. `make fetch NAME=meadow_club`
        downloads and clips them (`release.json`).
    -   Photo: NAIP via the USGS NAIPImagery ImageServer export (`incoming/`, art reference
        and the native-grass read only).
    -   Card: Stymie (third-party; no club card online). See Scorecard.
-   **Water (all red):** the irrigation pond by the 14th and 15th greens (`red_water_osm`),
    and the creeks from the lidar channel (`edits.json`, `proposed/channels_lidar.geojson`,
    `flatten=no`): the main creek from the 18th down between 16/17 and 13-15/6 to the pond, the
    creek along the 7th, two spurs by the 7th green and 16th tee, the gully in front of the 9th
    tee and the drain short of the 10th green. Culverts left out.
-   **Out of bounds:** the OSM boundary. The practice range between 10, 12 and 18 (OSM maps it
    only as rough, a tee and a fairway) is out of bounds (`proposed/range.geojson`), drawn as
    rough with stakes (`range_art: rough`, as at Oregon Golf Club); its chipping green stays a
    wrong green.
-   **Native grass:** the unirrigated grass between holes, read from the NAIP photo by
    `make_native.py` (`proposed/native.geojson`, `fescue_areas`): straw-coloured rough in the
    art; plays as rough.
-   **Trees:** 19,836 from the lidar, 1,914 on the course; 2,762 read as conifers by crown
    shape (redwoods and Douglas fir on the north slopes), the rest oaks and bay. Species are
    flair. Three tops on a bunker and a tee dropped (spec 5.4); s06b found every tee shot clear.
    Unmapped house roofs outside the boundary can read as trees (class-1 lidar, leaf-on for the
    evergreens): scenery only.

## Scorecard

Stymie (stymie.golf, read 2026-10-30): every set per hole, par 71, men's stroke index; every row
adds to its printed total. Black 6,734 (72.8/136), Blue 6,608 (72.0/135); White, Gold, Red,
Green in `scorecard.csv`, not built. GolfPass has the same totals and pars but prints hole 12 as
374 (its rows then don't add to its own totals) and rates Black 72.7/137, Blue 72.2/134. Stymie
used.

## Tees

Black and Blue (developer, 2026-10-30: the furthest-back tees and Blue). Blue is the default.
On 12 holes the two sets play from the same box at the same yardage.

## Yardages (virtual tee within the real box where needed, adjustments.json)

| | card | measured | with virtual tees |
|---|---|---|---|
| Black | 6,734 | 6,644 | 6,684 |
| Blue | 6,608 | 6,508 | 6,548 |

Flags and fixes (both sets): 1 (-4.7 % -> -2.5 %), 11 (-9.1 % -> -2.5 %), 12 (-3.4 % -> -2.5 %),
15 (-4.3 % -> -3.8 %, flag), 18 (-6.1 % -> -2.5 %). Hole 11 was over 8 % from the box centre;
built with the virtual tee at the back of the OSM box (developer's overnight call: pick, build,
flag).

## Logo and card

-   **Logo:** "The Oak-Leaf Bunker": a bunker cut in the shape of a valley oak's lobed leaf with
    a ball beside it, for the story that MacKenzie and Hunter shaped the bunkers after the oaks
    (`assets-src/logo_concepts/meadow_club/`, `course_logos/meadow_club.py`). Original drawing.
-   **Card:** the par-3 14th by the pond; rotates 13, 4 and 7 (`assets-src/cards/meadow_club.json`).

## Theme

`meadow_club`: Stanford's peninsula palette (the same Bay Area oak woodland, redwoods and golden
summer hills) with the rough's straw tones for the native grass
(`assets-src/palettes/meadow_club.json`, `game/public/sprites/trees_meadow_club*`).

## Open items (for the developer)

1.  **Hole 11** is 138 yd from the centre of its OSM tee box against 152 on the card (-9.1 %).
    Built from the back of the box (148 yd, -2.5 %). Options: accept; or a tee box behind the
    mapped one if a photo shows one. Recommendation: accept.
2.  **Hole 15** is 487 yd against 506 (-3.8 %) even from the back of its box. Recommendation:
    accept.
3.  **Card:** third-party (Stymie). A photo of the printed card would settle hole 12 (382 or 374)
    and the ratings.
4.  **Lidar date:** winter 2019. Trees cut or planted since are not known; DeVries' later work
    is not checked against the data.
5.  **Range look:** drawn as rough with stakes (OGC precedent). Say if you want the stripes back.

## Config keys used beyond the defaults

`red_water_osm`, `fescue_areas`, `range_art`, `laz.max_height_m`, `trees_off_fairways_m`,
`driving_range_is_ob`.

## Lessons

-   rockyweb.usgs.gov times out on some tiles from the GitHub runner; a plain retry worked. The
    TNM S3 path `prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/LPC/Projects/...` returned
    404 for this project's tiles.
-   The release API gives each asset's sha256 (`digest`), handy for `release.json`.
-   `s05` doesn't rerun when only `laz` changes in the config: force it with
    `ARGS="--from s05_trees"` after adding lidar.
