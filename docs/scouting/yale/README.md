# Yale Golf Course — scouting (2026-10-24)

The Course at Yale, Yale University's course in Upper Westville, New Haven,
CT: Seth Raynor's 1926 Macdonald-template course on a rocky, wooded, steep
site (Charles Blair Macdonald consulting, Charles Banks running construction),
with the Biarritz 9th across Griest Pond. The developer asked for it by name.
It reopened on 28 April 2026, its centenary, after a two-year restoration by
Gil Hanse and Jim Wagner, so it has a new card and every public map, lidar and
photo shows the course from before the work. Connecticut is a new state for
the game.

## At a glance
| | |
|---|---|
| Id | `yale` |
| Location | 200 Conrad Drive, New Haven (Upper Westville), New Haven County, CT; centre 41.32081, -72.97978 (the Army Corps permit notice's project point); clubhouse about 41.3186, -72.9855 (18Birdies, OpenGolfAPI) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / 70 (34 out, 36 in; par 3s at 5, 9, 13, 15; par 5s at 16, 18) |
| Designed | Seth Raynor with C. B. Macdonald (consultant) and Charles Banks (construction), surveyed 1923, opened 15 April 1926. Ralph Barton is credited in some accounts; not confirmed by the sources read. Roger Rulewich 1990s work (12th's Alps bunker); Scott Ramsay's tree and green work 2003-2020; restoration by Gil Hanse and Jim Wagner (Hanse Golf Design, shaping by Caveman Construction), closed September 2023, reopened 28 April 2026 |
| Access | public daily fee since 2020 (green fee up to $350); owned by Yale University |
| Notable | Golf Digest America's 100 Greatest Public #38, Greatest College Courses #1 (2023); Golfweek best campus course; 1988 U.S. Junior Amateur, NCAA regionals, Connecticut Opens, New England Amateurs; LINKS Magazine's top course in Connecticut (June 2026) |
| In video games | none found in the pages read (the web search budget ran out before a dedicated search) |
| Default tee (standing defaults) | Long, 6,361 yd, 71.5 / 139 (no Blue; Long is closest to 6,300) |

Hole names (Yale's own): 1 Eli, 2 The Pits, 3 Blind, 4 Road, 5 Short,
6 Burnside, 7 Lane, 8 Cape, 9 Biarritz, 10 Carries, 11 Valley, 12 Alps,
13 Redan, 14 Knoll, 15 Eden, 16 Lang, 17 Nose, 18 Home.

## Data status
| Item | Status |
|---|---|
| Scorecard | post-restoration card complete for four sets (Championship 7,054, Long 6,361, Regular 5,767, Short 4,814) from GolfPass (per hole) and 18Birdies (ratings, Championship per hole); rows add up to the totals. No club card online. Front-nine stroke index conflicts (scorecard_sources.md) |
| OSM | mapped to some degree: OpenGolfAPI, built from OSM, counts 47 bunkers and 4 water features; hole lines, greens and tees unknown until the export. Probably pre-restoration geometry |
| Bare earth | USGS 3DEP 1 m (project not confirmed; 2016 statewide QL2 or the 2023 flight) and the Connecticut 2023 lidar DEM from CT ECO (spring 2023, QL1); both pre-restoration |
| Canopy | NOAA DAV dataset 10296, 2023 CT GIS Lidar: Connecticut Statewide, flown 22 Mar - 7 May 2023, leaf-off, classes include 3/4/5 vegetation and 6 building. CT ECO serves no DSM, nDSM or canopy raster (only bare earth, hillshade and intensity), so the point cloud is the route. Pre-dates the 2024-25 tree removal |
| Orthophoto | NAIP (newest the USGS service holds; CT 2023 NAIP is 0.3 m, summer 2023); CT ECO spring 2023 leaf-off 3-inch orthos (optional). All pre-restoration |

## Build notes
- **Theme:** a darker woods theme fits Yale better than either New England
  default. `bayside`'s pitch pine is a sandy-coast tree and has no place here;
  `seekonk` is close (eastern white pine, oak, maple) but tints the maples
  early-fall. Yale is deep-green hardwood forest on rocky hills, with tan native
  grass between holes and grey ledge. Recommendation: a new theme (the
  "temperate forest" theme CLAUDE.md 4 already plans), made from `seekonk`:
  oak, maple, hickory and beech in full summer green, white pine and hemlock as
  the conifers, a darker rough, fescue tones (like `coastal`'s F0-F2) for the
  native areas, grey-green ponds, white sand. Fallback with no art work:
  `seekonk`. Tree species are not confirmed by any source read; the leaf-off
  2023 lidar and photo will show the conifer share.
- **Trees:** dense woods line every hole. 1,000-1,500 trees were cut in
  2024-25 to reopen Raynor's corridors (city staff estimate; Golfweek
  27 Dec 2023: "up to 1,500"), around holes 1 and 10 in particular, and more
  than 2,200 trees and shrubs were planted. The 2023 lidar still has the cut
  trees. Expect a large tree count (TPC Boston had about 50,000).
- **Water:** Griest Pond: the tee shot on 1 carries its corner, and the
  Biarritz 9th plays about 60 ft down across it; a golfclubatlas profile also
  puts water on the right of 3 and on the line of 4. A stream runs along the
  inside of 6's dogleg. The permit plans show irrigation ponds A, B and C (A and
  B near holes 1-3, 9, 10 and 18; two were dredged), wetlands behind Long Hill
  Terrace and vernal pools near 2, 4-6, 14-16 and 18. All penalty areas red
  (standing default).
- **Out of bounds:** the OSM course boundary. The driving range (along Conrad
  Drive and Stevenson Road; the 2024 plan expanded it and moved the entry road,
  not confirmed as built) is out of bounds. The Yale Nature Preserve (about
  300 acres) lies west; houses on Fountain Street, Seneca Road and Long Hill
  Terrace to the east; Wilbur Cross Parkway (Route 15) and the West Haven line
  appear on the permit plans.
- **Special ground:** about 35 acres of native grasses were planted in the
  restoration (Golfweek): rough in play, fescue in colour if the theme gives
  it. Rock ledge across the site (the 17th's ledge was covered with topsoil).
  No waste sand. Bunkers are deep (some 20 ft below the green); the 6th has
  two restored inverted bunkers (sand on a mound).
- **One course on the site** (Raynor's second 18 was never built). No
  `layouts`.
- **Renovations after the data:** the restoration post-dates every dataset.
  Greens were enlarged (about 200,000 sq ft recaptured; average about
  14,000 sq ft, the Biarritz about 22,000); the 3rd green was rebuilt as the
  1926 double punchbowl (it had been raised 3-4 ft; one source says the
  original green had been moved away from the pond, so its position may have
  changed); double fairways restored on 3 and 18; new back tees on 1 (behind the
  clubhouse, about 250 yd carry over Griest Pond), 6, 10 and 17; about
  95,500 cubic yards of earth moved. Check OSM's greens, bunkers and fairways
  against recent imagery (DATA_REQUEST item 6) before building.
- **Template greens:** the Biarritz 9th has a 7-ft-deep swale across the
  green, 3 is a double punchbowl, 8 has a Redan-style green, 13 is a Redan,
  15 an Eden, 17 a double plateau. The standard green shaping (CLAUDE.md 5.6:
  1-3 % tilt plus gentle undulation) can't make a swale or a punchbowl; the
  course chat should say what it does with 9 and 3.
- **Elevation:** big. Tees high above the fairways on 1, 9 and 11 (11's
  fairway about 60 ft below), the 10th's approach about 40 ft uphill to a blind
  green, greens on bluffs 20-30 ft above their bunkers on 2 and 8, an 18th that
  plays over a hill.
- **Wind:** inland New England, 1-9 mph (wooded, about 5 km from Long Island
  Sound).
- **Course card hole:** 9, the Biarritz: a 22,000 sq ft green with its swale,
  across Griest Pond, the course's best-known hole.
- **Logo idea:** a draft horse in harness with a plough, for the horse that
  died hauling a plough during construction and lies under the 7th green.
  Alternative: a lit stick of dynamite (more than 50 tons cleared the site).
  No Yale "Y", bulldog or shield.
- **Hard to build:** the restoration (above); dense trees on steep ground;
  tee yardages: against the old Long tees (6,409 card) the new Long tees
  differ most on 3 (-96 yd), 15 (+17), 10 (+26), 13 (+13) and 8 (-22), so tee
  boxes mapped before 2024 may put those holes outside 3 %.

## Open questions for the developer
1. **Pre-restoration data.** Build on the 2023 lidar, NAIP and OSM as they
   are, or wait for recent imagery? — recommendation: build now from them, use
   your Google Earth screenshots (DATA_REQUEST item 6) to check and correct
   greens, bunkers, fairways and new tees, and drop trees standing in cleared
   corridors. Connecticut flew new statewide imagery and lidar in spring 2026
   (CT ECO "2026 Aerial Imagery, Elevation & Buildings"); when it is published
   (the 2023 flight took about 18 months), it can replace the 2023 trees.
2. **Theme.** New darker woods theme or `seekonk`? — recommendation: the new
   theme (it is the planned "temperate forest" theme and other wooded
   Connecticut and New York courses could share it).
3. **Tee.** Long (6,361) by the standing defaults; Championship (7,054) is the
   restored course's showpiece. — recommendation: Long as default; also build
   Championship as a second set if its new tee boxes are mapped.
4. **Stroke index** (front nine): 18Birdies' row used — recommendation: keep
   until a photo of the printed card says otherwise.
5. **Logo:** the plough horse or the dynamite? — recommendation: the horse.

## Kickoff prompt

```
Build Yale Golf Course (`yale`, New Haven, CT) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/yale/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `yale-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`yale`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/yale. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
