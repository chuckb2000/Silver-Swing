# Victoria Golf Club

Course id: `victoria` (data folder `data/victoria/`), branch `course/victoria`.

## Build summary

Built overnight 2026-10-30/31 by a course chat (the developer asleep; calls made and listed
below). OSM maps the whole course: 18 hole lines, greens, fairways, 44 tee boxes, 88 bunkers
and the paths, all lining up with the 2025 orthophoto, so nothing was traced. Elevation and
trees come from Natural Resources Canada's HRDEM (DTM and DSM, 1 m, from the 2018-19 Vancouver
Island lidar), fetched by the GitHub Actions workflow through NRCan's WCS. The scorecard is the
club's own 2025 card (PDF). Tee sets built: Gold (the tips, the default) and Blue. A new theme,
`victoria`. Every hole is within 3 % of the card after moving tees within their boxes (10
flags before that, no fails); Gold plays 6,100 yd against 6,157 on the card, Blue 5,927 against
5,899. Checks on the branch (2026-10-31): `course_play.test.ts -t victoria` 12 passed; `npm test`
1,383 passed, 3 failed (the two that fail for every course until `make land` adds it to the
daily rotation: `player.test.ts` "the real rotation", `tour.test.ts` "a hole drawn sits out";
and `states.test.ts` "every listed course has a known state", open item 1; all three pass with
a roster line and `BC` added locally, except that `states.test.ts` then wants its count of 51
states raised to 52); `npm run e2e` 17 passed; pinned, and a `--fresh` rebuild left git clean;
in-game looks at holes 1, 5, 9, 12, 16 (Blue) and 8, 15 (Gold). The first course outside the
United States: its course-select state is "BC", which the
game shows under "other" until the design chat adds it (open item 1).

## Facts

-   **Location:** 1110 Beach Drive, Oak Bay (Greater Victoria), Capital Regional District,
    British Columbia, Canada, on Gonzales Point at the south-east tip of Vancouver Island, on the
    Strait of Juan de Fuca and Haro Strait; Garry oak and rock knolls, five holes on the sea.
    `state` BC. Course id `victoria`.
-   **Design:** founded 1893 (14 holes, 18 by 1895); the oldest 18-hole course in Canada on its
    original site; routing finalised in the mid-1920s after the club decided in 1923 to stop tee
    shots across Beach Drive; clubhouse 1928 (club history page, victoriagolf.com). No architect
    of record named in the sources read.
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 1,280 m (x0 477412, y0 5361801). Theme
    `victoria`. Wind 3-14 mph (open coast).
-   **Data** (all fetched by the GitHub Actions workflow into the release `data-victoria`;
    `data/victoria/fetch.json` and `release.json`):
    -   layout: OSM via Overpass (relation 2579054), plus the coastline (`raw/overpass.geojson`, in git);
    -   bare earth: NRCan HRDEM DTM 1 m, project BC-Vancouver_Island_Sunshine_Coast_2018-1m, WCS
        `datacube.services.geo.ca/ows/elevation` coverage `dtm`, EPSG:32610, CGVD2013 m; open sea
        (nodata) filled from its rim (`intake.py raster --fill-sea`);
    -   trees: the same project's DSM (`dsm`), canopy = DSM - DTM;
    -   orthophoto: Capital Regional District 2025 orthos (OrthoImagery2025 MapServer export, 0.5 m);
    -   scorecard: the club's "Scorecard 2025" PDF; ratings from 18Birdies.
    -   LidarBC's point-cloud index was also fetched; the LAZ wasn't needed (the HRDEM DSM gives
        the canopy).
-   **Water:** the sea (`proposed/sea.geojson`, from OSM's coastline, `red_water_osm`): a red
    penalty area inside and outside the boundary. No ponds. Out of bounds: the OSM boundary
    (plus the edges of four tee boxes it clipped, `make_boundary.py`) and Beach Drive, the
    public road through the course (`ob_highways: ["secondary"]`).
-   **Trees:** 1,518 found in the canopy model, 515 on the course, 1,508 exported (503 dropped
    as buildings). Types from crown shape only: 41 conifer, 1,477 deciduous (drawn as Garry
    oak). s06b dropped 10 trees from tee shots: one 21 m tree 37 m in front of the 4th Gold
    tee and nine 26-31 m trees (firs by the car park) across the 15th's tee shot.

## Scorecard

The club's printed card, "Scorecard 2025" (victoriagolf.com, fetched 2026-10-31). Every row
adds up to its printed totals. Hole names: 1 Lighthouse, 2 Calamity, 3 Road Hole, 4 Olympics,
5 The Bay, 6 Vimy Ridge, 7 Mount Baker, 8 Lands End, 9 Gibraltar, 10 Dardanelles, 11 Blink
Bonnie, 12 Tipperary, 13 Combe's Carry, 14 San Juan, 15 Tattenham Corner, 16 Waterloo,
17 Newport, 18 Plateau.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 3 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | 34 | 4 | 4 | 5 | 3 | 3 | 4 | 4 | 5 | 4 | 36 | 70 |
| HCP | 14 | 16 | 2 | 6 | 8 | 12 | 4 | 18 | 10 | | 5 | 1 | 11 | 15 | 9 | 3 | 13 | 17 | 7 | | |
| Gold | 519 | 148 | 400 | 376 | 335 | 344 | 378 | 116 | 194 | 2810 | 349 | 459 | 543 | 160 | 199 | 407 | 385 | 455 | 390 | 3347 | 6157 |
| Built | 520 | 144 | 394 | 380 | 336 | 336 | 375 | 119 | 189 | 2793 | 343 | 459 | 530 | 157 | 196 | 408 | 375 | 450 | 389 | 3307 | 6100 |
| Blue | 510 | 132 | 387 | 360 | 327 | 330 | 360 | 109 | 187 | 2702 | 340 | 440 | 518 | 149 | 185 | 384 | 365 | 449 | 367 | 3197 | 5899 |
| Built | 520 | 129 | 394 | 365 | 336 | 326 | 351 | 106 | 185 | 2712 | 343 | 440 | 516 | 153 | 189 | 392 | 356 | 450 | 376 | 3215 | 5927 |

White 5,574 and Green 5,033 are in `scorecard.csv`, not built; so are the women's pars (72)
and handicaps. Ratings (men, 18Birdies, unverified): Gold 70.3/135, Blue 68.9/131 (18Birdies
prints Blue as 5,825 yd, an older card; the club's 2025 card says 5,899).

## Default tee

Gold, the longest set (developer, 2026-10-31: every course defaults to its longest tees; it was
Blue, the developer's call of 2026-10-30, until the design chat changed it at the merge). Blue is
the second set.

## The developer's calls

-   2026-10-30: build the tips and Blue; trace missing features with great care (none needed
    here); over 8 % or conflicting sources: pick, build, flag; Victoria's state is British
    Columbia.
-   Standing defaults (COURSE_BUILD 4.1): every penalty area red, the OSM boundary as OB,
    trees from the canopy model, trees in a perfect tee shot's way removed and listed.
-   Course chat's calls (2026-10-31, for the developer to confirm; open items): the sea a red
    penalty area; Beach Drive out of bounds; the boundary widened to four clipped tee boxes;
    theme `victoria`; card hole 4.

## New pipeline keys or theme

-   No new pipeline keys. Config keys used: `ob_highways`, `red_water_osm`, `dsm`.
-   New theme `victoria` (`assets-src/palettes/victoria.json`, `assets-src/trees_victoria.py`,
    `game/public/sprites/trees_victoria*`): the island's dry-summer turf from the 2025 ortho
    (grey-green fairways, paler greens, olive-khaki rough), white sand, the dark blue-grey strait,
    grey rock; trees: Douglas fir (the pnw conifer), shore pine (Cypress Point's pine,
    recoloured) and Garry oak (the live-oak shape in deep oak green).
-   Logo: "Garry oak on the point": an oak on a rock with the strait and Mount Baker behind
    (`assets-src/course_logos/victoria.py`, concept in `assets-src/logo_concepts/victoria/`);
    original, not the club's crest.
-   Card: hole 4 (`assets-src/cards/victoria.json`), rotating 9, 15 and 12.

## Open items

1.  **The game shows "BC" under "other".** `STATES` in `game/src/data/registry.ts` lists US
    states only. Request for the design chat: add `BC: 'British Columbia'` (one line); the
    course already carries `"state": "BC"`. Recommendation: add it.
2.  **Beach Drive out of bounds.** The public road crosses the course between 3/12 and 4/11 and
    runs past 7 and 13. No local rule was found online; built as OB (a public road; the club
    ended tee shots across it in 1923). Option: cart path with free relief (the 4.1 default for
    roads inside a boundary). Recommendation: keep OB.
3.  **The sea as a red penalty area**, also beyond the boundary (as Cypress Point and
    Newport). The rock shore between the boundary and the water stays OB. Recommendation: keep.
4.  **Rock outcrops play as rough.** The bare-rock knolls by 6-10 aren't mapped in OSM and
    there is no rock surface; they draw and play as rough. Option: trace them from the ortho as
    an art-only rock paint (needs a pipeline key). Recommendation: leave for now.
5.  **Tree types:** crown shape only, so most firs draw as Garry oaks (41 conifers of 1,518).
    The tall trees along 15 and 17 are Douglas firs in the photo. Option: type trees over ~25 m
    as conifer (a pipeline key). Recommendation: accept for now.
6.  **15th tee shot:** nine tall trees by the car park were removed so a straight drive down
    the hole line clears (standing default). If the real tee shot plays over or round them,
    add them back with `keep_tee_trees: ["15"]`. Recommendation: accept the removal.
7.  **Ratings are third-party** (18Birdies) and its Blue total is an older card's.
    Recommendation: keep until a club source gives the 2025 ratings.
8.  **Gold tees on 2, 8 and 14** sit at the back of long shared tee boxes (the OSM line's start);
    all within 3 % of the card.

## Lessons

-   NRCan's HRDEM WCS (`datacube.services.geo.ca/ows/elevation`, coverages `dtm` and `dsm`,
    WCS 1.1.1 GetCoverage with a UTM box) gives a ready 1 m DTM and DSM for Canadian courses in
    one request each: no LAZ needed for trees.
-   The CRD's ArcGIS MapServer `export` gives a georeferencable 0.5 m ortho by box, and
    club websites often host the card as a PDF the workflow can fetch.
