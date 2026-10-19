# East Potomac Golf Links - data request and what arrived

Course id `east_potomac` (one data folder, three courses: `east_potomac_blue`,
`east_potomac_white`, `east_potomac_red`). UTM zone 18N, EPSG:32618.

## Extent

World (EPSG:32618): x 323434-324714, y 4303277-4305325 (1280 x 2048 m).
WGS84 box for downloads (world + 200 m): south 38.8587, west -77.0379,
north 38.8812, east -77.0178.

## Received (2026-10-19)

| Item | File | Notes |
|---|---|---|
| OSM layout (Overpass Turbo export) | `raw/overpass.geojson` | 4 `leisure=golf_course` polygons (Blue, White, Red, Practice Holes), 39 hole lines, 42 greens, 39 pins, 33 tees. The GeoPackage export (`East_Potomac.gpkg`) holds the same features, minus 3 tee polygons that GDAL keeps as lines, so it is not used. |
| Bare-earth DEM, 1 m | `raw/dc_dem_1m_clip.tif` | DC-wide `DC.TIF.2.tif` from GitHub release `data-washington-dc` (DC GIS / OCTO lidar DEM, NAD83(HARN) Maryland State Plane EPSG:2804, metres; water ~0.15 m). Clipped to the world + 100 m with `pipeline/clip_raster.py`. |
| Normalized surface model, 1 m | `raw/dc_ndsm_1m_clip.tif` | DC-wide `DC.TIF.1.tif` from the same release (height above ground, metres, water = -5). Used directly as the canopy height model. Clipped the same way. |
| Scorecards | `scorecard_blue.csv`, `scorecard_white.csv`, `scorecard_red.csv` | From the club PDFs (copies in `reference/east_potomac/`). |
| Photos and NPS maps | `reference/east_potomac/` | Art reference and visual checks only. |

SHA-256 of the full release files: DC.TIF.1.tif `e6cd1ae6...51eb1a`,
DC.TIF.2.tif `4f4ae806...695365`. Re-clip with:

```
cd pipeline
python3 clip_raster.py DC.TIF.2.tif ../data/east_potomac/raw/dc_dem_1m_clip.tif --epsg 32618 --bbox 323434 4303277 324714 4305325
python3 clip_raster.py DC.TIF.1.tif ../data/east_potomac/raw/dc_ndsm_1m_clip.tif --epsg 32618 --bbox 323434 4303277 324714 4305325
```

## Still wanted (optional, any one helps)

1. **The lidar year** of the two DC files (2018, 2020 or 2022). Only the
   attribution text changes.
2. **Tee boxes** that are in neither OSM nor the lidar: Blue course hole 13
   (both sets), hole 15 Blue tee, hole 6 Blue tee; Red course holes 5, 6, 8;
   and the forward (Red) tees of the White and Red courses. Either trace them
   in QGIS (tag `golf=tee`, `tee_set=<name>`, `hole=<n>`, `layout=<layout id>`)
   or tell me to place them from the NPS 2016 map in `reference/` (I would
   georeference it on the OSM greens).
3. **Rating/slope confirmation** for the Blue course (two web sources
   disagree; see `course_config.json`).
