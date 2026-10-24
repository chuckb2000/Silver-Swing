# Portland Golf Club — scouting (2026-10-24)

A private club in Raleigh Hills, unincorporated Washington County, on the
west side of Portland (5900 SW Scholls Ferry Road), about 1.5 km north-east
of RedTail, which is already in the game. Founded in 1914 beside an interurban
railway stop, it hosted the 1946 PGA Championship (Ben Hogan) and the 1947
Ryder Cup, the first after the war, and later the 1982 U.S. Senior Open, the
1999 U.S. Senior Amateur, the 2015 U.S. Women's Amateur and, a month before
this scouting, the 2026 U.S. Senior Women's Amateur. It is the most storied
club in the Portland area: a compact, tree-lined parkland course along Fanno
Creek with small greens.

## At a glance
| | |
|---|---|
| Id | `portland_gc` |
| Location | Raleigh Hills, Washington County, OR; clubhouse 45.47754, -122.76237 (NRHP nomination, section 11); course centroid 45.47518, -122.76096 (opengolfapi.org and stymie.golf, apparently the OSM polygon's centre) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 18 / 72 (35-37) on every card and on the USGA's 2015 and 2026 fact sheets. The club's own website lists hole 10 as a par 4 (par 71): open question 1 |
| Designed | 9 holes 1914; second nine laid out by George Turnbull 1915 (NRHP); 18 holes and 6,245 yd by 1918 (Links Magazine); A. V. Macan redesign 1922 (Oregon Golf Association); alterations 1950 and 1962 (NRHP); Robert Trent Jones Sr. redesign 1963-64 (NRHP says retained 1963; USGA says 1964); Dan Hixson restoration from about 2013: ~75 trees removed (20+ around the 13th green), then March-November 2022 bunkers cut from 63 to 51 (15 moved), 12 greens enlarged to their old edges, the 15th green rebuilt, tees regraded, forward tees on about 10 holes; new irrigation 2023; new back "Hudson" tees (over 7,000 yd) |
| Access | private |
| Notable | 1946 PGA Championship (Hogan), 1947 Ryder Cup, 1955 Western Open, Portland Opens (1944-45, 1947-48, 1959-60, 1964-65), LPGA Portland Classic (1972-73, 1975-76), Fred Meyer Challenge (1986-91), 1982 U.S. Senior Open, 1999 U.S. Senior Amateur, 2015 U.S. Women's Amateur, 2026 U.S. Senior Women's Amateur; U.S. Senior Amateur to come in 2034. On the National Register of Historic Places (clubhouse and course, 2023) |
| In video games | none known: Wikipedia lists none, and a dedicated search was not possible (the shared search budget ran out) |
| Default tee (standing defaults) | Blue, 6,317 yd on the card used (GolfPass); rating/slope 71.4/141 (GolfPass tee table, printed against 6,323 yd; unverified) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party only: GolfPass (course 11361), every tee set per hole with men's and women's stroke index, every row adds up. The newest of four versions found (it has the Hudson tees over 7,000 yd and the forward Gold tees of 2022). No card on the club's website. Conflicts in `scorecard_sources.md` |
| OSM | a `leisure=golf_course` polygon very probably exists (two OSM-derived sites give the same centroid); holes, greens and bunkers unknown until the export. OSM bunkers may predate the 2022 rebuild: check them on the 2024 photo |
| Bare earth | DOGAMI DTM mosaic, 1 m; the newest project here is most likely OLC West Metro 3DEP 2019 (flown 8 May - 31 Aug 2019, Quantum Spatial, 8 pulses/m², NOAA DAV 10044); the older OLC Metro 2014 also covers it. The mosaic exports in feet (RedTail) |
| Canopy | DOGAMI CHM mosaic, same flight (2019): after the tree removal of about 2013, before the 2022 bunker work |
| Orthophoto | OSIP 2024 (0.75 m in this box) |

## Build notes
- **Theme:** `pnw_club` (Waverley's: pnw with cleaner turf and whiter sand),
  for a manicured private parkland club whose bunkers were refilled in 2022
  with bright white sand from Best Sand; `pnw` is the fallback. No new theme.
- **Trees:** "giant Douglas firs and Sequoias" lining the fairways (Links
  Magazine), old-growth firs and dogwoods, old-growth trees along the south,
  east and north edges, rhododendrons on the bank behind the 1st green, an
  overhanging oak at the 16th green, a large fir about 140 yd out left on the
  15th tee shot and one guarding the left of 13 (club site; Garden Home
  History). Dense: expect s06b to clear tee-shot trees on several holes, and
  check the 13th and 15th signature firs are kept if they stand off the
  fairway centre line. The 2019 canopy post-dates the ~2013 removal of 75
  trees; compare with the 2024 photo for anything cut since.
- **Water** (all red, standing defaults): Fanno Creek runs through the
  course: left of and behind the 1st green, off the 6th tee, down the left of
  the 8th, down the 10th, along the right of the 17th green (Links: "wrapped
  almost entirely by a creek"); its old bed ran through the 16th until it was
  diverted in 1925. Woods Creek also flows through (NRHP). Junor Lake, a
  man-made lake at the south end, wraps the left and front of the 7th green
  and must be carried from the 11th tee. If OSM maps Fanno Creek only as a
  line, use `propose_channels.py` (Oswego Lake Muni, Oregon Golf Club).
- **Out of bounds:** the boundary (club site: a boundary fence left of the 5th,
  OB left of the 12th and 15th, beyond the 3rd and 14th greens). Bounded by
  SW Scholls Ferry Road (north, the clubhouse side), the Fanno Creek Trail
  (south), SW Nicol Road and SW 86th Avenue (NRHP). The course reaches about
  2,700 ft (820 m) south, 1,200 ft (370 m) north and 1,000 ft (300 m) east of
  the clubhouse; 119.36 acres (48 ha). No roads cross it. The parking,
  tennis courts and Patton Cemetery across Scholls Ferry Road are not
  course.
- **Practice:** no driving range (club site: a TrackMan hitting studio, a
  short-game area off the 18th, a practice green). Treat the short-game area
  as out of bounds if OSM maps it as `golf=driving_range` or a practice area.
- **Special ground:** none known (parkland; grass bunkers around the 17th
  green per Links Magazine are rough in the game).
- **Several courses?** No. But RedTail's world box (x 516830-518310,
  y 5033221-5034701) overlaps the south-west corner of this box: if the export
  brings in RedTail's `leisure=golf_course` polygon (way 156976873), drop it in
  `edits.json` (the pipeline takes every course polygon as a boundary,
  Gearhart lesson).
- **After the data dates:** the 2022 bunker rebuild and green expansions and
  the newest Hudson back tees may post-date OSM and do post-date the 2019
  lidar. Blue is the default, so the Hudson tees don't matter; bunkers and
  green edges come from OSM checked against the 2024 photo (tracing desk for
  any that moved).
- **Wind:** inland Pacific Northwest, 1-7 mph.
- **Course card hole:** 17 ("Island"): a par 3 over a front bunker to a green
  that Fanno Creek almost wraps, with grass bunkers around it; alternative 7
  (Junor Lake around the left and front of the green).
- **Logo idea:** a beaver gnawing at the foot of a Douglas fir beside a creek
  (the 10th is "Beaver": a colony built a dam behind its green on Fanno
  Creek); alternative, a little 1910s interurban rail car at a wooden halt
  (the club was sited for Firlock Station; the 15th is "Firlock Station").
  Original drawings, not the club's emblem.
- **Hard parts:** tight, tree-lined corridors and small greens (the 1st green
  is 17 yd deep, the 15th 11 yd deep in places), which make tee positions and
  green outlines matter; four card versions online, none official. Hole
  names (club site): 1 Rhododendron, 2 Long John, 3 Little Bend, 4 Raleigh
  Station, 5 Homestead, 6 Barn, 7 Bristol, 8 Fanno, 9 Dickson, 10 Beaver,
  11 Mallard, 12 Bridge, 13 Fir, 14 Dogwood, 15 Firlock Station, 16 Big Bend,
  17 Island, 18 Home.

## Open questions for the developer
1. **Hole 10 par.** The club's website says "Par 4" for the 10th; GolfPass,
   Stymie, GolfLink, opengolfapi and the USGA's 2015 and September 2026 fact
   sheets all say par 5 (482-511 yd), par 72. — recommendation: par 5 (par 72),
   and look again if a printed card turns up.
2. **Which card.** Four versions online, none official (Blue 6,317 / 6,353 /
   6,349; two stroke indexes). — recommendation: GolfPass (newest: Hudson tees
   over 7,000 yd as the club describes them, and the 2022 forward tees); a
   photo of the printed card would settle it.
3. **Ratings.** Blue 71.4/141 (GolfPass and 1golf.eu, against 6,323 yd) or
   71.1/141 (Stymie, 6,353 yd). — recommendation: 71.4/141, marked unverified.
4. **Theme.** — recommendation: `pnw_club`.

## Kickoff prompt
```
Build Portland Golf Club (`portland_gc`, Portland (Raleigh Hills), OR) for
Silver Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/portland_gc/
first (README.md, DATA_REQUEST.md, scorecard.csv, scorecard_sources.md,
sources.md). Treat the scouting as unverified notes: check every downloaded
file on arrival (COURSE_BUILD.md 5.5) and the scorecard against its sources.
The files from DATA_REQUEST.md are in the GitHub release `portland_gc-data`.
Use the standing defaults (4.1) and the scouting's choices unless the data
says otherwise. Work on branch course/portland_gc. I'm not watching: make the
calls you can, write down open items with recommendations, and stop only for
what section 10 lists.
```
