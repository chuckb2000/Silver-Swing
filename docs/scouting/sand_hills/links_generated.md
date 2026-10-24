## Box (sand_hills)

- WGS84: south 41.84263, west -101.13763, north 41.89796, east -101.06359
- EPSG:32614 (WGS 84 / UTM zone 14N): x 322676-328677, y 4634509-4640510 (6001 x 6001 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `sand_hills_overpass.geojson`.

```
[out:json][timeout:180][bbox:41.84263,-101.13763,41.89796,-101.06359];
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

### Bare earth (USGS 3DEP, best available, 1 m)

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=322676,4634509,325676,4637509&bboxSR=32614&imageSR=32614&size=3000,3000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=325676,4634509,328677,4637509&bboxSR=32614&imageSR=32614&size=3001,3000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=322676,4637509,325676,4640510&bboxSR=32614&imageSR=32614&size=3000,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=325676,4637509,328677,4640510&bboxSR=32614&imageSR=32614&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part to `f=json` and open the `href` it returns.

3DEP 1 m tile ids covering the box (zone 14): x32y464, x32y465 (`USGS_1M_14_<tile>_<project>.tif` under https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).

### Orthophoto (USDA NAIP via the USGS National Map, 1.0 m, JPEG)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=322676,4634509,325676,4637509&bboxSR=32614&imageSR=32614&size=3000,3000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=325676,4634509,328677,4637509&bboxSR=32614&imageSR=32614&size=3001,3000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=322676,4637509,325676,4640510&bboxSR=32614&imageSR=32614&size=3000,3001&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=325676,4637509,328677,4640510&bboxSR=32614&imageSR=32614&size=3001,3001&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` and `format=jpg` with `format=tiff`.

