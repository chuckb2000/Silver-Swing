# Newport Country Club — scouting (2026-10-24, partial)

Newport Country Club, Newport, RI: ⚠ one of the five founding clubs of the
USGA, host of the first U.S. Open and U.S. Amateur (1895), an open, nearly
treeless course on the shore of Rhode Island Sound. On the scouting list as a
third Rhode Island course (after Triggs and Wannamoisett) and a landmark of
American golf.

## Scouting status: incomplete

The session's shared web search budget ran out before any Newport search was
made, and the page fetcher only opens pages that a search returned. So
nothing below comes from a source read for Newport. What is here:

- **Ready:** the download box and links (DATA_REQUEST items 1-4), the lidar
  route (the 2022 Rhode Island statewide survey, already used for Triggs and
  Wannamoisett), the build defaults.
- **From memory, unverified (marked ⚠):** the facts below. They need checking
  against sources.
- **Missing:** the scorecard (every tee set per hole, ratings), the design
  history, the course's exact position, OSM coverage, water and out-of-bounds
  details, video games.

A follow-up scouting pass (a new message to this session or a new scouting
chat) should search, at least: the club or USGA history pages and Wikipedia
("Newport Country Club"); BlueGolf / GolfPass / 18Birdies / Stymie cards;
the USGA 2024 U.S. Senior Open and 2006 U.S. Women's Open hole-by-hole
yardages; the architects (William F. Davis, A. W. Tillinghast, Donald Ross)
and the recent restoration for the Senior Open; then fill `scorecard.csv`,
`scorecard_sources.md` and `sources.md`, correct this README and
`facts.json`, and re-run `make_links.py` with the real centre if it is more
than about 1 km from the one used.

## At a glance
| | |
|---|---|
| Id | `newport` |
| Location | ⚠ 280 Harrison Avenue, Newport, Newport County, RI; centre estimated 41.4630, -71.3480 (from memory: Brenton's Neck, inland of Ocean Drive) |
| UTM | zone 19, EPSG:32619 |
| Holes / par | ⚠ 18; par 70 for the 2024 U.S. Senior Open, about 71 for members (unverified) |
| Designed | ⚠ founded 1893 (Theodore Havemeyer among the founders); original nine by William F. Davis (1894); 18 holes later, with work credited to Donald Ross and A. W. Tillinghast (dates unverified); clubhouse by Whitney Warren (1890s); recent restoration for the U.S. Senior Open (architect not known) |
| Access | private |
| Notable | ⚠ first U.S. Amateur (C. B. Macdonald) and first U.S. Open (Horace Rawlins), October 1895; 1995 U.S. Amateur (Tiger Woods); 2006 U.S. Women's Open (Annika Sörenstam, playoff over Pat Hurst); 2020 U.S. Senior Open cancelled (COVID-19); 2024 U.S. Senior Open (Richard Bland) |
| In video games | not researched |
| Default tee (standing defaults) | unknown until the card is found (Blue, else the set closest to 6,300 yd) |

## Data status
| Item | Status |
|---|---|
| Scorecard | **missing** (no source read) |
| OSM | unknown until the export |
| Bare earth | USGS 3DEP 1 m from the 2022 USGS Lidar: RI Statewide (project `RI_Statewide_D22`, flown late March 2022, leaf-off); the statewide survey covers Aquidneck Island |
| Canopy | NOAA DAV dataset 9981 (same survey), all classes; no vegetation class, so trees come from class 1 with OSM buildings removed (as at Triggs and Wannamoisett). Flight year 2022 |
| Orthophoto | NAIP (newest the USGS service holds) |

## Build notes
- **Theme:** ⚠ `coastal` (Highland Links: golden fescue, sand, sea, few
  trees) fits an open seaside course better than the New England defaults
  `bayside` or `seekonk`, if Newport's rough is the tall golden fescue it is
  known for. Check against photos in the follow-up pass.
- **Trees:** few: probably ornamental trees and hedges near the clubhouse and
  along the roads. The 2022 lidar will show them; the leaf-off flight sees
  bare deciduous crowns poorly, as at Triggs.
- **Water and penalty areas:** ⚠ Rhode Island Sound lies beyond the course's
  seaward edge; ponds on the course not known. All red (standing default).
- **Out of bounds:** the OSM course boundary; roads crossing it unknown.
- **Special ground:** ⚠ native fescue rough (use `rough_band_m` like Highland
  Links: a thin mown band, then fescue); probably rock outcrops and stone walls
  near the shore. No waste sand known.
- **One course on the site** (as far as known). No `layouts`.
- **Renovations after the data:** ⚠ work before the 2024 Senior Open may
  post-date the March 2022 lidar; check in the follow-up pass.
- **Wind:** open coast, 3-14 mph.
- **Course card hole:** to choose in the follow-up pass (a green by the sea).
- **Logo idea:** a hickory-shafted club and a gutty ball over a line of
  waves, for the first U.S. Open and Amateur (1895). No club crest or
  clubhouse drawing.
- **Hard to build:** nothing known yet beyond the missing card; a private
  club card is often not online.

## Open questions for the developer
1. **The scorecard.** — recommendation: let the follow-up scouting pass look
   first; if it finds no per-hole card, a photo of the printed card (a
   member or the pro shop) is the only reliable source.
2. **Theme.** `coastal` or `bayside`? — recommendation: `coastal`, pending
   photos.
3. **Logo.** — recommendation: the 1895 club and gutty ball.

## Kickoff prompt

(Use it after the follow-up scouting pass has filled the scorecard.)

```
Build Newport Country Club (`newport`, Newport, RI) for Silver Swings Golf.
Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/newport/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `newport-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`newport`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/newport. I'm not watching: make the calls you can, write down open
items with recommendations, and stop only for what section 10 lists.
```
