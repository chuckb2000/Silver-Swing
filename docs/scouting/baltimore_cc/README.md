# Baltimore Country Club (Five Farms, East Course) — scouting (2026-10-24)

A. W. Tillinghast's East Course at Five Farms (opened 1926), the Baltimore
Country Club's 36-hole site in Lutherville-Timonium, Baltimore County: rolling
Piedmont parkland, restored by Keith Foster in 2015, with a long record of
national events (1928 PGA, 1932 U.S. Amateur, 1965 Walker Cup, 1988 U.S.
Women's Open, 2026 U.S. Senior Amateur). It is on the list because central
Maryland is the developer's home.

## At a glance

| | |
|---|---|
| Id | `baltimore_cc` |
| Location | Five Farms, 11500 Mays Chapel Road, Lutherville(-Timonium), Baltimore County, MD 21093 (club site). Centre 39.4435, -76.6623 (OSM golf-course centroid via OpenGolfAPI); clubhouse 39.4402, -76.6617 (where2golf) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / 70 (men; women's par 75, holes unknown). The West Course (par 72) shares the site |
| Designed | A. W. Tillinghast, opened September 1926. Renovation credited to Brian M. Silva (year not found); restoration by Keith Foster, completed 2015 (trees removed, bunkers restored, greens rebuilt, fairways regrassed). Golf Digest reviews mention further Foster work "scheduled" for 2027 (not confirmed elsewhere). West: opened 1962, redesigned 1990 by Bob Cupp and Tom Kite, Foster renovation 2012 |
| Access | private |
| Notable | 1928 PGA Championship (Leo Diegel), 1932 U.S. Amateur (C. Ross Somerville), **1965 Walker Cup** and **1988 U.S. Women's Open** (Liselotte Neumann) — the brief's "1988 Walker Cup" mixes these two up; Senior Players Championship 2007-2009; Big Ten men's 2017-2018; 2021 Maryland State Open; **2026 U.S. Senior Amateur** (29 Aug-3 Sep, won by Mike Sposa, per the club); 2031 U.S. Women's Amateur to come. Roland Park, the club's first course, held the 1899 U.S. Open. Golf Digest Second 100 #112 and Maryland #2 (2025-26) |
| In video games | none found (EA/Tiger Woods, PGA Tour 2K, Links, Golden Tee, The Golf Club, GSPro searched) |
| Default tee (standing defaults) | **Blue**: 6,620 yd per hole (GolfPass row II; tee name inferred), rated 6,664 yd, 72.9 / 136 |

## Data status

| Item | Status |
|---|---|
| Scorecard | third-party per-hole (GolfPass): 9 rows with par, men's and women's SI; ratings/slopes for 10 tee/gender sets. Only Black (7,181) matches a rated total; the other columns' tee names are inferred (within 0.2-1.6 % of the rated totals). USGA 2026 championship set-up per hole (6,564) as a cross-check. No club card online; a photo would settle it (`scorecard_sources.md`) |
| OSM | a `leisure=golf_course` "Baltimore Country Club" exists (OpenGolfAPI); holes, greens and whether East and West are separate polygons: unknown until the export |
| Bare earth | 3DEP 1 m service (tool links, tile x35y437); newest lidar is USGS **MD_4County_D24**, flown 17-30 Dec 2024, 8 pts/m², 0.5 m DEM (NOAA DAV 14110 as backup). Whether the 3DEP service already serves it: the developer's 1-minute check |
| Canopy | NOAA DAV point cloud, "2024 USGS Lidar: Maryland 4 County" (id read off the site by the developer; not found online); fallback **DAV 8492**, 2014 Baltimore County Lidar (6-7 May 2014, ~2 pts/m²), older than the 2015 tree removal |
| Orthophoto | **Maryland six-inch imagery, 2025** (MD iMAP ImageServer, confirmed) at 0.5 m; NAIP 1 m as backup |

## Build notes

- **Theme:** `anacostia` (the DC theme 50 km away: Mid-Atlantic summer turf,
  oaks and sycamores, olive water, no blossoms) is the starting point; a new
  `baltimore_cc` theme is allowed by the kickoff. Five Farms is Piedmont
  parkland (oaks, tulip poplar, maples, sycamore along the creek, some white
  pine): close to `anacostia`; a slightly cooler, greener grass and a
  brighter creek would make it its own. `potomac` has cherry blossoms, so it
  doesn't fit. `seekonk` (early autumn) is the alternative look.
- **Trees:** the 2015 restoration removed many trees; the 13th green sits in
  a grove (Golf Digest). Use the December 2024 lidar (after the removal). It
  is leaf-off: deciduous crowns return fewer hits, so check crown sizes
  against the 2025 six-inch imagery and the NAIP NIR band. If only the 2014
  lidar can be had, drop trees the 2025 imagery doesn't show.
- **Water:** "limited water hazards" (club). The 10th follows a creek to a
  green set against a pond ("dual water hazards", Planet Golf, Golfer's
  Journal); no other water reported. All red (standing default); expect the
  creek to need tracing if OSM lacks it (lidar shows the channel).
- **Out of bounds:** the club boundary; the 6th, a reverse-Road-hole par 5,
  bends left around an old farm barn with OB behind it (Planet Golf): an
  `ob=yes` line or the barn as a building, from OSM/imagery. Houses of Mays
  Chapel around the edges.
- **Ground:** rolling to hilly ("dramatic elevation changes", Golf Digest);
  96 bunkers (club); the 14th has a cross-hazard of sand and mounds; the 17th
  green is benched into a hillside beyond a gully; greens steeply
  back-to-front with false fronts (the green shaping in 5.6 should lean to
  the 3 % end). No waste sand, fescue or gorse reported.
- **Two courses on the site:** build the East. The West (Cupp/Kite, par 72)
  can be a second `layouts` entry later (COURSE_BUILD 3.5); if OSM has one
  boundary for both, split the holes by `layout=` or by the two 1-18 sets. Its
  card wasn't found (only on golfingrecord.com).
- **Renovations after the data:** none known up to the 2025 imagery; Golf
  Digest reviews mention Foster work "scheduled" for 2027. If it happens, a
  later rebuild.
- **Wind:** inland, but an open site (Golf Digest): **1-9 mph** (the inland
  band).
- **Course card hole:** the **10th** — green against the pond with the creek
  alongside, the subject of a Golfer's Journal feature. The 17th (green benched into a hillside) is the second choice.
- **Logo idea:** a farm weathervane whose arrow is a golfer at the top of the
  swing, over five fence rails — "Five Farms", and the old barn on the 6th.
  Not the club's crest or any club mark.
- **Hard parts:** tee names inferred from an unlabelled card (validate every
  column; the photo of the card settles it); women's pars unknown; the lidar
  point-cloud id must be picked on the DAV site; a second course inside the
  same boundary.

## Open questions for the developer

1. Can you get a photo of the printed East Course card? — recommendation:
   yes; it confirms which per-hole row is Blue, White, Gold and Red, and the
   women's pars. Until then, use the inferred columns (Blue = row II).
2. East only, or East and West as two layouts? — recommendation: East now;
   West later if its card turns up.
3. Theme: a new `baltimore_cc` theme from `anacostia`, or `anacostia` as is?
   — recommendation: a new theme (the kickoff allows it), close to
   `anacostia`, greener.
4. Logo: the Five Farms weathervane, or a black-eyed Susan (Maryland's state
   flower) in the cup? — recommendation: the weathervane.
5. Tee set offered first: Blue (standing default, 6,620 per hole) — the
   2026 Senior Amateur played 6,564, close to it. — recommendation: Blue.

## Kickoff prompt

```
Build Baltimore Country Club, East Course at Five Farms (`baltimore_cc`, Lutherville-Timonium, MD) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/baltimore_cc/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `baltimore_cc-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`baltimore_cc`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/baltimore_cc. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
