# National Golf Links of America — scouting (2026-10-24)

C. B. Macdonald's 1911 links on Sebonac Neck, Southampton, Long Island, on
the bluffs above Great Peconic Bay: the course where Macdonald built his
"template" holes (Redan, Alps, Eden, Road, Cape, Short, Punchbowl) and the
model for every Macdonald/Raynor course since. Private; Walker Cups 1922 and
2013; 4th-5th in the world on Top100golfcourses. It shares a boundary with
Shinnecock Hills (`docs/scouting/shinnecock/`), so one download serves both.

## At a glance
| | |
|---|---|
| Id | `ngla` |
| Location | Sebonac Inlet Road, Southampton (town), Suffolk County, NY; 40.9139, -72.4522 (OpenGolfAPI map point; Wikipedia gives no coordinates) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / 72 (per-hole card; newer tee tables say 73, see scorecard_sources.md) |
| Designed | C. B. Macdonald, built 1907-1911 with Seth Raynor supervising; listed later work: Perry Maxwell 1935, Robert Trent Jones Sr. 1948 and 1969 (GolfPass, unverified); new back tees on 3, 7 and 16 for the 2013 Walker Cup |
| Access | private (members and their guests) |
| Notable | Walker Cup 1922 and 2013; Top100golfcourses lists it 4th-5th in the world; about 250-285 acres, 300+ bunkers |
| In video games | none found (no licensed appearance in PGA Tour 2K, EA Sports PGA Tour, Links or Golden Tee turned up) |
| Default tee (standing defaults) | Green (no Blue; per-hole set closest to 6,300): 6,505 yd, 71.6 / 134 (men), card A in scorecard_sources.md |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party, complete for one card version (GolfPass: Red 6,935 / Green 6,505 / White 5,771, pars, stroke index, ratings). A newer card (Black 6,873 / White 6,425 / Green 5,817, par 73) has totals only. No official card online |
| OSM | unknown until the Overpass export (couldn't check from the sandbox) |
| Bare earth | NYS DEM_2024_Long_Island, 1 m, from the spring-2024 Long Island QL2 lidar (NYS ITS / USGS, Sanborn); 3DEP fallback. 3DEP 1 m project name not confirmed (tiles x71y453, x71y454, zone 18) |
| Canopy | NYS Long Island 2024 LAS tiles (12 + 4 optional, leaf-off, no vegetation classes: trees are class 1, as at Indian Island); fallback NOAA DAV 4938 (2014 USGS CMGP Post-Sandy Long Island, April 2014) |
| Orthophoto | NYS orthoimagery "Latest" (Suffolk flight year to note), 0.5 m; NAIP 1 m fallback |

Box: shared with Shinnecock, 4.6 x 5.4 km (x 712858-717459, y 4528547-4533948,
EPSG:32618). Centre = midpoint of the NGLA (OpenGolfAPI) and Shinnecock
(Wikipedia / OpenGolfAPI) points, which are 2.5 km apart; each course is about
250-285 acres (roughly 1.3-1.6 km across), so the box gives each point about
1.6 km on its outer sides, which covers either course whether the point is
its clubhouse or its middle, plus 500 m.

## Build notes
- **Theme:** the standing default is `bayside` (Indian Island). It fits the
  turf, sand and estuary water but not what defines this ground: golden,
  unmown fescue on sandy hills with bayberry and scrub, almost no trees
  ("generally without trees", CLUI). `coastal` (Highland Links: golden
  fescue rough, pitch pine and scrub oak, white sand, a mown rough band) fits
  better and needs no new theme. Recommendation: `coastal` with
  `rough_band_m` about 2-3 and fescue for the rest of the rough; the same for
  Shinnecock, so the two neighbours match.
- **Trees:** few on the course; expect them around the clubhouse, the
  entrance drive, along Sebonac Inlet Road, the residential edges and the
  shared line with Shinnecock. Lidar is spring 2024, leaf-off (deciduous
  crowns thin; `leaf_off: true` as at Indian Island). Check every lidar tree
  against the ortho; clubs here have been clearing trees.
- **Water (all red by default):** Great Peconic Bay along the right of 18
  and below the clubhouse bluff (the beach is probably outside the
  boundary); Bull's Head Bay ("Bullhead Bay") behind 12 and along 14;
  tidal pools to carry on 13 (with the road) and from the 14th tee; wetlands
  by the 17th green / 18th tee. Golfadelphia also mentions a carry over water
  and bunkers on 9; other reviews describe it as sand and scrub (see below).
- **Out of bounds / roads:** the OSM boundary. Sebonac Inlet Road crosses
  the course (the 13th plays over it; the 14th green was moved for it): by
  the standing defaults a road inside the boundary is a cart path (free
  relief). Shinnecock, Sebonack and Southampton GC are all inside the box;
  pick the boundary by name ("National Golf Links of America").
- **Special ground:** the 9th's "pit", a waste area of sand and scrub carried
  with the second shot (about 300 yd from the back tee), and other sandy
  scrub patches: surface 18 `waste` (general area, `"waste_sand": true`) where
  OSM or tracing marks them, not bunkers. More than 300 bunkers (365 by one
  count): expect many to be missing from OSM.
- **Several courses on the site:** no; one 18. No `layouts`.
- **Renovations after the data dates:** none known after the 2013 Walker
  Cup tees (on March 2012 imagery). Data from 2024 is current.
- **Wind:** bays and Long Island, 2-12 mph (`wind_mph` [2, 12]). Reviews
  stress the wind (10-15 mph crosswinds, "the front nine typically into the
  wind").
- **Course card hole:** 16 "Punchbowl" — the green sits under the windmill
  ("looms over the sixteenth green"), the course's landmark; alternates for
  the rotation: 4 Redan, 17 Peconic (bay behind), 13 Eden.
- **Logo idea:** a Peconic Bay scallop shell, sand-coloured ribs fanning
  from a small hinge, with a golf ball as the pearl. Avoid the windmill: it
  is the club's own symbol.
- **What's hard:** template greens (Redan, Punchbowl, Alps, Eden) have
  strong, deliberate contours the 1 m DEM won't hold; the green model's
  `tiers` and tilt only approximate them, and that should be said in the
  report rather than invented. Blind shots on 1, 2, 3, 7, 11 and 16 are fine
  in a top-down game. The windmill should be drawn: check it comes through
  in OSM (the request adds `man_made=windmill` to the query).

## Open questions for the developer
1. Theme `coastal` (golden fescue) instead of `bayside`? — recommendation:
   `coastal`, for both NGLA and Shinnecock.
2. Which card? The only per-hole card online (GolfPass) may be out of date;
   a newer card has Black 6,873 / White 6,425 / Green 5,817 with par 73. —
   recommendation: build Green 6,505 (par 72) from the per-hole card now and
   swap in the printed card if you can get a photo.
3. Par 72 or 73? — recommendation: 72 (per-hole card, Walker Cup, Wikipedia);
   73 appears only in tee tables without hole pars.
4. Lidar: the 2024 NYS tiles (heavy, current) or the 2014 NOAA clip (light,
   ten years older)? — recommendation: 2024 tiles.
5. Sebonac Inlet Road: cart path (default) or out of bounds? —
   recommendation: the default, unless you know a local rule.
6. Logo: the Peconic Bay scallop? — recommendation: yes.

## Kickoff prompt

```
Build National Golf Links of America (`ngla`, Southampton, NY) for Silver
Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/ngla/ first
(README.md, DATA_REQUEST.md, scorecard.csv, scorecard_sources.md,
sources.md). Treat the scouting as unverified notes: check every downloaded
file on arrival (COURSE_BUILD.md 5.5) and the scorecard against its sources.
The files from DATA_REQUEST.md are in the GitHub release `ngla-data`; the
same files serve Shinnecock Hills next door (docs/scouting/shinnecock/), so
if a Shinnecock branch already exists, reuse its clips and world choices.
Use the standing defaults (4.1) and the scouting's choices unless the data
says otherwise. You may design a new theme of its own for this course (`ngla`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/ngla. I'm not watching: make the calls
you can, write down open items with recommendations, and stop only for what
section 10 lists.
```
