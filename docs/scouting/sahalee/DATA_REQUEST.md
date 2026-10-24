# Sahalee Country Club — data request (scouted 2026-10-24)

Course: Sahalee Country Club, 21200 NE Sahalee Country Club Drive, Sammamish,
King County, WA (27 holes: South, North and East nines). Course id `sahalee`.
UTM zone 10N (EPSG:32610). `state` WA.

Nothing here was checked: the sandbox can't reach Overpass, USGS or the
Washington DNR. Each link downloads one file; the browser may name them
`exportImage.tif` / `.jpg` (names don't matter: the course chat identifies
each file by its contents). Upload every file as it downloads, without
compressing or converting it.

## The box (for every item)

WGS84: **south 47.61498, west -122.08290, north 47.65501, east -122.02907**
(UTM 10N x 568918-572909, y 5273964-5278365: 3,991 x 4,401 m). It is the
course's estimated extent (centre 47.635 N, 122.056 W, from Wikipedia and the
club's address; 27 holes on about 210 acres) plus at least 1 km on every side.

## 1. OSM (Overpass Turbo) → `sahalee_overpass.geojson` (about 5-10 MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click
**Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:47.61498,-122.08290,47.65501,-122.02907];
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

## 2. Bare earth (USGS 3DEP, 1 m) → two files, about 35 MB each

```
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=568918,5273964,572909,5276164&bboxSR=32610&imageSR=32610&size=3991,2200&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=568918,5276164,572909,5278365&bboxSR=32610&imageSR=32610&size=3991,2201&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `sahalee_dem_south.tif` and `sahalee_dem_north.tif`. If a link shows
an error page, change the last part `f=image` to `f=json`, open it, and open
the `href` link it shows.

Optional (it tells the course chat which lidar project these heights come
from): open this link and save the page as `sahalee_tnm_1m.json`:

```
https://tnmaccess.nationalmap.gov/api/v1/products?bbox=-122.08290,47.61498,-122.02907,47.65501&datasets=Digital%20Elevation%20Model%20(DEM)%201%20meter&outputFormat=JSON
```

(The 1 m tiles covering the box are `x56y528` and `x57y528`, zone 10; their
project name was not found during scouting.)

## 3. Canopy (places the trees: the course is lined by thousands of firs)

### 3a. Preferred: Washington DNR lidar portal, DSM + DTM rasters

The DNR portal publishes, per lidar project, a highest-hit surface model (DSM)
and a bare-earth model (DTM); tree height = DSM − DTM.

1. Open https://lidarportal.dnr.wa.gov
2. Zoom to Sammamish, east of Lake Sammamish (the course is the forested patch
   around 47.635 N, 122.056 W, inside the Sahalee neighbourhood).
3. Open the portal's download tool and draw a rectangle over the box above
   (bigger is fine, smaller is not).
4. It lists the lidar projects that cover the rectangle, with their years.
   **Pick the newest one**, and write its name and year in the release
   description. Tick **DSM** and **DTM** (both).
5. Download. Save as `sahalee_dnr_dsm.zip` and `sahalee_dnr_dtm.zip` (or as
   they come). If the portal offers only whole tiles, take every tile that
   touches the box. Expect GeoTIFFs in Washington State Plane North with
   heights in US feet; that's fine.

(These steps were written without being able to open the portal; if a step
doesn't match what you see, take the newest project's DSM and DTM for the box
any way the portal offers, or use 3b.)

### 3b. Alternative: NOAA Data Access Viewer, lidar points (clipped)

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/ and draw a
   rectangle over the box above.
2. In the list, pick the **newest** dataset that covers Sammamish (a King
   County or Puget Sound lidar). Note its id: the number at the end of its
   address (`.../details/<id>`).
3. Add it to the cart, open the cart, **Next**.
4. Output: **Point**, format **LAZ**, all classes. Projection **UTM zone 10**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link (earlier jobs took 30 min to
   a few hours). Save as `sahalee_noaa_lidar.zip`.

## 4. Orthophoto (USDA NAIP, 1 m, JPEG) → two files, about 3-6 MB each

Used to check the lidar trees against the course as it is now (the club cut
trees and rebuilt every bunker in fall 2022 – February 2023).

```
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=568918,5273964,572909,5276164&bboxSR=32610&imageSR=32610&size=3991,2200&format=jpg&f=image
https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=568918,5276164,572909,5278365&bboxSR=32610&imageSR=32610&size=3991,2201&format=jpg&f=image
```

Save as `sahalee_naip_south.jpg` and `sahalee_naip_north.jpg`. If these fail,
use USDA's own NAIP service: in each link replace
`https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer`
with `https://gis.apfo.usda.gov/arcgis/rest/services/NAIP/USDA_CONUS_PRIME/ImageServer`
and `format=jpg` with `format=tiff`.

## 5. Scorecard (nothing to download)

The club's own nine cards were read from its website
(`scorecard_sources.md`). Optional: if you can get a photo of the current
printed card (or the GHIN app's tee list for Sahalee), add it as
`sahalee_card.jpg`: it settles three typos on the website and whether a
re-measured card (Stymie) is the current one.

## 6. Reference pictures (optional, look-only)

None needed. The club's tour pages (https://www.sahalee.com/Golf/South_Course_Tour,
`North_Course_Tour`, `East_Course_Tour`) show a photo of every hole if the
course chat wants to check a tree or a pond.

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release
`sahalee-data` (if it isn't there: **Draft a new release**, tag
`sahalee-data`), drop every file into **Attach binaries** (below the
description box, which rejects files over 25 MB), write the DNR or NOAA
project name in the description, and click **Publish release**.
