# Sandpines Golf Links — data request (2026-10-24)

Course: Sandpines Golf Links (Rees Jones, 1993), 1201 35th Street, Florence,
Lane County, OR. Course id `sandpines`. UTM zone 10N (EPSG:32610). World
1,536 x 1,280 m, origin (410177, 4872051).

Upload everything to the GitHub release **`florence-data`**. File names don't
matter: each file is identified by its values, size and hash on arrival.

The sandbox can't reach `gis.dogami.oregon.gov`, `imagery.oregonexplorer.info`
or `elevation.nationalmap.gov`, so these are browser downloads.

Download box (world + 100-130 m): x 410050-411850, y 4871950-4873450 in
EPSG:32610 (1,800 x 1,500 m); lat 43.99519-44.00891, lon -124.12184 to
-124.09964.

## Already in the release (checked 2026-10-24)

| Asset | SHA-256 | Use |
|---|---|---|
| `export.2.geojson` (Overpass, 15.8 MB, a whole region) | 964fe00b2ec2f6deb54f2184866ae739852d66ff186a0a2eacfb5e8b86c502b1 | `make_osm.py` -> `raw/overpass.geojson` (committed, world + 300 m) |
| `map.4.osm` | 4c95a04b9541dd6a604707dedd21d238b3dd2fcb908d75f9d22e0020979238f2 | not used (same data as the Overpass export) |
| `scorecard.jpg` | 59ec074e9be7819220c220bb760a63a46c78ab62d769f7d30e8cd8d14df01880 | `scorecard.csv` (every row adds up) |
| `scorecard-cover.jpg` | 0154f443593fc558ccc281a91e027497519725bf60336b5e2768f777f1c04451 | routing map and local rules (look only) |
| `Sandpines2_...jpg` (drone photo) | 2eaf2b720b3a26cce8d1a1c83bf6bf1f44118c6fad3116f3d0d180d8fccc69fd | look only (theme colours) |
| `banner5.jpg`, `course_15.jpg`, `golf-outings-....jpg`, `slideshow2-....jpg` | see release | look only (theme colours, dune-grass mounds) |

## Needed

### 1-2. Elevation and canopy: DOGAMI lidar, 1 m, EPSG:32610, feet (~11 MB each)

The course straddles 44.000 N, the north edge of DOGAMI's 2008 South Coast
project; the 2012 Central Coast project starts farther north and east. The
mosaic may have a gap or a seam here: the file's values will show it.

Open each link; a JSON page appears. Click the `href` (a .tif) on it at once
(the server deletes the file after a while).

DTM (bare earth):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=410050,4871950,411850,4873450&bboxSR=32610&imageSR=32610&size=1800,1500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

CHM (canopy height):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=410050,4871950,411850,4873450&bboxSR=32610&imageSR=32610&size=1800,1500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

### 3. Bare earth, second source: USGS 3DEP, 1 m, metres (~11 MB)

In case DOGAMI has a gap at 44.000 N. One click; the file downloads directly.

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=410050,4871950,411850,4873450&bboxSR=32610&imageSR=32610&size=1800,1500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 4. Orthophoto: Oregon Statewide Imagery Program 2024, 0.5 m, JPEG (~4 MB)

Used for the native dune-grass areas, the hole 7 and 8 tees, stale lidar
trees and the theme colours. JPEG because TIFF exports from this service have
failed (Langdon Farms); the bbox in the link places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=410050,4871950,411850,4873450&bboxSR=32610&imageSR=32610&size=3600,3000&format=jpg&f=image
```

If that returns an error, use `f=json` in place of `f=image` and click the
`href` on the JSON page.

## Received

(filled in on arrival: asset, SHA-256, what it is, where it goes)
