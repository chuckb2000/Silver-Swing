## Other open items (spec 11.4)

1. **Scorecard not verified against the club's printed card.** Yardages, pars and stroke indexes come from GolfPass. golfingrecord.com lists a different stroke-index order (e.g. hole 5 = 1, hole 6 = 9) and Blue 70.4/132; OSM tags hole 18 with handicap 5. The game uses GolfPass.
2. **Red tee par** (73 vs 71 on GolfPass) - not relevant yet: only the Blue tees are built.
3. **OSM coverage** - complete: all 18 holes have a hole line, green, pin and fairway; 46 tee boxes, 65 bunkers, 4 water hazards and 32 cart paths are mapped (see the audit below). Two extra greens are practice greens and count as wrong greens.
4. **Water** - the four ponds are mapped as `golf=lateral_water_hazard` and play as red penalty areas. Oswego Lake lies outside the course boundary (out of bounds); no hole plays along it.
5. **Imagery** - the NAIP download did not come through, so tree species are inferred from lidar crown shape only.
