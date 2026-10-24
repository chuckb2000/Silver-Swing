# Pumpkin Ridge Golf Club — data request and what arrived

Course: Pumpkin Ridge Golf Club, 12930 NW Old Pumpkin Ridge Rd, North Plains, Washington County, OR:
two 18-hole courses on one site, Witch Hollow (private) and Ghost Creek (public). Data folder
`pumpkin_ridge`, layouts `pumpkin_ridge_witch_hollow` and `pumpkin_ridge_ghost_creek`. UTM zone 10N
(EPSG:32610). The sandbox can't reach Overpass, DOGAMI or the Oregon imagery service; the developer
downloaded everything in a browser and uploaded it to the GitHub release `pumpkin_ridge-data`
(2026-10-24). `make fetch NAME=pumpkin_ridge` puts the rasters in `raw/` (`release.json`).

## What arrived (checked 2026-10-24)

| Release asset | In `raw/` | SHA-256 | Check on arrival |
|---|---|---|---|
| `export.1.geojson` | `overpass.geojson` (committed) | bdd579095d89abd4b54b5dcc12a7d29e494a9dfb457a5ed08ab95276705957f4 | Overpass export, only `@id` metadata. One `leisure=golf_course` polygon for both courses ("Pumpkin Ridge Golf Club", way 901988733, 138 ha), 36 named hole lines (Witch Hollow 1-18, Ghost Creek 1-18), 36 pins, 42 greens, 148 tees, 45 fairways, 168 bunkers, 30 water hazards |
| `_ags_244124c3_2a88_4172_b3f0_fa8133d21cc1.tif` | `dogami_dtm_ft.tif` | 8dccb90e14ac158a914596ecc3272ee4b1d973803426e4e12c612a66385b2fdf | bare earth: EPSG:32610, 1 m, 2350 x 2100, origin (498700, 5052450), float32, nodata -9999, no gaps; 179-473 ft (55-144 m) |
| `_ags_9e49efe7_2a23_45e7_9423_1db683de7751.tif` | `dogami_chm_ft.tif` | 523c0e5423cae40f4110eee41ca1fc06e28fb002afcfee3a3bb853a485a0914f | canopy height: same grid, feet, 0-187 ft, no gaps. One short power line west of the course (five 8-12 m "trees", outside the boundary, left as scenery) |
| `exportImage.jpg` | `osip2024_1m.tif` (by `make_ortho.py`) | 7c3343bdc0d2571706c5a32ea45530a95d600e9de4da557d82e1a16f253a1705 | OSIP 2024 orthophoto, 3999 x 3999 JPEG = the request box at 1.0 m; placed by the request bbox, OSM bunkers, ponds and greens line up within a few metres. `osip2024_1m.tif` = 9f075ba077ed819e3e9b1ef6794dea14d80c9b09cf13e8b807ca4783d4af7aab |
| seven photos (`.jpg`, `.avif`, `.webp`) | not used | — | look-only reference pictures of the courses |

The lidar project was not identified (no `identify` call was possible from the sandbox). The
NOAA record of OLC Portland Metro 2019 (DAV id 10044) covers North Plains, so the mosaic most likely
serves that flight; the 2024 photo shows about 180 crowns inside the boundary that have gone since
(`trees_need_ortho`).

## The DOGAMI links: f=json, and a smaller box

The scouting file's DOGAMI links asked for the whole 4 x 4 km box (3999 x 3999 float32, about
64 MB) with `f=image`; they failed in the developer's browser. `f=json` returns a short page whose
`href` is the finished GeoTIFF (as at Sheep Ranch, COURSE_LESSONS.md 23). The box was also cut
to the OSM course polygon + 400 m (2350 x 2100 m, about 21 MB a file), since the export showed
where the courses are. The links that worked:

DTM (bare earth), saved from the JSON page's `href`:
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=498700,5050350,501050,5052450&bboxSR=32610&imageSR=32610&size=2350,2100&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

CHM (canopy height):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=498700,5050350,501050,5052450&bboxSR=32610&imageSR=32610&size=2350,2100&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

Orthophoto (worked as given by the scouting file):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=497849,5049150,501848,5053149&bboxSR=32610&imageSR=32610&size=3999,3999&format=jpg&f=image
```

OSM (Overpass Turbo, Export -> GeoJSON):
```
[out:json][timeout:180][bbox:45.59589,-123.02760,45.63189,-122.97629];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr["amenity"="parking"];
);
out geom;
```

## Scorecards

Both from GolfPass (third party), transcribed by the scouting chat on 2026-10-24 and checked here:
every row adds up to its total, each stroke index uses 1-18 once, pars 72 (Witch Hollow) and 71
(Ghost Creek). Sources and conflicts: `docs/courses/pumpkin_ridge.md` and the layouts'
`scorecard_source` in `course_config.json`. The club's own cards (pumpkinridge.com) and BlueGolf's
were not read.
