# Triggs Memorial Golf Course — data request (2026-10-20)

Course: Triggs Memorial Golf Course, 1533 Chalkstone Avenue, Mount Pleasant, Providence, RI.
Course id: `triggs`. State `RI`. UTM zone 19N (EPSG:32619).
Donald Ross, opened 1932 (City of Providence, providenceri.gov). Par 72.

World: x0 295174, y0 4633941 (EPSG:32619), 1,280 x 1,280 m.
WGS84 box for downloads (world + 200 m): south 41.82903, west -71.46953, north 41.84458, east -71.44874.

## Already in hand (release `data-triggs`)

| Asset | Size | SHA-256 | Use |
|---|---|---|---|
| `export.geojson` (Overpass Turbo, 2026-10-21 00:39 UTC) | 7,360,652 | 488a790a96a72c43310fa25c3942ddb3478f237d3cdb66d67a4019a08927eb65 | `raw/overpass.geojson` (in git) |
| `map.2.osm` (OSM API export, bounds 41.82784,-71.47181 to 41.84578,-71.44564) | 10,110,592 | b4a0c79a29083903295c7a3119d547750832862d333cdabe78285a4d04234cfe | not used (the Overpass GeoJSON covers the world) |

### OSM audit (intake, 2026-10-20)

- Boundary: `leisure=golf_course` way 43150786 "Triggs Memorial Golf Course", one polygon, no inner rings, 55.8 ha, 887 x 1,033 m.
- A second course polygon, "Button Hole" (way 185319906, a short course to the south), and its features lie outside the world: dropped in `edits.json`.
- 18 `golf=hole` lines with `ref`, `par`, `handicap` and `dist`. Every line ends on a green; every line starts on a tee polygon except hole 1 (nearest box 11 m away).
- 19 greens on the course (18 + a practice green, way 698136783: a wrong green), 43 tees, 19 fairways, 70 bunkers, 9 water hazards (5 `water_hazard`, 4 `lateral_water_hazard`, all inside the boundary), a driving range inside the boundary (way 1551632017, 1.4 ha), 20 cart paths, service roads inside the boundary, 285 single trees, 4,026 buildings in the export.
- No `golf=pin`: pins at green centres (`propose_pins.py`).
- Outside the boundary: the Woonasquatucket River and Manton Pond (south-west): out of bounds.
- OSM `dist` per hole adds up to 6,588, the club's Blue total.

## Elevation and lidar (USGS 3DEP)

Product: **2022 USGS Lidar: RI Statewide** (project `RI_Statewide_D22`, workunit `RI_Statewide_1_D22`), QL1, flown March 2022 (leaf-off), the same project as Wannamoisett. No vegetation class: trees come from class 1 with OSM buildings removed. LAZ in NAD83(2011) RI State Plane (US ft), NAVD88 (GEOID18) ft. Tile list checked against the USGS TNM API on 2026-10-20.

### Direct links (open each one; each starts a download)

Bare-earth DEM, 1 m, one tile (396,924,574 bytes):

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/RI_Statewide_D22/TIFF/USGS_1M_19_x29y464_RI_Statewide_D22.tif

Point cloud, 9 tiles (541 MB total):

| Tile | Bytes |
|---|---|
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_335000_270000.laz | 53,676,978 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_335000_272500.laz | 60,847,771 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_335000_275000.laz | 62,934,919 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_337500_270000.laz | 59,748,214 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_337500_272500.laz | 59,467,814 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_337500_275000.laz | 50,964,386 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_340000_270000.laz | 61,756,037 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_340000_272500.laz | 63,177,623 |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_340000_275000.laz | 68,209,132 |

All nine are needed: the world plus a 100 m margin (RI State Plane ft 336,723-341,718 E, 272,053-277,048 N) spans all three tile columns and rows.

### If rockyweb is slow

NOAA Data Access Viewer, dataset 9981, clipped on NOAA's side:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9981/details/9981
2. Draw a rectangle: south 41.8290, west -71.4696, north 41.8446, east -71.4487.
3. Add to cart, Next. Output: Point, LAZ, all classes. Projection UTM zone 19, NAD83(2011), metres; vertical NAVD88 metres.
4. Submit with your email; download the zip from the email.

Not used: the 2011 ARRA lidar (older).

## Scorecard

The club website (https://triggs.us/the-course/, retrieved 2026-10-20) gives totals only: Blue 6,588 (71.5/129), White 6,327 (70.5/126), Red 5,374 (72/124). The per-hole card is on two images:

- https://triggs.us/wp-content/uploads/2021/03/Triggs-Scorecard-Front.png
- https://triggs.us/wp-content/uploads/2021/03/Triggs-ScoreCard-Back.png

They don't load from the sandbox; the developer added both to the release on 2026-10-20 (Front SHA-256 d39542f2f54ea0c50dbb878378e7e7e0b7884c3f022f17f88c21431eb08cea29, Back bf4d745e2017a4598ea1c3f75c47d14b5d11275cf3437c19dcbb91841ed902d4; not in git, they carry the club's logo). `scorecard.csv` is transcribed from the back: Blue 6,588 72.3/132, White 6,327 71.1/128, Gold 5,499 66.1/124, Red 5,374 71.3/124; every row adds up to its printed total, and OSM's hole tags match the Blue column on every hole. The website's ratings (above) differ from the card's; the card is used. 1golf.eu lists older totals (Black 6,522, White 6,302, Red 5,392); not used.

## Hand-off

Add the files to the existing release: https://github.com/chuckb2000/silver-swing/releases/tag/data-triggs → pencil (Edit) → drop them into the "Attach binaries" box **below** the description (the description box rejects files over 25 MB) → Update release. Upload the LAZ tiles one by one or as one zip.

## Status

- 2026-10-20: OSM in hand (release `data-triggs`); DEM, the nine LAZ tiles and the scorecard images requested.
- 2026-10-20 evening: rockyweb timed out in the developer's browser (ERR_CONNECTION_TIMED_OUT), and the project's LAZ is not on prd-tnm.s3.amazonaws.com (NoSuchKey; only its browse images are). The lidar comes through the NOAA Data Access Viewer route above instead.
- 2026-10-20 21:04: DEM in the release. 21:14: NOAA job `ri2022_statewide_J1473603.zip` in the release. Everything needed is in hand.

## Checks on arrival (runbook 5.5)

- **DEM** `USGS_1M_19_x29y464_RI_Statewide_D22.tif` (396,924,574 bytes, SHA-256 37f94953e6dfd8e6066bffeed055996d0ea362f52085326a4c390c3ae59ea50c): EPSG:26919, 1 m, float32 metres, nodata -999999, none over the world + 100 m. Heights 15.0-61.5 m over the world + 100 m (the Woonasquatucket valley to the south-west at the low end). Clipped to `raw/ri_dem_2022_1m_clip.tif` (1,481 x 1,481 px, in git, SHA-256 42a42856851314c2015159d5a195fc12974521006a2755ac1e2e256318e7343d) with `pipeline/clip_raster.py --epsg 32619 --bbox 295174 4633941 296454 4635221 --margin 100`.
- **LAZ** `ri2022_statewide_J1473603.zip` (296,374,653 bytes, SHA-256 0c15d1f2d063aa9917b6237d558bc8c091708e93f09a21ca9e81ebafce427533), one file `ri2022_statewide_J1473603tR0_C0.laz` (296,531,723 bytes, SHA-256 d739ec2357dbfbecd2244453cac93ec286d882de744ca4e4ba93abd867f711a1): LAS 1.4, point format 7, 61,992,776 points. CRS NAD83(2011) / Rhode Island (EPSG:6567) in **metres** + NAVD88 metres (not the UTM asked for; s00 reprojects the horizontal from the file's CRS). Classes 1 (25.5 M) and 2 (36.5 M) only. Extent 102,472-104,442 E, 82,839-84,703 N: covers the world + 100 m (102,633-104,156 E, 82,922-84,444 N). GPS times give 30 March 2022: leaf-off.
- `release.json` lists the zip; `make fetch NAME=triggs` from a clean `raw/` downloads it, checks both hashes and extracts the LAZ to `raw/laz/` (tested 2026-10-20).
