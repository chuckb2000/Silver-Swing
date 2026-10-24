# Yale Golf Course — data request (scouted 2026-10-24)

Course: Yale Golf Course ("The Course at Yale"), 200 Conrad Drive, New Haven
(Upper Westville), New Haven County, CT. Course id `yale`. State `CT`. UTM zone
18N (EPSG:32618).

**Box for every download** (the course's estimated extent plus a wide margin;
the course chat cuts the real world from the OSM boundary later):
south 41.30422, west -73.00178, north 41.33739, east -72.95778
(EPSG:32618 x 667281-670882, y 4574539-4578140, 3.6 x 3.6 km).

Every public map, lidar and photo of the course predates the 2024-25
restoration (closed September 2023, reopened 28 April 2026). That is fine for
the ground and the woods around the holes; item 6 is how the restored greens,
bunkers and cleared corridors get checked.

Open each link in a browser; each one downloads one file. Browsers may name
them `exportImage.tiff` / `.jpg`: rename to the name given. If a link shows an
error page or text instead of downloading, copy that text into the release
notes.

## 1. OSM layout (Overpass Turbo) → `yale_overpass.geojson` (about 5-15 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**:

```
[out:json][timeout:180][bbox:41.30422,-73.00178,41.33739,-72.95778];
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

## 2. Bare earth (two files, about 50 MB each)

**2a. USGS 3DEP, 1 m → `yale_3dep_dem.tif`**

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3601,3601&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

If it shows an error page, change the last part to `f=json` and open the
`href` it returns.

**2b. Connecticut 2023 lidar DEM (CT ECO, spring 2023, newer and denser) →
`yale_ct2023_dem.tif`**

```
https://cteco.uconn.edu/ctraster/rest/services/elevation/Statewide2023/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3601,3601&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Heights from 2b may be in feet; the course chat checks. If 2b fails, 2a is
enough. If 2a fails too: https://apps.nationalmap.gov/downloader → Elevation
Products (3DEP) → tick "1 meter DEM" → draw the box above → Search Products →
download the tiles named `USGS_1M_18_x66y458_...` and `USGS_1M_18_x67y458_...`
(the project part of the name was not confirmed from here; take the newest).

## 3. Lidar points for the trees (NOAA Data Access Viewer, clipped) → NOAA's zip

The 2023 Connecticut statewide lidar (flown 22 March - 7 May 2023, leaf-off,
QL1, with vegetation classes).

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=10296/details/10296
   ("2023 CT GIS Lidar: Connecticut Statewide").
2. Draw a rectangle around the golf course as the map shows it, plus about
   200 m on every side. It should fit inside: south 41.3088, west -72.9957,
   north 41.3328, east -72.9639 (2.6 x 2.6 km; draw that whole rectangle if
   the course is hard to see).
3. Add the dataset to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**. Classes, if offered: **2 Ground**,
   **4 Medium Vegetation**, **5 High Vegetation** (otherwise all). Projection
   **UTM zone 18**, **NAD83(2011)**, **meters**; vertical **NAVD88**,
   **meters**.
5. Submit with your email; NOAA emails a zip link (under an hour for
   Franklin and Triggs). Expect 0.5-1 GB (dense lidar over woods).

## 4. Orthophoto → `yale_naip.jpg` (about 5 MB)

USDA NAIP, 0.9 m:

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3988,3988&format=jpg&f=image
```

If it fails, replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

**Optional, `yale_ct2023_leafoff.jpg` (about 5 MB):** Connecticut's spring 2023
leaf-off photo (3-inch original, here at 0.9 m). Conifers are the only green
trees in it, which helps sort the tree types.

```
https://cteco.uconn.edu/ctraster/rest/services/images/Ortho_2023/ImageServer/exportImage?bbox=667281,4574539,670882,4578140&bboxSR=32618&imageSR=32618&size=3988,3988&format=jpg&f=image
```

## 5. Scorecard

Nothing to download: no club card is online; `scorecard.csv` is from GolfPass
and 18Birdies (see `scorecard_sources.md`). Optional: a photo of the new
printed card from the pro shop would settle the front-nine stroke index.

## 6. The restored course (optional, but it decides how close the build is)

Every item above shows the course before the 2024-25 restoration: greens
were enlarged, the 3rd green rebuilt (perhaps not in the same place), double
fairways restored on 3 and 18, new back tees on 1, 6, 10 and 17, bunkers
rebuilt, and 1,000-1,500 trees cut. If you are willing (CLAUDE.md 5.1, your
call on Google/Bing terms): Google Earth Pro → View → Historical Imagery →
the newest date (2025 or 2026) → screenshots of the course, each with at least
four points whose lat/lon you note (click a spot, read the coordinates at the
bottom), or the whole course in one shot with the four corners noted. Save
as `yale_google_<date>_<n>.png`.

## 7. Reference pictures (look-only, optional)

- `yale_usace_notice.pdf`: the Army Corps of Engineers public notice for the
  restoration permit (2023), with an overall plan of all 18 holes at
  1" = 250' (sheet C010) and the pond names (A, B, C):
  https://media.defense.gov/2023/Jul/26/2003268324/-1/-1/1/NAE-2022-00115-PN.PDF
- `yale_1925_map.jpg`: Raynor-era plan of the two proposed courses:
  https://webspace.yale.edu/Yale-golf-history/maps/0262.jpg

## 8. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release
`yale-data` (if there isn't one: **Draft a new release**, tag `yale-data`),
drop every file into **Attach binaries** (below the description box, which
rejects files over 25 MB), and click **Publish release**.
