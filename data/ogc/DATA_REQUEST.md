# Oregon Golf Club — data request (2026-10-19)

Course: Oregon Golf Club, West Linn (Stafford area), Clackamas County, OR.
Course id `ogc` (logo already on `main`: great blue heron in golden grass).
UTM zone 10N (EPSG:32610), same as Oswego Lake and Tualatin.

## Already in hand (GitHub release `ogc-data`)

| File | SHA-256 | Use |
|---|---|---|
| `Oregon.Golf.Club.geojson` (Overpass Turbo export, 2026-10-19 02:51 UTC) | 1e4d6db2fe4b8acdfd8bf476067d2212631013a89d8fca5529e333ceff32848c | copied to `raw/overpass.geojson`; the layout source |
| `40815.jpg`, `40816.jpg`, `getImage.gif` (a JPEG), `maxresdefault.jpg` | see release | look-only reference photos, copied to `reference/ogc/` |

### OSM coverage (audit by hand, before s03)

- Boundary: `relation/11815308` "Oregon Golf Club", 107.6 ha, 1,100 x 2,120 m.
- 18 `golf=hole` lines with ref, par and handicap; pars and stroke index match the
  GolfPass card on every hole. Every line ends on a green and every hole green has a
  `golf=pin`. The line starts measure within about 6 % of the Black (back) tees.
- 70 tee boxes (2-6 within 60 m of each line start), 24 fairways, 29 greens,
  34 bunkers, 46 cart-path lines, 8 water hazards (7 lateral, 1 yellow),
  12 woods, 233 buildings, roads, Petes Mountain Creek and other streams.
- 11 greens not on a hole (`P1-P11` in `proposed/osm_labelled.png`): P1-P9 look like
  target greens on the practice range, P10-P11 putting/short-game greens by the
  clubhouse. **No `golf=driving_range` polygon** is mapped.
- 8 small `golf=rough` patches (160-600 m2) next to tee starts (holes 1, 2, 3, 12):
  possibly forward tee boxes tagged as rough. To be checked against lidar pads.
- Water W7 and W8 lie partly outside the boundary. The Willamette River is 200-400 m
  east of the boundary (out of bounds, scenery).

## Status (2026-10-19)

All received. The developer uploaded both DOGAMI exports to `ogc-data`
(`exportImage.6.tiff`, `exportImage.7.tiff`); identified by their values and copied to `raw/`:

| File | SHA-256 | Check |
|---|---|---|
| `raw/dogami_dtm_ft.tif` (exportImage.6) | e98bbf336c70111a084d746df6b2e1501a21a5e7453c117d457908503c24e00f | EPSG:32610, 1 m, 1480 x 2504, feet, no gaps; 56.7-730.4 ft (Willamette flat at 56.7) |
| `raw/dogami_chm_ft.tif` (exportImage.7) | 9e6c48468a80e479d9a44d17882b22f92dd940119cd96e23ecefd20389570eab | same grid, feet, 0-277 ft (power lines included; removed by s05 `remove_wires`) |

Developer's answers: world size over 2,048 m approved; Blue and White tees, Blue
default; all water red; the range holds P3-P9 and is rough on the ground; no printed
scorecard; PR #3 (Tualatin) merges first.

The original request follows.

## Problem: the course is longer than the world limit

The boundary is 2,120 m north-south; the playing features alone span 2,020 m. The
runbook limit is 2,048 m per side. Proposed world: **1,280 x 2,304 m** (x0 525148,
y0 5018412; about 90 m of scenery on every side), 2.95 km2, 13 % more than East
Potomac (1,280 x 2,048). Needs the developer's approval (COURSE_BUILD.md 6.1).

## Requested

### 1. Elevation and canopy (DOGAMI, two files)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a GeoTIFF (about 15 MB). Same services as Oswego Lake and Tualatin.

Box: EPSG:32610, x 525048-526528, y 5018312-5020816 (the proposed world plus 100 m),
1 m pixels, 1480 x 2504. In WGS84 about lon -122.6804 to -122.6614, lat 45.3178
to 45.3404.

Bare earth (save as `dogami_dtm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=525048,5018312,526528,5020816&bboxSR=32610&imageSR=32610&size=1480,2504&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (save as `dogami_chm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=525048,5018312,526528,5020816&bboxSR=32610&imageSR=32610&size=1480,2504&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If the browser shows a JSON error instead of downloading (for example an image-size
limit), send the error text. Upload both files to a new release `data-ogc` (or to
`ogc-data`).

Fallback if DOGAMI fails: USGS 3DEP 1 m DEM, two tiles (about 360 MB each; the
course crosses the tile edge at lat 45.333). Newest project OR_PortlandMetro_B24
(published 2026-04-02):

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/OR_PortlandMetro_B24/TIFF/USGS_1M_10_x52y502_OR_PortlandMetro_B24.tif
- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/OR_PortlandMetro_B24/TIFF/USGS_1M_10_x52y503_OR_PortlandMetro_B24.tif

That route has no canopy model; trees would then need the LAZ point cloud of the same
project (a second request).

### 2. Scorecard confirmation

`scorecard_full.csv` is from GolfPass (golfpass.com/courses/1366-the-oregon-golf-club,
retrieved 2026-10-19; unverified). Hole sums match the printed Out/In totals except
Black (holes add to 7,070; tee table 7,052) and White (6,080 vs 6,081). A photo of the
club's printed card would confirm yardages, the women's stroke index and the ratings.

### 3. Facts about the course

- Which water is red and which yellow (W1-W8 on the map; OSM: all lateral except W4).
- Where the driving range is (so it can be out of bounds), and whether P1-P9 are
  range targets.
- Internal out of bounds, if any.
