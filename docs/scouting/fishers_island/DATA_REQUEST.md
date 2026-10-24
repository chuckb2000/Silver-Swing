# Fishers Island Club — data request (2026-10-24)

Course id `fishers_island`, east end of Fishers Island, Town of Southold,
Suffolk County, NY. **UTM zone 19N** (EPSG:32619): the island lies just
east of 72° W, so unlike the rest of Long Island it is in zone 19. New
York's services are in zone 18; the links below ask them for zone 19.

Box (WGS84): south 41.25890, west -71.96634, north 41.31108, east -71.89370.
In metres (EPSG:32619 / NAD83 26919): x 251682-257583, y 4571736-4577337
(5.9 x 5.6 km; most of it is water: the island's east end plus margin, since
the course's exact extent couldn't be checked).

Open each link in a browser; each downloads one file. The browser may call
it `exportImage` or `export`; rename it to the name given. Nothing here
could be tested from the sandbox. If a link shows an error page or text
instead of downloading, copy that text into the chat.

## 1. OSM layout (required)

Open https://overpass-turbo.eu, replace the text on the left with this,
click **Run**, then **Export -> GeoJSON -> download**. Save as
`fishers_island_overpass.geojson` (a few MB).

```
[out:json][timeout:180][bbox:41.25890,-71.96634,41.31108,-71.89370];
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

## 2. Bare earth (required, 4 files, about 33 MB each)

New York State's 1 m DEM from the 2024 Long Island lidar (the service
Indian Island used). Its extent and tile index reach 41.31° N and 71.85° W,
which only Fishers Island needs, so the island should be in it. Save as
`fishers_dem_1.tif` ... `fishers_dem_4.tif` in this order:

```
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=251682,4571736,254632,4574536&bboxSR=26919&imageSR=26919&size=2950,2800&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=254632,4571736,257583,4574536&bboxSR=26919&imageSR=26919&size=2951,2800&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=251682,4574536,254632,4577337&bboxSR=26919&imageSR=26919&size=2950,2801&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/exportImage?bbox=254632,4574536,257583,4577337&bboxSR=26919&imageSR=26919&size=2951,2801&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If those fail or come back empty over the island: the USGS 3DEP links in
`links_generated.md` (same box and pieces; save as `fishers_3dep_1.tif` ...
`_4.tif`).

## 3. Lidar points for the trees (strongly preferred)

**A (preferred): NYS Long Island 2024 lidar tiles** (spring 2024,
leaf-off). Open the Discover GIS Data NY application (linked from
https://gis.ny.gov/lidar, currently https://orthos.dhses.ny.gov/), zoom to
the east end of Fishers Island, turn on the lidar layer **NYS - Long Island
2024**, and download every tile that touches the box. The tiles are
numbered on New York's zone-18 grid; the box spans this 5 x 5 block, but
most of it is open water where no tile exists, so expect well under 25:

`u_7530057050` to `u_7590057050`, `u_7530057200` to `u_7590057200`,
`u_7530057350` to `u_7590057350`, `u_7530057500` to `u_7590057500`,
`u_7530057650` to `u_7590057650` (the first four digits step 7530, 7545,
7560, 7575, 7590).

Size per tile is unknown here (probably 100-300 MB). Bulk alternative:
ftp://ftp.gis.ny.gov/elevation/LIDAR (folder `NYS_LongIsland2024`). Upload
each file as it comes (under 2 GB each).

**B (if the island isn't in A): NOAA Data Access Viewer, 2023.**

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=10273
   ("2023 NOAA NGS Lidar: Long Island Sound, NY", flown March-October
   2023; a shoreline topobathy survey, so check that it covers the island's
   middle).
2. Draw a rectangle over the box above (bigger is fine).
3. Add to cart, open the cart, Next.
4. Output **Point**, format **LAZ**, classes **all** (trees are in class 1,
   unclassified). Projection **UTM zone 19**, **NAD83(2011)**, **meters**;
   vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link. Save as
   `fishers_lidar_2023.zip`.

A second fallback is the same recipe with ID **4938** ("2014 USGS CMGP
Lidar: Post Sandy (Long Island, NY)", April 2014), whose north edge
(41.291° N) may cut off the island's north-east tip.

## 4. Orthophoto (required for tracing and the tree check, 9 files, about 3-8 MB each)

New York State orthoimagery (latest Suffolk County flight), 0.5 m, JPEG.
Save as `fishers_ortho_1.jpg` ... `fishers_ortho_9.jpg` in this order (the
bbox in each link places the picture). Note the imagery date if the service
shows one.

```
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=251682,4571736,253649,4573603&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=253649,4571736,255616,4573603&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=255616,4571736,257583,4573603&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=251682,4573603,253649,4575470&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=253649,4573603,255616,4575470&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=255616,4573603,257583,4575470&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=251682,4575470,253649,4577337&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=253649,4575470,255616,4577337&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
https://orthos-np.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export?bbox=255616,4575470,257583,4577337&bboxSR=26919&imageSR=26919&size=3934,3734&format=jpg&transparent=false&dpi=96&f=image
```

Optional, or if those fail: the NAIP links in `links_generated.md` (1 m,
four pieces; save as `fishers_naip_1.jpg` ... `_4.jpg`).

## 5. Scorecard (most wanted)

No card is online and the two per-hole lists found disagree (par 70 or 72,
Blue yardages unconfirmed). A phone photo of the printed card, front and
back, would settle it. Save as `fishers_card_*.jpg`.

## 6. Reference pictures

None needed. A routing map or yardage book page is welcome (look-only).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the
   draft release `fishers_island-data` (if there is none: "Draft a new
   release", tag `fishers_island-data`).
2. Drop every file into **Attach binaries** (below the description box,
   which rejects files over 25 MB).
3. Click **Publish release**.
