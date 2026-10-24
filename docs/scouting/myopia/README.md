# Myopia Hunt Club — scouting (2026-10-24)

Herbert C. Leeds' course at a fox-hunting and polo club in South Hamilton on
Massachusetts' North Shore, laid out from 1894 and hardly changed since: short
(6,555 yd from the tips), blind and famously penal, with over a hundred pit and
coffin bunkers, Leeds' mounds, stone walls, tall fescue and tiny tilted greens.
It hosted four of the first fourteen US Opens (1898-1908; Willie Anderson's
winning 331 in 1901 is still the highest) and ranks in the US and world top 100.
A classic, compact, very "pixel-friendly" layout that no golf game has done.

## At a glance

| | |
|---|---|
| Id | `myopia` |
| Location | 435 Bay Road, South Hamilton (Hamilton), Essex County, MA; 42.6090, -70.8584 (OpenGolfAPI's OSM point; Wikipedia 42°36′32″N 70°51′32″W) |
| UTM | zone 19, EPSG:32619 |
| Holes / par | 18 / 72 (card); every hole has a name (1 First ... 18 Home) |
| Designed | Herbert C. Leeds, 1894-1901 (R. M. Appleton laid out the first nine in 1894; nine holes 1896, 18 by 1898-1901). Club lengthening and tree removal 1995-2005 (new tees on 2, 4, 7, 10, 11, 15, 18); superintendent-led bunker restoration in the 1990s; Gil Hanse since 2011 (trees removed, fairways widened back to the pit bunkers); a fuller Hanse restoration was reported as pending in 2025 (unconfirmed) |
| Access | private |
| Notable | US Open 1898, 1901, 1905, 1908; Golf Digest America's 100 Greatest #54 and Massachusetts #2 (2025-26); GOLF Top 100 World #86 (2025-26); holes 4 and 9 among Golf Magazine's top-100 signature holes |
| In video games | none found (no EA/Tiger Woods, 2K, Links or Golden Tee appearance known; a dedicated search couldn't be run, see sources.md) |
| Default tee (standing defaults) | **White**, 6,190 yd, 71.1 / 134 (no Blue; White is closest to 6,300) |

## Data status

| Item | Status |
|---|---|
| Scorecard | third-party, complete per hole for Red, White, Yellow, Green (Stymie and GolfPass agree); no official card; ratings differ between sources (scorecard_sources.md) |
| OSM | unknown until the export; OpenGolfAPI, which builds on OSM, counts 119 bunkers and 3 water features here, so the course is probably mapped in detail |
| Bare earth | USGS 3DEP 1 m via the exportImage link; expected project MA_CentralEastern_2021_B21 (flown 20 Mar - 24 Apr 2021); coverage of Hamilton not confirmed from the sandbox |
| Canopy | lidar points, NOAA Data Access Viewer dataset 9777 (2021 USGS Lidar: Central Eastern Massachusetts), leaf-off, 2021 |
| Orthophoto | USDA NAIP via the USGS National Map (newest MA flight; year checked on arrival) |

## Build notes

- **Theme:** `seekonk` recommended: eastern white pine, oaks and maples just
  turning, and an olive-tan rough that suits Myopia's red fescue and bluestem.
  `bayside` (Franklin, TPC Boston) also works. No new theme.
- **Trees:** North Shore mixed woods (white pine, oak, maple) round the edges
  and between some holes; a heavy tree line left of 12. Thousands of trees came
  out between 1995 and now (club work, then Hanse from 2011); the 2021 lidar
  catches most of that. Any later clearing (a 2025-26 Hanse restoration was
  reported as pending) is an open item: drop lidar trees the newest NAIP
  doesn't show. Leaf-off flight, so pines separate from bare hardwoods.
  Standing default `"trees_off_fairways_m": 2`.
- **Water (all red, standing default):** 4 "Miles River": a diagonal carry
  over a wetland; 5: a stream across the fairway; 6 "Brook": a creek crossing
  short of the green and a pond along the right of the fairway; 9 "Pond": a
  pond in front of a tiny green ringed by seven bunkers. If the brooks come as
  `waterway` lines only, give them a narrow polygon (as Oregon GC's creek).
- **Out of bounds:** the OSM course boundary. The club grounds around it are
  equestrian: Gibney (or "Gidney") Field and other polo fields along the
  entrance drive, barns, hound kennels and paddocks (horses run beside 18).
  If the boundary takes in a polo field, treat it like a driving range (out of
  bounds). Bridle paths cross several holes (the club gives a free drop):
  map them, and the entrance drive, as cart paths (free relief).
- **Stone walls** (6, 17 and along other holes; Leeds piled mounds against
  them) come with the OSM query as `barrier=wall`; the game has no wall
  surface, so they stay rough/decoration. List them.
- **Special ground:** none needed (no waste sand). Bunkers are many
  (104 in 1998, about 120 now) and deep, but ordinary sand in the game. Tall
  fescue/bluestem outside the fairways plays as rough.
- **Greens are tiny and steep:** 9 is about 10 yd wide and 30 deep; 4 and 8
  are said to be only ~20 % pinnable; 4, 6 and 13 slope hard. With pins 14 ft
  from every edge, some greens may only take the centre pin; check s07's
  clamps keep a pinnable area.
- **One course on the site;** no `layouts`. Hole names on the card (1 First,
  2 Lookout, 3 Brae, 4 Miles River, 5 Lone Tree, 6 Brook, 7 Myopia, 8 Prairie,
  9 Pond, 10 Alps, 11 Road, 12 Valley, 13 Hill, 14 Ridge, 15 Long,
  16 Paddock, 17 West, 18 Home).
- **Routing hints (to check the OSM hole numbers):** clubhouse behind the 18th
  green, overlooking the 1st tee and the 16th and 18th greens; the pro shop is
  20-50 yd left of 16's green; a plateau at the south end and a valley holding
  11 greens; 12 runs parallel to 7 and 8; 13 plays back through 2's valley;
  17 and 18 are out-and-back. Elevation 12-40 m (Wikipedia).
- **Renovations after the data:** possible Hanse work in 2025-26 (unconfirmed).
- **Wind:** inland New England, 1-9 mph.
- **Course card hole:** 9 "Pond": a 138-yd par 3 over a pond to a sliver of a
  green inside seven bunkers, one of the club's two signature holes; also good
  for the rotation: 4, 16, 2.
- **Logo idea:** a pair of round wire-rimmed 1890s spectacles (the club is
  named for its near-sighted founders) with a golf ball seen through one lens.
  Not a fox or hunting horn, to stay clear of any club emblem.
- **Hard parts:** tiny greens (pins), brooks mapped as lines, a boundary
  among polo fields and paddocks, and a third-party card.

## Open questions for the developer

1. Tee set: White (6,190 yd) by the standing defaults, or also Red (6,555, the
   tips everyone talks about)? — recommendation: White only; add Red as a
   second playable set if you want the US Open-style length (TPC Boston
   precedent).
2. Scorecard: no official card online; ratings differ (Red 72.7/138 vs
   73.2/135, White 71.1/134 vs 71.0/131) — recommendation: use Stymie's
   figures, which go with the current yardages; a photo of the printed card
   would settle it.
3. Theme — recommendation: `seekonk` (white pine and turning maples, tan
   rough); say `bayside` if you'd rather match Franklin and TPC Boston.
4. Polo fields, paddocks and bridle paths — recommendation: polo fields and
   paddocks out of bounds, bridle paths and drives cart paths (free relief).
5. If the Hanse restoration has happened since 2021 (fairways widened, trees
   cleared) — recommendation: build from OSM and the 2021 lidar, drop trees the
   newest NAIP doesn't show, and list the rest.
6. Logo — recommendation: the near-sighted spectacles above.

## Kickoff prompt

```
Build Myopia Hunt Club (`myopia`, South Hamilton, MA) for Silver Swings Golf.
Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/myopia/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `myopia-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. Work on branch
course/myopia. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
