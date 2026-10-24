# Pelican Hill (Ocean South and Ocean North) — data request (scouted 2026-10-24)

Course: Pelican Hill Golf Club at The Resort at Pelican Hill, Newport Coast
(Newport Beach), Orange County, CA. Two Tom Fazio courses on one site: Ocean
South (built first) and Ocean North (a second `layouts` course). Data id
`pelican_hill`, UTM zone 11N (EPSG:32611), `state` CA.

- **Box (WGS84):** south 33.57083, west -117.86671, north 33.60717, east -117.82329
- **Box (UTM 11N):** x 419593-423590, y 3714908-3718905 (4.0 x 4.0 km)

The box is centred between the golf club (33.5849, -117.8419, from OSM via
OpenGolfAPI) and the resort hotel (33.5938, -117.8525), and reaches 1.3-2.7 km
beyond each. No course map with coordinates could be read, so **step 1 checks
the box** before the big downloads. It is one file per item.

Open each link in a browser. Each one downloads a single file. The browser may
name it `exportImage.tiff` / `.jpg`; that's fine, but rename it as shown if you
can. If a link shows an error page or JSON instead of a download, copy its text
for the course chat.

## 1. OSM layout (Overpass Turbo, ~10-20 MB) — and the box check

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**. Save it as
`pelican_hill_overpass.geojson`.

```
[out:json][timeout:180][bbox:33.57083,-117.86671,33.60717,-117.82329];
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

**Box check:** after **Run**, the map shows what was found. Both Pelican Hill
courses (fairways and greens in the hills above Pacific Coast Highway, between
Newport Coast Drive and Crystal Cove State Park) should sit inside the drawn
box, at least a few hundred metres from every edge (the ocean side may be
closer: that's only beach and sea). If a course touches or crosses an edge,
**stop** and send a screenshot; the box will be redrawn before the big
downloads.

## 2. Bare earth (USGS 3DEP, 1 m, one file, ~65 MB)

Save it as `pelican_hill_dem.tif`:

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=419593,3714908,423590,3718905&bboxSR=32611&imageSR=32611&size=3997,3997&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part `f=image` to `f=json`, open
the link again, and open the `href` address it returns. Upload the file exactly
as it downloads, without zipping or compressing it.

**2b. Optional (about one minute):** on https://apps.nationalmap.gov/downloader
tick **Elevation Products (3DEP) → 1 meter DEM** and **Lidar Point Cloud
(LPC)**, type the box from the top of this page into the extent, click
**Search Products**, and copy the list of product names and dates into
`pelican_hill_3dep_products.txt`. (Scouting couldn't name the 1 m DEM project
here; the fallback tiles are `USGS_1M_11_x41y372_<project>.tif` and
`USGS_1M_11_x42y372_<project>.tif` under
`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/`.)

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=4793/details/4793
   ("2011 USGS Lidar: Orange County (CA)", flown December 2011 to February
   2012; it covers the whole county).
2. Draw a rectangle over the box at the top of this page (larger is fine,
   smaller is not).
3. **Check the list for something newer:** if it also shows a USGS lidar
   dataset from 2018 or later (for example "2023 USGS Lidar: California Gaps")
   that covers **all of the rectangle's land**, use that one instead and write
   its name and ID (the number after `/details/` in the address bar) in the
   release description. Skip "topobathy" or coastal datasets that cover only a
   strip along the shore.
4. Add the dataset to the cart, open the cart, Next.
5. Output: **Point**, format **LAZ**. Classes, if offered: **1 Unclassified**
   and **2 Ground** (the 2011 dataset has no vegetation classes, so the trees
   are in class 1); for a newer dataset, **2 Ground**, **4 Medium Vegetation**,
   **5 High Vegetation**. Otherwise all. Projection **UTM zone 11**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
6. Submit with your email; NOAA emails a zip link (Franklin's took under an
   hour). Keep NOAA's file name. Expect roughly 100-300 MB.

## 4. Orthophoto (USDA NAIP via the USGS National Map, 1 m, one JPEG, ~8-15 MB)

Save it as `pelican_hill_naip.jpg`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=419593,3714908,423590,3718905&bboxSR=32611&imageSR=32611&size=3997,3997&format=jpg&f=image
```

If it fails, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecards (recommended, two small PDFs)

The scorecards are already in the scouting folder (from GolfPass, which matches
the resort's own back-tee yardages). The resort's printed cards would confirm
the other tees, the forward-tee pars and the women's handicaps. Open and save:

- https://pelicanhill.com/images/SCORECARD_SouthCourse_June2022_Online.pdf
  → `pelican_hill_ocean_south_card.pdf`
- https://pelicanhill.com/images/SCORECARD_NorthCourse_June2022_Online.pdf
  → `pelican_hill_ocean_north_card.pdf`

If the golf pages (https://www.pelicanhill.com/golf/ocean-south-course/ and
`.../ocean-north-course/`) now link a 2026 card (the South course reopened in
May 2026 after a restoration; the North reopens in November 2026), save that
one instead. If a card lists local rules (native areas, environmentally
sensitive areas), that's the most useful part.

## 6. Reference pictures (optional, look-only)

The resort map at https://pelicanhill.com/resort/map/ (a screenshot, or the
image it shows), saved as `pelican_hill_resort_map.jpg`. It shows which holes
lie where and helps check the OSM hole numbers.

## 7. Hand-off

1. On https://github.com/chuckb2000/Silver-Swing/releases, open the draft
   release `pelican_hill-data` if it exists. Otherwise click **Draft a new
   release** and use the tag `pelican_hill-data`.
2. Drop every file into **Attach binaries** (below the description box, which
   rejects files over 25 MB).
3. In the description, write the NOAA dataset's name, year and ID from step 3.
4. Click **Publish release**, not "Save draft".
