## Developer's calls pending (overnight build 2026-10-30/31; the course chat's calls, each reversible)

1. **Built as a nine (developer, 2026-10-31, 09:20: "build it in the Highland Links style because
   it's a nine-hole course").** Needham is nine holes; the club's 2026 card prints them twice from other
   tees. Built: the card's rows 1-9 only, which the game plays as 9 or 18 twice around. Dropped: the
   card's 18 on nine greens (holes 10-18 replaying 1-9 from the second-nine tees: the hole-line and
   tee-box copies of `make_second_nine.py`, now `make_clubhouse.py`, which keeps only the clubhouse
   building) and the 18-hole tee sets Blue/White and White/Green. The second-nine tees (rows 10-18:
   Gold, and White, Green and Yellow as the back nine) are in `scorecard_full.csv`, not built.
2. **Tee sets.** On rows 1-9 the card has Blue (front of Blue/White and Blue/Gold), White (front of
   White/Green) and Red (front of Red/Yellow). Blue is the furthest back, so Blue (default, par 36, 3,109)
   and White (the next set forward, par 36, 2,961) are built; Red (2,887) is in `scorecard.csv`, not
   built. Gold exists only on rows 10-18 (Blue/Gold's back nine, 3,096, hole 1 a 401-yd par 4) and
   Blue/Gold's front nine differs from Blue only on hole 8 (a 206-yd par 3): neither is built. All three
   nine-hole sets have the same pars, so **the design request for per-tee pars is no longer needed for
   this layout** (only if Gold or Blue/Gold were ever wanted). Ratings: the card rates only 18-hole
   combinations; each set carries the one that starts on it (men Blue/White 69.8/129 for Blue,
   White/Green 68.5/124 for White, ladies Red/Yellow 72.0/123 for Red). Stroke index: the men's
   Blue/White row 1-9.
3. **Tee boxes chosen by the card's yardages** (OSM tags no tee colours): `edits.json` tags each box
   `hole`/`tee_set` (Blue, White); the same boxes as the earlier 18-hole build's front nine. Pending the
   developer's approval.
4. **Holes moved within their boxes** (s06; real and adjusted yardage in the table above). Hole 9 White
   (514) and Blue (525) share one large box (w1271766412); the card's forward tee there is not mapped.
5. **Water, all red** (standing default): the four ponds inside the boundary (OSM `natural=water` only,
   `red_water_osm`) and Alder Brook in two pieces (w310169385 south, w310169388 north of the road) as
   penalty areas traced from the channel in the 2021 DEM (`propose_channels.py`). The card's local rules
   name yellow water hazards and red lateral hazards but not which is which. The MassGIS wooded swamps
   and wet meadow (`natural=wetland`, 2007) on the west side are rough with their lidar ground, not water.
6. **Hole 6 pond.** The pond in the fairway (w310168725) is 226-265 m from the tee, where a perfect
   drive ends: `checks.json` skips hole 6 in the default-aim test. The real hole is a lay-up with
   a hybrid or long iron.
7. **Out of bounds:** the OSM boundary (relation 13156245, two parts joined across the road, 7 m gap,
   `join_boundary_parts`). The card: "off club property & beyond chain link fences on holes 6, 7, & 8".
8. **Trees:** 2021 USGS leaf-off lidar, tile 19TCG316681. The north tile (19TCG316683) timed out twice on
   the runner; it covers only the top 91 m of scenery north of the course, which has no trees.
9. **Theme `bayside`** (white pines and oaks, as Franklin); no new theme. **Wind 1-9 mph** (inland New
   England). **Logo:** a red town pump on a granite plinth (the course is town watershed land, 1899/1923).
10. **Practice greens:** w1271766399 and w1271766401 (by the clubhouse) are wrong greens.
