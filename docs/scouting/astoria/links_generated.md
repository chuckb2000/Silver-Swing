## Box (astoria)

- WGS84: south 46.07780, west -123.95834, north 46.13221, east -123.90569
- EPSG:32610 (WGS 84 / UTM zone 10N): x 425970-429969, y 5103137-5109136 (3999 x 5999 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `astoria_overpass.geojson`.

```
[out:json][timeout:180][bbox:46.07780,-123.95834,46.13221,-123.90569];
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

The box is cut into 2 elevation piece(s) and 2 image piece(s) (each at most 4000 px a side); download every link.

### Bare earth (DOGAMI lidar DTM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Canopy height (DOGAMI lidar CHM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=jpg&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=jpg&f=image
```

