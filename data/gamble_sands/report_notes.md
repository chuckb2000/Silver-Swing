## Other open items (Gamble Sands)

Calls the course chat made on 2026-11-13; the developer has not seen them. Each has the
facts, the options and a recommendation.

1. **Scorecard.** Three third-party cards disagree. 18Birdies: Medal 7,305 yd, 74.8/131.
   Greenskeeper.org: the same but 1 = 422 and 2 = 301 (7,169, 74.2/128). GolfPass: an older
   Medal row (7,151, 73.4/120) with other yardages on most holes. Pars agree. Built from
   18Birdies, whose 1 (518) and 2 (341) match the mapped tees (496 and 333 yd built); its
   handicap row equals GolfPass's women's row. Options: keep 18Birdies; switch to another
   card; a photo of the club's printed card. Recommendation: keep it until a printed card
   turns up.
2. **Hole 6 (par 3) is 15.7 % short:** 223 yd from the mapped tee beside the 5th green
   against 265 on every card. Nothing behind that box but the 5th green. Options: accept;
   a developer screenshot showing a back tee. Recommendation: accept.
3. **Hole 12 is 13.2 % short:** 289 yd from the round tee next to the 11th green against
   333. Recommendation: accept (no other pad on the photo).
4. **Hole 14 is 23.5 % short:** the OSM line starts on a small round mown pad (mapped as
   fairway, copied as the tee: `proposed/tee14.geojson`), 334 yd from the green against
   437. The NAIP photo shows only sage behind it toward the 13th green. Options: accept;
   a screenshot showing the back tee. Recommendation: accept for now; this is the hole most
   likely to be mapped wrong.
5. **Hole 18 is 8.6 % long:** 615 yd from the round tee behind the 17th green against 566.
   The Medal tee is probably a forward box in the fairway that OSM does not map.
   Recommendation: accept.
6. **Penalty area w947744580, left of the 14th green:** OSM maps a dry sandy wash as a
   lateral water hazard, so the game plays it as a red penalty area and draws it as water.
   Options: keep it (red); redraw it as sand (bunker) or waste sand. Recommendation: waste
   sand (the photo shows bare sand, no water).
7. **The stream w947239360** crossing toward 14 is a dry wash: no penalty area made.
8. **Lidar covers only the west third.** The 2021 North Central Washington project stops
   at x 302246 (EPSG:32611); east of it no trees are found (the photo shows hardly any).
   The bushes (sagebrush, rabbitbrush) come from the NAIP photo everywhere
   (`pipeline/gorse.py`, bushes only, no penal lie). Tree types from crown shape.
9. **Quicksands**, the resort's 14-hole par-3 course north-east of the clubhouse, is
   dropped from the layout (its polygon and hole lines): it is out of bounds, its greens
   drawn as greens.
10. **Card hole, theme and logo:** card hole 2 (rotating 4, 12, 9); new theme
    `gamble_sands`; logo an apple on a sand mound. All the course chat's picks.
