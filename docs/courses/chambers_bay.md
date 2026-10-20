# Chambers Bay

Course id: `chambers_bay` (data folder `data/chambers_bay/`), branch `course/chambers_bay`.

## Build summary

Built by a course chat on 2026-10-20 following docs/COURSE_BUILD.md. OSM was complete (18 hole lines with the card's pars, greens, fairways, bunkers, pins and the tips and forward tee boxes) apart from the Blue tees on holes 3, 11, 12 and 15. Three of those were traced from NAIP on the hole line at the card distance (approved), and hole 11 plays from the forward mapped box (accepted). Elevation is the USGS 3DEP 1 m DEM (WA_PierceCounty_2020). Trees from the 2020 Pierce County lidar (first built on the OSM fallback the same day while the NOAA job was pending): 4,441 trees, 30 inside the boundary (the Lone Fir and a tree line along the east edge beside hole 8); the train on the BNSF track, the gravel-mine ruins and two other structures were taken out of the canopy. Blue tees only, new `puget` theme (golden fescue rough, grey-white waste sand, grey-blue sound water). 15 holes within 3 % of the card; 13 and 14 are accepted flags (+4.2 %), 11 an accepted fail (+16 %). 540 unit tests and 7 Playwright tests pass with the lidar build (merged with main: Gearhart, Bandon Trails); the course-specific checks (tee on box, pin on green, yardages, tee shots, robot round, wind, putting views, determinism) pass in a scratch test not committed (game/tests is outside the course chat's paths for this build); robot rounds over five seeds scored 72-80 with no penalties.

## Facts

-   **Location:** 6320 Grandview Drive West, University Place, Pierce County, Washington: a links course in a former sand and gravel mine on the shore of Puget Sound (Chambers Creek Regional Park, owned by Pierce County). `state` WA. Course id `chambers_bay` (logo: the concrete ruins, design chat).
-   **Design:** Robert Trent Jones Jr., with Bruce Charlton (on site) and Jay Blasi (project architect), 2007 (thefriedegg.com). Host of the 2010 U.S. Amateur and the 2015 U.S. Open.
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,792 m (boundary 917 x 1,301 m + 182 / 246 m of scenery). Theme `puget`. Wind 3-14 mph (the developer: "pump the wind up a bit" from 2-12).
-   **Data:** OSM (developer's Overpass Turbo export, 2026-10-20, `raw/overpass.geojson` in git); USGS 3DEP 1 m DEM, project WA_PierceCounty_2020_A20, tile x53y523 (release `chambers-bay-data`, clipped to `raw/usgs_dem_2020_1m_clip.tif` in git by `release.json`); the 2020 Pierce County lidar points (NOAA Data Access Viewer dataset 9343, job J1472993, flown from 10 April 2020; NAD83(2011) / Washington South metres, NAVD88 US feet; one 1.7 GB LAZ in the release, clipped to the world + 100 m by `make_laz.py` through `release.json`, 39.5 M points); USDA NAIP photo via the USGS National Map image service (`exportImage.jpg` in the release; Blue tee tracing only); club scorecard PDF.
-   **Water:** no penalty area on the course. Puget Sound (water below -1.2 m in the hydro-flattened DEM, `lake_level_max_m`) and the BNSF railway and beach beside it are outside the boundary and out of bounds. The wetland pond between holes 1/10 and the range (w582088908) is drawn as woods (developer). The practice range (OSM `golf=fairway`, retagged as a driving range) is out of bounds.
-   **Trees:** 4,441 from the lidar (class 1, highest return per metre minus the DEM), 30 inside the boundary: the Lone Fir (OSM node 3605861053 beside the 16th tee: 21.6 m and a 7.1 m crown in the lidar; typed as a conifer from its OSM `leaf_type`, `tree_types_osm`), a tree line along the east boundary by hole 8 (13-60 m from its line), shrubs at the wetland pond. Types from crown shape (flown in April, not leaf-off); 38 % conifers. Not trees, taken out: a freight train standing on the BNSF track (166 crowns, all 4.7 m; `not_trees_areas` = the OSM rail lines + 4 m, `make_not_trees.py`), the gravel-mine sorting-bin ruins beside the 18th (OSM `historic=ruins`, added as buildings 7.6-8.9 m high from the lidar, `proposed/ruins.geojson`; 17 crowns), a pole by hole 7 and the halfway-house roof (`drop_trees`), 384 crowns on other OSM buildings. Every tee shot at the middle of the fairway clears (s06b removed nothing).

## Scorecard

Club card PDF (Golf ScoreCards Inc., 10/2025), supplied by the developer in the release on 2026-10-20. Every row adds up to its printed total.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 5 | 4 | 4 | 4 | 5 | 3 | 36 | 4 | 4 | 4 | 5 | 4 | 3 | 4 | 3 | 5 | 36 | 72 |
| HCP | 3 | 9 | 15 | 13 | 5 | 7 | 1 | 17 | 11 | | 4 | 8 | 18 | 14 | 2 | 16 | 10 | 6 | 12 | | |
| Blue | 487 | 403 | 160 | 484 | 429 | 422 | 437 | 521 | 194 | 3,537 | 380 | 424 | 270 | 500 | 423 | 159 | 355 | 186 | 514 | 3,211 | 6,748 |
| Built | 486 | 404 | 158 | 496 | 434 | 409 | 426 | 518 | 199 | 3,530 | 390 | 494 | 270 | 521 | 441 | 159 | 356 | 185 | 512 | 3,328 | 6,858 |

Ratings/slopes (card, men): Black 74.4/138, Blue 72.4/134, Sand 70.6/130, White 68.0/122, Teal 63.0/109 (and combos). Black (7,158), Sand (6,345), White (5,822) and Teal (4,708) are in `scorecard.csv`, not built.

## Default tee

Blue, the only set built (COURSE_BUILD 4.1 default; developer 2026-10-20: "use blue course").

## The developer's calls

All on 2026-10-20:

-   Blue tees; wind 3-14 mph; all water red (none on the course); out of bounds = the OSM boundary; trails and cart paths inside it give free relief.
-   New theme `puget` ("coastal will be slightly off"; the result "absolutely beautiful").
-   The wetland inside the boundary stays woods.
-   Blue tees on holes 3, 12 and 15 traced from NAIP at the card distance (`proposed/tees_blue_naip.geojson`); hole 11 from the forward OSM box (496 yd, +16 %); holes 13 and 14 accepted as flags (+4.2 %).
-   The course card and title view images may be committed (outside the course chat's usual paths).
-   Course card hole 15 (course chat's pick, COURSE_BUILD 4.1).
-   Build without the lidar first and rebuild when the NOAA job arrives (option a: "the course is famous for only having one tree in play"); rebuilt with it the same evening. The developer's figure for the Lone Fir is 40 ft (12.2 m); the lidar measures 21.6 m (open item 2).

## New pipeline keys or theme

-   `tree_types_osm` (s05; `true`): a lidar tree within 4 m of an OSM `natural=tree` tagged `leaf_type=needleleaved|broadleaved` takes that type. Absent: nothing changes. Here: the Lone Fir, which crown shape called a broadleaf.
-   `not_trees_areas` (s05; a GeoJSON file in `data/<id>/`, WGS84): crowns whose top lies in these areas are dropped (a train on the track, a structure the canopy model sees). Absent: nothing changes. Here: `proposed/not_trees.geojson` from `make_not_trees.py`.
-   The design chat may add both to COURSE_BUILD 3.3 (a shared file). `make regress` (`--since origin/main --mine chambers_bay`, every course since s05 changed): 17 courses unchanged; Langston differs, and the same difference comes out with `main`'s own s05 (rebuilt to check), so it is the known stale Langston build in CLAUDE.md section 0, not this change. Langston's files were left as committed.
-   New theme `puget`: `assets-src/palettes/puget.json` (same keys as `coastal`, F0-F2 for the fescue rough) using the pnw tree painters, so `game/public/sprites/trees_puget.*` is a copy of the pnw firs and broadleaves. `make assets` leaves every other sheet unchanged.

## Open items

Details in `data/chambers_bay/validation_report.md` and `report_notes.md`.

1.  Hole 11's Blue tee is not mapped and could not be placed; it plays 494 yd vs 424. Recommendation: point out the tee (a photo, Google Maps or the yardage book) and it is one `edits.json` entry.
2.  **The Lone Fir's height.** The lidar measures 21.6 m (71 ft) with a 7.1 m crown on flat ground (spring 2020); the developer's search gave 40 ft. Recommendation: keep the measured height.
3.  **The footbridge from the park to the beach** (south-west of the course, outside the boundary, not in OSM) shows as a curved row of small trees in the scenery. Recommendation: leave it (out of bounds, far from play), or trace it as a `not_trees_areas` polygon if it bothers you.

## Lessons

-   **Look at the lidar's "trees" on a treeless course before trusting them.** Of 32 crowns inside the boundary, 2 were structures, and outside it a parked freight train made 166 identical 4.7 m crowns along the track, and the mine ruins 17 more. Equal heights in a straight line are a vehicle or a structure, not trees.
-   **OSM tags the pipeline doesn't read can still be used**: `historic=ruins` polygons became buildings through a `proposed/` file and `edits.json` (s01 classifies by kind), and railway lines became a `not_trees_areas` file.
-   **Ask what the lidar buys before waiting for it.** Here the DEM gave every elevation and the course has one tree in play; the point cloud only changes scenery outside the boundary, so the course was finished on the OSM tree fallback and the lidar becomes a one-step rebuild. A NOAA Data Access Viewer job can take hours.

-   **A complete-looking OSM course can still lack the middle tees.** Chambers Bay's OSM maps the tips (the 2015 U.S. Open tees) and some forward boxes. On four holes no box was near the Blue card. Measure every box near each hole against every column of the card first (here 4729 = Black 295, 4730 = Sand 253 on 12), so the missing set is clear before asking.
-   **Measure off-line boxes the way s06 does** (`path_from`: straight from the tee to the next bend). Adding the sideways offset to the along-line distance put hole 3's White box (126 yd) at 149 and made it look like the Blue tee.
-   **On a links course, place a missing tee where the card distance crosses the line on mown grass.** A contour of s06's own distance over the photo, plus a green-pixel test away from paths and sand, found the spot on 3, 12 and 15 in one pass; where it fell in waste sand (11), say so instead of placing a tee there.
-   **The USDA NAIP ImageServer (gis.apfo.usda.gov) reset the developer's connection;** the same NAIP from `imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage` (JPEG, up to 4,000 px) worked at once. Pierce County's own orthophotos are vendor-licensed.
-   **A long, narrow tee strip has a centre ridge only at its wide end,** so s06's tee move (which stays on the ridge) can overshoot the card (hole 13: 521 vs 500). Accept it as a flag or ask the design chat; don't hand-place the tee.
-   **Big practice ranges can be mapped as `golf=fairway`.** List every fairway, green and tee farther than 15 m from any hole line; the 3 ha "fairway" east of 7 and 10 was the range (striped hitting areas on the photo).
-   **Scratch runs that edit the config must restore it with an absolute path.** A `trap` that copied a relative path after the script had changed directory left the config without its `laz` key.
-   **Hydro-flattened sea** sits at one value (-1.49 m here); `lake_level_max_m` just above it turns the sound into water without touching the beach.
