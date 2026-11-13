## Box (astoria)

- WGS84: south 46.08409, west -123.94082, north 46.12032, east -123.90140
- EPSG:32610 (WGS 84 / UTM zone 10N): x 427308-430309, y 5103820-5107811 (3001 x 3991 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `astoria_overpass.geojson`.

```
[out:json][timeout:180][bbox:46.08409,-123.94082,46.12032,-123.90140];
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
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Canopy height (DOGAMI lidar CHM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=jpg&f=image
```

