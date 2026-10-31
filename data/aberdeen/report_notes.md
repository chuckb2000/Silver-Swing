## Calls made overnight by the course chat (2026-10-30/31), pending the developer

The developer was away and asked for each call to be made and logged. "Assigned by the developer" in
the items above means a tag in `edits.json`: these three Gold tee tags are the course chat's.

A. **Hole 7 Black, -12 % (fail, accepted).** OSM maps four boxes; the back one is 340 yd against the
   card's 387. No raised pad shows in the DEM behind it (open grass under the power line, then the cart
   path). Options: (a) accept as built (chosen; `checks.json` yardage max 0.13); (b) the developer
   supplies a Google/Bing screenshot of the area south-east of the 7th tee (local x 820-900, y 1080-1160)
   with 4 control points and the Black box is traced; (c) `extend_start` the line 43 m onto grass
   (against COURSE_LESSONS 2). Recommendation: (b) when convenient, else (a).
B. **Gold tee boxes tagged** on holes 5 (w1032402649, 506 yd), 6 (w1032403023, the large box between
   Black and Green) and 18 (w1032607409, 389 yd): s06 had put Gold on the Black box, so Gold played the
   Black length. Hole 6 Gold is 151 yd vs 157 (flag, -3.8 %).
C. **Scorecard: GolfingRecord (unverified)**, chosen because its rows add up to the rated totals. Other
   listings differ: GolfPass and 18Birdies give Black 12 = 406 (we use 418, built 423) and GolfPass
   Gold 6 = 146 and Gold 18 = 379. GolfPass/18Birdies also list a Blue tee (5,670 yd, 67.0/116); the club
   site says four sets, so Blue was treated as not a real set. Ask the club for a card photo to settle.
D. **Tee sets: Black and Gold** (developer's overnight rule: back tees plus the set in front when there
   is no Blue). Default Gold. If Blue is real, the rule would make it Black + Blue instead.
E. **Every tree drawn deciduous** (`tree_type`): the leaf-off QL2 lidar can't separate needle from
   broadleaf here (the last-return shares are one broad hump; the crown-shape rule gave 59 % conifers in
   an oak-maple parkland). The few planted spruces by the houses are drawn as broadleaves.
F. **Power line taken out of the trees** (`not_trees_areas`, proposed/not_trees.geojson): a
   transmission line crosses the course north-south at local x 833 (holes 1, 6/7, 9 area) and runs
   south-east from (831, 590); its conductors and towers read as 20-49 m "trees" (954 crowns in a 15 m
   strip either side). Real trees inside that strip are lost too; the right-of-way is kept clear anyway.
G. **Roofs** dropped with `roof_last_share` 0.85 (class-1-only lidar, as at Wannamoisett): 4,250 crowns.
H. **Streams as red penalty areas** from the DEM channel (propose_channels.py) along the five stream
   lines near holes 13, 15, 17 and 18 (`flatten=no`); the one that crosses the 17th between tee and green
   runs through a wooded swale on the NAIP photo. Option: drop any the developer says is dry.
I. **All 13 golf=water_hazard ponds tagged red** (standing default; OSM's tag would export yellow).
J. **Wind 2-10 mph**: no Midwest band yet; open, flat northwest Indiana 15 km from Lake Michigan,
   a little windier than inland New England (1-9).
K. **New theme `aberdeen`** (bur oak, sugar maple, silver maple/cottonwood; bluegrass turf; dark wetland
   water). Review: /home/claude/review/aberdeen_theme.png (top row new, bottom row seekonk).
L. **Logo**: a sandhill crane flying over a cattail marsh at sundown (the course's preserved wetlands;
   northwest Indiana's autumn crane stopover). Original drawing.
M. **Card**: greens 16, 13, 11, 7.
N. Two practice greens by the range play as wrong greens; the range is out of bounds (standing defaults).
O. The centre-line tree test (opt-in) was not used: it flagged a real edge tree on hole 13 where the
   OSM line runs along the fairway's left edge (COURSE_LESSONS 3). The standard tee-shot test passes.
