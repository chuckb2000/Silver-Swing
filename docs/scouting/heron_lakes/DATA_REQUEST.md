# Heron Lakes Golf Club (Great Blue and Greenback) — data request (2026-10-24)

Course: Heron Lakes Golf Club, 3500 N Victory Blvd, West Delta Park, North Portland, Multnomah County, OR: two 18-hole courses on one 341-acre site, Great Blue (to build first) and Greenback. Data folder `heron_lakes`, layouts `heron_lakes_great_blue` and `heron_lakes_greenback`. UTM zone 10N (EPSG:32610). `state` OR. Public (City of Portland; managed by KemperSports). One set of downloads covers both courses. Nothing has been downloaded yet; the sandbox can't reach Overpass, DOGAMI or the Oregon imagery service, so nothing here was checked.

## Box

- WGS84: south 45.58302, west -122.72960, north 45.61898, east -122.67837
- EPSG:32610: x 521094-525075, y 5047770-5051751 (3981 x 3981 m)
- Why this box: five sources put the clubhouse, range and Great Blue at 45.6018-45.6046 N, 122.6981-122.7051 W; the site lies between Smith Lake (west), Portland International Raceway (south-east, 45.5969, -122.6958), Force Lake (east) and the Columbia Slough (south). Every one of those points is at least 1.2 km inside the box, and the whole 341-acre property (about 1.2 km square) fits with 500 m or more to spare wherever it lies around them. It is just under 4,000 m, so each item below is one link.

Open each link in a browser; each downloads one file. The browser may name them `exportImage.N.tiff` / `.jpg`: rename them as given below (the names only help; each file is also identified by its contents). If a link shows an error page or JSON instead of downloading, copy its text into the release description.

## 1. OSM (Overpass Turbo) → `heron_lakes_overpass.geojson` (a few MB)

Open https://overpass-turbo.eu, replace the text on the left with this, click **Run**, then **Export → GeoJSON → download**.

```
[out:json][timeout:180][bbox:45.58302,-122.72960,45.61898,-122.67837];
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

**Check before going on:** the map after Run should show both golf courses (many ponds; the raceway's track to the south-east) well inside the box. If either course touches the edge of the box, stop here and say so in the release description: the box will be redrawn from the OSM outlines.

## 2. Bare earth (DOGAMI lidar DTM, 1 m) → `heron_lakes_dtm.tif` (~65 MB)

Most likely the OLC West Metro 3DEP lidar (flown May-August 2019), or OLC Metro 2014; the mosaic serves the newest project it has here. Values come out in feet. Optional: in the DOGAMI Lidar Data Viewer (linked from https://www.oregon.gov/dogami/lidar) turn on the project layer, click the courses, and write the project name and year in the release description.

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3981,3981&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 3. Canopy height (DOGAMI lidar CHM, 1 m) → `heron_lakes_chm.tif` (~65 MB)

Places the trees (height above ground per metre, same flight as the DTM).

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3981,3981&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

## 4. Orthophoto (Oregon Statewide Imagery Program 2024, about 1 m, JPEG) → `heron_lakes_ortho2024.jpg` (~5-10 MB)

Checks the lidar trees and the mapped bunkers and water against the course as it is now. JPEG because TIFF exports from this service failed at Langdon Farms; the box in the link places the picture.

```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=521094,5047770,525075,5051751&bboxSR=32610&imageSR=32610&size=3989,3989&format=jpg&f=image
```

## 5. Scorecards (please, if you can)

Third-party cards are in `scorecard_great_blue.csv` and `scorecard_greenback.csv`, but Great Blue has two current-looking cards online with different tee names (scorecard_sources.md), and the courses were re-rated in 2025. Save the club's own cards from https://portlandparksgolf.com/heron-lakes-course-info/ (or photos of the printed cards from the pro shop) as `heron_lakes_great_blue_card.pdf` / `.jpg` and `heron_lakes_greenback_card.pdf` / `.jpg`.

## 6. Course map and reference pictures (look-only, optional)

If the course site has a course map or hole pictures, save them as `heron_lakes_great_blue_map.jpg` / `heron_lakes_greenback_map.jpg` (look-only: routing and water check). Not needed if the OSM map shows both courses mapped hole by hole.

## 7. Hand-off

On https://github.com/chuckb2000/Silver-Swing/releases click **Draft a new release** with the tag `heron_lakes-data` (or open that release if it's already there), drop every file into **Attach binaries** (below the description box, which rejects files over 25 MB; the DTM and CHM are bigger, so they must go in Attach binaries), and click **Publish release** (not "Save draft": `make fetch` finds the release by its tag, and GitHub doesn't return drafts that way). Upload the files as they downloaded, without compressing them.
