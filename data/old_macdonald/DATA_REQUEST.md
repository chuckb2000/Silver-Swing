# Old Macdonald — data request (2026-10-21)

Course: Old Macdonald (Tom Doak and Jim Urbina, 2010), Bandon Dunes Golf Resort, Bandon, Coos County, OR.
Course id `old_macdonald`. UTM zone 10N (EPSG:32610). World (provisional) 1,280 x 1,792 m,
origin (386582, 4783827).

OSM maps 18 unnamed hole lines (pars match the card; their `handicap` tags are the women's stroke index), greens, pins, fairways and bunkers, inside the resort polygon `Bandon Dunes Golf Resort` (w362513477). Tee boxes only on holes 2-6 and 18.

## Shared downloads (GitHub release `pacific-dunes-data`)

Pacific Dunes, Old Macdonald and Sheep Ranch sit side by side on the bluff
north of Bandon Dunes and were built together (2026-10-21) from one set of
downloads. Each course's `release.json` names the release `pacific-dunes-data`
(one tag per release.json; no pipeline change was needed for the sharing).

The sandbox can't reach `gis.dogami.oregon.gov` downloads,
`imagery.oregonexplorer.info` or Overpass, so the developer downloads these in
a browser. File names don't matter (each is identified by its values and
size).

### 1-2. Elevation and canopy: DOGAMI lidar, 1 m, EPSG:32610, feet (~37 MB each)

Box x 385950-388150, y 4782850-4787050 (2,200 x 4,200 m; about lat
43.1898-43.2280, lon -124.4044 to -124.3765), covering all three worlds + at
least 150 m. At this spot both mosaics hold the OLC South Coast 2009 project
only: DOGAMI's 2020 South Coast project has no data here (catalog checked
2026-10-21), and the USGS OR_Western_D23 point cloud starts at about 43.223 N.

`f=image` returned "Error exporting image, Code: 500" for a file this size;
`f=json` works: open the link, then click the `href` (a .tif) on the JSON page
at once (the server deletes it after a while).

DTM (bare earth):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=385950,4782850,388150,4787050&bboxSR=32610&imageSR=32610&size=2200,4200&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

CHM (canopy height):
```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=385950,4782850,388150,4787050&bboxSR=32610&imageSR=32610&size=2200,4200&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
```

### 3-4. Orthophoto: Oregon Statewide Imagery Program 2024, 0.5 m, JPEG (two tiles)

Used for the gorse, to drop lidar trees that are gone, and to place the tees
OSM lacks (Old Macdonald, Sheep Ranch). JPEG because TIFF exports from this
service failed at Langdon Farms; the bbox in each link places the picture
(`make_ortho.py` stacks the two and cuts each course's world + 100 m).

South (y 4782960-4784960):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=386100,4782960,387980,4784960&bboxSR=32610&imageSR=32610&size=3760,4000&format=jpg&f=image
```

North (y 4784960-4786960):
```
https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=386100,4784960,387980,4786960&bboxSR=32610&imageSR=32610&size=3760,4000&format=jpg&f=image
```

### 5. OSM, all three courses (Overpass Turbo)

Open https://overpass-turbo.eu, replace the text on the left with this, click
Run, then Export -> GeoJSON -> download. `make_osm.py` writes each course's
`raw/overpass.geojson` from it (committed).

```
[out:json][timeout:180][bbox:43.1895,-124.4050,43.2285,-124.3760];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach)$"];
  nwr["landuse"~"^(grass|meadow|forest)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  nwr["amenity"="parking"];
);
out geom;
```

Before it arrived, `raw/overpass.geojson` was the merge of the developer's three
earlier exports (releases `old-macdonald-data` export.2.geojson, sha256
d36360903631efee019c02cb8b9b3e11bf1c57cd4e6017477eeae720eb4bb3b9;
`sheep-ranch-data` export.3.geojson, 8f40e21d325c87e71a89f0afbbfdcf87bfc2d806855a145c9cb69d0540785e39;
`pacific-dunes-data` export.4.geojson, 4b8cfbf3cf7ec492cac1bf1d35e00ccc2afbb00b16e1184f0a598bc55c2735f9).
Their boxes left a strip west of x 386461 between y 4784007 and 4784483
uncovered (the Pacific Dunes export stops short of holes 13-15).

### 6-7. Optional

6. The club's scorecard images from bandondunesgolf.com (as
   `Website-Bandon-Scorecard-2026.jpg` for Bandon Dunes).
7. The resort's course maps for Old Macdonald and Sheep Ranch (look-only;
   routing and tee checks).

## Received (GitHub release `pacific-dunes-data`, 2026-10-21)

| Asset | SHA-256 | Use |
|---|---|---|
| `export.5.geojson` (Overpass, item 5) | 658a52d3c7d79cf368a5b8860ac8be2bd60b77773081b4e716f4d6bcd8534f07 | `make_osm.py` -> `raw/overpass.geojson` (committed) |
| `_ags_5895eba5_2261_4029_9a2a_cf5121494bfb.tif` (DTM, item 1) | cc2b017ccaeee18e7ac93a2ed7b06eaa0cd228042d7ad8d217ccd3bdefaeb186 | `raw/dogami_dtm_ft.tif` (Sheep Ranch: sea filled by `fill_sea.py`) |
| `_ags_3c331496_959e_469c_8d52_987562653ff9.tif` (CHM, item 2) | d517eed9e7bd7b40b0086d20954421a1b52ceefbcc67782789c1e72138e61d82 | `raw/dogami_chm_ft.tif` |
| `exportImage.jpg` (photo, south tile, item 3) | 69ccd0c2c008db38b6a370df282de28a7f4f81e062bb88528c5a241e20a94744 | `raw/osip2024_south.jpg`, then `make_ortho.py` |
| north tile (item 4) | pending | sent in the chat as a PNG (3760 x 4000, used for the build); the original JPEG goes in the release, then `release.json`'s last entry gets its name and hash |
| `Pacific-Dunes-Scorecard_2020-scaled.jpg` | 48f99d27ce871559194fe0e1ed9ef7cdd733b481cbeb6d168acb310514c55f5b | Pacific Dunes `scorecard.csv` |
| `Old-MacDonald-Scorecard.webp` | c447df37c353bcd9fa9e75c330988e2cd0230550778715237394fc08022d27d0 | Old Macdonald `scorecard.csv` |
| `Sheep-Ranch-Scorecard_2022-scaled.webp` | 69f9fac50dc1f699d6cadbf0947bac5f41eb9e2ac5d3887d11465cc488a583e5 | Sheep Ranch `scorecard.csv` |
| `images.jpg` | 70d4a4834bcba8bf62f18d07de299cd1dceb980b381f75c0a550a06041a5cf70 | an older Sheep Ranch card (same yardages, ratings 72.1/122 and 70.2/119), not used |
| `PD_AerialMap.jpg`, `OldMacDonald_AerialMap.jpg`, `SheepRanchGC_AerialMap.jpg` | see release | look-only routing checks |
| `export.4.geojson`, `map.6.osm`; releases `old-macdonald-data` (`export.2.geojson`, `map.3.osm`) and `sheep-ranch-data` (`export.3.geojson`, `map.5.osm`) | see releases | the first per-course exports; replaced by `export.5.geojson` |
