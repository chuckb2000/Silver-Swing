## Other open items (Sandpines Golf Links)

Built 2026-10-24 by a course chat with the standing defaults (docs/COURSE_BUILD.md 4.1). The developer accepted every recommendation of the intake message and the later questions (2026-10-24). The items below are listed for the record, each with a recommendation.

1. **Scorecard:** the club's printed card (`scorecard.jpg`, release `florence-data`). Every row adds up to its printed totals; handicap is the men's row (a clean 1-18). OSM's handicap tags match neither card row; the card is used. Black, Rees, White, Jones and Red are in `scorecard.csv`, not built.
2. **Hole 8 plays 205 yd against the Blue 174** (developer, 2026-10-24): it plays from its Black tee (one of two pads OSM tags as fairway). No Blue box is in OSM, the lidar or the 2024 photo. Recommendation: leave until someone who knows the course places the Blue tee in the tracing desk.
3. **Hole 7** plays from its only tee box (467 yd, +2.9 %; developer): the OSM line starts 110 m behind it, on a mown strip that measures 562 yd.
4. **Hole 11** plays from its long teeing ground (116-179 yd), tagged as the Blue box (course chat's call): s06's centroid rule had passed it over for the line start (+11.5 %). 159 yd, -2.4 %.
5. **Four tee pads tagged as fairway** in OSM (the Black tees of holes 8 and 9; 57-119 m2) are copied as tees (`make_edits.py`).
6. **Water, all red:** the three ponds (holes 2, 5 and 17/18); OSM tags them `golf=water_hazard`, which would export yellow, so they carry `penalty=red`. No other water inside the boundary; the DEM shows no unmapped creek (the low cells are swales between dune mounds).
7. **Native areas play as rough** (developer): the card plays all non-kept areas as lateral hazards; the game has no dry penalty area. They are drawn as tawny dune grass from `proposed/native.geojson` (`make_native.py`, photo texture; 65 % of the rough). Recommendation: leave, unless the design chat adds a staked native surface.
8. **Out of bounds within 25 m of play:** hole 2 (21 m left of the fairway, 82-163 yd), hole 5 (15 m, along the houses behind the pond), hole 8 (16-19 m left of the green), hole 9 (7 m left of the Blue tee, 17-20 m left of the fairway). These are the real boundary.
9. **Trees:** 11,796 from the DOGAMI canopy model (3,103 inside the boundary); 160 on a lot south-east of the clubhouse, cleared since the flight, dropped (developer). The photo check (`trees_need_ortho`) is not used: it also flags the sunlit edges of standing tree lines on the front nine. No tree is in a fairway or a tee-shot line. Broad crowns are drawn as shore pine (a drawing choice, not a species map).
10. **Greens:** every pin area is 1.5 % or flatter within 3 m; greens 1, 2, 6, 8, 12, 15, 17 and 18 reach 3.8-5.3 % at their edges. Recommendation: playtest first.
11. **Wind 3-14 mph** (open coast default).
12. **Course card:** the par-3 17th over the dune lake, rotating with 5, 15 and 3 (course chat's pick).
