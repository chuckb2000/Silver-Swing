# The Muni (Lake Oswego) — data request (2026-10-22)

Course: The Muni, the City of Lake Oswego's public course (listed as "Lake Oswego
Public Golf Course"), 17525 SW Stafford Road, Lake Oswego, Clackamas County, OR,
beside the Lake Oswego Recreation and Aquatics Center and Lakeridge High School.
Course id `lake_oswego_muni`. UTM zone 10N (EPSG:32610).

Nine holes, par 30 (three par 4s: 1, 5, 8), 1,599 yd from the Black tees, by Dan
Hixson; opened 26 April 2025 on part of the old 18-hole par-3 course (1960s).
About 160 trees were removed and about 130 planted (The Fried Egg, 2025-04-28).
The new layout is not in OpenStreetMap; the old par-3 course may still be.

## Box

The course's exact position is not confirmed yet, so the box is generous:
2.0 x 2.0 km centred on about lat 45.3990, lon -122.6910, next to Lakeridge High
School (Wikipedia: 45.397, -122.694). The first box (centred on -122.663, issued
earlier the same day) missed the course to the east (developer); its links are
replaced below.

- EPSG:32610: x 523184-525184, y 5026322-5028322
- WGS84: lat 45.3900 to 45.4080, lon -122.7038 to -122.6782

Step 0 checks that the course is inside it before the big downloads.

## Requested

The sandbox can't reach `overpass-api.de`, `gis.dogami.oregon.gov` or
`imagery.oregonexplorer.info`. Open each link in a browser; each downloads one
file. Browser file names (`exportImage.N.tiff`, `.jpg`) don't matter: each file is
identified by its values. Upload everything to the course's GitHub release.
If a link shows an error or JSON instead of downloading, try the `f=json` form
(replace `f=image` at the end with `f=json`, open the `href` it shows), or send
the error text.

### 0. OSM, and a check of the box (Overpass Turbo, save as `overpass.geojson`)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**. Before exporting, look at the map: the course and the aquatics center
should sit well inside the shaded box. If they don't, stop and send the course's
coordinates (right-click it in any map, copy lat/lon); the links below will be
reissued. Otherwise **Export -> GeoJSON -> download**.

```
[out:json][timeout:120][bbox:45.3900,-122.7038,45.4080,-122.6782];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub)$"];
  nwr["landuse"~"^(grass|meadow|forest)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool|sports_centre)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

### 1. Bare earth, DOGAMI lidar DTM (~16 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=523184,5026322,525184,5028322&bboxSR=32610&imageSR=32610&size=2000,2000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height, DOGAMI lidar CHM (~16 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=523184,5026322,525184,5028322&bboxSR=32610&imageSR=32610&size=2000,2000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Lidar date (a short JSON page; copy its text or screenshot it)

The lidar predates the 2025 course. The date tells how many removed trees it
still holds.

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/identify?geometry=%7B%22x%22%3A524184%2C%22y%22%3A5027322%2C%22spatialReference%22%3A%7B%22wkid%22%3A32610%7D%7D&geometryType=esriGeometryPoint&returnCatalogItems=true&f=json
```

### 4-7. Orthophoto, OSIP 2024 (1 ft, summer 2024), four quarters, JPEG (~4-8 MB each)

The tracing base (open data, georeferenced). JPEG because TIFF exports from this
service failed at Langdon Farms; the bbox in each link places the picture.

North-west:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=523184,5027322,524184,5028322&bboxSR=32610&imageSR=32610&size=3281,3281&format=jpg&f=image
```

North-east:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=524184,5027322,525184,5028322&bboxSR=32610&imageSR=32610&size=3281,3281&format=jpg&f=image
```

South-west:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=523184,5026322,524184,5027322&bboxSR=32610&imageSR=32610&size=3281,3281&format=jpg&f=image
```

South-east:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=524184,5026322,525184,5027322&bboxSR=32610&imageSR=32610&size=3281,3281&format=jpg&f=image
```

Rename them `osip_nw.jpg`, `osip_ne.jpg`, `osip_sw.jpg`, `osip_se.jpg` if you can
(otherwise say which is which).

### 8. Routing and recent imagery (screenshots)

- The course's hole map or printed scorecard (photo or screenshot), if available.
  It fixes which green is which hole.
- Optional: Google or Bing screenshots of the course as it is now (2025-26),
  whole course plus close-ups of any area the 2024 photo shows under
  construction. Traced only where the open photo can't show a feature, tagged
  `source=google`/`bing` (CLAUDE.md 5.1 note).

## Received

2026-10-22, release `muni-data`:

| Release asset (`muni-data`) | SHA-256 (first 16) | What it is | Use |
|---|---|---|---|
| `export.geojson` | bc0f2288e6dc9f32 | Overpass export, second box | `raw/overpass.geojson`. Contents: the city's golf property (way 60087783, `leisure=golf_course`, 424 x 518 m, includes the aquatics center) and the old driving range (way 424601504); no other golf features |
| `exportImage.12.tiff` | a6a2a9408bc66265 | DOGAMI canopy height (ft), second box | clipped to `raw/dogami_chm_ft.tif` |
| `exportImage.13.tiff` | a6a2a9408bc66265 | same file as .12 | not used |
| `more.data.tiff` | 4991b2755c1fcf75 | DOGAMI bare-earth DTM (ft), second box (100-722 ft) | clipped to `raw/dogami_dtm_ft.tif` |
| `exportImage.10.tiff` | 812a521d1a801671 | DOGAMI DTM (ft), first box | not used (misses the course) |
| `exportImage.11.tiff` | 469dd5f845f5cb3c | DOGAMI canopy height (ft), first box | not used |
| `muni.25.jpg` | 62180aa5aa8ba200 | OSIP 2024 north-west quarter | `raw/osip_src/`, mosaicked into `raw/osip2024_032m.tif` |
| `muni.26.jpg` | 00d6d5e84f7eea55 | OSIP 2024 north-east quarter | as above |
| `muni.27.jpg` | 874efd970844f4c5 | OSIP 2024 south-west quarter | as above |
| `muni.28.jpg` | 8b021f2f073b89ab | OSIP 2024 south-east quarter | as above |
| `muni.21.jpg` | 380926e3a4da8cea | OSIP 2024 quarter, first box | not used |
| `muni.24.jpg` | 5bdfd6cab4a2457a | OSIP 2024 quarter, first box | not used |
| `exportImage.jpg` | 471f999a8467dc53 | OSIP 2024 quarter, first box | not used |
| `map.2.osm` | e0fa70024575a6c8 | openstreetmap.org export | not used (the Overpass GeoJSON is preferred) |
| `LOGC_SITE.PLAN_5-19-21.pdf` | de5c1b3214ec9818 | the course's 2021 site plan (routing, tees, 9-hole card 1,610 yd) | hole identity only (look only) |
| `Screenshot.2026-10-22.122955.png` | 94bdcb934f93e060 | the city's course map | hole identity only (look only) |
| `Screenshot.2026-10-22.1212*.png (6)` | see release | Google Earth historical imagery, Sep 2025 to Aug 2026 | look only so far; tracing from them would be tagged `source=google` |


- 2026-10-22, lidar date (step 3, pasted by the developer): at the box centre
  (x 526375, y 5027442, the first box; Metro 2019 covers the whole metro area) the DOGAMI mosaic's top source is
  `OLC_METRO_3DEP_2019_BARE_EARTH_FEET_OGIC_2011` (Metro 3DEP 2019, feet), over
  Metro 2014, Willamette Valley 2009 and older. Ground 462.9 ft there. The lidar
  is about four years older than the 2023-25 rebuild: its canopy still holds the
  removed trees, and its ground shows the old par-3 course's grades.
