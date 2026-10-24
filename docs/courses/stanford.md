# Stanford Golf Course

Course id: `stanford` (data folder `data/stanford/`), branch `course/stanford`.

## Build summary

Built by a course chat on 2026-10-24. OSM maps the whole course (18 hole
lines, tees for every set, greens, fairways, bunkers, pins); the creek and two
ditches were mapped only as lines and were made into penalty areas from the
DEM. USGS 3DEP 1 m DEM (elevation service export) and the 2020 Santa Clara
County lidar (NOAA, classes 3-5) for the trees. Black tees, new theme
`peninsula`. The OSM boundary is in three parts: the main course, a strip
across Fremont Road holding hole 1's green and hole 2's tee (joined), and the
driving range (left out). Every hole within 3 % of the card (6,229 vs 6,213).
On the branch: 885 of 886 unit tests pass (the one failure is
`player.test.ts` until the course is in `DAILY_ROSTER`), 12 Playwright tests
pass, `npm run build` passes.

## Facts

-   **Location:** 91 Links Road, Stanford, Santa Clara County, California, in
    the foothills behind the Stanford campus, on both banks of San
    Francisquito Creek (the Santa Clara / San Mateo county line). `state` CA.
    Course id `stanford`.
-   **Design:** George C. Thomas Jr. and William P. "Billy" Bell, opened
    1 January 1930; renovated by John Harbottle (2008); every bunker rebuilt and
    some holes changed (2018) (stanfordgolfcourse.com/about-us; Stanford
    Magazine, "Green Acres"). The 12th has a large oak in the fairway with the
    creek in play; the 18th tee is about 100 ft above its fairway.
-   **UTM zone:** 10N (EPSG:32610). World 1,536 x 2,048 m (x0 571321,
    y0 4141180; the 2,048 m limit north-south). Theme `peninsula`. Wind
    2-10 mph.
-   **Data:**
    -   OSM: the developer's Overpass Turbo export (2026-10-24 13:40 UTC),
        clipped to the download box by `clip_osm.py` into
        `raw/overpass.geojson` (in git).
    -   DEM: USGS 3DEP 1 m, the 3DEPElevation ImageServer export of the world
        + 100 m (NAD83 / UTM 10N, float32, NAVD88 m; 21.9-126.8 m),
        `exportImage.18.tiff` in release `stanford-data`.
    -   Lidar: 2020 Lidar: Santa Clara County, CA (NOAA Data Access Viewer
        dataset 9329, job J1476069; flown April 2020, leaf-on), classes 3-5,
        `ca2020_santa_clara_J1476069.zip` in the release; delivered in
        California zone 3 (US ft) with heights in metres despite the UTM
        request; clipped to the world + 100 m by `make_laz.py` (36.6 M
        points). It covers both counties.
    -   Card: the club's printed card (`2020SC1.jpg`, release); photos in the
        release are art reference only.
    -   `make fetch NAME=stanford` puts the DEM and the clipped lidar in place
        (`release.json`).
-   **Water (all red):** San Francisquito Creek's ravine inside the boundary
    (2.9 ha, crosses 3, 4, 8, 12 and 14), an open ditch across 6, a short
    ditch by 1's fairway (`make_water.py`, `edits.json`; tagged `flatten=no`).
    Out of bounds: everything outside the boundary (the creek south of 14, the
    range, Lake Lagunita) and Junipero Serra Boulevard inside it.
-   **Trees:** 15,921 from the lidar, 2,965 on the course; 930 read as
    conifers by crown shape. Species are flair: the theme draws conifers as
    redwood, Monterey pine and eucalyptus, broadleaves as coast live oak and
    valley oak. Three tops in fairways removed (12 near the creek, 7 at the
    dogleg); the 12th-fairway oak and the tree beside it kept.

## Scorecard

The club's printed card (Golf ScoreCards Inc., printed 10/2019), supplied by
the developer on 2026-10-24. Every row adds up to its printed totals.

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 3 | 4 | 4 | 5 | 3 | 4 | 35 | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 3 | 4 | 35 | 70 |
| HCP | 13 | 3 | 9 | 15 | 5 | 1 | 11 | 17 | 7 | | 4 | 14 | 2 | 6 | 16 | 12 | 8 | 18 | 10 | | |
| Black | 505 | 418 | 192 | 143 | 385 | 403 | 478 | 145 | 350 | 3019 | 401 | 350 | 442 | 403 | 160 | 351 | 492 | 175 | 420 | 3194 | 6213 |
| Built | 505 | 414 | 193 | 147 | 388 | 392 | 482 | 143 | 359 | 3023 | 398 | 351 | 444 | 402 | 158 | 361 | 492 | 179 | 421 | 3206 | 6229 |

(Built = adjusted yards from s06; the exact figures per build are in
`data/stanford/validation_report.md`.)

Ratings: Cardinal 6,742 73.7/138, Black 6,213 71.0/131, White 5,771
69.1/123 (men) / 74.2/133 (women), Blue 5,363 71.7/130 (the forward set,
women's par 71). Cardinal, White and Blue are in `scorecard.csv`, not built.
The card prints two handicap rows; the one under Black is used (OSM's tags
follow the other on the back nine).

## Default tee

Black: the 4.1 default is Blue, but the card's Blue is the 5,363 yd forward
set, so the set closest to 6,300 yd (as at TPC Boston).

## The developer's calls

2026-10-24:
-   Junipero Serra Boulevard is out of bounds (`ob_highways: ["primary"]`).
-   The practice area north of holes 2-3 stays in play (its greens are wrong
    greens).
-   Keep the oak in the 12th fairway ("great catch").
-   Penalty areas: A (the creek), B (ditch across 6) and C (ditch by 1) yes; D
    (shallow ditch left of 6) no.
-   The new `peninsula` theme ("super excited").
-   Logo: the first draft (the 12th oak) was "a little bland"; redrawn as an
    arcade inspired by the Main Quad's architecture.
-   Lidar classes 3-5 only.

Course chat's calls under the standing defaults: Black tees, wind 2-10 mph
(no Californian row in 4.1), the three fairway tree tops removed, the course
card (hole 8).

## New pipeline keys or theme

-   No pipeline change, so no `make regress` was needed. Existing keys used:
    `join_boundary_parts`, `ob_highways`, `drop_trees`.
-   New theme `peninsula`: `assets-src/palettes/peninsula.json` (pnw keys +
    F0-F2 rough; golden foothill grass as the off-course ground L0-L2) and
    `assets-src/trees_peninsula.py` (redwood, Monterey pine, eucalyptus; coast
    live oak, valley oak); sheets built with `build_assets.py --theme
    peninsula`. No shrub painter.
-   `trees_off_fairways_m` was not used, because it would also remove the
    12th-fairway oak. `make_tree_drops.py` applies the same rule as a
    `drop_trees` list that leaves the oak out.

## Open items

Numbered in `data/stanford/report_notes.md` (shown in the game's report) with
recommendations; the main ones:
1.  OB within 25 m of several fairways (15, 17, 16, 2, 6/7, 18, 13, 10):
    the OSM boundary as mapped. Recommendation: keep.
2.  The creek south of hole 14 is outside the OSM boundary, so out of bounds
    beside the 16th tees. Recommendation: keep unless you know it is staked red
    there.
3.  Hole 9: a drive straight down the OSM line touches an edge tree; a drive at
    the middle of the fairway clears it. Recommendation: accept.
4.  Lake Lagunita (scenery) is drawn as water though it is dry most of the
    year.

## Lessons

-   **NOAA's job ignored the projection again** (California zone 3 in US feet,
    heights in metres): read the LAZ header first. The two tiles had different
    offsets; a clip that merges tiles must re-quantise (`make_laz.py`). Only the
    tiles inside the world matter (the second had no points in it).
-   **Ask for vegetation classes only.** Classes 3-5 kept roofs and wires out of
    the canopy (no `remove_wires` or roof filter needed). The job was still
    950 MB for a 12 km2 extent; the clip is 323 MB.
-   **A protected fairway tree rules out `trees_off_fairways_m`.** Apply the rule
    by list instead (`make_tree_drops.py`), keeping the trees near the OSM tree
    nodes. The lidar split each broad oak into three tops up to 11 m from the
    node, so a small keep radius first dropped two-thirds of the oak.
-   **A creek in a ravine:** propose the penalty area as the ravine to the top of
    the banks (wider search, deeper threshold, longer median window than
    `propose_channels.py`'s ditch settings), clipped to the boundary, and tag it
    `flatten=no`. Where a road inside the boundary that is out of bounds
    crosses it, water wins (s08), which is right for a bridge.
-   **A boundary in three parts where one is the range:** `join_boundary_parts`
    stops on any part beyond its gap; copy the boundary without the range part
    (`make_edits.py`) rather than widening the gap.
-   **The default tee name can be the forward set.** This card's Blue is 5,363
    yd with women's pars; the 6,300 yd rule picked Black (as at TPC Boston).
-   **Check `SURF` names in the game** (`obRoad`, not `ob_road`) when writing a
    course test; the pipeline and game spell them differently.
-   **The preinstalled Chromium can be newer than the game's Playwright
    expects;** point a throwaway look config at
    `/opt/pw-browsers/chromium_headless_shell-*/.../chrome-headless-shell`.

## Checks

-   Pipeline: `make course NAME=stanford` from clean (build/ and edited/
    deleted), twice: all 235 exported files identical, and identical to the
    step-by-step build.
-   Game (2026-10-24, after rebasing on main with Sandpines): `npm run build` (type check included)
    passes; `npm test`: 885 passed, 1 failed (`player.test.ts`, "stanford is in
    the daily rotation": the design chat adds it to `DAILY_ROSTER` after the
    merge), 2 skipped; Playwright: 12 passed (with the sandbox's preinstalled
    Chromium).
-   `game/tests/unit/stanford.test.ts` (16 tests): par, tees, ratings,
    heights, tees on boxes and pins on greens, yardages, water red and the
    creek where five holes cross it, the joined boundary parts, Junipero Serra
    out of bounds, the practice greens in play, tee shots clear of trees,
    default aim, robot rounds, wind 2-10 mph, putting views, determinism.
-   Every hole looked at in the game with Playwright (tee aim, Tab overview,
    an approach, 10 m and 3 m putts; 90 screenshots checked): nothing drawn
    wrong. Robot rounds (seeds 1, 7, 23) score 75, 76 and 71; hole 12 is the hardest
    (6-7 on two seeds: the oak).
