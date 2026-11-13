## Box (heron_lakes)

- WGS84: south 45.58302, west -122.72960, north 45.61898, east -122.67837
- EPSG:32610 (WGS 84 / UTM zone 10N): x 521094-525075, y 5047770-5051751 (3981 x 3981 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `heron_lakes_overpass.geojson`.

```
[out:json][timeout:180][bbox:45.58302,-122.72960,45.61898,-122.67837];
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

### Bare earth (DOGAMI lidar DTM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3981,3981&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Canopy height (DOGAMI lidar CHM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3981,3981&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Orthophoto (Oregon Statewide Imagery Program 2024, 0.998 m, JPEG)

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3989,3989&format=jpg&f=image
```

