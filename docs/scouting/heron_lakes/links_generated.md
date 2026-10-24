## Box (heron_lakes)

- WGS84: south 45.57441, west -122.74417, north 45.61958, east -122.67982
- EPSG:32610 (WGS 84 / UTM zone 10N): x 519961-524962, y 5046813-5051814 (5001 x 5001 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `heron_lakes_overpass.geojson`.

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

The box is cut into 4 elevation piece(s) and 4 image piece(s) (each at most 4000 px a side); download every link.

### Bare earth (DOGAMI lidar DTM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Canopy height (DOGAMI lidar CHM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=519961,5046813,522461,5049313&bboxSR=32610&imageSR=32610&size=2500,2500&format=jpg&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=522461,5046813,524962,5049313&bboxSR=32610&imageSR=32610&size=2501,2500&format=jpg&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=519961,5049313,522461,5051814&bboxSR=32610&imageSR=32610&size=2500,2501&format=jpg&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=522461,5049313,524962,5051814&bboxSR=32610&imageSR=32610&size=2501,2501&format=jpg&f=image
```

