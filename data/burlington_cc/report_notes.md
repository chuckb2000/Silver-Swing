## Open items and the course chat's calls (Burlington Country Club)

Built overnight 2026-10-30/31 while the developer was asleep ("make the calls yourself, log every call"). Each item says what was chosen and how to reverse it.

1. **Scorecard: third-party, unverified.** The club's site could not be reached. Yards per hole for Black, Gold, Grey, Green, Aqua and Blue from GolfPass (every row adds up; 6,471 / 6,101 / 5,699 / 5,497 / 5,052 / 4,799). Conflicts: (a) stroke indexes: 18Birdies (used; matches the OSM hole lines' handicap tags) vs GolfPass/OpenGolfAPI (2: 13, 3: 17, 5: 9, 8: 15, 9: 7, 11: 4, 12: 12, 13: 10, 15: 2, 16: 8, 17: 14, 18: 6) vs GolfingRecord (another set); (b) Grey slope 128 (18Birdies, GolfPass) vs 127 (GolfingRecord); (c) GolfingRecord's Blue 2 is 368 (its Blue total is then 4,899: a typo). Recommendation: a photo of the printed card.
2. **Tee sets built: Black (the tips) and Blue, default Blue** (developer's overnight rule). Blue is the club's shortest set (4,799 yd, 63.3/111; par 5s of 405-409 yd). Option: Gold (6,101) as the second set and default; its boxes are in OSM. Recommendation: confirm Blue or say "Gold" (one config change and a rebuild).
3. **Hole 7 Black tee** (course chat, edits.json): s06 looks only 40 m behind a line start and took the 519 yd box; the box 41 m behind, on the line run backwards, measures 563 yd against 562 and is tagged hole=7, tee_set=Black. Recommendation: keep.
4. **Hole 8 Black** measures 177 yd from its box centre (-10.4 %); the box is a 501 m2 strip and s06 puts the virtual tee at its back (193 yd, -2.5 %; adjustments.json). Recommendation: accept.
5. **Hole 12 Blue +3.4 % flag** (354 yd vs 342): the only Blue box by the line. Accepted for play.
6. **Every OSM hole line starts at a forward tee**; s06 found the card's box on every hole.
7. **Pins** are the green centres (OSM maps none).
8. **Penalty areas, all red** (standing default): the big pond along 13 and 15, the ponds by the 11th green and in front of the 3rd/12th tees, the small pond left of 12's green, and **the brook between the two ponds, pending the developer's approval** (OSM: only a stream line, w1011484692; the lidar DEM shows an 8 m wide, 0.8 m deep channel; proposed/channels_lidar.geojson, approved=pending). Reverse: drop the EXTRA_ADD entry in make_edits.py. Engelsby Brook's culverted and outside-boundary stretches near 3 and 12 are not modelled.
9. **Four swimming pools inside the boundary** (the club pool and three tiny ones) are drawn as out-of-bounds water, away from play.
10. **Cart paths:** OSM's 16 golf=path ways are copied as golf=cartpath (free relief); the clubhouse (golf=clubhouse) as a building.
11. **Three practice greens** by the clubhouse are wrong greens (relief required).
12. **Trees from class-1 lidar** (VT_Statewide_A23 has no vegetation classes; flown 21 April 2023, leaf-off): 385 crowns of nearly all last returns dropped as roofs (roof_last_share 0.85, as Wannamoisett). The leaf-off split calls 58 % of crowns conifers; the woods are mostly northern hardwoods with white pine and hemlock, so that share may be high. Drawing only (both play alike). Recommendation: accept.
13. **tee_shot_margin_m 2.0**: set after the game's tee-shot test once flagged a 36.7 m crown 31 m out on 16 Black; in the final build s06b and the game test both pass with that tree standing. Harmless; can be removed.
14. **Wind 1-10 mph** (course chat): inland New England is 1-9; one more for the hilltop above Lake Champlain.
15. **Theme burlington_cc** (new): Vermont hardwoods at peak colour (sugar maple, red maple, paper birch, white pine, hemlock, cedar), cooler parkland rough, maple-leaf litter in the woods.
16. **Logo** "Sugaring Season" (course chat): a sap bucket on a sugar maple heaped with golf balls, and a scarlet leaf. Original.
