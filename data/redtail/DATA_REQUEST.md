# RedTail Golf Center — data request (2026-10-22)

Course: RedTail Golf Center (Portland Parks & Recreation), 8200 SW Scholls Ferry Rd,
Beaverton, Washington County, OR. Course id `redtail`. UTM zone 10N (EPSG:32610).
Originally Progress Downs (Erv Thoreson, opened 1968); redesigned by John Zoller in 1999
and renamed RedTail (Portland Parks & Recreation history page).

World 1,280 x 1,280 m, origin (516930, 5033321) in EPSG:32610: the OSM boundary
(920 x 1,021 m) + 130-180 m of scenery.

## Already in hand (GitHub release `redtail-data`)

| File | SHA-256 (first 16) | Use |
|---|---|---|
| `export.1.geojson` (Overpass Turbo, 2026-10-22) | 76da3ada88ee7d66 | copied to `raw/overpass.geojson` (in git); the layout source |
| `map.3.osm` (openstreetmap.org export) | 0f9c42fc34ea5997 | not used (the Overpass export holds the same data) |
| `scorecard-large.jpg` | 6e6d1f2d5e0d1627 | club card (Golf ScoreCards Inc., 6/2012); `scorecard.csv` |

OSM contents: course boundary (way 156976873, one polygon, no holes), 18 hole lines
with ref/par/handicap, 18 pins, 22 greens (4 practice greens by the clubhouse and
range), 57 tee boxes, 25 fairways, 45 bunkers, 7 `golf=water_hazard` ponds, the
driving range, cart paths (two mapped as closed loops, fixed in `edits.json`), the
clubhouse, buildings and roads around the course.

## Requested

### 1-2. Elevation and canopy (DOGAMI lidar, two files, required)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a GeoTIFF of about 9 MB (1,480 x 1,480 px, 1 m, feet). Same services as
Oswego Lake, Tualatin and Eastmoreland.

Box: EPSG:32610, x 516830-518310, y 5033221-5034701 (the world + 100 m). In WGS84
about lon -122.7848 to -122.7658, lat 45.4523 to 45.4656.

Bare earth (DTM):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=516830,5033221,518310,5034701&bboxSR=32610&imageSR=32610&size=1480,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (CHM):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=516830,5033221,518310,5034701&bboxSR=32610&imageSR=32610&size=1480,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows "Error exporting image" instead of downloading, change the last
part `f=image` to `f=json`, open it again, and click the `href` link (a .tif) on the
page straight away (the server deletes it after a few minutes).

File names don't matter (`exportImage.N.tiff` is fine): the two are told apart by
their values. Upload both to the `redtail-data` release.

### 3. Orthophoto (optional; OSIP 2024, 0.5 m, JPEG)

Used only to look at: whether the lidar's trees are all still standing, and the
ponds' edges. JPEG because TIFF exports from this service failed before; the bbox
places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=516830,5033221,518310,5034701&bboxSR=32610&imageSR=32610&size=2960,2960&format=jpg&f=image
```

Upload it to the same release.

After the upload, `data/redtail/release.json` names each file and its SHA-256, and
`make fetch NAME=redtail` puts them in `raw/`.
