# Course scouting — how each folder is made

A scouting folder holds everything a course chat needs to start building a
course, collected before any data is downloaded: facts, the scorecard, the
developer's download list (exact links), and build notes. The developer
downloads the files in `DATA_REQUEST.md`, uploads them to a GitHub release,
and pastes the kickoff prompt from `README.md` into a new chat.

Read first: `CLAUDE.md` (the project), `docs/COURSE_BUILD.md` sections 4–5
(intake, data acquisition, standing defaults 4.1) and section 12 (card, logo,
state), `docs/COURSE_LESSONS.md` sections 1–2. Look at one finished request
for the house style: `data/tpc_boston/DATA_REQUEST.md` (outside Oregon),
`data/bandon_dunes/DATA_REQUEST.md` (Oregon).

## What the sandbox can and can't reach

- **No** Overpass, OSM API, Nominatim, USGS, NOAA, DOGAMI or state GIS from
  the shell or WebFetch (WebFetch only opens URLs that came back from
  WebSearch). So nothing here can be downloaded or checked; the course chat
  checks every file on arrival.
- **Yes:** WebSearch, and WebFetch on the result URLs (club sites, BlueGolf,
  GolfPass, Wikipedia, USGS/NOAA catalogue pages, news). Local Python
  (pyproj, shapely) for maths.
- Don't fetch golfingrecord.com or oswegolakecc.org. Never send the
  developer's email anywhere.

## The folder: `docs/scouting/<id>/`

| File | What |
|---|---|
| `README.md` | the brief (below) |
| `DATA_REQUEST.md` | the developer's download checklist |
| `scorecard.csv` | `hole,par,handicap,<tee1>,<tee2>,...` (lowercase tee names), only from a per-hole source |
| `scorecard_sources.md` | every card source with URL and date, ratings/slopes per tee (men's and women's), totals check, conflicts |
| `facts.json` | machine-readable facts (below) |
| `sources.md` | every URL used, what it gave, date read |
| `box.json`, `links_generated.md` | written by `tools/make_links.py` |

Write nothing outside your own course folders. No git commands.

### Course id

snake_case, short: `yale`, `pasatiempo`, `sfgc`, `ngla`. Use the id given in
your assignment.

### The box (where the downloads are cut)

Without OSM you can't see the boundary, so the download box is the course's
estimated extent plus a generous margin; the course chat sets the real world
from the OSM boundary later and clips.

1. Find the course centre (lat/lon) and extent: Wikipedia/GeoHack
   coordinates, the club's address, a course map or routing description
   (which way the holes run, how far the farthest hole is from the
   clubhouse), acreage. Write down how you got them.
2. Run `python3 docs/scouting/tools/make_links.py <id> <ST> --centre LAT LON --half-x HX --half-y HY`
   with half-sizes that cover the whole course **plus at least 500 m** on
   every side, given your uncertainty about the centre. A compact 18 is
   about 1.2–1.8 km across: `--half 1500` is the usual minimum. Clubs with
   two or three courses, or long out-and-back links, need more. Too big is
   cheap (bigger files); too small means a second round of downloads.
3. The tool prints the box (WGS84 and UTM), the Overpass Turbo query, the
   bare-earth link(s) and the orthophoto link(s), and writes `box.json` and
   `links_generated.md`. Copy its links into `DATA_REQUEST.md`.

### Elevation and trees (research per course)

- **Oregon:** DOGAMI DTM + CHM (the tool's links). Find which DOGAMI lidar
  project/year covers the site.
- **Elsewhere:** the tool's 3DEP link gives bare earth. Find which 3DEP lidar
  project covers the site (name, flight dates) and its 1 m DEM project name,
  so the tile URLs can be written out in full
  (`https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/<project>/TIFF/USGS_1M_<zone>_<tile>_<project>.tif`;
  the tool prints the tile ids) as a fallback.
- **Canopy (places the trees):** outside Oregon the proven route is the lidar
  point cloud clipped by the NOAA Data Access Viewer (see
  `data/tpc_boston/DATA_REQUEST.md` item 2: dataset id, steps, classes,
  projection). Find the NOAA DAV dataset id for the best project covering the
  site (search "coast.noaa.gov dataviewer <project name>" or NOAA's lidar
  inventory / InPort pages). If a state portal offers a ready DSM, CHM or
  normalized surface model raster (e.g. Washington DNR lidar portal,
  Connecticut CT ECO, New York's elevation services, Maryland iMAP), prefer
  it and give the exact steps. Note the flight year: trees cut or planted
  since then are an open item.
- Note anything better than the national products (a newer state lidar,
  0.15 m state orthos).

### Scorecard

- Official card first (club website: PDF or image; save its URL for the
  developer to download if you can't read it). Then BlueGolf
  (course.bluegolf.com ... detailed scorecard), GolfPass, the USGA Course
  Rating database (ncrdb.usga.org), GHIN-derived sites, tournament media
  guides (US Opens, US Amateurs: hole yardages), Wikipedia.
- Every tee set, per hole: par, stroke index (handicap), yardage. Ratings and
  slopes per tee set, men's and women's, with the source. Add each row up and
  compare to printed totals. Never average two sources; record conflicts.
- Note the tee the standing defaults pick (Blue, else the set closest to
  6,300 yd) and its total.
- Private clubs often have no card online: say exactly what's missing and
  where the developer could get it (a photo of the printed card, a
  tournament guide), and fill what you can (pars and championship yardages
  from tournament coverage are better than nothing; mark them).

### Layout knowledge (for the course chat)

Look for: a course map / routing image (save URLs for the developer),
hole-by-hole descriptions, renovations and when (compare with the lidar and
NAIP years), water (ponds, creeks, ocean, which holes), out of bounds inside
the property (roads, houses), roads crossing the course, multiple courses on
the site (which holes belong to which; `layouts`), a practice range,
landmarks. Special ground: waste sand (the game has surface 18 `waste`,
general area, `"waste_sand": true`), gorse/heather (surface 17), ice plant,
barrancas, native fescue, sandy scrub, dunes, cliffs. Tree species and
their look (for the theme and sprites). Typical wind.

Don't invent geometry: describe, cite, and leave the shapes to OSM, lidar
and tracing. Check OpenStreetMap coverage if you can find the course's OSM
pages through search (way/relation ids, whether holes and greens are mapped);
otherwise say "OSM coverage unknown until the Overpass export".

### Video games

Search whether the course has appeared in golf video games (EA/Tiger Woods
PGA Tour, PGA Tour 2K, Links, Golden Tee, etc.). Say what you found.

## `README.md` (the brief)

```
# <Course name> — scouting (<date>)

<one paragraph: what and where, why it's on the list>

## At a glance
| | |
|---|---|
| Id | `<id>` |
| Location | town, county, state; lat, lon (source) |
| UTM | zone NN, EPSG:326NN |
| Holes / par | 18 / 72 (per card) |
| Designed | architect, year; renovations (who, when) |
| Access | public / resort / private |
| Notable | championships, rankings |
| In video games | what you found |
| Default tee (standing defaults) | <set>, <yards>, rating/slope |

## Data status
| Item | Status |
|---|---|
| Scorecard | complete official / third-party / partial (what's missing) |
| OSM | known coverage or "unknown until export" |
| Bare earth | product, year |
| Canopy | route (CHM / DSM / NOAA DAV id), flight year |
| Orthophoto | NAIP year / state product |

## Build notes
- Theme: existing (`pnw`, `pnw_club`, `bayside`, `seekonk`, `coastal`, `puget`,
  `bandon`, `bandon_dunes`, `gearhart`, `anacostia`, `potomac`) or a new one,
  with the trees, grass and sand colours it needs.
- Trees: species, where, how dense; lidar year vs now.
- Water and penalty areas; out of bounds; roads; buildings in play.
- Special ground (waste sand, fescue, ice plant, barrancas ...): which config.
- Several courses on the site? Which one, and whether `layouts` apply.
- Renovations after the data dates.
- Wind (standing defaults by region; say which band).
- Course card hole (a signature green) with a reason.
- Logo idea: an original motif tied to the place (no club emblem or
  trademark; describe it in a sentence).
- Anything that makes this course hard to build, and how to handle it.

## Open questions for the developer
1. <question> — recommendation: <...>

## Kickoff prompt
(the block below, filled in)
```

The kickoff block, filled in for the course:

````
```
Build <Course name> (`<id>`, <Town, ST>) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/<id>/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `<id>-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. Work on branch
course/<id>. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
````

## `DATA_REQUEST.md` (the developer's checklist)

Plain steps a non-GIS person can follow, one file per link, in this order:

1. OSM (Overpass Turbo query from the tool) → `<id>_overpass.geojson`.
2. Bare earth (tool links; Oregon DOGAMI DTM).
3. Canopy (Oregon: DOGAMI CHM link; elsewhere: the NOAA DAV recipe with the
   dataset id, or a state DSM/CHM route).
4. Orthophoto (tool links).
5. Scorecard images/PDFs to save, if the sandbox couldn't read them (URLs).
6. Course map / reference pictures to save (look-only), if useful.
7. Hand-off: on https://github.com/chuckb2000/Silver-Swing/releases click
   "Draft a new release" with the tag `<id>-data` (the sandbox can't create
   releases), drop every file into "Attach binaries" (below the description
   box, which rejects files over 25 MB), and click **Publish release**.

Give each file the name to save it as. Say roughly how big each is. Mark
optional items as optional. Keep it short.

## `facts.json`

```json
{
  "id": "", "name": "", "short_name": "", "town": "", "county": "", "state": "",
  "lat": 0, "lon": 0, "centre_source": "", "epsg": 0,
  "holes": 18, "par": 72, "architects": [], "opened": 0, "renovations": [],
  "access": "", "notable": [], "video_games": "",
  "tees": [{"name": "", "yards": 0, "rating": 0, "slope": 0, "par": 72, "gender": "M"}],
  "default_tee": "", "theme": "", "new_theme_needed": false, "wind_mph": [1, 9],
  "special_ground": [], "water": "", "layouts": [],
  "lidar": {"bare_earth": "", "canopy": "", "flight_year": 0, "noaa_dav_id": null},
  "imagery": "", "osm_coverage": "unknown",
  "scorecard_status": "", "open_questions": []
}
```

## Finish

End with a short summary to the design chat: per course, what's complete,
what's missing, the box size, and anything surprising.
