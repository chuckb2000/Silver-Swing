# Portland Golf Club — data request (2026-10-24)

Course: Portland Golf Club, 5900 SW Scholls Ferry Rd, Raleigh Hills (Portland), Washington County, OR. Course id `portland_gc`. UTM zone 10N (EPSG:32610). `state` OR. Private. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked. The course chat checks every file on arrival.

## Box

- WGS84: south 45.46166, west -122.78025, north 45.48875, east -122.74174
- EPSG:32610: x 517180-520181, y 5034269-5037270 (3001 x 3001 m)
- Why this box: the course reaches about 820 m south, 370 m north and 300 m east of the clubhouse (45.47754, -122.76237; NRHP nomination), 48 ha in all. The box is 3 x 3 km around the course's centroid, so every side has 0.9-1.4 km to spare. It also takes in the north-east corner of RedTail's world.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `portland_gc_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:45.46166,-122.78025,45.48875,-122.74174];
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

Check: the map after Run should show the course (along SW Scholls Ferry Road, with Fanno Creek running through it) well inside the box. If the course outline touches the edge of the box, say so in the release description.

## 2. Bare earth (DOGAMI lidar DTM, 1 m)

Most likely the OLC West Metro 3DEP lidar (flown May-August 2019); the mosaic serves the newest project it has here. Values come out in feet. Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the course, and write the project name and year in the release description.

Save as `portland_gc_dtm.tif` (~36 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m)

Places the trees (height above ground per metre, same flight as the DTM).

Save as `portland_gc_chm.tif` (~36 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3001,3001&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, 0.752 m, JPEG)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

Save as `portland_gc_ortho2024.jpg` (~8 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=517180,5034269,520181,5037270&bboxSR=32610&imageSR=32610&size=3991,3991&format=jpg&f=image
```

## 5. Scorecard

Nothing to download: no card is on the club's website, and the third-party card used (GolfPass) is transcribed in `scorecard.csv`. Optional, and the most useful thing you could add: a photo of the club's printed scorecard (both sides) if you know a member, saved as `portland_gc_card_front.jpg` / `_back.jpg`. It would settle the card version, the ratings and hole 10's par (README, open questions 1-3).

## 6. Course map and reference pictures (look-only, optional)

- The club's hole-by-hole page (a short video of each hole): https://www.portlandgolfclub.com/hole-by-hole and https://www.portlandgolfclub.com/golf. Nothing to save (short Vimeo videos; useful to you for a look at each hole, not to the sandbox).
- The National Register nomination, with a site plan, a boundary map and photos of Junor Lake and the 11th: https://www.oregon.gov/oprd/OH/Documents/OR_WashingtonCo_PortlandGolfClubClubhouse.pdf. Optional: save it as `portland_gc_nrhp.pdf` (look-only; it helps place Junor Lake and the creek).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases click **Draft a new release** with the tag `portland_gc-data` (or open that release if it's already there), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
