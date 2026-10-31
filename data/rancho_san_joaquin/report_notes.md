## Developer's calls pending (made 2026-10-31 by the course chats)

Each was made under the developer's overnight "make the call" instruction; each can be reversed.

1. **Card and ratings.** The club's printed scorecard (ranchosanjoaquin.com, fetched by the workflow; `raw/card/`) has the same yardages, pars and handicaps as the greenskeeper.org card the first chat used (Black 6,431, Blue 6,158, White 5,709). Its ratings differ from greenskeeper's: Black 70.5/126, Blue 69.4/123, White 66.5/116 (greenskeeper 70.8/128, 69.7/125, 67.6/119; GolfPass agrees with the card). **Chosen: the club's card.**
2. **Tee sets and default.** Built Black (the back tees) and Blue, both playable (overnight rule of 2026-10-30); White stays in `tee_sets` with `playable: false` and in scorecard.csv. **Default: Black**, the longest set (developer 2026-10-31 on main; `courses.test.ts` checks it), not Blue as the overnight rule said.
3. **Black on 2 and 13 accepted short (fail).** OSM has no Black box on either hole and the lidar pad finder gave none within the card distance; on the NAIP photo, 2's line start sits at the end of a cart path with a fence and a bare lot behind it, and 13's backs onto the road and houses. The Black tee is the start of the OSM hole line: 2: 141 vs 157 yd (-10.3 %), 13: 166 vs 181 (-8.1 %). Accepted with `checks.json` yardage entries. Options: keep; trace the boxes if the developer can point to them; nothing else permitted would reach the card. **Recommendation: keep.**
4. **Hole 7 Black** -4.1 % (354 vs 369) with the tee at the back of its box: accepted flag.
5. **All four ponds red** (standing default); OSM tags them golf=water_hazard (yellow): `edits.json` tags them red. The first build had left them yellow.
6. **Trees from the 2023 California Gaps lidar** (class 1 only, flown 8 November 2023): 3,842 tops on OSM building footprints dropped (the houses around the course); types from crown shape only. The OSM tree points (573) were the first build's fallback.
7. **Theme** `strawberry_farms` reused unchanged (the other Irvine course); **logo** the first chat's American avocet; **card hole** 13 (rotating 6, 5, 11). Course chats' choices.
