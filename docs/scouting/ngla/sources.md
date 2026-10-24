# National Golf Links of America — sources (all read 2026-10-24)

The sandbox's web-search allowance (shared by every scouting chat running at
the same time) ran out part-way through; the items marked *not found* were
not searched further.

## Course facts and layout
| URL | What it gave |
|---|---|
| https://en.wikipedia.org/wiki/National_Golf_Links_of_America | Macdonald 1911, Raynor supervising; par 72, 6,873 yd, 73.6/137; Walker Cups 1922 and 2013; 250 acres; 14th green moved for Sebonac Inlet Road; hole names 2, 3, 4, 7, 8, 13, 14. No coordinates in the fetched text |
| https://courses.opengolfapi.org/courses/NY/national-golf-links-of-america | map point 40.9138621752, -72.4522078493; tee totals; per-hole row (= GolfPass Green) |
| https://www.tclf.org/landscapes/national-golf-links-america | history: proposed 1904, built from 1907, opened 1911, Raynor as surveyor |
| https://clui.org/projects/foreground-landscape-golf-america/american-golfscape/national-golf-links-america | "generally without trees", next to Sebonack and Shinnecock |
| https://www.usga.org/championships/2013/2013-walker-cup-course-overview-21474853290.html | 2 Sahara, 3 Alps, 4 Redan, 14 Cape (green moved for Sebonac Inlet Road); windmill between 2 and 16 |
| https://golfadelphia.com/2019/02/28/national-golf-links-of-america/ | all 18 hole names; out-and-back routing, halfway house; water on 9, 13, 14, 18; bay views on 12 and 17; windmill near 2 and over the 16th green |
| https://www.foxnews.com/sports/golf-course-review-national-golf-links-of-america.print | older card (7,079 yd, 75.2/145); hole notes; 285 acres; "over 300 bunkers"; 10-15 mph crosswinds; tee and length changes |
| https://www.ukgolfguy.com/national-golf-links-of-america-golf-course-review | 18 the only hole right on the water; back nine into the wind |
| https://www.kimigolf.com/America/New-York/NGLA/NGLA-(en).htm | hole names/yards (= GolfPass Red); windmill "the course's symbol"; pond carry on 14 |
| https://www.golfclubatlas.com/forum/index.php/topic,55402.0.html | 2013 Walker Cup back tees on 3, 7, 16 (and a shelved one on 18 for wetlands); ~300-yd carry over the pit on 9 |
| https://www.todaysgolfer.co.uk/courses/top-100-golf-courses/top-100-golf-courses-in-the-world/the-worlds-top-100-40---31/national-golf-links-of-america/ | par 73, 6,873; 365 bunkers; ponds; beside Shinnecock |
| https://www.top100golfcourses.com/golf-course/shinnecock-hills/17723 | NGLA ranked 4th-5th in the world on the same page; neighbours |
| https://nysga.org/membership-member-club-directory/details/national-golf-links-of-america | address Sebonac Inlet Road, Southampton 11968; phone |
| https://thefriedegg.com/fried-egg-podcast/national-golf-links-of-america-c-b-macdonalds-big-swing-great-courses-2-5 | podcast summary only (Millard's 2016 club history exists) |

## Scorecard
See `scorecard_sources.md`: GolfPass (https://www.golfpass.com/courses/14992-national-golf-links-of-america/),
GolfNow (https://www.golfnow.com/courses/1034410-national-golf-links-of-america-details),
OpenGolfAPI, Wikipedia, walkercup.co.uk, Fox News, Kimi Golf, golfadelphia,
ForeTee (https://foretee.com/courses/new-york/southampton/usa/national-golf-links-of-america/9125).
Ignored: GolfPass course 21436 and 18Birdies "National Golf Links" (both are a
different course in South Charleston, Ohio).

## Video games
Searches for NGLA with PGA Tour 2K, Golden Tee and "video game" returned
nothing relevant. The EA Sports PGA Tour course list
(https://www.wepc.com/gaming/ea-sports-pga-tour-course-list/) doesn't include
it, and the PGA Tour 2K25 patch notes (https://pgatour.2k.com/2k25/patch-updates/)
mention Shinnecock but not NGLA.

## Elevation, lidar, imagery
| URL | What it gave |
|---|---|
| https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer?f=pjson | 1 m F32 bare earth for Nassau and Suffolk, early-2024 QL2 lidar (0.7 m pulse spacing), NAD83(2011) UTM 18N, NAVD88 GEOID18 m; extent (26918) x 603000-765000, y 4491000-4578000; max export 15000 x 4100 px |
| https://elevation.its.ny.gov/arcgis/rest/services/DEM_2024_Long_Island/ImageServer/info/iteminfo | 1,873 tiles of 1,500 m; Sanborn; credit "NYS ITS Geospatial Services, USGS" |
| https://elevation.its.ny.gov/arcgis/rest/services/LAS_Indexes/MapServer/layers | layer 1 "NYS - Long Island 2024" (fields FILENAME, DIRECT_DL, FTP_PATH, SIZE_GB); layer 24 "USGS - Long Island 2014" |
| https://gis.ny.gov/lidar | Discover GIS Data NY (https://orthos.dhses.ny.gov/) and ftp://ftp.gis.ny.gov/elevation/LIDAR; 2024 Long Island metadata at https://gisdata.ny.gov/elevation/LIDAR/NYS_LongIsland2024/1229_NYSDEP_Lidar_2024_PointCloud.xml |
| https://www.fisheries.noaa.gov/inport/item/49890 | 2014 USGS CMGP Lidar: Post Sandy (Long Island, NY), flown 3-21 April 2014, Suffolk and Nassau; classes 1, 2, 7, 9, 10 (no vegetation class); NOAA DAV id 4938 |
| https://www.fisheries.noaa.gov/inport/item/49608 | 2012 USACE post-Sandy topobathy, eastern Long Island (DAV 1436): shoreline only, not used |
| data/indian_island/DATA_REQUEST.md, data/indian_island/course_config.json (repo) | proven NYS DEM and ortho link formats; tile naming `u_<x/100><(y-4000000)/10>` by south-west corner, 1,500 m; class 1 holds the trees |

Not found (search allowance ran out): the 3DEP 1 m project name for this
site, the NYS orthoimagery flight year for Suffolk County, the NAIP year,
OSM coverage.
