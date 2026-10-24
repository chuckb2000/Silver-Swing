## Box (portland_gc)

- WGS84: south 45.46166, west -122.78025, north 45.48875, east -122.74174
- EPSG:32610 (WGS 84 / UTM zone 10N): x 517180-520181, y 5034269-5037270 (3001 x 3001 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `portland_gc_overpass.geojson`.

```
[out:json][timeout:180][bbox:45.46166,-122.78025,45.48875,-122.74174];
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
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Canopy height (DOGAMI lidar CHM, 1 m)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### Orthophoto (Oregon Statewide Imagery Program 2024, 0.752 m, JPEG)

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3991,3991&format=jpg&f=image
```

