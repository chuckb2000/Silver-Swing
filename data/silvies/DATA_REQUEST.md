# Silvies Valley Ranch — data request

Course id `silvies`. Seneca, Grant County, OR (10000 Rendezvous Lane). UTM zone
11N (EPSG:32611). Release tag `silvies-data` (already holds the OSM files).

## Where the course is

OSM boundary `way 904342362` ("Silvies Ranch"), 186 ha: x 340019-342023,
y 4879508-4881218 (EPSG:32611), centre 44.0586 N, -118.9851. The 18 OSM hole
lines are the Craddock routing (they add up to 7,128 yd against the Challenge
card's 7,170).

## Box for every raster

- EPSG:32611: x 339750-342300, y 4879200-4881550 (2,550 x 2,350 m; the world is
  x 339997-342045, y 4879339-4881387, so this is the world + ~100 m)
- WGS84: south 44.04845, west -119.00110, north 44.07015, east -118.96858

## Already in the release (2026-10-25)

| Asset | SHA-256 | What it is |
|---|---|---|
| `export.geojson` | 130130748e9a88d2f046f28e3ddb5bf8c2fdf18b94c72392f9ad2c85795b9c96 | Overpass export, box 44.0426-44.0751 N, -119.0169 to -118.9470 (covers the world + 300 m). Build input, clipped by `clip_osm.py` |
| `map.osm` | 031380a001ed2b08da1d8687e69de09796d7912d86d17af4f07c6a3048304966 | openstreetmap.org export of the same box; not used (the Overpass file is the better source, COURSE_LESSONS.md 2) |

## Files needed

### 0. Is there lidar here? (one click, nothing to save)

Open this and send me what it says (or a screenshot). It names the lidar project
under the course, or says there is none:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/identify?geometry=%7B%22x%22%3A341000%2C%22y%22%3A4880300%2C%22spatialReference%22%3A%7B%22wkid%22%3A32611%7D%7D&geometryType=esriGeometryPoint&returnCatalogItems=true&f=json
```

Result (developer, 2026-10-25): lidar exists. The DTM mosaic at the point reads
4,714.72 ft (1,437 m). Projects under it, newest first: OR_SOUTHEAST_2023_USGS_3DEP_6_MALHEUR_STRAWBERRY
and OLC_ODF_PRIVATE_FOREST_ACCORDS_2023_MALHEUR (both 2023, after the course opened in
2017), OLC_UPPER_JOHN_DAY_3DEP_2020_SOUTH, OLC_MALHEUR_RIVER_2009. Item 4 is not needed.

### 1. Bare earth (DOGAMI DTM mosaic, 1 m, feet) → `silvies_dtm.tif`

Open, then click the `href` in the JSON page:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=339750,4879200,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

If that page errors, the same request as a direct download:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=339750,4879200,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy (DOGAMI CHM mosaic, 1 m, feet) → `silvies_chm.tif`

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=339750,4879200,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

Direct download instead:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=339750,4879200,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Photo, OSIP 2024, 0.5 m, JPEG, four quarters → `silvies_nw.jpg`, `_ne`, `_sw`, `_se`

(The service caps a side at about 4,100 px, so the box goes in quarters.)

NW:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=339750,4880375,341025,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=jpg&f=json
```
NE:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=341025,4880375,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=jpg&f=json
```
SW:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=339750,4879200,341025,4880375&bboxSR=32611&imageSR=32611&size=2550,2350&format=jpg&f=json
```
SE:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=341025,4879200,342300,4880375&bboxSR=32611&imageSR=32611&size=2550,2350&format=jpg&f=json
```

If a JSON page errors, change the last part `f=json` to `f=image`.

### 4. Only if item 0 says there is no lidar

Bare earth from USGS 3DEP (best available; 10 m where there is no lidar), one
direct download → `silvies_3dep.tif`:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=339750,4879200,342300,4881550&bboxSR=32611&imageSR=32611&size=2550,2350&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

and if the OSIP links fail, the photo from USDA NAIP (0.6 m) in two halves:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=339750,4880375,342300,4881550&bboxSR=32611&imageSR=32611&size=3984,1836&format=jpg&f=image
```
```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=339750,4879200,342300,4880375&bboxSR=32611&imageSR=32611&size=3984,1836&format=jpg&f=image
```

### 5. Scorecard

A photo of the printed Craddock card (both sides), if you have one. The only
card found online (GolfPass) disagrees with the OSM routing on holes 2 and 16.

Add every file to the `silvies-data` release and keep it published (not a draft).

## Canopy: what arrived and what's needed instead (2026-10-25)

`_ags_f865b3b0_e1b1_4af1_b447_007176fca9e4.tif` (sha256 24502257afba11e04bcc419c8e56991e6775fbd6e876607dd956b55d62d2aac8)
is the DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC on the box (feet, 0-141 ft), but **75 % of it is
nodata**: the mosaic has canopy only for the forest north of the course and a sliver in
the south. The DTM mosaic under the course comes from OR_SouthEast_6_D22 (USGS 3DEP,
Malheur-Strawberry, flown 2 June-11 August 2023, 8 points/m2, UTM 11N NAD83(2011),
metres; DOGAMI mapping report), which has no canopy layer in the DOGAMI mosaic. Its
points are classed 1 (unclassified: trees, shrubs, roofs), 2 ground, 7/18 noise, 9 water,
17 bridges, 20 ignored ground. So the trees come from that point cloud.

### 6. Lidar points, OR_SouthEast_6_D22, clipped to the box (one zip, LAZ)

Route A, NOAA Data Access Viewer (one clipped file, as for Franklin, Triggs, Stanford):
1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/
2. Draw a rectangle: south 44.04845, west -119.00110, north 44.07015, east -118.96858
   (or zoom to Seneca, OR, and draw round the golf course with a little margin).
3. In the list, pick the 2023 (or "2022 D22") USGS lidar for southeast Oregon / Malheur-
   Strawberry; Add to cart.
4. Cart: output **LAZ**, projection **UTM zone 11N, NAD83(2011), metres**, vertical
   **NAVD88 metres**, classes **1 and 2** (all classes is fine too). Submit; the email
   brings a zip link.
5. Upload the zip to the `silvies-data` release.

Route B, USGS National Map downloader, if NOAA doesn't list the project:
1. Open https://apps.nationalmap.gov/downloader/
2. Tick **Elevation Source Data (3DEP) - Lidar, IfSAR** → **Lidar Point Cloud (LPC)**.
3. Draw the same box; Search Products; download every `USGS_LPC_OR_SouthEast_D22_*` tile
   listed (LAZ).
4. Zip them into one file and upload it (single big LAS/LAZ uploads have failed in the
   browser; one zip has worked).
