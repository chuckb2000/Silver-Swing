# Waverley Country Club — data request (2026-10-19)

Course: Waverley Country Club, 1100 SE Waverly Dr, Milwaukie, Clackamas County, OR,
on the east bank of the Willamette. Course id `waverley` (logo already exists).
UTM zone 10N (EPSG:32610), same as Oswego Lake, Eastmoreland and Tualatin.

## Already in hand (GitHub release `waverley-data`)

| File | SHA-256 (first 16) | Use |
|---|---|---|
| `Waverley.geojson` (Overpass Turbo export) | ca7d342183a3a6b8 | copied to `raw/overpass.geojson` |
| `Waverley.gpkg` | 53b0eeda66546c47 | same content as the GeoJSON; not used |
| `Screenshot.2026-10-19.165314.png` | 622af41f058c7c75 | club website scorecard; `scorecard.csv`, `scorecard_full.csv`, `reference/club_scorecard_page.png` |
| 12 Google Maps screenshots (`Screenshot.2026-10-19.1650*`, `1651*`) | see release | look only: not georeferenced, no hole numbers |

OSM contents inside the boundary (way 96457214, one polygon, 56 ha, tagged
"Waverly Country Club"): 18 `golf=fairway` polygons, one pond (way 432810024,
2,881 m2), the clubhouse. **No hole lines, greens, tees, bunkers or pins.** The
Willamette touches the west side of the boundary and lies outside it.

Scorecard (club website): Black 6,668 (par 71, 72.8/135), Blue 6,338 (par 72,
71.2/130), White 5,913 (par 72, 69.1/128). Every row adds up to its printed
total. Women's: front nine only in the screenshot (same yardages as White).

## Requested

The sandbox can't reach `gis.dogami.oregon.gov` or `imagery.oregonexplorer.info`.
Open each link in a browser; each returns a GeoTIFF. Upload all four to the
`waverley-data` release.

Box for all four: EPSG:32610, x 526404-527884, y 5032228-5034220 (the world plus
100 m). In WGS84 about lon -122.6624 to -122.6433, lat 45.4431 to 45.4609.

### 1. Bare earth, DOGAMI (save as `dogami_dtm_ft.tif`, ~12 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=526404,5032228,527884,5034220&bboxSR=32610&imageSR=32610&size=1480,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height, DOGAMI (save as `dogami_chm_ft.tif`, ~12 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=526404,5032228,527884,5034220&bboxSR=32610&imageSR=32610&size=1480,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3-4. Orthoimagery, OSIP 2024, 1 ft (two halves; the service limits height to 4,100 px)

Needed because the greens, tees, bunkers and hole lines must be traced
(`propose_trace.py` and the tracing desk, as at Indian Island). Open data,
georeferenced, so the traces are allowed and accurate.

North half (save as `osip2024_north.tif`, ~48 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=526404,5033224,527884,5034220&bboxSR=32610&imageSR=32610&size=4856,3268&format=tiff&f=image
```

South half (save as `osip2024_south.tif`, ~48 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=526404,5032228,527884,5033224&bboxSR=32610&imageSR=32610&size=4856,3268&format=tiff&f=image
```

If a link shows a JSON error instead of downloading, send the error text.

### 5. Hole routing

The club's scorecard page has a "Course Layout" link. A screenshot of that map
(hole numbers on it) identifies which fairway and green belong to which hole.
Without it the routing would be guessed, which the rules forbid.

### Optional

DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar): click
the course with the project layer on and note the lidar project name and year
(leaf-on or leaf-off decides how tree types are read).

## Received (2026-10-19)

| Release asset (`waverley-data`) | SHA-256 (first 16) | Use |
|---|---|---|
| `exportImage.10.tiff` | 9e175ae83a6f9c0e | DOGAMI bare-earth DTM (feet), `raw/dogami_dtm_ft.tif` |
| `exportImage.11.tiff` | 9aecbbafa62837e6 | DOGAMI canopy height model (feet), `raw/dogami_chm_ft.tif` |
| `_ags_0230fb21_24b6_4f5f_ba56_733fc9b7208e.tif` | d84e9bb53c93f3bb | OSIP 2024, south half (4 bands, 0.3048 m) |
| `_ags_bc54798d_7d8a_4d4d_bbec_b872d7829f96.tif` | 9c7cea0c2f12168f | OSIP 2024, north half; both mosaicked by `make_ortho.py` into `raw/osip2024_032m.tif` |
| `Screenshot.2026-10-19.170736.png` | 12abdf9811c1e5bb | the club's course layout map, `reference/club_course_layout.png` (hole identity only) |

The images came through the `f=json` form of the OSIP links (the `f=image`
form failed in the browser): open the link, then the `href` it shows.
