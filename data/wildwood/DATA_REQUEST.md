# Wildwood Golf Course — data request (2026-10-24)

Course: Wildwood Golf Course, 21881 NW St Helens Rd (US 30), Portland, Multnomah County, OR,
in a creek valley on the east slope of the Tualatin Mountains, about 1 km west of the
Multnomah Channel. Course id `wildwood`. UTM zone 10N (EPSG:32610).

World 1,024 x 1,280 m, origin (508913, 5057647) in EPSG:32610: the OSM boundary
(way 428675780, 774 x 838 m) + 125-221 m of scenery.

## Already in hand (GitHub release `wildwood-data`, uploaded 2026-10-24)

| File | SHA-256 (first 16) | What it is | Use |
|---|---|---|---|
| `export.1.geojson` | 915b7e99c7d72550 | Overpass Turbo export, 2026-10-24 13:18 UTC | copied to `raw/overpass.geojson` (in git); the layout source |
| `map.3.osm` | c8817f89c0548cef | openstreetmap.org export (bounds 45.6709-45.6867 N, 122.8955-122.8605 W) | not used (same data) |
| `Wildwood-Scorecard-for-Website.webp` | adb3ceacb63d0444 | club scorecard, Black/White/Orange, ratings and slopes | `scorecard.csv` |
| `Wildwood-Course-Map-2025.pdf` | 90a35daeaf8f9810 | club routing map (schematic): creeks, three ponds, range | routing and water check only |
| `k7nn7nifldm71.jpg`, `1-2.webp`, `5.webp`, `6-2.webp` | c36db5844d6057..., 4e925cb1540e4d..., c8c08747c0bd5d..., 8f1358fe10f596... | course photos (valley, firs, a rock-edged pond, a power line on the hill) | look only |

OSM contents: boundary (one polygon, no inner rings), 18 hole lines with ref and par,
18 greens, 18 pins, 33 tee boxes, 23 fairways, 5 bunkers, 3 `golf=water_hazard` ponds, a
creek mapped as a `natural=water` strip, 4 stream lines, 8 buildings and a pool inside
the boundary. No driving range, practice green or cart paths.

## Requested

### 1-2. Elevation and canopy (DOGAMI lidar, two files, required)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a GeoTIFF of about 7 MB (1,224 x 1,480 px, 1 m, values in feet).

Box: EPSG:32610, x 508813-510037, y 5057547-5059027 (the world + 100 m). In WGS84
about lon -122.8869 to -122.8711, lat 45.6714 to 45.6847.

Bare earth (DTM):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=508813,5057547,510037,5059027&bboxSR=32610&imageSR=32610&size=1224,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (CHM):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=508813,5057547,510037,5059027&bboxSR=32610&imageSR=32610&size=1224,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows "Error exporting image" instead of downloading, change the last part
`f=image` to `f=json`, open it again, and click the `href` link (a .tif) on the page
straight away (the server deletes it after a few minutes).

### 3. Orthophoto (OSIP 2024, 0.5 m, JPEG; needed)

Used to draw the driving range (not in OSM), to check the creeks, ponds and the
boundary's edge against the woods, and to check that the lidar's trees still stand.
JPEG because TIFF exports from this service have failed before; the bbox places the
picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=508813,5057547,510037,5059027&bboxSR=32610&imageSR=32610&size=2448,2960&format=jpg&f=image
```

If it fails, the same with `f=json` and the `href` link.

File names don't matter (`exportImage.N.tiff` is fine): the files are told apart by
their values. Upload all three to the `wildwood-data` release.

After the upload, `data/wildwood/release.json` names each file and its SHA-256, and
`make fetch NAME=wildwood` puts them in `raw/`.
