## Other open items (Shorty's)

Built 2026-10-22 together with Bandon Preserve (shared downloads, GitHub release bandon-par-threes-data). Standing defaults (COURSE_BUILD.md 4.1): Back tees (no Blue; the longest set), all water red, out of bounds = the course polygon, trees from lidar with `trees_off_fairways_m` 2; wind 8-16 mph and the `bandon_dunes` theme with gorse, as the developer set for Bandon Dunes. The developer approved the tracing desk as shown (2026-10-22) and asked for no rough between fairway and green (`connect_fairways`, `merge_touching_fairways`, as at East Potomac and Langston). The items below are the course chat's calls, each with a recommendation.

1. **Stroke index.** The resort's card (2024-03-13) prints no handicap row, so every hole stores 0 and the hole intro reads "handicap 0". Recommendation: ask the design chat to hide that line when the handicap is 0 (no invented order).
2. **Pars.** The card prints no par row; all 19 holes are par 3 (First Call Golf, GCA). OSM tagged hole 7 par 4 and hole 5 without a par; both retagged par 3.
3. **The mown turf** is drawn as fairway from the 2024 photo (a pixel classifier trained on the Preserve's mapped turf; OSM maps no fairway here). Approved in the desk.
4. **Hole 2's green** is traced from the photo (OSM has none). Approved in the desk.
5. **Double greens 6/18 and 9/13** are cut along the perpendicular bisector of the two holes' OSM line ends, so each hole has its own centre, pin and putting views. Recommendation: confirm in play.
6. **Hole 15:** OSM's course polygon crossed the 15th green, so its back half was out of bounds. The boundary now takes in every green and 12 m round it (408 m2 more, all behind 15). Recommendation: keep.
7. **Hole 7 has no fairway:** the photo shows native dune between its tee and green, and the nearest turf is 81 m from the green, beyond `connect_fairways`' 60 m reach. Hole 15's shot carries a dune; its fairway curls round to the green. Both are as on the ground.
8. **Flags after the tee moves:** hole 4 83 yd against 80 (+3.5 %) and hole 15 49 against 51 (-3.4 %), the best spots in their boxes. Recommendation: accept.
9. **Hole 12's Back tee** is one long strip OSM maps for all three tee sets (84-143 yd); the virtual tee slides to its back end (130 yd against 133).
10. **The lidar was flown in 2008, before Shorty's was built (2023-24).** The ground is the pre-construction dunes: greens are shaped by script and tees levelled anyway (developer: accepted). 349 lidar trees not seen in the 2024 photo were dropped (`trees_need_ortho`).
11. **Neighbours' water.** Round Lake and the two Bandon Trails ponds lie outside the boundary; they are plain water (out of bounds), not penalty areas.
