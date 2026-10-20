## Course-specific notes (Willamette Valley CC)

1. **Hole 13 green** is not in OSM. The developer identified it (2026-10-19) as
   the green left of the pond, where OSM's hole line and pin end ("A"), not the
   1,825 m2 green north-east of the pond ("B", a striped practice area in the
   OSIP 2022 image). Traced from the OSIP 2022 orthophoto
   (`raw/osip2022_h13.tif`, 0.3 m) by `data/willamette_valley/trace_h13.py`
   (propose_trace.py's green method, threshold 3.5): 385 m2, OSM pin inside.
   148.7 yd vs 151 (-1.5 %).
2. **Hole 3 Blue tee** is not in OSM and the lidar shows no pad; the OSM boxes
   fit White (137), Orange and Yellow. The developer placed it on the fairway
   that runs from the 2nd green; the course chat put a 6 x 4 m box at the card's
   162 yd on that fairway's open north end (the south part lies under 22-24 m
   trees), checked on the OSIP 2022 image and approved by the developer
   (`proposed/tee3.png`).
3. **Holes 9 and 14 fairways** are tagged `golf=tee` in OSM (228 x 36 m and
   328 x 61 m strips along the hole lines); both are mown fairway in the OSIP
   2022 image and are played as fairway (`edits.json`).
4. **Cart paths:** OSM tags the 11 cart paths `golf=path` + `highway=path` (the
   current OSM tag); the pipeline reads `golf=cartpath`, so `edits.json` adds
   copies as cart paths (free relief; the card lists cart paths as immovable
   obstructions).
5. **Hole 16** measured 337 yd from its box centre (-4.6 %); s06 moved the
   virtual tee 15 m within the long box w1053602296 (353 yd).
6. **Not modelled:** the card's no-play zone around the maintenance building on
   14-16 (a red penalty area on land; the buildings are drawn and the ground
   around them plays as rough). The card's out of bounds (left of 1, 2, 3, 4,
   5, 11, 12, 13 and 18) is taken as the OSM course boundary; no stakes inside
   it are modelled. Developer, 2026-10-19.
7. **Practice areas:** three greens on no hole (the practice putting green by
   the clubhouse, B by the 13th, one by the 10th green) are wrong greens; two
   unassigned tee polygons (a practice tee by the clubhouse and an oval by the
   9th tee) play as tee.
8. **Water:** five ponds, all red (by 3/4, 4/5, 6, 13/14 and 16/17). The
   Willamette River lies outside the boundary and is out of bounds. Five lidar
   crowns over the hole 6 pond were dropped.
9. **Trees** from the DOGAMI canopy model (lidar year not recorded; probably the
   2013 Clackamol flight, leaf-on), types from crown shape only. They match the
   2022 imagery around the course. `tee_shot_margin_m` 0.5 as at Stone Creek.
