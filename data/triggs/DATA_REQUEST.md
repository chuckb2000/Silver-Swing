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

They don't load from the sandbox. Until they arrive, `scorecard.csv` takes per-hole Blue yardages, pars and stroke index from the OSM hole tags (they add up to 6,588), marked unverified. 1golf.eu lists older totals (Black 6,522, White 6,302, Red 5,392); not used.

## Hand-off

Add the files to the existing release: https://github.com/chuckb2000/silver-swing/releases/tag/data-triggs → pencil (Edit) → drop them into the "Attach binaries" box **below** the description (the description box rejects files over 25 MB) → Update release. Upload the LAZ tiles one by one or as one zip.

## Status

- 2026-10-20: OSM in hand (release `data-triggs`); DEM, the nine LAZ tiles and the scorecard images requested.
