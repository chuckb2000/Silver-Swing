# Pasatiempo — data request (scouted 2026-10-24)

Course: Pasatiempo Golf Club, 20 Clubhouse Road, Santa Cruz, Santa Cruz County,
CA. Course id `pasatiempo`. UTM zone 10N (EPSG:32610). `state` CA.

Open each link in a browser. Each one downloads one file. Save it under the name
given (or keep the browser's name: the course chat identifies files by their
contents). If a link shows an error page or a page of text instead of a download,
copy that text into a file called `<name>.error.txt` and upload it instead. Nothing
here could be tested from the sandbox, so the course chat checks every file when it
arrives.

## Box (for every item)

The course is not yet seen in OSM, so the box is the club's centre (37.0040 N,
122.0260 W) plus 1.8 km on every side. That is the course plus at least 600 m of
margin.

- WGS84: south 36.98760, west -122.04643, north 37.02039, east -122.00555
- EPSG:32610: x 584859-588460, y 4093959-4097560 (3,601 x 3,601 m)

## 1. OSM (Overpass Turbo) → `pasatiempo_overpass.geojson` (~2-6 MB)

Open https://overpass-turbo.eu, replace the text on the left with the query below,
and click **Run**. Then choose **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:36.98760,-122.04643,37.02039,-122.00555];
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

## 2. Bare earth (USGS 3DEP, 1 m) → `pasatiempo_dem.tif` (~52 MB)

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=584859,4093959,588460,4097560&bboxSR=32610&imageSR=32610&size=3601,3601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open the
link again, and open the `href` link it returns. Upload the file exactly as it
downloads. Don't compress it: at TPC Boston a compressor turned the heights into a
picture.

**2b. Optional (~1 KB): which lidar project the heights come from.** Open this link,
then save the page of text as `pasatiempo_3dep_identify.json`:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/identify?geometry=%7B%22x%22%3A-122.026%2C%22y%22%3A37.004%2C%22spatialReference%22%3A%7B%22wkid%22%3A4326%7D%7D&geometryType=esriGeometryPoint&returnGeometry=false&returnCatalogItems=true&returnPixelValues=false&f=json
```

The project could not be confirmed from the sandbox. The 1 m tile covering the box
is `x58y410`, named
`USGS_1M_10_x58y410_<project>.tif` and found under
`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/`.
Fallback for the whole of item 2: go to https://apps.nationalmap.gov/downloader, choose
**Elevation Products (3DEP)**, tick **1 meter DEM**, enter the box above, click
**Search Products**, and download the item named `USGS_1M_10_x58y410_...`. Its
file name gives the project name and year.

## 3. Canopy: lidar points for the trees (NOAA Data Access Viewer) → the zip NOAA emails (~0.2-1 GB)

The sandbox couldn't confirm which dataset covers Santa Cruz, so this step picks
it from the list:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/
2. Use the rectangle tool to draw over the box above (south 36.9876, west
   -122.0464, north 37.0204, east -122.0056). Larger is fine; smaller is not. The
   course is in the hills about 3 km north of downtown Santa Cruz. Draw about
   1.8 km around it on every side.
3. The list shows every lidar dataset over the box. Pick the **newest** one that is
   a point cloud from USGS or 3DEP, with a name like "20xx USGS Lidar: ...". Avoid
   names that say "DEM" or "Topobathy" unless nothing else is listed. Write its name,
   year and ID (shown under **Details**) in the release description.
4. Add it to the cart, open the cart, and click **Next**.
5. Output: **Point**, format **LAZ**. Classes: **all**. If the form lets you untick
   7 and 18 (noise), untick those two. Many California projects leave the trees
   unclassified (class 1), so don't limit the download to 2/4/5. Projection:
   **UTM zone 10**, **NAD83(2011)**, **meters**. Vertical: **NAVD88**, **meters**.
6. Submit with your email. NOAA emails a zip link (Franklin's took under an hour).
   Upload the zip as it comes.

If the viewer lists no USGS dataset, take the newest dataset it does list and note
its name.

## 4. Orthophoto (USDA NAIP) → `pasatiempo_naip.jpg` (~4-8 MB)

The whole box at 0.9 m:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=584859,4093959,588460,4097560&bboxSR=32610&imageSR=32610&size=3988,3988&format=jpg&f=image
```

Optional, the course core at full 0.6 m sharpness → `pasatiempo_naip_core.jpg`
(the course is wooded, so this helps tracing):

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=585559,4094659,587760,4096860&bboxSR=32610&imageSR=32610&size=3669,3669&format=jpg&f=image
```

If these fail, use USDA's own NAIP service. In each link, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

Note: every green and bunker was rebuilt between April 2023 and December 2024. A
summer 2024 NAIP shows the back nine under construction (it was closed May-Dec
2024), and 2022 or earlier shows the old shapes.

## 5. Scorecard (the club's card, two images) → save both as they are

The sandbox could read only the totals. The hole-by-hole card is in these images.
Right-click each one and choose **Save image as**:

- https://www.pasatiempo.com/images/uploads/20/scorecard_1__large.jpg → `pasatiempo_scorecard_1.jpg`
- https://www.pasatiempo.com/images/uploads/20/scorecard_4__large.jpg → `pasatiempo_scorecard_4.jpg`

(Both are linked from https://www.pasatiempo.com/golf/scorecard-and-local-rules.)

## 6. Optional: pictures of the course as it is now

The restoration ended in December 2024, after every open image. Once OSM is in,
the course chat will say whether greens or bunkers need a newer picture. If they
do, save a Google or Bing satellite screenshot of the course with at least three
points you can name (road corners, buildings), under the project's rules
(CLAUDE.md 5.1). Not needed now.

Look-only reference (optional): the before/after photos on
https://www.pasatiempo.com/information/restoration.

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the draft
   release `pasatiempo-data`. If it doesn't exist, click "Draft a new release" and
   give it the tag `pasatiempo-data`.
2. Drop every file into **Attach binaries**, below the description box (the
   description box rejects files over 25 MB).
3. In the description, write the NOAA dataset name, year and ID from step 3.
4. Click **Publish release**, not "Save draft".
