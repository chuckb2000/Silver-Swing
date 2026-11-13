# Myopia Hunt Club — data request (scouted 2026-10-24)

Course: Myopia Hunt Club, 435 Bay Road, South Hamilton (town of Hamilton),
Essex County, MA. Course id `myopia`. UTM zone 19N (EPSG:32619). `state` MA.

Nothing here could be tested from Claude's sandbox; the course chat checks
every file when it arrives. Do the steps in order; each saves one file.

## Download box

WGS84: south 42.59244, west -70.88083, north 42.62556, east -70.83599
(3.6 x 3.6 km around the clubhouse; the course is about 1.3 km across and
its exact extent isn't known until the OSM export).

## 1. OpenStreetMap (< 5 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export** -> **GeoJSON** -> **download**. Save as
`myopia_overpass.geojson`.

```
[out:json][timeout:180][bbox:42.59244,-70.88083,42.62556,-70.83599];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr["amenity"="parking"];
);
out geom;
```

## 2. Bare earth (USGS 3DEP 1 m, one file, about 50 MB)

Open this link; the browser downloads a GeoTIFF. Save as `myopia_3dep_1m.tif`.
**Upload it exactly as it downloads** (don't open, convert or compress it: at
TPC Boston an image tool turned the heights into a JPEG picture).

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=345765,4717270,349366,4720871&bboxSR=32619&imageSR=32619&size=3601,3601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open
that, and click the `href` link it returns.

Fallback (only if the link above fails): the two 10 km tiles of the 2021
Central Eastern Massachusetts project (about 300-400 MB each). The project name
is expected, not confirmed (it covers Franklin, Norton and Truro; Hamilton
should be inside it):

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x34y472_MA_CentralEastern_2021_B21.tif
- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x34y473_MA_CentralEastern_2021_B21.tif

If those 404: https://apps.nationalmap.gov/downloader -> Elevation Products
(3DEP) -> tick "1 meter DEM" -> enter the download box -> Search Products ->
download the newest items covering it.

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped; 0.3-1.5 GB)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9777/details/9777
   ("2021 USGS Lidar: Central Eastern Massachusetts", flown 20 Mar - 24 Apr
   2021, leaf-off; the same dataset as Franklin, TPC Boston and Highland Links).
2. Draw a rectangle over this **lidar box** (smaller than the download box, so
   the zip stays under GitHub's 2 GB limit; larger is fine up to that):
   **south 42.5970, west -70.8750, north 42.6210, east -70.8420**.
   If the map shows the dataset doesn't reach South Hamilton, use the newest
   "USGS Lidar" dataset the search lists for the box instead and note its name.
3. Add the dataset to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes, if offered: **4 Medium
   Vegetation** and **5 High Vegetation** only (otherwise all). Projection
   **UTM zone 19**, **NAD83(2011)**, **meters**; vertical **NAVD88**,
   **meters**. Leave the rest at the defaults.
5. Submit with your email. NOAA emails a zip link (Franklin's came within an
   hour; it arrived in US survey feet despite "meters", which is fine). Keep
   the zip as it comes, e.g. `ma2021_cent_east_J<number>.zip`.

## 4. Orthophoto (USDA NAIP, one JPEG, about 5-10 MB)

Open this link and save as `myopia_naip.jpg` (0.9 m pixels over the download
box; the course chat georeferences it from the box):

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=345765,4717270,349366,4720871&bboxSR=32619&imageSR=32619&size=3988,3988&format=jpg&f=image
```

If it fails, use USDA's service: replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff` (save as `myopia_naip.tif`).

## 5. Scorecard (optional, but it settles the open items)

No official card is online. If you can get a **photo of the club's printed
card** (front and back, with ratings), save it as `myopia_card.jpg`. Until
then the course chat uses the Stymie/GolfPass card in `scorecard.csv`.

## 6. Reference pictures (optional, look-only, never traced)

- The Fried Egg's routing map on https://www.thefriedegg.com/courses/myopia-hunt-club
  (right-click the map, save as `myopia_routing.png`).
- Jon Cavalier's hole-by-hole photos:
  https://geekedongolf.com/2016/05/30/myopia-hunt-club-tour-by-jon-cavalier/
  (no need to save; the course chat can't open the site, so a screenshot of
  any hole you think matters helps).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the draft
   release `myopia-data` (if there isn't one: **Draft a new release**, tag
   `myopia-data`, title "Myopia Hunt Club data").
2. Drop every file (`myopia_overpass.geojson`, `myopia_3dep_1m.tif`, the NOAA
   zip, `myopia_naip.jpg`, and any card photo) into **Attach binaries** below
   the description box (the description box rejects files over 25 MB).
3. Wait until each file shows its size, then click **Publish release** (not
   "Save draft": `make fetch` can't see drafts).
4. Paste the kickoff prompt from `docs/scouting/myopia/README.md` into a new chat.
