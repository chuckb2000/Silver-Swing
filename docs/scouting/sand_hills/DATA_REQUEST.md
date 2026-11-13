# Sand Hills Golf Club — data request (scouted 2026-10-24)

Course: Sand Hills Golf Club, Mullen, Hooker County, NE (Coore & Crenshaw,
1995; private). Course id `sand_hills`. UTM zone 14N (EPSG:32614). `state` NE.

Nothing here was checked: the sandbox can't reach Overpass or USGS. Each link
downloads one file; the browser may name them `exportImage.tif` / `.jpg`
(names don't matter). Upload every file as it downloads, without compressing
or converting it.

## The box (for every item)

WGS84: **south 41.84263, west -101.13763, north 41.89796, east -101.06359**
(UTM 14N x 322676-328677, y 4634509-4640510: 6,001 x 6,001 m), centred on
41.8703 N, 101.1006 W.

That centre is **not confirmed**: it is the map point of a listing (Stymie)
that gives the club's address as "Hwy 97 Mile Marker 55, Mullen" (the point
lies about 12 miles south of Mullen, near Highway 97), but the same page's
scorecard belongs to a different course. The box is big (6 x 6 km) to allow for a centre a kilometre
or two out and for a routing that spreads widely over the dunes. **Do step 0
before downloading anything.**

## 0. Check the course is inside the box (2 minutes)

Open https://overpass-turbo.eu, replace the text on the left with this and
click **Run**:

```
[out:json][timeout:60];
nwr["leisure"="golf_course"](41.70,-101.40,42.15,-100.80);
out tags bb;
```

The map shows every golf course around Mullen. Click **Data** (top right) and
find the one whose `"name"` is "Sand Hills Golf Club" (or the outline you know
is Sand Hills). Its `"bounds"` gives `minlat`, `minlon`, `maxlat`, `maxlon`.

- All four inside the box above (minlat ≥ 41.84263, maxlat ≤ 41.89796,
  minlon ≥ -101.13763, maxlon ≤ -101.06359): go on with step 1.
- Otherwise: stop, and send the four numbers (or, if OSM has no outline, the
  clubhouse's coordinates from any map). The links get remade for the right
  place; nothing else changes. (Dismal River Club, also south of Mullen, is a
  different club: don't confuse the two.)

## 1. OSM (Overpass Turbo) → `sand_hills_overpass.geojson` (about 1-3 MB)

Same site; replace the text with this, click **Run**, then **Export →
GeoJSON → download**:

```
[out:json][timeout:180][bbox:41.84263,-101.13763,41.89796,-101.06359];
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

## 2. Bare earth (USGS 3DEP, 1 m) → four files, about 36 MB each

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=322676,4634509,325676,4637509&bboxSR=32614&imageSR=32614&size=3000,3000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=325676,4634509,328677,4637509&bboxSR=32614&imageSR=32614&size=3001,3000&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=322676,4637509,325676,4640510&bboxSR=32614&imageSR=32614&size=3000,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=325676,4637509,328677,4640510&bboxSR=32614&imageSR=32614&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `sand_hills_dem_sw.tif`, `_se.tif`, `_nw.tif`, `_ne.tif` (in that
order). If a link shows an error page, change the last part `f=image` to
`f=json`, open it, and open the `href` link it shows.

Optional (it tells the course chat which lidar project and year these heights
come from, and whether 1 m lidar covers the site at all): open this link and
save the page as `sand_hills_tnm_1m.json`:

```
https://tnmaccess.nationalmap.gov/api/v1/products?bbox=-101.13763,41.84263,-101.06359,41.89796&datasets=Digital%20Elevation%20Model%20(DEM)%201%20meter&outputFormat=JSON
```

(The 1 m tiles covering the box would be `x32y464` and `x32y465`, zone 14;
the project name was not found during scouting.)

## 3. Canopy: not needed now

Sand Hills has almost no trees in play (grass-covered dunes). Like Chambers
Bay, the course can be built without a lidar point cloud (trees from OSM, if
any). If the photo later shows trees that matter, the course chat will ask for
a NOAA Data Access Viewer job then.

## 4. Orthophoto (USDA NAIP, 1 m, JPEG) → four files, about 3-6 MB each

Used to trace anything OSM lacks (greens, tees, the blowouts) and to tell sand
from grass.

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=322676,4634509,325676,4637509&bboxSR=32614&imageSR=32614&size=3000,3000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=325676,4634509,328677,4637509&bboxSR=32614&imageSR=32614&size=3001,3000&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=322676,4637509,325676,4640510&bboxSR=32614&imageSR=32614&size=3000,3001&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=325676,4637509,328677,4640510&bboxSR=32614&imageSR=32614&size=3001,3001&format=jpg&f=image
```

Save as `sand_hills_naip_sw.jpg`, `_se.jpg`, `_nw.jpg`, `_ne.jpg`. If these
fail, use USDA's own NAIP service: in each link replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard

Nothing to download: the only per-hole card found online (GolfPass) was read
(`scorecard_sources.md`). The club is private and posts no card. Optional and
valuable: a photo of the printed card (`sand_hills_card.jpg`) from anyone
who has played it; it settles hole 15 and the women's indexes.

## 6. Reference pictures (optional, look-only)

No course map was found during scouting. If you have or find a routing map or
yardage-book page, add it (look-only; it helps match holes to OSM).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release
`sand_hills-data` (if it isn't there: **Draft a new release**, tag
`sand_hills-data`), drop every file into **Attach binaries** (below the
description box, which rejects files over 25 MB), and click **Publish
release**.
