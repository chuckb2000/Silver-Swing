# Heron Lakes Golf Club — scouting (2026-10-24)

Portland's municipal 36-hole complex in West Delta Park, North Portland, on
the Columbia River floodplain about 10 ft above sea level, on part of the
site of Vanport (destroyed by the 1948 flood). Owned by Portland Parks &
Recreation, run by KemperSports since 2008. It opened in 1971 as West Delta
Park Golf Course, an 18 by Robert Trent Jones Sr. with his son Robert Trent
Jones Jr. leading the work; a third nine came in 1987, the name Heron Lakes
in 1988, and a fourth nine in 1992 made the two courses: **Greenback** (the
original 18: parkland, tree-lined, six ponds, 86 bunkers) and **Great Blue**
(RTJ Jr., 1992: links-style with Scottish mounds and more water; the 2000
U.S. Amateur Public Links). On the list as a well-loved Portland muni with
lots of water. Build Great Blue first; Greenback as a second layout.

## At a glance
| | |
|---|---|
| Id | `heron_lakes` (data folder); layouts `heron_lakes_great_blue` (first), `heron_lakes_greenback` |
| Location | 3500 N Victory Blvd, Portland, Multnomah County, OR 97217 (portland.gov). Clubhouse and range about 45.6044, -122.7032 (stymie map link); Great Blue point 45.6021, -122.6981 (OpenGolfAPI, from OSM). Neighbours: Portland International Raceway south-east (45.5969, -122.6958), Force Lake east, Smith Lake west, Columbia Slough south (Wikipedia). 340.77 acres (portland.gov) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 2 x 18 / 72 each (36-36) |
| Designed | Greenback: Robert Trent Jones Sr. (with RTJ Jr.), opened 1971. Great Blue: Robert Trent Jones Jr., 1992 (the 1987 Red nine plus a 1992 nine; Top100 credits RTJ II's Kyle Phillips). No redesign found; 2025: new forward tees on Great Blue, bunker sand on both, re-rated by the OGA (city golf committee minutes) |
| Access | public (City of Portland) |
| Notable | 2000 U.S. Amateur Public Links (Great Blue, D.J. Trahan); PGA Northwest Open; Golf Digest Top 75 Public (RTJ II, undated); Audubon Cooperative Sanctuary; records 64 Tiger Woods (Great Blue), 63 Johnny Miller (Greenback) (GolfPass 2010) |
| In video games | none found (searched EA/Tiger Woods PGA Tour, PGA Tour 2K, Links, Golden Tee) |
| Default tee (standing defaults) | Great Blue: Blue, 6,244 yd, 70.5 / 135 (women 76.2 / 144). Greenback: Blue, 6,141 yd, 69.6 / 127 (women 75.6 / 136) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party, complete per hole for every tee on both courses, with men's and women's ratings (stymie; Greenback confirmed hole for hole by GolfPass). Great Blue has a conflicting GolfPass card (other tee names, 20-45 yd off on 8, 16, 17) that may be the 2025 re-tee'd card; the club's card was not readable (scorecard_sources.md) |
| OSM | OSM has at least a Great Blue course feature (OpenGolfAPI credits OSM for it); hole-level coverage unknown until the export |
| Bare earth | DOGAMI DTM mosaic, 1 m; most likely OLC West Metro 3DEP 2019 (flown 8 May - 31 Aug 2019; NOAA DAV id 10044), else OLC Metro 2014. Water surfaces are flattened. Exports in feet |
| Canopy | DOGAMI CHM mosaic, same flight |
| Orthophoto | OSIP 2024 (about 1 m, one piece; ask for a 0.5 m clip of the world later for tracing) |

## Build notes
- **Layouts (COURSE_BUILD.md 3.5):** one data folder `heron_lakes`, one
  world, layouts `heron_lakes_great_blue` (first) and `heron_lakes_greenback`,
  `group` "Heron Lakes", one scorecard file each. The 341-acre property is
  about 1.2 km square in area, so the world should fit in 2,048 m; if it
  doesn't, stop and ask (section 10). Both courses number their holes 1-18:
  split the `golf=hole` lines by each course's `leisure=golf_course` polygon
  (`boundary_osm`) or by a `layout` tag; if OSM has one polygon for the whole
  complex, ask (or trace a dividing line) rather than guess which hole is
  whose.
- **Theme:** `pnw` by the standing defaults, or a `heron_lakes` theme of its
  own (allowed by the kickoff). The trees are planted, mixed and mostly
  broadleaf: 3,500+ trees and shrubs at construction, the 1960s planting list
  2,795 trees of 50 deciduous and 16 conifer species (Oregon Encyclopedia);
  willows on the water (a large one fell in 2025). Greenback is tree-lined
  parkland; Great Blue is open, links-style with mounds. Rye fairways,
  bentgrass greens. s05 types trees by crown shape; check against the 2024
  photo.
- **Water (all red, standing defaults):** six ponds dug at construction.
  Greenback: six ponds (holes not listed in any source). Great Blue: 8 (a
  466-yd par 4 doglegging round a pond that guards the fairway), 16 (a lake
  and wetland along the fairway), 17 (a slough along the hole), 18 (water
  down the right and in front of the green, a lake behind it). The DTM
  flattens water, and OSM's ponds should match it; check each on the 2024
  photo.
- **Out of bounds:** the union of the two course polygons; the driving range
  (standing defaults). Around it: Portland International Raceway (south-east),
  Force Lake and West Delta Park natural areas (east), Smith and Bybee
  Wetlands (west), the Columbia Slough (south). N Victory Blvd reaches the
  clubhouse. Drop any other `leisure=golf_course` the export brings in.
- **Special ground:** none known; wetland edges become red penalty areas.
- **Renovations after the data:** the 2025 forward tees on Great Blue are
  after the 2019 lidar and probably the 2024 photo; they don't touch the Blue
  tees. A levee raise is under study (US Army Corps, 2025): nothing built.
- **Wind:** inland Pacific Northwest, 1-7 mph (standing defaults). The site
  is open and flat beside the Columbia; 2-10 (the tidal-river band) would
  also be defensible, but the default stands unless the developer says so.
- **Course card hole:** Great Blue 18: a 413-yd par 4 with water down the
  right and in front of the green and a lake behind, the finishing hole of
  the 2000 Public Links. The course chat confirms it on the contact sheet.
- **Logo idea:** a great blue heron lifting off from cattails, with Mt Hood
  small on the horizon (the courses look at Mt Hood and Mt St Helens). The
  club launched a new logo in 2025 and may use a heron: look at it first and
  draw a clearly different pose and composition (or a green heron for
  Greenback), nothing like the club's.
- **Hard parts:** two courses with the same hole numbers in one world; flat
  floodplain where the posterized hillshade shows little, so the water,
  mounds and trees carry the look; the Great Blue card conflict.

## Open questions for the developer
1. **Great Blue card.** stymie's Gold/Black/Blue/White/Yellow card (rated,
   used) and GolfPass's Green/Burgundy/Blue/Grey/White card (no ratings;
   includes a 4,030-yd forward set, like the forward tees installed in 2025)
   disagree. — recommendation: build with the stymie Blue (6,244 yd,
   70.5/135); save the club's cards (DATA_REQUEST.md item 5) and switch only
   if the club's card is the GolfPass one; the yardage check against the
   mapped tees will show which fits.
2. **Which course first.** — recommendation: Great Blue, Greenback as the
   second layout of the same world.
3. **Architect credit.** Most listings say RTJ II for both; the city and the
   Oregon Encyclopedia credit Greenback to RTJ Sr. — recommendation: Greenback
   "Robert Trent Jones Sr. and Jr. (1971)", Great Blue "Robert Trent Jones Jr.
   (1992)".
4. **Box.** Estimated from sourced points, not from the OSM outlines. —
   recommendation: run step 1 of DATA_REQUEST.md first and download the
   rasters only if both courses sit well inside the box.
5. **Wind.** — recommendation: 1-7 mph (standing defaults).

## Kickoff prompt
```
Build Heron Lakes Golf Club (`heron_lakes`, Portland, OR) for Silver Swings
Golf: Great Blue first, with Greenback as a second layout of the same world
(COURSE_BUILD.md 3.5) if it fits. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/heron_lakes/
first (README.md, DATA_REQUEST.md, scorecard_sources.md, sources.md).
Treat the scouting as unverified notes: check every downloaded file on
arrival (COURSE_BUILD.md 5.5) and the scorecards against their sources. The
files from DATA_REQUEST.md are in the GitHub release `heron_lakes-data`. Use
the standing defaults (4.1) and the scouting's choices unless the data says
otherwise. You may design a new theme of its own for this course (`heron_lakes`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/heron_lakes. I'm not watching: make the
calls you can, write down open items with recommendations, and stop only for
what section 10 lists.
```
