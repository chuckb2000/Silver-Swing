# Chambers Bay

Course id: `chambers_bay` (data folder `data/chambers_bay/`), branch `course/chambers_bay`.

## Build summary

Built by a course chat on 2026-10-20 following docs/COURSE_BUILD.md. OSM was complete (18 hole lines with the card's pars, greens, fairways, bunkers, pins and the tips and forward tee boxes) apart from the Blue tees on holes 3, 11, 12 and 15. Three of those were traced from NAIP on the hole line at the card distance (approved), and hole 11 plays from the forward mapped box (accepted). Elevation is the USGS 3DEP 1 m DEM (WA_PierceCounty_2020). Built without the lidar point cloud (developer: finish first, rebuild when the NOAA job arrives); trees are the OSM fallback, and the only tree inside the boundary is the Lone Fir. Blue tees only, new `puget` theme (golden fescue rough, grey-white waste sand, grey-blue sound water). 15 holes within 3 % of the card; 13 and 14 are accepted flags (+4.2 %), 11 an accepted fail (+16 %). 501 unit tests and 7 Playwright tests pass; robot rounds over five seeds scored 72-80 with no penalties.

## Facts

-   **Location:** 6320 Grandview Drive West, University Place, Pierce County, Washington: a links course in a former sand and gravel mine on the shore of Puget Sound (Chambers Creek Regional Park, owned by Pierce County). `state` WA. Course id `chambers_bay` (logo: the concrete ruins, design chat).
-   **Design:** Robert Trent Jones Jr., with Bruce Charlton (on site) and Jay Blasi (project architect), 2007 (thefriedegg.com). Host of the 2010 U.S. Amateur and the 2015 U.S. Open.
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,792 m (boundary 917 x 1,301 m + 182 / 246 m of scenery). Theme `puget`. Wind 3-14 mph (the developer: "pump the wind up a bit" from 2-12).
-   **Data:** OSM (developer's Overpass Turbo export, 2026-10-20, `raw/overpass.geojson` in git); USGS 3DEP 1 m DEM, project WA_PierceCounty_2020_A20, tile x53y523 (release `chambers-bay-data`, clipped to `raw/usgs_dem_2020_1m_clip.tif` in git by `release.json`); no lidar yet (the 2020 Pierce County point cloud, NOAA Data Access Viewer dataset 9343, is ordered); USDA NAIP photo via the USGS National Map image service (`exportImage.jpg` in the release; Blue tee tracing only); club scorecard PDF.
-   **Water:** no penalty area on the course. Puget Sound (water below -1.2 m in the hydro-flattened DEM, `lake_level_max_m`) and the BNSF railway and beach beside it are outside the boundary and out of bounds. The wetland pond between holes 1/10 and the range (w582088908) is drawn as woods (developer). The practice range (OSM `golf=fairway`, retagged as a driving range) is out of bounds.
-   **Trees:** 1,110 from the OSM fallback (lower fidelity): the Lone Fir (OSM node 3605861053, a Douglas fir beside the 16th tee, the only tree inside the boundary; 13.2 m in the game, about 12.2 m / 40 ft real) and a seeded fill of the three OSM woods on the north bluff and beside the beach. Heights (6-14 m) and types (half conifers) are random; unmapped tree lines (Grandview Drive, the south car parks) are missing. No tree removed; every tee shot at the middle of the fairway clears.

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
-   Build without the lidar now and rebuild when the NOAA job arrives (option a: "the course is famous for only having one tree in play"); the Lone Fir is 40 ft tall.

## New pipeline keys or theme

-   No pipeline code changed; no new config key. `make regress` not needed.
-   New theme `puget`: `assets-src/palettes/puget.json` (same keys as `coastal`, F0-F2 for the fescue rough) using the pnw tree painters, so `game/public/sprites/trees_puget.*` is a copy of the pnw firs and broadleaves. `make assets` leaves every other sheet unchanged.

## Open items

Details in `data/chambers_bay/validation_report.md` and `report_notes.md`.

1.  Hole 11's Blue tee is not mapped and could not be placed; it plays 494 yd vs 424. Recommendation: point out the tee (a photo, Google Maps or the yardage book) and it is one `edits.json` entry.
2.  Trees are the OSM fallback until the lidar arrives (random heights and positions in the woods, unmapped tree lines missing; nothing in play changes). Recommendation: rebuild with the lidar. Steps: upload the NOAA zip to `chambers-bay-data`; add a `release.json` entry (`extract` its LAZ to `raw/laz/`); put this back in `course_config.json` after `dtm`:
    ```json
    "laz": {"paths": ["raw/laz/*.laz"], "classes": [1], "units": "m",
            "source": "2020 Lidar: Pierce County, WA (NOAA Data Access Viewer dataset 9343), clipped to the course box; class 1 (the project has no vegetation classes)",
            "label": "2020 USGS lidar", "leaf_off": false}
    ```
    then `make course NAME=chambers_bay`. Check the job's units first (an earlier NOAA job came in US feet; set `units: "ft"`), look for roofs among the crowns (`roof_last_share`, as at Wannamoisett), and put the attribution back to "Elevation and trees". The project was flown April-June 2020 (leaf-on), so tree types come from crown shape.
3.  The Lone Fir is 13.2 m in the game against about 12.2 m (40 ft). Recommendation: leave it to the lidar rebuild.

## Lessons

-   **Ask what the lidar buys before waiting for it.** Here the DEM gave every elevation and the course has one tree in play; the point cloud only changes scenery outside the boundary, so the course was finished on the OSM tree fallback and the lidar becomes a one-step rebuild. A NOAA Data Access Viewer job can take hours.

-   **A complete-looking OSM course can still lack the middle tees.** Chambers Bay's OSM maps the tips (the 2015 U.S. Open tees) and some forward boxes. On four holes no box was near the Blue card. Measure every box near each hole against every column of the card first (here 4729 = Black 295, 4730 = Sand 253 on 12), so the missing set is clear before asking.
-   **Measure off-line boxes the way s06 does** (`path_from`: straight from the tee to the next bend). Adding the sideways offset to the along-line distance put hole 3's White box (126 yd) at 149 and made it look like the Blue tee.
-   **On a links course, place a missing tee where the card distance crosses the line on mown grass.** A contour of s06's own distance over the photo, plus a green-pixel test away from paths and sand, found the spot on 3, 12 and 15 in one pass; where it fell in waste sand (11), say so instead of placing a tee there.
-   **The USDA NAIP ImageServer (gis.apfo.usda.gov) reset the developer's connection;** the same NAIP from `imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage` (JPEG, up to 4,000 px) worked at once. Pierce County's own orthophotos are vendor-licensed.
-   **A long, narrow tee strip has a centre ridge only at its wide end,** so s06's tee move (which stays on the ridge) can overshoot the card (hole 13: 521 vs 500). Accept it as a flag or ask the design chat; don't hand-place the tee.
-   **Big practice ranges can be mapped as `golf=fairway`.** List every fairway, green and tee farther than 15 m from any hole line; the 3 ha "fairway" east of 7 and 10 was the range (striped hitting areas on the photo).
-   **Scratch runs that edit the config must restore it with an absolute path.** A `trap` that copied a relative path after the script had changed directory left the config without its `laz` key.
-   **Hydro-flattened sea** sits at one value (-1.49 m here); `lake_level_max_m` just above it turns the sound into water without touching the beach.
