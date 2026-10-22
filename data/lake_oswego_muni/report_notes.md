## Other open items (The Muni)

All accepted as built by the developer on 2026-10-22 ("let's leave it all as is").

The developer's calls of 2026-10-22 are in `docs/courses/lake_oswego_muni.md`. OSM does not map the 2025 nine: every green, fairway, bunker, tee box and the driving range were traced (greens by the course chat from the OSIP 2024 photo, everything corrected or drawn by the developer in the tracing desk, `data/lake_oswego_muni/desk/`).

1. **Scorecard:** GolfPass (unverified; the city publishes no card, developer). Black 1,599 matches the Lake Oswego Review; the Review gives hole 5 as 302 yd, GolfPass 309. Ratings (men's) from oregoncourses.com, unverified. White (1,446) is listed, not built. Recommendation: keep until a printed card turns up.
2. **Hole 8 plays 261 yd against 270 (-3.3 %, flag)** from the developer's Black tee, with the tee already at the back of its box. Recommendation: accept; if the real back tee is farther back, redraw it in the desk (about 8 m).
3. **The stream on hole 2** is a red penalty area from the 2019 lidar channel (developer's desk note): 212 m long, 6.6 m wide on average, crossing the hole about 45 m short of the green. Recommendation: keep it red.
4. **Tree types come from crown shape only** (the Metro 2019 flight is leaf-on): 65 of 255 trees on the course are conifers. The 2024 photo's long pointed shadows suggest most of the course's trees are Douglas firs. Recommendation: type every tree conifer (`tree_type`, an existing key), or keep the crown-shape split.
5. **The lidar is from 2019, before the rebuild.** 356 lidar trees whose crowns are not dark canopy on the 2024 photo were dropped (`trees_need_ortho`), the developer removed 8 more in the tree tracer, s06b removed 4 on tee shots (holes 2, 8 and 9) and 42 stood on greens, tees or fairways. Trees planted since 2024 are not in the data. The ground is the 2019 ground: greens are shaped and tees levelled by the pipeline, but Hixson's new fairway contours are not in it.
6. **Greens:** the 2019 ground under the new greens tilts up to 9.6 % (hole 8); every tilt is capped at 2.5 %. Small greens with undulations reach 4.6-5.6 % at their steepest on holes 1, 4 and 9 (within 3 m of the pin 1.5 % or less). Recommendation: accept; flatten one if it plays badly.
7. **Out of bounds:** OSM's outline of the city's property, cut along the north side of the aquatics center (developer approved). The clubhouse, the aquatics center and its yard are out of bounds; the driving range (the developer's outline, north to the property line) is out of bounds inside the line.
8. **The practice putting green** south of hole 9 is not mapped; it plays as rough. Recommendation: leave it.
9. **Course card:** hole 4 (the semi-Redan), rotating 7, 9 and 3; the course chat's pick.
