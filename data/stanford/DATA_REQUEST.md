# Stanford Golf Course — data request (2026-10-24)

Course: Stanford University Golf Course, 91 Links Road, Stanford, Santa Clara County, CA.
Course id `stanford`. State `CA`. UTM zone 10N (EPSG:32610).
George C. Thomas Jr. and William P. Bell, opened 1 January 1930; renovated by John
Harbottle (2008); every bunker rebuilt and some holes changed (2018)
(stanfordgolfcourse.com/about-us, stanfordmag.org "Green Acres").

World: x0 571321, y0 4141180 (EPSG:32610), 1,536 x 2,048 m.
WGS84 box for downloads (world + 150 m): south 37.41319, west -122.19574, north 37.43450, east -122.17477.

## Already in hand (release `stanford-data`, published 2026-10-24)

| Asset | Bytes | SHA-256 | What it is |
|---|---|---|---|
| `export.5.geojson` | 16,914,238 | 866792342aba770bec6de57a43b980a6d311beefb307a21ab024b1784025dfca | Overpass Turbo GeoJSON, 2026-10-24 13:40 UTC, 13,367 features, `@id` + `@relations` only. The layout source (`raw/overpass.geojson`, clipped) |
| `map.6.osm` | 11,648,963 | 33c91386c872d76acbe41fb2b1148b02680d76f4d5a25b15d497b94bc51b8500 | openstreetmap.org export, bounds 37.41315,-122.20007 to 37.43255,-122.17423. Not used (the Overpass file covers the world) |
| `2020SC1.jpg` | 499,239 | 7a8ab4696b9680b3dc01652c8d328c79d717d9877afc86bf536a1bdfb42cc704 | the club's printed scorecard, inside (Golf ScoreCards Inc., 10/2019). The card source |
| `2020SC2.jpg` | 566,936 | 0e5306bae5f5c24257d4862606ccbc201022c8cf3c4c3e1f1adc65c09ae47a59 | the card's outside: rules, routing map, aerial photo, the club's logo (not used in the game) |
| `9474.jpg` | 172,002 | 41655e965d6282c9be9d4c8132e077c6ba0fb1af1a47035cad23b844d42b18de | photo: green with a front-left bunker, oaks, orange-staked creek bank in front |
| `9475.jpg` | 159,276 | 536d80c96cbcdf03fc1393fcf8b3f788e3b2f5e313137f5dd540574b539e56de | photo: green with a red/white flower bed, golden oak-dotted hills behind |
| `images.jpg` | 41,803 | 3576ce69b912f88acad2dfd5e04759fea5babe2b23f0544041d1199c1932824e | photo: fairway with a large oak, bunkers short of a green |
| `img_0241.jpg` | 1,130,603 | 511e9bc5deedc2a5de34f198c7d3b1bba6df952a764fe81832e5cf20a097a5c5 | photo (2016): open fairway with scattered oaks, eucalyptus and pines behind |

Photos are art reference only; nothing is traced from them.

### OSM audit (2026-10-24)

- Boundary: relation 3570691 "Stanford University Golf Course", a multipolygon of **3 parts**, no inner rings, 75.8 ha, bbox 1,198 x 1,674 m.
  - main part 67.9 ha (holes 2 green - 18);
  - a 3.5 ha strip with hole 1's green and hole 2's tee, 27 m from the main part across Fremont Road;
  - a 4.4 ha part 98 m east: the driving range (out of bounds anyway).
- 18 `golf=hole` lines with ref, par, handicap; pars add to 70 and match the card. Every line ends on a green; no double greens. 18 `golf=pin`.
- The lines start on the Cardinal (back) tees: total 6,672 yd vs Cardinal 6,742 (-1.0 %); every hole within 3 % of Cardinal except 5 (-6.9 %, the line starts on a box between Cardinal and Black) and 9 (-4.3 %).
- 59 tee boxes. A Black box within 3 % of the card on every hole (hole 15: inside the long Cardinal box, which spans 350-375 yd).
- 29 greens: 18 hole greens and 11 others inside the boundary (practice and short-game greens, 12-330 m from the hole lines; wrong greens in the game) plus one 37 m2 green outside.
- 67 bunkers, 21 fairways, 15 rough, 48 cart paths, driving range.
- Water: **no water polygon or hazard inside the boundary.** San Francisquito Creek is mapped only as a line (1,097 m inside the boundary), plus ~400 m of intermittent ditches (mostly culverts). Lake Lagunita lies 39 m outside (out of bounds, not near play). The Hetch Hetchy Aqueduct line across the south is a buried pipeline (not water; the pipeline ignores waterway lines).
- Roads inside the boundary: Junipero Serra Boulevard (primary, 2-4 lanes, ~520 m; hole 1's tee shot crosses it at 75 yd), Fremont Road (hole 2 crosses it at 29 yd, mostly in the gap between parts), Rural Lane and Vista Lane (service).
- Enclosure: one Cardinal tee (way 798608794, hole 8/13) is 128 m2 outside the boundary; the other features are inside (0-8 m2 slivers).

## Requested

### 1. Bare-earth elevation (USGS 3DEP, 1 m, float32 GeoTIFF, about 16 MB)

Open this link; it downloads `exportImage.tiff`:

https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox=571221,4141080,572957,4143328&bboxSR=26910&imageSR=26910&size=1736,2248&format=tiff&pixelType=F32&noData=-9999&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&f=image

(world + 100 m in NAD83 / UTM 10N, 1 m pixels.) If it shows an error page, change the
last part to `f=json`, open that, and open the link it returns (`href`). Upload the
file as it downloads, without compressing it.

### 2. Lidar points for the trees (NOAA Data Access Viewer, clipped)

Product: **2020 Lidar: Santa Clara County, CA** (NOAA dataset 9329; flown 3-22 April
2020; classes include 2 ground, 3-5 vegetation, 6 building; about 22 points/m2).

1. Open https://coast.noaa.gov/dataviewer/#/lidar/search/where:ID=9329/details/9329
2. Draw a rectangle over the box: south 37.4132, west -122.1958, north 37.4345, east -122.1747.
3. Add to cart, open the cart, Next.
4. Output: **Point**, format **LAZ**, all classes. Projection **UTM zone 10**,
   **NAD83(2011)**, **meters**; vertical **NAVD88**, **meters**.
5. Submit with your email; NOAA emails a zip link.

Coverage check: the creek is the Santa Clara / San Mateo county line, and holes 3, 4,
13, 14 and 16 lie partly on the San Mateo side. Before submitting, look at the
dataset's footprint on the viewer's map: if it stops at the creek, also add to the
cart whichever other dataset the viewer lists for the box that covers the San Mateo
side (2017 or later), with the same output settings.

### 3. Open imagery for checking trees, greens and the creek (USDA NAIP, JPEG, about 3 MB)

https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=571221,4141080,572957,4143328&bboxSR=32610&imageSR=32610&size=2893,3747&format=jpg&f=image

(0.6 m pixels; if it errors, try `f=json` as above.)

### 4. Hand-off

Open https://github.com/chuckb2000/Silver-Swing/releases/tag/stanford-data, click the
pencil (Edit), drop the files into the "Attach binaries" box **below** the description,
and click **Update release**.

## Status

- 2026-10-24: OSM, scorecard and photos in hand; DEM, lidar and NAIP requested.
