# Willamette Valley Country Club — data request (2026-10-19)

Course: Willamette Valley Country Club, 900 Country Club Place, Canby, Clackamas
County, OR. Course id `willamette_valley` (logo already exists). State `OR`.
UTM zone 10N (EPSG:32610). Designed by Shirley Stone, opened 1962 (golfn.com).
Par 72.

## Already in hand (release `willamette-valley-data`)

| Asset | Size | SHA-256 | Use |
|---|---|---|---|
| `map.2.osm` (OSM API export, bounds 45.27353,-122.70098 to 45.29563,-122.66473) | 5,408,408 | 13c29491000c916cad79d3cdd43670eb528acde1a74f53917af3f4f052d5cc2d | layout (see "OSM format" below) |
| `wvcc.scorecard.pdf` (club card, Golf ScoreCards Inc., 10/2023) | 132,228 | c9c444387ba742cf46d097e193b61932cc45913cf0665d300083102c80a871cd | `scorecard.csv`, `scorecard_full.csv` |
| `22989.ae10f775666b4863b4896828f1d3d241.jpg`, `40844.jpg`, `DSCN1952.jpg`, `images.jpg` | — | — | look-only reference (theme: Douglas firs, `pnw`) |

### Scorecard (official card, verified)

Every row adds up to its printed out/in/total. Par 36-36-72; men's and women's
handicaps each use 1-18 once.

| Tees | Total | Men's rating/slope |
|---|---|---|
| Black | 7,017 | 74.2/133 |
| Blue | 6,514 | 71.6/129 |
| Blue/White (combo) | 6,183 | 70.4/125 |
| White | 5,979 | 69.3/122 |
| Orange | 5,423 | 66.9/117 |
| Yellow | 4,702 | 63.4/110 |
| Maroon | 4,168 | 61.2/107 |

golfn.com lists 73.9/128 for the back tees; the club card wins.

Local rules on the card: OB left of holes 1, 2, 3, 4, 5, 11, 12, 13 and 18; the
maintenance building and its surroundings on holes 14, 15 and 16 are a no-play
zone inside a red penalty area; roads, cart paths and staked trees are immovable
obstructions.

### OSM audit (intake, 2026-10-19)

- Boundary: `leisure=golf_course` way 146072029 "Willamette Valley Country Club",
  one polygon, 65.2 ha, 586 x 1,554 m (UTM 10N x 524570-525156, y 5013871-5015425).
- 18 `golf=hole` lines (ways 1053466769 ... 1053622451). Pars tagged on all but 15;
  all tagged pars match the card. No handicaps in OSM.
- 20 greens, 73 tee boxes (no colour tags), 17 fairways (15 are multipolygon
  relations), 38-40 bunkers, 19 rough polygons, 11 `golf=path` lines, 18 pins.
- Water inside the boundary: five `golf=lateral_water_hazard` ponds (red), by holes
  3/4, 4/5, 6, 13/14 and 16/17. Willamette River 141 m outside the boundary (east).
- Per hole: every line starts on a tee box. Every line except 13 ends on a green
  with a pin.
- **Hole 13:** the line ends on the course boundary with a pin, but no green is
  mapped there (nearest green 53 m away, 1,825 m2, probably the practice green).
  Line length 162 yd = Black card (161).
- Greens not at a hole end: ways 1053594241 (628 m2), 1053644812 (1,825 m2),
  1053644816 (343 m2): practice greens, become wrong greens in the game.
- First tee match (box centroid to green along the OSM line; s06 will refine):
  Blue 6,520 yd measured vs 6,514 card, 15 holes within 3 %, hole 8 and 16 within
  3-4 %, **hole 3 no Blue box** (137 yd = White; Blue 162). Black: hole 3 and 15
  fail. White: hole 8 fails.

### World extent

Boundary bbox + ~120 m scenery north/south, ~219 m east/west, rounded to 256 m
chunks: **x 524351-525375, y 5013752-5015544 (1,024 x 1,792 m)**, under the
2,048 m limit. The OSM export covers it.

## Requested

### 1. Elevation and canopy (DOGAMI, two files) — required

The sandbox can't reach `gis.dogami.oregon.gov` (proxy 403). Open each link in a
browser; each returns a GeoTIFF (about 10 MB). Same services as Oswego Lake and
Tualatin.

Box: EPSG:32610, x 524251-525475, y 5013652-5015644 (the world plus 100 m), 1 m
pixels, 1224 x 1992. In WGS84 about lon -122.6908 to -122.6751, lat 45.2759 to 45.2939.

Bare earth (save as `dogami_dtm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=524251,5013652,525475,5015644&bboxSR=32610&imageSR=32610&size=1224,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (save as `dogami_chm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=524251,5013652,525475,5015644&bboxSR=32610&imageSR=32610&size=1224,1992&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If the browser shows a JSON error instead of downloading, send the error text.
Upload both files to the `willamette-valley-data` release.

Optional (lidar project and year, tells whether it was flown leaf-on or leaf-off;
probably the 2013 Clackamol project, flown May-July, leaf-on):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/identify?geometry=%7B%22x%22%3A524863%2C%22y%22%3A5014648%2C%22spatialReference%22%3A%7B%22wkid%22%3A32610%7D%7D&geometryType=esriGeometryPoint&returnCatalogItems=true&f=json
```

### 2. OSM as Overpass GeoJSON — recommended

The pipeline reads Overpass Turbo GeoJSON (or GeoPackage), not the API's `.osm`
XML. Overpass Turbo (overpass-turbo.eu): paste the query below, Run, Export ->
GeoJSON, upload as `WVCC.geojson`. Alternative: the course chat writes a converter
for `map.2.osm` (untested path; 15 fairways are multipolygon relations).

```
[out:json][timeout:120];
(
  nwr["golf"](45.27545,-122.69146,45.29433,-122.67447);
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|sand)$"](45.27545,-122.69146,45.29433,-122.67447);
  nwr["landuse"~"^(grass|meadow|forest)$"](45.27545,-122.69146,45.29433,-122.67447);
  nwr["leisure"~"^(golf_course|park|garden|pitch|swimming_pool)$"](45.27545,-122.69146,45.29433,-122.67447);
  nwr["building"](45.27545,-122.69146,45.29433,-122.67447);
  way["highway"](45.27545,-122.69146,45.29433,-122.67447);
  way["waterway"](45.27545,-122.69146,45.29433,-122.67447);
  nwr["amenity"="parking"](45.27545,-122.69146,45.29433,-122.67447);
);
out geom;
```

### 3. Hole 13 green — needed later

Not in OSM. Once the DTM arrives the course chat will propose an outline from the
green pad in the lidar and show it for approval. If the pad is unclear, imagery is
needed: either a georeferenced export of the Oregon 2022 statewide imagery
(https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2022), a Google/Bing
screenshot of the 13th green with 3+ control points, or the green added in OSM (iD
editor, Bing/Esri imagery) and the Overpass export re-run.
