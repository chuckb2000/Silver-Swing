# Chambers Bay — data request (2026-10-20)

Course: Chambers Bay, 6320 Grandview Drive West, University Place, Pierce County, WA,
on the shore of Puget Sound (Pierce County course). Course id `chambers_bay` (logo
exists: the concrete ruins). UTM zone 10N (EPSG:32610). `state` WA.

## Already in hand (GitHub release `chambers-bay-data`)

| File | SHA-256 | Use |
|---|---|---|
| `chambers.bay.geojson` (Overpass Turbo export, 2026-10-20 13:54 UTC, 2,720 features) | 7cd2fa26d271ae3aa6d8b1b05fe5fbf1e3fe84cf090aa570b75e5f045ed28b2e | the layout source; copied to `raw/overpass.geojson` (in git) |
| `Chambers.Bay.gpkg` | f45cfe680b20a66ff45f856737f43caed7f995fa3ed067be1f3f72770116c907 | not used (the GeoJSON is preferred, COURSE_LESSONS 2) |
| `chambers.map.osm` | 1fa081e0fcda3e28c2131a7e691833722a0d2f79491e279f76a7454028eede77 | not used (same data as the GeoJSON) |
| `Chambers-Bay-Scorecard-10-2.pdf` (club card, Golf ScoreCards Inc. 10/2025) | 49d1e9f17e7d0d3695890f6fe8aa86069341e53cb883b194a4a04a6d04e71dd4 | `scorecard.csv`; every row adds up to its printed total |
| six photos (`CB_Hole9_credit_David_Patterson_htlzb0.webp`, `il_1080xN.2420247311_dfwn.jpg`, `images*.jpg`, `rsz_img_5701.jpg`) | — | look-only reference (theme, sand, trees); not traced |

OSM contents: boundary way 26787026 "Chambers Bay Golf Course" (one polygon, no
inner rings, 88.8 ha, 917 x 1,301 m); 18 `golf=hole` lines with ref and par (pars
match the card, 72); 63 tee boxes (no tee-set tags), 20 greens, 20 fairways, 71
bunkers, 18 pins, 6 `golf=rough` areas, cart paths; the Lone Fir (node 3605861053);
one `natural=wetland` (0.17 ha) inside the boundary; the BNSF railway and Puget
Sound (Nisqually Reach) west of the boundary. No driving range mapped.

## Requested

### 1. Bare-earth elevation (USGS 3DEP 1 m DEM, one tile)

Product: USGS 1 Meter 10 x53y523 WA_PierceCounty_2020_A20 (published 2021-06-13,
303 MB; listed by the National Map API for the course box). It covers the whole
world (eastings 530-540 km, northings 5,220-5,230 km).

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/WA_PierceCounty_2020_A20/TIFF/USGS_1M_10_x53y523_WA_PierceCounty_2020_A20.tif

If the link fails: https://apps.nationalmap.gov/downloader -> Elevation Products
(3DEP) -> tick "1 meter DEM" -> enter the box below -> Search Products -> download
the item named `USGS_1M_10_x53y523_WA_PierceCounty_2020_A20`.

### 2. Lidar points for the trees (NOAA Data Access Viewer, clipped)

Dataset: "2020 Lidar: Pierce County, WA" (NOAA DAV id 9343; flown 10 April - 4 June
2020). The project has no vegetation classes, so ask for all classes; the pipeline
uses class 1 (unclassified) and drops roofs, as at Wannamoisett.

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9343/details/9343
2. Draw a rectangle over the box below (larger is fine, smaller is not).
3. Add the dataset to the cart, open the cart, Next.
4. Output: **Point**, format **LAZ**, all classes. Projection **UTM zone 10**,
   **NAD83(2011)**, horizontal **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link (earlier jobs took ~30 min).

### Box (WGS84) for both

south 47.1976, west -122.5852, north 47.2156, east -122.5655

(planned world 1,280 x 1,792 m, UTM 10N x 531,519-532,799, y 5,227,314-5,229,106,
plus 100 m on every side).

### 3. Hand-off

Add both files to the existing release `chambers-bay-data`: open
https://github.com/chuckb2000/silver-swing/releases, click the pencil on
"Chambers Bay data", drop the `.tif` and the NOAA zip into the "Attach binaries"
box **below** the description (the description box rejects files over 25 MB), then
**Update release**. `data/chambers_bay/release.json` will list them so that
`make fetch NAME=chambers_bay` puts them in `raw/`.
