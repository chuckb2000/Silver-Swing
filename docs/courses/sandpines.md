# Sandpines Golf Links

Course id: `sandpines` (data folder `data/sandpines/`), branch `course/sandpines`.

## Build summary

Built by a course chat on 2026-10-24. OSM maps the whole course: 18 hole lines
whose pars match the card, every green and pin, the fairways, bunkers and
three ponds, and most tee boxes. Four tee pads were tagged as fairways (fixed),
hole 11's long teeing ground is tagged as its Blue box, and hole 8 plays from
its Black tee because it has no Blue box (developer). Elevation is the USGS
3DEP 1 m DEM; trees come from the DOGAMI canopy height model; the OSIP 2024
orthophoto gives the native dune-grass areas. New theme `sandpines`; the logo
is the Siuslaw River Bridge. Blue tees: 17 holes within 3 % of the card, hole 8
+18 % (accepted), 6,479 yd against 6,456. Robot rounds over five seeds scored
67-77 with no hole over par + 4. On the branch: the 14 Sandpines tests pass; 863 of 864 unit tests pass (the
one failure is the daily rotation, which needs the course in `DAILY_ROSTER`);
12 Playwright tests pass. Every hole was looked at in the game.

## Facts

-   **Location:** 1201 35th Street, Florence, Lane County, Oregon, about a
    mile north of the Siuslaw River and old town, between the town and the
    Oregon Dunes National Recreation Area (the open dune north of holes 7 and
    12). `state` OR. Course id `sandpines`.
-   **Design:** Rees Jones, opened 1993 as Florence Golf Links; Golf Digest's
    best new public course of 1993 (Wikipedia, top100golfcourses.com;
    unverified). The front nine plays through shore pine and spruce, the back
    nine is open links among dune-grass mounds and two lakes.
-   **UTM zone:** 10 N (EPSG:32610). World 1,536 x 1,280 m, origin (410177,
    4872051): the boundary's box (1,095 x 1,036 m) plus 120-220 m of scenery.
    Theme `sandpines` (new). Wind 3-14 mph (open coast).
-   **Data** (GitHub release `florence-data`; `make fetch NAME=sandpines`):
    -   OSM: the developer's Overpass export `export.2.geojson` (a whole
        region), clipped to the world + 300 m by `make_osm.py` into
        `raw/overpass.geojson` (committed).
    -   Elevation: USGS 3DEP 1 m bare-earth DEM (3DEPElevation ImageServer,
        metres, `exportImage.16.tiff`). The DOGAMI DTM download failed.
    -   Canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, 1 m, feet
        (`exportImage.19.tiff`, `f=image`; `f=json` failed). The course
        straddles 44.000 N, the north edge of the 2008 South Coast project;
        the mosaic has no gap or seam there.
    -   Photo: OSIP 2024, 0.5 m JPEG (`exportImage.jpg`), placed from its
        request box by `make_ortho.py`; it lines up with OSM within about 1 m.
    -   Card: the club's printed scorecard (`scorecard.jpg`,
        `scorecard-cover.jpg`); club photos look only.
-   **Water:** the three OSM ponds (hole 2; hole 5; holes 17 and 18), all
    red. No other water inside the boundary, and no unmapped channel in the
    DEM (the low cells are swales between dune mounds). Out of bounds is the
    OSM boundary (one polygon, no inner rings, holds every tee, green and
    pond); the driving range is out of bounds; no road crosses the course.
    Out of bounds within 25 m of play: hole 2 (21 m left of the fairway), hole
    5 (15 m, along the houses behind the pond), hole 8 (16-19 m left of the
    green), hole 9 (7 m left of the Blue tee box, 17-20 m left of the
    fairway). No dogleg corner is that close.
-   **Native areas:** the card's local rule plays all non-kept areas as
    lateral hazards. The game has no dry penalty area, so (developer) they are
    drawn as tawny dune grass and play as rough: `fescue_areas` =
    `proposed/native.geojson` from `make_native.py` (photo texture, 65 % of
    the course's rough).
-   **Trees:** 11,956 from the DOGAMI canopy model (3,103 inside the
    boundary), tallest 27.5 m, none in a fairway or a tee-shot line. 70 % have
    broad crowns, drawn as wind-shaped shore pine (the theme's broad-crown
    sprite), the rest as spruce and fir.

## Scorecard

Club printed scorecard (release `florence-data`, read 2026-10-24). Every row
adds up to its printed Out/In/Total; handicap is the men's row.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 4 | 3 | 4 | 5 | 3 | 4 | 36 | 4 | 3 | 5 | 4 | 4 | 4 | 4 | 3 | 5 | 36 | 72 |
| HCP | 5 | 17 | 15 | 9 | 13 | 1 | 3 | 11 | 7 | | 4 | 16 | 12 | 2 | 10 | 8 | 14 | 6 | 18 | | |
| Blue | 338 | 318 | 507 | 367 | 178 | 396 | 454 | 174 | 436 | 3168 | 407 | 163 | 550 | 421 | 366 | 384 | 325 | 176 | 496 | 3288 | 6456 |
| Built | 334 | 310 | 507 | 372 | 182 | 390 | 467 | 205 | 447 | 3214 | 401 | 159 | 552 | 418 | 357 | 385 | 325 | 180 | 488 | 3265 | 6479 |

Men's ratings/slopes: Black 6,877 yd 73.8/128, Blue 71.6/125, Rees 6,187 yd
70.1/123, White 5,972 yd 69.1/122, Jones 5,561 yd 67.2/116, Red 5,245 yd
65.6/114 (women: Jones 72.6/128, Red 70.9/121). Black, Rees, White, Jones and
Red are in `scorecard.csv`, not built. OSM's handicap tags match neither card
row; the card is used.

## Default tee

Blue (COURSE_BUILD.md 4.1: the card has a Blue set).

## The developer's calls

All 2026-10-24.

-   The standing defaults: Blue only, all water red, out of bounds = the OSM
    boundary, range out of bounds, fairway trees removed, wind 3-14 mph.
-   The native areas are drawn as dune grass and play as rough (the local
    rule is not modelled); no request to the design chat.
-   Hole 7 plays from its only tee box (467 yd, +2.9 %); the OSM line starts
    110 m behind it on a mown strip.
-   Hole 8 plays longer than the card, from its Black tee (205 yd against Blue
    174): there is no Blue box in OSM, the lidar or the photo.
-   New theme `sandpines` approved.
-   Logo: the Siuslaw River Bridge (option b; the developer liked it).
-   The 160 lidar trees on the lot south-east of the clubhouse (outside the
    boundary), cleared since the lidar flight, are dropped (`drop_trees`).

Course chat's calls (listed for the developer):

-   Four tee pads OSM tags as `golf=fairway` (the Black tees of 8 and 9)
    copied as tees.
-   Hole 11's long teeing ground (116-179 yd) tagged as its Blue box; s06's
    centroid rule had passed it over for the line start (+11.5 %).
-   The `trees_need_ortho` photo check is not used: apart from the cleared lot
    it flags sunlit edges of standing tree lines.

## New pipeline keys or theme

-   No new config key; no pipeline change (`make regress` not needed).
-   New theme `sandpines`: `assets-src/palettes/sandpines.json` (bentgrass
    greens, mown rough as `rough_band`, dune grass in F0-F2 as the rough,
    near-white sand) and `assets-src/trees_sandpines.py` (the `bandon` spruce
    and shore-pine shapes, the pines recoloured). Sheets
    `game/public/sprites/trees_sandpines*` (`build_assets.py --theme sandpines`).

## Open items

1.  **Native areas play as rough.** The card's local rule makes them lateral
    hazards; the game has no dry penalty area. Recommend leaving it unless
    the developer wants the design chat to add a staked "native" surface
    (a game change); the traced areas (`proposed/native.geojson`) are ready
    to become that surface.
2.  **Hole 8 plays 205 yd against the Blue 174** (the Black tee; no Blue box
    exists in OSM, the lidar or the photo). Recommend leaving it until
    someone who has played the course places the Blue tee (the tracing desk
    for hole 8 is still published).
3.  **Unverified history:** architect and year from Wikipedia and
    top100golfcourses.com. Recommend leaving it as written.
4.  **Greens with steep edges:** greens 1, 2, 6, 8, 12, 15, 17 and 18 have edge
    slopes of 3.8-5.3 % (the pins are 1.5 % or less within 3 m). Recommend
    playtesting before any change.

## Lessons

-   **DOGAMI `f=json` can fail where `f=image` works**, the reverse of Bandon.
    Give both links for each raster in the first request.
-   **The USGS 3DEPElevation `exportImage` is a good DTM fallback** in Oregon:
    one click, metres, no gaps across DOGAMI project seams.
-   **Check `logos.py` for the subject, not just the course id,** before
    proposing a logo: the first suggestion (a rhododendron) was already
    Eastmoreland's.
-   **A drought-year photo defeats colour rules.** Fairways measured as tan as
    the rough (green minus red 6 at the median); local texture separated the
    native grass from mown turf, and a majority vote over ~3 m turned the
    speckle into areas.
-   **Small `golf=fairway` squares at a hole line's start are tees.** Sorting
    fairways by area found four (57-119 m2).
-   **`trees_need_ortho` reads sunlit tree-line edges as gone trees.** On a
    course where the lidar postdates the course, look at what it flags before
    switching it on.
-   **The installed Chromium can be newer than the one Playwright expects**
    (`chromium_headless_shell-1243` here): point `executablePath` at it.
