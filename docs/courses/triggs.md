# Triggs Memorial Golf Course

Course id: `triggs` (data folder `data/triggs/`), branch `course/triggs`.

## Build summary

Built by a course chat on 2026-10-20 following docs/COURSE_BUILD.md, with the standing defaults (4.1); the developer chose the `seekonk` theme and the logo subject, then went to bed and asked for questions to wait for the morning. OSM was complete (18 hole lines with par, handicap and `dist`; tees, greens, fairways, bunkers, water, cart paths; no pins). Elevation from the USGS 3DEP 1 m DEM and trees from the 2022 USGS RI statewide lidar (NOAA Data Access Viewer job, leaf-off), both from the same survey as Wannamoisett. Blue tees only. Every hole is within 3 % of the club's printed card after tee moves within their boxes on 7 and 12 (6,529 vs 6,588 yd, -0.9 %). No pipeline change, no new theme. The course's own checks (8.2) ran from a scratch copy of `wannamoisett.test.ts` that is not committed (course chats don't add files under `game/tests/` here); see "Requests" below.

## Facts

-   **Location:** 1533 Chalkstone Avenue, Mount Pleasant, Providence, Providence County, Rhode Island: a municipal course on a hill above the Woonasquatucket River, surrounded by city blocks. `state` RI. Course id `triggs` (logo: a Rhode Island Red rooster).
-   **Design:** Donald Ross; "1933" on the club's card, opened 1932 per the City of Providence (providenceri.gov).
-   **UTM zone:** 19N (EPSG:32619). World 1,280 x 1,280 m (x0 295174, y0 4633941). Theme `seekonk`. Wind 1-9 mph (inland New England).
-   **Data:** OSM via Overpass Turbo (the developer's `export.geojson`, 2026-10-21 00:39 UTC; `raw/overpass.geojson`, in git). USGS 3DEP 1 m DEM, project RI_Statewide_D22, tile x29y464 (release `data-triggs`; clipped to the world + 100 m in git, `raw/ri_dem_2022_1m_clip.tif`). Lidar: 2022 USGS Lidar: RI Statewide, NOAA Data Access Viewer job J1473603 (classes 1 and 2, RI State Plane metres), flown 30 March 2022 (release `data-triggs`, `release.json`; `make fetch NAME=triggs`). Scorecard: the club's printed card (images in the release, not in git: they carry the club's logo).
-   **Water:** every penalty area red (standing default): pond beside 17, pond across 13, pond across 16, two small pools on 7, and four lateral-hazard strips along the ditch crossing 11 and 12. The Woonasquatucket River and Manton Pond lie outside the boundary (out of bounds). No internal out of bounds; the driving range inside the boundary is out of bounds. The practice green by the clubhouse is a wrong green.
-   **Trees:** 8,690 from the lidar (class 1), 2,398 on the course; conifers 9 % on the course, 20 % overall, from the leaf-off last-return share. 84 crowns dropped as unmapped roofs (`roof_last_share` 0.85); OSM maps the neighbourhood's buildings well (4,026). Three trees in front of the 15th tee removed by s06b; nine on playing surfaces dropped (spec 5.4). None stood inside a fairway (`trees_off_fairways_m` 2).

## Scorecard

The club's printed card (triggs.us, front and back images, retrieved 2026-10-20). Every row adds up to its printed total; OSM's hole tags match the Blue column on every hole.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 5 | 3 | 4 | 4 | 35 | 5 | 4 | 3 | 5 | 3 | 5 | 4 | 4 | 4 | 37 | 72 |
| HCP | 9 | 3 | 1 | 17 | 11 | 7 | 15 | 13 | 5 | | 8 | 10 | 16 | 12 | 18 | 4 | 14 | 2 | 6 | | |
| Blue | 402 | 425 | 457 | 200 | 327 | 511 | 191 | 341 | 402 | 3256 | 513 | 350 | 200 | 462 | 158 | 508 | 319 | 412 | 410 | 3332 | 6588 |
| Built | 404 | 414 | 456 | 196 | 321 | 509 | 186 | 339 | 404 | 3229 | 515 | 344 | 195 | 461 | 155 | 500 | 311 | 413 | 406 | 3300 | 6529 |

Ratings/slopes (card): Blue 72.3/132, White 71.1/128, Gold 66.1/124, Red 71.3/124. The website's course page gives Blue 71.5/129, White 70.5/126, Red 72/124 (open item 1). White (6,327), Gold (5,499) and Red (5,374) are in `scorecard.csv`, not built.

## Default tee

Blue, the only set built (standing default 4.1: the card has a Blue set).

## The developer's calls

-   2026-10-20: theme `seekonk`; logo a Rhode Island Red ("a chicken").
-   2026-10-20: work through the night with the defaults; questions in the morning.
-   Everything else is a standing default (COURSE_BUILD.md 4.1) or a course-chat call listed under open items, waiting for the developer.

## New pipeline keys or theme

None. No file under `pipeline/` changed, so `make regress` was not needed (COURSE_BUILD.md 3.4).

## Open items

Details in `data/triggs/validation_report.md` ("Other open items").

1.  **Ratings:** card 72.3/132 vs website 71.5/129 for Blue. Recommendation: keep the card.
2.  **Hole 15 Blue tee** is the box behind the 14th green (34 m behind the OSM line start, 506 yd from its centre vs 508), tagged in `edits.json` by the course chat. Recommendation: accept.
3.  **Three trees removed in front of the 15th tee** by s06b. Recommendation: accept, unless the real 15th is a chute through them (`keep_tee_trees`).
4.  **Course card hole 12** (its green beside the pond). Recommendation: accept, or name another.
5.  **Logo** (rooster) and the in-game look of the course: for the developer to check on the preview build.

## Requests to the design chat

-   Add `game/tests/unit/triggs.test.ts`: the scratch copy used here (Wannamoisett's checks with Triggs' par, tee set and nine red penalty areas, plus a perfect drive straight down each hole line) passed 13 of 13. It is in the PR description so it can be committed as is.

## Lessons

-   **NOAA's Data Access Viewer can ignore the requested projection.** The job came back in RI State Plane metres (EPSG:6567), not UTM 19N; read the LAZ header before the first s00 run. s00 reprojects the horizontal from the file's CRS, so only the vertical units need setting in the config.
-   **rockyweb.usgs.gov can time out in the developer's browser,** and a project's LAZ is not always on prd-tnm.s3.amazonaws.com (only its browse images were). Offer the NOAA viewer job from the start: one clipped zip instead of nine tiles.
-   **A back tee just past the previous green** can sit outside s06's 25 m search: measuring every box within 200 m of the line start against the card found hole 15's Blue box at 506 vs 508 yd.
-   **The card's subtitle is the text before the first comma of `location`.** "Mount Pleasant, Providence, ..." would have shown the neighbourhood; use the town first.
-   **The preliminary build without lidar** (a scratch config with the `laz` key removed, restored by absolute path on exit) let terrain, greens, surfaces and art be checked while the NOAA job ran.
