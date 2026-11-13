# Strawberry Farms Golf Club — data request (scouted 2026-10-24)

Course: Strawberry Farms Golf Club, 11 Strawberry Farms Rd, Irvine, Orange
County, CA. Course id `strawberry_farms`, UTM zone 11N (EPSG:32611), `state` CA.

The box below is the course's estimated extent plus a wide margin. It runs from
the edge of Mason Regional Park on the west to past Sand Canyon Reservoir on the
east, and from University Drive on the north into Shady Canyon on the south. It
is 4.0 x 4.0 km.

- **Box (WGS84):** south 33.63142, west -117.81813, north 33.66777, east -117.77468
- **Box (UTM 11N):** x 424153-428152, y 3721590-3725589

Open each link in a browser. Each one downloads a single file. The browser may
name it `exportImage.tiff` / `.jpg`; that's fine, but rename it as shown if you
can. If a link shows an error page or JSON instead of a download, copy its text
for the course chat.

## 1. OSM layout (Overpass Turbo, ~10-25 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**. Save it as
`strawberry_farms_overpass.geojson`.

```
[out:json][timeout:180][bbox:33.63142,-117.81813,33.66777,-117.77468];
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

The box also takes in Shady Canyon Golf Club (private, to the south), part of
Mason Regional Park and the Turtle Rock houses. That is expected, and the course
chat keeps only Strawberry Farms.

## 2. Bare earth (USGS 3DEP, 1 m, one file, ~64 MB)

Save it as `strawberry_farms_dem.tif`:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=424153,3721590,428152,3725589&bboxSR=32611&imageSR=32611&size=3999,3999&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open the
link again, and open the `href` address it returns. Upload the file exactly as it
downloads, without zipping or compressing it. (TPC Boston's tiles were ruined by
compression.)

Fallback: the whole 3DEP 1 m tile is `USGS_1M_11_x42y373_<project>.tif` under
`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/`.
The project name couldn't be looked up during scouting (see item 3b).

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped)

The lidar dataset couldn't be identified during scouting, so pick it on the map:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ .
2. Click the rectangle tool and draw over this box (larger is fine, smaller is
   not): **south 33.6351, west -117.8138, north 33.6641, east -117.7790**. That is
   3.2 x 3.2 km around the clubhouse, and it covers every green fairway you see
   between Mason Park and the reservoir's south end. If some fairways or the
   reservoir fall outside it, draw it bigger.
3. In the list of datasets, pick the **newest** one whose name says **USGS**
   (or Orange County) and **Lidar** and that covers the whole rectangle. Skip
   anything with "bathy", "topobathy", "coastal" or "El Niño" in the name, and
   anything older than 2015 if a newer one is offered. Write down its **name**
   and the **ID** number shown in its details (it also appears in the address bar
   as `/details/<ID>`).
4. Add it to the cart, open the cart, and click **Next**.
5. Output: **Point**, format **LAZ**. Classes: **2 Ground**, **4 Medium
   Vegetation**, **5 High Vegetation** if they're offered, otherwise all.
   Projection **UTM zone 11**, **NAD83(2011)**, **meters**; vertical **NAVD88**,
   **meters**.
6. Submit with your email. NOAA emails a zip link (for Franklin it took under an
   hour). The zip is probably 0.5-1.5 GB. Keep NOAA's file name.

**3b. Optional (about one minute, helps the course chat):** on
https://apps.nationalmap.gov/downloader tick **Elevation Products (3DEP) → 1
meter DEM** and **Lidar Point Cloud (LPC)**, type the box from the top of this
page into the extent, click **Search Products**, then copy the list of product
names and dates into a text file `strawberry_farms_3dep_products.txt`.

## 4. Orthophoto (USDA NAIP via the USGS National Map, 1 m, one JPEG, ~5-10 MB)

Save it as `strawberry_farms_naip.jpg`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=424153,3721590,428152,3725589&bboxSR=32611&imageSR=32611&size=3999,3999&format=jpg&f=image
```

If it fails, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (recommended)

No official card was found online. The three third-party cards disagree,
mostly about hole 18 (scorecard_sources.md). If you can, upload:

- `strawberry_farms_card_front.jpg` and `strawberry_farms_card_back.jpg`: a
  photo of both sides of the club's current printed scorecard (the pro shop
  hands them out; the club's site sf-golf.com may also have one). The **local
  rules** on the back tell the course chat whether the brush and native areas
  are penalty areas.

## 6. Reference pictures (optional, look-only)

None were found. A course map or routing picture from the club's site, if there
is one, is welcome: `strawberry_farms_map.jpg`.

## 7. Hand-off

1. On https://github.com/chuckb2000/Silver-Swing/releases, open the draft
   release `strawberry_farms-data` if it exists. Otherwise click **Draft a new
   release** and use the tag `strawberry_farms-data`.
2. Drop every file into **Attach binaries** (below the description box, which
   rejects files over 25 MB).
3. In the description, write the NOAA dataset's name, year and ID from step 3.
4. Click **Publish release**, not "Save draft".
