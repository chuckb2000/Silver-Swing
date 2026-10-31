# Pronghorn - Nicklaus Course

Course id: `pronghorn_nicklaus` (data folder `data/pronghorn_nicklaus/`), branch
`course/pronghorn_nicklaus`.

## Build summary

Built 2026-10-31 by a course chat working overnight while the developer was away. The
layout is OSM's Nicklaus holes (18 hole lines with pars; tees, greens, fairways, bunkers
and water mapped). Six back tee boxes were assigned from OSM pads and one (18) was traced
from the photo. OSM has no `leisure=golf_course` polygon here, so the out-of-bounds line
is a proposal grown from the mapped play. Bare earth is the DOGAMI lidar DTM mosaic.
No lidar canopy or point cloud reaches the course (DOGAMI's canopy services return no
data, the 2011 and 2002 flights have a void here, and USGS OR_SouthEast_D22 has no tiles
in these blocks), so trees come from the 2024 Oregon Statewide Imagery Program photo,
with estimated heights. Two tee sets are built: Blue (the tips, 7,379 yd, the default)
and Black (7,049 yd). Every hole is within 3 % of the card except Blue 16 (−6.5 %, from
the back of its farthest pad; flagged and accepted). New theme `pronghorn`. On the
branch: `course_play.test.ts -t pronghorn_nicklaus` 13 passed; `npm test` and `npm run e2e` results under Build history.

## Facts

-   **Location:** Pronghorn Resort (renamed Juniper Preserve in 2022), 65600 Pronghorn
    Club Dr, Bend, Deschutes County, Oregon: high desert east of Bend, with old-growth
    western juniper, sagebrush and bitterbrush on pumice ground, basalt outcrops, and
    the Cascades to the west. `state` OR. Course id `pronghorn_nicklaus`. The Fazio
    course on the same property is not built (its few OSM hole lines are dropped).
-   **Design:** Jack Nicklaus (Jack Nicklaus Signature course), opened 2004.
-   **UTM zone:** 10 N (EPSG:32610). World 1,792 x 1,792 m, origin 645173 E 4893509 N.
    Theme `pronghorn`. Wind 2-10 mph (high desert: open and drier than the wooded
    inland-PNW 1-7 band, with afternoon breezes; the course chat's call).
-   **Data** (all in git; no `release.json`; fetched by the GitHub Actions workflow
    into the release `data-pronghorn_nicklaus`):
    -   OSM: the standard Overpass export, `raw/overpass.geojson`.
    -   Bare earth: DOGAMI `DIGITAL_TERRAIN_MODEL_MOSAIC` exportImage at 1 m,
        EPSG:32610, feet (`raw/dogami_dtm_ft.tif`). Projects at the course, newest
        first: OLC_ODF_PRIVATE_FOREST_ACCORDS_2023_DESCHUTES,
        OR_SOUTHEAST_2023_USGS_3DEP_12_S_PRINEVILLE_MAURY, OLC_DESCHUTES_2011,
        DESCHUTES_2002.
    -   Photo: OSIP 2024 (`OSIP_2024_WM` exportImage, 0.5 m, four quarters placed with
        `intake.py ortho`), `raw/osip2024_05m.tif`. NAIP and a 3DEP tile were fetched
        too but aren't used.
    -   Canopy: `proposed/photo_canopy_m.tif`, made from the photo by
        `make_photo_canopy.py` (crowns by colour; height a dome per crown from its size,
        3.5-12 m). This is estimated, not measured.
-   **Water:** seven `golf=water_hazard` ponds, all red (standing default; tags in
    `edits.json`). Out of bounds: the proposed boundary (below), and the driving range.
-   **Boundary (proposal):** OSM has no course polygon. `make_boundary.py` grows every
    Nicklaus fairway, green, tee and bunker within 90 m of a hole line, and the hole lines
    themselves, by 35 m. It closes gaps under about 50 m and takes out every building
    grown 12 m (house and yard) and the range. Desert between the corridors that the
    closing doesn't reach is out of bounds.
-   **Trees:** 7,127 photo crowns in the world (1,480 inside the boundary). The
    crown-shape rule calls all of them broad, and the theme draws both classes as western
    juniper (upright and old open-grown forms), a drawing choice. A few ponderosa pines
    by the clubhouse are drawn as junipers too. 25 crowns on
    fairways, bunkers and a green were dropped (list in `validation_report.md`); a
    tree near 8's Blue tee moved the virtual tee 0.7 m. 8,841 sage and bitterbrush
    bushes come from the photo (`pipeline/gorse.py` with the Silvies sage colour rule;
    trees.json `c: 3`): flair only, no penal ground. Native areas (`fescue_areas`,
    `proposed/fescue.geojson`) play as rough in native colour.

## Scorecard

Greenskeeper.org, Pronghorn Golf Club (Nicklaus Course), read 2026-10-31. Third party,
unverified; no club card online. Every row adds up to its total.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 5 | 4 | 36 | 4 | 4 | 4 | 4 | 3 | 5 | 5 | 3 | 4 | 36 | 72 |
| HCP | 17 | 7 | 11 | 15 | 9 | 3 | 13 | 1 | 5 | | 4 | 6 | 12 | 14 | 18 | 2 | 10 | 16 | 8 | | |
| Blue | 380 | 572 | 253 | 331 | 467 | 511 | 187 | 625 | 425 | 3,751 | 472 | 462 | 342 | 378 | 173 | 543 | 571 | 205 | 482 | 3,628 | 7,379 |
| Black | 372 | 566 | 233 | 324 | 460 | 457 | 155 | 604 | 419 | 3,590 | 432 | 426 | 332 | 366 | 167 | 529 | 542 | 195 | 470 | 3,459 | 7,049 |

Ratings/slopes (men): Blue 75.2/151, Black 73.8/147, Copper 71.3/143 (6,533), Gold
68.9/135 (6,000). Silver (5,256) is the women's set (70.8/131), with no men's rating,
stored as 0. Copper, Gold and Silver are in `scorecard.csv` but aren't built. GolfPass
has the same yardages under the names Tips/Black/Rust/Gold/Silver with slightly
different ratings (Tips 75.0/148, Black 73.5/145): open item 3.

Built yardages (`data/pronghorn_nicklaus/validation_report.md`): Blue 7,264 yd as
played (7,259 from box centres) vs 7,379; Black 7,067 (7,077) vs 7,049.

## Default tee

Blue (the tips here). The developer's instruction for this build: the back tees and
Blue. Blue is the back set on this card, so the second set is the next one forward,
Black.

## The developer's calls

-   2026-10-30 (before the build): build the back tees and Blue (or the next set
    forward of the tips); trace what OSM lacks, carefully; holes over 8 % or conflicting
    sources: pick, build and flag; the logo and theme are the course chat's design.
-   Everything else below is the course chat's call, made while the developer was away,
    and is listed under Open items for review.

## New pipeline keys or theme

-   No new pipeline keys or pipeline code.
-   New theme `pronghorn`: `assets-src/palettes/pronghorn.json` (from the Silvies palette,
    checked against the OSIP 2024 photo: green irrigated turf, grey-tan native ground
    inside `fescue_areas`, darker olive desert off the course, pale buff sand, deep navy
    ponds) and
    `assets-src/trees_pronghorn.py` (upright and old western juniper sprites, and the
    `desert_bush` painter for big sagebrush and bitterbrush). Sprites are in
    `game/public/sprites/trees_pronghorn*` and `shrubs_pronghorn*`.
-   Logo `assets-src/course_logos/pronghorn_nicklaus.py`: an old western juniper with a
    twisted silver trunk on a black basalt ledge, with sage and a ball at its foot. No
    club emblem, and no pronghorn.
-   Card `assets-src/cards/pronghorn_nicklaus.json`: the par-5 8th's green against its
    pond with junipers behind. It rotates 13, 14 and 17.

## Open items

1.  **Out-of-bounds line is a proposal.** OSM has no course polygon. The line is the
    mapped play grown 35 m, with houses and the range out. Options: accept; grow it
    more (more desert playable); or trace a line from a club map. Recommendation:
    accept, and review in play.
2.  **Blue 16 is 6.5 % short** (534 vs 571 yd). It plays from the westernmost of 16's
    five pads, and the photo shows no pad farther back. Recommendation: accept
    (`checks.json` notes it).
3.  **Tee names and ratings** differ between Greenskeeper (Blue/Black, used) and
    GolfPass (Tips/Black, slightly different ratings); yardages agree.
    Recommendation: keep Greenskeeper until a club card is seen.
4.  **Tee boxes assigned or traced by the course chat** (the report says "assigned by
    the developer", the pipeline's wording for a tagged box):
    -   5 (Blue, Black), 12 (Blue, Black) and 13 (Blue, Black): OSM pads 51-67 m behind
        the line start.
    -   6 (Blue): an OSM pad 63 m behind the line start.
    -   16 (Blue, Black): an OSM pad 56 m behind the line start.
    -   18 (Blue, Black): a pad traced from the photo (`trace_tees.py`).

    Recommendation: check them in play.
5.  **Trees are from the photo, not lidar.** Heights are estimated. DOGAMI's new 2023
    Deschutes flight (OLC_ODF_PRIVATE_FOREST_ACCORDS_2023_DESCHUTES) covers the course
    for bare earth, but its highest-hit/canopy service returned no data here. When it
    is published, set `chm` to it and rebuild from s00. Recommendation: accept for now.
6.  **Sage and bitterbrush are flair** over rough, not a penal lie, as at Silvies.
    Basalt outcrops play as rough. Recommendation: accept.

## Lessons

-   Check whether a lidar canopy really covers the course before waiting on it. DOGAMI's
    canopy and highest-hit services answered without error but held no data at the
    course, and the 3DEP project listing included a project with no tiles in the box.
    Several fetch rounds were spent before falling back to the photo canopy.
-   On a resort with two courses and no `leisure=golf_course`, build the boundary from
    one course's own mapped play, and drop the other course's hole lines by id.

## Build history

-   2026-10-31: first build and hand-off. Pin `data/pronghorn_nicklaus/pipeline_pin.json`.
    `make course NAME=pronghorn_nicklaus ARGS=--fresh`: 15 steps, git clean afterwards.
    `course_play.test.ts -t pronghorn_nicklaus`: 13 passed.
-   2026-10-31 (hand-off checks, re-run): `--fresh` rebuild, 15 steps, git clean afterwards;
    `course_play.test.ts -t pronghorn_nicklaus` 13 passed; `npm run build` passed; `npm test`
    1,385 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole
    drawn sits out the next rounds of its par", the two that fail for every course until
    `make land` adds it to the daily rotation (not re-confirmed with a local roster line on
    this branch); `npm run e2e` 17 passed.
