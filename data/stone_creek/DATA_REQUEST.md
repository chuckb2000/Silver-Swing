# Stone Creek Golf Club — data request (2026-10-19)

Course: Stone Creek Golf Club, 14603 S Stoneridge Dr, Oregon City, Clackamas County, OR.
Course id `stone_creek` (logo already exists for this id). UTM zone 10N (EPSG:32610),
same as Oswego Lake, Tualatin and Oregon Golf Club.

## Already in hand (GitHub release `stone-creek-data`)

| File | SHA-256 | Use |
|---|---|---|
| `Stone.Creek.geojson` (Overpass Turbo export, 2026-10-19 02:44 UTC) | 44f2a492e43d08df763b6aecf0debc2fd061fb083a9b0daac4ea64f8b65b881b | copied to `raw/overpass.geojson`; the layout source |
| `Stone.Creek.gpkg` | 9d592dd24adb6403ce2a0f2cdfe6d2c01dd6ca20d0351453530a6096ce277628 | not used (GDAL's OSM driver drops closed tee ways; COURSE_LESSONS.md 2) |
| `Screenshot.2026-10-18.232154.png` (club scorecard) | eb47673f1203d72b5294f6ae66bf74450959d599168bab0adf6568c27cc3b931 | `scorecard.csv`, `scorecard_full.csv`; copy in `reference/stone_creek/scorecard.png` |

### Scorecard check

Par 72 (36/36). Tee sets: Jacobsen 6,840 (73.8/140), Blue 6,456 (71.7/135),
White 5,925 (69.1/127), Gold 5,123 (70.3/121). Every tee set's holes add up to the
printed Out, In and Total. Men's and ladies' handicap rows each use 1-18 once.
Hole 16 is 144 yd from both Jacobsen and Blue (printed that way; one shared box is
plausible on a par 3).

### OSM coverage (before s03)

- Boundary: `way/188382554` "Stone Creek Golf Club", 62.0 ha, 1,011 x 967 m.
- 18 `golf=hole` lines; ref, par and handicap match the card on every hole. Every
  line ends on a green and every hole's green has a `golf=pin`.
- The line starts measure within 2 % of the Jacobsen (back) card yardage on 16
  holes; holes 15 (-4.8 %) and 16 (-4.4 %) are a little short.
- 66 tee boxes (2-9 near each line start; none tagged with a colour), 20 fairways,
  21 greens, 44 bunkers, 30 rough polygons, 16 cart-path lines, 3 water hazards
  (all `golf=water_hazard`, i.e. yellow), 1 wetland (reed bed, across the north
  boundary), Beaver Creek (outside the boundary, north), 1 wood (outside),
  314 buildings, roads.
- Preliminary tee check (tee box centre to first bend, then the line): the Blue set
  has a box within 3 % on 15 holes; holes 2 (-3.4 %) and 13 (+3.1 %) are flags and
  hole 6 is +8.4 % from the nearest box centre (161 yd vs 149; that box is 317 m2,
  so a virtual tee inside it may reach the card). s06 does the real assignment.
- 3 greens not on a hole (`P1-P3` in `proposed/osm_labelled.png`): P1 (332 m2) north
  of the 14th tee, P2 (136 m2) and P3 (1,058 m2) by the 1st/10th tees. Next to P2 a
  large fairway-tagged rectangle. **No `golf=driving_range` polygon.**

## World

1,280 x 1,280 m (x0 533124, y0 5015660, EPSG:32610): the boundary box plus
134-157 m of scenery per side, whole 256 m chunks. Within the 2,048 m limit.

## Requested

### 1. Elevation and canopy (DOGAMI, two files)

The sandbox can't reach `gis.dogami.oregon.gov`. Open each link in a browser; each
returns a 1 m GeoTIFF of about 8-9 MB. Same services and settings as Oswego Lake,
Tualatin and Oregon Golf Club.

Box: EPSG:32610, x 533024-534504, y 5015560-5017040 (the world plus 100 m), 1 m
pixels, 1480 x 1480. In WGS84 about lon -122.5788 to -122.5599, lat 45.2928 to 45.3060.

Bare earth (save as `dogami_dtm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=533024,5015560,534504,5017040&bboxSR=32610&imageSR=32610&size=1480,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

Canopy height (save as `dogami_chm_ft.tif`):

```
https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=533024,5015560,534504,5017040&bboxSR=32610&imageSR=32610&size=1480,1480&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=image
```

If the browser shows a JSON error instead of downloading, send the error text.
Upload both files to the release `stone-creek-data` (or a new release `data-stone_creek`).

### 2. Facts about the course

- Penalty colour of W1 (between holes 3 and 4), W2 (in front of the 6th green),
  W3 (by the 17th green and the 15th/18th tees) and the wetland WL north of 12/13
  (partly outside the boundary). OSM tags the three ponds yellow.
- Driving range: where it is (not mapped in OSM), and what P1-P3 and the
  fairway-tagged rectangle by P2 are (putting / chipping greens?).
- Internal out of bounds, if any (the houses along the west, south and east edges).
- Which tee set to build. Recommendation: Blue (6,456 yd, closest to 6,300 among the
  sets; the card's rating 71.7/135).
