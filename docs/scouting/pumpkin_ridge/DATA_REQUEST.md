# Pumpkin Ridge Golf Club (Witch Hollow and Ghost Creek) — data request (2026-10-24)

Course: Pumpkin Ridge Golf Club, 12930 NW Old Pumpkin Ridge Rd, North Plains, Washington County, OR: two 18-hole courses on one site, Witch Hollow (private) and Ghost Creek (public). Data folder `pumpkin_ridge`, layouts `pumpkin_ridge_witch_hollow` and `pumpkin_ridge_ghost_creek`. UTM zone 10N (EPSG:32610). `state` OR. One set of downloads covers both courses. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked. The course chat checks every file on arrival.

## Box

- WGS84: south 45.59589, west -123.02760, north 45.63188, east -122.97629
- EPSG:32610: x 497849-501848, y 5049150-5053149 (3999 x 3999 m)
- Why this box: the club's 350 acres (1.42 km²) hold both courses, and the only position found is the club's point on Wikipedia (45.61389, -123.00194), not the outline. The box is 4 x 4 km around that point, so a property up to about 1.5 km from it in any direction still has 500 m to spare.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `pumpkin_ridge_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:45.59589,-123.02760,45.63189,-122.97629];
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

Check: the map after Run should show both courses (Witch Hollow and Ghost Creek) well inside the box. If either course touches the edge of the box, say so in the release description.

## 2. Bare earth (DOGAMI lidar DTM, 1 m)

Most likely the OLC West Metro 3DEP lidar (flown May-August 2019), or OLC Metro 2014; the mosaic serves the newest project it has here. Values come out in feet. Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the club, and write the project name and year in the release description.

Save as `pumpkin_ridge_dtm.tif` (~64 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=497849,5049150,501848,5053149&bboxSR=32610&imageSR=32610&size=3999,3999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m)

Places the trees (height above ground per metre, same flight as the DTM).

Save as `pumpkin_ridge_chm.tif` (~64 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=497849,5049150,501848,5053149&bboxSR=32610&imageSR=32610&size=3999,3999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

Save as `pumpkin_ridge_ortho2024.jpg` (~8 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=497849,5049150,501848,5053149&bboxSR=32610&imageSR=32610&size=3999,3999&format=jpg&f=image
```

## 5. Scorecard

Nothing required: both courses' cards (GolfPass) are transcribed in `scorecard_witch_hollow.csv` and `scorecard_ghost_creek.csv`. Optional: BlueGolf's pages are closed to the sandbox; if you open them, save each as PDF (browser Print → Save as PDF): Ghost Creek https://course.bluegolf.com/bluegolf/course/course/pumpkinridgeghostcre/detailedscorecard.htm → `pumpkin_ridge_ghost_creek_bluegolf.pdf`; Witch Hollow https://course.bluegolf.com/bluegolf/course/course/pumpkinridgewitchhol/index.htm (then its "Scorecard" tab) → `pumpkin_ridge_witch_hollow_bluegolf.pdf`. Also optional: the club's own scorecards from pumpkinridge.com if it shows them (save as `pumpkin_ridge_<course>_card.pdf` or `.jpg`).

## 6. Course map and reference pictures (look-only, optional)

None found online beyond the scorecards. If pumpkinridge.com has a course map or hole-by-hole pictures for either course, save them as `pumpkin_ridge_<course>_map.jpg` (look-only: routing and water check).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases open the draft release `pumpkin_ridge-data` (it will exist; otherwise **Draft a new release**, tag `pumpkin_ridge-data`), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
