# Pine Valley — data request (scouted 2026-10-24)

Course: Pine Valley Golf Club, Pine Hill (formerly the borough of Pine Valley), Camden County, NJ.
Course id `pine_valley`. UTM zone 18N (EPSG:32618). `state` NJ.

Open each link in a browser; each downloads one file. The browser may name
them `exportImage.tiff`, `export.jpg` and so on; rename them to the names
given here. If a link shows an error page or JSON instead of a download, copy
its text into the course chat. Upload every file exactly as it downloads
(don't zip or compress a `.tif`).

## The box

Course centre 39.7853, -74.9695 (the centre of the course's OSM features, via
OpenGolfAPI), 2 km each way:

- WGS84: south 39.76728, west -74.99285, north 39.80332, east -74.94614
- EPSG:32618: x 500612-504611, y 4401929-4405928 (3,999 x 3,999 m)

The property is 623 acres (about 1.6 km across) with the main course, the
10-hole Short Course and the clubhouse, so the box leaves 1 km or more of
woods on every side.

## 1. OSM (Overpass Turbo) → `pine_valley_overpass.geojson` (about 5-15 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**:

```
[out:json][timeout:180][bbox:39.76728,-74.99285,39.80332,-74.94614];
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

Check: the map on the right should show the golf course in the middle of the
data. If it doesn't, stop and tell the course chat.

## 2. Bare earth (USGS 3DEP, 1 m) → `pine_valley_dem.tif` (about 64 MB)

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=500612,4401929,504611,4405928&bboxSR=32618&imageSR=32618&size=3999,3999&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If the link shows an error page, change the last part `f=image` to `f=json`,
open it, and open the `href` it returns.

This should be the 2015 Delaware Valley lidar (flown 12 April - 23 May 2015;
the newer 2019 South Jersey lidar stops at the Camden County line).

**Also note (1 minute, helps the course chat):** open
https://apps.nationalmap.gov/downloader, tick **Elevation Products (3DEP)** →
**1 meter DEM** and **Lidar Point Cloud (LPC)**, type the box above into the
extent (or draw around the course), click **Search Products**, and copy the
names of the items listed (they contain the project name and year, e.g.
`USGS_1M_18_x50y441_<project>`). If one is newer than 2015, say so.

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped) → the zip NOAA emails (about 0.4-0.7 GB)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9119/details/9119
   ("2015 DVRPC Lidar: Delaware Valley (PA, NJ)").
2. Draw a rectangle over this smaller box (the trees are only needed around
   the course; larger is fine, smaller is not):
   **south 39.7718, west -74.9871, north 39.7989, east -74.9519**.
   Or draw your own around the course you see on the map, keeping about
   200 m of woods outside it on every side.
3. Add the dataset to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes: **all** (this project may
   not split vegetation into its own classes; leaving out "unclassified"
   would lose the trees). Projection **UTM zone 18**, **NAD83(2011)**,
   **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link (Franklin's took under an
   hour). Upload the zip as it arrives.

## 4. Orthophotos

### 4a. NAIP (USGS National Map, 1 m, JPEG) → `pine_valley_naip.jpg` (about 5-8 MB)

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=500612,4401929,504611,4405928&bboxSR=32618&imageSR=32618&size=3999,3999&format=jpg&f=image
```

If it fails, use USDA's own NAIP service: replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

### 4b. New Jersey 2020 orthophotos (1 ft, leaf-off, shown at 0.5 m) → four JPEGs (about 3-6 MB each). Recommended.

Sharper than NAIP, and leaf-off (flown 2 April - 5 May 2020): the pitch pines
are green while the oaks are bare, which tells the two apart, and the sand
shows clearly. Save as `pine_valley_nj2020_sw.jpg`, `_se`, `_nw`, `_ne`:

```
https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer/export?bbox=500612,4401929,502611,4403928&bboxSR=32618&imageSR=32618&size=3998,3998&format=jpg&f=image
https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer/export?bbox=502611,4401929,504611,4403928&bboxSR=32618&imageSR=32618&size=4000,3998&format=jpg&f=image
https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer/export?bbox=500612,4403928,502611,4405928&bboxSR=32618&imageSR=32618&size=3998,4000&format=jpg&f=image
https://maps.nj.gov/arcgis/rest/services/Basemap/Orthos_Natural_2020_NJ_WM/MapServer/export?bbox=502611,4403928,504611,4405928&bboxSR=32618&imageSR=32618&size=4000,4000&format=jpg&f=image
```

(sw, se, nw, ne in that order; the bbox in each link places the picture.)

## 5. Scorecard

Nothing to download: the club publishes no card. **Optional, and the most
useful single item:** a photo of Pine Valley's printed card, if you or a
friend can get one (it would settle the tee names, the current back tees and
the women's ratings).

## 6. Reference pictures (optional, look-only)

None needed. Any photos you have of the course are welcome for the theme
(sand colour, pines, the scrub).

## 7. Hand-off

1. Open https://github.com/chuckb2000/Silver-Swing/releases and open the
   draft release `pine_valley-data` (if there is none, click **Draft a new
   release** and give it the tag `pine_valley-data`).
2. Drop every file into **Attach binaries** (below the description box,
   which rejects files over 25 MB).
3. Click **Publish release** (not "Save draft").
