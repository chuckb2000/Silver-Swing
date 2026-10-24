# Pasatiempo Golf Club — scouting (2026-10-24)

Alister MacKenzie's 1929 course for Marion Hollins in the hills above Santa Cruz,
California. MacKenzie lived in a house beside the 6th fairway until his death in
1934. The front nine falls toward Monterey Bay and climbs back; the back nine
crosses a canyon of barrancas, with the three-tiered 16th green and a closing par 3
over the ravine. It is semi-private (open to public play), on every "courses you
can play" list, and was in two golf video games. California is new to the game:
Pasatiempo would be the third California course after Stanford and Cypress Point,
which other chats are building now.

## At a glance
| | |
|---|---|
| Id | `pasatiempo` |
| Location | Santa Cruz, Santa Cruz County, California (20 Clubhouse Road); 37.0040, -122.0260 (Wikipedia 37°00′14″N 122°01′34″W; OpenGolfAPI 37.00415, -122.02598) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 18 / 70 (club card; 35-35; five par 3s, three par 5s) |
| Designed | Alister MacKenzie, opened 8 Sep 1929 (bunkers shaped by his associates Robert Hunter and Paddy Cole). Restorations: Tom Doak with Jim Urbina (Renaissance Golf), consulting from 1996; hole 12 first, front nine fall 2005, back nine fall 2007; more than 50 trees removed, 36 bunkers restored, greens enlarged. Jim Urbina Golf Design, 17 Apr 2023 - 5 Dec 2024: every green rebuilt (Poa to bentgrass) and every bunker rebuilt; front nine reopened Dec 2023, back nine closed May-Dec 2024; more trees removed |
| Access | semi-private (shares plus daily-fee public play) |
| Notable | 2004 U.S. Senior Women's Amateur; Western Intercollegiate (San Jose State); Golf Digest 2025 #15 America's Greatest Public; GOLF 2024-25 #11 Top 100 You Can Play; top100golfcourses #63 USA |
| In video games | *PGA Championship Golf 1999 Edition* (Sierra; one of its eight courses, per Wikipedia) and *Tiger Woods PGA Tour 06* (Giant Bomb's course list, Xbox 360) |
| Default tee (standing defaults) | Gold, 6,495 yd, 72.7/143 (club). No Blue on the card; Gold is the single set closest to 6,300 (see question 1) |

## Data status
| Item | Status |
|---|---|
| Scorecard | Third-party per-hole card for all 8 sets (Stymie, the same as GolfPass) whose Gold, Gold/White, White, Green/Hollins and Hollins totals match the club's printed totals. The club's own hole-by-hole card is in two images the sandbox couldn't open (DATA_REQUEST item 5). Missing: the forward tees' own par and stroke index |
| OSM | unknown until the export (no OSM page came up in search) |
| Bare earth | USGS 3DEP best available 1 m (tool link). Project and year unconfirmed: the search budget ran out. Item 2b asks the service; tile `x58y410` |
| Canopy | NOAA Data Access Viewer point cloud. Dataset id unconfirmed; item 3 has the developer pick the newest USGS point cloud listed for the box. Flight year unknown, and probably before the 2023-24 tree removals |
| Orthophoto | NAIP via the USGS National Map (latest the service serves; California is flown every two years). A 2024 image shows the back nine under construction |

## Build notes
- **Theme:** new, `norcal` (Northern California), shared with SFGC. California
  isn't in the game yet. Before making it, check `course/cypress_point` and
  `course/stanford` (in progress now) for a California theme, and reuse it if its
  trees fit. It is separate from the `socal` theme proposed for Pelican Hill and
  Strawberry Farms, whose trees and colours differ. Pasatiempo needs:
  - Monterey pine: dark blue-green, broad irregular clumpy crowns.
  - Monterey cypress: very dark green, flat-topped and layered (a "large cypress
    grove" right of the 6th, a planted corridor on the 7th).
  - Coast live oak: dense, rounded, dark olive (a large oak behind the 13th green).
  - Probably eucalyptus: tall, grey-green, pale trunks. The assignment names it; no
    source read here does.
  - Fine bentgrass greens (new in 2023-24). Ryegrass/Poa-type fairways that are
    green but drier and warmer in tone than the `pnw` turf.
  - Golden-tan dry grass and dark brush on the barranca banks and off-course
    hillsides (California summer-dry).
  - Bright white bunker sand ("glistening white sand", PGA 2019) with big flashed
    faces.
  - Little water (a dark creek in the barranca on 16).
- **Trees:** dense on the front nine (6, 7 and 8 are crowded by houses and trees)
  and in the barrancas. Removals after any likely lidar year: Monterey pines near 2
  and 3, a large tree right of the 6th green, trees and shrubs around the 15th green,
  and a small tree in the 10th's greenside bunker cluster (2023-24). If the lidar
  predates 2023, drop trees the newest orthophoto no longer shows (the
  `trees_need_ortho` route used at Bandon Preserve) and list them. Power lines cross
  holes 6 and 17 (local rule). Check the canopy model for wires and use
  `remove_wires` (Oregon Golf Club) if they show.
- **Water and penalty areas:** "virtually no water in play" (Links). The penalty
  areas are barranca crossings. The local rules name hole 11 (a lateral one between
  11 and 12, with an extra drop on the far side), hole 16 (short and right of the
  green, with a stream) and hole 18 (yellow, a drop zone at the forward tee; the
  same ravine runs in front of the 10th tee). Recommendation: red penalty areas
  (standing default, 18 included) along the barranca channels at those crossings,
  from OSM `waterway` lines plus the DEM channel (`propose_channels.py`,
  `flatten=no` so the bed keeps falling). Leave the grassed gullies (12th front,
  14th swale, 13th left) as general area. Never draw a barranca without data: if
  OSM has no stream line, propose from the DEM and list it.
- **Out of bounds:** the course boundary and the driving range (left of hole 1, in
  play on 1 and 9). The club's local rule also makes the paved roads and culverts
  on holes 2, 5, 6, 8 and 9 OB, even when the ball lies on another hole. See
  question 3.
- **Roads, bridges, buildings:** Clubhouse Road and Hollins Drive (MacKenzie's
  house beside the 6th). Footbridges over the canyon after the 10th and 18th tee
  shots and on the 11th. A paved road and fence between the 10th and 16th greens and
  the 11th and 17th tees (an obstruction, free relief). Houses on 6, 7 and 8.
- **Special ground:** barrancas only (above). No waste sand, gorse or ice plant is
  reported. Don't set `waste_sand`.
- **Greens:** steep, tiered greens are the course's character. The 16th has three
  or four tiers over about 10 ft back to front; the 11th has two tiers and a false
  front; 3 and 8 have tiers. Use `green_tiers` for 16 at least, and `green_tilt`
  where the DEM shows it.
- **Terrain:** about 90 m (300 ft) of relief, from the 12th tee (high) to the 2nd
  green (low). Uphill holes: 3, 9, 11 (more than 100 ft) and 17.
- **One course on the site**, so no `layouts`.
- **Renovations after the data:** every green and bunker was rebuilt 2023-24. OSM,
  NAIP up to 2022 and the lidar probably show the old shapes. Check OSM's greens and
  bunkers against the newest imagery; if they're old, ask for a Google or Bing
  screenshot (CLAUDE.md 5.1, DATA_REQUEST item 6).
- **Wind:** none of the standing bands fits exactly. Proposal: a "California coast,
  inland hills" band of **2-10 mph**. The course is about 4 km from Monterey Bay, in
  the hills and among trees. A bay sea breeze most afternoons (the 4th "plays into
  the prevailing Pacific wind"), but sheltered; one visitor had "a barely-there
  breeze". That is weaker than the open-coast band (3-14) and stronger than inland
  Pacific Northwest (1-7).
- **Course card hole:** 16. MacKenzie's favourite two-shotter ("the best two-shot
  hole I know"), with the tiered green above the barranca and Doak's restored
  front-right bunker. Alternative: 18, the par 3 over the ravine.
- **Logo idea:** a small wooden footbridge across a pixel barranca with a flag on
  the far bank (the bridges on 10 and 18). Alternative: an hourglass with white
  bunker sand ("pasatiempo" means pastime). Not the club's emblem.
- **Hard parts:** heavy canopy plus steep ground, so tee-shot clearing (s06b) will
  remove trees; list them. Post-restoration shapes newer than the data. The
  barrancas: they need channel proposals, not invented polygons. Tiered greens. The
  odd rows on the forward cards: hole 1 Green 458 > White 440.

## Open questions for the developer
1. **Default tee.** Gold (6,495, 72.7/143) is the single set closest to 6,300.
   Gold/White combo (6,222, 71.5/139) is closer but is a combo (it reuses Gold and
   White boxes). Recommendation: Gold, as earlier courses picked single sets. Build
   White (6,093) too only if you want a shorter option.
2. **Barrancas.** Red penalty areas only at the staked crossings (11, 16, 18 and
   the 10th-tee ravine), drawn along the channel from OSM and the DEM; banks and
   gullies elsewhere are rough or woods. The club's 18th is yellow; the standing
   default makes it red. Recommendation: as written.
3. **Roads inside the course.** The club makes the paved roads and culverts on 2, 5,
   6, 8 and 9 out of bounds; the standing default makes roads inside the boundary
   cart paths. Recommendation: the standing default, unless the OSM boundary
   already leaves those roads out (then they're OB automatically). The game can't
   make a road OB for some holes only.
4. **Post-restoration shapes.** If OSM's greens and bunkers predate 2023-24 (the
   course chat compares them with the newest imagery), allow a Google or Bing
   screenshot for those holes (5.1). Recommendation: yes, only where they differ.
5. **Scorecard.** Please save the club's two card images (DATA_REQUEST item 5).
   Until then, use the Stymie/GolfPass rows, whose Gold total matches the club's
   6,495. Recommendation: the course chat checks every Gold hole against the images
   and uses the images where they differ (an April 2024 source has holes 3-9 1-2 yd
   shorter).
6. **Theme.** Recommendation: one new Northern California theme, `norcal`,
   shared with SFGC, Cypress Point and Stanford: Monterey pine, Monterey cypress,
   coast live oak, golden summer grass and white sand. Whichever chat lands first
   owns it; the others reuse it, adding a painter if needed.
7. **Wind 2-10 mph** (a new "California coast, inland hills" band). Recommendation:
   accept.
8. **Logo:** the barranca footbridge with a flag? Recommendation: yes.

## Kickoff prompt

```
Build Pasatiempo Golf Club (`pasatiempo`, Santa Cruz, CA) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/pasatiempo/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `pasatiempo-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`pasatiempo`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/pasatiempo. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
