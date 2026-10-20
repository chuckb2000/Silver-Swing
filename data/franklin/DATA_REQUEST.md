# Franklin Country Club — data request (2026-10-19)

Course: Franklin Country Club, 672 East Central Street, Franklin, Norfolk County, MA
(on the Franklin–Wrentham line). Course id `franklin` (no logo yet). UTM zone 19N
(EPSG:32619). `state` MA.

## Already in hand (GitHub release `franklin-data`)

| File | SHA-256 | Use |
|---|---|---|
| `franklin.osm` (openstreetmap.org "Export", OSM XML, box 42.05806,-71.38487 to 42.07988,-71.35315) | d8e54abec54f87663d364ddd9b5013f375be8c5b81e8582d74761b3a763fc4fd | the layout source; converted to `raw/overpass.geojson` with osmtogeojson (the converter Overpass Turbo uses). The box covers the whole planned world, so no Overpass export is needed. |
| `Screenshot.2026-10-19.164711.png` (Google Maps satellite) | 818991c929ec102fca9dbfebc3a9561583af60db5a3a2a18a7087af7e69e1518 | look-only reference |

OSM contents (audit 2026-10-19, `proposed/osm_overview.png`): boundary way 29783349
"Franklin Country Club" (one polygon, 67.9 ha, 1,419 x 1,637 m, `golf:par=71`);
18 `golf=hole` lines with ref and par (pars add to 71); every line starts on a tee box
and ends on a green; 59 tee boxes, 20 greens (2 practice), 24 fairways, 59 bunkers,
5 `water_hazard` ponds, 50 cart paths, driving range. No pins on any hole green (the
5 pins are on the range). Hole 14's line crosses Uncas Pond (way 90968191), outside
the course boundary, for 134 m.

## Status (2026-10-19)

All received in the release `franklin-data`:

| File | SHA-256 | Check |
|---|---|---|
| `USGS_1M_19_x30y466_MA_CentralEastern_2021_B21.tif` (345 MB) | b5e489869e7ae33fefc64524c80f1f241d8aa016171d2fc5c89866013fb57388 | EPSG:26919, 1 m, float32, metres, nodata -999999; 10 km tile |
| `USGS_1M_19_x30y467_MA_CentralEastern_2021_B21.tif` (381 MB) | 273b70537e61711ee85ca36528feee5c265b07c3783eb2ee3257d2ec0551a3b8 | same grid |
| `ma2021_cent_east_J1472668.zip` (961 MB; one LAZ, 154 M points) | 2b076f89d2a8a782213a4a7acb93b31c1e893d09a0cfbc3b8da41fe6ef5b769b | NAD83(2011) / UTM 19N **US survey feet**, NAVD88 **US survey feet**; classes 2 (ground), 3, 4, 5 (vegetation); GPS times 21 March 2021 (leaf-off); covers the world |

The two tiles are mosaicked and clipped to the world + 100 m by `clip_dem.py`
into `raw/usgs_dem_2021_1m_clip.tif` (committed; 1,993 x 2,249 px, no gaps,
59.9-117.9 m). The LAZ goes in `raw/laz/` (not in git). The OSM export becomes
`raw/overpass.geojson` through `osm_to_geojson.py`.

The original request follows.

## Scorecard (no official card found)

The club website (franklincc.com) has no scorecard. Third-party listings:

- Stymie (all 13 tee sets, hole by hole; each row adds up to its total):
  https://stymie.golf/golf-courses/massachusetts/norfolk-county/franklin/franklin-country-club
- OpenGolfAPI (Blue only): https://courses.opengolfapi.org/courses/MA/franklin-country-club
- GolfingRecord (one set, 6,160 yd, labelled Black): https://www.golfingrecord.com/golf-scorecard/3445f564-a223-4d8c-a388-31844cc4d2a2

Conflicts: back-nine stroke indexes differ in all three; Blue rating/slope 72.3/128
(Stymie) vs 72.7/131 (OpenGolfAPI). A photo of the printed card settles both.

## Requested

### 1. Bare-earth elevation (USGS 3DEP 1 m DEM, two tiles)

Same product as Highland Links (2021 USGS Lidar: Central Eastern Massachusetts,
flown 20 Mar - 24 Apr 2021; Franklin lies inside the project's extent). The world
spans UTM northing ~4,659,100-4,661,260, across two tiles. Names derived from the
USGS tile scheme; the sandbox can't reach USGS to confirm they exist.

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x30y466_MA_CentralEastern_2021_B21.tif
- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x30y467_MA_CentralEastern_2021_B21.tif

If a link fails: https://apps.nationalmap.gov/downloader -> Elevation Products (3DEP)
-> tick "1 meter DEM" -> enter the box below -> Search Products -> download the items
whose names contain `MA_CentralEastern_2021`.

### 2. Lidar vegetation points (NOAA Data Access Viewer, clipped)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9777/details/9777
   ("2021 USGS Lidar: Central Eastern Massachusetts").
2. Draw a rectangle over the box below (larger is fine, smaller is not).
3. Add the dataset to the cart, open the cart, Next.
4. Output: **Point**, format **LAZ**. Classes, if offered: **4 Medium Vegetation**
   and **5 High Vegetation** only (otherwise all). Projection **UTM zone 19**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link (Highland Links took ~30 min).

### Box (WGS84) for both

south 42.0592, west -71.3802, north 42.0792, east -71.3564

(world 1,792 x 2,048 m plus 60 m on every side).

### 3. Hand-off

Add the files to the existing release `franklin-data`: open
https://github.com/chuckb2000/silver-swing/releases, click the pencil on
"Franklin data", drop the two `.tif` files and the NOAA zip into the
"Attach binaries" box **below** the description (the description box rejects files
over 25 MB), then **Update release**.
