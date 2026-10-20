# Bandon Trails — data request (2026-10-20)

Course: Bandon Trails, Bandon Dunes Golf Resort, Bandon, Coos County, OR (Bill
Coore and Ben Crenshaw, opened 2005). Course id `bandon_trails` (no logo yet).
UTM zone 10N (EPSG:32610).

## Already in hand (GitHub release `bandon-trails-data`)

| Asset | SHA-256 | Use |
|---|---|---|
| `export.3.geojson` (Overpass Turbo, 2026-10-20 15:29 UTC, with metadata) | 981fb4998e17bbadc9f0be0b468b44cb61135313f77d66c1475f19483f175638 | `raw/overpass.geojson` after `strip_osm_meta.py` drops the @user/@uid/@timestamp/@version/@changeset properties; the layout source |
| `bandon.trails.osm` (openstreetmap.org export, bounds 43.16935-43.18778 N, 124.39888-124.37262 W) | 344d855b19c3d8aef4e8da3c91b9f2754c6fcbffe90077abb50715cf03ad420c | not used (the Overpass export covers the same box) |
| `Website-Trails-Scorecard-2026.jpg` (resort scorecard) | 4be7938fd22a8cf3f24e893e048347eef080cd15edc3e969405977cd9fbf204c | `scorecard.csv` |
| `BandonTrailsAerialCourseMap.jpg` (resort course map) | d24fd3013db5079ed1b577532b01ac6f9f04bf6e7d108e3d0e609c89946a988e | look only: routing check |
| `Bandon-Trails-Hole-7.jpg`, `Bandon-Dunes-Golf-Resort-Bandon-Trails.jpg`, `00efcdc2…-600x345.jpg`, `2-1-384x557.jpg`, `5-1-384x557.jpg` | see release | look only: theme, trees, sand |

OSM contents inside the Bandon Trails boundary (way 362513476, one polygon, no
inner rings, 1,366 x 1,504 m, 96.5 ha): 18 hole lines (pars match the card), 18
greens, 18 pins, 63 tee boxes, 19 fairways, 135 bunkers, 37 cart paths, two ponds
tagged `lateral_water_hazard` (beside hole 11), Round Lake Drive. Round Lake
(way 266664506, a lateral water hazard) lies just outside the boundary beside
hole 7. The export also holds Bandon Dunes, Bandon Preserve and Shortys; their
boundaries and hole lines are dropped in `edits.json` (`make_edits.py`).

## World and boxes

World: EPSG:32610, x 386501-388293, y 4780641-4782433 (1,792 x 1,792 m): the
boundary's box plus 144-213 m of scenery, rounded out to 256 m chunks.

Raster box = world + 100 m: x 386401-388393, y 4780541-4782533 (1,992 x 1,992 m),
about lon -124.3979 to -124.3730, lat 43.1691 to 43.1873.

## Requested

The sandbox can't reach `gis.dogami.oregon.gov` or `imagery.oregonexplorer.info`.
Open each link in a browser; each downloads one file. The browser may name them
`exportImage.N.tiff` / `.jpg`; the names don't matter (each is identified by its
values). Upload all of them to the `bandon-trails-data` release. If a link shows
an error page or JSON instead of downloading, send its text.

### 1. Bare-earth elevation (DOGAMI lidar DTM, ~16 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=386401,4780541,388393,4782533&bboxSR=32610&imageSR=32610&size=1992,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height (DOGAMI lidar CHM, ~16 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=386401,4780541,388393,4782533&bboxSR=32610&imageSR=32610&size=1992,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Orthophoto (Oregon Statewide Imagery Program 2024, 0.5 m, JPEG)

Used to check the lidar trees against the course as it is now: the lidar here is
probably the Oregon Lidar Consortium South Coast flight (spring 2008), three years
after the course opened. JPEG because TIFF exports from this service failed at
Langdon Farms; the bbox in the link places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=386401,4780541,388393,4782533&bboxSR=32610&imageSR=32610&size=3984,3984&format=jpg&f=image
```

### 4. Optional: lidar project and year

DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar): turn
on the project layer, click the course, and note the project name and the year
flown.
