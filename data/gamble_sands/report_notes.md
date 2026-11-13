## Other open items (Gamble Sands)

Calls made on 2026-11-13 with the developer (the club's card and his screenshots) or by the
course chat; each with a recommendation.

1. **Scorecard:** the club's printed card (07/24), sent by the developer: Medal 7,151 yd,
   73.4/120. The six tee rows are in `scorecard.csv`; Medal is built (6,977 yd).
2. **Tees on the fairway (developer, 2026-11-13: "the tee boxes look like they are
   effectively part of the fairway").** On 1, 12 and 18 the mapped boxes were 13-17 %
   off the card; a 5 m Medal tee is placed where the card distance falls on the hole line,
   on mown grass in the NAIP photo (`proposed/tees_fairway.geojson`): 1 the top of the
   fairway below the path by the clubhouse, 12 the mown apron south of the 11th green,
   18 the fairway north of the 17th green. All three now pass.
3. **Hole 6 (par 3) is 15.4 % short:** 223 yd from the mapped box beside the 5th green
   against 264. The card distance falls on the 5th green itself, so no fairway tee fits.
   Recommendation: accept as mapped, unless the developer can point to the back tee.
4. **Hole 14 is 23.8 % short:** 339 yd from the small round pad where OSM's line starts
   (mapped as fairway, copied as a tee: `proposed/tee14.geojson`) against 445. 106 yd
   further back along the line is sage near the 13th green. Recommendation: accept as
   mapped unless the developer can say where the back tee is (the hole line may be drawn
   from the wrong pad).
5. **Sand (the card's local rule: all sandy areas are waste areas).** Every bunker is
   tagged `sand=waste` with `"waste_sand": true` (surface 18: general area, playable), and
   the dry wash left of the 14th green, which OSM maps as a lateral water hazard, is waste
   sand too (`proposed/wash14.geojson`).
6. **Desert as a red penalty area (the card's Model Local Rule B-1)** needs a game change:
   see "Request for the design chat" in `docs/courses/gamble_sands.md`. Until then the
   desert plays as rough.
7. **Lidar covers only the west third** (the project ends at x 302246): no trees east of
   it (the photo shows hardly any). Sage and rabbitbrush bushes come from the NAIP photo
   (`gorse` key, bushes only).
8. **Quicksands** (the resort's 14-hole par-3 course) is dropped from the layout and is
   out of bounds.
9. **Card hole, theme and logo:** card hole 2 (rotating 4, 12, 9); theme `gamble_sands`;
   logo an apple on a sand mound. The course chat's picks.
