# Tualatin Country Club — data request (2026-10-19)

Course: Tualatin Country Club, Tualatin, Washington County, OR. Course id `tualatin`
(logo already exists). UTM zone 10N (EPSG:32610), same as Oswego Lake.

## Already in hand (GitHub release `data-tualatin`)

| File | SHA-256 | Use |
|---|---|---|
| `Tualatin.geojson` (Overpass Turbo export) | 7c8172da7b9175e7847c78862d1e4f1a6ede4be3749349d9158e7f872764a1e4 | copied to `raw/overpass.geojson`; the layout source |
| `Tualatin.CC.gpkg` | decc52c41b1aa5cc4092f915429995eeae7bb3fc445d566dcbf21ee518131d74 | not used (GeoJSON preferred, COURSE_LESSONS.md 2); has no hole lines either |
| `Fall_2025.jpg`, `Tualatin-Country-Club-Overhead.jpg`, `TCC_birds_eye-1024x737.jpg`, `tualatin_country_club_cover_picture.jpg` | see release | look-only reference (theme, trees, ponds) |

OSM contents: course boundary (way 146982317), 18 greens, 29 tee boxes, 21 fairways,
38 bunkers, 2 ponds tagged `lateral_water_hazard`, driving range, 3 cart-path lines,
375 buildings, roads, the Tualatin River. **No `golf=hole` lines and no `golf=pin`.**

## Status (2026-10-19)

All received. The developer uploaded both DOGAMI files to the release (named
`dogami_dtm_ft.tif.tiff` / `dogami_chm_ft.tif.tiff` there; copied to `raw/`):

| File | SHA-256 | Check |
|---|---|---|
| `raw/dogami_dtm_ft.tif` | 674075e3377113b2804600524a2f5d51f084f1c84407d354bba49d405eeac78c | EPSG:32610, 1 m, 1480 x 1736, feet, no gaps; 103.8-206.2 ft (river flat at 103.8) |
| `raw/dogami_chm_ft.tif` | 0f7519436fb51bc3fd20eb9d698d354fcf3d22a35f65fe1c997735c96713d0d4 | same grid, feet, 0-187 ft |

Routing: the developer confirmed greens A-R of `proposed/osm_labelled.png` are
holes 1-18. No printed scorecard is available. Water: all red, including the
Tualatin River (in play on holes 7, 9 and 10).

The original request follows.

## Requested

### 1. Elevation and canopy (DOGAMI, two files)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a GeoTIFF (about 10 MB). Same services as Oswego Lake.

Box: EPSG:32610, x 517110-518590, y 5025674-5027410 (the world plus 100 m),
1 m pixels, 1480 x 1736. In WGS84 about lon -122.7814 to -122.7625, lat 45.3843 to 45.4000.

Bare earth (save as `dogami_dtm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=517110,5025674,518590,5027410&bboxSR=32610&imageSR=32610&size=1480,1736&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (save as `dogami_chm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=517110,5025674,518590,5027410&bboxSR=32610&imageSR=32610&size=1480,1736&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If the browser shows a JSON error instead of downloading, send the error text.
Upload both files to the `data-tualatin` release.

Optional: in the DOGAMI Lidar Data Viewer, click on the course with the project
status layer on and note the lidar project name and year (tells us whether it was
flown leaf-on or leaf-off, which affects tree typing).

### 2. Hole routing (no hole lines in OSM)

Any one of:
- a photo or PDF of the club's scorecard or yardage book with the course map;
- or, using `proposed/osm_labelled.png`, the green letter and the Blue tee box
  number for each hole 1-18.

Bend points (doglegs) will be taken from the mapped fairway centrelines and shown to
you for approval before use.

### 3. Scorecard confirmation

`scorecard.csv` is from GolfPass (unverified). The club's printed card would settle
the Blue total (6,370 by holes vs 6,340 in the tee table) and the rating/slope.
