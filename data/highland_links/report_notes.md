## Other open items (Highland Links)

Decisions the developer made on 2026-10-18 are in DECISIONS.md ("Highland Links"). Still open, each with a recommendation:

1. **Hole 1 plays 260 yd from T4 against 250 on the card (+3.8 %, flag).** T4 is the developer's tee; the OSM hole line bends left of the fairway, which may add a few yards. Recommendation: accept, or trace the hole 1 centre line if it plays long in the game.
2. **Hole 9 tiers are modelled, not measured.** A straight step through the middle of the green along the line of play, 0.91 m over 4 m, left (north) side low. Neither lidar nor OSM shows where the real tier line runs. Recommendation: play it, then move or reshape it in `course_config.json` `green_tiers` (drop, width, low side). A putt from the lower tier to the upper one needs about twice the usual pace.
3. **Tree types come from the leaf-off lidar** (30 % pitch pine, 70 % oak), not from imagery or a site visit. Recommendation: look at the woods west and south of holes 4 and 8 in the game; if the mix looks wrong, the split threshold in s05 is one number.
4. **Rating/slope 67.2 / 116** is the club's 18-hole men's Blue/White figure; the game shows it beside the 9-hole Blue tee set. Recommendation: keep it (it is what the club publishes).
5. **Pins** are at the centre of each green (hole 9: the centre of the upper tier). One pin per green; nothing in the data gives daily pin sheets.
6. **Mown rough** is a band about 2.3 m (2.5 yd) wide, drifting between roughly 1.4 and 3.7 m, around every fairway (developer: "a thin layer of rough, often only 2-3 yards, around every fairway, then fescue"); it is drawn greener but plays like the fescue (both are the rough surface, -15 %). Recommendation: if the fescue should play harder than the mown band, that is a new surface for the design chat.
7. **Course card** (COURSE_BUILD.md section 12): hole 9, the two-tier green in its collar, chosen by the course chat while the developer was away. To use another green, change `assets-src/course_cards.json` and run `python3 assets-src/course_cards.py highland_links`.
8. **Water:** none on the course. Out of bounds is the course boundary; the beach, the cliff and the ocean beyond it are out of bounds. Roads and the buildings inside the boundary (Highland Light, drawn at twice its 20 m height for the art, and five others) give free relief.
