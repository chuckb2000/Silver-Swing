# Pumpkin Ridge Golf Club — scouting (2026-10-24)

Thirty-six holes by Bob Cupp on 350 acres of former farmland at the foot of
the Tualatin Mountains, north of North Plains in rural Washington County,
about 35 km west of Portland. Opened in 1992. **Witch Hollow** (private) is
the championship course: Tiger Woods won the third of his three straight U.S.
Amateurs there in 1996 (38th hole against Steve Scott, before the largest
crowd in the event's history), and it held the 1997 and 2003 U.S. Women's
Opens, the 2006 U.S. Women's Amateur and the Korn Ferry Tour's Portland Open
since 2014. **Ghost Creek** (public, Cupp with John Fought) was Golf Digest's
best new public course of 1992 and held the Nike Tour Championship (1993-94)
and the LPGA Safeway Classic (2009-12). LIV Golf played its second event here
in 2022 (which course was not checked).

## At a glance
| | |
|---|---|
| Id | `pumpkin_ridge` (data folder); layouts `pumpkin_ridge_witch_hollow`, `pumpkin_ridge_ghost_creek` |
| Location | North Plains, Washington County, OR; 12930 NW Old Pumpkin Ridge Rd; 45.61389, -123.00194 (Wikipedia, 45°36′50″N 123°00′07″W) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | Witch Hollow 18 / 72 (club card; the Korn Ferry Tour plays it as a par 71, the 14th as a par 4, 7,109 yd in 2020); Ghost Creek 18 / 71 |
| Designed | Robert E. (Bob) Cupp, 1992 (Witch Hollow); Cupp and John Fought, 1992 (Ghost Creek, opened first, 1 April 1992). Construction from August 1990. Renovations: none found (no dedicated search was possible) |
| Access | Witch Hollow private; Ghost Creek public. Owned and run by Escalante Golf since October 2015 |
| Notable | 1993-94 Nike Tour Championship (GC); 1996 U.S. Amateur (WH, Woods); 1997 and 2003 U.S. Women's Open (WH); 2000 U.S. Junior and Girls' Junior (both, finals on GC); 2006 U.S. Women's Amateur (WH, Kimberly Kim, youngest winner); 2009-12 LPGA Safeway Classic (GC); 2014- WinCo Foods Portland Open, Korn Ferry Tour (WH); 2022 LIV Golf Invitational Portland |
| In video games | none known (Wikipedia lists none; a dedicated search was not possible, the shared search budget ran out) |
| Default tee (standing defaults) | Witch Hollow Blue 6,506 yd, 72.4/140; Ghost Creek Blue 6,357 yd, 72.0/139 (GolfPass) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party (GolfPass) for both courses: every tee set per hole, men's and women's stroke index, every row adds up. Witch Hollow's ratings and totals match a 2015 blog and GolfPass's membership page; Ghost Creek's Blue+ row matches hole19golf (in metres). An older Ghost Creek card (greenskeeper.org, Blue 6,451, another stroke index) conflicts. Official site pumpkinridge.com not read (no search budget left); BlueGolf pages exist but are closed to the sandbox |
| OSM | unknown until the export |
| Bare earth | DOGAMI DTM mosaic, 1 m; most likely OLC West Metro 3DEP 2019 (extent -123.31 to -122.45, 45.238 to 45.7 takes in North Plains; confirm in the Lidar Data Viewer), else OLC Metro 2014. Exports in feet |
| Canopy | DOGAMI CHM mosaic, same flight |
| Orthophoto | OSIP 2024 (1.0 m over this 4 x 4 km box; ask for a 0.5 m clip of the world later if tracing needs it) |

## Build notes
- **Layouts (COURSE_BUILD.md 3.5):** one data folder `pumpkin_ridge`, one
  world, two layouts: `pumpkin_ridge_witch_hollow` (`scorecard_witch_hollow.csv`)
  and `pumpkin_ridge_ghost_creek` (`scorecard_ghost_creek.csv`), `group`
  "Pumpkin Ridge". `scorecard.csv` here is a copy of Witch Hollow's. Each
  layout's holes are the `golf=hole` lines inside its own boundary polygon (or
  tag them `layout=<id>` in `edits.json` if OSM has one polygon for the club).
  Recommended order: Witch Hollow first (the championship course, the one
  people know from 1996), Ghost Creek in the same build if the world allows,
  since every download is shared.
- **World size:** 350 acres (1.42 km²) for 36 holes is compact, but if the
  union of both boundaries plus scenery is over 2,048 m on a side, stop and
  ask (section 10); the fallback is Witch Hollow's world alone.
- **Theme:** `pnw` (Washington County farm edge under the Tualatin Mountains):
  Douglas firs (150-ft firs on Witch Hollow 9, a tall pine at WH 11's green, a
  big fir left of GC 13's landing area), 100-year-old Oregon white oaks and
  maples (Golfdom 2008, GC 18). No new theme.
- **Water** (all red, standing defaults). Ghost Creek course: the stream Ghost
  Creek appears and disappears through the round (right of GC 6 from ~175 yd,
  right of 9's landing area, the second shot on 10, 11, down the left of 17
  and across its fairway, right of 18's landing area); a lake wrapping the
  left half of the 9th green; a stone-walled pond right of the 17th green; a
  lake along the right of the 18th green; protected wetlands on GC 3 and
  carried on GC 4 (golfclubatlas, golfcoursegurus). Witch Hollow: ponds in
  front of the 3rd green and front-right of the 5th, the 12th over water, the
  14th's approach over water, a creek across the 6th's approach, marsh in
  front of the 18th tee (wiscogolfaddict 2015). Map `natural=wetland` inside
  a boundary as red penalty area (recommendation).
- **Special ground:** native fescue carried on WH 9 and 10. If the 2024 photo
  shows it tan and long, Gearhart's `fescue_areas` (art only) can draw it;
  otherwise it is rough.
- **Out of bounds:** the union of the two course polygons; the driving range
  (standing default). Roads inside: club drives become cart paths.
- **After the data dates:** nothing known since 2019; check tees and trees on
  the 2024 photo (Korn Ferry Tour tees may be newer).
- **Wind:** inland Pacific Northwest, 1-7 mph.
- **Course card holes:** Witch Hollow 12 (a short par 3 over water to a
  sloping green, "not many places to miss"); Ghost Creek 18 (a 454-yd par 4
  with the lake along the whole right side of the green; Golfdom's "Hole
  No. 18" feature).
- **Logo ideas** (one per layout, original, not the club's emblem; check what
  the club uses before drawing a pumpkin): Witch Hollow, a great horned owl on
  the crooked limb of an old Oregon white oak against a low moon; Ghost Creek,
  a pale wisp of morning mist rising off a reed-lined creek.
- **Hard parts:** two courses in one world; wetlands and a creek that comes
  and goes (only partly mapped, probably: `propose_channels.py` from the DTM
  channel for the unmapped reaches); tall firs close to play (s06b); a
  possible world over 2,048 m.

## Open questions for the developer
1. **Which course first.** — recommendation: Witch Hollow, with Ghost Creek as
   the second layout of the same world (both cards are in hand).
2. **Ghost Creek card version.** GolfPass (Blue 6,357, Plus combination tees)
   vs greenskeeper.org (Blue 6,451, different stroke index on most holes). —
   recommendation: GolfPass (newer; hole19golf agrees hole for hole).
3. **Witch Hollow par.** Members' card par 72 (14th a par 5, 450 yd from
   Blue); the tour's par 71. — recommendation: the card's par 72.
4. **Wetlands.** — recommendation: red penalty areas.
5. **Logos.** Two (one per layout) or one for the club. — recommendation: one
   each, as above.

## Kickoff prompt
```
Build Pumpkin Ridge Golf Club (`pumpkin_ridge`, North Plains, OR) for Silver
Swings Golf: Witch Hollow first, with Ghost Creek as a second layout of the
same world (COURSE_BUILD.md 3.5) if it fits. Follow CLAUDE.md,
docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been scouted: read
docs/scouting/pumpkin_ridge/ first (README.md, DATA_REQUEST.md, scorecard.csv,
scorecard_witch_hollow.csv, scorecard_ghost_creek.csv, scorecard_sources.md,
sources.md). Treat the scouting as unverified notes: check every downloaded
file on arrival (COURSE_BUILD.md 5.5) and the scorecard against its sources.
The files from DATA_REQUEST.md are in the GitHub release `pumpkin_ridge-data`.
Use the standing defaults (4.1) and the scouting's choices unless the data
says otherwise. You may design a new theme of its own for this course (`pumpkin_ridge`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/pumpkin_ridge. I'm not watching: make
the calls you can, write down open items with recommendations, and stop only
for what section 10 lists.
```
