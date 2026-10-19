# Building a new course — runbook for the course-building chat

Read this whole file before doing anything. Then read `CLAUDE.md` (the project
spec; sections 3, 4, 5, 7.3, 8, 11 and 14 matter most here) and `DECISIONS.md`.
This file is the procedure; `CLAUDE.md` is the source of truth for rules and
numbers. If they disagree, `CLAUDE.md` wins and you tell the developer.
Then read `docs/COURSE_LESSONS.md` (what went wrong on earlier courses and
what to do instead), and add your own lessons to it at the hand-off. If OSM is missing whole holes,
also read `docs/COURSE_TRACING.md` (tracing them with the developer).

Recommended setup for this work: **Claude Opus 5.5 at high effort**; use
**extra-high (xhigh)** for the first new course, because that one also includes
Phase 0 (generalising the pipeline). Max effort isn't needed.

---

## 0. Who owns what

Two chats work on this repository.

| Area | Owner | Course chat may… |
|---|---|---|
| `game/src/**` (engine, physics, rules, UI, camera, swing) | design chat | read only. Never change gameplay. |
| `game/tests/**` | design chat | add course-specific test cases (section 8.2) only |
| `assets-src/sprites.py`, `font.py`, UI art | design chat | read only |
| `assets-src/palettes/<new theme>.json`, new tree variants for a new theme | course chat | create; never change an existing theme |
| `pipeline/**` | course chat | change, as long as every existing course rebuilds unchanged (section 3.4, checked once before merge) |
| `data/<course>/**`, `game/public/courses/<course>/**` | course chat | own it fully |
| `game/public/courses/index.json` (course registry) | course chat | add or update its own entry |
| `CLAUDE.md` section 11.x for the course, section 0 status line | course chat | write it |
| `DECISIONS.md` | both | add pipeline entries under "Data and pipeline" |

If the course needs a game change (a new surface type, internal out-of-bounds
lines the engine doesn't support, a 9-hole round length, a new tree theme in
the game), **don't make it.** Write a short request (what is needed, why, and the
smallest change that would do it) and give it to the developer to take to the
design chat. Keep building everything that doesn't depend on it.

### 0.1 Sharing the code between chats

The repository is **`chuckb2000/silver-swing`** on GitHub (private; default
branch `main`). Attach it to the session and clone it. Work on a branch named
`course/<id>`, push it, and open a pull request into `main`; the developer
merges it. Before starting and before handing off, fetch `main` and rebase on
it. Never push to `main` yourself.

Cloudflare Pages publishes `main` as the live site on every merge, and builds
every other branch at its own preview address, so the developer can play the
new course from the pull request before merging. A broken build on `main`
breaks the live site: run `npm run build` and the tests before every push.

Fallback without GitHub: the developer uploads the latest project zip. At the
end, send back a zip that contains only the paths the course chat owns (table
above), plus a list of every file changed outside `data/<course>/` and
`game/public/courses/<course>/`.

Don't publish or republish the game's web page (the claude.ai artifact) from
the course chat unless the developer asks. Normally the design chat publishes
after the merge, so two chats never overwrite each other's builds.

### 0.2 How to talk to the developer

- Succinct, factual, plain words. No enthusiasm or filler.
- The developer makes the calls on open items, plays the game, and downloads
  anything the sandbox can't reach.
- Ask in batches. Each question gives the facts, the options and a recommendation.
- Never claim a check passed that you didn't run.

---

## 1. Hard rules (repeat of CLAUDE.md, applied to courses)

1. **Never invent course geometry.** A feature missing from the data is an open
   item, not a guess. You may *propose* geometry derived from permitted sources
   (lidar, NAIP, a developer-supplied georeferenced image, including Google or
   Bing screenshots under rule 2) in
   `data/<course>/proposed/`; it goes into `edited/` only after the developer
   approves it.
2. **Google or Bing imagery: only screenshots the developer supplies.** The
   developer decided on 2026-10-19 to accept the terms-of-service risk of
   tracing them (CLAUDE.md 5.1 note). Don't fetch Google or Bing imagery
   yourself. Georeference each screenshot from ≥ 3 control points (4+
   preferred) and report the fit error in metres; tag every feature traced
   from it `source=google` (or `bing`), list those features in
   validation_report.md, and never contribute them to OpenStreetMap. Prefer
   open imagery where it is good enough. Other sources whose terms forbid
   tracing still may not be traced.
3. **Rebuildable:** `make course NAME=<id>` regenerates everything from `raw/` +
   `edited/` + `course_config.json` + `scorecard.csv`. No hand-edited build
   outputs.
4. **Deterministic:** seeded RNG only (seed from the course id or hole number,
   never time).
5. **Original assets only;** no club logos, crests, trademarks or official
   course art in the game.
6. **Non-commercial** project. Attribution for every data source goes into
   `course.json` and the credits.
7. **Respect refused fetches.** If WebFetch or a download is refused, don't
   retry through curl, Python, mirrors or caches. Tell the developer and ask for
   the file or another source.
8. Don't put the developer's email or personal details in any file, URL or
   request.

---

## 2. What the game needs from a course (the contract)

The pipeline's last step (`pipeline/s10_export.py`) writes
`game/public/courses/<id>/`. The game reads only these files:

| File | Content |
|---|---|
| `course.json` | everything below the table; schema = `CourseJson` in `game/src/data/course.ts` |
| `surface.png` | 8-bit greyscale, value = surface id, 0.5 m/px, row 0 = north. **The single map used for both physics and art.** |
| `surface_legend.json` | ids, OB ids, area per surface |
| `height.png` + `height.json` | bare-earth heights, 1 m grid vertices, R*256+G = uint16 between min and max, row 0 = north; `samples` lets the game check its decode |
| `trees.json` | parallel arrays x, y, h (m), r (crown radius, m), c (1 = conifer) |
| `terrain/c_<i>_<j>.png` | 512 × 512 px terrain art chunks at 2 px/m |
| `greens/gNN.png`, `gNN_trees.png/json` | far putting view per hole (6 px/m, 120 m window) |
| `greens/gNNn.png`, `gNNn_trees.png/json` | near putting view per hole (12 px/m, 64 m window) |
| `greens/gNNc.png`, `gNNc_trees.png/json` | close-up putting view per hole (24 px/m, 48 m window) |
| `maps/overview_2m.png`, `maps/holeNN.png` | overview and per-hole minimaps |

`course.json` holds: id, name, location, state, architects, theme, attribution[],
world {width, height, pxPerM 2, utmOrigin, epsg}, teeSets[] {name, rating,
slope, totalYd}, defaultTee, par, holes[] {number, par, handicap,
tees{<set>: {x, y, yd, adjYd, realYd, cardYd, centerline}}, greenId,
greenCenter, pin}, greens[] (analytic green models from s07), water[] {id,
penalty red|yellow, poly}, boundary, buildings[], terrain, waterFrames [],
greenViews[], wind {minMph, maxMph}, height, surface, trees, maps.

Coordinates: local metres, +x east, +y north, origin = SW corner of the world
extent in the course's UTM zone.

Surface ids (`pipeline/common.py` `SURF`, mirrored in the game): ob 0, rough
1, fairway 2, fringe 3, green 4, tee 5, bunker 6, water 7, cartpath 8, woods
9, ob_road 10, ob_water 11, ob_woods 12, ob_building 13, building 14, range 15.
Out of bounds = every `ob*` id plus `range`. **Never renumber these.** A new
surface type is a game change (section 0).

---

## 3. Phase 0 — one-time generalisation (first new course only)

The pipeline and game were written for Oswego Lake. Before the second course,
these assumptions must go. Check each one; it may already have been fixed.

### 3.1 Game side (done by the design chat, session 2)

- [x] Course list `game/public/courses/index.json` (`{courses: [{id, name,
      location, state, theme, holes, par, defaultTee, totalYd, teeSets}]}`) and a
      course choice on the new-round screen.
- [x] Course data loaded when a course is chosen (`src/data/courses.ts`;
      one course in memory at a time).
- [x] Title, credits and leaderboard read the course from the list and
      `course.json` (`name`, `location`, `architects`, `attribution`).
- [x] Resume loads the saved round's own course.
- [x] Tree sprites per theme: the game loads `sprites/trees_<theme>.png/json`
      and `sprites/trees_<theme>_meta.json` for a theme other than `pnw`, and
      falls back to the `pnw` set (with a console warning) if they're missing.
- [x] Tests run for every course in the list (`tests/unit/courses.test.ts`:
      files present, list matches `course.json`, minimaps and the three
      putting views per hole, a robot round). `course.test.ts` stays
      Oswego-specific.
- [x] 9-hole courses: rounds of 9 holes or 18 (twice around). The scorecard
      numbers the second loop 10-18; `Round.courseHole` is the course's own
      hole. A 9-hole course needs only holes 1-9 in `course.json`.

### 3.2 Pipeline side (course chat does this)

Known Oswego-specific code, with the fix:

| Where | Problem | Fix |
|---|---|---|
| `s09_render.py` `load_palette()` | always loads `palettes/pnw.json` | `load_palette(cfg["theme"])`; s09b passes the same |
| `s09_render.py` `stripe_field`, `s09b_green_views.py` line ~172 | `h["tees"]["Blue"]` | use `cfg["default_tee"]` |
| `s10_export.py` `attribution` | hard-coded DOGAMI + GolfPass | read `cfg["attribution"]` (list of strings) |
| `s10_export.py` `spec_items` | hard-coded Oswego open-item text | read `data/<id>/report_notes.md` if it exists |
| `s10_export.py` height `samples` | fixed indices (100,100), (700,500), (1200,800) fail on a smaller world | three samples at 10 %, 50 %, 90 % of cols/rows |
| `s01_osm.py` | only reads GDAL OSM GeoPackages; `cfg["osm_sources"]` required | also accept Overpass output (`raw/overpass.geojson`, osmtogeojson format: tags as properties), running the same `classify()` so every later step sees `{osm, kind, tags}` |
| `s04_elevation.py`, `s05_trees.py` | assume a 1 m raster aligned to whole metres in the course EPSG; `s05` slices the CHM by index | add `s00_prepare_rasters.py`: reproject + resample every input raster (DTM, DSM, CHM) with `rasterio.warp` to the world grid (1 m, whole-metre aligned, course EPSG, metres), writing `build/dtm_1m.tif`, `build/chm_1m.tif`; later steps read those |
| `s05_trees.py` | requires a CHM | CHM sources in order: `cfg.chm` raster; else DSM − DTM (`cfg.dsm`); else from a LAZ point cloud with PDAL (`cfg.laz`, highest-return grid at 1 m); else spec 5.4 item 3 fallback (OSM `natural=tree` points + Poisson-disk fill of `natural=wood`, seeded, flagged in the report as lower fidelity) |
| `s04_elevation.py` lake handling | `lake_level_max_m` written for Oswego Lake | keep it optional; document it in the config (3.3) |
| `s03_audit.py`, `s06_holes.py` | expect holes 1–18 | read the hole count from `scorecard.csv` |
| `s08_surface.py` | spec's `ob=yes` lines inside the boundary are not implemented | only if the course needs them: an `ob=yes` **area** polygon painted `SURF["ob"]`, plus a test that a ball at rest there is OB. Lines need a game change (section 0). |
| `s10_export.py` | ~~doesn't write the registry~~ | done: `update_registry()` upserts the course in `game/public/courses/index.json` |
| `Makefile` | step list | add `s00_prepare_rasters.py` first |

### 3.3 `course_config.json` (document every field you add)

```jsonc
{
  "id": "snake_case_id",               // folder name under data/ and courses/
  "name": "Full Course Name",
  "location": "Town, County, State",
  "state": "MD",                        // two-letter state code; s10 copies it into course.json and the registry entry
  "architects": "Name (year); later work by ...",   // "unknown" if not sourced
  "theme": "pnw",                       // palette + tree theme (assets-src/palettes/<theme>.json)
  "epsg": 32618,                        // UTM zone from longitude, see 4.2
  "osm_sources": ["raw/osm.gpkg"],      // and/or "raw/overpass.geojson"
  "boundary_name": "Name as tagged in OSM",
  "dtm": {"path": "raw/...tif", "units": "m|ft", "source": "who, product, date, resolution, CRS"},
  "chm": {"path": "...", "units": "m|ft", "source": "..."},   // optional, see 3.2
  "dsm": {"path": "...", "units": "m|ft", "source": "..."},   // optional
  "laz": {"paths": ["raw/laz/*.laz"], "source": "..."},       // optional
  "world": {"x0": 0, "y0": 0, "width": 1536, "height": 1024, "note": "how it was chosen"},
  "lake_level_max_m": null,             // optional: flatten a large off-course lake below this elevation
  "tee_sets": [{"name": "Blue", "playable": true, "rating": 0, "slope": 0, "total_yd": 0}],
  "default_tee": "Blue",
  "scorecard_source": "where, when, verified or not",
  "penalty_default": "red",
  "driving_range_is_ob": true,
  "wind_mph": {"minMph": 1, "maxMph": 7},
  "attribution": ["Map data © OpenStreetMap contributors (ODbL)", "..."],
  // optional: several courses on one site (East Potomac). Replaces tee_sets /
  // default_tee / scorecard.csv / scorecard_source per layout; see 3.5.
  "layouts": [{"id": "x_blue", "name": "X - Blue Course", "short": "Blue",
               "boundary_osm": "w123", "scorecard": "scorecard_blue.csv",
               "tee_sets": [...], "default_tee": "White", "scorecard_source": "..."}],
  "blossom": {"max_h": 12, "shore_m": 45, "max_from_boundary_m": 100},  // optional: flowering trees (potomac theme)
  "paint_range_outside": false,         // optional: draw a driving range outside the boundary as a range
  "connect_fairways": false,            // optional, only where OSM is wrong: s02b runs the fairway up to the green
                                        // (true = every hole, or a list of holes); see COURSE_LESSONS.md 3
  "trees_off_fairways_m": null,         // optional: drop trees whose top is this far (m) inside a fairway (check the course first)
  "join_boundary": {"water_osm": ["r123"], "penalty": "red"},
                                        // optional: a boundary mapped in several parts with water between them
                                        // (Langston): that water, inside the parts' convex hull, becomes penalty
                                        // areas and joins the parts into the one polygon the game needs (s02)
  "green_tiers": [{"hole": 9, "drop_m": 0.91, "width_m": 4.0, "low_side": "left"}],
                                        // optional: two-tier greens. low_side left|right (step along the line of
                                        // play, through the centre) or front|back (step across it; "line_frac"
                                        // places it as a share of the green's depth from the low edge);
                                        // "pin": "upper_tier" moves the pin to the middle of the upper tier
  "keep_tee_trees": [],                 // optional: holes ("10", or "blue 7" with layouts) that keep trees in front of the tee
                                        // (a deliberate tree-lined dogleg). Every other tee shot at the middle of the fairway
                                        // is cleared: s06 moves the tee within its box, s06b drops trees (COURSE_LESSONS.md 3)
  "ob_highways": ["trunk"],             // optional: roads of these OSM highway values inside the boundary are out of bounds (Indian Island's Route 105)
  "tee_shot_margin_m": 0,               // optional: extra vertical clearance (m) the tee-shot tree check keeps from each crown,
                                        // when the game test still finds a crown the pipeline check passed by centimetres
  "red_water_osm": ["r123"],            // optional: OSM water features that are red penalty areas wherever they lie,
                                        // also outside the boundary (a river along the course; Tualatin)
  "drop_trees": [{"x": 0, "y": 0, "reason": "..."}]  // optional: single trees (local metres) the developer asked to remove
}
```

### 3.5 Several courses on one site (`layouts`)

When one property holds several courses (East Potomac: Blue 18, White 9, Red
9), list them as `layouts` in one data folder. The world (terrain, surface,
heights, trees, every green, art) is built once and exported to
`courses/<data id>/`; each layout gets its holes, putting views, minimaps and
`course.json` in `courses/<layout id>/`, pointing at the shared files with
`../<data id>/` paths. A layout's holes are the `golf=hole` lines inside its
`boundary_osm` polygon (or tagged `layout=<id>`); its card is its own
`scorecard` file. The OB line is the union of all `leisure=golf_course`
polygons. Each layout is a separate entry in the course list, with `group`,
`groupName` and `layout` fields.

### 3.6 Edits and proposals

Write changes to the OSM layout as `data/<id>/edits.json` (add features from a
`proposed/` file, retag, drop; each with a reason); `merge_edits.py` (run by
`make course` after s01) turns them into `edited/course.geojson`. `extend_start` moves a hole line's start (a tee without a mapped box) back
along the line. Tools that make proposals: `propose_tees.py` (raised tee pads in the DEM near each hole's
tee-shot axis; `--wide=<holes>` also searches 250 m around the line start, for a back tee off the
line), `propose_channels.py` (a penalty area along an OSM stream line, from the channel in the
DEM; tag it `flatten=no` so s04 keeps its falling bed). `propose_trace.py` (greens, fairways, bunkers, tee pads, hole lines and
water traced from a georeferenced orthophoto and the DEM, from seeds in
`data/<id>/trace_spec.json`, for holes OSM lacks). The tracing desk: `desk_export.py`
writes the data for `pipeline/desk/index.html` (publish it as a claude.ai page
with `{db: {}, user: {}}`; change its `<title>` per course), where the developer
drags traced outlines into place and marks each Blue tee against a live yardage
readout; read the saved holes back into `data/<id>/desk/` and run
`desk_to_proposed.py`, then add `proposed/approved.geojson` in `edits.json`
(Indian Island, COURSE_LESSONS.md 3). Large state-wide rasters: `clip_raster.py` cuts them to the
world before they go into `raw/`.

### 3.4 Regression check (only when pipeline code changed)

**When.** Only when you changed code in `pipeline/` (or a generator script
the pipeline calls). Skip it for changes to your own course's
`data/<course>/` files, `course_config.json`, scorecard, edits or proposals:
those can't change another course. Run it **once, before asking the
developer to merge**, not after every pipeline edit. Rebuilding every
course is slow (East Potomac takes the longest), so don't make the
developer wait on it mid-build.

1. Rebuild every existing course: `make course NAME=<id>` for each one in
   `game/public/courses/index.json` (multi-course sites like East Potomac
   are one build).
2. Compare with the committed files: `git status --short game/public/courses`
   must show no change outside your own course, or each difference must be
   explained and accepted (for example, the height `samples` moving). No
   "before" rebuild is needed; the committed files are the baseline. Look at
   changed images side by side.
3. `cd game && npm test` and `npm run e2e` pass.
4. Log the change in `DECISIONS.md` under "Data and pipeline".

---

## 4. Phase 1 — intake

### 4.1 Ask the developer (one message)

- Course name and town. Which tee sets to build (default: the set whose total
  is closest to 6,300 yd, since the club distances in CLAUDE.md 7.1 suit it).
- Any known facts: water hazards and their colour, internal out-of-bounds,
  holes that play over roads, the driving range.
- Whether they have the official scorecard (photo is fine) or know where it is.
- Which data they can download (section 5); the sandbox usually can't reach
  Overpass, USGS, state lidar portals or club websites.

### 4.2 Work out

- **Course id:** snake_case, short (`oswego_lake`).
- **UTM zone:** `zone = floor((lon + 180) / 6) + 1`; northern hemisphere
  EPSG = 32600 + zone. Central Maryland is zone 18 (EPSG:32618); western
  Maryland (west of 78° W) is zone 17 (EPSG:32617). Use the zone of the
  course's centre even if the course is near a zone edge.
- **Theme:** existing `pnw`, or propose a new one (section 7.6) if the trees and
  colours differ clearly (for example eastern hardwoods).
- **Bounding box for downloads:** course boundary + 150 m for OSM, + 50 m for
  rasters (the world extent in 6.1 adds more; download enough to cover it:
  boundary + 200 m is safe).

---

## 5. Phase 2 — data acquisition

Write the developer one **data request**: exact files, extent (lat/lon box,
WGS84), and step-by-step download instructions they can follow without GIS
experience. Put the instructions in `data/<id>/DATA_REQUEST.md` too.

### 5.1 Layout: OpenStreetMap

Option A (easiest for the developer): Overpass Turbo (overpass-turbo.eu),
paste this, run, Export → GeoJSON, save as `raw/overpass.geojson`:

```
[out:json][timeout:120];
(
  way["leisure"="golf_course"]({{bbox}});
  relation["leisure"="golf_course"]({{bbox}});
)->.course;
(
  nwr["golf"]({{bbox}});
  nwr["natural"~"^(water|wetland|wood|tree|tree_row)$"]({{bbox}});
  nwr["landuse"~"^(grass|meadow|forest)$"]({{bbox}});
  nwr["leisure"~"^(golf_course|park|garden|pitch|swimming_pool)$"]({{bbox}});
  nwr["building"]({{bbox}});
  way["highway"]({{bbox}});
  way["waterway"]({{bbox}});
  nwr["amenity"="parking"]({{bbox}});
);
out geom;
```

(Give the developer the box as numbers to type into the map, or replace
`{{bbox}}` with `south,west,north,east`.)

Option B: QGIS with the QuickOSM plugin, or a Geofabrik extract clipped in
QGIS, saved as GeoPackage (`raw/osm.gpkg`, the format the Oswego build used).

### 5.2 Elevation

Bare earth (required): USGS 3DEP 1 m DEM tiles from the USGS National Map
downloader, or a better state product (Maryland: the state's lidar/elevation
portal; Oregon: DOGAMI). Record product name, date, resolution, CRS and
vertical units.

Canopy (strongly preferred, it places the trees): one of
- a canopy height model raster (some states publish one; DOGAMI does);
- a first-return / highest-hit DSM raster (then CHM = DSM − DTM);
- the lidar point cloud (LAZ) for the extent, from the same 3DEP project
  (then build a highest-return grid with PDAL in the sandbox).

Check what exists for that location first (search the web; don't guess
product names), then name the exact product in the request.

### 5.3 Scorecard

Official card first (club website, a photo of the printed card). Third-party
listings (GolfPass, BlueGolf) are fallbacks; mark them unverified. Write
`data/<id>/scorecard.csv`:

```
hole,par,handicap,<teeset1>,<teeset2>,...
1,4,7,402,385,...
```

Tee-set column names are the lowercase tee names used in `course_config.json`
(`s06` reads `card[n][ts.lower()]`). Record rating/slope per tee set in the
config. Note every conflict between sources as an open item; never average
them.

### 5.4 Imagery (optional)

NAIP (public domain) helps check trees and trace gaps; NIR band lets you
compute NDVI to confirm canopy. A developer screenshot of Google/Bing may be
traced under rule 1.2 when the open imagery is too poor (as at Indian Island).
Another route: the developer traces Bing or Esri imagery in an OSM editor
(iD), contributes it to OSM (permitted by Microsoft and Esri), and the course
is re-exported from Overpass.

### 5.5 Checks on arrival (before anything else)

For each raster: CRS, resolution, units (feet vs metres: elevations in the
hundreds where the area is ~50 m above sea level means feet), nodata value
and holes, and coverage of the whole world extent. For OSM: there is a
`leisure=golf_course` boundary with the course's name, and feature counts per
kind. Report problems in one message.

---

## 6. Phase 3 — configure and run the layout steps

### 6.1 World extent

1. Reproject the boundary to the course EPSG.
2. Take its bounding box, add ~120 m of scenery on every side.
3. Round outward so width and height are multiples of **256 m** (512 px art
   chunks at 2 px/m), with x0/y0 on whole metres.
4. Keep each side ≤ 2,048 m unless you have checked load time and memory in
   the game with that size (Oswego is 1,536 × 1,024 m). If the course is
   bigger, tell the developer before going ahead.
5. Write it into `world` with a note on how it was chosen.

### 6.2 Run s01–s03 and triage the audit

```
cd pipeline && pip install -r requirements.txt --break-system-packages
python3 s00_prepare_rasters.py <id>   # after Phase 0
python3 s01_osm.py <id> && python3 s02_reproject.py <id> && python3 s03_audit.py <id>
```

Read `build/audit.md` in full. For each hole you need: a `golf=hole` line with
`ref` and `par`, a tee polygon for every playable tee set near the line's
start, a fairway (par 4/5), a green at the line's end, a `golf=pin` on that
green, and the hazards you'd expect from the scorecard and imagery.

Common problems and what to do:

| Problem | Action |
|---|---|
| No pin on a green | Open item. Proposal: green centroid, marked as a proposal; the developer approves. |
| Hole line ends off the green | Check `ref` numbering and whether it ends on a practice green. Ask. |
| Hole line starts on another hole's tee (Oswego 7/11) | The tee-set assignment in s06 handles it if the right box exists; report it. |
| Tee set missing (no box within 8 % of the card) | Open item: the developer traces the box in QGIS, or accepts the line start as the tee. |
| Missing bunker/fairway/water visible on imagery | Proposed geometry from NAIP/lidar in `proposed/`, or the developer traces it. Never silently added. |
| Water polygon untagged red/yellow | Default from `penalty_default`; ask about each one. |
| Practice greens | Become wrong greens (relief required); list them. |

Edits go in `data/<id>/edited/course.geojson` (WGS84, same tags as OSM, plus
`penalty=red|yellow`, `ob=yes`, `tee_set=<name>` where needed). Validate it:
closed polygons, no self-intersections (`shapely.is_valid`), every feature
tagged, hole refs complete, a pin on every green. `s02` uses `edited/` instead
of `raw/` when it exists, so `edited/` must contain **everything**, not only
the fixes.

---

## 7. Phase 4 — terrain, trees, holes, greens, art

Run each step on its own, read its output, then go on. Never run the whole
Makefile and look only at the end.

### 7.1 `s04_elevation.py` — heightmap

Check: min/max elevation plausible for the area; slope percentiles on
fairways (p50 typically 2–8 %, p99 under ~35 %), greens and tees (tees should
be near flat after levelling); no spikes or pits (buildings or bridges
left in a DTM show as plateaus or holes); water bodies flattened. Look at a
hillshade PNG of the result.

### 7.2 `s05_trees.py` — trees

Open `build/trees_preview.png` and look at it (crop and enlarge areas around
several holes). Check: tree count and height distribution are plausible;
canopy edges match imagery if available; no trees on fairways or greens
except real ones; `dropped_on_playing_surfaces` is reasonable and listed;
buildings didn't become trees. Conifer/deciduous split: by crown shape (and
leaf-off imagery if available); for a hardwood-dominated course expect mostly
deciduous. Report how the type was decided.

### 7.3 `s06_holes.py` — yardage validation

Read `build/validation_table.md`. Thresholds (CLAUDE.md 5.5): ≤ 3 % pass,
3–8 % flag (check tee assignment and bend points, suggest a fix), > 8 % fail
(**stop and ask**). Allowed fixes, in order, all logged in
`adjustments.json` with a reason, with real and adjusted yardage both
reported: move the virtual tee within the real tee polygon (s06 already
does this for flagged holes); widen fairways or shrink rough by ≤ 5 m per
side; last resort scale one hole along its line by ≤ ±5 %. Never scale the
whole course. Re-run validation after any change.

### 7.4 `s07_greens.py` — green shaping

Checks in `build/greens_report.md`: used tilt 1–2.5 %, max slope ≤ ~3.5 %,
max slope within 3 m of each pin ≤ 2 %. Greens with a fitted tilt > 3 % are
real sloped greens: keep the clamp and mention it. Don't hand-tune the RNG
to get nicer greens; if a green plays badly, it's an open item for the
developer.

### 7.5 `s08_surface.py`, `s09_render.py`, `s09b_green_views.py`

- Surface map: check the area per surface in `surface_legend.json` against
  the course (fairway acreage, bunker count). Render a debug colour PNG of
  `surface.npy` and look at every hole.
- Terrain art: open `build/art/terrain.png` crops for every hole at 1:1 and
  2×. Look for: missing features, rough showing where fairway should be,
  bunkers without lips, holes in water, roads crossing greens, buildings
  drawn on the course, stripe direction following each hole, shadows all
  falling to the lower right.
- Putting views: for each hole, open `greens/gNN.png`, `gNNn.png` and `gNNc.png`
  (+ tree atlases); the green, fringe, bunkers and nearby trees should match
  the course art. `HOLES=3,7 python3 s09b_green_views.py <id>` rebuilds
  selected holes only.

### 7.6 A new theme (only when the course needs one)

- `assets-src/palettes/<theme>.json`: ≤ 32 colours with the **same keys** as
  `pnw.json` (G0–G9, L0–L2, S0–S2, W0–W2, K0–K4, B0–B2, R0, WH), because
  `build_lut` maps surfaces to keys. Keep the art rules of CLAUDE.md section 4
  (no gradients, light from the upper-left, saturated and limited).
- Tree sprites for the theme (e.g. eastern hardwoods: oak, maple, tulip
  poplar; fewer conifers): new variants in `assets-src/trees.py` output to
  `sprites/trees_<theme>.png`, without changing the `pnw` output byte for
  byte. Loading them per course is a game change (3.1).
- Show the developer a side-by-side of one hole in the old and new theme
  before rendering the whole course.

### 7.7 `s10_export.py`

Check the export summary (chunk count, trees, buildings, size; expect
roughly 8–15 MB per course) and read `data/<id>/validation_report.md` in full.

---

## 8. Phase 5 — game integration and verification

### 8.1 Build

```
cd game && npm install && npm run build
```

The course must appear in the registry and be selectable (3.1).

### 8.2 Unit tests for the course

Each check in `tests/unit/course.test.ts` must pass for the new course:
height decode against samples; every tee on a tee box and every pin on its
green; measured yardages within 3 % (or the accepted, logged exceptions);
a robot golfer completes every hole with legal, finite scores; the default
aim keeps a perfect tee shot out of the trees on every hole; wind stays in
the course range; far, near and close-up putting views cover every pin;
same seed → identical round. If the test file is still Oswego-only, ask the
design chat to parametrise it (3.1); don't fork it.

### 8.3 Play it (in the sandbox, with Playwright)

The preview server: `cd game && npx vite preview --port 4173 --strictPort`
(start it directly with nohup). Chromium is preinstalled; launch with
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. The page
exposes `window.__game` (scenes `title`, `setup`, `play`, `hud`).

For every hole, save and **look at**:
1. the tee shot aim screen (does the default target make sense, is the tee
   on the tee box, is anything drawn wrong);
2. the hole overview (Tab);
3. a putt from ~3 m and ~10 m (far and close-up views, flag, cup, slope
   marks);
4. one approach shot landing (does the ball bounce/roll on the right
   surfaces).

Also run a robot round over all holes and report the score, penalties per
hole, and any hole where the robot needed more than par + 4 (usually a data
problem: a tee boxed in by trees, a mis-tagged water polygon, OB too close).

### 8.4 Out-of-bounds and penalty checks

For every water polygon: colour (red/yellow) matches the developer's answer;
drop options work. For the boundary: no tee or green within ~5 m of OB
unless that's real; roads crossing the course inside the boundary are cart
paths (relief), not OB, unless the developer says otherwise.

---

## 9. Phase 6 — documentation and handoff

1. `data/<id>/validation_report.md`: yardage table, every open item numbered,
   adjustments, tree detection summary, green checks, audit.
2. `CLAUDE.md`: add section 11.N for the course in the same shape as Oswego
   (facts, scorecard table with source and date, ratings, default tee, known
   open items). Update section 0 status (one or two lines).
3. `DECISIONS.md`: every pipeline change and every new convention, with the
   reason.
4. `README.md`: add the course to the rebuild instructions if anything about
   the command changed.
5. Tests: `npm test` and `npm run e2e` pass; if pipeline code changed, the
   regression check (3.4) passes for every existing course.
6. Hand off: branch + pull request (or the zip described in 0.1). The
   message to the developer has: what was built, open items needing their
   decision (numbered, each with a recommendation), anything requested from
   the design chat, and how to try it.

---

## 10. Stop and ask (don't work around these)

- A hole is > 8 % off the scorecard after allowed fixes.
- Hole numbering, pars or the routing in OSM disagree with the scorecard.
- A tee set or green is missing and can't be proposed from permitted data.
- The data needed isn't reachable and the developer hasn't supplied it.
- The world would be bigger than 2,048 m on a side.
- The course needs a game change (section 0).
- Sources conflict (two scorecards, two penalty colours).
- Anything would require touching a club's logo, branding or official
  course imagery.

---

## 11. Acceptance checklist (all true before handoff)

- [ ] `make course NAME=<id>` rebuilds everything from raw/edited/config/scorecard.
- [ ] If pipeline code changed: every existing course rebuilds unchanged
      (3.4, run once before merge), or the differences are explained and
      accepted.
- [ ] Every hole: pass, or flag/fail explicitly accepted by the developer.
- [ ] Every playable tee set has a tee position on every hole.
- [ ] Every green has a pin and far, near and close-up putting views.
- [ ] Trees placed from lidar (or the documented fallback), preview inspected.
- [ ] Every water hazard has a confirmed penalty colour.
- [ ] Attribution complete in `course.json` and shown in the credits.
- [ ] Unit tests and the Playwright smoke test pass.
- [ ] Every hole was looked at in the game (8.3), and the screenshots were
      checked, not just taken.
- [ ] `validation_report.md`, `CLAUDE.md` 11.N, section 0 and `DECISIONS.md` updated.
- [ ] Open items listed for the developer with recommendations.

---

## 12. Course-select card, logo and state

- **Course id:** if the developer already has a logo for the course, use
  its id: `highland_links`, `langdon`, `east_potomac`, `langston`,
  `stone_creek`, `waverley`, `eastmoreland`, `willamette_valley`,
  `indian_island`, `gearhart`, `tualatin`
  (`assets-src/logos.py`). Otherwise ask the developer what the logo should
  show; the design chat draws it.
- **State:** add `"state": "<postal code>"` to `course_config.json` and make
  sure s10 copies it into `course.json` and the course's entry in
  `game/public/courses/index.json`.
- **Card:** after the export, run `python3 assets-src/course_cards.py <id> --sheet`,
  look at the contact sheet of every green
  (`game/public/sprites/cards/_<id>_greens.png`, delete it afterwards), pick
  the most striking one with the developer, put it in
  `assets-src/course_cards.json`, then run `python3 assets-src/course_cards.py <id>`.
  That also writes the course's view for the title screen's rotation
  (`game/public/sprites/title/<id>.png` and `index.json`): commit them too.

