# Building a new course — runbook for the course-building chat

Read the **quick path** below and `docs/COURSE_LESSONS.md` (about 120 lines of
judgment calls) before starting. The numbered sections after the quick path are
reference: open the one a step points to when you get there. `CLAUDE.md` is the
source of truth for rules and numbers (sections 3, 4, 5, 7.3, 8 and 14 matter
most); if this file disagrees with it, `CLAUDE.md` wins and you tell the
developer. Look at one finished course's file in `docs/courses/` (for example
`docs/courses/sandpines.md`) to see the shape of yours, and if OSM is missing
whole holes, read `docs/COURSE_TRACING.md`.

**A course chat edits no shared file except pipeline code it needs** (3.4).
Everything else it writes is in its own places: `data/<id>/`,
`game/public/courses/<id>/`, `docs/courses/<id>.md`, `assets-src/cards/<id>.json`,
`assets-src/course_logos/<id>.py`, and (rarely) a new theme. The course list, the
title-screen list, the daily rotation, `CLAUDE.md`, `DECISIONS.md` and
`COURSE_LESSONS.md` are generated or kept by the design chat, so merging a course
never conflicts with another course.

Recommended setup for this work: **Claude Opus 5.5 at high effort.**

---

## Quick path (read this; the sections below are reference)

Every finished course is **pinned** to the pipeline that built it
(`data/<id>/pipeline_pin.json`, `pipeline/pins.py`), so changes to the shared code
can't change it and nobody rebuilds other courses to check them. `make course`
**skips steps whose inputs haven't changed** (`pipeline/stepcache.py`), so a rebuild
after an edit runs only what the edit reaches.

1. **Set up** (0.1). `git clone --filter=blob:none` the repository (full history,
   files fetched as needed: fast, and pinned pipelines can still be unpacked),
   branch `course/<id>`, `pip install -r pipeline/requirements.txt
   --break-system-packages`, `cd game && npm install`.
2. **Scouting.** If `docs/scouting/<id>/` exists, read it: the facts, the scorecard
   and the download list are done. Otherwise work them out (4.3, 5.3).
3. **Downloads through GitHub Actions, first** (5.0), before the intake message:
   `python3 pipeline/remote_fetch.py new <id> --box S W N E --osm --dem --lidar
   --list`, commit `data/<id>/fetch.json`, push your branch, `python3
   pipeline/remote_fetch.py wait <id>`. A runner puts the Overpass export and the
   USGS 3DEP tiles into the release `data-<id>`; you read the OSM coverage yourself.
   Then the **intake message** (4.2): the standing defaults (4.1) you'll use, what
   the workflow fetched, the data request for only what it can't get (5), and only
   the questions that are really open. Start on what doesn't wait for the answer: `course_config.json` (3.3; copy a finished course's),
   `scorecard.csv` (5.3), the logo idea (12).
4. **Files arrive** (5.6): `python3 pipeline/remote_fetch.py pull <id>` for the
   workflow's, the release for the developer's. Put each into `raw/` with a
   `release.json` entry (the fetch log has every file's sha256), using
   `pipeline/intake.py` instead of writing scripts: `intake.py osm` (Overpass
   exports), `intake.py ortho` (photo exports placed by their request boxes),
   `intake.py laz` (lidar tiles or a NOAA zip, clipped to the world), `intake.py
   raster` (a big raster clipped). Then **`make intake NAME=<id>`** and fix every
   error before going on; read the warnings.
5. **World and layout** (6). Set `world` (6.1), then `make course NAME=<id>
   ARGS="--to s03_audit"` runs s00-s03. Read `build/audit.md` in full, including "Checks from earlier
   courses". Fix the layout in `edits.json` (3.6), never in `edited/`. Tracing:
   `docs/COURSE_TRACING.md`.
6. **Build** (7): `make course NAME=<id>`. Read each step's output and report
   (heights, `build/trees_preview.png`, `build/validation_table.md`,
   `build/greens_report.md`, the art). Iterate with edits and `make course` again:
   only the steps an edit reaches run (a scorecard fix: s03 and s06; a tree drop:
   s05 on; a layout edit: from merge_edits on). `ARGS="--from s06_holes"` forces a
   step and the ones after it; `ARGS=--fresh` runs everything.
7. **Check** (8). Write `data/<id>/checks.json` (8.2) for what is special about the
   course (accepted yardage flags, the wind band, points that must be water or in
   bounds, trees the developer removed) and run `cd game && npx vitest run
   tests/unit/course_play.test.ts -t <id>`. Write no test file unless a check can't
   be said in `checks.json`. Look at every hole in the game (8.3).
8. **Card, logo, state** (12).
9. **Hand off** (9). Commit, run `python3 pipeline/pins.py pin <id>` (after your last
   commit to `pipeline/` or `assets-src/`), then `make course NAME=<id> ARGS=--fresh`
   once and check `git status` shows nothing changed. Then `npm test` and `npm run
   e2e`, write `docs/courses/<id>.md`, push and open the pull request (`gh api
   repos/<owner>/<repo>/pulls`; `gh pr create` is blocked). `player.test.ts` fails
   on "<id> is in the daily rotation" until the merge: the design chat's `make land`
   adds it. Say so in the pull request.

Stop and ask only for what section 10 lists.

**The design chat's merge** (not the course chat's job): merge `main` into the
branch, `make land NAME=<id>` (daily rotation from tomorrow, pin check, rebuild
with the pin to prove it reproduces, the course's tests), push, merge. Nothing else
needs editing.

---

## 0. Who owns what

Two chats work on this repository.

| Area | Owner | Course chat may… |
|---|---|---|
| `game/src/**` (engine, physics, rules, UI, camera, swing) | design chat | read only. Never change gameplay. |
| `game/tests/**` | design chat | write `data/<id>/checks.json` (8.2); a `<id>.test.ts` only for a check `checks.json` can't say |
| `assets-src/sprites.py`, `font.py`, UI art | design chat | read only |
| A new theme: `assets-src/palettes/<theme>.json`, `assets-src/trees_<theme>.py` (its tree and bush painters), `game/public/sprites/trees_<theme>*` and `shrubs_<theme>*` | course chat | create (7.6); never change an existing theme or `trees.py` / `shrubs.py` |
| `pipeline/**` | course chat | change what your course needs (3.4): finished courses are pinned, so nothing else changes. Prefer a config key for course-specific behaviour |
| `data/<course>/**`, `game/public/courses/<course>/**` | course chat | own it fully |
| `docs/courses/<course>.md` | course chat | write it: facts, scorecard, the developer's calls, open items, new config keys, lessons (section 9) |
| `assets-src/cards/<course>.json` | course chat | write it (section 12) |
| `game/public/courses/index.json`, `game/public/sprites/title/index.json` | nobody | generated from the courses' `course.json` files at every build (`game/scripts/course-lists.mjs`); not in git |
| `CLAUDE.md`, `DECISIONS.md`, `docs/COURSE_LESSONS.md`, `game/src/data/dailyRoster.ts` | design chat | read only. The design chat's `make land NAME=<id>` adds the course to the daily rotation at the merge; lessons stay in your course file |
| `assets-src/course_logos/<course>.py`, `game/public/sprites/logos/<course>.png` | course chat | draw the course's logo (section 12) |
| `assets-src/logos.py` | design chat | read only (its helpers are imported by course logos) |

If the course needs a game change (a new surface type, internal out-of-bounds
lines the engine doesn't support, a 9-hole round length, a new tree theme in
the game), **don't make it.** Write a short request (what is needed, why, and the
smallest change that would do it) and give it to the developer to take to the
design chat. Keep building everything that doesn't depend on it.

### 0.1 Sharing the code between chats

The repository is **`chuckb2000/Silver-Swing`** on GitHub (private; default
branch `main`; GitHub renamed it from `silver-swing`, which still redirects: an
older clone can switch with `git remote set-url origin
https://github.com/chuckb2000/Silver-Swing.git`). Attach it to the session and
clone it with `git clone --filter=blob:none` (all of the history, file contents
fetched when needed: quick, and `pins.py` can still unpack a pinned pipeline; a
`--depth` clone can't rebase and can't unpack pins). Work on a branch named
`course/<id>`, push it, and open a pull request into `main` through the REST API
(`gh api repos/chuckb2000/Silver-Swing/pulls --input pr.json`; GraphQL commands
such as `gh pr create` and `gh release` are blocked); the developer merges it.
Before starting and before handing off, fetch `main` and merge or rebase on it.
Never push to `main` yourself.

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
- The developer makes the calls on open items and plays the game. Downloads go
  through the fetch workflow first (5.0); the developer downloads only what it
  can't get (a site you sign in to, an order sent by email, photos, a printed card).
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
   retry through curl, Python, mirrors, caches or the fetch workflow. Tell the
   developer and ask for the file or another source. The workflow (5.0) is for
   public open data the sandbox's network simply can't reach (Overpass, USGS,
   state portals), never for a site that refused or forbids automated downloads.
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
| `trees.json` | parallel arrays x, y, h (m), r (crown radius, m), c (0 deciduous, 1 conifer, 2 flowering tree, 3 flowering shrub). A shrub's bloom colour is its index % 8 (0 pink, 1 magenta, 2 purple, 3 white, 4 red, 5 coral, 6 pale pink, 7 leaves only); the putting views can draw it with `assets-src/shrubs.py` `shrub(W, H, variant)` and `shrub_key()` |
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
9, ob_road 10, ob_water 11, ob_woods 12, ob_building 13, building 14, range 15,
ob_sand 16, gorse 17, waste 18.
Out of bounds = every `ob*` id plus `range`. **Never renumber these.** A new
surface type is a game change (section 0).

---

## 3. The pipeline and the course config

The pipeline started with Oswego Lake and was generalised for every course by the
second one (Phase 0, 2026-10-18/19: themes, Overpass input, `s00_prepare_rasters`,
any hole count, layouts). The history is in `docs/archive/COURSE_LESSONS_full.md`
and DECISIONS.md.

### 3.3 `course_config.json` (document every field you add)

```jsonc
{
  "id": "snake_case_id",               // folder name under data/ and courses/
  "name": "Full Course Name",
  "location": "Town, County, State",
  "state": "MD",                        // two-letter state code; s10 copies it into course.json (the course list is made from that)
  "architects": "Name (year); later work by ...",   // "unknown" if not sourced
  "theme": "pnw",                       // palette + tree theme (assets-src/palettes/<theme>.json)
  "epsg": 32618,                        // UTM zone from longitude, see 4.2
  "osm_sources": ["raw/osm.gpkg"],      // and/or "raw/overpass.geojson"
  "boundary_name": "Name as tagged in OSM",   // read only by propose_trace.py: every leisure=golf_course becomes a boundary
  "dtm": {"path": "raw/...tif", "units": "m|ft", "source": "who, product, date, resolution, CRS"},
  "chm": {"path": "...", "units": "m|ft", "source": "..."},   // optional, see 3.2
  "dsm": {"path": "...", "units": "m|ft", "source": "..."},   // optional
  "laz": {"paths": ["raw/laz/*.laz"], "classes": [3, 4, 5], "units": "m|ft", "source": "...", "leaf_off": true},  // optional; units = the heights' (make intake prints them)
  "world": {"x0": 0, "y0": 0, "width": 1536, "height": 1024, "note": "how it was chosen"},
  "lake_level_max_m": null,             // optional: flatten a large off-course lake below this elevation
  "tee_sets": [{"name": "Blue", "playable": true, "rating": 0, "slope": 0, "total_yd": 0}],
  "default_tee": "Blue",                 // the longest set built (4.1)
  "scorecard_source": "where, when, verified or not",
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
                                        // (true = every hole, or a list of holes); see docs/archive/COURSE_LESSONS_full.md 3
  "trees_off_fairways_m": null,         // optional: drop trees whose top is this far (m) inside a fairway (check the course first)
  "merge_touching_fairways": false,     // optional: merge fairway pieces that touch (s02b approaches, OSM fairways drawn edge to edge)
                                        // before s08 rounds them, so no line of rough is left along the join (East Potomac)
  "join_boundary": {"water_osm": ["r123"], "penalty": "red"},
                                        // optional: a boundary mapped in several parts with water between them
                                        // (Langston): that water, inside the parts' convex hull, becomes penalty
                                        // areas and joins the parts into the one polygon the game needs (s02)
  "green_tiers": [{"hole": 9, "drop_m": 0.91, "width_m": 4.0, "low_side": "left"}],
                                        // optional: two-tier greens. low_side left|right (step along the line of
                                        // play, through the centre) or front|back (step across it; "line_frac"
                                        // places it as a share of the green's depth from the low edge);
                                        // "pin": "upper_tier" moves the pin to the middle of the upper tier
  "green_tilt": [{"hole": 11, "max_tilt": 0.035, "bumps": 0}],
                                        // optional: a green the course knows to be steeper than the usual 2.5 % cap
                                        // (Waverley 11); bumps sets its random undulations (0 = the slope is the feature)
  "keep_tee_trees": [],                 // optional: holes ("10", or "blue 7" with layouts) that keep trees in front of the tee
                                        // (a deliberate tree-lined dogleg). Every other tee shot at the middle of the fairway
                                        // is cleared: s06 moves the tee within its box, s06b drops trees
  "ob_highways": ["trunk"],             // optional: roads of these OSM highway values inside the boundary are out of bounds (Indian Island's Route 105)
  "tee_shot_margin_m": 0,               // optional: extra vertical clearance (m) the tee-shot tree check keeps from each crown,
                                        // when the game test still finds a crown the pipeline check passed by centimetres
  "red_water_osm": ["r123"],            // optional: OSM water features that are red penalty areas wherever they lie,
                                        // also outside the boundary (a river along the course; Tualatin)
  "drop_trees": [{"x": 0, "y": 0, "reason": "..."}], // optional: single trees (local metres) the developer asked to remove
  "remove_wires": {"min_len_m": 40, "max_width_m": 3.0, "rise_m": 3.0},  // optional: take power lines out of the
                                        // canopy model before the tree search (s05; Oregon Golf Club)
  "range_art": "rough",                 // optional: draw the driving range as rough (no stripes) with OB stakes
                                        // along its edge; it stays out of bounds (s09, s09b, s10; Oregon Golf Club)
  "join_boundary_parts": {"max_gap_m": 16},  // optional: a boundary in several parts, all in play, with OB land between
                                        // (Eastmoreland's road; Langdon Farms' highway, its parts mapped as separate ways)
  "building_colours": {"w123": "#a3302a"},   // optional: buildings drawn in their own colour (Langdon Farms' red barns)
  "waste_sand": true,                   // optional: golf=bunker + sand=waste, and natural=sand inside the boundary, are
                                        // waste sand (surface 18): general area, not a bunker, no lip, sparse scrub tufts;
                                        // natural=sand outside stays ob_sand (s08, s09, s09b, s10; Cypress Point)
  "integral": [{"name": "17th road and wall", "osm": ["w123", "w456"], "buffer_m": 3},
               {"name": "Grannie Clark's Wynd", "lonlat": [[-2.80, 56.34], ...]}],
                                        // optional: integral objects (local rules): a ball on a cart path or building
                                        // inside one plays as it lies, no free relief; the lie reads "road". OSM
                                        // features (lines buffered by buffer_m, default 0.5) and/or a ring traced by
                                        // hand, clipped to the boundary (s10 -> course.json "integral"; Old Course)
  // more optional keys (read the code's comment before using one):
  "tee_grow_m": 0,                      // tee boxes drawn larger than mapped, metres per side (s02)
  "flatten_wetlands": true,             // false: vegetated wetlands keep their lidar ground (s04)
  "gorse": {"ground": "gorse"},         // gorse thickets from the orthophoto, penal surface 17 (pipeline/gorse.py; Bandon Dunes)
  "gorse": {"extra_areas": "edited/thicket.geojson"},  // also bushes in these WGS84 areas whatever the photo shows (Silvies); no "ground" = bushes only, no penal lie
  "garden": {},                         // flowering shrubs of a garden beside the course (pipeline/garden.py; Eastmoreland)
  "keep_trees_areas": "keep.geojson",   // WGS84 areas whose lidar trees stay even on fairways (s05; Cypress Point 17)
  "not_trees_areas": "not.geojson",     // WGS84 areas whose lidar "trees" are structures or vehicles (s05; Chambers Bay)
  "trees_need_ortho": {"v_max": 120, "min_share": 0.1},  // drop lidar crowns the photo no longer shows (s05, gorse.py)
  "tree_types_osm": true,               // OSM natural=tree leaf_type sets a lidar tree's type (s05; Chambers Bay)
  "tree_fallback": {"spacing_m": 6, "height_m": [6, 14], "conifer_share": 0.5},  // no canopy data: trees from OSM woods (s05)
  "roof_last_share": 0.85,              // class-1 lidar: crowns whose returns are mostly last returns are roofs (s05; Wannamoisett)
  "rock_water_osm": ["w1"],             // penalty areas over rock: drawn as rock, no OB stakes (s09; Cypress Point)
  "fescue_areas": "fescue.geojson",     // areas of the rough drawn as native fescue (art only; s09)
  "rough_band_m": 6,                    // a band of mown rough this wide along fairways (art only; s09)
  "beach_max_m": 3, "cliff_sand_slope_pct": 40  // outside sand: beach below this height, cliff above this slope (s08)
}
```

### 3.5 Several courses on one site (`layouts`)

When one property holds several courses (East Potomac: Blue 18, White 9, Red
9), list them as `layouts` in one data folder. The world (terrain, surface,
heights, trees, every green, art) is built once and exported to
`courses/<data id>/`; each layout gets its holes, putting views, minimaps and
`course.json` in `courses/<layout id>/`, pointing at the shared files with
`../<data id>/` paths. A layout's holes are the `golf=hole` lines inside its
`boundary_osm` polygon (a hole line tagged `layout=<id>` overrides that, for a
layout that has a `boundary_osm`); its card is its own
`scorecard` file. The OB line is the union of all `leisure=golf_course`
polygons. Each layout is a separate entry in the course list, with `group`,
`groupName` and `layout` fields.

### 3.5a Courses of other sizes, and clubs of three nines

The game plays a course of **any number of holes** (2026-10-20, branch
`design/hole-counts` until merged): 9 (9, or 18 twice around), 18 (18, front,
back), and any other size, such as a 19-hole or a
13-hole par-3 course (all of its holes). Nothing to configure: the hole count
comes from `scorecard.csv`, numbered 1..N with the `golf=hole` refs to match.

A **club of three or more nines** (27 holes played as Red/White, White/Blue,
Blue/Red, or one nine) is one data folder and one course, its holes numbered
1..27 in OSM refs and `scorecard.csv`, with the nines named in
`course_config.json`:

```jsonc
"nines": [
  {"id": "red",   "name": "Red",   "holes": [1, 9]},     // a first-last range,
  {"id": "white", "name": "White", "holes": [10, 18]},   // or a list of hole numbers
  {"id": "blue",  "name": "Blue",  "holes": [19, 27]}
]
```

Ids: lower-case letters, digits and `_`. Every hole in exactly one nine
(s10 stops otherwise). The game offers each nine with the next one (a+b, b+c,
c+a) and each nine alone, shows holes as "red 3", and the daily round can pick
one of the nines. If the club's card numbers each nine 1-9, write them 1-27 in
the data in nine order and note it in your course file. A layout (3.5) can
carry its own `"nines"` the same way.

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
`desk_to_proposed.py`, then add `proposed/approved.geojson` in `edits.json` (Waverley, where OSM maps no holes: `desk_export.py --traced` starts the desk from `proposed/traced.geojson`, and `desk_to_proposed.py --traced-fallback` keeps the traces of a hole the developer has not saved, tagged `approved=pending`)
(Indian Island). Large state-wide rasters: `clip_raster.py` cuts them to the
world before they go into `raw/`.

### 3.4 Changing the pipeline, and pins

Every finished course has `data/<id>/pipeline_pin.json`: the git trees of
`pipeline/` and `assets-src/` that built its committed files. `make course` builds
a pinned course with that pipeline, unpacked from git into `.pins/`, so **a change
to the shared code changes no finished course** and needs no regression check of
the others. `make pins` lists what each course is pinned to.

So a course chat may change pipeline code its course needs, including existing
behaviour. Still:
- prefer a config key for something only your course wants (3.3; document it
  there and in your course file);
- keep the change small and say in the pull request what it changes;
- a course being built on another branch picks the change up when it merges
  `main`: if it changes a default, say so in the pull request.

Before handing off, pin your course (`python3 pipeline/pins.py pin <id>`, after the
last commit to `pipeline/` or `assets-src/`). `python3 pipeline/regress.py --since
origin/main --mine <id>` rebuilds the courses your branch can reach (your own and any
other unpinned one) from scratch and compares them with the committed files.

**Updating a finished course** to the current pipeline is a choice made for that
course (a bug fix it should have): `python3 pipeline/pins.py unpin <id>`, `make course
NAME=<id> ARGS=--fresh`, look at every changed file, commit, pin again.

---

## 4. Phase 1 — intake

### 4.1 Standing defaults

The developer's usual answers. Use them **without asking**, list them in the
intake message (4.2), and change one only when the developer says so.

| Question | Default |
|---|---|
| Tee sets | the longest set (the tips), and it is the default: `"default_tee"` is the longest set built (developer, 2026-10-31; `courses.test.ts` checks it). Other sets go in `scorecard.csv`; build them only when asked |
| Penalty areas | every one red (ponds, creeks, lakes, rivers beside the course) |
| Out of bounds | the OSM course boundary. Roads inside it are cart paths (free relief). The driving range is out of bounds |
| Pins | none needed: the game sets up to four per green (`pins.ts`); the course needs a green and its centre |
| Trees | from lidar. A tree that stands in a fairway, or that a perfect drive down the fairway centre would hit, is removed and listed in the report, not asked about (set `"trees_off_fairways_m": 2` for s05; s06b clears tee shots on its own) |
| Wind (`wind_mph`) | by region: inland Pacific Northwest 1-7 mph; inland New England and New York 1-9; tidal rivers (DC) 2-10; bays and Long Island 2-12; open coast 3-14 |
| Theme | the region's existing theme (`pnw` for Oregon, `bayside` for New England and Long Island, `anacostia`/`potomac` for DC). A new theme only when the trees or colours clearly differ (7.6) |
| Course card hole | your pick, with a reason in `assets-src/cards/<id>.json`; the developer can change it later |
| Logo | the developer may already have one (section 12); otherwise ask what it should show, in the intake message |
| Holes over 3 % off the card | flags (3-8 %) are listed with a suggested fix; over 8 % stops and asks (section 10) |
| Tracing | when OSM lacks greens, tees or hole lines, the tracing desk with your proposals drawn in (`docs/COURSE_TRACING.md`) |

### 4.2 The intake message (one message)

Send the developer one message with:

1. the course as you found it: name, town, OSM coverage if you could check it;
2. what the fetch workflow (5.0) brought, and the **data request** (section 5)
   for only what it couldn't: exact files and download steps;
3. the defaults from 4.1 you will use, as a short list they can correct;
4. only the questions that are genuinely open (a scorecard you can't find, a
   water hazard you can't place, two sources that disagree), each with a
   recommendation.

Then start on whatever doesn't wait for the answer.

### 4.3 Work out

- **Course id:** snake_case, short (`oswego_lake`).
- **UTM zone:** `zone = floor((lon + 180) / 6) + 1`; northern hemisphere
  EPSG = 32600 + zone. Central Maryland is zone 18 (EPSG:32618); western
  Maryland (west of 78° W) is zone 17 (EPSG:32617). Use the zone of the
  course's centre even if the course is near a zone edge.
- **Theme:** the region's existing theme (4.1), or a new one (section 7.6) if
  the trees and colours differ clearly.
- **Bounding box for downloads:** course boundary + 150 m for OSM, + 50 m for
  rasters (the world extent in 6.1 adds more; download enough to cover it:
  boundary + 200 m is safe).

---

## 5. Phase 2 — data acquisition

### 5.0 GitHub Actions first (developer, 2026-10-29)

The sandbox can't reach Overpass, USGS or most data sites, and its proxy blocks
the GitHub Actions API, but a push starts a workflow and a release can be read.
`.github/workflows/fetch-data.yml` runs `pipeline/remote_fetch.py` on a GitHub
runner (open internet) whenever a branch other than `main` changes a
`data/<id>/fetch.json`; it downloads each item and attaches it to the release
`data-<id>` (made if missing), with `fetch-log-<id>.json` saying what came. **Use
it before asking the developer for anything it can fetch.**

```
python3 pipeline/remote_fetch.py new <id> --box S W N E --osm --dem --lidar --list
git add data/<id>/fetch.json && git commit -m "<id>: fetch request" && git push
python3 pipeline/remote_fetch.py wait <id>        # prints the log; exit 0 = all came
python3 pipeline/remote_fetch.py pull <id>        # -> data/<id>/incoming/ (not in git)
```

- **Box:** latitude/longitude, south west north east: the course boundary + 200 m
  (4.3). Without a boundary yet, a box round the course from its address is fine
  for the first Overpass export; tighten it afterwards.
- **What it fetches:** `osm_box` (the standard Overpass export, 5.1, converted as
  Overpass Turbo converts it), `overpass` (any query), `url` (any direct public
  link: a state lidar tile, a NAIP tile, a DOGAMI file), `tnm` (USGS 3DEP 1 m DEM,
  1/3" DEM, lidar LAZ). The request format is at the top of
  `pipeline/remote_fetch.py`.
- **3DEP in two pushes:** first with `--list` (each product's title, size and date
  in the log, nothing downloaded); then pick one project (the newest that covers
  the course; DEM and lidar from the same project), set `"only": "<project>"`, take
  out `"list"`, push again. Tiles from neighbouring projects whose footprints touch
  the box are listed too: don't download them all.
- **Reruns are cheap:** an item already in the release is skipped unless it has
  `"force": true`, so push the request again after any change.
- **Speed:** Overpass takes a minute; a 300 MB DEM tile about five; USGS lidar
  comes at about 15 MB a minute. `wait --minutes 120` for big lidar.
- **Not for it:** anything behind a sign-in, a NOAA Data Access Viewer order
  (emailed), Google or Bing screenshots, photos of a printed scorecard, a page
  that forbids automated download. Those go to the developer (below).
- **When it fails:** the log says which item and why (the sandbox can't read the
  job's own output). An Overpass "no elements" is a wrong box (south, west, north,
  east). If the job never writes a log, tell the developer: the run is under the
  repository's Actions tab.

Then write the developer one **data request** for only what the workflow can't get:
exact files, extent (lat/lon box, WGS84), and step-by-step download instructions
they can follow without GIS experience. Put the instructions in
`data/<id>/DATA_REQUEST.md` too.

### 5.1 Layout: OpenStreetMap

The default: `osm_box` in `data/<id>/fetch.json` (5.0), which runs the standard
export in `pipeline/remote_fetch.py` (`OSM_QUERY`: the query below plus scrub,
heath, sand, cliffs, farmland, walls and fences). Then `python3 pipeline/intake.py
osm <id> <export.geojson>` (a `release.json` "run" line) writes
`raw/overpass.geojson` with only the features near the world.

Fallback when the workflow can't run (the developer, by hand): Overpass Turbo
(overpass-turbo.eu), paste this, run, Export → GeoJSON, upload it to the release:

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
Avoid it: GDAL's OSM driver turns closed tee ways into lines.

### 5.2 Elevation

Bare earth (required): USGS 3DEP 1 m DEM tiles, through the fetch workflow
(`tnm` "dem1m", 5.0), or a better state product (a `url` item when it has direct
links; the developer when it doesn't) (Maryland: the state's lidar/elevation
portal; Oregon: DOGAMI). Record product name, date, resolution, CRS and
vertical units.

Canopy (strongly preferred, it places the trees): one of
- a canopy height model raster (some states publish one; DOGAMI does);
- a first-return / highest-hit DSM raster (then CHM = DSM − DTM);
- the lidar point cloud (LAZ) for the extent, from the same 3DEP project
  (`tnm` "lpc", 5.0; then `intake.py laz` clips it).

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

`make intake NAME=<id>` (`pipeline/intake.py check`) prints errors, warnings and
facts: every raw input present and covering the world, its CRS, units and kind
(elevation, canopy height, a picture), nodata and flattened water; lidar CRS,
vertical units against `laz.units`, classes (no vegetation classes = roofs and wires
will read as trees), flight dates, tiles with their own scale/offset; the OSM
export's course polygons and size; the same file uploaded twice; the scorecard
(holes 1..N, pars, stroke indexes, yardages for the par, totals against
`tee_sets[].total_yd`). Fix the errors; report the rest in one message.

### 5.6 Large files: the release and `make fetch`

Files over about 50 MB (lidar zips, state-wide rasters) don't go in git. They go
in a GitHub release of the repository: the fetch workflow (5.0) puts its downloads
in `data-<id>`, and the developer uploads the rest (the sandbox itself can't upload
release assets). `data/<id>/release.json` says what each one is and where it goes,
so anyone can rebuild the course with one command:

```jsonc
{
  "release": "data-<id>",                  // the release tag
  "files": [
    { "asset": "lidar.zip",                // the asset's name in the release
      "sha256": "…",                       // of the asset as downloaded
      "extract": ["tile.laz"],             // members to take out of a zip (omit for a plain file)
      "to": "raw/laz/",                    // where the file or the extracted members go
      // or instead of extract/to: "run": "python3 pipeline/intake.py laz <id> {file}" (or osm, ortho, raster: 5.7)
      "outputs": {"raw/laz/tile.laz": "…"} }  // path → sha256 of what ends up in raw/
  ]
}
```

`make fetch NAME=<id>` (also run by `make course`) skips every entry whose
outputs are already there with the right hash, downloads the rest through
`gh api` (resuming a cut download), checks the hash, then extracts, moves or
runs. Copy a finished course's file (`data/franklin/release.json`,
`data/indian_island/release.json`) and fill in yours; run `make fetch` from a
clean `raw/` once to prove it works. Clip big lidar to the world box once, at
intake, and put the clip in the release when you can (it makes every later
build faster). The release must be published, not a draft (a draft is invisible
to `make fetch`).

### 5.7 `pipeline/intake.py`: the downloads into `raw/`

Use these in `release.json` "run" lines instead of a script per course:

```
python3 pipeline/intake.py osm <id> {file} [MORE.geojson ...]      # -> raw/overpass.geojson
python3 pipeline/intake.py ortho <id> {file} X0 Y0 X1 Y1 [IMG X0 Y0 X1 Y1 ...] [--out raw/ortho.tif]
python3 pipeline/intake.py laz <id> {file} [--classes 3,4,5] [--out raw/laz/<id>_clip.laz]
python3 pipeline/intake.py raster <id> {file} --out raw/USGS_1M_<id>.tif
```

`ortho` places JPEG/PNG exports by their request boxes (course EPSG unless
`--epsg`), several tiles mosaicked, cut to the world + 100 m. `laz` clips tiles or a
NOAA zip in the files' own CRS (NOAA ignores the requested projection; s00
reprojects), re-quantises tiles with other offsets and keeps the source's creation
date, so the clip's hash is the same on any day. Before `world` is set, pass
`--box X0 Y0 X1 Y1` (the scouting folder's `box.json`). A course that needs
something these don't do keeps a small script in `data/<id>/` (several exist:
`fill_sea.py`, `split_double_greens.py`, `make_beach.py`; look before writing one).

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
python3 build.py <id> --to s03_audit   # s00 to s03 (each only if its inputs changed)
```

Read `build/audit.md` in full. For each hole you need: a `golf=hole` line with
`ref` and `par`, a tee polygon for every playable tee set near the line's
start, a fairway (par 4/5), a green at the line's end, a `golf=pin` on that
green, and the hazards you'd expect from the scorecard and imagery.

Common problems and what to do:

| Problem | Action |
|---|---|
| No pin on a green | Open item. Proposal: green centroid, marked as a proposal; the developer approves. |

The course's `pin` is the centre pin. The game adds up to three more hole locations on every green by itself (`game/src/systems/game/pins.ts`: 10 ft from every edge, no steeper than 3 % around the cup, 15 ft apart) and gives each round a mixed pin sheet, so a course needs nothing more than its centre pins. A green too small or steep for that keeps fewer locations; the unit test `pins.test.ts` requires at least three on every green, so check it when a course lands.
| Hole line ends off the green | Check `ref` numbering and whether it ends on a practice green. Ask. |
| Hole line starts on another hole's tee (Oswego 7/11) | The tee-set assignment in s06 handles it if the right box exists; report it. |
| Tee set missing (no box within 8 % of the card) | Open item: the developer traces the box in QGIS, or accepts the line start as the tee. |
| Missing bunker/fairway/water visible on imagery | Proposed geometry from NAIP/lidar in `proposed/`, or the developer traces it. Never silently added. |
| Water polygon untagged red/yellow | `golf=water_hazard` exports yellow, `lateral_water_hazard` red, unless a `penalty` tag says otherwise; the standing default is red (4.1): tag them. |
| Practice greens | Become wrong greens (relief required); list them. |

Edits go in `data/<id>/edits.json` (3.6), never in `edited/course.geojson` by
hand: `merge_edits.py` writes `edited/` from OSM + `edits.json` at every build.
Tags you can add: `penalty=red|yellow`, `ob=yes`, `tee_set=<name>` (`"Blue;White"`
for a box shared by two sets), `hole=<n>`, `layout=<id>`. `tags` in `edits.json`
doesn't change a feature's kind: copy it with the new kind and drop the original.

---

## 7. Phase 4 — terrain, trees, holes, greens, art

Run the steps with `make course NAME=<id>` (or `python3 pipeline/build.py <id>
--to <step>` / `--from <step>` / `--only <step>`), read each step's output, then go
on; don't look only at the end. A step whose inputs (files, config keys, code)
haven't changed since it last ran is skipped; `--fresh` runs every step.

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

**Where the virtual tee goes** (design chat, 2026-10-20, after the
developer found tees at the edge of their boxes):

- **Default:** the point deepest inside the tee box (pole of
  inaccessibility). The box centroid can lie outside an L-shaped or curved
  box, so it is not used.
- **A move to match the card** stays on the box's centre ridge: points at
  least 85 % as deep as the deepest point across the box. It also stays at
  least 2.5 m, or half the box's inscribed radius, from the edge (at
  most 70 % of that radius on a narrow box).

So a tee on the box edge in a screenshot is a pipeline bug, not a data
problem. The tee assignment between boxes still uses the centroids.
`s08_surface.py` rounds fairway corners (σ = 4 m along the outline;
`FAIRWAY_SMOOTH_M` in `common.py`) except within 2 m of a green.

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
- Tree sprites for the theme: painters in your own `assets-src/trees_<theme>.py`
  (copy `trees_bayside.py` or `trees_seekonk.py`), named in the palette:
  `"trees": {"conifer": "trees_<theme>:pine", "deciduous": "trees_<theme>:oak"}`.
  The game loads `sprites/trees_<theme>.png` for any course of that theme.
- A theme's own low bushes (gorse, heather, beach rose): add
  `"shrub": "trees_<theme>:gorse"` to the same `"trees"` entry. The painter is
  `gorse(W, H, variant)` returning an RGBA array W+2 wide (see `shrubs.py`
  `shrub()` for the shape and size rules); variants 0-7 are yours to use (a
  bush's index in trees.json % 8 picks one). Bushes are trees.json `c: 3`
  (deciduous for physics). s10 then writes `"shrubs": "shrubs_<theme>"` into
  course.json and the game draws c: 3 from that sheet; s09b uses the same
  painter in the putting views. Courses of other themes keep the flowering
  shrubs.
- Build only your theme's sheets: `python3 assets-src/build_assets.py --theme <theme>`
  (writes `trees_<theme>*` and `shrubs_<theme>*`; nothing shared is rewritten).
  Never run the full `make assets` from a course chat.
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

The course must appear on the course list and be selectable. The list is
generated from `course.json` at every build (`make lists` makes it on its own);
never edit `index.json`.

### 8.2 Unit tests for the course

`game/tests/unit/course_play.test.ts` runs the every-course checks on every course
in the list: heights decode; every tee on its box and pin on its green; yardages
within 8 % of the card; penalty areas red; a perfect tee shot at the middle of the
fairway clears the trees by the tee; the default aim keeps it out of the trees, the
water and OB; no tree implausibly tall; a robot round completes; wind in the
course's band; putting views cover every pin; same seed, same round. Run it for
your course: `cd game && npx vitest run tests/unit/course_play.test.ts -t <id>`.

What is special about your course goes in `data/<id>/checks.json` (all keys
optional; the schema is at the top of `course_play.test.ts`):

```jsonc
{
  "note": "per-course settings for course_play.test.ts",
  "yardage": {"max": {"17": 0.12}, "why": "17 from the developer's back tee"},  // over 8 %, accepted
  "wind_mph": [3, 14],
  "water": {"count": 3, "ids": ["channel_w1"]},       // "penalty": "any" if not all red
  "tees": {"sets": ["Blue"], "holes": {"3": ["tee", "rough"]}},
  "tee_shot_clear": {"sets": ["Blue", "White"], "skip": [10]},
  "default_aim": {"skip": [3]},
  "centre_line_clear": {},  "inside_boundary": true,  "fairway_meets_green": true,  // opt-ins
  "points": [{"x": 860, "y": 700, "surface": "water", "inside": true, "why": "the lake between the parts"}],
  "trees": [{"x": 585.5, "y": 1269.5, "r": 2, "absent": true, "why": "developer, 2026-10-20"}],
  "courses": {"<layout id>": { }}                      // per layout, on a site with layouts
}
```

Write the developer's complaints as `points` and `trees` entries and confirm each
fails on the old data. A `game/tests/unit/<id>.test.ts` only for a check this can't
say (a green's tier height, a relief procedure); the game's own tests, `pins.test.ts`
and `courses.test.ts`, cover every course already.

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
2. `docs/courses/<id>.md`, from `docs/courses/TEMPLATE.md`: the course's
   facts, scorecard table with source and date, ratings, default tee, the
   developer's calls, known open items, any new config key or theme, and
   your lessons (what cost time and what to do instead). This replaces the
   old `CLAUDE.md` section 11, `DECISIONS.md` and `COURSE_LESSONS.md` edits;
   the design chat folds it into those after the merge.
3. Pin (3.4), rebuild with `ARGS=--fresh` and see `git status` unchanged; `npm
   test` (only `player.test.ts`'s daily-rotation line may fail: the merge adds it)
   and `npm run e2e` pass.
4. Hand off: branch + pull request (or the zip described in 0.1). The
   message to the developer has: what was built, open items needing their
   decision (numbered, each with a recommendation), anything requested from
   the design chat, and how to try it.
5. A course already live whose par changes (a corrected card): say so in the PR.
   The design chat adds a line per hole to `CARD_FIXES` in
   `game/src/save/cardFixes.ts`, which rewrites the rounds and eagles already
   stored, on the server and on each device, once (gross stays).

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
- [ ] `make fetch NAME=<id>` puts every file that isn't in git into `raw/`
      (5.6).
- [ ] `data/<id>/pipeline_pin.json` written after the last pipeline commit, and a
      `--fresh` build leaves `git status` clean (3.4).
- [ ] `make intake NAME=<id>` has no errors (5.5).
- [ ] `course_play.test.ts -t <id>` passes, with `data/<id>/checks.json` for what is
      special about the course (8.2).
- [ ] Every hole: pass, or flag/fail explicitly accepted by the developer.
- [ ] Every playable tee set has a tee position on every hole.
- [ ] Every green has a pin and far, near and close-up putting views.
- [ ] Trees placed from lidar (or the documented fallback), preview inspected.
- [ ] Every water hazard has a confirmed penalty colour.
- [ ] Attribution complete in `course.json` and shown in the credits.
- [ ] Unit tests (but the daily-rotation line) and the Playwright smoke test pass.
- [ ] Every hole was looked at in the game (8.3), and the screenshots were
      checked, not just taken.
- [ ] `validation_report.md`, `docs/courses/<id>.md` and
      `assets-src/cards/<id>.json` written; no shared file edited (section 0).
- [ ] Open items listed for the developer with recommendations.

---

## 12. Course-select card, logo and state

- **Course id:** if the design chat already drew a logo for the course, use
  its id: `highland_links`, `langdon`, `east_potomac`, `langston`,
  `stone_creek`, `waverley`, `eastmoreland`, `willamette_valley`,
  `indian_island`, `gearhart` (a shipwreck), `tualatin`,
  `chambers_bay` (the concrete ruins) (`assets-src/logos.py`).
- **Logo:** otherwise draw it yourself (developer, 2026-10-20): ask what it
  should show in the intake message, then write
  `assets-src/course_logos/<id>.py` (`assets-src/course_logos/README.md` has
  the template) and run `python3 assets-src/logos.py <id>`. Show the developer
  the logo at 1x and enlarged before the card. An original drawing only: never
  the club's own logo, crest or trademark (CLAUDE.md 14).
- **State:** add `"state": "<postal code>"` to `course_config.json`; s10
  copies it into `course.json`, and the course list is made from that.
- **Card:** after the export, run `python3 assets-src/course_cards.py <id> --sheet`,
  look at the contact sheet of every green
  (`game/public/sprites/cards/_<id>_greens.png`, delete it afterwards), pick
  the most striking one (4.1: your pick, with a reason), write
  `assets-src/cards/<id>.json` (`{"hole": 9, "why": "…"}`; one file per course
  in a multi-course site, named by the course id), then run
  `python3 assets-src/course_cards.py <id>`. That also writes the course's view
  for the title screen's rotation (`game/public/sprites/title/<id>.png`):
  commit the card and the view. The title screen's list is generated.
