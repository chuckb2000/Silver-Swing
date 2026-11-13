# San Francisco Golf Club — data request (scouted 2026-10-24)

Course: San Francisco Golf Club, 1310 Junipero Serra Blvd, San Francisco, CA
94132. Course id `sfgc`. UTM zone 10N (EPSG:32610). `state` CA.

Open each link in a browser. Each one downloads one file. Save it under the name
given (or keep the browser's name: the course chat identifies files by their
contents). If a link shows an error page or a page of text instead of a download,
copy that text into a file called `<name>.error.txt` and upload it instead. Nothing
here could be tested from the sandbox, so the course chat checks every file when it
arrives.

## Box (for every item)

The box is the course's centre (37.7115 N, 122.4790 W) plus 1.5 km on every side.
That is the course plus at least 900 m of margin. The neighbours are inside it too:
the Olympic Club, Lake Merced Golf Club, and probably part of Harding Park and the
south end of Lake Merced. The course chat keeps only SFGC, using its OSM boundary.

- WGS84: south 37.69790, west -122.49611, north 37.72509, east -122.46188
- EPSG:32610: x 544421-547422, y 4172433-4175434 (3,001 x 3,001 m)

## 1. OSM (Overpass Turbo) → `sfgc_overpass.geojson` (~5-15 MB: four clubs and city blocks)

Open https://overpass-turbo.eu, replace the text on the left with the query below,
and click **Run**. Then choose **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:37.69790,-122.49611,37.72509,-122.46188];
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

## 2. Bare earth (USGS 3DEP, 1 m) → `sfgc_dem.tif` (~36 MB)

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=544421,4172433,547422,4175434&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open the
link again, and open the `href` link it returns. Upload the file exactly as it
downloads. Don't compress it.

**2b. Optional (~1 KB): which lidar project the heights come from.** Open this link,
then save the page of text as `sfgc_3dep_identify.json`:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify?geometry=%7B%22x%22%3A-122.479%2C%22y%22%3A37.7115%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=true&returnPixelValues=false&f=json
```

The project could not be confirmed from the sandbox. The 1 m tile covering the box
is `x54y418`, named
`USGS_1M_10_x54y418_<project>.tif` and found under
`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/`.
Fallback for the whole of item 2: go to https://apps.nationalmap.gov/downloader, choose
**Elevation Products (3DEP)**, tick **1 meter DEM**, enter the box above, click
**Search Products**, and download the item named `USGS_1M_10_x54y418_...`. Its
file name gives the project name and year.

## 3. Canopy: lidar points for the trees (NOAA Data Access Viewer) → the zip NOAA emails (~0.2-1 GB)

The sandbox couldn't confirm which dataset is newest over San Francisco, so this
step picks it from the list:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/
2. Use the rectangle tool to draw over the box above (south 37.6979, west
   -122.4961, north 37.7251, east -122.4619). Larger is fine; smaller is not. The
   course is at the south-west corner of San Francisco, south-east of Lake Merced,
   with Junipero Serra Boulevard along its east side.
3. The list shows every lidar dataset over the box. Pick the **newest** one that is
   a point cloud from USGS or 3DEP, with a name like "20xx USGS Lidar: ...". Avoid
   names that say "DEM" or "Topobathy" unless nothing else is listed. Write its name,
   year and ID (shown under **Details**) in the release description.
4. Add it to the cart, open the cart, and click **Next**.
5. Output: **Point**, format **LAZ**. Classes: **all**. If the form lets you untick
   7 and 18 (noise), untick those two. Many California projects leave the trees
   unclassified (class 1), so don't limit the download to 2/4/5. Projection:
   **UTM zone 10**, **NAD83(2011)**, **meters**. Vertical: **NAVD88**, **meters**.
6. Submit with your email. NOAA emails a zip link. Upload the zip as it comes.

If the viewer lists no USGS dataset, take the newest dataset it does list and note
its name.

## 4. Orthophoto (USDA NAIP) → `sfgc_naip.jpg` (~4-8 MB)

The whole box at 0.75 m:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=544421,4172433,547422,4175434&bboxSR=32610&imageSR=32610&size=3991,3991&format=jpg&f=image
```

Optional, the course core at full 0.6 m sharpness → `sfgc_naip_core.jpg`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=544921,4172933,546922,4174934&bboxSR=32610&imageSR=32610&size=3335,3335&format=jpg&f=image
```

If these fail, use USDA's own NAIP service. In each link, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (only if you can get one)

No official card was found online (the club is private). If you, or a friend who
has played there, can get a photo of the printed scorecard or the yardage book,
save it as `sfgc_scorecard.jpg`. Without it the course uses a third-party card
(scorecard_sources.md).

## 6. Course map / reference pictures

None needed now. If OSM lacks holes, the course chat will ask for a Google or Bing
screenshot under the project's rules (CLAUDE.md 5.1).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the draft
   release `sfgc-data`. If it doesn't exist, click "Draft a new release" and give
   it the tag `sfgc-data`.
2. Drop every file into **Attach binaries**, below the description box (the
   description box rejects files over 25 MB).
3. In the description, write the NOAA dataset name, year and ID from step 3.
4. Click **Publish release**, not "Save draft".
