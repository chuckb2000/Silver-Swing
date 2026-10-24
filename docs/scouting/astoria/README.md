# Astoria Golf & Country Club — scouting (2026-10-24, incomplete)

**Incomplete:** the web-search budget shared by the scouting agents ran out
before this course was searched, and pages that no search returned can't be
opened from the sandbox. So nothing below was read from a source. Facts
marked *(brief)* come from the design chat's assignment; facts marked
*(memory)* are the scout's recollection and must be checked; the scorecard
was not collected. The box, the lidar and imagery links and the theme
reasoning are sound; the course chat does the fact and scorecard research at
intake (list below).

A private club on the Clatsop Plains at Warrenton, Clatsop County, on the
north Oregon coast, about 8 km north of Gearhart Golf Links (already in the
game). Opened in 1923, its holes lie in the hollows between parallel coastal
dune ridges *(brief)*, and it hosts the Oregon Coast Invitational, a
long-running amateur event *(brief)*. A second north-coast course with a
different character from Gearhart's open links: narrow corridors between
wooded ridges *(memory)*.

## At a glance
| | |
|---|---|
| Id | `astoria` |
| Location | Warrenton, Clatsop County, OR; 33445 Sunset Beach Lane *(memory)*, west of US 101 near the Sunset Beach road, south of Camp Rilea *(memory)*. Box centre 46.105, -123.932 is the scout's estimate, not a surveyed point: the box is 4 x 6 km to absorb ±1.5 km of error |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 18 / not collected |
| Designed | 1923 *(brief)*; architect not checked (George Junor *(memory, unverified)*); renovations not checked |
| Access | private |
| Notable | Oregon Coast Invitational *(brief)*; rankings not checked |
| In video games | not checked; none known |
| Default tee (standing defaults) | not known until the card is collected (Blue, else the set closest to 6,300 yd) |

## Data status
| Item | Status |
|---|---|
| Scorecard | **not collected** (see `scorecard_sources.md` for where to look) |
| OSM | unknown until the export |
| Bare earth | DOGAMI DTM mosaic, 1 m; almost certainly the OLC North Coast lidar (DOGAMI; flown 23 Oct 2008 - 9 Aug 2009 in 11 delivery areas, 8.61 points/m², extent -124.15 to -122.81, 43.87 to 46.24 incl. Clatsop County; NOAA DAV id 575), the same flight as Gearhart. ODF's 2020 Clatsop lidar covers forest land and stops at about -123.93 (probably not the course). Exports in feet |
| Canopy | DOGAMI CHM mosaic, same flight (2008-09): 15+ years old; check every crown on the 2024 photo (Gearhart lesson: 737 lidar trees were gone) |
| Orthophoto | OSIP 2024 (1.0 m over this box; ask for a 0.5 m clip of the world later for tracing) |

## Build notes
- **Theme:** `gearhart`, made for the Clatsop Plains 8 km south: Sitka spruce
  and wind-sheared shore pine with red alder, cool olive links turf, pale
  grey-white coastal sand, slate grey-teal water, straw fescue tones. Better
  than `coastal` (Cape Cod: pitch pine and scrub oak, golden-olive fescue, a
  deep blue Atlantic), whose trees and sea are the wrong ones here. Caution:
  `gearhart` draws all rough in its straw fescue tones unless `fescue_areas`
  limits them (`pipeline/s09_render.py`, `rough_band_mask`). If Astoria's
  rough is mown green with long grass only on the ridges (likely *(memory)*),
  trace those areas from the 2024 photo into `fescue_areas` (the colour rule
  in `data/gearhart/make_fescue.py`); if there is no long grass at all, use
  `pnw_club` or ask the design chat for a green-rough variant. Decide on the
  2024 photo.
- **Trees:** shore pine and Sitka spruce on the dune ridges *(memory)*; from
  the 2008-09 CHM, each crown checked against the 2024 photo
  (as `data/gearhart/check_trees.py` did, into `drop_trees`).
- **Water:** not checked. Sunset Lake lies near the course *(memory)*;
  any pond or lake inside is red (standing defaults).
- **Terrain:** the dune ridges are the course's character: steep side
  slopes, fairways in the troughs. The 1 m DTM shows them; expect strong
  posterized hillshade and many sidehill lies.
- **Out of bounds:** the OSM boundary; roads and houses not checked.
- **Special ground:** dune grass or fescue on the ridges (art only via
  `fescue_areas`); Scotch broom or gorse only if the 2024 photo shows it
  (surface 17 `gorse` is penal: don't assume it).
- **Wind:** open coast, 3-14 mph (standing defaults; as Gearhart, about 1 km
  from the beach).
- **Course card hole:** the course chat's pick from the contact sheet: a
  green set between two ridges.
- **Logo idea:** a Roosevelt elk standing on a dune ridge with a shore pine
  bent by the wind (elk herds graze the Clatsop Plains); not a shipwreck,
  which Gearhart has.
- **Hard parts:** everything factual is still to collect; lidar 15+ years
  old; the theme's rough colour (above).

## For the course chat at intake (search budget permitting)
1. The club's scorecard: the club website (search "Astoria Golf & Country
   Club scorecard"), then BlueGolf, GolfPass, the OGA's Explore Oregon Golf
   page, stymie.golf; every tee per hole, ratings and slopes (men's and
   women's). Add rows up against the printed totals.
2. The facts: address and coordinates (Wikipedia or GeoHack if a page
   exists), architect (George Junor? *(memory)*), opening year 1923
   *(brief)*, renovations and when, Oregon Coast Invitational history,
   water, out of bounds, rankings, video games.
3. Confirm the box against the OSM boundary before using the rasters.

## Open questions for the developer
1. **Scorecard.** Not collected. — recommendation: the course chat collects
   it at intake; if the club doesn't publish one, a photo of the printed card.
2. **Box.** The centre is an estimate. — recommendation: run step 1 of
   DATA_REQUEST.md first and download the rasters only if the course sits well
   inside the box on the Overpass map.
3. **Theme.** — recommendation: `gearhart`, with `fescue_areas` drawn from the
   2024 photo (or `pnw_club` if the rough is all green).
4. **Wind.** — recommendation: 3-14 mph (open coast).

## Kickoff prompt
```
Build Astoria Golf & Country Club (`astoria`, Warrenton, OR) for Silver Swings
Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It
has been scouted: read docs/scouting/astoria/ first (README.md,
DATA_REQUEST.md, scorecard_sources.md, sources.md). The scouting is
incomplete for this course (no scorecard; most facts unverified): do the
"For the course chat at intake" list in its README first. Treat the scouting
as unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `astoria-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`astoria`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/astoria. I'm not watching: make the calls you can, write down open
items with recommendations, and stop only for what section 10 lists.
```
