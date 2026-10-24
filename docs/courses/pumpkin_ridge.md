# Pumpkin Ridge Golf Club (Witch Hollow and Ghost Creek)

Course id: `pumpkin_ridge` (data folder `data/pumpkin_ridge/`), layouts `pumpkin_ridge_witch_hollow` and `pumpkin_ridge_ghost_creek`, branch `course/pumpkin_ridge`.

## Build summary

Built 2026-10-24 by a course chat following docs/COURSE_BUILD.md, from the scouting file `04_pumpkin_ridge.md`. Two 18-hole courses on one property, built as two layouts of one world (COURSE_BUILD.md 3.5), grouped as "Pumpkin Ridge Golf Club" on the course list. OSM maps both courses completely (one course polygon for the club, 36 named hole lines, 36 pins, 42 greens, 148 tee boxes, 168 bunkers, 30 water hazards), so nothing was traced; `edits.json` assigns each hole line to its layout by name, tags every hazard red, and retags the range, the clubhouses and four paths. DOGAMI bare-earth DTM and canopy height model (1 m, feet), OSIP 2024 orthophoto. Blue tees. Witch Hollow: all 18 holes within 3 % of the card, 6,514 yd against 6,506. Ghost Creek: 17 within 3 %, hole 3 a flag (+3.2 %), 6,318 yd against 6,357. 6,878 lidar trees (423 crowns gone on the 2024 photo dropped). The course's own theme, `pumpkin_ridge` (late October: autumn broadleaves, Douglas firs, straw-gold native grass), and one logo per course. No pipeline change. 26 course checks pass (`game/tests/unit/pumpkin_ridge.test.ts`); on the branch, merged with `main` (Sandpines, Stanford), 923 unit tests pass and 1 fails (`player.test.ts`: the two layouts are not yet in the daily rotation), and 12 Playwright tests pass; two clean rebuilds gave the same 417 files byte for byte; every hole of both courses was looked at in the game (tee, overview, approach, 10 m and 3 m putts).

## Facts

-   **Location:** 12930 NW Old Pumpkin Ridge Road, North Plains, Washington County, Oregon; 350 acres of former farmland at the foot of the Tualatin Mountains, about 35 km west of Portland. `state` OR.
-   **Design:** Witch Hollow by Robert E. (Bob) Cupp; Ghost Creek by Cupp with John Fought. Construction from August 1990; Ghost Creek opened 1 April 1992, Witch Hollow later in 1992. Owned and run by Escalante Golf since October 2015 (Wikipedia, via the scouting file). Witch Hollow is private; Ghost Creek public.
-   **History:** Witch Hollow held the 1996 U.S. Amateur (Tiger Woods' third in a row, on the 38th hole), the 1997 and 2003 U.S. Women's Opens, the 2006 U.S. Women's Amateur and the Korn Ferry Tour's Portland Open since 2014. Ghost Creek was Golf Digest's best new public course of 1992 and held the Nike Tour Championship (1993-94) and the LPGA Safeway Classic (2009-12). LIV Golf played its second event here in 2022.
-   **UTM zone:** 10N (EPSG:32610). World 1,792 x 1,536 m, origin (498976, 5050633): the OSM course polygon (1,489 x 1,254 m) + 141-152 m of scenery. Theme `pumpkin_ridge`. Wind 1-7 mph.
-   **Data:** OSM Overpass export 2026-10-24 (`raw/overpass.geojson`, in git). DOGAMI lidar DIGITAL_TERRAIN_MODEL_MOSAIC and CANOPY_HEIGHT_MODEL_MOSAIC, `exportImage` (`f=json`) at 1 m in EPSG:32610, box x 498700-501050 / y 5050350-5052450; OSIP 2024 1.0 m orthophoto (JPEG placed by its request box, `make_ortho.py`). All downloaded by the developer 2026-10-24; originals in the GitHub release `pumpkin_ridge-data`; `make fetch NAME=pumpkin_ridge` puts them in `raw/` (`release.json`). Elevation 55.8-128.2 m. Checks on arrival in `data/pumpkin_ridge/DATA_REQUEST.md`.
-   **Water:** 30 mapped penalty areas, all red (standing default; `penalty=red` in `edits.json`): on Witch Hollow the ponds by the 5th, 12th and 14th greens and creeks by 3, 6 and 9; on Ghost Creek the lakes by the 9th and 18th greens, a pond north of the course and the reaches of Ghost Creek through the course (checked against the 2024 photo and a channel map of the DEM). The wetlands on Ghost Creek 3 and 4 and the marsh before Witch Hollow 18 are not mapped: built as rough (open item 2). Out of bounds: outside the one OSM course polygon, and the driving range. Club drives and paths inside are cart paths. Six practice greens are wrong greens.
-   **Trees:** 6,878 from the DOGAMI canopy height model, 3,910 inside the boundary; 2,900 drawn as Douglas firs (crown shape, no leaf-off data). 423 crowns the 2024 photo no longer shows were dropped (`trees_need_ortho`, about 180 inside the boundary), 133 on buildings, 17 on playing surfaces. None stood in a fairway (`trees_off_fairways_m: 2`) and s06b removed none for tee shots.

## Scorecard

Both from GolfPass (third party; transcribed by the scouting chat 2026-10-24, rows checked here). Not checked against the club's own cards.

**Witch Hollow** (GolfPass course 14617). Agrees with GolfPass's membership page and wiscogolfaddict.com (2015).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 3 | 4 | 5 | 3 | 4 | 5 | 4 | 4 | 36 | 3 | 5 | 3 | 4 | 5 | 3 | 4 | 4 | 5 | 36 | 72 |
| HCP | 9 | 17 | 3 | 15 | 13 | 1 | 5 | 11 | 7 | | 16 | 6 | 18 | 2 | 12 | 14 | 10 | 8 | 4 | | |
| Blue | 379 | 153 | 386 | 498 | 187 | 408 | 564 | 360 | 427 | 3362 | 194 | 531 | 127 | 390 | 450 | 157 | 385 | 394 | 516 | 3144 | 6506 |
| Built | 382 | 154 | 378 | 496 | 192 | 410 | 568 | 358 | 430 | 3368 | 196 | 525 | 126 | 398 | 440 | 159 | 392 | 393 | 517 | 3146 | 6514 |

Men's ratings/slopes: Black 7,015 74.9/142, Blue Plus 6,761 73.7/141, Blue 6,506 72.4/140, White Plus 6,248 71.3/139 (the tee table prints 6,272; the row adds to 6,248), White 6,000 69.9/132, Red Plus 5,492 67.7/128, Red 5,270 66.7/125; women's on Blue 78.8/148, White 76.0/142, Red 71.7/131. The members' par 72; the Korn Ferry Tour plays it as a par 71 (the 14th a par 4, 7,109 yd in 2020).

**Ghost Creek** (GolfPass course 14616). Blue Plus agrees hole for hole with hole19golf.com (metres).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 5 | 3 | 4 | 4 | 5 | 4 | 36 | 5 | 3 | 4 | 4 | 3 | 5 | 3 | 4 | 4 | 35 | 71 |
| HCP | 11 | 5 | 13 | 7 | 15 | 9 | 1 | 17 | 3 | | 16 | 14 | 2 | 8 | 10 | 6 | 18 | 12 | 4 | | |
| Blue | 392 | 391 | 158 | 515 | 193 | 341 | 409 | 497 | 443 | 3339 | 474 | 170 | 406 | 356 | 219 | 531 | 133 | 301 | 428 | 3018 | 6357 |
| Built | 387 | 391 | 163 | 519 | 191 | 339 | 400 | 490 | 446 | 3326 | 476 | 168 | 396 | 356 | 219 | 528 | 132 | 294 | 423 | 2992 | 6318 |

Men's ratings/slopes: Black 6,834 74.5/146, Blue Plus 6,523 73.2/141 (the tee table prints 6,599), Blue 6,357 72.0/139, White Plus 6,137 71.0/136 (prints 6,132), White 5,882 69.6/136, Red Plus 5,409 67.4/133, Red 5,111 66.0/128; women's on White 75.5/138, Red 71.0/132. An older card (greenskeeper.org, golfcoursegurus.com: Blue 6,451 72.0/138, another stroke index) is not used.

Every tee set is in the scorecard files; only Blue is built.

## Default tee

Blue on both courses (standing default, COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-10-24: "the DOGAMI links don't work" — the export was re-requested with `f=json` and a box cut to the course (DATA_REQUEST.md).
-   2026-10-24, in the build request: Witch Hollow first and Ghost Creek as a second layout of the same world; a theme of the course's own and logos from the scouting's ideas without asking; work unattended.
-   Standing defaults used without asking: Blue tees, all water red, OSM boundary as OB with the range OB, trees from lidar, wind 1-7 mph, course card holes the course chat's pick.

## New pipeline keys or theme

No new pipeline keys. Existing keys used: `layouts`, `trees_need_ortho` (with an `ortho` raster), `fescue_areas`, `trees_off_fairways_m`, and `green_tilt` for Ghost Creek 17 (`"hole": 2017`: with layouts s07 keys a green as 1000 x (layout position + 1) + hole number). Its random bump on the 2.5 % tilt left the game only two hole locations (`pins.test.ts` wants three); the bump is dropped, the tilt kept.

New theme `pumpkin_ridge`: `assets-src/palettes/pumpkin_ridge.json` (32 colours, the pnw keys plus F0-F2 for the native grass, rough drawn in F tones inside `fescue_areas` and mown rough in G3-G5 elsewhere, rust leaf litter under trees, olive-gold farmland outside) and `assets-src/trees_pumpkin_ridge.py` (pnw shapes recoloured: deep blue-green Douglas fir; broadleaves by sprite variant as olive-russet Oregon white oak, gold bigleaf maple and orange vine maple). Sheets built with `build_assets.py --theme pumpkin_ridge` only. `make regress` not needed: nothing shared in `pipeline/`, `assets-src/` code or the `Makefile` changed.

Logos: `assets-src/course_logos/pumpkin_ridge_witch_hollow.py` (a great horned owl on a crooked oak limb against a low moon) and `pumpkin_ridge_ghost_creek.py` (mist rising off a reed-lined creek at dawn, a round badge). The place's card on the course list shows the first course logo it finds; no club-wide logo, and no pumpkin (the club's own emblem was not checked).

## Open items

Details in `data/pumpkin_ridge/validation_report.md` ("Other open items").

1.  **Ghost Creek 3 is 163 yd against 158 (+3.2 %).** No OSM box covers 158. Recommendation: accept the flag.
2.  **Ghost Creek 3 and 4 wetlands** are built as rough (native grass). A red-penalty proposal is in `proposed/wetlands_gc34.geojson`. Recommendation: keep as rough unless you know them to be staked red.
3.  **Witch Hollow 6's edge fir** (36 m, left of the fairway at the dogleg): only a drive aimed straight down the OSM line at driver carry touches it. Recommendation: keep.
4.  **Scorecards are third-party (GolfPass).** Recommendation: accept; a photo of the club's printed cards would settle them.
5.  **Course card holes:** Witch Hollow 12 and Ghost Creek 18 (the scouting's picks), each rotating through three more greens.
6.  **Daily rotation:** add both layouts to `game/src/data/dailyRoster.ts` after the merge (design chat), or `player.test.ts` fails on `main`.

## Lessons

-   **DOGAMI `exportImage` for a big box: use `f=json`, and cut the box once OSM is in.** The scouting's 3999 x 3999 `f=image` links (64 MB float32) failed in the developer's browser. The same request with `f=json` and the course polygon + 400 m (2350 x 2100, 21 MB) worked first time. Ask for OSM first when the scouting only had a point.
-   **One OSM polygon for two courses needs `boundary_osm` *and* `layout` tags.** `common.layout_holes` reads the `layout=` tag only when the layout has a `boundary_osm`; without it every layout gets every hole line. Give each layout the shared polygon's id and tag the hole lines (`make_edits.py`, from the lines' OSM names).
-   **The rough can be bimodal on the photo.** Green minus red: fairways +12 to +23, rough -13 to +4 where it is native grass and +12 to +17 where mown. Gearhart's fescue rule (threshold +4) found 35 ha of native areas in one pass.
-   **`green_tilt` with layouts takes s07's green key, not the hole number** (Ghost Creek 17 = 2017). Run `pins.test.ts` as soon as the course exports: a steep green with a bump can leave fewer than three hole locations.
-   **The title screen keeps one view per place**, the first layout alphabetically (Ghost Creek here).
