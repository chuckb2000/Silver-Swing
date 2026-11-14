# Heron Lakes Golf Club

Course id: `heron_lakes` (data folder `data/heron_lakes/`), branch `course/heron_lakes`.
Two courses on one site: **Great Blue** (`heron_lakes_great_blue`) and **Greenback**
(`heron_lakes_greenback`).

## Build summary

Built by a course chat on 2026-11-13. OSM maps both courses fully: two course boundaries
inside the club's, 36 hole lines with pars, every green, tee boxes for every hole but
Great Blue 11's back tee and Greenback 6 and 8's Black tees, fairways, bunkers and the
sloughs and ponds. Elevation and canopy from DOGAMI lidar (DTM and CHM, feet), the photo
for checks from OSIP 2024 (0.5 m); everything fetched by the GitHub Actions workflow.
Tee sets built: Great Blue Gold and Greenback Black (the longest of each), the defaults.
New theme `heron_lakes` (wetland greens, slough water, cottonwood, ash and Oregon ash
yellows); logos for the club (cattails and a lily) and one per course (a great blue heron
in flight; a green heron on a snag). Great Blue builds 6,966 yd against 7,016 (one flag,
hole 11); Greenback 6,519 against 6,638 (two flags, holes 6 and 8, whose Black boxes are
not mapped).

## Checks

- `course_play.test.ts -t heron_lakes`: 22 passed (both courses).
- `npm test`: 1,769 passed, 2 failed: `player.test.ts` "the real rotation" and `tour.test.ts` "a hole drawn sits out", which fail until `make land` adds the courses to the daily rotation.
- `npm run e2e`: 16 passed, 1 failed: "a reload while the ball is in the air keeps the stroke" (Oswego Lake; after the reload the round resumes with 0 strokes). It failed again in two runs on their own, so it is not just load. The same test passed on the Tokatee branch, which has the same main merged; I could not find a cause in this branch (it changes only course data). Flagged for the design chat.
- Pinned; a `--fresh` rebuild left git clean.
- Every hole of both courses played in the game (tee view, overview, first shot, putting view): 36 of 36 holed.

## Facts

-   **Location:** West Delta Park, North Portland, Multnomah County, Oregon, on the
    Columbia Slough floodplain beside Force Lake and the Portland International Raceway.
    City of Portland municipal golf. `state` OR. Data id `heron_lakes`.
-   **Design:** Greenback, Robert Trent Jones Sr. with Robert Trent Jones Jr., 1971; Great
    Blue, Robert Trent Jones Jr., 1992.
-   **UTM zone:** 10 N (EPSG:32610). World 1,792 x 1,792 m, origin (522291, 5049087).
    Theme `heron_lakes` (new). Wind 1-7 mph (inland Pacific Northwest).
-   **Data** (release `data-heron_lakes`; `make fetch NAME=heron_lakes`; fetched by the
    GitHub Actions workflow 2026-11-13):
    -   layout: OSM via the standard Overpass export (`raw/overpass.geojson`, in git);
    -   bare earth: DOGAMI DIGITAL_TERRAIN_MODEL_MOSAIC, 1 m, feet;
    -   canopy: DOGAMI CANOPY_HEIGHT_MODEL_MOSAIC, same box;
    -   photo (checks only): OSIP 2024, 0.5 m;
    -   scorecards: stymie.golf (third-party, below).
-   **Water:** 19 penalty areas on each course's map, all red (the standing default; 16
    OSM penalty areas plus three ponds listed in `red_water_osm`). Out of bounds: each
    course's own OSM boundary; the range is out of bounds.
-   **Trees:** 11,209 from the DOGAMI canopy model (2,366 inside the club), median 15.5 m,
    tallest 41.3 m; 66 dropped on playing surfaces and 2 from Greenback tee shots (4 and 6).
    Types from crown shape only: 3,430 conifer, 7,779 deciduous.

## Scorecards

Third-party, unverified against the club's printed card: stymie.golf's cards (par, men's
handicap, yardage per tee set), read 2026-10-24 by the scouting chat; every row adds up.
GolfPass confirms Greenback hole for hole; its Great Blue card has other tee names and
differs by 20-45 yd on 8, 16 and 17 (not used).

**Great Blue** (Gold 74.2/146):

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 4 | 5 | 4 | 3 | 5 | 3 | 4 | 4 | 4 | 36 | 4 | 3 | 5 | 4 | 4 | 3 | 4 | 5 | 4 | 36 | 72 |
| HCP | 7 | 1 | 15 | 11 | 9 | 17 | 13 | 3 | 5 |  | 14 | 16 | 4 | 10 | 18 | 12 | 2 | 8 | 6 |  |  |
| Gold | 413 | 560 | 333 | 168 | 566 | 205 | 396 | 466 | 428 | 3535 | 412 | 200 | 544 | 446 | 376 | 187 | 380 | 523 | 413 | 3481 | 7016 |
| Built | 402 | 566 | 336 | 164 | 566 | 200 | 386 | 478 | 425 | 3523 | 411 | 187 | 536 | 441 | 377 | 182 | 375 | 516 | 418 | 3443 | 6966 |

**Greenback** (Black 72.0/132):

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Out | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | In | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 5 | 4 | 3 | 4 | 5 | 4 | 3 | 4 | 4 | 36 | 5 | 4 | 4 | 5 | 3 | 4 | 3 | 4 | 4 | 36 | 72 |
| HCP | 1 | 11 | 15 | 5 | 3 | 7 | 17 | 9 | 13 |  | 4 | 10 | 8 | 2 | 18 | 14 | 16 | 12 | 6 |  |  |
| Black | 536 | 408 | 176 | 369 | 506 | 404 | 207 | 377 | 392 | 3375 | 499 | 397 | 428 | 503 | 205 | 318 | 178 | 356 | 379 | 3263 | 6638 |
| Built | 523 | 404 | 176 | 370 | 493 | 385 | 202 | 354 | 390 | 3297 | 498 | 392 | 423 | 503 | 200 | 315 | 174 | 347 | 370 | 3222 | 6519 |

## Default tee

Great Blue Gold and Greenback Black: the longest set of each (COURSE_BUILD.md 4.1).

## The developer's calls

-   2026-11-13: the standing defaults (longest tees, all water red, OB = each course's OSM
    boundary, range OB, fairway trees removed), listed in the intake message.

Course chat's calls (listed for the developer):

-   The clubhouse (OSM r20947272) copied in as a building.
-   Great Blue 17's hole line (w1184481266) tagged `layout=heron_lakes_great_blue`; it
    lay on both boundaries.
-   Great Blue 11's Gold tee is the back-most box at the start of OSM's hole line
    (w1186062424, assigned in `edits.json`); see open item 1.
-   `checks.json`: Greenback 8's default aim is skipped (the tee shot plays through a
    chute in a real stand of firs; a full driver reaches them at the dogleg).
-   Cards: Great Blue the par-3 4th (rotating 4, 2, 9, 12), Greenback the 13th (13, 15, 6, 8).

## Open items

1.  **Great Blue 11** (Gold, card 200 yd): the back-most mapped box measures 182 yd from
    its centre (-9.2 %, over the 8 % line); the virtual tee at its back plays 187 yd
    (-6.6 %). The photo shows no box farther back. Options: (a) accept 187 yd
    (recommended; the hole plays as on the photo); (b) the developer traces a farther box
    if the club has one; (c) check the card (GolfPass's Great Blue card differs elsewhere).
2.  **Greenback 6 and 8** (Black): no box mapped at the card length; the tees are the
    OSM hole lines' starts (385 vs 404 yd, -4.7 %; 354 vs 377, -6.1 %). Recommended: accept;
    or trace the Black boxes from the photo.
3.  **Great Blue 17:** the tee shot carries a slough that lies outside the club's OSM
    boundary, so a ball in it is out of bounds, not in a penalty area. Recommended: accept
    (the OSM boundary is the rule); or extend the boundary over the slough.
4.  **Force Lake** (penalty area w93893873) lies mostly outside the boundary; kept red.
5.  Five greens not at the end of any hole line (practice greens) are wrong greens.
6.  Tree types from crown shape only (no leaf-off imagery).

## Build history

-   2026-11-13: first build (course chat).
