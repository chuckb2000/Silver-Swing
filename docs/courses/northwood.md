# Northwood Golf Club

Course id: `northwood` (data folder `data/northwood/`), branch `course/northwood`.

## Build summary

Built 2026-11-13 by a course chat (branch `course/northwood`). Nine holes, White tees
(the longest set), par 36, **2,814 yd built** against 2,893 on the card (-2.7 %).
Every hole is mapped in OSM; 3,896 lidar trees, about half of them coast redwoods up to
74 m. A new theme, `redwoods`, and a new logo. Holes 4 and 8 measure 10-11 % short of the
card (their White tees aren't mapped): built as measured, waiting on the developer.

## Facts

-   **Location:** 19400 Highway 116, Monte Rio, Sonoma County, California: a
    nine-hole course on a flat river terrace inside a bend of the Russian River,
    among second-growth coast redwoods, with houses along the roads on three
    sides. `state` CA. Course id `northwood`.
-   **Design:** Alister MacKenzie with Robert Hunter, 1928, built for the Bohemian
    Club (its grove is just south, across the river); conceived by Jack Neville.
    Sources: golf.com "Best Course You've Never Heard Of: Northwood" (Patrick
    Koenig); GolfNow / teeoff.com quick facts (year 1928, MacKenzie and Hunter).
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 768 m (x0 500032, y0
    4258528). Theme `redwoods` (new). Wind 1-7 mph.
-   **Data:** OpenStreetMap (Overpass export through the fetch workflow,
    2026-11-13; every hole mapped: lines, tees, fairways, greens, bunkers, pins);
    USGS 3DEP 1 m DEM, project CA_NorthernCA_B22 (tile x50y426, published
    2026-03-24); USGS 3DEP lidar point cloud, same project (tiles 10SEH0058, 10SEH0059, 10SEH0159; class 1, vegetation unclassified), from rockyweb.usgs.gov; 10SEH0158 (the world's south-east 56 m strip, river and hillside) was refused (HTTP 429): no trees there. Originals in the release
    `data-northwood` (`data/northwood/release.json`); the DEM clip is also in git.
-   **Water:** none inside the boundary. The Russian River wraps round three sides beyond the roads and houses: out of bounds (it is outside the course boundary). Standing default: any water would be red.
-   **Trees:** from the lidar (class 1 highest returns minus the DEM): 3,896 trees, median 21.5 m, max 74 m. Typed by crown shape: nearly every tree over 30 m is narrow (conifer: drawn as coast redwood), most under 20 m broad (bay laurel, bigleaf maple, tanoak). 178 tops on building footprints dropped, 9 in fairways, 3 on tee shots (s06b), and 6 by `drop_trees` (below).

## Scorecard

Third-party, unverified (no official card online that the chat could reach),
read 2026-11-12: GreensKeeper.org and golfingrecord.com, which agree with each
other and with the 2,893-yd total golf.com, GolfLink and GolfNow give.
GolfPass (course 2688) differs on White 1, 2, 4, 5 and 9 (290, 383, 292, 464,
533; 2,888). Red and Gold agree everywhere. Stroke index: golfingrecord's
9-hole index.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 4 | 5 | 4 | 4 | 3 | 5 | 36 |
| HCP | 6 | 4 | 9 | 5 | 3 | 7 | 2 | 8 | 1 | |
| White | 293 | 382 | 145 | 291 | 469 | 280 | 381 | 120 | 532 | 2,893 |
| Red | 279 | 309 | 117 | 272 | 380 | 258 | 359 | 103 | 429 | 2,506 |
| Gold | 223 | 278 | 74 | 192 | 309 | 182 | 284 | 89 | 352 | 1,983 |
| Built | 288 | 377 | 141 | 263 | 463 | 279 | 366 | 106 | 532 | 2,814 | |

Ratings (18-hole, GreensKeeper): White 67.8 / 114, Red 69.0 / 121, Gold
60.0 / 100. Red and Gold are on `scorecard.csv` but not built. Stymie lists an
18-hole "Blue 6,040, par 71", found nowhere else.

## Default tee

White, the longest set on the card (4.1 standing default).

## The developer's calls

None yet. Asked 2026-11-13 (batch 1), unanswered at hand-off:
-   holes 4 and 8 (FAIL): (a) play from the back of the mapped boxes (~270 / ~113 yd),
    (b) trace the White tees from screenshots, (c) as measured. Built as (c); my
    recommendation was (a). (a) is two tags in edits.json (`hole`, `tee_set=White` on
    w1009249189 and w1009249193) and a checks.json change.
-   the scorecard version (GreensKeeper/golfingrecord vs GolfPass): built from the first;
    a photo of the card settles it and whether a Blue set exists.
-   hole 5 par: OSM says 4, every card source 5; built as 5.

## New pipeline keys or theme

-   **Theme `redwoods`** (new; the developer asked for a theme of its own):
    `assets-src/palettes/redwoods.json` (pnw keys plus F0-F2, a red-brown
    redwood duff for woods and out-of-bounds woods; cool, shaded turf greens;
    jade river; dark shingle roofs) and `assets-src/trees_redwoods.py`: coast
    redwoods (mature: a straight, flared, fluted cinnamon trunk bare for its
    lower part under a narrow column of drooping sprays, the trunk showing
    between them; young: sprays almost to the ground, pointed top) for the
    conifers, and bay laurel, bigleaf maple and tanoak for the broad crowns.
    Sprites: `python3 assets-src/build_assets.py --theme redwoods`.
-   No new config keys.
-   Logo: `assets-src/logo_concepts/northwood/concept1.src.svg`, "The Foot of the
    Giant" (`assets-src/course_logos/northwood.py`).

## Open items

1. **Hole 4 (White): 263 yd vs 291 (-9.7 %).** The only mapped tee (w1009249189, a 24 m box
   in a corner of the property) is shorter than the card's Red (272). Accepted in
   checks.json pending the developer.
2. **Hole 8 (White): 106 yd vs 120 (-11.3 %).** The mapped boxes match Red (103) and Gold
   (89); the White box isn't in OSM. Accepted in checks.json pending the developer.
3. **Scorecard unverified** (third-party sources disagree on White 1, 2, 4, 5, 9).
4. **Hole 5 par**: OSM par 4, card par 5 (built 5).
5. Holes 3 and 7 are 3-4 % short after moving the virtual tee in its box (flags, accepted
   by the standing defaults).
6. **Trees removed for play** (`drop_trees`, each with its reason; the developer may put any
   back): a 53 m redwood clump over the 3rd's tee shot 48 m out (the game's 8-iron clipped
   it; s06b's check didn't), and five redwoods just south of greens 3, 6 (three) and 8,
   which in the 3/4 view covered those greens and left fewer than three hole locations
   (`pins.test.ts`). Hole 3's green also has no random undulations (`green_tilt`), for the
   same reason. `tee_shot_margin_m` 0.5 as at Stone Creek.
7. Tree species are inferred from crown shape (no leaf-off imagery; NAIP couldn't be listed
   through the TNM API).
8. The world's south-east 56 x 472 m strip (lidar tile 10SEH0158 refused) has no trees.

## Lessons

-   **USGS lidar comes from rockyweb.usgs.gov at about 3 MB/min** (50 min a tile) and it
    answers 429 when pushed; the DEM is on S3 and fast, the LPC isn't (the S3 path 404s).
    Ask only for the tiles the world needs (`url` items per tile, course tiles first), and
    set the world's edge on a DEM/lidar tile edge + 32 m (s00 reads the world + 32 m) to
    save a tile. A run's failed tile is retried by re-running the workflow
    (`gh api -X POST .../actions/runs/<id>/rerun`).
-   **Lidar whose CRS is in an EVLR** (this project): `intake.py laz --keep-evlrs`, or the clip
    has no CRS and `intake check` fails.
-   **Very tall trees cover greens in the 3/4 view.** 50-70 m redwoods just south of a green
    hide it from `hidesPoint`, and `pins.test.ts` finds too few hole locations; the fix was
    dropping the few that covered most of the green. `max_tree_h_m` 80 in checks.json for
    real 65-74 m redwoods.
-   The game's tee-shot test can catch a crown s06b passes on a par 3 (wide merged crowns):
    `tee_shot_margin_m` didn't help; a `drop_trees` entry did.
