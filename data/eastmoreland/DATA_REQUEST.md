# Eastmoreland Golf Course — data request (2026-10-19)

Course: Eastmoreland Golf Course, 2425 SE Bybee Blvd, Portland, Multnomah County, OR.
Course id `eastmoreland` (logo already exists). UTM zone 10N (EPSG:32610), same as
Oswego Lake and Tualatin. H. Chandler Egan, 1918 (club scorecard).

## Already in hand (GitHub release `data-eastmoreland`)

| File | SHA-256 (first 16) | Use |
|---|---|---|
| `Eastmoreland.geojson` (Overpass Turbo export) | 3451f0847fbbfc42 | copied to `raw/overpass.geojson`; the layout source |
| `scorecard-pdf.pdf`, `scorecardfront_orig.jpg` | a5c8938294e9d6f4, 50f54f129f1d6052 | club card, Golf ScoreCards Inc. 7/2007; `scorecard.csv`, `scorecard_full.csv` |
| `Screenshot.2026-10-19.1438{32,40,52}.png` | 477c1382d6bb839d, df0c49fad965bb93, 177b1b2a65c4efb4 | Google Maps views; look only (not georeferenced, nothing traced) |
| garden and course photos (8 files) | see release | look-only reference: theme, rhododendron garden |

OSM contents: course boundary (relation 11095178, two parts split at SE Bybee Blvd),
18 hole lines with ref/par (handicaps on 1-9 match the 2007 card), 18 pins,
20 greens (2 practice greens by the clubhouse), 44 tee boxes, 20 fairways,
33 bunkers, Crystal Springs Lake, one `golf=water_hazard` pond, Crystal Springs
Creek as stream lines, the driving range, 2,596 buildings, roads.
Crystal Springs Rhododendron Garden: OSM way 133795912 (3.9 ha, on the peninsula and
east shore of the lake), outside the golf boundary.

## Requested

### 1. Elevation and canopy (DOGAMI, two files)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a GeoTIFF (about 13 MB). Same services as Oswego Lake and Tualatin.

Box: EPSG:32610, x 527771-529251, y 5034421-5036669 (the world plus 100 m),
1 m pixels, 1480 x 2248. In WGS84 about lon -122.6448 to -122.6257, lat 45.4628 to 45.4829.

Bare earth (save as `dogami_dtm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=527771,5034421,529251,5036669&bboxSR=32610&imageSR=32610&size=1480,2248&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (save as `dogami_chm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=527771,5034421,529251,5036669&bboxSR=32610&imageSR=32610&size=1480,2248&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If the browser shows a JSON error instead of downloading (for example a size limit),
send the error text; the box can be split into a north and a south half.
Upload both files to the `data-eastmoreland` release.

Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar),
turn on the project layer, click the course and note the lidar project name and year.
NOAA lists a 2019 OLC Portland Metro flight (May-Aug 2019, leaf-on) and a 2014 Metro
flight; which one the mosaic uses here decides how tree types are read.

### 2. Current scorecard

The 2007 card and GolfPass's listing disagree: GolfPass has different men's handicaps
on 16 holes, hole 13 at 447 (Blue) / 435 (White) instead of 463 / 446, hole 12 White
136 instead of 140, and Yellow and Orange tees that are not on the 2007 card.
The OSM tee on hole 13 measures 438 yd, closer to GolfPass. A photo of the card the
pro shop hands out now would settle it.
