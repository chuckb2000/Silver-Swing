# Astoria Golf & Country Club — data request (2026-10-24)

Course: Astoria Golf & Country Club, 33445 Sunset Beach Lane, Warrenton (postal Gearhart), Clatsop County, OR, on the Clatsop Plains about 8 km north of Gearhart. Course id `astoria`. UTM zone 10N (EPSG:32610). `state` OR. Private. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked.

## Box

- WGS84: south 46.08409, west -123.94082, north 46.12032, east -123.90140
- EPSG:32610: x 427308-430309, y 5103820-5107811 (3001 x 3991 m)
- Why this box: two course listings put the club at 46.1020, -123.9206 and 46.1024, -123.9215 (80 m apart). The course lies between Sunset Lake (its west side; the lake runs north-south about 800 m west of US 101) and US 101 (east), with its holes running north-south in the dune valleys. The box is that point plus 1.5 km east and west (the lake and the highway with about 1 km to spare) and 2 km north and south (the long way of the course), so the course fits with at least 500 m around it even if it runs 1.5 km from the clubhouse. Each download is now one file.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `astoria_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:46.08409,-123.94082,46.12032,-123.90140];
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

**Check before going on:** the map after Run should show the golf course (long, narrow fairways running north-south between dune ridges, Sunset Lake along its west side, US 101 along its east side) well inside the box. If the course is missing or touches the edge of the box, stop here and say so in the release description (or in a message): the box will be redrawn from the OSM outline.

## 2. Bare earth (DOGAMI lidar DTM, 1 m) → `astoria_dtm.tif` (~48 MB)

Almost certainly DOGAMI's OLC North Coast lidar (flown October 2008 - August 2009), the same flight as Gearhart's. Values come out in feet. Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the course, and write the project name and year in the release description.

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m) → `astoria_chm.tif` (~48 MB)

Places the trees (height above ground per metre, same flight as the DTM).

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG) → `astoria_ortho2024.jpg` (~5 MB)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=427308,5103820,430309,5107811&bboxSR=32610&imageSR=32610&size=3001,3991&format=jpg&f=image
```

## 5. Scorecard (optional)

The card in `scorecard.csv` comes from Stymie and GolfPass; the club's own card couldn't be opened from the sandbox. If you can, save it from https://www.astoriagolf.com/ (members' site; a course or scorecard page) or photograph the printed card (both sides) as `astoria_card.pdf` / `.jpg`. It settles the stroke index on holes 1, 5 and 7 and the par of each hole from each tee (`scorecard_sources.md`).

## 6. Course map and reference pictures (look-only, optional)

None found online. If the club's website has a course map or hole pictures, save them as `astoria_map.jpg` (look-only: routing, the water on 5 and the marsh on 9).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases click **Draft a new release** with the tag `astoria-data` (or open that release if it's already there), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
