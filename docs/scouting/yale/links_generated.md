## Box (yale)

- WGS84: south 41.30422, west -73.00178, north 41.33739, east -72.95778
- EPSG:32618 (WGS 84 / UTM zone 18N): x 667281-670882, y 4574539-4578140 (3601 x 3601 m)

### OSM (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download. Save as `yale_overpass.geojson`.

```
[out:json][timeout:180][bbox:41.30422,-73.00178,41.33739,-72.95778];
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
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3601,3601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part to `f=json` and open the `href` it returns.

3DEP 1 m tile ids covering the box (zone 18): x66y458, x67y458 (`USGS_1M_18_<tile>_<project>.tif` under https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/).

### Orthophoto (USDA NAIP via the USGS National Map, 0.903 m, JPEG)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3988,3988&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer` with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer` and `format=jpg` with `format=tiff`.

