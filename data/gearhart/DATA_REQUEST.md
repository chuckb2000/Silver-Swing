# Gearhart Golf Links — data request (2026-10-20)

Course: Gearhart Golf Links, 1157 N Marion Ave, Gearhart, Clatsop County, OR.
Course id `gearhart` (logo already exists: the wrecked ship). UTM zone 10N
(EPSG:32610).

## Already in hand (GitHub release `gearhart-data`)

| Asset | SHA-256 | Use |
|---|---|---|
| `Gearhart.geojson` (Overpass Turbo, 2026-10-20 13:55 UTC) | 6c9a84d958e1c3ef78674804641f70ba5ec717651abaeaf1094513854f5da1b3 | copied to `raw/overpass.geojson`; the layout source |
| `gearhart.osm` (openstreetmap.org export) | c86d6ed481cf46331d0097a45035148ccd2060a4e2622f177bfc1f608e0b8690 | not used (the Overpass GeoJSON is preferred, COURSE_LESSONS.md 2) |
| `Gearhart-Scorecard.pdf` (club card, Golf ScoreCards Inc. 03/2020) | 61439724fa370716a4c52b7ef28fa1cd27a21adbf5f4d0b1b34bd0f057f62821 | `scorecard.csv`, `scorecard_full.csv`; the card's course map confirms the routing |
| `b8c07fcb-…_640x480.png`, `ggl-4-1024x769.jpg`, `images.3.jpg`, `Looking-down-the-par-5-18th-…jpg`, `The-back-nine-…jpg`, `Gearhart._McMenamins_…jpg` | see release | look-only reference (theme, trees, clubhouse) |

OSM contents: course boundary (way 158904851, one polygon, no inner rings,
572 x 1,364 m, 38.7 ha), 18 hole lines, 18 pins, 20 greens (two not at the end of
a hole: practice greens), 48 tee boxes, 19 fairways, 71 bunkers, 3 ponds tagged
`lateral_water_hazard`, Neacoxie Creek (water polygon w422896233, partly inside
the boundary by the 6th and 8th tees), 230 buildings, roads. Hole lines 14, 15
and 16 are numbered 15, 16 and 16 in OSM (see the intake questions).

## World and boxes

World (provisional): EPSG:32610, x 428261-429285, y 5097199-5098991
(1,024 x 1,792 m): the boundary's box plus about 220 m of scenery on every side,
rounded out to 256 m chunks.

Raster box = world + 100 m: x 428161-429385, y 5097099-5099091 (1,224 x 1,992 m),
about lon -123.9282 to -123.9127, lat 46.0237 to 46.0418.

## Requested

The sandbox can't reach `gis.dogami.oregon.gov`, `imagery.oregonexplorer.info`
or Overpass. Open each link in a browser; each downloads one file. The browser
may name them `exportImage.N.tiff` / `.jpg`; the names don't matter (each is
identified by its values). Upload all of them to the `gearhart-data` release.
If a link shows an error page or JSON instead of downloading, send its text.

### 1. Bare-earth elevation (DOGAMI lidar DTM, ~10 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=428161,5097099,429385,5099091&bboxSR=32610&imageSR=32610&size=1224,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height (DOGAMI lidar CHM, ~10 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=428161,5097099,429385,5099091&bboxSR=32610&imageSR=32610&size=1224,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Orthophoto (Oregon Statewide Imagery Program 2024, 0.5 m, JPEG, ~3 MB)

Used to check the lidar trees against the course as it is now. The North Coast
lidar is probably the 2008-09 flight, and the 2013-15 renovation removed many
trees on the course. JPEG because TIFF exports from this service failed at
Langdon Farms; the bbox in the link places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=428161,5097099,429385,5099091&bboxSR=32610&imageSR=32610&size=2448,3984&format=jpg&f=image
```

### 4. OSM, full world (Overpass Turbo, save as `overpass_world.geojson`)

The current export stops about 100 m short of the world on the west and south
(buildings end there), so the scenery would be blank lawn at the edges. Open
https://overpass-turbo.eu, replace the text on the left with this, click Run,
then Export -> GeoJSON -> download:

```
[out:json][timeout:120][bbox:46.0232,-123.9292,46.0423,-123.9116];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach)$"];
  nwr["landuse"~"^(grass|meadow|forest)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

### 5. Optional: lidar project and year

DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar):
turn on the project layer, click the course, and note the project name and the
year flown.
