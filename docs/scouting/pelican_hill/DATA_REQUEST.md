# Pelican Hill (Ocean South, then Ocean North) — data request (scouted 2026-10-24, incomplete)

Course: Pelican Hill Golf Club at The Resort at Pelican Hill, Newport Coast
(Newport Beach), Orange County, CA. Two Tom Fazio courses on one site: Ocean
South (built first) and Ocean North (a later `layouts` course). Data id
`pelican_hill`, UTM zone 11N (EPSG:32611), `state` CA.

**Scouting was cut short:** the session's web-search budget ran out before
Pelican Hill could be looked up. **The box centre comes from memory** (the resort
sits between Pacific Coast Highway and Pelican Hill Road, between Corona del Mar
and Crystal Cove), so the box is deliberately large: 6.0 x 5.2 km, about a
third of it ocean. Step 1 checks the box before you download anything big.

- **Box (WGS84):** south 33.56832, west -117.88057, north 33.61567, east -117.81545
- **Box (UTM 11N):** x 418315-424316, y 3714641-3719842

Open each link in a browser. Each one downloads a single file. The browser may
name it `exportImage.tiff` / `.jpg`; that's fine, but rename it as shown if you
can. If a link shows an error page or JSON instead of a download, copy its text
for the course chat.

## 1. OSM layout (Overpass Turbo, ~15-30 MB) — and the box check

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**. Save it as
`pelican_hill_overpass.geojson`.

```
[out:json][timeout:180][bbox:33.56832,-117.88057,33.61567,-117.81545];
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
courses (two areas of fairways and greens above the coast highway) should sit
well inside the drawn box, at least a few hundred metres from every edge. If
either one touches or crosses an edge, **stop** and send a screenshot. The box
will be redrawn before the big downloads.

## 2. Bare earth (USGS 3DEP, 1 m, four files, ~30 MB each)

Save them as `pelican_hill_dem_1.tif` ... `pelican_hill_dem_4.tif` (in this
order):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=418315,3714641,421315,3717241&bboxSR=32611&imageSR=32611&size=3000,2600&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=421315,3714641,424316,3717241&bboxSR=32611&imageSR=32611&size=3001,2600&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=418315,3717241,421315,3719842&bboxSR=32611&imageSR=32611&size=3000,2601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=421315,3717241,424316,3719842&bboxSR=32611&imageSR=32611&size=3001,2601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If one shows an error page, change the last part `f=image` to `f=json`, open
the link again, and open the `href` address it returns. Upload the files exactly
as they download, without zipping or compressing them.

Fallback: whole 3DEP 1 m tiles `USGS_1M_11_x41y372_<project>.tif` and
`USGS_1M_11_x42y372_<project>.tif` under
`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/`.
The project name couldn't be looked up (see 3b).

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped)

The lidar dataset couldn't be identified during scouting, so pick it on the map:

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ .
2. Click the rectangle tool and draw around **both courses' fairways as you
   see them on the map, plus a few hundred metres**. At most you need this box:
   **south 33.5738, west -117.8719, north 33.6102, east -117.8241**.
3. In the list of datasets, pick the **newest** one whose name says **USGS**
   (or Orange County) and **Lidar** and that covers **both courses** (all of the
   rectangle's land). The coast has several "topobathy" or "coastal" datasets
   that cover only a thin strip along the shore; skip those, and anything older
   than 2015 if a newer one covers the land. Write down its **name** and the
   **ID** number shown in its details (also in the address bar as
   `/details/<ID>`).
4. Add it to the cart, open the cart, and click **Next**.
5. Output: **Point**, format **LAZ**. Classes: **2 Ground**, **4 Medium
   Vegetation**, **5 High Vegetation** if they're offered, otherwise all.
   Projection **UTM zone 11**, **NAD83(2011)**, **meters**; vertical **NAVD88**,
   **meters**.
6. Submit with your email. NOAA emails a zip link. Keep NOAA's file name.

**3b. Optional (about one minute):** on https://apps.nationalmap.gov/downloader
tick **Elevation Products (3DEP) → 1 meter DEM** and **Lidar Point Cloud
(LPC)**, type the box from the top of this page into the extent, click
**Search Products**, and copy the list of product names and dates into
`pelican_hill_3dep_products.txt`.

## 4. Orthophoto (USDA NAIP via the USGS National Map, 1 m, four JPEGs, ~3-6 MB each)

Save them as `pelican_hill_naip_1.jpg` ... `pelican_hill_naip_4.jpg`:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=418315,3714641,421315,3717241&bboxSR=32611&imageSR=32611&size=3000,2600&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=421315,3714641,424316,3717241&bboxSR=32611&imageSR=32611&size=3001,2600&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=418315,3717241,421315,3719842&bboxSR=32611&imageSR=32611&size=3000,2601&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=421315,3717241,424316,3719842&bboxSR=32611&imageSR=32611&size=3001,2601&format=jpg&f=image
```

If these fail, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecards (needed: none were found)

No scorecard was read, because the search budget ran out. Please save, from the
resort's website (pelicanhill.com → Golf → each course → Scorecard), the
scorecard of each course as it downloads (PDF or image):

- `pelican_hill_ocean_south_card.pdf` (or `.jpg`): every tee, per hole, with
  the ratings and slopes if printed;
- `pelican_hill_ocean_north_card.pdf` (or `.jpg`).

If the site has none, a photo of each printed card works too. A follow-up
scouting pass can also look for them (see README.md).

## 6. Reference pictures (optional, look-only)

The resort's course map or hole-by-hole pictures for each course, if the site
has them: `pelican_hill_ocean_south_map.jpg`, `pelican_hill_ocean_north_map.jpg`.

## 7. Hand-off

1. On https://github.com/chuckb2000/Silver-Swing/releases, open the draft
   release `pelican_hill-data` if it exists. Otherwise click **Draft a new
   release** and use the tag `pelican_hill-data`.
2. Drop every file into **Attach binaries** (below the description box, which
   rejects files over 25 MB).
3. In the description, write the NOAA dataset's name, year and ID from step 3.
4. Click **Publish release**, not "Save draft".
