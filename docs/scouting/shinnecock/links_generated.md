## Box (shinnecock)

- WGS84: south 40.87914, west -72.47372, north 40.92895, east -72.41727
- EPSG:32618 (WGS 84 / UTM zone 18N): x 712858-717459, y 4528547-4533948 (4601 x 5401 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `shinnecock_overpass.geojson`.

```
[out:json][timeout:180][bbox:40.87914,-72.47372,40.92895,-72.41727];
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
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=712858,4528547,715158,4531247&bboxSR=32618&imageSR=32618&size=2300,2700&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=715158,4528547,717459,4531247&bboxSR=32618&imageSR=32618&size=2301,2700&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=712858,4531247,715158,4533948&bboxSR=32618&imageSR=32618&size=2300,2701&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=715158,4531247,717459,4533948&bboxSR=32618&imageSR=32618&size=2301,2701&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part to `f=json` and open the `href` it returns.

3DEP 1 m tile ids covering the box (zone 18): x71y453, x71y454 (`USGS_1M_18_<tile>_<project>.tif` under https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).

### Orthophoto (USDA NAIP via the USGS National Map, 1.0 m, JPEG)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=712858,4528547,715158,4531247&bboxSR=32618&imageSR=32618&size=2300,2700&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=715158,4528547,717459,4531247&bboxSR=32618&imageSR=32618&size=2301,2700&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=712858,4531247,715158,4533948&bboxSR=32618&imageSR=32618&size=2300,2701&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=715158,4531247,717459,4533948&bboxSR=32618&imageSR=32618&size=2301,2701&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` and `format=jpg` with `format=tiff`.

