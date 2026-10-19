## Other open items (Highland Links)

Decisions the developer made on 2026-10-18 are in DECISIONS.md ("Highland Links"). Still open, each with a recommendation:

1. **Hole 1 plays 260 yd from T4 against 250 on the card (+3.8 %, flag).** T4 is the developer's tee; the OSM hole line bends left of the fairway, which may add a few yards. Recommendation: accept, or trace the hole 1 centre line if it plays long in the game.
2. **Hole 9 tiers are modelled, not measured.** A straight step through the middle of the green along the line of play, 0.91 m over 4 m, left (north) side low. Neither lidar nor OSM shows where the real tier line runs. Recommendation: play it, then move or reshape it in `course_config.json` `green_tiers` (drop, width, low side). A putt from the lower tier to the upper one needs about twice the usual pace.
3. **Tree types come from the leaf-off lidar** (30 % pitch pine, 70 % oak), not from imagery or a site visit. Recommendation: look at the woods west and south of holes 4 and 8 in the game; if the mix looks wrong, the split threshold in s05 is one number.
4. **Rating/slope 67.2 / 116** is the club's 18-hole men's Blue/White figure; the game shows it beside the 9-hole Blue tee set. Recommendation: keep it (it is what the club publishes).
5. **Pins** are at the centre of each green (hole 9: the centre of the upper tier). One pin per green; nothing in the data gives daily pin sheets.
6. **No mown-rough band.** OSM maps fairways, greens, tees and bunkers but no rough, so everything else inside the boundary is fescue rough. The photos show a strip of greener rough beside most fairways. Recommendation: leave it unless it plays too hard; the developer can trace rough polygons in QGIS and they will be used.
7. **Course card** for the course-select screen (COURSE_BUILD.md section 12) waits for the design chat's `course-select` branch to be merged.
8. **Water:** none on the course. Out of bounds is the course boundary; the beach, the cliff and the ocean beyond it are out of bounds. Roads and the buildings inside the boundary (the lighthouse and five others) give free relief.
