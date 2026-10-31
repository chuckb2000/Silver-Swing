## Developer's calls pending (overnight build 2026-10-30/31; the course chat's calls, each reversible)

1. **Nine greens played as the card's 18.** Needham is nine holes played twice from different tees; the
   club's 2026 card prints two nines with different yardages and stroke indexes (Blue/White: 3,109 out,
   2,961 in). Built as 18 holes: holes 10-18 are copies of the OSM lines 1-9 (`make_second_nine.py`,
   `proposed/second_nine.geojson`) ending on the same greens, each played from its second-nine tee. The
   game already plays an 18-hole course with front 9 / back 9 / 18, so no game change was needed.
   Option: a 9-hole course with one tee set and "18 twice around" (Highland Links), which loses the
   second-nine yardages. Recommendation: keep the 18.
2. **Tee sets.** The card has no plain Blue: Blue/Gold (6,115, par 70, men 70.2/128), Blue/White (6,070,
   par 72, 69.8/129), White/Green (5,848, par 72, 68.5/124), Red/Yellow (5,433, par 72, ladies 72.0/123).
   The back-most set, Blue/Gold, has other pars on two holes (8: a 206-yd par 3; 10: a 401-yd par 4), and
   the game has one par per hole, so it is not built (design request: per-tee pars). Built: Blue/White (the
   Blue set, default) and White/Green (the next set forward). Red/Yellow and Blue/Gold are in
   `scorecard_full.csv`. Stroke index: the men's Blue/White and White/Green row.
3. **Tee boxes chosen by the card's yardages** (OSM tags no tee colours): `edits.json` tags each front-nine
   box `hole`/`tee_set`, and the second nine uses tagged copies. Pending the developer's approval.
4. **Holes moved within their boxes** (s06; real and adjusted yardage in the table above): 2 and 11 (184 yd
   from the box 169 yd away, moved to 179), 14 White/Green (308 from a long box shared with hole 5,
   +11.4 % from its middle, +2.4 % moved). These were > 8 % before the move; after it all are within 3 %.
   Hole 18 White/Green stays +4.2 % (523 vs 502): one large box (w1271766412) serves 9 and 18 for every
   set; the card's forward tee there is not mapped. Accepted as a flag.
5. **Water, all red** (standing default): the four ponds inside the boundary (OSM `natural=water` only,
   `red_water_osm`) and Alder Brook in two pieces (w310169385 south, w310169388 north of the road) as
   penalty areas traced from the channel in the 2021 DEM (`propose_channels.py`). The card's local rules
   name yellow water hazards and red lateral hazards but not which is which. The MassGIS wooded swamps
   and wet meadow (`natural=wetland`, 2007) on the west side are rough with their lidar ground, not water.
6. **Hole 6 / 15 pond.** The pond in the fairway (w310168725) is 226-265 m from the tee, where a perfect
   drive ends: `checks.json` skips holes 6 and 15 in the default-aim test. The real hole is a lay-up with
   a hybrid or long iron.
7. **Out of bounds:** the OSM boundary (relation 13156245, two parts joined across the road, 7 m gap,
   `join_boundary_parts`). The card: "off club property & beyond chain link fences on holes 6, 7, & 8".
8. **Trees:** 2021 USGS leaf-off lidar, tile 19TCG316681. The north tile (19TCG316683) timed out twice on
   the runner; it covers only the top 91 m of scenery north of the course, which has no trees.
9. **Theme `bayside`** (white pines and oaks, as Franklin); no new theme. **Wind 1-9 mph** (inland New
   England). **Logo:** a red town pump on a granite plinth (the course is town watershed land, 1899/1923).
10. **Practice greens:** w1271766399 and w1271766401 (by the clubhouse) are wrong greens.
