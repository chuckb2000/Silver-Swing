# Pine Valley Golf Club — scouting (2026-10-24)

George Crump's course in the sandy pine barrens of southern New Jersey,
about 20 miles south-east of Philadelphia: islands of fairway and green
among wide unraked sand and scrub, with forced carries everywhere ("Hell's
Half Acre" across the 7th). It is usually ranked the best course in the
United States and the world, which is why it is on the list. Private; the
public sees it one day a year (the Crump Cup final round).

## At a glance

| | |
|---|---|
| Id | `pine_valley` |
| Location | Pine Hill, Camden County, NJ (Wikipedia; the club was the tiny borough of Pine Valley, since merged into Pine Hill); address 1 E Atlantic Ave, Pine Valley, NJ 08021 (GOLF.com); some listings say Clementon. Centre 39.7853, -74.9695 (centre of the OSM course features, via OpenGolfAPI); Wikipedia gives 39.789, -74.972 (probably the clubhouse) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / 70 (4 4 3 4 3 4 5 4 4 / 3 4 4 4 3 5 4 4 4); also a 10-hole Short Course, par 31 |
| Designed | George A. Crump (land bought 1912-13, holes 1-10 and 18 by 1914, 11, 16, 17 in 1915), with routing advice from H. S. Colt (1913). Crump died 24 Jan 1918; holes 12-15 were built in 1919 by a group led by Howard Street with Colt, C. H. Alison and Hugh and Alan Wilson; the finished course opened in 1922. Perry Maxwell later built the 8th green's false front and the left 9th green. Later minor changes by John Arthur Brown, Ernie Ransome and Gordon Brewer with Tom Fazio; new back tees (14th "early 2000s"); tree and underbrush removal (10, 14, 2, 5). Short Course: Tom Fazio and Ernie Ransome, 1992 |
| Access | private (invitation-only membership; guests with a member) |
| Notable | Walker Cup 1936 and 1985; Crump Cup every September since 1922; **2034 Curtis Cup** (USGA, announced July 2023); No. 1 in GOLF's Top 100 in the World 2025-26 and in Golf Digest's America's 100 Greatest 2017-2025; Hell's Half Acre holds the Guinness record for the largest bunker; 1962 Shell's Wonderful World of Golf (Littler v Nelson) |
| In video games | no licensed appearance found (none in the EA / PGA Tour 2K course lists that came up). A fan-made Links 2003 recreation by Robert Miller (Links Corner, 2010) exists |
| Default tee (standing defaults) | no Blue; **Regular**, 6,532 yd, 72.8 / 153 (Stymie; unverified), the set closest to 6,300 |

## Data status

| Item | Status |
|---|---|
| Scorecard | third-party (Stymie): Back 7,057 and Regular 6,532 per hole, stroke index, men's ratings. No official card online, no women's ratings; four other totals (7,047-7,201) suggest newer back tees (`scorecard_sources.md`) |
| OSM | mapped at least in part: OpenGolfAPI (built from OSM) shows 18 hole lines with par, stroke index and `dist`, so holes are numbered; greens, tees, sand and water unknown until the export |
| Bare earth | 3DEP 1 m, from the **2015 DVRPC Delaware Valley lidar** (flown 12 Apr - 23 May 2015; USGS `DE_DelawareValley_HD_2015`). The 2019 South Jersey lidar does not cover Camden County. 1 m DEM tile x50y441; project name for the tile URL not confirmed (the developer reads it off the downloader) |
| Canopy | NOAA DAV **9119** ("2015 DVRPC Lidar: Delaware Valley (PA, NJ)", ~8 pts/m2), clipped LAZ; no NJ DSM/CHM raster found. Flight year 2015 |
| Orthophoto | NAIP (1 m at this box size) and **NJ 2020 1 ft leaf-off** (flown 2 Apr - 5 May 2020; the state's newest; MapServer export links) |

## Build notes

- **Theme:** `bayside` fits well and is the recommendation: it was drawn for
  the edge of the Long Island pine barrens (pitch pine, white and black oak,
  white sand). Pine Valley is the same forest type. What may differ: its
  sand is a coarse, light tan rather than Long Island white, and the scrub
  (Scotch broom, mountain laurel, huckleberry, poverty grass) between the
  holes is a big part of the look. If the developer wants those, a new
  `pine_barrens` theme = `bayside` with tan S0-S2 and a scrub bush painter.
  Water: ponds in the woods, darker than the estuary; check against the 2020
  orthos.
- **Trees:** pitch pine dominant, with oaks; thousands were planted in the
  late 1920s to hold the sand, and trees have since closed in on 12 and 17.
  Lidar 2015 vs now: trees removed since (left of 10, right of 14, behind
  the 9th green, underbrush on 2 and by the 5th green) are open items;
  check against the 2020 orthos and NAIP. The leaf-off 2020 orthos tell
  pines (green) from oaks (bare) for the tree type.
- **Sand (the big call).** The club plays its sand as hazards: "There are no
  rakes at Pine Valley; the sandy areas and bunkers found throughout the
  course are true hazards" (Crump Cup preview, AmateurGolf). A Golf Club
  Atlas thread is split (TEPaul: the club told him all sand is hazard and
  there are no waste areas; Tom Doak had understood the sand outside the
  fairways to be through the green). Recommendation: **leave `waste_sand`
  off** and play every sand area, Hell's Half Acre included, as **bunker**
  (surface bunker: the ball stops nearly dead, which is Pine Valley). Use
  `"waste_sand": true` only if the developer prefers the Doak reading, and
  then only for sand polygons tagged `sand=waste`.
  What to check in the OSM export: how much sand is mapped at all (count and
  area of `golf=bunker`; is Hell's Half Acre one polygon or several; is the
  sand along 2, 7, 13, 15 mapped); any `sand=waste`, `golf=waste` or
  `natural=sand` inside the boundary (with `waste_sand` off these don't
  paint as bunkers: retag them `golf=bunker` in `edits.json`); any
  `natural=scrub` / `heath`. Unmapped sand would draw as rough, the
  wrong course: trace it from the 2020 orthos (`propose_trace.py` finds
  bright unsaturated sand near the holes) and tag it `golf=bunker`.
- **Scrub:** the underbrush between holes is penal ("penal sandy scrub" left
  of 13). Options: leave it as woods/rough (default), or the `gorse` key
  (`pipeline/gorse.py` classifies dark textured scrub on the orthophoto) with
  a pine-barrens bush painter, with or without the penal `gorse` ground.
  Open question 3.
- **Water:** a lake system crosses the property: the 5th's tee shot carries
  water (the pond by Crump's cabin), the 14th green is "essentially an
  island green" with the lake on its left, the 15th's tee shot carries
  water, the 16th's approach angles toward the lake on the left, and there is
  a lake behind the 17th tee. All red (standing default).
- **Out of bounds:** "there is no out of bounds at all" (Crump Cup preview).
  The game still needs a line: keep the OSM course boundary (deep woods at
  the edge; nothing changes in play).
- **Roads, buildings:** the club's roads and members' cottages lie inside
  the property, and roads cross the course: roads inside the boundary are
  cart paths (free relief), per the defaults. The Atlantic City rail line
  (Crump first saw the site from the train) and a neighbouring course may show
  up in the box; check in the export, drop other courses' features.
- **Two greens on 8 and 9.** Both holes have dual greens (Links Magazine).
  The game needs one green per hole: use the one the OSM hole line ends on;
  the other stays drawn as a green and is a wrong green (relief required,
  rules 8.4). Open question 4.
- **Short Course:** 10 holes, par 31 (White 2,006 yd, Red 1,216 yd per
  GolfNow; no per-hole card found), Fazio and Ransome 1992, eight holes copy
  main-course approach shots (2, 3, 10, 13, 14, 15, 16, 17). Where it lies on
  the property is unknown until the export. The game plays a 10-hole course
  (COURSE_BUILD 3.5a), so it could be a second `layouts` entry later; not
  in this build (no card).
- **Renovations after the data dates:** back tees added over the years (the
  OSM `dist` row adds to 7,181, more than any per-hole card); tree removal
  after the 2015 lidar. Nothing found on a major renovation since 2015.
- **Wind:** inland, sheltered by pine forest, about 70 km from the Atlantic: use the
  inland band **1-9 mph** (inland New England / New York), not the DC
  tidal-river band.
- **Elevation:** about 37 m above sea level with real relief: the 5th plays
  steeply uphill, the 9th green sits on a cliff, the 15th climbs, 3, 10 and 14
  play downhill. The 1 m DEM shows it; no special handling.
- **Course card hole:** the **10th**, a short par 3 whose green is an island
  in sand among the pines: the Pine Valley look in one crop. Alternative:
  the 14th (green with the lake on its left, sand and pines).
- **Logo idea:** a Pine Barrens treefrog (a bright green frog with a
  lavender side stripe, a bog specialist of the New Jersey pine barrens)
  sitting on a golf ball in unraked sand. Avoid pine-tree emblems, to stay clear of the club's own
  marks.
- **What makes it hard:** the sand (mapping and rules, above); dual greens;
  four conflicting totals and no official card; the 2015 lidar under later
  tree removal; the 7th's Hell's Half Acre (it starts about 280 yd from the
  tee and runs about 150 yd, per Guinness when the hole was 585 yd; the Golf
  Club Atlas profile says 285-380 yd) is fine in the game but punishes a
  short drive, which is Pine Valley.

## Open questions for the developer

1. Sand: bunkers everywhere (the club's practice), or waste-area general
   area off the fairways? — recommendation: **bunkers**, `waste_sand` off.
2. Tees: Regular (6,532, the standing default) or Back (7,057)? —
   recommendation: **Regular**; build Back too only if asked (the card is
   third-party either way).
3. Scrub between the holes: woods/rough (default) or a penal scrub layer
   (gorse-like ground with pine-barrens bushes)? — recommendation: woods
   first; add scrub if the course looks too green.
4. Holes 8 and 9 each have two greens: which one? — recommendation: the one
   the OSM hole line ends on.
5. Theme: `bayside` as is, or a `pine_barrens` variant with tan sand? —
   recommendation: try `bayside`; switch if the sand reads wrong next to the
   2020 orthos.
6. The Short Course: build it later as a second layout if OSM maps its
   holes? — recommendation: yes, after the main course, if a card turns up.
7. Logo: the treefrog on a ball, or something else? — recommendation: the
   treefrog.

## Kickoff prompt

```
Build Pine Valley Golf Club (`pine_valley`, Pine Valley, NJ) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/pine_valley/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `pine_valley-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`pine_valley`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/pine_valley. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
