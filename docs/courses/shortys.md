# Shorty's

Course id: `shortys` (data folder `data/shortys/`), branch `course/bandon_par3s` (built with Bandon Preserve, `docs/courses/bandon_preserve.md`).

## Build summary

Built by a course chat on 2026-10-22, together with Bandon Preserve from one set of downloads (GitHub release `bandon-par-threes-data`). OSM maps all 19 holes, their tees, greens and bunkers, but no pins, no fairway and no green for hole 2. The mown turf (a pixel classifier on the 2024 photo, trained on the Preserve's mapped turf), hole 2's green (traced from the photo), a centre pin per green and the Back tee per hole went to the developer in the tracing desk, who approved them as shown. The double greens of 6/18 and 9/13 are cut in two per hole. Every fairway runs up to its green (`connect_fairways`, `merge_touching_fairways`, as at East Potomac and Langston). Elevation and canopy are DOGAMI's 2008 lidar (older than the course), with the OSIP 2024 photo for gorse and stale trees. Theme `bandon_dunes`; the logo is the design chat's spotted fawn. Every hole is within 3 % of the card except two 3.5 % flags (4 and 15) and hole 3, whose Back tee the developer picked in play (69 yd against 85): 1,982 yd against 1,997. The 14 course tests are `game/tests/unit/shortys.test.ts` (moved there by the design chat, 2026-10-22).

## Facts

-   **Location:** Bandon Dunes Golf Resort, Bandon, Coos County, Oregon, on the dunes directly south of Bandon Preserve and west of Bandon Trails. `state` OR. Course id `shortys`.
-   **Design:** Rod Whitman, Dave Axland and Keith Cutten; opened 2 May 2024 (First Call Golf, 2024-05-11; Golf Course Architecture). 19 par 3s, 51-161 yd from the back tees, plus putting tees.
-   **UTM zone:** 10 N (EPSG:32610). World 768 x 1,280 m (origin 386318, 4780979): the OSM boundary's box (304 x 804 m) plus 232-238 m of scenery. Theme `bandon_dunes`. Wind 8-16 mph (as at Bandon Dunes).
-   **Data:** release `bandon-par-threes-data` (`make fetch NAME=shortys`): the developer's Overpass export (`export.geojson`; `make_osm.py` writes `raw/overpass.geojson`, committed), the DOGAMI DTM and CHM (`exportImage.12.tiff`, `.13.tiff`; feet, 1 m, box x 386050-387300 / y 4780850-4782700), the OSIP 2024 photo (`exportImage.jpg`, 0.5 m, georeferenced from the request bbox by `make_ortho.py`), the resort's scorecard (`2024-Shortys-Scorecard-3-13-24.jpg`) and the 2023 routing map (look only).
-   **Water:** none on the course. Round Lake and the Bandon Trails ponds lie outside the boundary and are plain water (out of bounds). Out of bounds is the OSM course polygon (w1540940976), grown 12 m round every green (it crossed the 15th green).
-   **Trees:** 5,561 lidar trees, 27 inside the boundary, all shore pine (`tree_type`); 349 that the 2024 photo no longer shows were dropped (`trees_need_ortho`). 5,106 gorse bushes from the photo (1,859 m2 inside the boundary). No tree was removed for a tee shot.

## Scorecard

Bandon Dunes Golf Resort scorecard dated 2024-03-13 (`2024-Shortys-Scorecard-3-13-24.jpg`, read 2026-10-22). Every column adds up to its printed total. The card prints no par row (all par 3) and no stroke index (stored 0).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 57 |
| Back | 119 | 124 | 85 | 80 | 117 | 84 | 114 | 104 | 72 | 101 | 148 | 133 | 152 | 161 | 51 | 123 | 80 | 92 | 57 | 1997 |
| Built | 116 | 120 | 69 | 83 | 118 | 86 | 115 | 105 | 74 | 104 | 144 | 130 | 153 | 165 | 49 | 124 | 80 | 90 | 56 | 1982 |

Middle (1,673), Front (1,309) and Putting (979) are in `scorecard.csv`, not built. No ratings.

## Default tee

Back, the only set built: the card has no Blue, so the 4.1 default takes the longest set.

## The developer's calls

-   2026-10-22: the standing defaults; wind 8-16 mph and the `bandon_dunes` theme as for Bandon Dunes; the terrain from the 2008 lidar, older than the course, accepted.
-   2026-10-22: the tracing desk approved as shown: the turf as fairway, hole 2's green, a Back tee per hole.
-   2026-10-22: no rough between fairway and green, the fix used at East Potomac and Langston (`connect_fairways`, `merge_touching_fairways`); the small rough patches left inside the fairways stay.
-   2026-10-22: the logo is the design chat's spotted fawn (on `main`).
-   2026-10-22: hole 3's Back tee is OSM box w1547384735 (circled on a screenshot from play), not the box in hole 5's tee complex; 69 yd against 85 on the card, accepted (`desk_prep.py` `TEE_CHOICE`, branch `course/shortys-hole3`).

## New pipeline keys or theme

None. Course-chat tools in `data/shortys/`: `make_osm.py`, `make_edits.py`, `make_ortho.py`, `make_proposals.py`, `desk_prep.py` (the desk's input from the proposals, and `--approve`). `make regress` not needed (nothing in `pipeline/` changed).

## Open items

In `data/shortys/report_notes.md` (and `validation_report.md`):

1.  The card has no stroke index, so the hole intro reads "handicap 0". Recommendation: the design chat hides that line when it is 0.
2.  Double greens 6/18 and 9/13 cut along the bisector of the two line ends. Recommendation: confirm in play.
3.  Hole 15's boundary grown round its green (OSM's line crossed it). Recommendation: keep.
4.  Flags 4 (+3.5 %) and 15 (-3.4 %). Recommendation: accept.
5.  The shared tests need the design chat: `courses.test.ts` still expects 9 or 18 holes, and `player.test.ts` expects every listed course in the daily rotation.
6.  Hole 3 is 69 yd against 85 on the card (-18 %), from the box the developer chose. Accepted.

## Lessons

-   **A course outline can be the mown turf.** At the Preserve, OSM's `leisure=golf_course` polygon traces the turf, so most tees and every dune were out of bounds; and its interior is the fairway OSM never mapped. Check what the boundary covers before using it as out of bounds.
-   **Don't cut greens, tees and bunkers out of a proposed fairway.** They paint over it anyway (s08 priority), and once s08 rounds the fairway's corners every cut leaves a ring of rough: 139 pockets here until the cuts went.
-   **Show OSM's own shapes solid in the desk.** Dashed references read as "still to trace"; the developer thought 31 holes needed tracing. `desk_prep.py --mark` moves each hole's own greens, bunkers and tees into its shapes.
-   **A neighbour's turf trains the fairway classifier.** With no fairway mapped here, the Preserve's mapped turf next door (same grass, same photo) gave a 0.99 holdout accuracy.
-   **A course polygon can cut a green.** The robot's perfect tee shot on 15 ended out of bounds: the OSM line ran across the green. Grow the boundary round every green and run the course test early.
