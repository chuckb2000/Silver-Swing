# Newport Country Club — data request (scouted 2026-10-24, partial)

Course: Newport Country Club, Harrison Avenue, Newport, Newport County, RI.
Course id `newport`. State `RI`. UTM zone 19N (EPSG:32619).

**Box for every download:** south 41.44455, west -71.37252, north 41.48144,
east -71.32348 (EPSG:32619 x 301916-305907, y 4590822-4594813, 4.0 x 4.0 km).
The course's position could not be looked up (README, "Scouting status"), so
the box is wide: it covers the whole south-west of Aquidneck Island, from Fort
Adams to Brenton Point and east past Lily Pond. Most of the extra is sea and
costs little.

Items 1-4 are ready now; they don't depend on the missing research. Open each
link in a browser; each one downloads one file. Browsers may name them
`exportImage.tiff` / `.jpg`: rename to the name given. If a link shows an error
page or text instead of downloading, copy that text into the release notes.

## 1. OSM layout (Overpass Turbo) → `newport_overpass.geojson` (about 5-15 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**:

```
[out:json][timeout:180][bbox:41.44455,-71.37252,41.48144,-71.32348];
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

Before exporting, check that the map shows a golf course outline named
"Newport Country Club" inside the box (if it is cut off at an edge, tell the
course chat).

## 2. Bare earth → `newport_3dep_dem.tif` (about 60 MB)

USGS 3DEP, 1 m (here the 2022 Rhode Island statewide lidar, the same survey
as Triggs and Wannamoisett):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=301916,4590822,305907,4594813&bboxSR=32619&imageSR=32619&size=3991,3991&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part to `f=json` and open the
`href` it returns. Fallback, the whole 10 km tile (a few hundred MB; name
follows the Triggs and Wannamoisett tiles, not checked from here):

https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/RI_Statewide_D22/TIFF/USGS_1M_19_x30y460_RI_Statewide_D22.tif

## 3. Lidar points for the trees and buildings (NOAA Data Access Viewer) → NOAA's zip

The 2022 USGS Rhode Island statewide lidar (flown late March 2022, leaf-off),
the route that worked for Triggs.

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9981/details/9981
2. Draw a rectangle around the golf course as the map shows it, plus about
   200 m on every side. It should fit inside: south 41.4491, west -71.3664,
   north 41.4769, east -71.3296 (draw that whole rectangle if the course is
   hard to see).
3. Add to cart, **Next**. Output: **Point**, **LAZ**, **all classes** (this
   survey has no vegetation class). Projection **UTM zone 19**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
4. Submit with your email; download the zip from the email (Triggs's came
   the same evening, about 300 MB for a 2 x 2 km rectangle).

## 4. Orthophoto → `newport_naip.jpg` (about 5 MB)

USDA NAIP, 1.0 m:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=301916,4590822,305907,4594813&bboxSR=32619&imageSR=32619&size=3991,3991&format=jpg&f=image
```

If it fails, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (still to find)

No source has been read yet (the research pass was cut short). The follow-up
scouting pass looks for a per-hole card (BlueGolf, GolfPass, the USGA's 2024
U.S. Senior Open hole yardages). Newport is private and may have no card
online: if you can get a photo of the printed card, save it as
`newport_scorecard.jpg`.

## 6. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release
`newport-data` (if there isn't one: **Draft a new release**, tag
`newport-data`), drop every file into **Attach binaries** (below the
description box, which rejects files over 25 MB), and click **Publish
release**.
