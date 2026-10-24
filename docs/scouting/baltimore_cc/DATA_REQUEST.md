# Baltimore Country Club (Five Farms, East Course) — data request (scouted 2026-10-24, partial)

Course: Baltimore Country Club, East Course at Five Farms, Lutherville-Timonium,
Baltimore County, MD. Course id `baltimore_cc`. UTM zone 18N (EPSG:32618).
`state` MD.

**Read this first.** The scouting ran out of web searches before it could
look anything up for this course, so the course's position is estimated from
the club's address as remembered (11500 Mays Chapel Road, west of I-83
between Timonium Road and Padonia Road), not checked on a map. The box below
is therefore large (7 km a side). Step 1 checks it: if the course isn't in
the middle of the OSM result, stop and ask the course chat for new links
before downloading anything else.

Open each link in a browser; each downloads one file. Rename it to the name
given. If a link shows an error page or JSON instead, copy its text into the
course chat. Upload files exactly as they download (don't zip a `.tif`).

## The box

Estimated centre 39.445, -76.655, 3.5 km each way:

- WGS84: south 39.41289, west -76.69643, north 39.47710, east -76.61361
- EPSG:32618: x 354088-361089, y 4363967-4370968 (7,001 x 7,001 m)

It runs from about Falls Road in the west to York Road in the east, and
from Lutherville in the south to north of Padonia Road.

## 1. OSM (Overpass Turbo) → `baltimore_cc_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**. This version finds the club by
its name, so it works even if the box above is off:

```
[out:json][timeout:180];
nwr["leisure"="golf_course"]["name"~"Baltimore Country Club|Five Farms",i]->.c;
.c map_to_area->.a;
(
  .c;
  nwr(area.a)["golf"];
  nwr(area.a)["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr(area.a)["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr(area.a)["building"];
  way(area.a)["highway"];
  way(area.a)["waterway"];
  way(area.a)["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr(area.a)["amenity"="parking"];
  nwr(around.c:400)["golf"];
  nwr(around.c:400)["leisure"~"^(golf_course|park|garden|pitch|swimming_pool)$"];
  nwr(around.c:400)["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr(around.c:400)["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr(around.c:400)["building"];
  way(around.c:400)["highway"];
  way(around.c:400)["waterway"];
  way(around.c:400)["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr(around.c:400)["amenity"="parking"];
);
out geom;
```

**Check:** the map on the right should show the golf course(s), and they
should lie inside the box above (between Falls Road and York Road, around
Timonium Road / Padonia Road). Write down in the chat roughly where they are.

If the result is empty (the club isn't named that way in OSM), run this box
query instead and save it under the same name (it is bigger: a 7 km square of
suburbs; if Overpass Turbo warns about the amount of data, click to continue):

```
[out:json][timeout:180][bbox:39.41289,-76.69643,39.47710,-76.61361];
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

## 2. Bare earth (USGS 3DEP, 1 m) → four files, about 50 MB each

Save as `baltimore_cc_dem_sw.tif`, `_se`, `_nw`, `_ne` (in this order):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=354088,4363967,357588,4367467&bboxSR=32618&imageSR=32618&size=3500,3500&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=357588,4363967,361089,4367467&bboxSR=32618&imageSR=32618&size=3501,3500&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=354088,4367467,357588,4370968&bboxSR=32618&imageSR=32618&size=3500,3501&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=357588,4367467,361089,4370968&bboxSR=32618&imageSR=32618&size=3501,3501&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If a link shows an error page, change the last part `f=image` to `f=json`,
open it, and open the `href` it returns.

**Also note (1 minute, needed this time):** open
https://apps.nationalmap.gov/downloader, tick **Elevation Products (3DEP)** →
**1 meter DEM** and **Lidar Point Cloud (LPC)**, draw a box around the golf
course on the map, click **Search Products**, and copy into the chat the
names of the items listed (they contain each lidar project's name and year,
e.g. `USGS_1M_18_x35y437_<project>`). The scouting could not find which
Maryland lidar project covers Five Farms.

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped) → the zip NOAA emails (size depends on the project)

The dataset id isn't known yet, so pick it on the site:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ and draw a
   rectangle around the golf course you see on the map, keeping about 200 m
   outside it on every side (both courses at Five Farms, if you can see
   two).
2. The list on the left shows the lidar datasets covering it. Pick the
   **newest** one whose name says "USGS Lidar" or "Maryland" (not a
   "Topobathy" or "DEM" item). Write its name and ID number (in the address
   bar, `ID=<number>`) into the chat.
3. Add it to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes: **all**. Projection **UTM
   zone 18**, **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link. Upload the zip as it
   arrives.

## 4. Orthophoto (NAIP via the USGS National Map, 1 m, JPEG) → four files, about 4-6 MB each

Save as `baltimore_cc_naip_sw.jpg`, `_se`, `_nw`, `_ne`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=354088,4363967,357588,4367467&bboxSR=32618&imageSR=32618&size=3500,3500&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=357588,4363967,361089,4367467&bboxSR=32618&imageSR=32618&size=3501,3500&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=354088,4367467,357588,4370968&bboxSR=32618&imageSR=32618&size=3500,3501&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=357588,4367467,361089,4370968&bboxSR=32618&imageSR=32618&size=3501,3501&format=jpg&f=image
```

If these fail, use USDA's own NAIP service: in each link replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 4a. Maryland iMAP (optional, likely better; addresses not checked)

Maryland publishes statewide six-inch leaf-off orthophotos and county lidar
elevation through MD iMAP (https://imap.maryland.gov). The scouting couldn't
open any Maryland site, so these service directories are from memory and may
have moved: try https://imagery.geodata.md.gov/imap/rest/services and
https://lidar.geodata.md.gov/imap/rest/services (each is a plain list of
links). If they open, copy into the chat the names of the Baltimore County
items: any six-inch imagery service, and any DEM, DSM, "first return",
"normalized" or canopy-height service. The course chat then writes the export
links. If they don't open, skip this: items 2-4 are enough.

## 5. Scorecard

Nothing was found online yet (the search budget ran out). The most useful
single thing: **a photo of the club's printed East Course card** (both sides,
with every tee, par, stroke index and the ratings). Next best: the club
website's scorecard page if it has one (save the PDF or image).

## 6. Reference pictures (optional, look-only)

A course map or routing picture from the club's website, if public; photos
of the course for the theme.

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the
   draft release `baltimore_cc-data` (if there is none, click **Draft a new
   release** and give it the tag `baltimore_cc-data`).
2. Drop every file into **Attach binaries** (below the description box,
   which rejects files over 25 MB).
3. Click **Publish release** (not "Save draft").
