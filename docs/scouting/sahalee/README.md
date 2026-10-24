# Sahalee Country Club — scouting (2026-10-24)

A private 27-hole club (South, North and East nines) cut through second-growth
Douglas fir, western red cedar and hemlock on the Sammamish Plateau east of
Lake Sammamish, in King County, Washington. Ted Robinson, 1969; renovated by
Rees Jones (1996-98, and a master plan built fall 2022 – February 2023). Host of
the 1998 PGA Championship, the 2002 WGC-NEC, the 2010 U.S. Senior Open and the
2016 and 2024 Women's PGA, all on South + North. Famous for fairways that are
narrow corridors between tall firs: the tree course the list doesn't have yet,
and the game's first club of three nines from real data.

## At a glance
| | |
|---|---|
| Id | `sahalee` |
| Location | 21200 NE Sahalee Country Club Dr, Sammamish, King County, WA; 47.635, -122.057 (Wikipedia; Stymie's map link agrees within 150 m) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 27 (three nines of par 36) / 72 for any two (club website) |
| Designed | Ted Robinson, 1969 (East + South opened 9 Aug 1969, North July 1970); Rees Jones 1996-98 (North, South, then East); Rees Jones tree plan 2015; Rees Jones and Steve Weisser master plan, fall 2022 – Feb 2023 (every bunker, widened landing areas, trees removed, pond on the championship 10th extended) |
| Access | private (guests with a member) |
| Notable | 1998 PGA (Vijay Singh), 2002 WGC-NEC (Craig Parry), 2010 U.S. Senior Open (Bernhard Langer), 2016 Women's PGA (Brooke Henderson), 2024 Women's PGA (Amy Yang); Golf Digest 100 Greatest 1977-2014 and 2017-18 (best 48th), Second 100 #196 and 4th in Washington (2025-26) |
| In video games | not checked (search budget ran out); from memory, unverified: probably Sierra's *PGA Championship Golf 1999 Edition* |
| Default tee (standing defaults) | **Blue**: South/North 6,754 yd, 73.4 / 138 (North/East and East/South 6,769) |

## Data status
| Item | Status |
|---|---|
| Scorecard | **complete official**: the club website's nine cards, all three nines, Black/Blue/White/Gold/Green, men's and women's 1-9 handicaps, ratings. Three typos corrected to the club's own totals. Conflict: Stymie's re-measured South/North card (maybe newer) |
| OSM | probably detailed (OpenGolfAPI, built from OSM, counts 89 bunkers and 8 water features here); hole numbering and per-hole coverage unknown until the export |
| Bare earth | USGS 3DEP 1 m (ImageServer links; tiles x56y528, x57y528); project name and year **not found** (search budget ran out): optional TNM link in DATA_REQUEST item 2 names it |
| Canopy | WA DNR lidar portal DSM + DTM of the newest project (preferred), or NOAA DAV points; dataset and flight year **not identified** |
| Orthophoto | USDA NAIP (latest in the USGS service), 1 m JPEG; must be 2023 or later to show the renovated course |

## Build notes
- **Club of three nines** (COURSE_BUILD.md 3.5a): one data folder, holes 1-27
  in `scorecard.csv` in nine order **South 1-9, North 10-18, East 19-27**, so
  1-18 is the championship course. `course_config.json`:
  `"nines": [{"id": "south", "name": "South", "holes": [1, 9]}, {"id": "north", "name": "North", "holes": [10, 18]}, {"id": "east", "name": "East", "holes": [19, 27]}]`.
  OSM may number each nine 1-9 (three hole 1s) or the championship 18 as
  1-18: renumber the `golf=hole` refs to 1-27 in `edits.json`. The handicap
  column is the club's own 1-9 index within each nine (the 18-hole indexes per
  pair are in `scorecard_sources.md`). Not `layouts`.
- **Theme:** `pnw` (deep green Douglas fir and western red cedar, lush green
  rough). Not `puget`: that is Chambers Bay's golden fescue links palette, and
  Sahalee is lush parkland under firs. No new theme. Hemlocks read as the same
  conifer sprite; the few broadleaf trees and rhododendrons (behind South 9)
  as deciduous.
- **Trees:** the whole point of the course. The club analysed about 7,500
  trees in the 2022-23 plan; expect several thousand lidar crowns, many of
  them tall (the 2024 notes mention a 106-ft / 32 m tree short left of the
  championship 18th green). Canopy raised and trees removed in 2022-23 on the
  championship 8 (South 8), 11 (North 2, near the green), 12 (North 3,
  approach) and 16 (North 7, second landing area), plus tree thinning since
  2015. Lidar flown before fall 2022 still has them: use `trees_need_ortho`
  with a 2023-or-later photo, and look (COURSE_LESSONS 26: a shadow can keep a
  gone tree). In-play trees the club's hole notes describe (some notes predate
  2022): South 3 (large tree shields the left of the green), South 4 (tree and
  bunker right of the fairway), South 6 (large tree; drive left), North 5
  (large tree front right of the green), North 6 (two central trees about 265
  yd out), North 7 (huge fir blocking the right; may be gone), North 2 (a tree
  in mid-fairway inside 100 yd; may be gone). The standing default removes
  trees in fairways and in a perfect tee shot's path; these are the course's
  identity, so see open question 2 (`keep_tee_trees`).
- **Water:** six ponds (club: 6 water hazards): South 2 (lake to carry in two),
  South 5 (right of the green), South 9 (round the left), North 1 / the
  championship 10th (a horseshoe pond round the green, extended to its front
  left in 2022-23), North 8 (right of the green), East 1 (guarding the
  approach). All red (standing default). OSM's pond on North 1 may predate the
  extension: check against the photo.
- **Out of bounds:** the OSM boundary; the course sits inside the Sahalee
  housing development, so houses line many holes. Driving range out of bounds.
  Check OSM for roads or paths crossing between the nines (cart paths: free
  relief).
- **Special ground:** none (no waste sand, no fescue). Bunkers are white sand,
  all rebuilt in 2022-23 (OSM bunkers traced before 2023 may be out of date:
  compare with the photo; the club counts 84 bunkers, OSM-based OpenGolfAPI 89).
- **Several courses:** no; a club of nines (above).
- **Renovations after the data dates:** the 2022-23 master plan (bunkers,
  widened landing areas, trees, the pond on North 1). The lidar is probably
  older; NAIP 2023 or later shows the new course.
- **Wind:** inland Pacific Northwest, **1-7 mph** (standing default; the
  corridors are sheltered).
- **Course card hole:** North 1 (hole 10, the championship 10th): a
  peninsula-like green inside a horseshoe pond after a tee shot through the
  firs; the most striking green and the one the renovation changed.
- **Logo idea:** a Douglas-fir cone with its three-pointed "mouse-tail"
  bracts, hanging from a short sprig (the tree that makes Sahalee; nothing
  from the club's emblem).
- **What makes it hard:** (1) 27 holes and their numbering; (2) thousands of
  tall trees in narrow corridors, where the tee-shot clearing (s06/s06b) could
  strip the corridors unless the developer keeps the in-play trees; (3) the
  lidar probably predates the 2022-23 tree work; (4) dense housing all round
  (buildings, OB); (5) world size: 27 holes on about 210 acres should fit
  2,048 m, but check the boundary first (COURSE_BUILD 10).

## Open questions for the developer
1. **Which card?** The club website's (used; all three nines; Blue S/N 6,754,
   73.4/138) or Stymie's re-measured South/North card (Blue 6,732, slope 127,
   undated; perhaps a post-renovation re-rating; no East)? — recommendation:
   the club's; a photo of the printed card settles it.
2. **Keep the in-play trees?** The standing default removes trees in fairways
   and in a perfect drive's path; at Sahalee the trees are the design. —
   recommendation: keep the trees the hole notes name (South 3, 4, 6; North 5,
   6; North 2 and 7 if the photo shows them still standing) via
   `keep_tee_trees` for those holes, and let the default clear the rest.
3. **Trees removed in 2022-23:** if the lidar is older — recommendation:
   `trees_need_ortho` with the 2023+ NAIP photo, checked by eye on 8, 11, 12
   and 16 of the championship course.
4. **Nine order and handicaps:** South 1-9, North 10-18, East 19-27, handicap
   = the club's 1-9 within each nine — recommendation: as written.
5. **Theme:** `pnw` — recommendation: yes (not `puget`).
6. **Logo:** a Douglas-fir cone — recommendation: yes, unless you have one.

## Kickoff prompt

```
Build Sahalee Country Club (`sahalee`, Sammamish, WA) for Silver Swings Golf.
Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/sahalee/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `sahalee-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. Work on branch
course/sahalee. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
