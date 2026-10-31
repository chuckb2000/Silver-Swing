# Yale Golf Course

Course id: `yale` (data folder `data/yale/`), branch `course/yale`.

## Build summary

Built overnight 2026-10-30/31 by a course chat while the developer was away (stopped at 00:15
by the account's usage limit, resumed at 07:15). OSM maps the whole course (hole lines,
greens, fairways, bunkers, most tee boxes; some tees were tagged as fairway and were turned into
tee polygons). Bare earth: the Connecticut 2023 statewide lidar DEM from CT ECO. Trees: USGS 3DEP
lidar from the same 2023 flight, 5 tiles. Two tiles that cover about a third of the course had
not arrived, so the canopy there comes from the NAIP photo (`trees_ortho`). Two tee sets:
Championship (the tips) and Long (one step forward; the card has no Blue), with Long as the
default. Every dataset was made before the 2023-26 Hanse/Wagner restoration. Long matches the
2026 card on 17 holes within 3 %, and hole 3 is flagged. Championship fails on 1, 9, 10 and 17,
because the restoration's new back tees aren't in any open data. New theme `yale`, a plough-horse
logo, and the Biarritz 9th on the card. `course_play.test.ts -t yale`: 13 passed.

## Facts

-   **Location:** 200 Conrad Drive, New Haven (Upper Westville), New Haven County, Connecticut.
    The site is rocky and wooded, west of the Yale campus. `state` CT. Course id `yale`.
-   **Design:** Seth Raynor with C. B. Macdonald (consultant) and Charles Banks (construction),
    opened 1926. Roger Rulewich worked on it in the 1990s. Gil Hanse and Jim Wagner restored it;
    it closed September 2023 and reopened 28 April 2026. Sources: the scouting notes
    (`docs/scouting/yale/` on branch `scouting/new-courses`).
-   **UTM zone:** 18 N (EPSG:32618). World 1,280 x 1,792 m (OSM boundary bbox + scenery,
    whole 256 m chunks). Theme `yale`. Wind 1-9 mph (inland New England).
-   **Data** (all fetched by the GitHub Actions workflow, release `data-yale`; see
    `data/yale/DATA_REQUEST.md` and `release.json`):
    -   OSM: the standard Overpass export, 2026-10-31 (`raw/overpass.geojson`, in git).
    -   DTM: CT ECO `elevation/Statewide2023` ImageServer export, 1 m, NAVD88 ft
        (`raw/ct2023_dem.tif`, in git).
    -   Lidar: USGS 3DEP `CT_2023Statewide_C25` (spring 2023, leaf-off, QL1). The quadrant
        tiles 930675_ne, 930675_se, 930680_se, 935670_nw and 935675_nw were clipped by
        `intake.py laz --drop-extra` (release.json).
    -   Photo: NAIP via the USGS service, 0.6 m (`raw/ortho_naip.tif`, in git; release
        `yale_naip.jpg`). The CT ECO 2023 leaf-off and CT NAIP 2023 0.3 m exports were used
        only for looking.
-   **Water:** Griest Pond (the carry on 1 and 9), the pond between 3 and 4, and the channels
    and irrigation ponds OSM maps. All are red (standing default). Out of bounds: the OSM
    course boundary; the driving range is OB.
-   **Trees:** 13,952 in the world (2,236 inside the course), median 22.8 m, max 43.7 m. Of
    these, 2,794 came from the photo fill where the two lidar tiles are missing. Types come
    from the leaf-off returns: 1,274 conifers (white pine and hemlock) and 12,678 broadleaf.
    s05 dropped 80 trees on playing surfaces, `trees_off_fairways_m` 2 dropped the trees in
    fairways, and s06b dropped 3 from tee shots (13 Long, 1 Championship). The lidar predates
    the 2024-25 corridor clearing (1,000-1,500 trees cut), so some cut trees still stand in the
    game (open item 3).

## Scorecard

Source: the course's 2026 yardage card (the developer's screenshot, release `yale-data`,
`Screenshot.2026-10-24.140812.png`). It agrees with GolfPass per hole and with 18Birdies'
ratings and stroke index.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 34 | 4 | 4 | 4 | 3 | 4 | 3 | 5 | 4 | 5 | 36 | 70 |
| HCP | 5 | 15 | 11 | 1 | 17 | 3 | 13 | 7 | 9 | | 2 | 14 | 8 | 10 | 12 | 18 | 16 | 4 | 6 | | |
| Championship | 468 | 387 | 388 | 432 | 146 | 449 | 404 | 417 | 247 | 3,338 | 461 | 379 | 415 | 233 | 384 | 198 | 547 | 488 | 611 | 3,716 | 7,054 |
| Built | 408 | 382 | 399 | 434 | 142 | 424 | 373 | 409 | 208 | | 419 | 374 | 402 | 235 | 368 | 189 | 539 | 433 | 579 | | 6,718 |
| Long | 396 | 364 | 303 | 415 | 139 | 413 | 360 | 372 | 206 | 2,968 | 408 | 337 | 388 | 209 | 369 | 188 | 501 | 423 | 570 | 3,393 | 6,361 |
| Built | 395 | 362 | 321 | 419 | 136 | 423 | 351 | 372 | 201 | | 411 | 329 | 398 | 206 | 360 | 186 | 488 | 416 | 566 | | 6,338 |

Ratings (men): Championship 74.7/144, Long 71.5/139, Regular 68.9/130, Short 64.5/110. Regular
(5,767) and Short (4,814) are in `scorecard.csv`, not built.

## Default tee

Long. The developer's call for this batch was the back tees plus Blue, or the set one step
forward of the tips when there is no Blue.

## The developer's calls

-   2026-10-30 (overnight batch): build the tips and the next set forward. Trace missing
    features carefully. When a hole is more than 8 % off or sources conflict, pick, build and
    flag. Design the logo and a new theme without asking.
-   Taken under that call (not yet seen by the developer): Championship 1, 9, 10 and 17 play
    from the back of the pre-restoration boxes, 9-17 % short, with the allowance in
    `checks.json`. Hole 3 Long +6 % is accepted. The traced tees are listed in open item 2.
    The card hole is 9.

## New pipeline keys or theme

-   `pipeline/intake.py laz --drop-extra`: writes the standard point format only. The CT 2023
    tiles carry 21 undocumented extra bytes, and laspy writes them back as an ExtraBytes VLR
    it can't read again. Without the flag the output is unchanged, so no other course moves.
-   Theme `yale` (`assets-src/palettes/yale.json`, `assets-src/trees_yale.py`): summer
    hardwoods (oak, sugar maple, beech/hickory) with white pine and hemlock as the conifers,
    in a darker woods palette started from `seekonk`.
-   Uses the existing `trees_ortho` (Strawberry Farms) for the photo fill.

## Open items

1.  **Two lidar tiles missing** (935675_sw: the east-centre of the course; 930670_ne: a strip
    along the south). The photo fill there has an F1 of 0.91 against the lidar part, but its
    interior woods are thinner than the lidar's. They were re-requested (fetch.json, and
    `fetch/requests/yale_s3.json` on branch `fetch/yale-s3` for the USGS S3 mirror).
    Recommendation: when they're in `data-yale`, add them to release.json and rebuild (one
    step).
2.  **Tees not in OSM as tees:** several tee boxes OSM tags as fairway were made tee polygons
    (`make_tees.py`, `proposed/tees.geojson`). The 12th's back tee (`tee_trace12`) was traced
    from the DEM pad, and 14's back box was split off (`tee_w287211700_back`).
    Recommendation: check 12 and 14 on the next play.
3.  **Pre-restoration data:** the new back tees on 1, 6, 9, 10 and 17 and the longer 7 aren't
    mapped. The 3rd green (rebuilt as a double punchbowl), the double fairways on 3 and 18,
    and the 2024-25 tree clearing are not shown either. Recommendation: build as is now. Later,
    either take Google Earth screenshots with control points (DATA_REQUEST.md) or wait for
    Connecticut's 2026 flight.
4.  **Template greens:** the standard green shaping (1-3 % tilt and gentle undulation) can't
    make the Biarritz swale on 9 or the punchbowl on 3. Recommendation: a design-chat request
    for a per-green shape (a swale or a bowl) if you want them.
5.  **Stroke index:** the 2026 card's row is used (it matches 18Birdies). GolfPass's front
    nine differs (scouting `scorecard_sources.md`).

## Lessons

-   The 3DEP request through rockyweb timed out after 5 of the tiles in the job's 5 hours.
    Ask for only the quadrants the world needs, and try the S3 mirror
    (`prd-tnm.s3.amazonaws.com/StagedProducts/...`) first.
-   A push from a new branch runs every request that differs from `main`, not only the new one.
-   Check that a clipped LAZ opens again before building: the CT 2023 tiles' extra bytes broke
    the round trip (`--drop-extra`).
-   `make course` skipped s05 after s00 rebuilt the canopy (`--from s05_trees` forced it).
    Worth a look in `stepcache.py` by the design chat.
