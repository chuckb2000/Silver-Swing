# Astoria Golf & Country Club — data request

Course id `astoria`. Warrenton, Clatsop County, OR. UTM zone 10N (EPSG:32610).
Release tag `astoria-data`.

## Where the course is

On the OSIP 2024 photo already in the release (`astoria.jpg` = north half,
`exportImage.jpg` = south half of the scouting box x 425970-429969 /
y 5103137-5109136) the course lies between Sunset Lake (west) and US 101 (east),
south of Camp Rilea, north of Sunset Beach Lane: about x 428210-428910,
y 5105666-5106606; centre 46.1051, -123.9244. The scouting's estimate
(46.105, -123.932) was about 600 m west of it. A course-database point
(opengolfapi, 46.1020, -123.9206) falls on the clubhouse in the photo, so the
photo is placed correctly.

## Why the scouting links failed

The scouting asked for 3,999 x 3,000 px per file (about 48 MB of float32) with
`f=image`. COURSE_LESSONS.md (Bandon 23, Waverley 13) records that these ArcGIS
services fail with `f=image` and work with `f=json` (a JSON page with an `href`
to the finished file). The new links below use `f=json` and a box of
1.6 x 1.8 km around the course, about Gearhart's size.

## Box

- EPSG:32610: x 427800-429400, y 5105200-5107000 (1,600 x 1,800 m)
- WGS84: south 46.09656, west -123.93433, north 46.11292, east -123.91336

## Files

1. **OSM** → `astoria_overpass.geojson`. On https://overpass-turbo.eu paste,
   Run, Export → GeoJSON → download:

```
[out:json][timeout:180][bbox:46.09656,-123.93433,46.11292,-123.91336];
(
  nwr["leisure"="golf_course"]; nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"]; way["highway"]; way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"]; nwr["amenity"="parking"];
);
out geom;
```

2. **Bare earth** (DOGAMI DTM mosaic, 1 m, feet) → `astoria_dtm.tif`. Open, then
   click the `href` in the JSON:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=427800,5105200,429400,5107000&bboxSR=32610&imageSR=32610&size=1600,1800&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

3. **Canopy** (DOGAMI CHM mosaic, 1 m, feet) → `astoria_chm.tif`:

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=427800,5105200,429400,5107000&bboxSR=32610&imageSR=32610&size=1600,1800&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

4. **Photo at 0.5 m** (OSIP 2024, JPEG, placed by the box) → `astoria_ortho05.jpg`:

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=427800,5105200,429400,5107000&bboxSR=32610&imageSR=32610&size=3200,3600&format=jpg&f=json
```

Add them to the `astoria-data` release and publish it (not a draft).

## Already in the release (2026-10-24)

| Asset | What it is |
|---|---|
| `astoria.jpg` | OSIP 2024, 1 m, north half of the scouting box (y 5106136-5109136), 3999 x 3000 |
| `exportImage.jpg` | OSIP 2024, 1 m, south half (y 5103137-5106136), 3999 x 2999 |
| `scorecard_3100.jpg` | GSPro (golf simulator) course card for the club; not the club's own card |
| `1707486595947.webp`, `63896.jpg`, `Screen_Shot_2024-07-15_at_2.26.17_PM.png`, `4674867c...-600x345.avif`, `images.jpg` | reference photos (look only): a drone view south along the ridges with Sunset Lake, a green in a hollow in winter, the clubhouse on its dune, a green between two ridges, a green beside the lake |
