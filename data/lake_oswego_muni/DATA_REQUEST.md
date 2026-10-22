# The Muni (Lake Oswego) — data request (2026-10-22)

Course: The Muni, the City of Lake Oswego's public course (listed as "Lake Oswego
Public Golf Course"), 17525 SW Stafford Road, Lake Oswego, Clackamas County, OR,
beside the Lake Oswego Recreation and Aquatics Center and Lakeridge High School.
Course id `lake_oswego_muni`. UTM zone 10N (EPSG:32610).

Nine holes, par 30 (three par 4s: 1, 5, 8), 1,599 yd from the Black tees, by Dan
Hixson; opened 26 April 2025 on part of the old 18-hole par-3 course (1960s).
About 160 trees were removed and about 130 planted (The Fried Egg, 2025-04-28).
The new layout is not in OpenStreetMap; the old par-3 course may still be.

## Box

The course's exact position is not confirmed yet, so the box is generous:
2.4 x 2.4 km centred on about lat 45.4000, lon -122.6630.

- EPSG:32610: x 525175-527575, y 5026242-5028642
- WGS84: lat 45.3892 to 45.4108, lon -122.6784 to -122.6476

Step 0 checks that the course is inside it before the big downloads.

## Requested

The sandbox can't reach `overpass-api.de`, `gis.dogami.oregon.gov` or
`imagery.oregonexplorer.info`. Open each link in a browser; each downloads one
file. Browser file names (`exportImage.N.tiff`, `.jpg`) don't matter: each file is
identified by its values. Upload everything to the course's GitHub release.
If a link shows an error or JSON instead of downloading, try the `f=json` form
(replace `f=image` at the end with `f=json`, open the `href` it shows), or send
the error text.

### 0. OSM, and a check of the box (Overpass Turbo, save as `overpass.geojson`)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**. Before exporting, look at the map: the course (south-west of Lakeridge
High School area, beside the aquatics center) should sit well inside the shaded
**Run**. Before exporting, look at the map: the course and the aquatics center
should sit well inside the shaded box. If they don't, stop and send the course's
coordinates (right-click it in any map, copy lat/lon); the links below will be
reissued. Otherwise **Export -> GeoJSON -> download**.

```
[out:json][timeout:120][bbox:45.3892,-122.6784,45.4108,-122.6476];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub)$"];
  nwr["landuse"~"^(grass|meadow|forest)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool|sports_centre)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

### 1. Bare earth, DOGAMI lidar DTM (~23 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=525175,5026242,527575,5028642&bboxSR=32610&imageSR=32610&size=2400,2400&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height, DOGAMI lidar CHM (~23 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=525175,5026242,527575,5028642&bboxSR=32610&imageSR=32610&size=2400,2400&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Lidar date (a short JSON page; copy its text or screenshot it)

The lidar predates the 2025 course. The date tells how many removed trees it
still holds.

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/identify?geometry=%7B%22x%22%3A526375%2C%22y%22%3A5027442%2C%22spatialReference%22%3A%7B%22wkid%22%3A32610%7D%7D&geometryType=esriGeometryPoint&returnCatalogItems=true&f=json
```

### 4-7. Orthophoto, OSIP 2024 (1 ft, summer 2024), four quarters, JPEG (~4-8 MB each)

The tracing base (open data, georeferenced). JPEG because TIFF exports from this
service failed at Langdon Farms; the bbox in each link places the picture.

North-west:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=525175,5027442,526375,5028642&bboxSR=32610&imageSR=32610&size=3937,3937&format=jpg&f=image
```

North-east:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=526375,5027442,527575,5028642&bboxSR=32610&imageSR=32610&size=3937,3937&format=jpg&f=image
```

South-west:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=525175,5026242,526375,5027442&bboxSR=32610&imageSR=32610&size=3937,3937&format=jpg&f=image
```

South-east:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=526375,5026242,527575,5027442&bboxSR=32610&imageSR=32610&size=3937,3937&format=jpg&f=image
```

Rename them `osip_nw.jpg`, `osip_ne.jpg`, `osip_sw.jpg`, `osip_se.jpg` if you can
(otherwise say which is which).

### 8. Routing and recent imagery (screenshots)

- The course's hole map or printed scorecard (photo or screenshot), if available.
  It fixes which green is which hole.
- Optional: Google or Bing screenshots of the course as it is now (2025-26),
  whole course plus close-ups of any area the 2024 photo shows under
  construction. Traced only where the open photo can't show a feature, tagged
  `source=google`/`bing` (CLAUDE.md 5.1 note).

## Received

(filled in when the files arrive: asset, SHA-256, use)
