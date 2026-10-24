# Heron Lakes Golf Club — scouting (2026-10-24, incomplete)

**Incomplete:** the web-search budget shared by the scouting agents ran out
before this course was searched, and pages that no search returned can't be
opened from the sandbox. So nothing below was read from a source. Facts
marked *(brief)* come from the design chat's assignment; facts marked
*(memory)* are the scout's recollection and must be checked; the scorecards
were not collected. The box, the lidar and imagery links, the layout plan and
the theme reasoning are sound; the course chat does the fact and scorecard
research at intake (list below).

Portland's municipal 36-hole complex in West Delta Park, North Portland, on
the Columbia River floodplain *(brief)*, beside Portland International
Raceway *(memory)*. Two Robert Trent Jones Jr. courses *(brief)*: **Great
Blue** (1992) *(brief)*, the stronger, water-laden one, and **Greenback**,
the older course (about 1970 *(memory)*). Named for herons: the great blue
heron is Portland's city bird *(memory)*. Lots of water *(brief)*. Build
Great Blue first; Greenback as a second layout.

## At a glance
| | |
|---|---|
| Id | `heron_lakes` (data folder); layouts `heron_lakes_great_blue`, `heron_lakes_greenback` |
| Location | Portland (West Delta Park), Multnomah County, OR; 3500 N Victory Blvd *(memory)*, west of Portland International Raceway *(memory)*. Box centre 45.597, -122.712 is the scout's estimate, not a surveyed point: the box is 5 x 5 km to absorb ±1.5 km of error |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 2 x 18 / not collected |
| Designed | Robert Trent Jones Jr.: Great Blue 1992 *(brief)*; Greenback about 1970 *(memory)*; renovations not checked |
| Access | public (City of Portland, Portland Parks & Recreation *(memory)*) |
| Notable | not checked |
| In video games | not checked; none known |
| Default tee (standing defaults) | not known until the cards are collected (Blue, else the set closest to 6,300 yd) |

## Data status
| Item | Status |
|---|---|
| Scorecard | **not collected** for either course (see `scorecard_sources.md`) |
| OSM | unknown until the export |
| Bare earth | DOGAMI DTM mosaic, 1 m; most likely OLC West Metro 3DEP 2019 (flown 8 May - 31 Aug 2019; extent to 45.7 N takes in North Portland; NOAA DAV id 10044), else OLC Metro 2014. Water surfaces are flattened. Exports in feet |
| Canopy | DOGAMI CHM mosaic, same flight |
| Orthophoto | OSIP 2024 (1.0 m over this box, four pieces; ask for a 0.5 m clip of the world later for tracing) |

## Build notes
- **Layouts (COURSE_BUILD.md 3.5):** one data folder `heron_lakes`, one
  world, layouts `heron_lakes_great_blue` (first) and `heron_lakes_greenback`,
  `group` "Heron Lakes", one scorecard file each. Two 18s side by side on
  flat ground may exceed 2,048 m: if so, stop and ask (section 10); the
  fallback is Great Blue's world alone.
- **Theme:** `pnw` (Portland's region theme). The floodplain trees are
  probably mostly broadleaf (black cottonwood, Oregon ash, willow) with few
  conifers *(memory)*: s05 types them by crown shape, and the pnw oak/maple
  sprites will carry them; no new theme unless the 2024 photo shows
  something clearly different.
- **Water:** many ponds and lakes on both courses *(brief)*; sloughs and
  wetlands around West Delta Park *(memory)*. All red (standing defaults).
  Flat ground: the DTM's flattened ponds and low banks should match OSM's
  water; check each pond's outline on the 2024 photo.
- **Out of bounds:** the union of the two course polygons; the driving range
  (standing default). Neighbours inside the box *(memory)*: Portland
  International Raceway, Delta Park sports fields, the Expo Center by I-5,
  North Marine Drive and the Columbia River to the north. Drop any other
  `leisure=golf_course` polygon the export brings in.
- **Special ground:** none known; wetland edges become red penalty areas.
- **Wind:** inland Pacific Northwest, 1-7 mph (standing defaults). The site
  is open and flat beside the Columbia; the developer may prefer 2-10 (the
  tidal-river band), but the default stands unless he says so.
- **Course card hole:** the course chat's pick from the contact sheet (a
  green against water).
- **Logo idea:** a great blue heron lifting off from cattails, drawn from
  life. The club may use a heron in its own emblem: check it, and draw a
  clearly different pose or a green heron (for Greenback) rather than
  anything like it.
- **Hard parts:** everything factual is still to collect; two courses in one
  world; flat floodplain where the posterized hillshade shows little, so
  the water and trees carry the look.

## For the course chat at intake (search budget permitting)
1. Both scorecards: the course's website and Portland Parks & Recreation's
   golf pages (search "Heron Lakes Great Blue scorecard", "Heron Lakes
   Greenback scorecard"), then BlueGolf, GolfPass, stymie.golf, the OGA's
   Explore Oregon Golf; every tee per hole, ratings and slopes (men's and
   women's). Add rows up against the printed totals.
2. The facts: coordinates (Wikipedia or GeoHack), opening years (Greenback
   about 1970? *(memory)*), renovations (bunkers, greens, flood or drainage
   work), championships hosted, which holes have water, out of bounds,
   video games.
3. Confirm the box against the OSM boundaries before using the rasters.

## Open questions for the developer
1. **Scorecards.** Not collected. — recommendation: the course chat collects
   both at intake.
2. **Box.** The centre is an estimate. — recommendation: run step 1 of
   DATA_REQUEST.md first and download the rasters only if both courses sit
   well inside the box on the Overpass map.
3. **Which course first.** — recommendation: Great Blue (brief), Greenback as
   the second layout of the same world if it fits in 2,048 m.
4. **Wind.** — recommendation: 1-7 mph (standing defaults).

## Kickoff prompt
```
Build Heron Lakes Golf Club (`heron_lakes`, Portland, OR) for Silver Swings
Golf: Great Blue first, with Greenback as a second layout of the same world
(COURSE_BUILD.md 3.5) if it fits. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/heron_lakes/
first (README.md, DATA_REQUEST.md, scorecard_sources.md, sources.md). The
scouting is incomplete for this course (no scorecards; most facts
unverified): do the "For the course chat at intake" list in its README first.
Treat the scouting as unverified notes: check every downloaded file on
arrival (COURSE_BUILD.md 5.5) and the scorecards against their sources. The
files from DATA_REQUEST.md are in the GitHub release `heron_lakes-data`. Use
the standing defaults (4.1) and the scouting's choices unless the data says
otherwise. Work on branch course/heron_lakes. I'm not watching: make the
calls you can, write down open items with recommendations, and stop only for
what section 10 lists.
```
