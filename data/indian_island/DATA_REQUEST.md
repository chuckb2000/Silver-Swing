# Indian Island — data request

Course: Indian Island Golf Course, Riverhead, Suffolk County, NY. Course id
`indian_island` (logo exists). UTM zone 18N (EPSG:32618).

## Already have (GitHub release `data-indian-island`, uploaded 2026-10-18)

| File | Use |
|---|---|
| `Indian.Island.geojson` | OSM extract (Overpass, osmtogeojson). 294 features. Becomes `raw/overpass.geojson`. |
| `Indian.Island.gpkg`, `Indian.Island.osm` | Same OSM data in other formats; kept as backup. |
| `Indian.Island.png`, `Screenshot.2026-10-18.*.png` | Google Maps screenshots and a Google-based routing map. **Look only** (COURSE_BUILD.md 1.2): no geometry is traced or measured from them. |

OSM coverage: holes 1-8 complete (line, tee, fairway, green, pin); hole 10
has a line and a tee but no green or fairway; holes 9 and 11-18 have nothing.
The `leisure=golf_course` boundary covers the whole site, both sides of
Cross River Drive (Route 105).

## Needed

Box for every download, NAD83 / UTM 18N (EPSG:26918), metres:
**xmin 698150, ymin 4532050, xmax 700198, ymax 4533298** (2,048 x 1,248 m).
Same box in WGS84: S 40.91507, W -72.64701, N 40.92682, E -72.62229.
The world is 698261-700053 E, 4532163-4533187 N (1,792 x 1,024 m); the box
adds about 100 m on each side.

The sandbox can't reach these servers (proxy refuses the connection), so the
URLs below are untested. If one returns an error, send me the error text.

### 1. Bare-earth DEM (required)

NYS DEM_2024_Long_Island: 1 m, hydro-flattened, from the 2024 Long Island
lidar; NAD83 UTM 18N, NAVD88 (GEOID18) metres; NYS ITS Geospatial Services /
USGS. Paste into a browser; it saves a GeoTIFF:

```
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=698150,4532050,700198,4533298&bboxSR=26918&imageSR=26918&size=2048,1248&format=tiff&pixelType=F32&interpolation=RSP_NearestNeighbor&f=image
```

Save as `indian_island_dem_2024.tif`.

### 2. Orthoimagery for tracing holes 9-18 (required)

NYS statewide orthoimagery (natural colour, 6-12 inch source, 2022-2025
mosaic), State of New York open data. Two halves at 0.32 m per pixel; each
saves a PNG whose corners are exactly the bbox in the URL, so I can
georeference it:

West half:
```
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=698150,4532050,699174,4533298&bboxSR=26918&imageSR=26918&size=3200,3900&format=png24&transparent=false&dpi=96&f=image
```
East half:
```
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=699174,4532050,700198,4533298&bboxSR=26918&imageSR=26918&size=3200,3900&format=png24&transparent=false&dpi=96&f=image
```

Save as `ortho_west.png` and `ortho_east.png`. Also note the date the
service shows for Suffolk County if you see one.

Fallback: USDA NAIP (public domain, ~60 cm) for the same box from USGS
EarthExplorer.

### 3. Lidar point cloud for trees (strongly preferred)

"NYS - Long Island 2024" LAZ/LAS tiles covering the box, from the Discover
GIS Data NY application (linked from gis.ny.gov/lidar): zoom to the box,
pick the 2024 Long Island lidar layer, download every tile that touches it.
Bulk alternative: ftp://ftp.gis.ny.gov/elevation/LIDAR. Expect a handful of
tiles, possibly a few hundred MB.

### 4. Scorecard (official, if you can)

A photo of the printed card. The only per-hole card found online is
third-party (OpenGolfAPI, Blue tees only); see `scorecard.csv`.

## Where to put it

Upload everything to the existing release `data-indian-island`. I fetch it
with `gh api` and record SHA-256 sums here.
