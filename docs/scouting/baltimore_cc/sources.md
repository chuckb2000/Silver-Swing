# Baltimore Country Club — sources (read 2026-10-24)

| Source | What it gave |
|---|---|
| https://en.wikipedia.org/wiki/Baltimore_Country_Club | founded 13 Jan 1898; Five Farms land bought in the 1920s; East (Tillinghast) opened Sept 1926, par 70, 7,181 yd; Keith Foster restoration 2015 (trees removed, bunkers realigned, greens upgraded, fairways regrassed); West opened 1962, redesigned 1990 by Bob Cupp and Tom Kite, par 72, 6,795 yd; championships (1899 U.S. Open at Roland Park; 1928 PGA, 1932 U.S. Amateur, 1965 Walker Cup, 1988 U.S. Women's Open, 2007-2009 Senior Players, 2017-2018 Big Ten, 2026 U.S. Senior Amateur, 2031 U.S. Women's Amateur); clubhouse renovated 2021-2022. No coordinates on the page |
| https://bcc1898.com/golf (club) | address 11500 Mays Chapel Road, Lutherville, MD 21093; East par 70, 96 bunkers, back-to-front greens, "limited water hazards", Foster restoration completed 2015 "to Tillinghast's original 1924 design"; West 1990 Cupp/Kite, renovated 2012 by Foster; 2026 U.S. Senior Amateur won by Mike Sposa |
| https://www.golfpass.com/travel-advisor/courses/14965-baltimore-country-club-east-course/scorecard-and-layout | East card: per-hole rows I-V (+ combos), par, men's and women's SI, tee table with ratings/slopes (see scorecard_sources.md) |
| https://courses.opengolfapi.org/courses/MD/baltimore-country-club | OSM-derived listing "Mays Chapel, MD", coords 39.4434648, -76.6623015 (OSM course centroid), 18 holes; same card as GolfPass (not independent) |
| https://championships.usga.org/ussenioramateur/2026/articles/fast-facts-2026-us-senior-amateur.html | 2026 U.S. Senior Amateur, 29 Aug-3 Sep 2026, East Course, 6,564 yd par 70 (per hole); Foster 2015; past events with winners |
| https://golfdigest.com/story/baltimore-country-club-east | hilly, open site; pond beside the 10th green (only water named); 13th green in a grove of trees; Foster tree removal, greens rebuilt, Tillinghast bunkering; renovation also credited to Brian M. Silva; further Foster work "scheduled" for 2027 (reviews); 7,002 yd, slope 141; Golf Digest Second 100 #112 (2025-26), Maryland #2 |
| https://www.top100golfcourses.com/golf-course/baltimore-east | parkland, opened 1926, Tillinghast + Keith Foster; little else |
| `docs/scouting/tools/make_links.py` | the box and the 3DEP / NAIP links (`links_generated.md`, `box.json`) |
| `docs/COURSE_BUILD.md` 4.1, `assets-src/palettes/anacostia.json`, `seekonk.json` | defaults, theme notes (first pass) |
| https://www.amateurgolf.com/golf-tournament-news/2026-us-senior-amateur-at-baltimore-cc-preview-how-to-watch-the-field-course-and-full-coverage-hub-1d819e | 2026 U.S. Senior Amateur setup 6,564 yd par 70, Course/Slope 72.9/137 (per-hole same as the USGA fast facts); hole 2 the hardest; par 5s 6 and 14 |
| https://www.fisheries.noaa.gov/inport/item/51983 | 2014 Baltimore County Lidar: flown 6-7 May 2014 (ACA; Dewberry), 0.7 m NPS (~2.2 pts/m²), NAVD88; **NOAA DAV ID 8492**; bulk LAZ https://noaa-nos-coastal-lidar-pds.s3.amazonaws.com/laz/geoid18/8492/index.html |
| https://www.fisheries.noaa.gov/inport/item/79659 | **2024 USGS Lidar DEM: Maryland 4 County** (Baltimore, Baltimore City, Carroll, Garrett, St. Mary's): project **MD_4County_D24**, work unit MD_4County_2_D24 (Baltimore etc.) flown **17-30 Dec 2024** (winter), 0.35 m ANPS (8 pts/m²), Fugro; DEM 0.5 m, NAD83(2011) UTM 18N (EPSG:6347), NAVD88 Geoid18; DEM DAV ID 14110; DEM bulk path StagedProducts/Elevation/OPR/Projects/MD_4County_D24/MD_4County_2_D24/TIFF/; no point-cloud InPort item or DAV id found |
| https://www.fisheries.noaa.gov/inport/item/67614 | 2020-2021 USGS Lidar Southeast MD (DAV 9563): does **not** reach Baltimore County (north edge 38.56 N) |
| https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/1m/Projects/MD_VA_Sandy_NCR_2014/0_file_download_links.txt | 3DEP 1 m project MD_VA_Sandy_NCR_2014: northernmost tiles y434, so it does **not** cover Five Farms (tiles x35/x36 y437) |
| https://lidar.geodata.md.gov/imap/rest/services/Baltimore/MD_baltimore_dem_m/ImageServer?f=pjson | MD iMAP Baltimore County DEM (2014 county lidar, ACA/Dewberry): ImageServer, NAD83 HARN Maryland State Plane (metres), 0.762 m (2.5 ft) cells, F32, heights in **US feet**, max 15000 x 4100 px, capabilities Image/Metadata/Catalog; no DSM/nDSM |
| https://geo.btaa.org/catalog/fc9eda382e1542038cc2fb843188f6e4 | catalogue entry for the same DEM (alias host mdgeodata.md.gov/lidar/...) |
| https://geodata.md.gov/imap/rest/services/Biota/MD_CanopyHeight/MapServer/layers | MD canopy height (NASA CMS Phase II), Baltimore County layer 3 at 1 m: a rendered **MapServer** only (Web Mercator), no raw heights, era of the 2014 lidar: not used |
| https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery/ImageServer/info/iteminfo | MD iMAP **six-inch imagery ImageServer**, Web Mercator; Baltimore County flown **2025** (Northern Western Shore phase) |
| https://mdgeodata.md.gov/imagery/rest/services/SixInch/SixInchImagery2023_2024_2025/MapServer | the same imagery as a MapServer (Export Map, max 4096 x 4096), Baltimore County 2025 |
| https://www.where2golf.com/course.aspx?id=45188 | Five Farms clubhouse 39.440195, -76.661729 (360 m south of the OSM centroid); East old card summary Back 6,844 / 74.5, Club 5,892 / 68.8, Front 5,941 par 75 / 75.3; West par 72, 6,800 yd |
| https://foretee.com/courses/maryland/timonium/usa/baltimore-country-club--west/6618/ | West: 11500 Mays Chapel Rd, opened 1962, redesigned 1990 by Bob Cupp and Tom Kite; no card |
| https://www.planetgolf.com/courses/usa/baltimore-country-club/five-farms-east-course | rolling parkland, little earth moved, holes turn to all points; greens mostly steep back-to-front, often elevated; **creek along the 10th, green set against a pond**; **6th: reverse Road-hole par 5 bending left around an old farm barn, out of bounds behind it**; 14th crossed by a sand-and-mound hazard, green in a basin; 17th green benched into a hillside beyond a gully; course lengthened (no date) |
| https://www.golfersjournal.com/editorial/national-treasure/ | feature on the 10th hole ("dual water hazards"); body behind a sign-in |

## Searched, nothing usable

- BlueGolf, Stymie, USGA NCRDB, MSGA: no search returned their Baltimore CC pages.
- West Course card: GolfPass id 7017 redirects to an address the sandbox can't open; golfingrecord.com is off-limits.
- OpenStreetMap object pages: none indexed; coverage unknown until the export (OpenGolfAPI shows a `leisure=golf_course` named "Baltimore Country Club").
- Video games: searches for EA/Tiger Woods PGA Tour, PGA Tour 2K, Links, Golden Tee, The Golf Club, GSPro: no appearance found.
- 3DEP 1 m project for tile x35y437: not found (MD_VA_Sandy_NCR_2014 stops at y434); MD_4County_D24 is the likely source once USGS publishes its 1 m product (not confirmed).
- Point-cloud DAV id for MD_4County_D24: not found (only the DEM's, 14110).
