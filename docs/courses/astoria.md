# Astoria Country Club

Course id: `astoria` (data folder `data/astoria/`), branch `course/astoria`.
The club is Astoria Golf & Country Club; the game calls it "Astoria Country
Club" (developer, 2026-10-24: the full name is 27 characters, too long for a card).

## Build summary

Built 2026-10-24 from OSM (every green, tee box, fairway and bunker, but no hole
lines or pins), the DOGAMI bare-earth and canopy mosaics (most likely the
2008-09 North Coast flight) and the OSIP 2024 photo. The routing is the course
chat's, worked out from the Silver card and the course's descriptions; the hole
lines come from the mapped tees, fairways and greens (`make_holes.py`). Silver
tees (the card has no Blue). A new theme of its own, `astoria`, and an elk logo.
The 9th tee across Neacoxie Creek and the creek in front of it are brought inside
the boundary (developer). 17 holes within 3 % of the card after s06's tee moves;
hole 17 is a flag (-6.4 %). On the branch: 905 unit tests pass plus Astoria's 15
(player.test.ts fails until the design chat adds the course to the daily
rotation, as for every new course).

## Facts

-   **Location:** 33445 Sunset Beach Lane, Warrenton, Clatsop County, OR (Daily
    Astorian; stymie.golf gives a Gearhart mailing address). On the Clatsop Plains
    between Sunset Lake (west) and US 101 (east), south of Camp Rilea; centre about
    46.1051, -123.9244 (OSIP 2024 photo; the scouting's estimate was 600 m west).
    `state` OR. Private.
-   **Design:** club founded June 1923 by Charles Halderman (Haldeman in the Daily
    Astorian); course opened June 1924, laid out by George Junor, who chose
    north-south fairways in the hollows between the dune ridges over an east-west
    routing (Top 100 Golf Courses; GolfPass, stymie.golf and golfn name Junor,
    1924). No renovation found.
-   **Notable:** ranked 14th in Oregon (Top 100 Golf Courses). Hosts the Oregon
    Coast Invitational, Oregon's second-oldest tournament (first played at
    Gearhart in 1910), match play finals at Astoria (Seaside Signal, 2022). A GSPro
    (golf simulator) version exists; its course card is in the release.
-   **UTM zone:** 10N (EPSG:32610). World 1,280 x 1,280 m (x0 427838, y0 5105488):
    the OSM boundary's box (831 x 938 m) + about 120 m, rounded to 256 m chunks.
    Theme `astoria`. Wind 3-14 mph (open coast).
-   **Data** (GitHub release `astoria-data`, also committed in `raw/`;
    `release.json`): Overpass export of x 427800-429400 / y 5105200-5107000
    (`export.1.geojson`); DOGAMI `DIGITAL_TERRAIN_MODEL_MOSAIC` and
    `CANOPY_HEIGHT_MODEL_MOSAIC` at 1 m, feet (`exportImage` with `f=json`;
    `_ags_8efa33d3…tif`, `_ags_6e845640…tif`); OSIP 2024 at 0.5 m as JPEG
    (`_ags_e53832b4…jpg`), made into `raw/osip2024_05m.tif` by `make_ortho.py`.
    The 1 m photos of the scouting box (`astoria.jpg`, `exportImage.jpg`), the
    GSPro card and five photos are look-only.
-   **Water:** all red. Sunset Lake (r20068414) along the 4th green and the 5th;
    the Neacoxie Creek ponds along the east side (w426952616-618, w426952615,
    w34066511), `red_water_osm`. No water lies inside the OSM course: the GSPro
    card's "two holes require a water carry from the back tees" are the 5th (from
    the lake bank) and the 9th (across the creek).
-   **Out of bounds:** the OSM boundary (w285375235) joined to the 9th tee and the
    creek it carries (`make_boundary.py`); US 101 stays out. The driving range (the
    north field) is not mapped and plays as rough.
-   **Trees:** 4,357 from the DOGAMI canopy model, 279 on the course, after 650
    lidar crowns not standing in the 2024 photo were dropped (`trees_need_ortho`).
    Broad crowns (most of them) are drawn as shore pine, narrow ones as Sitka
    spruce. No tree had to come out of a tee shot (s06b).

## Scorecard

stymie.golf, read 2026-10-24 (third party, unverified). Every row adds up to its
totals; stroke index is a clean 1-18.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 5 | 36 | 3 | 5 | 5 | 4 | 4 | 4 | 4 | 3 | 4 | 36 | 72 |
| HCP | 9 | 13 | 11 | 17 | 5 | 3 | 7 | 15 | 1 | | 16 | 6 | 10 | 2 | 4 | 14 | 12 | 18 | 8 | | |
| Silver | 378 | 271 | 373 | 180 | 423 | 299 | 396 | 354 | 499 | 3,173 | 117 | 528 | 471 | 410 | 438 | 268 | 342 | 168 | 406 | 3,148 | 6,321 |
| Built | 376 | 273 | 368 | 182 | 434 | 293 | 397 | 360 | 495 | 3,178 | 114 | 532 | 475 | 410 | 436 | 264 | 341 | 157 | 407 | 3,136 | 6,314 |

Men's ratings/slopes (stymie.golf): Tournament 6,550 72.3/127; Black 6,479
71.9/127; Silver 6,321 71.2/127; Silver/Gold 5,966 69.7/122; Gold 5,753
68.7/121; Green 5,541 67.5/118. Women's: Silver 77.3/134, Gold 73.9/128, Green
72.7/124. Every set is in `scorecard.csv`; only Silver is built.

Conflicts between sources:
- GolfPass: Silver 6,331 (70.7/121), Tournament par 71 and Black par 70 (hole 12
  par 4 from the back), Tournament hole 12 454 yd; older ratings.
- GSPro card (release): its "Blue" 6,298 matches Silver within 2 yd on 16 holes;
  hole 12 456 (stymie 471). Stroke index differs on holes 1, 5, 7 (7, 9, 5).
- opengolfapi: Tournament only, par 71, a different stroke index throughout.

## Routing

OSM has no hole lines. Greens lettered on `data/astoria/proposed/osm_labelled.jpg`,
in play order: H E M J S L C D P W I U K T N F G Q. Each hole's tee boxes stand
beside the previous green, every tee-to-green distance fits the Silver card (all
18 within 3.4 % from the box centres) and the pars follow. The course's
descriptions agree: holes 2, 4, 8 and 17 are the only east-west holes (GolfClubAtlas:
the four that "run the other way"); 3 runs down the narrow valley from a tee on the
left ridge to a small green; 5 doglegs right with water on the line (Sunset Lake);
9 runs beside US 101 with a swamp to drive over; 10 is the par 3 by the clubhouse
and putting green; 15 has the smallest green. Greens A and B (by the range), O and
R (by the clubhouse) and V (south) are practice greens.

## Default tee

Silver (6,321 yd): the card has no Blue, and Silver is the set closest to 6,300
(COURSE_BUILD.md 4.1).

## The developer's calls

1. 2026-10-24: play the 5th from the box on the Sunset Lake bank and the 9th from
   the box across Neacoxie Creek ("they look fun"): both were already s06's choice
   and are pinned with `hole`/`tee_set` tags in `edits.json`.
2. 2026-10-24: the creek between the 9th tee and its fairway is in bounds
   (`make_boundary.py`: the tee box and the creek in front of it, +0.6 ha; the
   creek's ponds stay red penalty areas; US 101 stays out of bounds).
3. 2026-10-24: the course is "Astoria Country Club" in the game.
4. Scouting brief: a theme of its own and the logo drawn from the scouting's idea,
   without asking.

The routing, the card hole and everything in "Open items" are the course chat's
calls.

## New pipeline keys or theme

-   **Theme `astoria`** (new, the course chat's own): `assets-src/palettes/astoria.json`,
    `assets-src/trees_astoria.py`, `game/public/sprites/trees_astoria.*`. Colours from
    the 2024 photo: the rough on the ridges drawn as warm tawny dry grass (F0-F2) with
    a 2 m mown band beside the fairways (`rough_band_m`, existing key); fairways a cool
    green; grey-white sand; dark tannin water for Sunset Lake; olive-green ground off
    the course so out of bounds reads apart from the rough. Trees: near-black Sitka
    spruce for narrow crowns; broad crowns as wind-sheared shore pine, every third
    (index mod 3 = 2) an old "flagged" pine with its branches on the lee side (flair).
    No `fescue_areas`: the summer photo shows all the rough dry, not only the ridges.
-   **Logo:** a Roosevelt elk bull on a dune ridge with a wind-bent shore pine
    (`assets-src/course_logos/astoria.py`); elk herds graze the Clatsop Plains, and
    Gearhart (8 km south) has the shipwreck. Shorty's has a spotted fawn, a different
    animal and picture.
-   **Course card:** greens 4, 3, 15, 9 (`assets-src/cards/astoria.json`).
-   **Existing keys used:** `red_water_osm`, `trees_need_ortho` (with `ortho`),
    `trees_off_fairways_m`, `rough_band_m`, `green_tilt`.
-   **Course scripts:** `make_holes.py` (hole lines and pins), `make_boundary.py`
    (the 9th tee), `make_ortho.py` (the photo as a GeoTIFF, run by `make fetch`).
-   No pipeline change.

## Open items

Details in `data/astoria/validation_report.md`.

1. **Routing** is the course chat's. Recommendation: keep; any hole can be corrected
   in the tracing desk.
2. **Hole 17** is a flag: 157 yd against 168 (-6.4 %) from the back of box 13. The
   one lidar pad farther back is under trees in the 2024 photo. Recommendation:
   accept.
3. **Young trees are missing:** pines planted or under 4 m in 2008-09 (stands by the
   4th green and the 17th tee, single pines along 12, 13 and 16) have no lidar crown.
   A colour rule on the photo couldn't tell the darkest crowns from shadows.
   Recommendation: a click-to-add tree pass over the photo by the developer, with a
   new optional s05 key.
4. **Green shaping:** the 3rd (capped at 2 %) and 16th have no undulations so each
   gets three pin positions; the 8th's pin is at its green's deepest point. Greens
   1, 5, 14 and 18 reach 4.8-5.0 % at their steepest. Recommendation: keep.
5. **The driving range is unmapped** and plays as rough, 150 m or more from any hole.
   Recommendation: accept.
6. **Scorecard is third-party.** Recommendation: a photo of the club's printed card
   (settles hole 12, 471 vs 456, and the stroke index).
7. **Request to the design chat:** s05's preview drawing crashes on a `golf=tee`
   mapped as a point (`part.exterior` on a Point). The point here (node 10711517820)
   is dropped in `edits.json`. The smallest fix: skip non-polygons in that loop.
   **Fixed** (design chat, 2026-10-24, `fix/rebuilds`): the preview skips
   non-polygons. The drop stays, since the point is a marker, not a tee box.

## Lessons

-   **Find the course on the photo before anything else.** The release's 1 m photo of
    the whole scouting box located the course at once, 600 m from the scout's guess,
    and let a corrected, smaller download box go out before any lidar.
-   **Check a scouting's links against COURSE_LESSONS before handing them over.** The
    scouting asked for 4 x 3 km DOGAMI exports with `f=image`, which failed; the
    1.6 x 1.8 km box with `f=json` worked the first time (Sandpines found the
    reverse, so give both).
-   **A routing with no OSM hole lines can come from the card alone** when every green
    and tee box is mapped: pair each fairway with the green at its end, then chain the
    holes so each tee sits beside the previous green and fits the card. Here one
    ordering fitted all 18 holes within 3.4 %, and the course's written descriptions
    (which holes run east-west, which hole runs beside the highway) confirmed it.
-   **A tee outside the OSM boundary** (across a creek) can be joined to it with the
    hull of the box and the nearby boundary edge, less a strip along any road; ask
    whether the ground between should be in play.
-   **`trees_need_ortho` takes out what is gone, not what has grown.** Old lidar misses
    young trees, and on a dark summer photo the darkest crowns and their shadows share
    a colour (crowns B-G about -12, shadows +7 on average, but the darkest pines are
    bluish too). Plan a manual pass for missing trees rather than a colour rule.
-   **`pins.test.ts` finds small, undulating greens.** A 210-270 m2 green with two
    random undulations got only two pin positions; `green_tilt` with `bumps: 0` (and a
    2 % cap on the smallest) fixed it. A crescent green's centroid can sit 3 m from
    its edge: put the pin at the green's deepest point.
-   **Playwright's `webServer` runs in the config's folder.** A look script kept under
    `playwright-report/` served a blank page until `cwd: '../..'`.
-   **`kill` by a pattern matched my own shell again** (its command line held the
    pattern). Kill by PID found with a pattern that can't match itself, or not at all.
