# The Reserve Vineyards & Golf Club — data request

Course: The Reserve Vineyards & Golf Club, 4805 SW 229th Ave, Aloha, Washington County, OR
(the club's site also gives 4805 SE Century Blvd, Hillsboro): two 18-hole courses on one
property, North (Bob Cupp, 1998) and South (John Fought, 1997). Data folder `reserve`, layouts
`reserve_north` and `reserve_south`. UTM zone 10N (EPSG:32610). Clubhouse at about 45.485 N,
122.918 W (Wikipedia), i.e. x 506408, y 5036833.

## 2026-11-12: the fetch workflow did not start

`data/reserve/fetch.json` was pushed on `course/reserve` (commit 7d052b9). GitHub started run
43365372557 and failed it within 3 seconds without running a step. Its annotation:
"The job was not started because recent account payments have failed or your spending limit
needs to be increased. Please check the 'Billing & plans' section in your settings."
The sandbox can't reach Overpass, DOGAMI or the Oregon imagery service directly (checked:
the proxy refuses gis.dogami.oregon.gov).

### Option A (recommended): fix the GitHub billing, then the workflow fetches everything

1. On github.com, click your picture (top right) > Settings > Billing and licensing
   (older menus: Billing and plans).
2. Under Payment information, fix the failed payment method; or under Budgets and alerts
   (Spending limits), raise the Actions budget above $0.
3. Tell the course chat. It re-runs the job (or pushes the request again); nothing else to do.

### Option B: download by hand and upload to a release

Only if A isn't possible. About 15 minutes.

1. **OSM export.** Open https://overpass-turbo.eu, paste the query from docs/COURSE_BUILD.md
   5.1 with `{{bbox}}` replaced by `45.462,-122.948,45.500,-122.888`, press Run, then
   Export > GeoJSON > download.
2. **DOGAMI bare earth and canopy height.** Open each link; the page shows a short text with an
   `href`; open that `href` and save the .tif.
   - DTM: https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/DIGITAL_TERRAIN_MODEL_MOSAIC/ImageServer/exportImage?bbox=504900,5035300,507900,5038300&bboxSR=32610&imageSR=32610&size=3000,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
   - CHM: https://gis.dogami.oregon.gov/arcgis/rest/services/lidar/CANOPY_HEIGHT_MODEL_MOSAIC/ImageServer/exportImage?bbox=504900,5035300,507900,5038300&bboxSR=32610&imageSR=32610&size=3000,3000&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_BilinearInterpolation&f=json
3. **Photo (OSIP 2024, 0.5 m), four quarters.** Open each link and save the JPEG with the name
   given:
   - osip2024_sw.jpg: https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=504900,5035300,506400,5036800&bboxSR=32610&imageSR=32610&size=3000,3000&format=jpg&f=image
   - osip2024_se.jpg: https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=506400,5035300,507900,5036800&bboxSR=32610&imageSR=32610&size=3000,3000&format=jpg&f=image
   - osip2024_nw.jpg: https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=504900,5036800,506400,5038300&bboxSR=32610&imageSR=32610&size=3000,3000&format=jpg&f=image
   - osip2024_ne.jpg: https://imagery.oregonexplorer.info/arcgis/rest/services/OSIP_2024/OSIP_2024_WM/ImageServer/exportImage?bbox=506400,5036800,507900,5038300&bboxSR=32610&imageSR=32610&size=3000,3000&format=jpg&f=image
4. **Upload.** On github.com/chuckb2000/Silver-Swing > Releases > Draft a new release; tag
   `data-reserve` (create it on publish), title `data-reserve`; drag in the seven files;
   Publish (not a draft: `make fetch` can't see drafts).

## What arrived

The developer made the repository public (2026-11-12, 23:31); the re-run fetched everything
except as noted (release `data-reserve`):

- Overpass export; the 3DEP 1 m DEM OR_PortlandMetro_B24 (tile x50y504, 384 MB, clipped into
  raw/); the OSIP 2024 photo in four 0.5 m quarters.
- DOGAMI DTM/CHM at 3000 x 3000: HTTP 500. The canopy model in two halves of the world + 100 m
  (1992 x 1124 each) worked; its catalog says OLC_METRO_2014.
- 3DEP point cloud OR_PortlandMetro_B24 (12 tiles): rockyweb.usgs.gov sent one 47 MB tile in
  about 50 minutes; the same names on the USGS S3 bucket (prd-tnm) are 404. Not used; the
  trees come from the DOGAMI canopy model checked against the 2024 photo.
