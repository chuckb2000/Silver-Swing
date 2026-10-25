# Silvies Valley Ranch (Craddock, Hankins and Chief Egan)

Course id: `silvies` (data folder `data/silvies/`), layouts `silvies_craddock`,
`silvies_hankins` and `silvies_chief_egan`, branch `course/silvies`.

## Build summary

Built 2026-10-25 by a course chat following docs/COURSE_BUILD.md. Three courses on one
ranch, built as three layouts of one world (COURSE_BUILD.md 3.5) and grouped as "Silvies
Valley Ranch" on the course list:
- **Craddock and Hankins** are Dan Hixson's reversible pair: the same fairways played both
  ways, 27 greens between them (9 shared).
- **Chief Egan** is the nine-hole short course round the pond east of the 18th.

OSM maps the Craddock routing (18 hole lines starting at the Challenge tees), every green,
fairway and bunker, but only 3 tee boxes and no pins. The Hankins routing comes from the
club's map (each hole ending on the OSM green the map and GolfClubAtlas name), and Chief
Egan from its map fitted to its nine OSM greens. The developer marked every back tee in
the tracing desk and then the tee box round it, so every tee stands on a tee box.

Data: DOGAMI bare-earth DTM (the 2023 OR_SouthEast_6_D22 flight), the 2020 Upper John Day
lidar points (NOAA) for trees, and the OSIP 2024 orthophoto. Tees are the club maps' back
sets:
- Craddock Challenge: 7,196 yd built against 7,170;
- Hankins White: 6,965 against 7,075;
- Chief Egan White: 867 against 875.

No hole is over 8 %. The world holds 3,063 lidar trees inside the boundary and 15,865
sagebrush bushes from the photo. The course has its own theme, `silvies` (high desert),
and a goat-caddie logo. One new pipeline key, `gorse.extra_areas` (default none). The
course test has 36 checks (`game/tests/unit/silvies.test.ts`); every hole of all three
courses was looked at in the game (tee, overview, approach, 6 m and 2.5 m putts), with
the trees and bushes in. The Chief Egan 6 green is the developer's trace.

## Facts

-   **Location:** 10000 Rendezvous Lane, Seneca, Grant County, Oregon. A working cattle and
    goat ranch of about 140,000 acres in the Blue Mountains, about 4,700 ft up (DTM
    1,402-1,518 m), ponderosa pine and juniper over sagebrush steppe, the Silvies River and
    Camp Creek below. `state` OR.
-   **Design:** Dan Hixson (Bandon Crossings). Opened summer 2017; the owners asked for a
    fully reversible course after Hixson explained the Old Course's reversed routing
    (GolfPass 2017; golf.com). The ranch also has McVeigh's Gauntlet, 7 holes over extreme
    terrain played with goat caddies, which is not built here. GOLF's Top 100 Courses You
    Can Play, no. 59 (2024-25).
-   **UTM zone:** 11N (EPSG:32611). World 2,048 x 2,048 m, origin (339997, 4879339): the
    OSM boundary is 2,004 x 1,710 m, so the 2,048 m limit binds east-west. Theme
    `silvies`. Wind 1-7 mph.
-   **Data** (originals in the GitHub release `silvies-data`; `make fetch NAME=silvies`
    puts them in `raw/` via `release.json`):
    -   OSM Overpass export 2026-10-25, clipped to the world + 300 m by `clip_osm.py`.
    -   DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC, 1 m, feet.
    -   OSIP 2024 orthophoto, 0.5 m, four JPEG quarters placed by their request boxes
        (`make_ortho.py`).
    -   NOAA Data Access Viewer job J1476256: the 2019-2020 OLC Upper John Day lidar, flown
        11 August 2020. NAD83(2011) Oregon North metres, classes 1 and 2 only, class 1
        used. One 689 MB LAZ, not in git.
    -   The club's four hole maps with yardages, in `reference/`.
    -   The Chief Egan 6 green: traced by the developer in the tracing desk over the OSIP
        photo, 172 m² (the OSM outline was 154 m² and held too few hole locations).
    -   The DOGAMI canopy mosaic is empty over the course and is not used.
-   **Water** (all red, standing default):
    -   the two OSM ponds: the irrigation pond by the Craddock 12th tee and the Chief Egan
        pond;
    -   the small creek through Chief Egan: 2 m wide, from the DEM channel, running into
        the pond (developer: small, connected to the lake).
    -   OSM's Owens Ditch on the south edge is not in play. The orange-hatched band by the
        Craddock 9th green is a shrub thicket, not water (developer).
    -   Out of bounds: outside the OSM boundary grown 30 m round Craddock play (approved).
    -   The 2.2 ha practice strip by the lodge stays in play (developer: no need to make it
        OB). McVeigh's Gauntlet greens and other practice greens are wrong greens.
-   **Trees:** 11,116 lidar crowns in the world, 3,063 inside the boundary, 3,379 drawn as
    ponderosa pine (narrow crowns) and the broad crowns as western juniper (a drawing
    choice). Dropped: 20 on playing surfaces, 14 on roofs, 4 in the Craddock 9 thicket.
    s06b removed none for tee shots. The NOAA clip stops at US 395, about 60 m short of the
    world's north edge (scenery only). Sagebrush: 15,865 bushes where the photo shows sage
    (`gorse` key, colour rule tuned to grey-green sage), plus the thicket by the Craddock
    9th green filled with bushes (`gorse.extra_areas`). Native ground (89 % of the rough)
    is drawn tawny from the photo (`fescue_areas`, `make_native.py`).

## Scorecards

All third party, unverified against printed cards; every row adds up.

**Craddock** (GolfPass, read 2026-10-25). Par from the club's Craddock map: hole 1 par 5
and hole 5 par 4, par 71. GolfPass has both par 5 (72); OSM has 1 par 4 and 5 par 5. The
developer chose the map, 2026-10-25.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 4 | 35 | 3 | 4 | 3 | 5 | 5 | 4 | 4 | 4 | 4 | 36 | 71 |
| HCP | 14 | 10 | 18 | 17 | 12 | 3 | 2 | 5 | 4 | | 6 | 1 | 8 | 13 | 11 | 15 | 7 | 16 | 9 | | |
| Challenge | 555 | 355 | 475 | 125 | 520 | 405 | 260 | 445 | 495 | 3635 | 205 | 445 | 190 | 550 | 570 | 315 | 410 | 490 | 360 | 3535 | 7170 |
| Built | 555 | 360 | 469 | 122 | 521 | 408 | 262 | 426 | 496 | 3619 | 207 | 448 | 194 | 546 | 608 | 323 | 410 | 484 | 357 | 3577 | 7196 |

Other sets (in `scorecard_craddock.csv`, not built): White 7,035 (71.9/120), White/Grey
6,600, Grey 6,340 (68.6/118), Grey/Black 5,820, Black 5,560 (64.9/109), Black/Blue 4,984,
Blue 4,533. Challenge has no rating. The club map's three columns match Challenge, Grey and
Black, except holes 1 and 9 (map 490 and 425 against Grey 455 and 350) and 6 (345 against
Black 325).

**Hankins** (GolfPass, read 2026-10-25; the club map agrees except that its hole 3 row
repeats hole 2). Par 72 (GolfPass's tee table says 73).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 5 | 4 | 5 | 4 | 3 | 4 | 4 | 36 | 4 | 4 | 4 | 3 | 5 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 9 | 17 | 3 | 13 | 7 | 1 | 15 | 11 | 5 | | 4 | 16 | 8 | 18 | 10 | 14 | 2 | 12 | 6 | | |
| White | 415 | 150 | 590 | 370 | 550 | 465 | 200 | 410 | 500 | 3650 | 445 | 305 | 445 | 140 | 505 | 175 | 490 | 330 | 590 | 3425 | 7075 |
| Built | 414 | 150 | 581 | 366 | 540 | 460 | 197 | 389 | 495 | 3592 | 446 | 303 | 441 | 143 | 505 | 171 | 478 | 329 | 558 | 3374 | 6965 |

White 71.8/120. Others (in `scorecard_hankins.csv`, not built): Goat 8,000, Pink 7,250
(its hole 8, 465, is longer than White's 410), White/Grey 6,575, Grey 6,280 (68.1/115),
Grey/Black 5,705, Black 5,335 (63.7/102).

**Chief Egan** (the club's map and GolfPass, the same 875 yd). Par from the map: holes 3
and 6 par 4, par 29; GolfPass lists every hole par 3. Handicaps from GolfPass. One set, no
rating.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Par | 3 | 3 | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 29 |
| HCP | 7 | 3 | 4 | 9 | 1 | 8 | 2 | 5 | 6 | |
| White | 70 | 100 | 95 | 120 | 110 | 90 | 105 | 85 | 100 | 875 |
| Built | 69 | 98 | 93 | 118 | 110 | 90 | 102 | 90 | 97 | 867 |

## Default tee

The back set on each club map (developer, 2026-10-25, instead of the 6,300 yd default):
Craddock Challenge, Hankins White, Chief Egan White.

## The developer's calls (2026-10-25)

-   Build Craddock and Hankins, and Chief Egan ("would be fun to have"). McVeigh's Gauntlet
    not built.
-   The club maps' back tees. Every tee on a tee box. The developer marked all 45 tees in
    the tracing desk, then drew or confirmed the box under the 17 marks of their own; the
    28 pads pre-filled from OSM and lidar were accepted unchanged.
-   The Craddock pars and card as recommended: map pars, GolfPass yardages.
-   Holes 2 and 16: the club map puts the tees where the card's yardages fit; the OSM line
    starts were wrong, and the lines start on the developer's tees.
-   Boundary grown 30 m round Craddock play: accepted. Range: leave it in play.
-   Theme: new `silvies` ("excited about this new theme"). Logo: just the goat caddie, no
    tree.
-   Chief Egan creek: "really small and dry ... quite small"; "make sure the red connects
    to the lake". Built 2 m wide into the pond.
-   The band by the Craddock 9th green and 14th tee: "should just be shrubs".
-   Sagebrush: bushes only, no penal lie. Canopy: requested the NOAA lidar.
-   Chief Egan 6: traced the green ("it's just a small green!").
-   Standing defaults otherwise: all water red, trees from lidar (fairway trees and tee-shot
    blockers removed), wind 1-7 mph, card holes the course chat's pick.

## New pipeline keys or theme

-   **`gorse.extra_areas`** (pipeline/gorse.py): a GeoJSON file of areas that are bushes
    whatever the photo's colour or the canopy over them. The default (none) changes nothing,
    and only courses with a `gorse` key run that code. `make regress` result: see the PR.
-   Existing keys used: `layouts` (three, sharing one grown boundary), `fescue_areas`,
    `gorse` (as sagebrush: tuned colour rule, small bushes, no penal ground),
    `not_trees_areas`, `trees_off_fairways_m`, `laz` (class 1). Greens are shaped by the
    standard rule (no `green_tilt`).
-   **New theme `silvies`:** `assets-src/palettes/silvies.json` (the pnw keys plus F0-F2:
    irrigated greens, tawny native ground, grey-olive steppe outside, log-cabin browns) and
    `assets-src/trees_silvies.py`:
    -   ponderosa pine: a cinnamon trunk, bare low down, with an open tufted crown;
    -   western juniper: a shaggy blue-grey crown on a forked trunk;
    -   a big sagebrush bush painter, with a few autumn flower heads on 2 of its 8 variants.
    Sheets built with `build_assets.py --theme silvies` only.
-   **Logo:** `assets-src/course_logos/silvies.py`, a white Boer goat with a red-brown head
    carrying a red golf bag, in bunchgrass. An original drawing; not the club's emblem.

## Open items

Details in `data/silvies/validation_report.md`.

1.  **Flags (3-8 %), left as marked:**
    -   Craddock: 8 (426 vs 445) and 14 (608 vs 570).
    -   Hankins: 8 (389 vs 410) and 18 (558 vs 590).
    -   Chief Egan: 8 (90 vs 85) and 9 (97 vs 100).
    Recommendation: accept; move the tee in the desk if any plays wrong.
2.  **Craddock card:** holes 1, 6 and 9 differ between the club map and GolfPass.
    Recommendation: a photo of the printed card.
3.  **No rating for Craddock Challenge or Chief Egan:** rounds there count as not rated.
4.  **Trees north of US 395** are missing (the NOAA clip). Recommendation: accept
    (scenery); a wider NOAA job would add them.
5.  **Juniper vs pine** is a drawing choice from crown shape (summer lidar, no leaf-off).
    Recommendation: accept.

## Requests for the design chat

1.  Add `silvies_craddock`, `silvies_hankins` and `silvies_chief_egan` to the daily
    rotation from the day after the merge (`game/src/data/dailyRoster.ts`, e.g.
    `silvies_craddock: '2026-10-26'`). Until then `player.test.ts` "the real rotation"
    fails: it wants every listed course in the roster. Chief Egan is a par-29 nine (875
    yd), like Shorty's and the Preserve, which are in the roster.
2.  `assets-src/course_cards.py` draws trees.json `c: 3` bushes from the generic
    flowering `shrubs.png`, not the theme's `shrubs_<theme>` sheet, so the cards show
    sagebrush as coloured dots. Smallest fix: pick the sheet as the game does
    (`shrubs_<theme>` when it exists).
3.  Document `gorse.extra_areas` in COURSE_BUILD.md 3.3 (the `gorse` key's table).

## Lessons

-   **A reversible course is two layouts on shared greens.** OSM mapped one direction (here
    Craddock). The other came from the club map: each hole is the shared fairway played
    backwards, ending on the green the map names, with tees from small mown pads near the
    previous green. Fit the map only for order; positions come from the OSM greens.
-   **A tee mark is a place, not a box.** The developer's first desk round marked spots.
    Ask for the box too (a second round with a proposed box under each mark), or say up
    front that the shape becomes the tee box.
-   **OSM maps tee pads as small `golf=fairway` pieces** (under ~1,500 m²). Matching them to
    the card by distance from the green gave most of the tees in one pass.
-   **A DOGAMI canopy mosaic can be empty over a course even when the DTM isn't** (the
    newer 3DEP flight has no canopy layer in the mosaic). Look at its nodata share on
    arrival and ask for the points from NOAA straight away.
-   **Excess green (2G-R-B) and texture separate turf from sage** where green-minus-red
    fails (a yellow 2024 summer photo): fairways +34 at their 10th percentile, native
    ground +7 median.
-   **`garden` and `gorse` can't be used together** (garden.order_trees wants a colour on
    every bush). `gorse.extra_areas` adds bushes to an area instead.
-   **Tiny greens and pins.test.ts:** the OSM outline of Chief Egan 6 (154 m²) held only
    two hole locations (the test wants three), even with its tilt capped at 1.2 % and no
    bumps. A trace by the developer (172 m², the green in the photo) holds them with the
    standard shaping. Ask for a trace instead of flattening the green.
-   **Re-run `make_edits.py` after any proposal script.** `propose_pins.py` was re-run after
    the trace (new pin id) but `edits.json` still listed the old one, so the committed
    build no longer came from source. A clean `make course` caught it; do one before the PR.
