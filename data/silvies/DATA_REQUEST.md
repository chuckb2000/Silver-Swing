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
