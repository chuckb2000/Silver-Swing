# TPC Boston — data request (2026-10-20)

Course: TPC Boston, 400 Arnold Palmer Boulevard, Norton, Bristol County, MA.
Course id `tpc_boston`. UTM zone 19N (EPSG:32619). `state` MA. Theme `bayside`
(developer: Franklin's theme). Logo: a baby blue pair of lederhosen (developer). Tees: Black (default) and Gold (developer, 2026-10-20).

## Already in hand (GitHub release `data-tpc-boston`, published 2026-10-21)

| File | SHA-256 | Use |
|---|---|---|
| `export.1.geojson` (Overpass-style GeoJSON, 3,440 features, `@id` + `@relations` only, no user metadata) | ba5276f36c670f14e33ab306d4d1ef955ef9a19332ed3b453f73195f50b29d94 | the layout source (`raw/overpass.geojson`) |
| `map.2.osm` (openstreetmap.org export, box 41.95917,-71.25192 to 41.99350,-71.20256) | 6cd3b63952113ce41c36eed6cc5039771970b6259a403eb9db6a150294585177 | same data as OSM XML; kept for reference |

OSM contents (2026-10-20): boundary way 311851822 "TPC Boston" (one polygon, no
inner rings, 119 ha, 1,478 x 2,020 m, `golf:par=72`); 18 `golf=hole` lines with
ref, par and handicap (pars add to 73: hole 14 is a par 5); every line ends on a
green; 82 tee boxes, 21 greens, 23 fairways, 70 bunkers, 17 `water_hazard`
polygons (ponds and marshes), 77 cart paths + 14 `golf=path`, driving range,
clubhouse, 6 pins. Inside the boundary also: one pond tagged only `natural=water`
(way 1239408943, 1.0 ha, 98 m from hole 8) and five untagged wetlands.
Norton Country Club (way 29897980, 18 holes) lies 74 m west, inside the world.

## Status (2026-10-21)

The release is published (tag `data-tpc-boston`). New assets:

| File | SHA-256 | Check |
|---|---|---|
| `2024_Scorecard.pdf` (93 KB) | 271f493b14c46f0b55b440666f56d434c0f0781bdb607bf6fb013b0e3c3312b8 | the club's printed card, with ratings; matches scorecard.csv on every hole |
| `USGS_1M_19_x31y465_MA_CentralEastern_2021_B21.1.tif` (0.9 MB) | 86e6822c368a7e0b412a80cf2165409824ae923bb443473db72d0a4e03ca802e | **not usable**: a compressor turned the tile into an 8-bit greyscale JPEG picture (6,825 x 6,825 px, values 16-79, no georeferencing); the heights are gone |
| `USGS_1M_19_x31y466_MA_CentralEastern_2021_B21.1.tif` (1.0 MB) | 0aaaafa45ae13a64eb39ba2ea8ccdb233a591022ed8d00d1cb153ffe03037917 | same (values 23-133) |

Replacement request (2026-10-21): the same heights for the course area only,
from the USGS 3DEP elevation service (float32 GeoTIFF, about 20 MB):

https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=314754,4648549,316746,4651053&bboxSR=26919&imageSR=26919&size=1992,2504&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image

(world + 100 m in NAD83 / UTM 19N, 1 m pixels; the service serves the 1 m DEM
where it exists, here the 2021 Central Eastern Massachusetts project). If the
link shows an error page, change the last part to `f=json` and open the link it
returns (`href`). Upload the file as it downloads, without compressing it.

## Scorecard

Official: the club's 2024 printed card (above; also
https://tpc.com/boston/wp-content/uploads/sites/20/2024/11/2024_Scorecard.pdf).
Par 72 (hole 14 par 4). Championship 7,282 77.2/154, Gold 6,990 74.6/144,
Black 6,454 72.1/139, Blended 6,213 70.9/135 (total only), White 6,035
70.1/132, Blue 5,147 66.1/122.

Others: Wikipedia and OSM (tour card, par 73, other stroke index); Stymie
(https://stymie.golf/golf-courses/massachusetts/bristol-county/norton/tpc-boston,
par 73, Black 72.4/139); GolfPass
(https://www.golfpass.com/courses/16323-tpc-boston/scorecard-and-layout, par 72,
Black 72.1/139). The printed card is used.

## Requested

### 1. Bare-earth elevation (USGS 3DEP 1 m DEM, two tiles)

Same product as Franklin and Highland Links (2021 USGS Lidar: Central Eastern
Massachusetts, flown 20 Mar - 24 Apr 2021; Norton lies inside the project's
extent). The world spans UTM northing ~4,648,650-4,650,950, across two 10 km tiles.
Names derived from the USGS tile scheme; the sandbox can't reach USGS to confirm
they exist.

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x31y465_MA_CentralEastern_2021_B21.tif
- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x31y466_MA_CentralEastern_2021_B21.tif

If a link fails: https://apps.nationalmap.gov/downloader -> Elevation Products (3DEP)
-> tick "1 meter DEM" -> enter the box below -> Search Products -> download the
items whose names contain `MA_CentralEastern_2021`.

### 2. Lidar points for the trees (NOAA Data Access Viewer, clipped)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9777/details/9777
   ("2021 USGS Lidar: Central Eastern Massachusetts").
2. Draw a rectangle over the box below (larger is fine, smaller is not).
3. Add the dataset to the cart, open the cart, Next.
4. Output: **Point**, format **LAZ**. Classes, if offered: **2 Ground**,
   **4 Medium Vegetation**, **5 High Vegetation** (otherwise all). Projection
   **UTM zone 19**, **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link (Franklin's took under an hour).

### Box (WGS84) for both

south 41.9667, west -71.2370, north 41.9907, east -71.2109

(world 1,792 x 2,304 m plus 150 m on every side; it also covers a 2,048 m world).

### 3. Hand-off

1. Open https://github.com/chuckb2000/silver-swing/releases, click the pencil on
   the draft "TPC Boston".
2. Drop the two `.tif` files and the NOAA zip into the "Attach binaries" box
   **below** the description (the description box rejects files over 25 MB).
3. Click **Publish release** (not "Save draft"): `make fetch NAME=tpc_boston` looks
   the release up by its tag, and GitHub doesn't return drafts that way.
