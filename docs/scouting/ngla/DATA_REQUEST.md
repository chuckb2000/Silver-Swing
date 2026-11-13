# NGLA and Shinnecock Hills — data request (2026-10-24)

**One set of downloads serves two courses.** National Golf Links of America
(`ngla`) and Shinnecock Hills (`shinnecock`) share a boundary in Southampton,
NY, so one box covers both (and their neighbours Sebonack and Southampton
Golf Club). Shinnecock's request (`docs/scouting/shinnecock/DATA_REQUEST.md`)
points back here: download once.

Box (WGS84): south 40.87914, west -72.47372, north 40.92895, east -72.41727.
In metres (UTM 18N, EPSG:32618 / NAD83 26918): x 712858-717459,
y 4528547-4533948 (4.6 x 5.4 km).

Open each link in a browser; each downloads one file. The browser may call
it `exportImage` or `export`; rename it to the name given. Nothing here
could be tested from the sandbox. If a link shows an error page or text
instead of downloading, copy that text into the chat.

## 1. OSM layout (required)

Open https://overpass-turbo.eu, replace the text on the left with this,
click **Run**, then **Export -> GeoJSON -> download**. Save as
`ngla_shin_overpass.geojson` (likely 10-30 MB: the box holds four golf
clubs and many houses).

```
[out:json][timeout:180][bbox:40.87914,-72.47372,40.92895,-72.41727];
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
  nwr["man_made"~"^(windmill|lighthouse)$"];
);
out geom;
```

(The last line, added to the standard query, picks up NGLA's windmill if it
is mapped as a point rather than a building.)

## 2. Bare earth (required, 4 files, about 25 MB each)

New York State's 1 m DEM from the 2024 Long Island lidar (the same service
Indian Island used). Save as `ngla_shin_dem_1.tif` ... `ngla_shin_dem_4.tif`
in this order:

```
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=712858,4528547,715158,4531247&bboxSR=26918&imageSR=26918&size=2300,2700&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_NearestNeighbor&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=715158,4528547,717459,4531247&bboxSR=26918&imageSR=26918&size=2301,2700&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_NearestNeighbor&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=712858,4531247,715158,4533948&bboxSR=26918&imageSR=26918&size=2300,2701&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_NearestNeighbor&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=715158,4531247,717459,4533948&bboxSR=26918&imageSR=26918&size=2301,2701&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_NearestNeighbor&f=image
```

Only if those fail: the USGS 3DEP links in `links_generated.md` (same box,
same four pieces; save as `ngla_shin_3dep_1.tif` ... `_4.tif`).

## 3. Lidar points for the trees (strongly preferred)

**A (preferred): NYS Long Island 2024 lidar tiles** (spring 2024, leaf-off;
Indian Island's came the same way). Open the Discover GIS Data NY
application (linked from https://gis.ny.gov/lidar, currently
https://orthos.dhses.ny.gov/), zoom to Southampton, turn on the lidar layer
**NYS - Long Island 2024**, and download these 1,500 m tiles (names to check
against):

- needed (12): `u_7125052850`, `u_7140052850`, `u_7155052850`,
  `u_7125053000`, `u_7140053000`, `u_7155053000`, `u_7125053150`,
  `u_7140053150`, `u_7155053150`, `u_7125053300`, `u_7140053300`,
  `u_7155053300`
- optional, east edge (4): `u_7170052850`, `u_7170053000`, `u_7170053150`,
  `u_7170053300`

Size per tile is unknown here (probably 100-300 MB). Bulk alternative:
ftp://ftp.gis.ny.gov/elevation/LIDAR (folder `NYS_LongIsland2024`). Upload
the files as they come (each must be under 2 GB; zip several together only
if that keeps each zip under 2 GB).

**B (lighter, older): NOAA Data Access Viewer, 2014.** If A is too heavy:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=4938
   ("2014 USGS CMGP Lidar: Post Sandy (Long Island, NY)", flown April 2014).
2. Draw a rectangle over the box above (bigger is fine).
3. Add to cart, open the cart, Next.
4. Output **Point**, format **LAZ**, classes **all** (this project has no
   vegetation classes; trees are in class 1). Projection **UTM zone 18**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link. Save as
   `ngla_shin_lidar_2014.zip`.

## 4. Orthophoto (required for tracing and the tree check, 9 files, about 3-8 MB each)

New York State orthoimagery (the latest Suffolk County flight), 0.5 m,
JPEG. Save as `ngla_shin_ortho_1.jpg` ... `ngla_shin_ortho_9.jpg` in this
order (the bbox in each link places the picture). If the page shows the
imagery date for Suffolk County, note it.

```
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=712858,4528547,714391,4530347&bboxSR=26918&imageSR=26918&size=3066,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=714391,4528547,715925,4530347&bboxSR=26918&imageSR=26918&size=3068,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=715925,4528547,717459,4530347&bboxSR=26918&imageSR=26918&size=3068,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=712858,4530347,714391,4532147&bboxSR=26918&imageSR=26918&size=3066,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=714391,4530347,715925,4532147&bboxSR=26918&imageSR=26918&size=3068,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=715925,4530347,717459,4532147&bboxSR=26918&imageSR=26918&size=3068,3600&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=712858,4532147,714391,4533948&bboxSR=26918&imageSR=26918&size=3066,3602&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=714391,4532147,715925,4533948&bboxSR=26918&imageSR=26918&size=3068,3602&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=715925,4532147,717459,4533948&bboxSR=26918&imageSR=26918&size=3068,3602&format=jpg&transparent=false&dpi=96&f=image
```

Optional, or if those fail: the NAIP links in `links_generated.md` (1 m,
four pieces; save as `ngla_shin_naip_1.jpg` ... `_4.jpg`).

## 5. Scorecards (if you can get them)

Neither club publishes a card online. A phone photo of each club's printed
card (front and back, every tee and the ratings) would replace the
third-party cards in `scorecard.csv`. Save as `ngla_card_*.jpg` and
`shinnecock_card_*.jpg`.

## 6. Reference pictures

None needed. Any routing map or yardage book page you have is welcome
(look-only, never traced).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the
   draft release `ngla-data` (if there is none: "Draft a new release", tag
   `ngla-data`).
2. Drop every file from steps 1-5 into **Attach binaries** (below the
   description box, which rejects files over 25 MB). Click
   **Publish release**.
3. Do the same for `shinnecock-data` with the **same files** (no new
   downloads), plus the Shinnecock card photo if you have one, so each
   course rebuilds from its own release with `make fetch`.
