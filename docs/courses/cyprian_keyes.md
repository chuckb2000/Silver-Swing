# Cyprian Keyes Golf Club (Championship 18)

Course id: `cyprian_keyes` (data folder `data/cyprian_keyes/`), branch `course/cyprian_keyes`.

## Build summary

Built overnight 2026-10-30/31 by course chats (one was stopped during the
in-game looks and another finished it). The Championship 18 is fully mapped in
OSM (hole lines, tees, greens, fairways, bunkers, hazards; no pins, so every
green has its centre pin). Ground from the USGS 3DEP 1 m DEM and trees from the
2021 USGS lidar (MA_CentralEastern_2021_B21, leaf-off), both from the same
project; the MassGIS 2023 15 cm orthophoto was used only for checking. Two tee
sets are built from the club's own printed card: Blue (the club's back tee,
default) and White. Theme `seekonk`. The club's 9-hole par-3 course shares the
one OSM boundary: its hole lines are dropped and its greens are wrong greens.
Every Blue hole is within 3 % of the card (6,548 yd built, 6,545 real, card
6,543); White is 6,059 built against 6,098, with hole 2 White at -3.1 %
accepted (no longer box mapped) and the others within 3 % after virtual-tee
moves. In-game look (2026-10-31, Blue, robot round on Normal): every hole's
tee shot and 17 greens (hole 6 holed from off the green) looked right; the
robot shot 72 with no penalties and no page errors. Tests on the branch:
course_play `-t cyprian_keyes` 11 passed; `npm test` and `npm run e2e` results
in the PR.

## Facts

-   **Location:** 284 East Temple Street, Boylston, Worcester County,
    Massachusetts, in rolling central-Massachusetts woods and wetlands along
    Sewall Brook, on the old Keyes homestead (1734). `state` MA. Course id
    `cyprian_keyes`.
-   **Design:** Mark Mungeam of Cornish, Silva & Mungeam; opened 11 August 1997
    (Wikipedia, golflink.com).
-   **UTM zone:** 19 N (EPSG:32619). World 1,536 x 1,792 m (origin 275046,
    4690100). Theme `seekonk`. Wind 1-9 mph.
-   **Data:** OSM Overpass export (2026-10-31); USGS 3DEP 1 m DEM tile x27y470
    and 2021 lidar tiles 19TBG274690, 276690, 274689, 276689 (flown spring 2021,
    leaf-off); MassGIS 2023 orthophoto (four 15 cm tiles, checking only); the
    club's scorecard image and pages. All in the release named in
    `data/cyprian_keyes/release.json` (`data-cyprian_keyes`), fetched by the
    GitHub Actions fetch workflow.
-   **Water:** all red (the card: "Red Stakes - Lateral Water Hazard"): the
    five OSM lateral hazards, seven ponds, wet meadows and a marsh mapped only as
    natural=water/wetland (`red_water_osm`), and Sewall Brook with its feeders as
    red channels from the DEM (`proposed/channels_lidar.geojson`). The wooded
    swamp along the brook (w86095496) stays woods with its trees. Out of bounds:
    outside the OSM boundary (way 309568600) and the driving range.
-   **Trees:** 28,885 lidar trees in the world (4,449 inside the boundary);
    conifers (white pine) from the leaf-off last-return share, the rest
    deciduous. 44 dropped on tees, a bunker and the wooded lateral hazards; 301
    on buildings.

## Scorecard

The club's printed Championship card
(cypriankeyes.com/images/documents/Championship-18-hole-Scorecard.jpg, fetched
2026-10-31); every row adds up to its printed total; men's handicap row.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 4 | 3 | 36 | 5 | 3 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 36 | 72 |
| HCP | 9 | 11 | 5 | 7 | 3 | 15 | 1 | 13 | 17 | | 8 | 18 | 10 | 6 | 2 | 4 | 16 | 14 | 12 | | |
| Blue | 354 | 383 | 528 | 500 | 417 | 215 | 390 | 420 | 172 | 3379 | 498 | 168 | 382 | 349 | 415 | 395 | 192 | 305 | 460 | 3164 | 6543 |
| Built | 353 | 382 | 521 | 491 | 419 | 218 | 387 | 423 | 170 | 3364 | 506 | 172 | 393 | 352 | 421 | 390 | 187 | 297 | 466 | 3184 | 6548 |
| White | 334 | 354 | 478 | 488 | 397 | 194 | 362 | 394 | 159 | 3160 | 461 | 131 | 359 | 325 | 391 | 370 | 165 | 288 | 448 | 2938 | 6098 |
| Built | 332 | 343 | 486 | 491 | 387 | 198 | 359 | 391 | 155 | 3142 | 455 | 128 | 356 | 324 | 395 | 370 | 163 | 290 | 436 | 2917 | 6059 |

Blue 72.7/139, White 71.0/129 (men). Not built: Green 5,595 (68.9/120),
Gold 4,850 (69.5/123), both in `scorecard.csv`. GolfLink, GolfPass and
OpenGolfAPI list a different, longer set (Black 6,871 74.4/136 and others,
other stroke indexes); it is not on the club's card and is not built.

## Default tee

Blue: the club's back tee; the developer's overnight call was the back tees and
Blue, and with Blue at the back, Blue and the next set forward (White).

## The developer's calls

Made overnight by the course chat under the developer's "make the call"
instruction (2026-10-31), all pending the developer's confirmation; full facts
and options in `data/cyprian_keyes/validation_report.md`:

1.  Tee sets Blue and White from the club's card (not the third-party Black set).
2.  The 9-hole par-3 course left out (its greens are wrong greens; its ground
    stays in play inside the shared boundary).
3.  Hole 11 White tee box w1256012343 assigned (127 yd vs card 131).
4.  Hole 2 White -3.1 % accepted.
5.  All water red; the wooded swamp stays woods; brook channels from the DEM.
6.  Default aim skipped in `checks.json` on 2 and 4 (OSM bend points).
7.  Theme `seekonk` instead of the standing `bayside`.
8.  Logo "The Deacon's Key" (original; an old key with a golf ball in its bow).
9.  A tight group of 38-50 m lidar "trees" east of the course, outside play,
    left in.
10. Wind 1-9 mph.

## New pipeline keys or theme

None. Existing keys only (`red_water_osm`, `flatten_wetlands: false`,
`driving_range_is_ob`, `trees_off_fairways_m`, `laz.leaf_off`); existing theme
`seekonk`.

## Open items

1.  Confirm the tee sets (club card Blue/White vs the third-party Black set).
    Recommendation: keep the card.
2.  Confirm the par-3 course stays in play as wrong greens. Recommendation: keep.
3.  Hole 11 White tee and hole 2 White -3.1 %. Recommendation: accept both.
4.  Default aim on 2 and 4 runs through the dogleg corner / into the hazard
    beside the 4th's landing area; move the bend points if it bothers in play.
5.  No golf=pin on any green: centre pins plus the game's pin sheet.

## Lessons

-   One OSM boundary covering two courses (the Championship 18 and a par-3
    nine): drop the second course's hole lines in `edits.json`; its greens
    become wrong greens automatically.
-   OSM "lateral water hazards" that are really wooded wetlands hold tall lidar
    trees; they are dropped on playing surfaces (spec 5.4), so check the drop
    list for clusters before accepting.
-   Port clashes on the preview stop an in-game look with "Target page closed":
    check the preview log before reading the look script's error.
-   The course list's labels are lowercase ("massachusetts", "cyprian keyes",
    tee "blue"): a look script given capitalised names times out on the first tap.
