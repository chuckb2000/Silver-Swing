## Box (eastward_ho)

- WGS84: south 41.70171, west -70.00338, north 41.73269, east -69.96203
- EPSG:32619 (WGS 84 / UTM zone 19N): x 416555-419956, y 4617144-4620545 (3401 x 3401 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `eastward_ho_overpass.geojson`.

```
[out:json][timeout:180][bbox:41.70171,-70.00338,41.73269,-69.96203];
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
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=416555,4617144,419956,4620545&bboxSR=32619&imageSR=32619&size=3401,3401&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part to `f=json` and open the `href` it returns.

3DEP 1 m tile ids covering the box (zone 19): x41y462, x41y463 (`USGS_1M_19_<tile>_<project>.tif` under https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).

### Orthophoto (USDA NAIP via the USGS National Map, 0.852 m, JPEG)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=416555,4617144,419956,4620545&bboxSR=32619&imageSR=32619&size=3992,3992&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` and `format=jpg` with `format=tiff`.

