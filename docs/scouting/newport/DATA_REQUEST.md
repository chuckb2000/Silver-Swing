# Newport Country Club — data request (scouted 2026-10-24)

Course: Newport Country Club, 280 Harrison Avenue, Newport, Newport County,
RI. Course id `newport`. State `RI`. UTM zone 19N (EPSG:32619).

**Box for every download:** south 41.44827, west -71.36884, north 41.47611,
east -71.32717 (EPSG:32619 x 302208-305609, y 4591228-4594229, 3.4 x 3.0 km).
It is the course centre (41.4622, -71.3480: Wikipedia's 41.462, -71.347 and
OpenStreetMap's course point 41.46219, -71.34694, nudged 100 m west for the
seven holes west of Harrison Avenue) plus 1.7 km east-west and 1.5 km
north-south. The club's land comes to about 190 acres (0.8 km²: the
140-acre farm plus about 49 acres west of Harrison Avenue in 1921), roughly
1-1.5 km across, so the box leaves well over 500 m on every side. The south and west of the box are sea (Rhode Island
Sound), which costs little.

Open each link in a browser; each one downloads one file. Browsers may name
them `exportImage.tiff` / `.jpg`: rename to the name given. If a link shows an
error page or text instead of downloading, copy that text into the release
notes.

## 1. OSM layout (Overpass Turbo) → `newport_overpass.geojson` (about 3-10 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**:

```
[out:json][timeout:180][bbox:41.44827,-71.36884,41.47611,-71.32717];
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
"Newport Country Club" on both sides of Harrison Avenue, inside the box (if
it is cut off at an edge, tell the course chat).

## 2. Bare earth → `newport_3dep_dem.tif` (about 40 MB)

USGS 3DEP, 1 m (here the 2022 Rhode Island statewide lidar, the same survey
as Triggs and Wannamoisett):

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=302208,4591228,305609,4594229&bboxSR=32619&imageSR=32619&size=3401,3001&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part to `f=json` and open the
`href` it returns. Fallback, the whole 10 km tile (about 400 MB, like
Triggs's; the whole box is in this one tile; the name follows the Triggs
tile, not checked from here):

https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/RI_Statewide_D22/TIFF/USGS_1M_19_x30y460_RI_Statewide_D22.tif

## 3. Lidar points for the trees and buildings (NOAA Data Access Viewer) → NOAA's zip

The 2022 USGS Rhode Island statewide lidar (project `RI_Statewide_D22`, flown
late March 2022, leaf-off), NOAA dataset **9981**: the route that worked for
Triggs.

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9981/details/9981
2. Draw a rectangle around the golf course as the map shows it (both sides of
   Harrison Avenue, down to Ocean Drive), plus about 200 m on every side. It
   should fit inside: south 41.4520, west -71.3632, north 41.4724, east
   -71.3328 (draw that whole rectangle if the course is hard to see).
3. Add to cart, **Next**. Output: **Point**, **LAZ**, **all classes** (this
   survey has no vegetation class). Projection **UTM zone 19**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**. (Triggs's
   job came back in Rhode Island State Plane metres instead; the course chat
   reprojects it, so that's fine.)
4. Submit with your email; download the zip from the email (Triggs's came
   the same evening, about 300 MB for a 2 x 2 km rectangle; this one may be
   up to about 400 MB, less where it's sea).

## 4. Orthophoto → `newport_naip.jpg` (about 5 MB)

USDA NAIP (served here at 0.85 m):

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=302208,4591228,305609,4594229&bboxSR=32619&imageSR=32619&size=3992,3523&format=jpg&f=image
```

If it fails, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (optional, but it settles a conflict)

The scorecard comes from GolfPass (in `scorecard.csv`; nothing to download).
Two online cards disagree hole by hole (`scorecard_sources.md`), and the
club's own card is not online. If you can get a photo of the printed card
(the pro shop, or a member), save it as `newport_scorecard.jpg`. Optional:
the build goes ahead on the GolfPass card without it.

## 6. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release
`newport-data` (if there isn't one: **Draft a new release**, tag
`newport-data`), drop every file into **Attach binaries** (below the
description box, which rejects files over 25 MB), and click **Publish
release**.
