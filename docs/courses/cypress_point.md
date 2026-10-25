# Cypress Point Club

Course id: `cypress_point` (data folder `data/cypress_point/`), branch `course/cypress_point`.

## Build summary

Built 2026-10-24 by a course chat following docs/COURSE_BUILD.md. OSM was complete: 18 hole
lines with the card's pars, a green and a pin on every hole, fairways, 149 bunkers and the tee
boxes (the export also held Spyglass Hill, whose boundary and hole lines are dropped). Elevation
is the USGS 3DEP 1 m DEM; the open dune sand OSM doesn't map was traced from NAIP and approved
by the developer; the Pacific (OSM coastline only) and the rocky shore below the clifftop were
made one red penalty area. Middle tees (the card has no Blue), new `monterey` theme, otter logo.
Every hole is within 3 % of the Middle card (6,296 yd built vs 6,294). Trees from the 2018 FEMA
Region 9 lidar (NOAA job), with the cypress clump in the 17th fairway kept on purpose. The course
test (`data/cypress_point/tests/cypress_point.test.ts`, 17 checks) passes when copied into
`game/tests/unit/`; robot rounds over five seeds scored 67-75 with no penalty strokes. On the
branch rebased on `main` (296f2453, with Stanford, Wildwood and Pumpkin Ridge): `npm run build`
passes, 964 unit tests pass with the course test copied in (the one failure is `player.test.ts`
asking for `cypress_point` in the daily roster), and the 12 Playwright tests pass.

## Facts

-   **Location:** 3150 17-Mile Drive, Pebble Beach, Monterey County, California, on the
    Monterey Peninsula's Pacific shore in the Del Monte Forest. `state` CA. Course id `cypress_point`.
-   **Design:** Alister MacKenzie with Robert Hunter, 1928. Marion Hollins hired MacKenzie and
    shaped the 16th; Seth Raynor made a first routing in 1925 and died before building it.
    Restoration work by Bill Coore and Ben Crenshaw since the 2010s (thefriedegg.com).
-   **UTM zone:** 10N (EPSG:32610). World 2,048 x 1,280 m (x0 591331, y0 4048006): the 2,048 m
    limit east-west with 103 m of scenery each side. Theme `monterey`. Wind 3-14 mph (open coast).
-   **Data:** OSM (the developer's Overpass export `export.3.geojson`, clipped to the world + 300 m
    by `clip_osm.py`); USGS 3DEP 1 m DEM from the 3DEPElevation `exportImage` service
    (`exportImage.17.tiff`, EPSG:26910, metres; sea hydro-flattened at 1.14 m); USDA NAIP via the
    USGS NAIP ImageServer, two JPEG halves (`hahahs.jpg` west, `exportImage.jpg` east),
    georeferenced from the request bbox by `make_ortho.py` (alignment with OSM greens and bunkers
    within 1-2 m); lidar points from the NOAA Data Access Viewer (2018 FEMA Lidar: Region 9, CA,
    job J1476067, one LAZ over the world + 150 m, 32 M points, flown 19 March - 9 April 2018;
    NAD83(2011) / California zone 4 in US survey feet, NAVD88 feet, `laz.units: "ft"`; classes
    1, 2, 9, 10 only, so the canopy is class 1). Originals in the release `cypress-point-data`;
    `release.json` rebuilds `raw/`.
-   **Water:** one red penalty area, `sea_pacific` + `shore_pacific`: the sea side of OSM's
    coastline (offshore rocks filled in) and the rocks, cliffs and small beaches between the
    course boundary and the sea (`make_sea.py`, `make_shore.py`), so nothing below the clifftop
    beside 15-18 is out of bounds. The coast north of 17-Mile Drive and the gardens south of 18
    stay out of bounds. No ponds; OSM's 89 m stream by the 13th green and a DEM swale across the
    5th show no water on the photo and are not penalty areas.
-   **Out of bounds:** the OSM boundary (w36435651). 17-Mile Drive and the paths inside it are
    cart paths (free relief). Within ~25 m of play: hole 4's left side, 14's right side along the
    Drive, 1's left corner by the Drive, 18's right side near the tee, the north line by the 9th
    tee and 8th green, the 3rd and 5th tees.
-   **Dunes:** the open sand between the holes (4.2 ha inside the boundary) traced from NAIP,
    calibrated on the mapped bunkers (`make_dunes.py`); in play as `golf=bunker` + `sand=waste`
    until a waste-sand surface exists (design request 1). Outside the boundary a looser trace
    carries the dunes on as scenery (`natural=sand`), so they don't stop at the OB line.
-   **Trees:** 11,707 from the lidar (2,604 inside the boundary), median 16 m, tallest 42 m;
    74 % broad-crown (drawn as Monterey cypress and coast live oak), 26 % conifer (Monterey pine),
    by crown shape (the flight was in spring, but the trees are evergreen). The crowns match the
    NAIP photo; 691 crowns on OSM buildings dropped. Removed under the standing defaults: 18 crowns
    on greens, tees and bunkers or more than 2 m inside a fairway, and two trees in front of the 5th
    and 6th tees (s06b, 15-30 m out). Kept on purpose: the cypress clump among the bunkers in the
    middle of the 17th fairway (`keep_trees_areas`, 14 crowns). Trees standing in the traced dunes
    are kept (the dune trace leaves the lidar canopy out).

## Scorecard

Club card as scanned by BlueGolf (undated, unverified; the club publishes none), supplied by the
developer 2026-10-24. Every row adds up to its printed total.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 3 | 4 | 5 | 5 | 3 | 4 | 4 | 37 | 5 | 4 | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 35 | 72 |
| HCP | 5 | 1 | 17 | 7 | 11 | 3 | 15 | 9 | 13 | | 16 | 4 | 2 | 14 | 8 | 18 | 6 | 10 | 12 | | |
| Championship | 420 | 549 | 156 | 383 | 491 | 521 | 170 | 369 | 289 | 3348 | 476 | 440 | 404 | 366 | 393 | 135 | 233 | 386 | 343 | 3176 | 6524 |
| Middle | 407 | 535 | 151 | 370 | 472 | 509 | 159 | 342 | 283 | 3228 | 476 | 427 | 397 | 344 | 384 | 120 | 218 | 374 | 326 | 3066 | 6294 |
| Forward (men) | 407 | 508 | 140 | 359 | 415 | 479 | 158 | 322 | 245 | 3033 | 476 | 398 | 313 | 285 | 324 | 113 | 210 | 350 | 295 | 2764 | 5797 |
| Built (Middle) | 404 | 533 | 155 | 368 | 485 | 512 | 157 | 338 | 281 | 3233 | 476 | 427 | 405 | 341 | 381 | 123 | 219 | 363 | 328 | 3063 | 6296 |

Ratings (men): Championship 72.1/140, Middle 71.3/136, Forward 69.1/128. The card's women's
rows (Middle 77.7/143, Forward 74.9/138; par 74/75, 16th a par 3/4) are not entered. The
Championship and Forward sets are in `scorecard.csv`, not built. The OSM hole lines start on the
Championship tees (6,521 yd against 6,524).

## Default tee

Middle (COURSE_BUILD 4.1: no Blue on the card; Middle is the set closest to 6,300 yd).

## The developer's calls (2026-10-24)

1.  **The Pacific is a red penalty area in all circumstances**, never out of bounds; the shore
    between the clifftop and the sea is part of it (approved, drawn as rock).
2.  **Dune sand:** traced from NAIP, played as bunkers now (option a); a waste-sand surface asked
    of the design chat (option c). The trace approved ("looks excellent"); the off-course sand
    extended past the OB line at the developer's request (above the 8th).
3.  **Holes 2 and 14 share one curved tee strip** (OSM w281499468): cut across at local y 932,
    south half to 2, north half to 14 (approved). Hole 2 went from 552 yd (+3.1 %) to 533.
4.  **Theme:** new `monterey` theme (approved).
5.  **Logo:** the sea otter holding a golf ball (developer's choice over the 16th with a cypress).
6.  **Lidar:** the developer ordered the NOAA job (2018 FEMA Region 9 lidar), in the release 2026-10-24.
7.  The developer approved the course chat's other calls in advance ("I approve whatever you come
    up with"): Middle tees, all water red, OB = the OSM boundary with roads inside as cart paths,
    wind 3-14 mph, card hole 16 (rotating 15, 17 and 9), no penalty area for the 13th-green
    stream or the 5th swale, keeping the 17th fairway's cypress clump, and the tee-shot trees
    removed on 5 and 6.

## New pipeline keys and theme

-   **`rock_water_osm`** (list of feature ids; s09, s09b, s10): penalty areas over rock are drawn
    as rock (the theme's `"rock"` colour keys, default `K1, K2, K3, K3`, with optional
    `"rock_plants"` speckles); they stay water in the surface map, and no OB stakes are drawn
    where the boundary meets them or the `red_water_osm` areas. Absent, nothing changes.
-   **`keep_trees_areas`** (a GeoJSON file in `data/<id>/`; s05): lidar crowns inside these areas
    are kept on fairways, bunkers and tees (trees in play on purpose). Absent, nothing changes.
-   **`monterey` theme:** `assets-src/palettes/monterey.json` (31 colours, pnw keys plus F0/F1 for
    iceplant), `assets-src/trees_monterey.py`: Monterey pine (conifer class), wind-sheared layered
    Monterey cypress and coast live oak (broad-crown class, variants 0-1 and 2), built with
    `build_assets.py --theme monterey`.
-   `make regress` (2026-10-24, `regress.py` per course): the game files of 21 data folders came
    out unchanged: Bandon Dunes, Bandon Preserve, Bandon Trails, East Potomac, Eastmoreland, Franklin,
    Gearhart, Highland Links, Indian Island, the Muni, Langdon, Langston, OGC, Oswego Lake,
    Practice, RedTail, Shorty's, Stone Creek, TPC Boston, Triggs and Tualatin. RedTail, TPC Boston and Tualatin rebuilt with a
    different `validation_report.md` only. For RedTail and TPC Boston that is s06's open-item
    wording on `main` ("the scorecard's stroke index" where the committed reports say "GolfPass").
    Tualatin's diff was not inspected. Not run (stopped to open the PR): Wannamoisett, Waverley,
    Willamette Valley, and the courses merged to `main` since (Stanford, Wildwood, Pumpkin Ridge;
    the new keys are absent from their configs). Could not run, for reasons on `main`: Chambers Bay (its lidar clip no longer
    matches the hash in its `release.json`) and Pacific Dunes / Old Macdonald / Sheep Ranch
    (`release.json` still names the `PENDING-north-photo.jpg` asset).

## Open items

1.  **Scorecard unverified** (BlueGolf scan, undated). Recommendation: keep it until a printed card
    turns up.
2.  **Dunes play as bunkers** (no driver from them, greenside splash rules) until design request 1
    lands. Recommendation: accept for now.

## Requests for the design chat

1.  **Waste sand** (developer, 2026-10-24): a surface 18 `waste` (lie distance x0.92, window x0.8,
    no driver, no splash rule, putter allowed; restitution 0.10, speed kept 0.35, roll decel 4.0;
    bunker colours without the lip, sparse tufts; general area, no relief) and an optional config
    key `"waste_sand": true` painting `golf=bunker` + `sand=waste` as 18. Cypress Point's dunes are
    already tagged `sand=waste`, so switching is the key and a rebuild.
2.  After the merge: add `cypress_point` to `game/src/data/dailyRoster.ts` (from the next day; a new
    course fails `player.test.ts` until it is in the roster), the CLAUDE.md section 11 line, fold
    the lessons below into COURSE_LESSONS.md, and move
    `data/cypress_point/tests/cypress_point.test.ts` into `game/tests/unit/`.
3.  Found during the regression check (not this course's files): Chambers Bay's `make fetch` fails
    (the LAZ its `make_laz.py` writes no longer matches `release.json`); the Pacific Dunes release
    still lacks the north photo; the committed RedTail and TPC Boston validation reports predate
    s06's current open-item wording, and Tualatin's report also rebuilds differently.

## Lessons

-   **OSM's sea is only a coastline.** A coastal course whose boundary runs along the clifftop has
    a strip of rock and beach outside it: as mapped, a ball there is out of bounds. Build the sea
    from the coastline ways (the sea is on the right of each way), fill the offshore rocks, and
    add the shore between the boundary and the sea to the same penalty area, stopping at roads.
    Rasterised strips leave a seam against the boundary: grow the shore up to the boundary line.
-   **Clip a big Overpass export first.** The coastline ways ran the length of California (16 MB);
    clip to the world + 300 m in a `release.json` step, and cut the coastline a little inside the
    clip box before polygonising, or the line ends miss the box edge and no faces form.
-   **A tracing script must ignore its own output** once its shapes are in `edited/`: the dune trace
    calibrated on the merged dunes as if they were bunkers and found nothing on the second run.
-   **Check the standing tree defaults against the course's signature trees.** The 17th's
    cypress clump stands among bunkers in the middle of the OSM fairway; `trees_off_fairways_m` and
    the bunker drop removed all of it. Look at the dropped-crown list on the photo before accepting
    it; `keep_trees_areas` keeps such a stand.
-   **A traced sand area swallows the trees standing in it**, and s05 then drops them as crowns
    in a bunker: cut the lidar canopy out of the trace.
-   **Long shared tee strips:** measure the yardage along the strip for both holes; cutting the OSM
    box across where the two cards fall fixes both without new geometry.
-   **Playwright's pinned browser may not match the preinstalled one:** link the installed headless
    shell into the expected folder rather than running `playwright install`.
