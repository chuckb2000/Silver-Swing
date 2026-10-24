# Sand Hills Golf Club — scouting (2026-10-24)

Bill Coore and Ben Crenshaw's 1995 course in the Nebraska Sandhills near
Mullen (Hooker County): a private club routed through natural sand blowouts in
grass-covered dunes on an 8,000-acre site, with almost no trees and often
strong wind. Widely held to be one of the best modern courses in the US. It
would be the game's first Great Plains course, and its blowout bunkers and
prairie grass need a palette no existing theme has.

## At a glance
| | |
|---|---|
| Id | `sand_hills` |
| Location | Mullen, Hooker County, NE; 41.8703, -101.1006 (**unconfirmed**: Stymie's map point, about 12 miles south of Mullen; checked by DATA_REQUEST step 0 before any download) |
| UTM | zone 14, EPSG:32614 (0.9° inside the zone's western edge) |
| Holes / par | 18 / 71 (35 out, 36 in; GolfPass card) |
| Designed | Bill Coore and Ben Crenshaw, 1995; no renovation found |
| Access | private |
| Notable | 130 possible holes found on the site (golfcoursegurus); ranked 39th in the US by golfcoursegurus; national magazine rankings not checked |
| In video games | not checked (search budget ran out); no official appearance known |
| Default tee (standing defaults) | **Square** (no Blue; closest to 6,300): 6,432 yd (6,434 by the holes), 70.0 / 127 |

## Data status
| Item | Status |
|---|---|
| Scorecard | **third-party**, one per-hole source (GolfPass): Diamond / Square / Circle, pars, men's handicap; ratings for all three (women's for Circle only). Hole 15 Diamond 453 vs 469 (a review; 469 makes the 7,089 total). No official card online; women's indexes missing |
| OSM | unknown until the export |
| Bare earth | USGS 3DEP via the ImageServer (four pieces); **whether 1 m lidar covers the site, and its project and year, not found** (optional TNM link in DATA_REQUEST item 2 answers it) |
| Canopy | not needed: almost treeless (OSM fallback); NOAA DAV only if the photo shows trees in play |
| Orthophoto | USDA NAIP (latest in the USGS service), 1 m JPEG, four pieces |

## Build notes
- **Find it first.** The centre is a listing's map point, not a confirmed
  location (the same listing's scorecard is another course's). The box is
  6 x 6 km to absorb an error of a kilometre or two plus a spread-out routing;
  DATA_REQUEST step 0 checks the OSM outline is inside before anything is
  downloaded (COURSE_LESSONS 26: a box 2 km off cost a full download). The
  Dismal River Club, also south of Mullen, is a different club.
- **Theme: new `sandhills`.** Nothing existing fits: `puget` has tawny fescue
  but grey-white sand and fir trees; `bandon_dunes` has gorse and coastal
  pines. Needed (≤ 32 colours, `pnw.json` keys plus F0-F2 like `puget`;
  the plants named are the Sandhills' in general, from memory: check the
  photo):
  - rough: native prairie grass (little and sand bluestem, prairie sandreed):
    sage-olive green going straw-tan, F0-F2 for the long grass;
  - sand: warm buff-tan blowout sand (not white), a darker tan lip;
  - fairways: firm, pale yellow-green; greens a little brighter;
  - trees (few): eastern red cedar (dark blue-green, narrow conifer) and plains
    cottonwood (broad, bright green), around the buildings;
  - theme bush (`shrub`, trees.json `c: 3`): soapweed yucca, a spiky
    blue-green rosette, some with a cream flower stalk;
  - water: none on the course (keep the keys; blue-grey).
  Show the developer one hole in the new palette before rendering (7.6).
- **Trees:** almost none in play; some round the clubhouse and cabins.
  Build on the OSM fallback (Chambers Bay lesson: ask what the lidar buys);
  watch for buildings, windmills and vehicles if lidar is ever used.
- **Sand (bunkers or waste):** the bunkers are natural blowouts, many of them
  huge (the 4th's crater down the left; the 17th's deep front bunker). Map
  every `golf=bunker` as a bunker (they are the hazards the course is built
  around). Bare sand far from play that OSM may map as `natural=sand`
  (unmaintained blowouts in the dunes) is better as **waste** (surface 18,
  general area, `"waste_sand": true`) than as bunker or out of bounds; check
  each on the photo. Recommendation in open question 4.
- **Rough:** native grass beyond narrow mown rough; standard rough physics
  (it isn't gorse). If OSM separates mown rough from `natural=grassland`,
  both are rough.
- **Water:** none known (no source mentions a pond or creek). Stock tanks or
  wet meadows outside play, if mapped, stay scenery.
- **Out of bounds:** the OSM boundary (if there is one: the ranch is huge; if
  OSM draws the whole ranch, the boundary is no use as OB and the course chat
  needs holes-plus-margin, COURSE_LESSONS 27). Highway 97 (the address) and
  ranch tracks: check where they run; tracks inside are cart paths.
- **Several courses:** no. A practice ground: unknown (check OSM).
- **Renovations after the data dates:** none known.
- **Wind: propose a new "plains" band, 5-15 mph.** The standing defaults stop
  at "open coast 3-14" (and Bandon 8-16 by the developer's call). The Sandhills
  are open, treeless grassland with a golf-season mean wind of about 10 mph
  (regional climatology, from memory, unverified) and few calm days: 5-15
  centres on that, sits between the coast and Bandon, and keeps Easy (×0.6:
  3-9 mph) playable.
- **Course card hole:** 17, the 150-yd par 3 the review calls the signature:
  a small green mostly hidden behind a deep front blowout.
- **Logo idea:** a soapweed yucca in bloom on a dune crest (the Sandhills'
  plant; nothing from the club's emblem, which wasn't checked). Alternative: a
  sharp-tailed grouse.
- **What makes it hard:**
  1. Location unconfirmed (step 0).
  2. **World size:** an open site where holes wander; if the boundary needs
     more than 2,048 m on a side, the course chat must stop and ask
     (COURSE_BUILD 10). Likely answer: a world of the holes + 150 m.
  3. **Elevation detail:** the blowouts and dune contours are the course. If
     the 3DEP service has only 10 m data here, bunkers lose their shape: check
     the DEM on arrival (a hillshade should show the blowouts).
  4. OSM coverage unknown on a remote private course: possibly the whole
     course to trace from NAIP (the tracing desk).
  5. Tan sand vs straw grass is a low-contrast split on the photo for tracing
     and colour rules.

## Open questions for the developer
1. **Location:** run step 0 in DATA_REQUEST before downloading — recommendation:
   do it; if the outline is outside the box, send its bounds and the links get
   remade.
2. **World over 2,048 m?** — recommendation: if the routing needs it, build a
   world of the holes + 150 m (ranch scenery clipped) rather than raising the
   limit.
3. **Scorecard:** only GolfPass has per-hole yardages — recommendation: build
   Square from it; if you can get a photo of the printed card, it replaces
   it. Hole 15 Diamond: 469 (makes the 7,089 total) rather than 453.
4. **Sand:** every mapped bunker a bunker; unmaintained blowout sand outside
   the holes as waste (`"waste_sand": true`) — recommendation: yes.
5. **Theme:** new `sandhills` (buff sand, prairie grass, yucca bush, a few
   cedars and cottonwoods) — recommendation: yes; `puget` as a stopgap only.
6. **Wind:** 5-15 mph — recommendation: yes (a new "plains" band for the
   standing defaults).
7. **Lidar:** skip the point cloud; build trees from OSM — recommendation: yes.
8. **Logo:** soapweed yucca on a dune — recommendation: yes, unless you have
   one in mind.

## Kickoff prompt

```
Build Sand Hills Golf Club (`sand_hills`, Mullen, NE) for Silver Swings Golf.
Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/sand_hills/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `sand_hills-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. Work on branch
course/sand_hills. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
