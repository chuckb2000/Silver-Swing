# Wannamoisett Country Club — data request (2026-10-19)

Course: Wannamoisett Country Club, 96 Hoyt Avenue, Rumford (East Providence), RI.
Course id: `wannamoisett`. State `RI`. UTM zone 19N (EPSG:32619).
Donald Ross (1914 18-hole redesign of Willie Campbell's 1899 nine; revamped by Ross 1926). Par 69.

## Already in hand (release `data-wannamoisett`)

| Asset | Size | SHA-256 | Use |
|---|---|---|---|
| `Wannamoisett.geojson` (Overpass Turbo, 2026-10-19 18:30 UTC) | 1,057,562 | 185ac58fcecbef95311d86e92da367dd5f9baca19e461ad7890180ef7197127b | `raw/overpass.geojson` |
| `map.osm` (OSM API export, bounds 41.84094,-71.36890 to 41.85412,-71.35102) | 3,365,157 | b17fe0838f0eca71dc8965366fd6440f252cd300441122e69c93b202a9561dd5 | not used (the pipeline reads the Overpass GeoJSON) |
| 6 photos (`images*.jpg`, `Wanny-*.webp`) | — | — | `reference/wannamoisett/` (theme reference) |

### OSM audit (intake, 2026-10-19)

- Boundary: `leisure=golf_course` relation 12040815 "Wannamoisett Country Club", one outer ring, 44.2 ha, 791 x 1,076 m.
  One **inner ring**: the pond by hole 14 (way 680736432, 5,833 m2, `golf=water_hazard`) is cut out of the course polygon, so as mapped it would be out of bounds. Needs a decision (below).
- 18 `golf=hole` lines. Every line starts on a tee polygon and ends on a green. Pars tagged on 1-9 only (match the card: 4,4,3,4,4,4,4,3,4); 10-18 untagged. OSM handicaps on 1-9 (9,3,17,1,11,7,13,15,5) differ from both third-party cards.
- 20 greens (18 + 2 practice greens near the clubhouse, ways 482626790 and 746437295), 42 tees, 26 fairways, 108 bunkers, 1 rough polygon, 20 cart paths, 157 single trees, 6 woods, 50 buildings.
- Water: pond by 14 (above); `golf=water_hazard` way 886549379 (1,988 m2) crossed by the lines of holes 1 and 9; two ponds and scrub ~350 m west of the course (off the course). 5 ditches.
- No `golf=pin`.
- Hole-line lengths (yd): 418, 504, 130, 431, 353, 443, 347, 190, 454 | 407, 384, 194, 378, 345, 194, 440, 559, 445 = 6,616. Most lines start at the back (Black) tees.
- The export covers S 41.83776, W -71.37259, N 41.85764, E -71.34851: enough for the world (about 1,024 x 1,536 m).

## Scorecard (not verified)

The sources disagree:

| Source | Black | Blue | White | Green | Gold/Yellow |
|---|---|---|---|---|---|
| Club website, "Our History" | 6,901 | 6,430 | 6,132 | 5,639 | 5,147 |
| GolfPass card (per hole) | 6,732 | 6,417 | 6,085 | 5,602 | 5,147 |

The club recently built new back and forward tees, so the GolfPass card is probably older. GolfPass's per-hole numbers are kept in `scorecard_golfpass.csv` for reference only (the back-nine handicap row on GolfPass is shifted one column; the file uses OpenGolfAPI's alignment, which gives a clean 1-18).

**Needed:** a photo or PDF of the current printed scorecard.

## Elevation and lidar (USGS 3DEP)

Product: **2022 USGS Lidar: RI Statewide** (project `RI_Statewide_D22`, workunit `RI_Statewide_1_D22`), QL1, flown 26-30 March 2022 (leaf-off), 8 pts/m2.
Point classes: 1 unclassified, 2 ground, 7/18 noise, 9 water, 17 bridge, 20 ignored ground. No vegetation class, so trees come from class 1 with OSM buildings removed (as at Indian Island).
LAZ: NAD83(2011) RI State Plane (US ft), NAVD88 (GEOID18) ft.

### Direct links (open each one; each starts a download)

Bare-earth DEM, 1 m (one tile, 223 MB):

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/RI_Statewide_D22/TIFF/USGS_1M_19_x30y464_RI_Statewide_D22.tif

Point cloud, 9 tiles (397 MB total, 33-51 MB each):

- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_362500_275000.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_362500_277500.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_362500_280000.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_365000_275000.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_365000_277500.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_365000_280000.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_367500_275000.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_367500_277500.laz
- https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/LPC/Projects/RI_Statewide_D22/RI_Statewide_1_D22/LAZ/USGS_LPC_RI_Statewide_D22_367500_280000.laz

All nine are needed: the world plus a 100 m margin spans all three tile columns and rows.

### If rockyweb is slow (it took about an hour for 495 MB at Highland Links)

NOAA Data Access Viewer, dataset 9981, clipped on NOAA's side:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9981/details/9981
2. Draw a rectangle: south 41.8400, west -71.3690, north 41.8550, east -71.3505.
3. Add to cart, Next. Output: Point, LAZ, all classes. Projection UTM zone 19, NAD83(2011), metres; vertical NAVD88 metres.
4. Submit with your email; download the zip from the email.

Not used: the 2011 ARRA lidar (older), and the `MA_CentralEastern_2021_B21` tile x30y464 (Massachusetts project; same tile name, but the course is in Rhode Island).

## Hand-off

Add the files to the existing release: https://github.com/chuckb2000/silver-swing/releases/tag/data-wannamoisett → pencil (Edit) → drop them into the "Attach binaries" box **below** the description (the description box rejects files over 25 MB) → Update release. Upload LAZ tiles individually or as one zip.

## Status

- 2026-10-19: OSM and photos in hand; DEM, lidar and the current scorecard requested.
- 2026-10-19 evening: DEM, all nine LAZ tiles and a scorecard screenshot in the release. No club card; the build uses GolfPass yardages and the screenshot's stroke index (validation_report.md, item 1). `images.2.jpg` is probably another course (developer) and is not used.

## Checks on arrival (runbook 5.5)

- **DEM** `USGS_1M_19_x30y464_RI_Statewide_D22.tif` (222,810,703 bytes, SHA-256 7c44e325bb5004f80004065fcacec1520af0d18dd4f7224d6032100db8085697): EPSG:26919, 1 m, float32 metres, nodata -999999, none over the world + 100 m. Clipped to `raw/ri_dem_2022_1m_clip.tif`. Heights 5.9-29.4 m over the world.
- **LAZ** (nine tiles, 33-51 MB each; `raw/laz_src/`, gitignored): NAD83(2011) / Rhode Island (ftUS) + NAVD88 GEOID18 (ftUS); classes 1, 2, 7, 9, 17, 18, 20 (no vegetation class). s00 reprojects the points; building footprints line up with the canopy height (best with no shift). SHA-256:
  - 362500_275000 b9aa6ec3b9a0b7f7d60c807ab52d617df16bd3ce53b8c28860c577761b742a03
  - 362500_277500 267c2ce0a6dc4c9a826d0a4c36f6d4a6e2370730d94493b95c225b47d3d89cc5
  - 362500_280000 546e0326f720fc9df91fc1c4bd4698a5ac68d0fd716f2df8e2c53e5a56605a8a
  - 365000_275000 4e3613795d6a37aead7610e9f556d9ef8797dd29875fd7b04a7b139160b908a7
  - 365000_277500 ab2d2352b33c29d60b0c164f9c998426a0ff9da115165229b2a2aea95a52665c
  - 365000_280000 de7f01c0704e13279b5d35250d0fcdc27d11fbd238fab02e8cdd52e0edaaae3a
  - 367500_275000 614e1a490b05749b878e492b86733874647830d0935cec3b51ef262fc9b8bfd2
  - 367500_277500 61d0773a7282af2357bf718f001fabbcdba72e3feec432ec3c622fa9173070e7
  - 367500_280000 ebf20d245e62b4a69caba5fbec495d9a5bc78a748571abff387b7756329ca7bb

To rebuild: the DEM clip is in git; download the nine LAZ tiles into `data/wannamoisett/raw/laz_src/` and run `make course NAME=wannamoisett`.
