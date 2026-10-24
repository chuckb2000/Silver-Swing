# Astoria Golf & Country Club — data request (2026-10-24)

Course: Astoria Golf & Country Club, Warrenton, Clatsop County, OR (on the Clatsop Plains, about 8 km north of Gearhart). Course id `astoria`. UTM zone 10N (EPSG:32610). `state` OR. Private. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked. **The course's position is the scout's estimate (no source could be read; README.md), so do step 1 first and look at the map before downloading anything else.**

## Box

- WGS84: south 46.07780, west -123.95834, north 46.13220, east -123.90569
- EPSG:32610: x 425970-429969, y 5103137-5109136 (3999 x 5999 m)
- Why this box: the centre (46.105, -123.932, west of US 101 by the Sunset Beach road) is an estimate, not a surveyed point. The box is 4 km east-west (from the beach to beyond US 101) and 6 km north-south (the dune ridges run north-south), so the course fits with room even if the estimate is 1.5 km out.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `astoria_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:46.07780,-123.95834,46.13221,-123.90569];
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

**Check before going on:** the map after Run should show the golf course (long, narrow fairways between north-south dune ridges) well inside the box, with the beach to the west. If the course is missing or touches the edge of the box, stop here and say so in the release description (or in a message): the box will be redrawn from the OSM outline.

## 2. Bare earth (DOGAMI lidar DTM, 1 m)

Almost certainly DOGAMI's OLC North Coast lidar (flown October 2008 - August 2009), the same flight as Gearhart's. Values come out in feet. Two pieces, because the box is taller than 4,000 m: `_1` is the southern half, `_2` the northern (the same for the canopy and the photo). Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the course, and write the project name and year in the release description.

Save as `astoria_dtm_1.tif` (~48 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `astoria_dtm_2.tif` (~48 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m)

Places the trees (height above ground per metre, same flight as the DTM).

Save as `astoria_chm_1.tif` (~48 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Save as `astoria_chm_2.tif` (~48 MB):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, 1.0 m, JPEG)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

Save as `astoria_ortho2024_1.jpg` (~6 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=425970,5103137,429969,5106136&bboxSR=32610&imageSR=32610&size=3999,2999&format=jpg&f=image
```

Save as `astoria_ortho2024_2.jpg` (~6 MB):

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=425970,5106136,429969,5109136&bboxSR=32610&imageSR=32610&size=3999,3000&format=jpg&f=image
```

## 5. Scorecard

Not collected (README.md). If you can, save the club's scorecard as `astoria_card.pdf` or `.jpg` (from the club's website, or a photo of the printed card, both sides). Otherwise the course chat looks for it at intake.

## 6. Course map and reference pictures (look-only, optional)

None collected. If the club's website has a course map or hole pictures, save them as `astoria_map.jpg` (look-only: routing and water check).

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases click **Draft a new release** with the tag `astoria-data` (or open that release if it's already there), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
