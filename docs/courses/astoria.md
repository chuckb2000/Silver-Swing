# Astoria Golf & Country Club

Course id: `astoria` (data folder `data/astoria/`), branch `course/astoria`.

## Build summary

In progress (2026-10-24). Intake done: course located on the OSIP 2024 photo,
scorecard collected from third-party sources (no club card), facts checked, new
theme `astoria` and logo drawn. Waiting on the OSM export and the DOGAMI
bare-earth and canopy rasters (data/astoria/DATA_REQUEST.md); nothing is built yet.

## Facts

-   **Location:** 33445 Sunset Beach Lane, Warrenton, Clatsop County, OR
    (Daily Astorian; stymie.golf gives a Gearhart mailing address). On the
    Clatsop Plains between Sunset Lake (west) and US 101 (east), south of Camp
    Rilea; centre about 46.1051, -123.9244 (OSIP 2024 photo). `state` OR.
    Private club.
-   **Design:** club founded June 1923 by Charles Halderman (Haldeman in the
    Daily Astorian); course opened June 1924, laid out by George Junor, who chose
    north-south fairways in the hollows between the dune ridges over an
    east-west routing (Top 100 Golf Courses; GolfPass, stymie.golf and golfn
    name Junor, 1924). No renovation found.
-   **Notable:** ranked 14th in Oregon (Top 100 Golf Courses). Hosts the Oregon
    Coast Invitational, Oregon's second-oldest tournament (first played at
    Gearhart in 1910), match play finals at Astoria (Seaside Signal, 2022).
-   **Video games:** a GSPro (golf simulator) version exists; its course card is
    in the release.
-   **UTM zone:** 10N (EPSG:32610). World provisional 1,024 x 1,280 m
    (x0 428048, y0 5105496), to be reset from the OSM boundary. Theme `astoria`.
    Wind 3-14 mph (open coast, standing default).
-   **Data:** OSIP 2024 orthophoto, 1 m (release `astoria-data`). Pending: OSM
    (Overpass), DOGAMI DTM and CHM mosaics (most likely the 2008-09 North Coast
    flight, as at Gearhart), OSIP 2024 at 0.5 m.
-   **Water:** to check. Sunset Lake lies just west of the course; the GSPro
    card says two holes carry water from the back tees; opengolfapi lists no
    water hazards.
-   **Trees:** to build from lidar, each crown checked against the 2024 photo.

## Scorecard

stymie.golf, read 2026-10-24 (third party, unverified). Every row adds up to its
totals; stroke index is a clean 1-18.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 5 | 36 | 3 | 5 | 5 | 4 | 4 | 4 | 4 | 3 | 4 | 36 | 72 |
| HCP | 9 | 13 | 11 | 17 | 5 | 3 | 7 | 15 | 1 | | 16 | 6 | 10 | 2 | 4 | 14 | 12 | 18 | 8 | | |
| Silver | 378 | 271 | 373 | 180 | 423 | 299 | 396 | 354 | 499 | 3,173 | 117 | 528 | 471 | 410 | 438 | 268 | 342 | 168 | 406 | 3,148 | 6,321 |

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

## Default tee

Silver (6,321 yd): the card has no Blue, and Silver is the set closest to 6,300
(COURSE_BUILD.md 4.1).

## The developer's calls

None yet.

## New pipeline keys or theme

-   **Theme `astoria`** (new, the course chat's own; the brief allowed it):
    `assets-src/palettes/astoria.json`, `assets-src/trees_astoria.py`,
    `game/public/sprites/trees_astoria.*`. Colours from the 2024 photo: the rough
    on the ridges drawn as warm tawny dry grass (F0-F2) with a 2 m mown band
    beside the fairways (`rough_band_m`, existing key); fairways a cool green;
    grey-white sand; dark tannin water for Sunset Lake; near-black Sitka spruce;
    broad crowns drawn as wind-sheared shore pine, every third as an old
    "flagged" pine with its branches on the lee side (flair). No `fescue_areas`:
    the summer photo shows all the rough dry, not only the ridge tops.
-   **Logo:** a Roosevelt elk bull on a dune ridge with a wind-bent shore pine
    (`assets-src/course_logos/astoria.py`).
-   No pipeline change.

## Open items

1. **Scorecard is third-party.** Recommendation: use stymie.golf's Silver set;
   a photo of the club's printed card would settle hole 12 (471 vs 456) and the
   stroke index.
2. **Data:** OSM, DTM and CHM not yet in the release (DATA_REQUEST.md).

## Lessons

-   **Find the course on the photo before anything else.** The release's 1 m
    photo of the whole scouting box located the course in one look, 600 m from
    the scout's guess, and let the corrected (smaller) download box be written
    before any lidar arrived.
-   **The scouting's links used `f=image` and 4 x 3 km boxes**, both known to
    fail (COURSE_LESSONS 13, 23). Check a scouting's links against the lessons
    before handing them to the developer.
