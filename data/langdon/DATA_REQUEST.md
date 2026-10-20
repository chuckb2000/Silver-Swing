# Langdon Farms Golf Club — data request (2026-10-19)

Course: Langdon Farms Golf Club, 24377 NE Airport Road, Aurora, Clackamas County, OR,
between I-5 and NE Airport Road. Course id `langdon` (logo already exists).
UTM zone 10N (EPSG:32610). John Fought and Bob Cupp, 1995 (OGA, GolfPass).

## Already in hand (GitHub release `data-langdon`)

| File | SHA-256 (first 16) | Use |
|---|---|---|
| `Langdon.gpkg` | a6f1d173e631d027 | copied to `raw/`; superseded by the Overpass export below |
| `langdon.scorecard.and.map.png` | cb809791e1377936 | hole diagrams 1-18, no positions or numbers; `reference/hole_diagrams.png` |
| `Screenshot.2026-10-18.1448*.png` (5) | see release | Google Maps, look only: not georeferenced, no hole numbers |
| `red.barn.18th.hole.jpeg`, `red.barn.left.side.of.8.jpeg` | see release | look only |

OSM inside the boundary: the course (two ways, w30516492 west of OR 551 and
w30516571 east of it, 34 m apart across the highway), 12 bunkers (6 of them
arrive as lines from the GeoPackage), cart paths, two ponds (1,642 and 5,976 m2).
**No hole lines, tees, fairways, greens or pins.** Every hole has to be traced
(docs/COURSE_TRACING.md).

Scorecard: GolfPass and the club's flyover page agree (tees "#8"-"#1", no names),
except that the flyover page repeats hole 1's yardages on hole 7. Every GolfPass
column adds up to its total. #6, #4 and #2 are combinations of the sets either side.

## Status (2026-10-19, 19:00)

Received in `data-langdon`, copied to `raw/` and `reference/`:

| Release file | Copied to | SHA-256 | Check |
|---|---|---|---|
| `export.geojson` | `raw/overpass.geojson` | 127917443f5a661d25a65e447883dcd47aec47888a04329b476875090d0c503b | 415 features; since the GeoPackage someone mapped hole 1 (line, green, Tee 8 box) and an internal out-of-bounds line (w1569564855, 615 m) |
| `exportImage.10.tiff` | `raw/dogami_dtm_ft.tif` | 0912a99faa367406e8bdd5b3eabcbfebca35fe64b4761b5fba3af612d5d6d65c | bare earth: EPSG:32610, 1 m, 1224 x 2248, feet, no gaps; 91-208 ft |
| `exportImage.11.tiff` | `raw/dogami_chm_ft.tif` | 90bf9c6a097059de2cf1f8077cc07808c7b564f65e2a0b0162af7866e31d3486 | canopy height: same grid, feet, 0-199 ft |
| `sc-front.jpg`, `sc-back.jpg` | `reference/club_card_front.jpg`, `..._back.jpg` | 4dc04d3f..., cc5100ea... | matches GolfPass hole for hole; tees are named "Tee 8"-"Tee 1"; men's ratings on the back |

The Overpass export also holds Charbonneau Golf Course (r12760592) at the north edge;
`edits.json` drops it.

Orthoimagery: every TIFF exportImage link (OSIP 2024 WM and SL, OSIP 2022, NAIP) returned
"Error exporting image, Code: 500" for the developer; the same OSIP 2024 WM request with
`format=jpg` worked (19:03). `langdon.2.jpg` (north half, SHA-256 153b858c...) and
`langdon.3.jpg` (south half, 7e2c2b0e...), 4016 x 3688 each, placed by the request's bbox,
mosaicked and resampled to the world grid at 0.32 m as `raw/osip2024_032m.tif`
(JPEG-compressed GeoTIFF, 5 MB). `langdon.1.jpg` was the 1,024 m test. Alignment
checked against the OSM bunkers, ponds, cart paths and hole 1 green: within 1-2 m.

## World and boxes

World (provisional): EPSG:32610, x 517570-518594, y 5012491-5014539 (1,024 x 2,048 m).
Raster box = world + 100 m: x 517470-518694, y 5012391-5014639 (1,224 x 2,248 m),
about lon -122.7773 to -122.7616, lat 45.2648 to 45.2850.

## Requested

The sandbox can't reach `gis.dogami.oregon.gov`, `imagery.oregonexplorer.info`,
Overpass or the club website. Upload everything to the `data-langdon` release.

### 1. OSM (Overpass Turbo, save as `overpass.geojson`)

Open https://overpass-turbo.eu, replace the text on the left with this, Run,
Export -> GeoJSON -> download:

```
[out:json][timeout:120][bbox:45.26432,-122.77795,45.28549,-122.76099];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|orchard)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["railway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

### 2. Bare earth, DOGAMI (save as `dogami_dtm_ft.tif`, ~11 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=517470,5012391,518694,5014639&bboxSR=32610&imageSR=32610&size=1224,2248&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 3. Canopy height, DOGAMI (save as `dogami_chm_ft.tif`, ~11 MB)

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=517470,5012391,518694,5014639&bboxSR=32610&imageSR=32610&size=1224,2248&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

### 4-5. Orthoimagery, OSIP 2024, 1 ft (two halves; the service limits each side to ~4,100 px)

The tracing base for every green, fairway, tee and bunker. Open data, georeferenced.
Same service as Waverley (whose two halves arrived as `_ags_*.tif`; any name is fine,
say which is north).

North half (save as `osip2024_north.tif`, ~55 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517470,5013515,518694,5014639&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
```

South half (save as `osip2024_south.tif`, ~55 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517470,5012391,518694,5013515&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
```

If a link shows a JSON error instead of downloading, send the error text.

Fallback (2026-10-19: the developer got errors on the two halves): three smaller strips,
same service, 1,224 x 750 m each.

North (`osip2024_n.tif`):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517470,5013891,518694,5014639&bboxSR=32610&imageSR=32610&size=4016,2454&format=tiff&f=image
```
Middle (`osip2024_m.tif`):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517470,5013141,518694,5013891&bboxSR=32610&imageSR=32610&size=4016,2461&format=tiff&f=image
```
South (`osip2024_s.tif`):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517470,5012391,518694,5013141&bboxSR=32610&imageSR=32610&size=4016,2461&format=tiff&f=image
```

2026-10-19: the WM service returned "Error: Error exporting image, Code: 500". OSIP 2024
covers the whole state (GEO announcement, July 2025), so it is not a coverage gap.
Alternatives, in order:

a. The State Lambert mosaic of the same 2024 imagery (`OSIP_2024_SL`; name by analogy
   with `OSIP_2018_SL`, not checked from here), same two halves:
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_SL/ImageServer/exportImage?bbox=517470,5013515,518694,5014639&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_SL/ImageServer/exportImage?bbox=517470,5012391,518694,5013515&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
```
b. OSIP 2022 (also 1 ft, statewide):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2022/OSIP_2022_WM/ImageServer/exportImage?bbox=517470,5013515,518694,5014639&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2022/OSIP_2022_WM/ImageServer/exportImage?bbox=517470,5012391,518694,5013515&bboxSR=32610&imageSR=32610&size=4016,3688&format=tiff&f=image
```
c. USDA NAIP (0.6 m, public domain; coarser but enough for greens and fairways), one file:
```
https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer/exportImage?bbox=517470,5012391,518694,5014639&bboxSR=32610&imageSR=32610&size=2040,3747&format=tiff&f=image
```

### 6. Club scorecard (two images)

The club's own card, which the sandbox couldn't fetch. It settles the tee names,
hole 7, ratings/slopes and any local rules (penalty-area colours, OB):

- https://langdonfarms.com/wp-content/uploads/2020/11/sc-front.jpg
- https://langdonfarms.com/wp-content/uploads/2020/11/sc-back.jpg

### 7. Hole routing

Not needed now. Once the orthophoto is in, greens and tee pads are traced and
plotted with letters and numbers (as for Tualatin); one reply settles which is which.
A course map with hole numbers (yardage book, a photo of the map at the first tee)
would do the same.

### Optional

DOGAMI Lidar Data Viewer (https://www.oregon.gov/dogami/lidar): click the course with
the project layer on and note the project name and year (leaf-on or leaf-off decides
how tree types are read).
