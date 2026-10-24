# Fishers Island Club — scouting (2026-10-24)

One of Seth Raynor's last courses, finished by Charles Banks after Raynor's
death and opened in July 1926, on the rugged east end of Fishers Island: a sliver
of New York (Suffolk County) in Long Island Sound, nearer Connecticut and
Rhode Island than Long Island, with salt water in view from every tee and
green. Private and remote (reached by ferry from Connecticut); ranked about
20th in the world. Raynor's take on the Macdonald templates (Redan,
Biarritz, Punch Bowl, Eden, Road, Short) on seaside ground, a natural
companion to NGLA.

## At a glance
| | |
|---|---|
| Id | `fishers_island` |
| Location | east end of Fishers Island, Town of Southold, Suffolk County, NY; 41.2800, -71.9475 (Wikipedia; Planet Golf and OpenGolfAPI agree within 100 m) |
| UTM | **zone 19, EPSG:32619** (the island is east of 72° W; New York's own data is in zone 18) |
| Holes / par | 18 / 72 per the card listings (8 and 18 par 5); 70 per The Fried Egg (8 made a par 4 in the early 2000s) |
| Designed | Seth Raynor (1925-26), completed by Charles Banks; F. L. Olmsted Jr. planned the 1,800-acre development. Second green lost in the 1938 hurricane and rebuilt; back tees added; bunkers and green edges restored to their original lines; Gil Hanse is the consulting architect (dates not found) |
| Access | private |
| Notable | Top100golfcourses world 20th, USA 10th; Today's Golfer world top 30; no irrigation (firm, browned-out summer turf); no championships found |
| In video games | none found |
| Default tee (standing defaults) | Blue: 6,544 yd, 71.8 / 143 (OpenGolfAPI tee list; the per-hole row used adds to 6,503) |

## Data status
| Item | Status |
|---|---|
| Scorecard | partial, third-party: one unlabeled per-hole list with pars and stroke index (6,503, taken as Blue), one back-tee list with names (6,636, par 70). Printed card wanted |
| OSM | unknown until the Overpass export |
| Bare earth | NYS DEM_2024_Long_Island, 1 m, spring 2024 (its extent and tile index reach 41.31° N / 71.85° W, which only Fishers Island needs; confirm on arrival); requested in EPSG:26919. 3DEP fallback; the tool printed zone-19 tile x25y458, but New York projects are cut in zone 18, so the 1 m tile is more likely `USGS_1M_18_x75y458_<project>` (project name not confirmed) |
| Canopy | NYS Long Island 2024 LAS tiles (zone-18 coordinates: reproject to EPSG:32619; class 1 holds the trees); fallbacks NOAA DAV 10273 (2023 NOAA NGS Long Island Sound topobathy) and 4938 (April 2014, may stop at 41.291° N) |
| Orthophoto | NYS orthoimagery "Latest", 0.5 m, requested in EPSG:26919; NAIP 1 m fallback |

Box: 5.9 x 5.6 km, EPSG:32619 x 251682-257583, y 4571736-4577337 (centre
41.285, -71.930). The clubhouse point is 41.280, -71.948; the course runs
from there around the island's far (east) end ("holes 3 through 13 wrap
around the far end of the island", The Fried Egg). The island is about 7-9
miles long on a WSW-ENE axis, which puts its east tip roughly 3-4 km ENE of
the clubhouse (estimated, not checked on a map). The box runs from 1.4 km
west of the clubhouse to well past that tip, with at least 500 m of margin;
most of it is water.

## Build notes
- **Zone 19.** The world is EPSG:32619. The DEM and ortho links ask New
  York's services for NAD83 / UTM 19N (EPSG:26919) so they land on the
  world grid. The NYS lidar tiles are zone 18 (EPSG:26918): transform the
  points (pyproj) before gridding, or use the NOAA route, which outputs
  zone 19 directly.
- **Theme:** `bayside` fits the sand and the water but not the turf: the
  course has no irrigation and plays firm and brown, with fescue roughs, on a
  treeless headland. `coastal` (Highland Links: golden fescue, white sand,
  ocean, a mown rough band) is the closer existing theme. Recommendation:
  `coastal` with `rough_band_m` about 2-3. A browner summer fairway would be
  a new theme; not needed for a first build.
- **Trees:** "few or no trees planted" (The Fried Egg); expect scattered
  trees and thickets near houses and the edges. Lidar is spring 2024,
  leaf-off; check every tree against the ortho.
- **Water (all red by default):** the Sound and harbours on 1 (right, about
  300 yd out), 4 (rocky beach below the green), 5 (right), 7 (salt marsh
  right), 8 (the Sound right, a pond left), 9 (green against the water);
  ponds and marsh on 13 (two ponds), 14 (water left at about 290 yd), 15
  (blind drive over marsh), 16 (marsh around the green) and 18 (drive over a
  reedy inlet of the harbour). "The Sound comes into play on nine holes, and
  seven ponds threaten the rest" (Today's Golfer). A tidal pond beside three
  holes is reclaiming its old shoreline (TCLF).
- **Out of bounds / roads:** the OSM boundary; island roads inside it are
  cart paths (default). Beaches and rock inside the boundary: surface 16
  `ob_sand` as at Highland Links.
- **Special ground:** fescue rough; the firm, unwatered turf is a gameplay
  matter (roll-out), not a map change. Only two fairway bunkers (9 and 13).
  No waste sand described.
- **Several courses on the site:** no (Raynor routed a second course that
  was never built).
- **Renovations after the data dates:** green-edge recapture is ongoing
  (the 6th's back recently); check greens against the ortho rather than
  older OSM.
- **Wind:** open coast, 3-14 mph: an exposed island, and nearly every hole
  runs a different way.
- **Course card hole:** 5 "Biarritz" — a 229-yd par 3 along the Sound with a
  huge square green across a chasm; alternates for the rotation: 4 Punch
  Bowl, 9 Double Plateau (green "floats" over the Sound), 11 Eden.
- **Logo idea:** a "sparkplug" lighthouse on its round caisson, like
  Latimer Reef Light off the 7th (the hole is called "Latimer"), with
  Connecticut's shore as a thin line behind. Alternative: an osprey.
  Check it doesn't echo the club's emblem.
- **What's hard:** the scorecard (see open questions); confirming the 2024
  lidar covers the island (look at the DEM first); a small, irregular
  island where the boundary meets beach and rock on many holes; template
  greens (Biarritz swale, Punch Bowl, Redan) the green model can only
  approximate.

## Open questions for the developer
1. Par 72 (cards: 8 and 18 par 5) or 70 (The Fried Egg)? — recommendation:
   72, as on the card listings with a stroke index, unless a printed card
   says otherwise.
2. The Blue yardages are an unlabeled online row (6,503 vs Blue 6,544). —
   recommendation: build from it and flag every hole; a photo of the printed
   card is the most useful thing you could send.
3. Theme `coastal` instead of `bayside`? — recommendation: `coastal`.
4. Wind 3-14 (open coast) rather than 2-12 (Long Island)? —
   recommendation: 3-14.
5. Logo: the sparkplug lighthouse? — recommendation: yes.
6. If the 2024 NYS lidar turns out not to cover the island: the 2023 NOAA
   survey (DAV 10273)? — recommendation: yes, then the 2014 one (4938).

## Kickoff prompt

```
Build Fishers Island Club (`fishers_island`, Fishers Island, NY) for Silver
Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/fishers_island/
first (README.md, DATA_REQUEST.md, scorecard.csv, scorecard_sources.md,
sources.md). Treat the scouting as unverified notes: check every downloaded
file on arrival (COURSE_BUILD.md 5.5) and the scorecard against its sources.
Note that the course is in UTM zone 19N (EPSG:32619) while New York's lidar
tiles are in zone 18. The files from DATA_REQUEST.md are in the GitHub
release `fishers_island-data`. Use the standing defaults (4.1) and the
scouting's choices unless the data says otherwise. Work on branch
course/fishers_island. I'm not watching: make the calls you can, write down
open items with recommendations, and stop only for what section 10 lists.
```
