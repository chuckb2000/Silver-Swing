# Bandon Preserve

Course id: `bandon_preserve` (data folder `data/bandon_preserve/`), branch `course/bandon_par3s` (built with Shorty's, `docs/courses/shortys.md`).

## Build summary

Built by a course chat on 2026-10-22, together with Shorty's from one set of downloads (GitHub release `bandon-par-threes-data`). OSM maps the 13 holes with greens, pins and bunkers, but tee boxes on only 4 holes, no fairway, and a course polygon that traces just the mown turf. The turf (that polygon minus its mapped native patches), a Back tee on each of the 9 holes without one (on the hole line at the card distance; the 2008 lidar shows no pads) and an out-of-bounds line grown to take in the tees and dunes went to the developer in the tracing desk, who approved them as shown. Every fairway runs up to its green (`connect_fairways`, `merge_touching_fairways`). Elevation and canopy are DOGAMI's 2008 lidar (older than the course), with the OSIP 2024 photo for gorse and stale trees. Theme `bandon_dunes`; the logo is a western snowy plover (developer, 2026-10-22). Every hole is within 3 % of the card: 1,615 yd against 1,609. The 14 course tests (`data/bandon_preserve/tests/bandon_preserve.test.ts`) pass when copied into `game/tests/unit/`.

## Facts

-   **Location:** Bandon Dunes Golf Resort, 57744 Round Lake Drive, Bandon, Coos County, Oregon, on the bluff south of Bandon Dunes, between Bandon Trails and Shorty's. `state` OR. Course id `bandon_preserve`.
-   **Design:** Bill Coore and Ben Crenshaw, opened 2012; 13 par 3s. Its net proceeds go to the Wild Rivers Coast Alliance (the resort's card).
-   **UTM zone:** 10 N (EPSG:32610). World 1,024 x 768 m (origin 386157, 4781803): the OSM polygon's box (594 x 480 m) plus 144-215 m of scenery. Theme `bandon_dunes`. Wind 8-16 mph (as at Bandon Dunes).
-   **Data:** release `bandon-par-threes-data` (`make fetch NAME=bandon_preserve`), shared with Shorty's: the Overpass export, the DOGAMI DTM and CHM, the OSIP 2024 photo and the resort's scorecard (`BPScorecard.jpg`).
-   **Water:** none on the course; Round Lake and the Bandon Trails ponds are plain water outside the boundary. Out of bounds is the grown boundary (8.8 ha, from OSM's 4.7 ha polygon w674855473).
-   **Trees:** 2,020 lidar trees, 45 inside the boundary, all shore pine (`tree_type`); 225 that the 2024 photo no longer shows were dropped (`trees_need_ortho`). 6,300 gorse bushes from the photo (1,784 m2 inside the boundary). No tree was removed for a tee shot.

## Scorecard

Bandon Dunes Golf Resort scorecard, undated (`BPScorecard.jpg`, read 2026-10-22); the same yardages as GolfPass and golfingrecord.com. No par row (all par 3) and no stroke index (stored 0).

| Hole | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Par | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 39 |
| Back | 134 | 150 | 87 | 118 | 142 | 131 | 147 | 63 | 134 | 120 | 142 | 132 | 109 | 1609 |
| Built | 131 | 150 | 85 | 120 | 140 | 133 | 149 | 62 | 136 | 122 | 144 | 136 | 107 | 1615 |

Front (1,121) is in `scorecard.csv`, not built. No ratings.

## Default tee

Back, the only set built: the card has no Blue, so the 4.1 default takes the longest set.

## The developer's calls

-   2026-10-22: the standing defaults; wind 8-16 mph and the `bandon_dunes` theme as for Bandon Dunes; the terrain from the 2008 lidar, older than the course, accepted.
-   2026-10-22: the tracing desk approved as shown: the turf, the 9 proposed Back tees and the grown boundary.
-   2026-10-22: no rough between fairway and green (`connect_fairways`, `merge_touching_fairways`); the native mounds inside the turf stay rough.
-   2026-10-22: the logo is a western snowy plover (the first drawing; it replaces the design chat's salal sprig).

## New pipeline keys or theme

None. Course-chat tools in `data/bandon_preserve/`: `make_osm.py`, `make_edits.py`, `make_ortho.py`, `make_proposals.py`, `desk_prep.py`. The logo is `assets-src/course_logos/bandon_preserve.py` (replacing the design chat's on `main`). `make regress` not needed (nothing in `pipeline/` changed).

## Open items

In `data/bandon_preserve/report_notes.md` (and `validation_report.md`):

1.  The card has no stroke index, so the hole intro reads "handicap 0". Recommendation: the design chat hides that line when it is 0.
2.  The 9 proposed Back tees stand on the hole lines at the card distance (approved); confirm in play.
3.  The shared tests need the design chat (see `shortys.md`).

## Lessons

See `docs/courses/shortys.md` (the two courses were built together).
