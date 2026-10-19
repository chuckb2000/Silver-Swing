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

## Received (2026-10-19) and how each file is used

All files are assets of the GitHub release `data-indian-island`. Fetch them with
`gh api -H "Accept: application/octet-stream" repos/chuckb2000/Silver-Swing/releases/assets/<id>`.

| File | SHA-256 | Used as |
|---|---|---|
| `Indian.Island.geojson` | `1d9eaa699ee41eec6089f9224dd68f9b4b07790012812fc482a166f431ffb1ff` | `raw/overpass.geojson` (unchanged copy) |
| `indian_island_dem_2024.tif.tiff` | `68bf65eb61e9f251c8d07b2e871f45fa512c93529b44019312874f28a72c084c` | `raw/nys_dem_2024_1m_clip.tif` (`clip_raster.py`, world + 100 m) |
| `ortho_west.png` | `fc08aa62b982f8431d85a828b986ef61eee267f2577648e9991487f86e82d9e0` | with `ortho_east.png`: `raw/nys_ortho_032m.tif` (bbox in this file's URLs, EPSG:26918 -> world grid EPSG:32618, 0.32 m, bilinear, JPEG GeoTIFF) |
| `ortho_east.png` | `2fea6d3c9dc1817bdc284e4c7816a658ab99d082086187f180556f53d5d88327` | see above |
| `indianisland-scorecard.pdf` | `753a2d5044eb841b05272888827d0ba359780afae66e0d0b19f188b4d03d8a10` | `scorecard.csv` (all four tee sets) and the ratings |
| `Indian.Island.lidar.zip` | `aa01511a6037cf520c56f9b8a58aac2107d8c02bb6312784eb660ec1400f2c25` | the four LAS tiles; `raw/laz/*_c1.laz` = class 1 inside the world + 60 m (gitignored; regenerate from the zip with the snippet below) |

The `NYS.*.service.txt` files are the services' descriptions. The Google screenshots and `Indian.Island.png` were only looked at (identifying holes), never traced.

Regenerate `raw/laz/` from the zip (laspy with lazrs):

```python
import glob, laspy
x0, y0, x1, y1 = 698201, 4532103, 700113, 4533247   # world + 60 m, EPSG:32618 (NAD83(2011) UTM 18N differs by ~1 m)
for f in sorted(glob.glob("Indian Island lidar/*.las")):
    las = laspy.read(f)
    m = (las.classification == 1) & (las.x >= x0) & (las.x <= x1) & (las.y >= y0) & (las.y <= y1)
    out = laspy.LasData(las.header); out.points = las.points[m]
    out.write("data/indian_island/raw/laz/" + f.split("/")[-1].replace(".las", "_c1.laz"))
```
