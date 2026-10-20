# Bandon Dunes — data request (2026-10-20)

Course: Bandon Dunes (the resort's first course, David McLay Kidd, 1999),
Bandon Dunes Golf Resort, Bandon, Coos County, OR. Course id `bandon_dunes`
(the developer is having its logo made; it should use this id). UTM zone 10N
(EPSG:32610).

## Already in hand (GitHub release `bandon-dunes-data`)

| Asset | SHA-256 | Use |
|---|---|---|
| `dunes.geojson` (Overpass Turbo export) | e9eda7724b40ffe98c74d974307236a76add21d92775edc9c2eac5c808d59ea1 | copied to `raw/overpass.geojson`; the layout source until the full-world export (item 4) arrives |
| `bandon.dunes.osm` (openstreetmap.org export, box lat 43.18328-43.19797, lon -124.40519 to -124.38134) | 1100ca63d5a6cb925cf0b29033ded753e7f1d2db87dbc15465f4da771574dbdb | not used (Overpass GeoJSON preferred, COURSE_LESSONS.md 2) |
| `Website-Bandon-Scorecard-2026.jpg` (club card, 2026) | 9dc99e9264fd5819b5bb0e1da8119342787dcf3a6d6d96f70972dc735199ddfc | `scorecard.csv`; every row adds up to its printed totals; stroke index 1-18 complete |
| `BD-Planmap.jpg` | 05859177b0b1835e7d020a90bd63aca4f2db530ce7042d182e01a489f31aec26 | look-only: routing check |
| `12_Bandon_Dunes-3.jpg`, `4db5d2ca…-2500x1405.jpg`, `Homepage_Slider_Sheep.jpg`, `Homepage_Slider_Shortys.jpg`, `Shortys-TripPlanner-585x741.jpg` | see release | look-only reference (theme, sand, gorse) |

OSM contents for this course: 18 hole lines named "Bandon Dunes Hole N"
(pars match the card), a green and a `golf=pin` on every hole, tee boxes near
every line start, 73 bunkers, about 35 fairways in the world, one unnamed pond
(w777788176, near hole 11). There is no Bandon Dunes polygon of its own: the
boundary is `leisure=golf_course` "Bandon Dunes Golf Resort" (w362513477,
292 ha), which also holds Pacific Dunes. The Bandon Trails, Bandon Preserve and
Practice Center polygons and the other courses' hole lines are dropped. The
boundary runs 50-80 m inland of the coastline; the beach is outside it. No
`natural=scrub`/`heath` (gorse) is mapped. The export stops about 100 m short
of the world on the north and south.

## World and boxes

World (provisional): EPSG:32610, x 386060-387340, y 4782028-4783820
(1,280 x 1,792 m): the Bandon Dunes holes' box (1,000 x 1,442 m) plus
140-175 m of scenery, rounded to 256 m chunks.

Raster box = world + 100 m: x 385960-387440, y 4781928-4783920
(1,480 x 1,992 m), about lon -124.4032 to -124.3854, lat 43.1815 to 43.1997.

## Requested

The sandbox can't reach `gis.dogami.oregon.gov`, `imagery.oregonexplorer.info`
or Overpass. Open each link in a browser; each downloads one file. The browser
may name them `exportImage.N.tiff` / `.jpg`; the names don't matter (each is
identified by its values). Upload all of them to the `bandon-dunes-data`
release. If a link shows an error page or JSON instead of downloading, send
its text.

### 1. Bare-earth elevation (DOGAMI lidar DTM, ~12 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=385960,4781928,387440,4783920&bboxSR=32610&imageSR=32610&size=1480,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 2. Canopy height (DOGAMI lidar CHM, ~12 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=385960,4781928,387440,4783920&bboxSR=32610&imageSR=32610&size=1480,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Orthophoto (Oregon Statewide Imagery Program 2024, 0.5 m, JPEG, ~3 MB)

Used to check the lidar trees and the mapped sand against the course as it is
now (the South Coast lidar is probably the 2008-09 flight). JPEG because TIFF
exports from this service failed at Langdon Farms; the bbox in the link places
the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=385960,4781928,387440,4783920&bboxSR=32610&imageSR=32610&size=2960,3984&format=jpg&f=image
```

### 4. OSM, full world (Overpass Turbo, save as `overpass_world.geojson`)

Open https://overpass-turbo.eu, replace the text on the left with this, click
Run, then Export -> GeoJSON -> download:

```
[out:json][timeout:120][bbox:43.1811,-124.4039,43.2001,-124.3848];
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
