# Burlington Country Club

Course id: `burlington_cc` (data folder `data/burlington_cc/`), branch `course/burlington_cc`.

## Build summary

Built overnight 2026-10-30/31 by a course chat (the developer asleep: "make the calls yourself, log
every call"). OSM maps the whole course (18 hole lines with par and handicap, 60 tee boxes, 21
greens, 22 fairways, 59 bunkers, ponds, cart paths); nothing was traced. Every download came through
the GitHub Actions fetch workflow (release `data-burlington_cc`): the Overpass export, the USGS 3DEP
1 m DEM and two lidar tiles of `VT_Statewide_A23` (flown 21 April 2023, leaf-off, class 1 only).
Two tee sets, Black (the tips) and Blue (default), per the developer's overnight rule. New theme
`burlington_cc` (Vermont hardwoods in the fall) and logo. Every hole of both sets is within 3 % of
the card after s06's tee placement except 12 Blue (+3.4 %, accepted flag); Black 6,450 yd built
against 6,471, Blue 4,817 against 4,799. `course_play.test.ts -t burlington_cc`: 13 passed. Test
totals for the branch are in the pull request.

## Facts

-   **Location:** 568 South Prospect Street, Burlington, Chittenden County, Vermont, beside the
    University of Vermont on the hill above Lake Champlain. Private. `state` VT.
-   **Design:** Donald Ross (1924); restored by Dr. Michael Hurdzan (1998), with Dana Fry
    (GolfPass; top100golfcourses.com; unverified).
-   **UTM zone:** 18 N (EPSG:32618). World 1,280 x 2,048 m (x0 642905, y0 4923487). Theme
    `burlington_cc`. Wind 1-10 mph.
-   **Data:** OSM (Overpass, 2026-10-30); USGS 3DEP 1 m DEM tile x64y493 of VT_Statewide_A23
    (clip in git, `raw/vt_a23_dem_1m.tif`); lidar tiles N2177E4445 and N2191E4445 of
    VT_Statewide_A23, class 1, each clipped to the world (release, `release.json`). Elevation 66-130 m.
-   **Water:** every penalty area red: the big pond along 13 and 15, the ponds by the 11th green and
    in front of the 3rd/12th tees, a small pond left of 12's green, and the brook between the two
    ponds (lidar channel, pending the developer). Out of bounds: the OSM boundary; four swimming
    pools inside it are out-of-bounds water.
-   **Trees:** 13,470 from the lidar (4,460 inside the course), p50 17 m, max 36.8 m; 385 roofs
    dropped (`roof_last_share` 0.85); 8 dropped on playing surfaces; none dropped for tee shots.
    Type from the leaf-off last-return share (58 % conifer: probably high for a hardwood course;
    drawing only).

## Scorecard

GolfPass scorecard page, read 2026-10-30 (unverified third party; the club site was unreachable).
Stroke indexes from 18Birdies (they match OSM); ratings men's (18Birdies).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 4 | 3 | 4 | 5 | 4 | 5 | 3 | 4 | 36 | 3 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 35 | 71 |
| HCP | 5 | 7 | 15 | 11 | 13 | 3 | 1 | 17 | 9 | | 16 | 8 | 4 | 2 | 18 | 14 | 12 | 6 | 10 | | |
| Black | 386 | 336 | 186 | 382 | 490 | 341 | 562 | 198 | 366 | 3247 | 214 | 325 | 440 | 410 | 154 | 416 | 382 | 372 | 511 | 3224 | 6471 |
| Built | 383 | 328 | 189 | 384 | 494 | 337 | 565 | 193 | 367 | 3040 | 210 | 323 | 435 | 407 | 153 | 422 | 392 | 368 | 506 | 3216 | 6450 |
| Blue | 307 | 268 | 97 | 293 | 409 | 255 | 405 | 116 | 260 | 2410 | 130 | 261 | 342 | 248 | 95 | 354 | 287 | 267 | 405 | 2389 | 4799 |
| Built | 307 | 264 | 99 | 292 | 412 | 249 | 410 | 115 | 258 | 2406 | 130 | 256 | 354 | 249 | 95 | 363 | 290 | 268 | 406 | 2411 | 4817 |

Black 71.6/134, Gold 69.8/132 (6,101), Grey 67.9/128 (5,699), Green 66.9/120 (5,497), Aqua 64.5/114
(5,052), Blue 63.3/111. Gold, Grey, Green and Aqua are in `scorecard.csv`, not built.

## Default tee

Blue (the developer's overnight rule: the back set and Blue, default Blue). Blue is the club's
shortest set here.

## The developer's calls

Pending: every call below was made by the course chat overnight and is listed for confirmation
("Developer's calls pending").

## Developer's calls pending

1.  Second tee set Blue (4,799, the shortest) as the rule says, or Gold (6,101). Recommendation:
    confirm, or say "Gold".
2.  Hole 7 Black tee: the box 41 m behind the line start (563 yd vs 562), tagged in `edits.json`.
3.  Hole 8 Black: -10.4 % from the box centre, -2.5 % with the tee at the back of the 501 m2 box
    (adjustments.json). Accept.
4.  Hole 12 Blue +3.4 % flag. Accept.
5.  The brook between the ponds by 11 and 3/12 as a red penalty area from the lidar channel
    (`approved=pending`).
6.  Stroke indexes from 18Birdies over GolfPass/GolfingRecord.
7.  Wind 1-10 mph (one above inland New England, for the hilltop over Lake Champlain).
8.  Theme `burlington_cc` and the logo "Sugaring Season" (a sap bucket of golf balls on a sugar
    maple). Review: /home/claude/review/burlington_cc_theme.png, burlington_cc_logo_8x.png.
9.  Card hole 4 (the green on the pond).

## New pipeline keys or theme

-   No new config key. Keys used: `roof_last_share` (class-1 lidar), `tee_shot_margin_m` 2.0
    (harmless; see open items), `trees_off_fairways_m` 2.
-   New theme `burlington_cc`: `assets-src/palettes/burlington_cc.json`,
    `assets-src/trees_burlington_cc.py`, `game/public/sprites/trees_burlington_cc*`.
-   `pipeline/remote_fetch.py`: TNM listings are deduplicated by download URL (VT_Statewide_A23
    lists every lidar tile 27 times; the workflow would have downloaded each 27 times). Changes no
    course build.

## Open items

Numbered with recommendations in `data/burlington_cc/validation_report.md` (from
`report_notes.md`). Main ones: an unverified card (a photo of the printed card settles stroke
indexes and the Grey slope), the Blue/Gold choice, the brook, the conifer share.

## Lessons

-   **TNM can list one product many times** (A23: 27 copies of each tile). Look at distinct URLs in
    the `--list` log; A23 tile names are tile centres in Vermont State Plane metres (1.4 km tiles),
    so two tiles covered the course out of 162 listed.
-   **Each lidar tile its own release entry and clip** (`intake.py laz ... --out raw/laz/<tile>.laz`):
    `fetch_raw.py` runs one asset per entry.
-   **The step cache skipped s05 when the canopy first arrived** (s00 ran on the `laz` change, s05
    didn't); `ARGS="--from s05_trees"` fixed it.
-   **The installed Chromium is newer than Playwright's** (`chromium_headless_shell-1243`): point
    `executablePath` at it for look scripts.
