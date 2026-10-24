# Shinnecock Hills Golf Club — scouting (2026-10-24)

William Flynn's 1931 links-style course on the sandy, windswept Shinnecock
Hills in Southampton, Long Island: a founding club of the USGA with the
oldest clubhouse in the US (1892), and host of six US Opens, the latest in
June 2026. It shares a boundary with National Golf Links of America
(`docs/scouting/ngla/`), and **the same downloads serve both**: the box,
links and data request live in the NGLA folder; this folder's
`DATA_REQUEST.md` points there.

## At a glance
| | |
|---|---|
| Id | `shinnecock` |
| Location | 200 Tuckahoe Road, Southampton (town), Suffolk County, NY; 40.894, -72.440 (Wikipedia, 40°53′38″N 72°26′24″W; OpenGolfAPI 40.8942, -72.4388) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / 70 (per card) |
| Designed | William Flynn (Toomey & Flynn), built 1928-31 by Dick Wilson; earlier courses by Willie Davis (12 holes, 1891), Willie Dunn Jr. (18 holes, 1894-95), C. B. Macdonald and Seth Raynor (1916; their Redan, the 7th, is the one hole Flynn kept). Restoration by Bill Coore and Ben Crenshaw, 2012 (Golf Club Atlas; Wikipedia's infobox says 2013); lengthened to 7,440 yd for 2018; tree clearing over the last 25 years |
| Access | private |
| Notable | US Open 1896, 1986, 1995, 2004, 2018 and 2026 (won by Wyndham Clark, 276, −4, wire to wire); US Amateur 1896, US Women's Amateur 1900, US Senior Amateur 1967, Walker Cup 1977; US Open and US Women's Open booked for 2036; Top100golfcourses world 3rd-4th; 259-260 acres, about 100 of them native rough |
| In video games | **Yes.** PGA Tour 2K25 added it under licence as the 126th US Open course in Season 6 (patch notes of 15 April 2026: "now available free to play for all players", also a MyCAREER event course; announced in the January 2026 notes). Also a fan-made Links 2003 add-on, "Shinnecock Hills HD Tournament Edition" (Robert Miller, 2011, Links Corner). Not in EA Sports PGA Tour's course list. No earlier licensed appearance turned up |
| Default tee (standing defaults) | Blue: 6,141 yd, 70.3 / 129 (GolfPass card; another listing has 6,122 with the same rating) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party, complete (GolfPass: Red 6,940 / Green 6,430 printed (6,530 in the tee table) / Blue 6,141 / White 5,396, pars, both stroke indexes, ratings); a second version on Stymie differs on the Blue front nine and stroke index 3/4. 2018 and 2026 US Open yardages (7,440). No official card online |
| OSM | unknown until the Overpass export |
| Bare earth | NYS DEM_2024_Long_Island, 1 m, spring-2024 lidar (shared download, NGLA request step 2) |
| Canopy | NYS Long Island 2024 LAS tiles (shared; class 1 holds the trees); fallback NOAA DAV 4938 (April 2014) |
| Orthophoto | NYS orthoimagery "Latest", 0.5 m (shared); NAIP fallback |

Box: the NGLA box (4.6 x 5.4 km, EPSG:32618 x 712858-717459, y 4528547-4533948);
see `docs/scouting/ngla/README.md` for how it was set.

## Build notes
- **Theme:** as at NGLA, `coastal` (golden fescue, scrub, white sand)
  rather than the default `bayside`: the PGA Tour's 2026 preview describes
  about 100 acres of native rough, a mix of fescues and little bluestem, and the
  course is defined by fescue-covered hills. Use a mown rough band
  (`rough_band_m` about 2-3) with fescue beyond. Same theme for both
  neighbours.
- **Trees:** few left inside the course after 25 years of clearing (PGA
  Tour, 2026). Expect trees at the edges: along Route 27 and the railroad to
  the south, around the clubhouse and drive, and toward the houses. Lidar is
  spring 2024, leaf-off; check against the ortho.
- **Water:** hardly any. The 6th is named "Pond"; look for it in OSM and the
  ortho (a red penalty area by default). Shinnecock Bay and the ocean are
  outside the box.
- **Out of bounds / roads:** the OSM boundary. The club gave up the land
  south of Route 27 in 1927, so the highway and the Long Island Rail Road
  should lie outside it. NGLA borders it to the north and Southampton Golf
  Club is "immediately next door"; pick the boundary by name ("Shinnecock
  Hills Golf Club"). The driving range is out of bounds (default).
- **Special ground:** the native fescue and little bluestem (fescue rough),
  and sandy, scrubby blowouts that are not raked bunkers: surface 18 `waste`
  (`"waste_sand": true`) where OSM or tracing marks open sand outside the 150+
  bunkers.
- **Several courses on the site:** no. No `layouts`.
- **Renovations after the data dates:** none known. The 2026 US Open setup
  only moved fairway mowing lines out toward the bunkers.
- **Wind:** bays and Long Island, 2-12 mph. Wind is "almost always present";
  the 1986 first round was played in a nor'easter near 40 mph. Flynn routed
  the holes in three triangles so the wind comes from every side.
- **Course card hole:** 9 "Ben Nevis" — the green sits on the hill under the
  1892 clubhouse, which the crop would show; alternates for the rotation:
  7 Redan, 11 Hill Head (the smallest green, at the course's highest point,
  72 ft), 17 Eden.
- **Logo idea:** a wind-bent tuft of golden fescue with rust-red little
  bluestem, the native rough that covers the hills. Avoid the club's emblem.
- **What's hard:** bold greens (average 7,400 sq ft, the 11th only 4,280)
  whose slopes the green model can only approximate; many bunkers that OSM
  may not have; the member Blue tees are about 1,300 yd shorter than the US
  Open set, so check tee boxes against the card, not the TV yardages.

## Open questions for the developer
1. Theme `coastal` instead of `bayside`? — recommendation: `coastal`, same as
   NGLA.
2. Which online card? GolfPass (Blue 6,141) and Stymie (Blue 6,122) differ on
   six front-nine holes and the 3/4 stroke index. — recommendation: GolfPass
   now; the printed card if you can get a photo.
3. Build NGLA or Shinnecock first? — recommendation: either; the second
   course chat reuses the first one's clips and world choices (both
   kickoff prompts say so).
4. Logo: the fescue-and-bluestem tuft? — recommendation: yes.

## Kickoff prompt

```
Build Shinnecock Hills Golf Club (`shinnecock`, Southampton, NY) for Silver
Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read docs/scouting/shinnecock/
first (README.md, DATA_REQUEST.md, scorecard.csv, scorecard_sources.md,
sources.md), and docs/scouting/ngla/ for the shared box and downloads. Treat
the scouting as unverified notes: check every downloaded file on arrival
(COURSE_BUILD.md 5.5) and the scorecard against its sources. The files from
DATA_REQUEST.md are in the GitHub release `shinnecock-data` (the same files
as `ngla-data`; National Golf Links next door uses them too, so if a
course/ngla branch exists, reuse its clips and world choices). Use the
standing defaults (4.1) and the scouting's choices unless the data says
otherwise. Work on branch course/shinnecock. I'm not watching: make the
calls you can, write down open items with recommendations, and stop only for
what section 10 lists.
```
