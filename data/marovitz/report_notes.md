## Developer's calls pending and other open items (Sydney R. Marovitz)

Built overnight 2026-10-30/31 while the developer was away; each call below was made by the
course chat under the developer's "make the call and log it" instruction and can be reversed.

1. **Lidar:** four 2,500 ft tiles of the 2017 Cook County survey cover the world. The two
   east-column tiles (LAS_17259250, LAS_17259275, the lakeshore strip) failed twice on the
   runner (rockyweb HTTP 429 and a timeout, then 404 on the prd-tnm S3 mirror) and came on the
   third try from rockyweb; the course was built first without them, then rebuilt with all four.
2. **Scorecard: the club's own card** (sydneymarovitz.cpdgolf.com PDF, printed 10/2020, posted
   2025-08; copy in release `data-marovitz`). Tees Blue 3,265 / White 3,034 / Red 2,493, par 36,
   men's ratings Blue 35.5/127, White 34.4/122, Red 31.9/110 (9-hole). Conflicts not used:
   GolfLink Blue 3,240 (35.1/117), Red 3,156; Hole19 White 2,774, Red 2,279.
3. **Tee sets (call): Blue (the back set) and White (next forward)**, both playable, Blue the
   default (developer's overnight rule). Red is in `scorecard.csv`, not built.
4. **Hole 2 par:** OSM par 4, card par 5 (469 yd Blue). The card is used.
5. **White flags (call: accept, within 8 %).** Hole 1 White 344 yd vs 358 (-4.0 %): OSM maps
   a small forward box (w211376192, 53 m2) and the hole line starts at the back box. Hole 7
   White 397 yd vs 377 (+5.4 %): only one tee box is mapped on 7 (w211376203), shared with
   Blue, so White plays from its front. Options: a White box traced from a developer
   screenshot, or accept (recommended).
6. **Penalty areas (call, standing default):** the Marovitz golf pond by the 6th green
   (w114835188, `golf=water_hazard`, which exports yellow) is red via `edits.json`. Lake
   Michigan, Montrose Harbor and everything east of the boundary is out of bounds.
7. **Wind 3-14 mph (call):** the open-coast band, by analogy: the course sits on the open
   Lake Michigan shore with no shelter to the east.
8. **New theme `marovitz` (call):** urban lakefront parkland: American elm, honey locust and
   cottonwood (three broadleaf variants), blue spruce / Austrian pine for the conifer class,
   cool bluegrass greens and Lake Michigan teal water.
9. **Logo (call):** the Waveland clock tower over Lake Michigan waves with a flag on a green;
   an original drawing.
10. **The Waveland Clock Tower** (w53582240) is tagged `golf=clubhouse` in OSM, which the
    pipeline does not read as a building; `edits.json` copies it as a building.
11. **Nine "trees" 50-79 m tall dropped** (`drop_trees`): crowns among the Lake View high-rises
    west of Lake Shore Drive, outside the boundary; tower roofs the OSM footprints miss.
12. **Tree types** come from crown shape. The lidar was flown 17-18 April 2017 (early leaf-out),
    so `laz.leaf_off` was not set. Trees cut or planted since 2017 are unknown; the 2023 NAIP
    tile (30 cm) is in the release for a check, not used yet.
13. **Two practice greens** south of the 9th green (w1443757819, w1443757820) are wrong greens
    (relief required).
