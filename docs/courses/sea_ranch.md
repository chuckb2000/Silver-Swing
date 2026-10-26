# The Sea Ranch Golf Links

Course id: `sea_ranch` (data folder `data/sea_ranch/`), branch `course/sea_ranch`.

## Build summary

Built 2026-10-25 by a course chat from the release `assorted-lidar-data`, one of seven courses
from it. The course was not scouted; it was identified from the lidar orders' footprint.

-   **OSM:** complete, except for pins. It maps the course as 16 narrow corridors around the
    mown turf, which left 22 tee boxes and five ponds outside them. The developer drew the
    out-of-bounds line on the overview map, and that line is the boundary.
-   **Elevation:** the USGS 3DEP 1 m DEM.
-   **Trees:** from the 2013 Sonoma County lidar (ground and high-vegetation classes), which the
    developer added because the release's two coastal surveys covered only about half the course.
-   **Water:** the Pacific (built from OSM's coastline) and the five ponds are red.
-   **Tees:** the course plays from the tips, Black 6,649 yd. Hole 10 is a −5.3 % flag; every
    other hole is within 3 % (6,587 yd built).
-   **Theme and logo:** the new `sea_ranch` theme; the logo is a windbreak cypress.
-   **Tests:** counts are in the pull request.

## Facts

-   **Location:** 42000 Highway 1, The Sea Ranch (Gualala), Sonoma County, California. The
    course is on the coastal terrace and meadows of the Sea Ranch community, between Highway 1,
    the Gualala River and the Pacific. `state` CA. Course id `sea_ranch`.
-   **Design:** Robert Muir Graves. The first nine opened in 1974; the 18 holes were completed
    in 1996.
-   **UTM zone:** 10N (EPSG:32610). World 2,048 x 1,792 m (x0 454173, y0 4288522). Theme
    `sea_ranch`. Wind 3-14 mph (open coast).
-   **Data:**
    -   OSM: the developer's export `export.6.geojson`.
    -   DEM: USGS 3DEP 1 m from the 3DEPElevation service (`exportImage.4.tiff`), in git (9 MB).
    -   Lidar: 2013 Sonoma County Vegetation Mapping and Lidar Program, NOAA job J1476309
        (`2013_Sonoma_County_J1476309.zip`). Flown 28 October 2013; classes 2 and 5; covers the
        whole course. The clip is rebuilt from the release by `release.json`.
    -   Not used: the 2016 USGS West Coast El Niño lidar and the 2017 FEMA Region 9 lidar. Both
        are shoreline strips that covered about half the course.
    -   No orthophoto.
-   **Out of bounds:** the developer's outline, drawn in red on `maps/overview_2m.png`
    (`proposed/ob_outline_developer.jpg`). It was traced as the centreline of the stroke, at
    2 m/px; the drawing lines up with the map to the pixel. Two things the hand-drawn line
    crossed were added: the 13th's two back tee boxes (+3 m) and the pond w393293619 (+2 m).
    Inside the outline, the unmapped meadow plays as rough. Roads inside it, Highway 1
    included, are cart paths (free relief, standing default). Homes inside it are buildings.
-   **Water:** red penalty areas, all from the standing default:
    -   the Pacific, the sea side of OSM's coastline (`proposed/sea.geojson`);
    -   the five `natural=water` ponds beside holes 6, 10 and 13 (w837523067 and w837523068,
        which the 6th plays across; w837523069; w393293618; w393293619).
-   **Trees:** 16,039 from the lidar, 4,305 of them inside the boundary. Median height 14.9 m,
    tallest 60.6 m: the redwood and Douglas-fir forest on the ridge east of the course. 31 % are
    conifers by crown shape. The theme draws bishop pine, redwood and Monterey cypress.

## Scorecard

GolfPass, read 2026-10-25: Black, Blue, White and Red per hole, par 72, with men's and women's
stroke indexes. Every row adds up to its printed total. The tee table gives White 5,439 and Red
4,805 against rows of 5,355 and 4,790. OpenGolfAPI's Black row and stroke index are the same.
The card is unverified.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 4 | 5 | 4 | 3 | 4 | 36 | 4 | 4 | 3 | 5 | 5 | 4 | 4 | 3 | 4 | 36 | 72 |
| HCP | 7 | 15 | 11 | 17 | 5 | 3 | 9 | 13 | 1 | | 18 | 4 | 12 | 8 | 6 | 14 | 2 | 16 | 10 | | |
| Black | 525 | 341 | 224 | 375 | 406 | 545 | 379 | 190 | 390 | 3375 | 307 | 370 | 223 | 501 | 547 | 380 | 385 | 160 | 401 | 3274 | 6649 |
| Blue | 501 | 321 | 197 | 355 | 382 | 518 | 334 | 158 | 369 | 3135 | 277 | 358 | 207 | 486 | 525 | 356 | 373 | 148 | 368 | 3098 | 6233 |
| Built (Black) | 522 | 334 | 222 | 375 | 402 | 546 | 385 | 185 | 382 | 3353 | 291 | 363 | 220 | 495 | 545 | 375 | 382 | 158 | 405 | 3234 | 6587 |

Ratings (men): Black 72.5/130, Blue 71.0/125, White 67.4/117. Blue, White and Red are in
`scorecard.csv` but not built.

## Default tee

Black, the tips (developer, 2026-10-25: "let's have as much of sea ranch as possible play from
the blacks"; "for all of these courses lets play from the tips"). Every hole plays from a Black
box. From Blue, hole 18 had been 9 % long, because OSM's back box is tagged `blue;black`.

## The developer's calls (2026-10-25)

1.  **Play from the Blacks.**
2.  **Out of bounds:** first, grow OSM's corridors around the course features and ponds outside
    them. The developer then drew the outline that replaced that: "this is what out of bounds
    should look like at sea ranch--the red outline".
3.  **Full-coverage lidar:** the developer added the 2013 Sonoma County lidar to the release.
4.  **Fairway up to the green where the gap is about 5 yd or less** ("only fix if the gap is like
    5 yards or less"). `connect_fairways` with `connect_fairways_max_gap_m` 4.8 connects holes 1,
    3 and 6 (gaps of 4.7, 3.4 and 3.5 m). The larger gaps, 6-84 m, stay rough.
5.  **New theme** from the developer's photos: `sea_ranch`. **Logo:** a house-style SVG concept.
6.  The standing defaults (COURSE_BUILD 4.1).

## New pipeline keys and theme

-   **`sea_ranch` theme:** `assets-src/palettes/sea_ranch.json` and `assets-src/trees_sea_ranch.py`.
    -   Conifers: bishop pine and redwood.
    -   Broad crowns: wind-sheared Monterey cypress (`trees_monterey._cypress`).
    -   Ground: golden meadow grass.
-   **Logo:** `assets-src/logo_concepts/sea_ranch/concept1.src.svg`.
-   **`connect_fairways_max_gap_m`** (s02b): a course's own limit on the gaps between fairway and
    green that `connect_fairways` bridges. Without it, the limit stays 60 m.
-   **Pipeline:** the release's shared changes are listed in the pull request. This course uses
    `propose_sea.py`, s06's centre pin from the green and s06's tee boxes named by `tee=*`.

## Open items

1.  **Hole 10 (−5.3 %):** no Black box behind the line's start is mapped or shows as a pad in
    the lidar. Recommendation: accept.
2.  **Par:** OSM gives hole 2 as a par 3. The card has it as a par 4 at 341 yd, and the build
    uses the card.
3.  **The 9th green is 121 m2 as OSM maps it** (13 x 13 m). Its tilt is capped at 1.5 % with no
    random undulations (`green_tilt`). Its centre pin stands 1.9 m from OSM's pin
    (`proposed/pin9.geojson`, a hole location chosen by running the game's `pins.ts`), so three
    hole locations fit (`pins.test.ts`). Recommendation: trace the green if a photo shows it
    larger.
4.  **No photo:** the developer's outline and OSM are all the course geometry has. Recommendation:
    add a NAIP export if anything needs tracing later.
5.  **Scorecard unverified** (GolfPass). Recommendation: keep it.

## Lessons

-   **Check the tile index against the points:** the release's coastal surveys looked complete
    from their tile index, but the points covered 27 % of the course. Measure coverage from the
    points themselves.
-   **OSM corridors are not an out-of-bounds line:** a course boundary drawn as strips around the
    turf leaves tees and ponds out. Ask the developer early. An outline drawn on the overview map
    lines up with it to the pixel (same size, 2 m/px), so it can be traced directly.
