# Yale Golf Course: data

Everything the build uses came through the GitHub Actions fetch workflow (docs/COURSE_BUILD.md
5.0), request `data/yale/fetch.json`, release `data-yale`:

| File | What | Into |
|---|---|---|
| `yale_overpass.geojson` | the standard Overpass export (box 41.3101, -72.9948, 41.3288, -72.9763), 2026-10-31 | `raw/overpass.geojson` (git), `intake.py osm` |
| `yale_ct2023_dem.tif` | CT ECO `elevation/Statewide2023` ImageServer export, 1 m, EPSG:32618, NAVD88 ft (2023 statewide lidar, QL1) | `raw/ct2023_dem.tif` (git), `intake.py raster` |
| `USGS_LPC_CT_2023Statewide_C25_*.laz` | USGS 3DEP lidar point cloud, project CT_2023Statewide_C25 (the same 2023 flight), 8 tiles | clipped to the world by `intake.py laz` (release.json) |
| `yale_ct2023_leafoff_[sn].jpg` | CT ECO `images/Ortho_2023` (spring 2023 leaf-off, 0.4 m export) | look only (not a build input) |
| `yale_naip.jpg`, `yale_ctnaip2023_*.jpg` | NAIP (USGS service; CT ECO `images/NAIP_2023`, 0.3 m) | look only |

The release `yale-data` (the developer's, 2026-10-24) holds an older Overpass export (not used:
the fresh one is the same course data) and the screenshot of the course's 2026 yardage card
(`Screenshot.2026-10-24.140812.png`), the source of `scorecard.csv`.

## What the workflow can't get (optional; each improves the Championship tees)

Every open map, photo and lidar of the course predates the 2023-26 Hanse restoration (closed
September 2023, reopened 28 April 2026). The Long tees all match the 2026 card within 3 % but
hole 3 (+6 %). The Championship set is short on 1, 7, 9, 10 and 17 (and 6, 18 by about 5 %)
because the new back tees aren't in any open data. To place them (CLAUDE.md 5.1; your call on
Google's terms):

1. Google Earth Pro → View → Historical Imagery → the newest date (2025 or 2026).
2. For each of these spots, a screenshot with the new tee box in view: behind the clubhouse and
   parking lot for **1** (about 250 yd carry over Griest Pond), behind the old tees of **9**
   (above the pond), **10**, **17** (behind the old 17 tees, south-west of the pond in front of
   17), **7** (behind its tee, toward the 6th green), **6** (above the 5th green), and the
   **3rd green** (rebuilt as a double punchbowl; it may have moved).
3. In each screenshot, click four spots near the corners and note their latitude/longitude
   (shown at the bottom of the window) and the pixel position (or mark them in the image).
4. Save as `yale_google_<date>_<n>.png` with a text file of the points, and attach them to the
   release `data-yale` (Releases → data-yale → Edit → attach → Update release).

Also optional: the Army Corps public notice with the restoration plan sheets (the runner got
403 Forbidden from media.defense.gov):
https://media.defense.gov/2023/Jul/26/2003268324/-1/-1/1/NAE-2022-00115-PN.PDF : download it in
a browser and attach it to `data-yale` as `yale_usace_notice.pdf`.
