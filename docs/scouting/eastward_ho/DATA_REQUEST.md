# Eastward Ho! — data request (scouted 2026-10-24)

Course: Eastward Ho! Country Club, 325 Fox Hill Road, Chatham, Barnstable
County, MA (Nickerson's Neck, on Pleasant Bay). Course id `eastward_ho`.
UTM zone 19N (EPSG:32619). `state` MA.

Nothing here could be tested from Claude's sandbox; the course chat checks
every file when it arrives. Do the steps in order; each saves one file.

## Download box

WGS84: south 41.70171, west -70.00338, north 41.73269, east -69.96203
(3.4 x 3.4 km around the clubhouse; much of it is Pleasant Bay and Crows Pond).

## 1. OpenStreetMap (< 5 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export** -> **GeoJSON** -> **download**. Save as
`eastward_ho_overpass.geojson`.

```
[out:json][timeout:180][bbox:41.70171,-70.00338,41.73269,-69.96203];
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

## 2. Bare earth (USGS 3DEP 1 m, one file, about 46 MB)

Open this link; the browser downloads a GeoTIFF. Save as
`eastward_ho_3dep_1m.tif`. **Upload it exactly as it downloads** (don't open,
convert or compress it: at TPC Boston an image tool turned the heights into a
JPEG picture).

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=416555,4617144,419956,4620545&bboxSR=32619&imageSR=32619&size=3401,3401&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open
that, and click the `href` link it returns.

Fallback (only if the link above fails): the two 10 km tiles of the 2021
Central Eastern Massachusetts project, the one that covers Highland Links in
Truro (about 100-350 MB each; much of them is sea):

- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x41y462_MA_CentralEastern_2021_B21.tif
- https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/MA_CentralEastern_2021_B21/TIFF/USGS_1M_19_x41y463_MA_CentralEastern_2021_B21.tif

If those 404: https://apps.nationalmap.gov/downloader -> Elevation Products
(3DEP) -> tick "1 meter DEM" -> enter the download box -> Search Products ->
download the newest items covering it.

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped; 0.2-1 GB)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9777/details/9777
   ("2021 USGS Lidar: Central Eastern Massachusetts", flown 20 Mar - 24 Apr
   2021, leaf-off; Highland Links' trees came from it).
2. Draw a rectangle over this **lidar box** (smaller than the download box, to
   keep the zip small; larger is fine):
   **south 41.7050, west -69.9990, north 41.7290, east -69.9665**.
3. Add the dataset to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes, if offered: **4 Medium
   Vegetation** and **5 High Vegetation** only (otherwise all). Projection
   **UTM zone 19**, **NAD83(2011)**, **meters**; vertical **NAVD88**,
   **meters**. Leave the rest at the defaults.
5. Submit with your email. NOAA emails a zip link (Highland Links' took about
   30 minutes). Keep the zip as it comes, e.g. `ma2021_cent_east_J<number>.zip`.

## 4. Orthophoto (USDA NAIP, one JPEG, about 5-10 MB)

Open this link and save as `eastward_ho_naip.jpg` (0.85 m pixels over the
download box; the course chat georeferences it from the box):

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=416555,4617144,419956,4620545&bboxSR=32619&imageSR=32619&size=3992,3992&format=jpg&f=image
```

If it fails, use USDA's service: replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff` (save as `eastward_ho_naip.tif`).

This photo matters more than usual here: the course was restored in 2024
(bigger greens, new sand scrapes, new tees on 15 and 18), after the lidar.

## 5. Scorecard (optional, but it settles the open items)

No official card is online. If you can get a **photo of the club's current
printed card** (front and back, with ratings), save it as
`eastward_ho_card.jpg`. Until then the course chat uses the GolfPass card in
`scorecard.csv` (the post-restoration one).

## 6. Reference pictures (optional)

- Jon Cavalier's hole-by-hole photos (2017, before the restoration; look-only):
  https://geekedongolf.com/2017/08/03/eastward-ho-tour-by-jon-cavalier/
- Only if the course chat asks (when the NAIP photo predates the 2024
  restoration): a Google or Bing satellite screenshot of the course with at
  least three marked control points (pixel <-> lat/lon), under CLAUDE.md 5.1's
  conditions (traced features get `source=google`/`bing`, never go to OSM).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the draft
   release `eastward_ho-data` (if there isn't one: **Draft a new release**, tag
   `eastward_ho-data`, title "Eastward Ho! data").
2. Drop every file (`eastward_ho_overpass.geojson`, `eastward_ho_3dep_1m.tif`,
   the NOAA zip, `eastward_ho_naip.jpg`, and any card photo) into **Attach
   binaries** below the description box (the description box rejects files
   over 25 MB).
3. Wait until each file shows its size, then click **Publish release** (not
   "Save draft": `make fetch` can't see drafts).
4. Paste the kickoff prompt from `docs/scouting/eastward_ho/README.md` into a
   new chat.
