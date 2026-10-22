# Rock Creek Park Golf - data request and what arrived

Course id `rock_creek`. UTM zone 18N, EPSG:32618.

## Extent

World (EPSG:32618): x 322501-323781, y 4314530-4315554 (1280 x 1024 m).
WGS84 box (world): south 38.9618, west -77.0486, north 38.9713, east -77.0341.

## Already in hand (2026-10-22)

| Item | File | Notes |
|---|---|---|
| OSM layout | `raw/overpass.geojson` | `map.2.osm` (openstreetmap.org export, box 38.9596-38.9736 N, 77.0508-77.0318 W) from GitHub release `data-washington-dc`, converted with `osm_to_geojson.py`. 1 course boundary, 9 hole lines (no ref or par), 9 pins, 9 tees, 19 greens, 15 fairways, 10 bunkers. The release's `export.geojson` is not Rock Creek (it holds the Bandon par-3 courses) and is not used. |
| Bare-earth DEM, 1 m | `raw/dc_dem_1m_clip.tif` | DC-wide `DC.TIF.2.tif` (release `data-washington-dc`, SHA-256 `4f4ae806e29e46f69090c583c176dea17f551aaab55864b08d584e39ad695365`), clipped to the world + 100 m with `pipeline/clip_raster.py`. Ground 42-90 m. |
| Normalized surface model, 1 m | `raw/dc_ndsm_1m_clip.tif` | DC-wide `DC.TIF.1.tif` (same release, SHA-256 `e6cd1ae61b400c77e695eaf9ad35e4c3509159add7efbd9faf946658ce51eb1a`), clipped the same way. Used as the canopy height model. |
| Scorecard | `scorecard.csv` | The developer's photo of the printed card (14 holes, par 50, White / Red / Yellow). |

Re-clip with (the same commands run by `make fetch` from `release.json`):

```
cd pipeline
python3 clip_raster.py DC.TIF.2.tif ../data/rock_creek/raw/dc_dem_1m_clip.tif --epsg 32618 --bbox 322501 4314530 323781 4315554
python3 clip_raster.py DC.TIF.1.tif ../data/rock_creek/raw/dc_ndsm_1m_clip.tif --epsg 32618 --bbox 322501 4314530 323781 4315554
```

## Requested

### 1. DC 2023 orthophoto of the world (required: tracing the missing holes)

DC GIS Orthophoto 2023 (flown 6 and 10 May 2023, before the renovation work;
open data). One JPEG of the whole world at 0.31 m per pixel, already in
UTM 18N.

1. Open this link in a browser (it is one line):

   https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Ortho2023/MapServer/export?bbox=322501,4314530,323781,4315554&bboxSR=32618&imageSR=32618&size=4096,3277&format=jpg&f=image

2. The picture appears (4096 x 3277 px, about 3-5 MB). Right-click, "Save
   image as", name it `rc_ortho_2023.jpg`.
3. Upload it to the GitHub release `data-washington-dc` (Releases, edit the
   release, drag the file in, "Update release").

If the link shows an error instead of a picture, use this one: it returns a
short text with an `"href"` link; open that link and save the picture.

https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Ortho2023/MapServer/export?bbox=322501,4314530,323781,4315554&bboxSR=32618&imageSR=32618&size=4096,3277&format=jpg&f=json

The JPEG carries no georeferencing; the box in the link fixes its corners
(x 322501-323781, y 4314530-4315554), as at Langdon Farms.

### 2. A course map (optional, saves a round of questions)

A photo of the back of the scorecard or the course map on the clubhouse
board, if either shows the holes. Upload it to the same release.
