# Cypress Point Club — data request (2026-10-24)

Course: Cypress Point Club, 3150 17-Mile Drive, Pebble Beach, Monterey County, CA.
Course id `cypress_point`. UTM zone 10N (EPSG:32610). `state` CA.
World 2,048 x 1,280 m (x0 591331, y0 4048006 in EPSG:32610).

## Already in hand (release `cypress-point-data`, checked 2026-10-24)

| File | SHA-256 | What it is |
|---|---|---|
| `export.3.geojson` | 5bd59b8b24416e804b64155631308bced857d9db52194fdc5801fcaac6a32b66 | Overpass GeoJSON, 4,475 features; the layout source. Its coastline ways run the length of California (16 MB); `clip_osm.py` cuts it to the world + 300 m |
| `map.5.osm` | f43ca8fabc8e2aea8cb52f46c43579e30dafa5c0daba746aa8b3a92fc3df53d2 | openstreetmap.org export, box 36.56905,-121.98717 to 36.58917,-121.95136; same data as XML, reference only |
| `dde54a0db1e296e3bea71533_l.jpg` | a6a07e21b9629a83918573d50378460bc0004a3b9ddc73c0df25b66ef4a101df | scorecard (BlueGolf scan, undated): Championship 6,524 72.1/140, Middle 6,294 71.3/136, Forward 5,797 69.1/128 (men); every row adds up to its printed total |
| `Screenshot.2026-10-24.093642.png` | 0dac3f06cd4aca1cd98b1408ca9cffe6de202e62c6181cb4c52789d0da678e38 | Google image-search card of an allgolfholes aerial of hole 9; for identifying the dunes only, not traced |
| `55c3d0764759c60c08235293_cypress-point.jpg` | ef26506725a2ef1e87f84229df6f3f6a1dc6e9965678846263d42c388c6e991f | aerial photo, 16th green and the 17th |
| `images.jpg` | 081326b72562a419a10e21a4093c2cf8dba6c1408dd389b07db12afe651e5cdf | aerial photo, 15-17 |
| `cypress-point-12.avif` | cf98ef93e38067694dd4ed73cbc35043ac2a1ed3d7a07204a5ae9d6a51942393 | ground photo, a green below the dunes |
| `watermarked_10.webp` | 7b3d9e607ac8e814432af44875236addf2aa3399bb0a4718645a3b207e09578b | third-party poster of the 16th (reference only) |

No duplicates. No elevation, lidar or orthoimagery yet.

## Requested

Box (WGS84) for all three: **south 36.5718, west -121.9809, north 36.5858, east -121.9545**
(the world plus 150 m on every side).

### 1. Bare-earth elevation (USGS 3DEP, 1 m, one request)

Open this link; it downloads a float32 GeoTIFF of the world + 100 m (about 13 MB):

https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=591231,4047906,593479,4049386&bboxSR=26910&imageSR=26910&size=2248,1480&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image

If it shows an error page, change the last part to `f=json`, open it, and open the
`href` link it returns. Upload the file as downloaded (no compression).

### 2. Lidar points for the trees (NOAA Data Access Viewer, clipped)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ and draw a rectangle over the box above.
2. The viewer lists the lidar projects that cover it. Pick the newest USGS / 3DEP project that
   covers the whole box (the trees here are evergreen, so the season doesn't matter). If unsure,
   send me the list of names.
3. Add it to the cart, open the cart, Next. Output **Point**, format **LAZ**, all classes (or 2, 4,
   5 and 6 if offered). Projection **UTM zone 10**, **NAD83(2011)**, **meters**; vertical
   **NAVD88**, **meters**.
4. Submit with your email; NOAA emails a zip link.

### 3. Orthoimagery (USDA NAIP via USGS, two halves, JPEG)

For the dune sand (OSM maps the bunkers but not the open dunes), the ocean edge and the trees.

West half:
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=591231,4047906,592355,4049386&bboxSR=32610&imageSR=32610&size=2248,2960&format=jpg&f=image

East half:
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=592355,4047906,593479,4049386&bboxSR=32610&imageSR=32610&size=2248,2960&format=jpg&f=image

Save as `naip_west.jpg` and `naip_east.jpg` (the bbox in the link georeferences them).

### 4. Hand-off

Upload the GeoTIFF, the NOAA zip and the two JPEGs to the release `cypress-point-data`
("Attach binaries" box, below the description), then **Publish release**.

## Developer's calls (2026-10-24)

- The Pacific is a red penalty area wherever a ball can reach it, never out of bounds. OSM maps
  it only as coastline, so the course chat builds a sea polygon from the coastline and the DEM
  (proposed/, shown to the developer before it goes into the build).
- Dune sand: traced from NAIP, corrected by the developer in the tracing desk, added as
  `golf=bunker` + `sand=waste` (plays as bunkers until the design chat adds a waste-sand surface;
  request in docs/courses/cypress_point.md).
- New theme `monterey` (approved). Logo: drafts of the otter and the 16th with the cypress.
