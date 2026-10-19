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
4. Drag all six files (`overpass.geojson`, the `.tif`, the four `.laz`) into the "Attach binaries" box. Wait until each shows a size (no progress bar).
5. Tick **Set as a pre-release**, then **Publish release**.
6. Tell the course chat it is done.

The release stays as the archived copy of the raw downloads (the LAZ files are too large for git).

## Checks on arrival (runbook 5.5)

For each raster: CRS, resolution, units, nodata and holes, coverage of the world extent; ocean and beach handling in the hydro-flattened DEM. For OSM: the `leisure=golf_course` boundary named "Highland Links", feature counts per kind, and a comparison with the GeoPackage.
