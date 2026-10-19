# Highland Links — data request (2026-10-18)

Course: Highland Links, 10 Highland Light Road, North Truro, MA (Cape Cod National Seashore).
Course id: `highland_links`. UTM zone 19N (EPSG:32619).

## Already in hand

| Item | Source | Status |
|---|---|---|
| OSM extract | developer GeoPackage `raw/Highland_Links.gpkg` (2026-10-18) | covers the course boundary only; buildings and roads around it are cut off |
| Scorecard | developer image of the printed card | matches the club's PDF (highlandlinkscapecod.com, `HighlandLinks-Scorecard.pdf`, Feb 2020) number for number |

## Download box (WGS84)

Course boundary + 300 m, rounded outward:

- south 42.0325, west -70.0695, north 42.0432, east -70.0526

The game world (1,024 x 1,024 m, chosen in Phase 3) fits inside it.

## Files

| # | File | Size | Why |
|---|---|---|---|
| 1 | `overpass.geojson` | < 1 MB | OSM layout + surroundings for the whole box |
| 2 | `USGS_1M_19_x41y466_MA_CentralEastern_2021_B21.tif` | 99 MB | bare-earth elevation, 1 m |
| 3-6 | four `USGS_LPC_MA_CentralEastern_2021_B21_19TDG41*.laz` | 495 MB total | lidar point cloud: tree positions and heights |

Products (checked against the USGS National Map product API, 2026-10-18):

- **Elevation:** USGS 3DEP 1 m DEM, project MA_CentralEastern_2021_B21 (2021 USGS Lidar: Central Eastern Massachusetts, QL1, flown 20 Mar - 24 Apr 2021, leaf-off), tile x41y466. NAD83(2011) / UTM 19N, metres; NAVD88 metres (GEOID18). Hydro-flattened.
- **Point cloud:** the same project's LAZ tiles 19TDG411653, 19TDG411654, 19TDG412653, 19TDG412654 (classified: ground, vegetation, building, water, noise). The four tiles together cover the box. Because the flight was leaf-off, evergreen pitch pine and bare oaks should be separable from the lidar alone, so no aerial imagery is requested now.
- Older collections over the same area (2011 ARRA, 2013/2015 Sandy) are not used.

## Steps

### 1. OSM (Overpass Turbo)

1. Open https://overpass-turbo.eu
2. Delete the text in the left panel and paste:

```
[out:json][timeout:120][bbox:42.0325,-70.0695,42.0432,-70.0526];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|beach|sand|cliff|coastline)$"];
  nwr["landuse"~"^(grass|meadow|forest)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  nwr["man_made"];
  nwr["barrier"];
  nwr["tourism"];
  way["highway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

3. Click **Run** (top left). Ignore any warning about the map view; the box is in the query.
4. Click **Export** -> **GeoJSON** -> **download**. Rename the file to `overpass.geojson`.

### 2. Elevation and lidar (direct links)

Open each link in the browser; each starts a download.

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x41y466_MA_CentralEastern_2021_B21.tif
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/MA_CentralEastern_2021_B21/MA_CentralEastern_2_2021/LAZ/USGS_LPC_MA_CentralEastern_2021_B21_19TDG411653.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/MA_CentralEastern_2021_B21/MA_CentralEastern_2_2021/LAZ/USGS_LPC_MA_CentralEastern_2021_B21_19TDG411654.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/MA_CentralEastern_2021_B21/MA_CentralEastern_2_2021/LAZ/USGS_LPC_MA_CentralEastern_2021_B21_19TDG412653.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/MA_CentralEastern_2021_B21/MA_CentralEastern_2_2021/LAZ/USGS_LPC_MA_CentralEastern_2021_B21_19TDG412654.laz

If a link fails: https://apps.nationalmap.gov/downloader -> Elevation Products (3DEP) -> tick "1 meter DEM" and "Lidar Point Cloud (LPC)" -> Coordinates: enter the box above -> Search Products -> download the items whose names contain `MA_CentralEastern_2021_B21`.

### 3. Hand-off (GitHub release)

The files are too large to attach to the chat, and Claude's sandbox can't reach USGS, but it can read release files from the repository.

1. Open https://github.com/chuckb2000/silver-swing/releases/new
2. **Choose a tag:** type `data-highland-links`, then click "Create new tag: data-highland-links on publish". Target: `main`.
3. **Release title:** `Highland Links raw data`.
4. Scroll **below** the description editor to the box that says "Attach binaries by dropping them here or selecting them", and drop all six files (`overpass.geojson`, the `.tif`, the four `.laz`) there. That box takes files up to 2 GB each. The description editor above it also accepts dropped files but rejects anything over 25 MB ("File size too big"); don't drop them there. Wait until each file shows its size.
5. Tick **Set as a pre-release**, then **Publish release**.
6. Tell the course chat it is done.

The release stays as the archived copy of the raw downloads (the LAZ files are too large for git).

## Status

- **2026-10-18 21:33:** release `data-highland-links` has `overpass.geojson` and the DEM. The four LAZ tiles were too slow to download from USGS (about an hour); replaced by the clipped NOAA order below.

## Lidar, take 2: NOAA Data Access Viewer (clipped, vegetation only)

The same 2021 point cloud, cut to the course box on NOAA's side, so only a small file comes back.

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9777/details/9777 ("2021 USGS Lidar: Central Eastern Massachusetts").
2. Zoom to Highland Light, North Truro. With the draw/rectangle tool, draw a box over the course plus about 300 m on every side, including the beach on the east (about 1.4 km east-west by 1.2 km north-south; box: south 42.0325, west -70.0695, north 42.0432, east -70.0526). Larger is fine; smaller is not.
3. Add "2021 USGS Lidar: Central Eastern Massachusetts" to the cart, open the cart, click Next.
4. Options:
   - Output product: **Point** (point cloud), format **LAZ**.
   - Classes, if the page lets you choose: only **4 Medium Vegetation** and **5 High Vegetation**. If it doesn't, take all classes.
   - Projection: **UTM**, zone **19**, horizontal datum **NAD83(2011)**, units **meters**; vertical datum **NAVD88**, units **meters**.
   - Leave everything else at its default.
5. Enter your email and submit. NOAA emails a download link when the job finishes (small jobs usually within about 30 minutes).
6. Download the zip and add it to the existing release: open the release page, click the pencil (Edit), drop the zip into the "Attach binaries" box below the description, then **Update release**.

## Checks on arrival (runbook 5.5)

Results 2026-10-18:

- **DEM** `USGS_1M_19_x41y466_MA_CentralEastern_2021_B21.tif` (99,440,480 bytes, as listed by USGS): EPSG:26919 (NAD83 / UTM 19N), 1 m, float32, metres (NAVD88), nodata -999999. No nodata over the world extent + 50 m. Heights -2.13 to 49.33 m (median 25.5 m); the ocean is hydro-flattened at -2.13 m; the cliff drops from ~35 m to the beach within ~100 m east of the course. Grid origin is 0.0003 m off whole metres (s00 resamples to the world grid anyway).
- **OSM** `overpass.geojson`: 215 features. Boundary `leisure=golf_course` "Highland Links" (way 295320130, same as the GeoPackage). 9 hole lines (OSM par: 4,4,3,4,4,4,3,4,3; holes 2 and 6 are par 5 on the card, card wins), 9 greens, 27 tees (all polygons), 9 fairways, 16 bunkers, 8 cart paths, 60 buildings (GeoPackage: 17), 53 highway ways, natural wood/sand/beach/cliff/coastline/3 wetlands (DEP marsh), 4 fences, FAA radar dome and Jenny Lind Tower. No pins, no water hazards, no rough polygons.

Checks still to run when the lidar arrives: CRS, units, classes present, coverage of the world extent.

For each raster: CRS, resolution, units, nodata and holes, coverage of the world extent; ocean and beach handling in the hydro-flattened DEM. For OSM: the `leisure=golf_course` boundary named "Highland Links", feature counts per kind, and a comparison with the GeoPackage.
