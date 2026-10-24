# Heron Lakes Golf Club (Great Blue and Greenback) — data request (2026-10-24)

Course: Heron Lakes Golf Club, West Delta Park, North Portland, Multnomah County, OR: two 18-hole courses on one site, Great Blue (to build first) and Greenback. Data folder `heron_lakes`, layouts `heron_lakes_great_blue` and `heron_lakes_greenback`. UTM zone 10N (EPSG:32610). `state` OR. Public (City of Portland). One set of downloads covers both courses. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked. **The courses' position is the scout's estimate (no source could be read; README.md), so do step 1 first and look at the map before downloading anything else.**

## Box

- WGS84: south 45.57441, west -122.74417, north 45.61958, east -122.67982
- EPSG:32610: x 519961-524962, y 5046813-5051814 (5001 x 5001 m)
- Why this box: the centre (45.597, -122.712, west of Portland International Raceway) is an estimate, not a surveyed point. The box is 5 x 5 km, from the Columbia River in the north to beyond the Columbia Slough in the south, so both courses fit with room even if the estimate is 1.5 km out.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `heron_lakes_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:45.57441,-122.74417,45.61958,-122.67982];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr["amenity"="parking"];
);
out geom;
```

**Check before going on:** the map after Run should show both golf courses (many ponds; Portland International Raceway's oval track to the east) well inside the box. If either course is missing or touches the edge of the box, stop here and say so in the release description (or in a message): the box will be redrawn from the OSM outlines.

## 2. Bare earth (DOGAMI lidar DTM, 1 m)

Most likely the OLC West Metro 3DEP lidar (flown May-August 2019), or OLC Metro 2014; the mosaic serves the newest project it has here. Values come out in feet. Four pieces, because the box is wider and taller than 4,000 m: `_1` south-west, `_2` south-east, `_3` north-west, `_4` north-east (the same for the canopy and the photo). Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the courses, and write the project name and year in the release description.

Save as `heron_lakes_dtm_1.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_dtm_2.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_dtm_3.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_dtm_4.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m)

Places the trees (height above ground per metre, same flight as the DTM).

Save as `heron_lakes_chm_1.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_chm_2.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_chm_3.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `heron_lakes_chm_4.tif` (~25 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

Save as `heron_lakes_ortho2024_1.jpg` (~3 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=jpg&f=image
```

Save as `heron_lakes_ortho2024_2.jpg` (~3 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=jpg&f=image
```

Save as `heron_lakes_ortho2024_3.jpg` (~3 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=jpg&f=image
```

Save as `heron_lakes_ortho2024_4.jpg` (~3 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=jpg&f=image
```

## 5. Scorecard

Not collected (README.md). If you can, save both courses' scorecards as `heron_lakes_great_blue_card.pdf` / `.jpg` and `heron_lakes_greenback_card.pdf` / `.jpg` (from the course's website or Portland Parks & Recreation's golf pages). Otherwise the course chat looks for them at intake.

## 6. Course map and reference pictures (look-only, optional)

None collected. If the course's website has a course map or hole pictures, save them as `heron_lakes_<course>_map.jpg` (look-only: routing and water check).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases click **Draft a new release** with the tag `heron_lakes-data` (or open that release if it's already there), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
