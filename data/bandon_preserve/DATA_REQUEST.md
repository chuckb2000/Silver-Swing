# Bandon Preserve — data request (2026-10-22)

Course: Bandon Preserve (Bill Coore and Ben Crenshaw, 2012; 13 par 3s), Bandon Dunes Golf Resort, Bandon, Coos County, OR. Course id `bandon_preserve`. UTM zone 10N (EPSG:32610). World (provisional)
1,024 x 768 m, origin (386157, 4781803).

Shorty's and Bandon Preserve sit side by side (Shorty's directly south of the
Preserve) and are built together from one set of downloads in the GitHub release
`bandon-par-threes-data` (as Pacific Dunes, Old Macdonald and Sheep Ranch shared
`pacific-dunes-data`). The full request was sent in the chat on 2026-10-22; the
links are repeated here.

## Already in hand

| Asset | SHA-256 | Use |
|---|---|---|
| `export.geojson` (Overpass Turbo; holds both courses and their neighbours) | fba74beef2e071c9f0158bb7c2255d5b47e23c456235fe26ce6db495c965ad50 | `make_osm.py` -> `raw/overpass.geojson` (committed) |
| `map.2.osm` (openstreetmap.org export, 43.17229-43.18731 N, 124.40654-124.38519 W) | c7645055e2c4838ac5e6bfc6045a86de330d00a6268f483792e2f0f0a063cc11 | not used (the Overpass export covers the same area) |

## Requested (one box for both courses)

EPSG:32610, x 386050-387300, y 4780850-4782700 (1,250 x 1,850 m; about lat
43.1718-43.1887, lon -124.4019 to -124.3869): both worlds + at least 100 m.

The sandbox can't reach `gis.dogami.oregon.gov` downloads or
`imagery.oregonexplorer.info`; the developer opens each link in a browser.
If a DOGAMI link answers "Error exporting image", the same link with `f=json`
returns a page whose `href` is the .tif (click it at once; the server deletes it).

1. DTM (bare earth, 1 m, ft):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=386050,4780850,387300,4782700&bboxSR=32610&imageSR=32610&size=1250,1850&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```
2. CHM (canopy height, 1 m, ft):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=386050,4780850,387300,4782700&bboxSR=32610&imageSR=32610&size=1250,1850&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```
3. Orthophoto (OSIP 2024, 0.5 m, JPEG; the bbox places it):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=386050,4780850,387300,4782700&bboxSR=32610&imageSR=32610&size=2500,3700&format=jpg&f=image
```
4. The resort's scorecard and routing map for Shorty's and for Bandon Preserve
   (bandondunesgolf.com, each course's "Course Routing & Scorecard"; save the images).

## Received

(filled in on arrival)
