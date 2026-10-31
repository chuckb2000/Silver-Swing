# Sankaty Head Golf Club

Course id: `sankaty_head` (data folder `data/sankaty_head/`), branch `course/sankaty_head`.

## Build summary

Built 2026-10-30/31 overnight by a course chat (the developer asleep; overnight calls below).
OSM maps the whole course: 18 hole lines, every green, 54 tees, 89 bunkers, cart paths.
Bare earth is the USGS 3DEP 1 m DEM (post-Sandy coastal lidar, 2013). Trees come from the NOAA 2018
Nantucket lidar (28 tiles, flown 1-2 May 2018). The ortho is USDA NAIP. Everything was fetched by the
GitHub Actions workflow. Two tee sets are built: Championship (the tips) and Blue, the default. Both are
within 1.5 % of the card in total. No hole is more than 8 % off since the developer marked the
12th's Championship tee (2026-10-31, below). The course
uses its own theme, `sankaty_head` (blond fescue moor, island scrub). Checks on the branch:
`course_play.test.ts -t sankaty_head` 13 passed; `npm test` and `npm run e2e` results are in the pull
request.

## Facts

-   **Location:** Sankaty Road, Siasconset, Nantucket, Massachusetts. It is open moorland on the
    island's east end, between Polpis Road and the bluff below Sankaty Head Light. The holes are
    split by Polpis Road: 1, 9, 10 and 16-18 are by the clubhouse south of the road, and 2-8 are
    north of it. `state` MA. Course id `sankaty_head`.
-   **Design:** H. Emerson Armstrong, 1923. Restoration by Jim Urbina, c. 2019-2020: tees lowered
    to fairway height, native fescue returned, scrub oak cleared between the fairways (LINKS
    Magazine). Private club.
-   **UTM zone:** 19 N (EPSG:32619). World 1,024 x 2,048 m, which is the 2,048 m limit north to south.
    Theme `sankaty_head`. Wind 3-14 mph (open coast).
-   **Data** (all in the release `data-sankaty_head`; `release.json` rebuilds `raw/`):
    -   OSM: the standard Overpass export, `raw/overpass.geojson`, also in git.
    -   DEM: USGS 3DEP 1 m, project MA_NE_CMGP_Sandy_Z19_2013, tiles x41y457 and x41y458.
        `make_dem.py` mosaics them; the result, `raw/dem_3dep_2013_1m.tif`, is in git.
    -   Lidar: NOAA Digital Coast dataset 9551, 2018 USGS Lidar: Nantucket. It has 28 COPC tiles
        and only class 1 and 2 (no vegetation classes). They are clipped by `intake.py laz
        --classes 1` to `raw/laz/sankaty_head_clip.laz` (118 MB, not in git).
    -   Ortho: USDA NAIP from the USGS ImageServer, four JPEG exports at 0.3 m (`raw/naip_03m.tif`,
        not in git).
-   **Water:** one pond in the 15th/17th corridor (OSM `w844650590`), red. The Atlantic polygon
    OSM tags `golf=lateral_water_hazard` lies outside the boundary, so it is plain water (out of
    bounds). Out of bounds is OSM's course boundary. The practice ground east of the clubhouse is
    the driving range, out of bounds, drawn as rough with stakes.
-   **Trees:** 3,656 from the lidar in the world, 126 of them on the course: windbreak pines,
    cedars and scrub oak by the houses and between holes. The course itself is treeless moor.
    Types come from crown shape only. No tree stood on a playing surface. The tee-shot test
    (s06b) removed none.

## Scorecard

Source: GolfPass scorecard, read 2026-10-31. It is third-party and unverified; there is no club
card online (private club). GolfLink has the same per-hole yards. Par 71.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 5 | 4 | 3 | 4 | 5 | 4 | 36 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 5 | 4 | 35 | 71 |
| HCP | 5 | 15 | 13 | 3 | 7 | 17 | 11 | 1 | 9 | | 8 | 10 | 18 | 6 | 16 | 2 | 14 | 12 | 4 | | |
| Championship | 400 | 395 | 200 | 520 | 420 | 180 | 410 | 565 | 285 | 3375 | 425 | 450 | 225 | 380 | 150 | 410 | 390 | 540 | 385 | 3355 | 6730 |
| Built | 401 | 389 | 194 | 517 | 411 | 178 | 400 | 564 | 283 | | 425 | 449 | 227 | 370 | 146 | 412 | 380 | 526 | 396 | | 6667 |
| Blue | 355 | 300 | 180 | 405 | 360 | 135 | 350 | 410 | 260 | 2755 | 360 | 350 | 160 | 325 | 110 | 360 | 315 | 450 | 340 | 2770 | 5525 |
| Built | 347 | 293 | 174 | 399 | 356 | 131 | 342 | 409 | 256 | | 357 | 350 | 158 | 319 | 107 | 360 | 308 | 448 | 336 | | 5451 |

"Built" is measured from the virtual tee in each box (the adjusted column of
`validation_report.md`). Ratings: Championship 72.6/126 and Blue 67.2/118 (GolfLink). GolfPass's
tee table gives Black 6,625 and Blue 5,580. The card's other columns (Black, White, White/Blue,
Yellow, Family) are in `scorecard.csv` and not built.

## Default tee

Blue. The developer asked for the back tees and Blue, with Blue the default (2026-10-30).

## The developer's calls

The developer was asleep, so these are the overnight standing calls (2026-10-30). Trace from
open imagery carefully. Over 8 % or conflicting sources: pick, build and flag. Logo and theme
are the course chat's design.

-   **Tees added or assigned:**
    -   1 and 12: tee boxes on the mown tee ground at the line starts (`p_tee1`, `p_tee12`).
        OSM maps that ground as fairway.
    -   12 Championship (developer, 2026-10-31): the developer marked the real back tee in the
        tracing desk (`desk/hole12.json`, 41 m2): "they are acceptable as I've saved them. Make
        sure that there is actually always a tee box under where I marked the tee."
        `make_desk_tees.py` grows the mark to an 8 x 6 m pad (`desk_tee_12`) on its centroid,
        long side along the hole line's first segment; the virtual tee stands on that centroid.
        227.4 yd against the card's 225 (+1.1 %, was 204). The pad is 10.8 m from the 11th
        green, clear of its fringe; no tree within 38 m. `checks.json` holds it at 226-229 yd:
        "developer 2026-10-31: accepted as marked".
    -   9: OSM's two fairway-tagged pads, retagged as tees.
    -   2 Blue: a mown pad by Polpis Road, traced corner by corner from NAIP (`p_tee2_fwd`,
        291 yd).
    -   16 Championship: the 1st tee's box (`p_tee16_back`, 380 yd). The 16th's line run
        backwards reaches it.
    -   1 Blue and 17 Blue: OSM boxes 25-27 m off the line, assigned by tag (346 and 447 yd).
-   **Cart paths:** all 64 OSM `golf=path` lines are cart paths (free relief). They are the
    crushed-shell paths in NAIP.
-   **Stroke index:** the GolfPass row. OSM's hole lines carry a different one (open item 2).
-   **Card:** hole 6, rotating 14, 2 and 8.
-   **Logo:** "The Lightship Basket": a Nantucket lightship basket with a whale on the lid. It is
    drawn as SVG in `assets-src/logo_concepts/sankaty_head/` and used through `concept_logo`.

## New pipeline keys or theme

-   `pipeline/intake.py laz` now leaves out COPC records when it copies a tile's header (NOAA
    Digital Coast `*.copc.laz`). laspy can't write them. Any input that worked before has none,
    so no other course changes.
-   New theme `sankaty_head`: `assets-src/palettes/sankaty_head.json` and
    `assets-src/trees_sankaty_head.py` (black pine, red cedar, pitch pine, scrub oak, bayberry).

## Open items

Details are in `data/sankaty_head/validation_report.md`.

1.  **Championship 12:** closed 2026-10-31. The developer marked the tee in the tracing desk;
    227.4 yd against 225 (was 204, -9.3 %).
2.  **Stroke index.** OSM's hole lines (11, 9, 15, 5, 3, 17, 7, 1, 13 | 4, 6, 16, 10, 18, 8, 12,
    2, 14) differ from GolfPass's (used). Recommendation: keep GolfPass until there's a photo of
    the card.
3.  **Tee names and totals.** GolfLink calls the 6,730 row Black. GolfPass's tee table gives
    Black 6,625 and Blue 5,580. Recommendation: keep the per-hole rows, which add up to 6,730 and
    5,525.
4.  **Traced or assigned tees** (above): 2 Blue, 16 Championship, and 1 and 12 at the line starts
    (12 Championship is the developer's own mark).
    Recommendation: look at them when you play.
5.  **Small flags:**
    -   3: both sets about -3 %.
    -   6 Blue: -3.2 %.
6.  **Scrub thickets.** The scrub oak and bayberry thickets around the course are under the 4 m
    tree threshold. They are drawn as the generic off-course woods texture, not bushes.
    `pipeline/gorse.py` (bushes only, no penal ground) could place them from NAIP if wanted.
    Recommendation: leave; nearly all of it is out of bounds.

## Lessons

-   A tag edit in `edits.json` doesn't change a feature's kind: s01 sets it and `merge_edits`
    keeps it. The audit's "retag golf=cartpath" hint therefore does nothing. Copy the features
    into `proposed/` with the new kind and drop the originals.
-   NOAA Digital Coast publishes `minmax_<project>.csv` beside the tiles, with each tile's UTM box.
    It is the quickest tile index; fetch it through the workflow, then the tiles from S3 (fast,
    unlike rockyweb).
-   NOAA's COPC tiles broke `intake.py laz` (COPC records in the header); fixed above.
