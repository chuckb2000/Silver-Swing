## Box (sfgc)

- WGS84: south 37.69790, west -122.49611, north 37.72509, east -122.46188
- EPSG:32610 (WGS 84 / UTM zone 10N): x 544421-547422, y 4172433-4175434 (3001 x 3001 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `sfgc_overpass.geojson`.

```
[out:json][timeout:180][bbox:37.69790,-122.49611,37.72509,-122.46188];
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

### Bare earth (USGS 3DEP, best available, 1 m)

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=544421,4172433,547422,4175434&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part to `f=json` and open the `href` it returns.

3DEP 1 m tile ids covering the box (zone 10): x54y418 (`USGS_1M_10_<tile>_<project>.tif` under https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).

### Orthophoto (USDA NAIP via the USGS National Map, 0.752 m, JPEG)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=544421,4172433,547422,4175434&bboxSR=32610&imageSR=32610&size=3991,3991&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` and `format=jpg` with `format=tiff`.

