# Langston Golf Course - data received and how to rebuild it

Course id `langston` (Kingman Lake, Washington DC). UTM zone 18N, EPSG:32618.

## Extent

World (EPSG:32618): x 328854-330390, y 4307124-4308660 (1536 x 1536 m).
OSM boundary (two parts, the mainland and Kingman Island): 1287 x 1323 m.

## Received (2026-10-19)

| Item | File | Notes |
|---|---|---|
| OSM layout (Overpass Turbo export, 2026-10-19 02:37 UTC) | `raw/overpass.geojson` | `Langston.geojson` from the GitHub release `data-langston`. Boundary relation 2999482 "Langston Golf Course" (two parts), 18 hole lines with par (no handicaps), 18 tees (one per hole), 18 greens, 18 pins, 18 fairways, 42 bunkers, 1 clubhouse, a 690 m2 driving-range strip, 4 golf paths; Kingman Lake (relation 1870168), the Anacostia, streams (one across hole 3), 638 buildings, 572 highways. The GeoPackage export (`Langston.gpkg`) in the same release is not used (COURSE_LESSONS.md 2). |
| Bare-earth DEM, 1 m | `raw/dc_dem_1m_clip.tif` | DC-wide `DC.TIF.2.tif` from the release `data-washington-dc` (DC GIS / OCTO lidar DEM, NAD83(HARN) Maryland State Plane EPSG:2804, metres; water ~-0.07 m). Clipped to the world + 100 m. -0.1 to 67.1 m over the world. |
| Normalized surface model, 1 m | `raw/dc_ndsm_1m_clip.tif` | DC-wide `DC.TIF.1.tif` from the same release (height above ground, metres, water = -5). Used as the canopy height model. Clipped the same way. |
| Scorecard | `scorecard.csv` | Club card PDF `langston.scorecard.pdf` (release `data-langston`; copy in `reference/langston/scorecard_langston.pdf`): Royal, White, Gold, Wake-Robin. |
| Photos | `reference/langston/lg01-lg04` | Art reference only (theme colours, trees, the lake). |

SHA-256 of the full release files (same files as East Potomac):
DC.TIF.1.tif `e6cd1ae61b400c77e695eaf9ad35e4c3509159add7efbd9faf946658ce51eb1a`,
DC.TIF.2.tif `4f4ae806e29e46f69090c583c176dea17f551aaab55864b08d584e39ad695365`.

Re-clip with:

```
cd pipeline
python3 clip_raster.py DC.TIF.2.tif ../data/langston/raw/dc_dem_1m_clip.tif --epsg 32618 --bbox 328854 4307124 330390 4308660
python3 clip_raster.py DC.TIF.1.tif ../data/langston/raw/dc_ndsm_1m_clip.tif --epsg 32618 --bbox 328854 4307124 330390 4308660
```

## Proposals made from the lidar (inputs to edits.json)

```
cd pipeline
python3 propose_tees.py langston --wide=5,6,10          # proposed/tees_lidar.geojson (+ .png)
python3 propose_channels.py langston w50095952 w902825870  # proposed/channels_lidar.geojson (+ .png)
```

The ids in `edits.json` refer to those exact commands (run after s00-s02).

## Still wanted (optional)

1. **The hole 6 Royal tee.** Not in OSM and not visible in the lidar; Royal 6 plays from the White tee (351 yd vs 398). A trace in QGIS (`golf=tee`, `tee_set=Royal`, `hole=6`), or a word on where it is, fixes it.
2. **The lidar year** of the two DC files (only the attribution text changes).
3. **Ratings/slopes** from the club or the USGA (the card prints none; GolfPass is used).
