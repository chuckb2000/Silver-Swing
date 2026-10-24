# Baltimore Country Club (Five Farms, East Course) — data request (scouted 2026-10-24)

Course: Baltimore Country Club, East Course at Five Farms, 11500 Mays Chapel
Road, Lutherville-Timonium, Baltimore County, MD. Course id `baltimore_cc`.
UTM zone 18N (EPSG:32618). `state` MD.

Open each link in a browser; each downloads one file. Rename it to the name
given. If a link shows an error page or JSON instead, copy its text into the
course chat. Upload files exactly as they download (don't zip a `.tif`).

## The box

Centre 39.4435, -76.6623 (the OSM golf-course centroid, via OpenGolfAPI; the
clubhouse is 360 m south of it), 2 km each way, so both courses at Five Farms
(East and West) plus at least 500 m fit:

- WGS84: south 39.42515, west -76.68597, north 39.46185, east -76.63864
- EPSG:32618: x 354957-358958, y 4365312-4369313 (4,001 x 4,001 m)

## 1. OSM (Overpass Turbo) → `baltimore_cc_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**:

```
[out:json][timeout:180][bbox:39.42515,-76.68597,39.46185,-76.63864];
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

**Check:** the golf course(s) should sit in the middle of the result, around
Mays Chapel Road. If the map shows them cut off at an edge, say so in the
chat before downloading the rest.

## 2. Bare earth (USGS 3DEP, 1 m) → four files, about 15 MB each

Save as `baltimore_cc_dem_sw.tif`, `_se`, `_nw`, `_ne` (in this order):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=354957,4365312,356957,4367312&bboxSR=32618&imageSR=32618&size=2000,2000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=356957,4365312,358958,4367312&bboxSR=32618&imageSR=32618&size=2001,2000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=354957,4367312,356957,4369313&bboxSR=32618&imageSR=32618&size=2000,2001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=356957,4367312,358958,4369313&bboxSR=32618&imageSR=32618&size=2001,2001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part `f=image` to `f=json`,
open it, and open the `href` it returns.

The newest lidar here is **USGS MD_4County_D24** (Baltimore County flown
17-30 December 2024, 8 points/m², with a 0.5 m DEM). The 3DEP service above
serves the best data it holds, which may still be older. **1-minute check:**
open https://apps.nationalmap.gov/downloader, tick **Elevation Products
(3DEP)** → **1 meter DEM**, draw a box around the course, click **Search
Products**, and copy the item names into the chat (the 1 m tile is
`x35y437`; the name ends in its project, e.g. `..._MD_4County_D24`).

**2b. Only if the course chat asks** (the 3DEP links turn out to be older
data): the 2024 DEM itself from the NOAA Data Access Viewer, dataset **ID
14110**: open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=14110,
draw the same box as in step 3, add to cart, output **GeoTIFF**, projection
**UTM zone 18, NAD83(2011), meters**, vertical **NAVD88, meters**, cell size
**1 m**; NOAA emails a zip link → upload the zip as `baltimore_cc_dem2024.zip`.

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped) → the zip NOAA emails (a few hundred MB)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ and draw a
   rectangle around **both** golf courses at Five Farms (around Mays Chapel
   Road, north of the clubhouse), keeping about 200 m outside them on every
   side.
2. In the list, pick **"2024 USGS Lidar: Maryland 4 County"** (the point
   cloud: a "Lidar" item, not "DEM"). Write its ID number (in the address
   bar, `ID=<number>`) into the chat. If it isn't listed, pick **"2014
   Baltimore County Lidar", ID 8492** instead and say so (it is older than the
   2015 restoration, which removed trees).
3. Add it to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes: **all**. Projection **UTM
   zone 18**, **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link. Upload the zip as it
   arrives.

## 4. Orthophoto, Maryland six-inch imagery (2025) → four files, about 6-10 MB each

Maryland's statewide six-inch imagery; Baltimore County was flown in 2025.
These links ask for it at 0.5 m (the game's pixel size). Save as
`baltimore_cc_ortho_sw.jpg`, `_se`, `_nw`, `_ne`:

```
https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery/ImageServer/exportImage?bbox=354957,4365312,356957,4367312&bboxSR=32618&imageSR=32618&size=4000,4000&format=jpg&f=image
https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery/ImageServer/exportImage?bbox=356957,4365312,358958,4367312&bboxSR=32618&imageSR=32618&size=4002,4000&format=jpg&f=image
https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery/ImageServer/exportImage?bbox=354957,4367312,356957,4369313&bboxSR=32618&imageSR=32618&size=4000,4002&format=jpg&f=image
https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery/ImageServer/exportImage?bbox=356957,4367312,358958,4369313&bboxSR=32618&imageSR=32618&size=4002,4002&format=jpg&f=image
```

If these show an error, try the same imagery's map service: in each link
replace `ImageServer/exportImage` with `MapServer/export` and
`SixInch/SixInchImagery/` with `SixInch/SixInchImagery2023_2024_2025/`.

## 4b. Orthophoto, NAIP (backup, 1 m) → four files, about 2-4 MB each

Download these too (they are small, and NAIP has a near-infrared band the
course chat can use). Save as `baltimore_cc_naip_sw.jpg`, `_se`, `_nw`, `_ne`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=354957,4365312,356957,4367312&bboxSR=32618&imageSR=32618&size=2000,2000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=356957,4365312,358958,4367312&bboxSR=32618&imageSR=32618&size=2001,2000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=354957,4367312,356957,4369313&bboxSR=32618&imageSR=32618&size=2000,2001&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=356957,4367312,358958,4369313&bboxSR=32618&imageSR=32618&size=2001,2001&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (optional, but it settles the tee names)

A third-party per-hole card is in `scorecard.csv` (GolfPass), but its rows
aren't labelled with tee colours. **A photo of the club's printed East Course
card** (both sides: every tee, par, women's par, stroke index, ratings) →
`baltimore_cc_card_front.jpg`, `_back.jpg`. No card is on the club's website.

## 6. Reference pictures (optional, look-only)

None found online (no public course map or hole-by-hole tour). A photo of
the routing map in the clubhouse or on the printed card is welcome.

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and click
   **Draft a new release** with the tag `baltimore_cc-data`.
2. Drop every file into **Attach binaries** (below the description box,
   which rejects files over 25 MB).
3. Click **Publish release** (not "Save draft").
