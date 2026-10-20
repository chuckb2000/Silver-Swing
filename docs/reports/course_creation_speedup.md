# Speeding up course creation

Design chat, night of 2026-10-19. No code was changed for this report; it
proposes changes for you to approve.

## Where the time goes now

These figures come from the git history (first commit in `data/<course>` to the
merge into `main`) and from rebuilding every course tonight. The chats themselves
started earlier, with the data request.

| Course | First commit → merged | How the layout was mapped | What took the time |
|---|---|---|---|
| Stone Creek | 0.5 h | complete OSM | almost nothing: the fast case |
| Tualatin | 3.8 h | OSM, no hole lines | hole lines from your routing; river as a penalty area |
| Willamette Valley | 1.8 h | OSM, mislabelled features | relabelling (fairways tagged as tees, paths) |
| Franklin | 2.5 h | complete OSM | 1 GB lidar zip; stream channels; scorecard hunt |
| Eastmoreland | 3.1 h | OSM | garden shrubs (a new sprite request); creek from lidar |
| Oregon GC | 4.7 h | OSM | driving range traced in the desk; power lines in the canopy |
| Langston | 1.0 h | OSM, two parts | joining the boundary across the lake; tees from lidar |
| Indian Island | 3.7 h | half traced | tracing desk round trips over poor imagery |
| Waverley | 6.0 h | traced (no holes in OSM) | tracing, desk corrections, hole 14 by hand |
| Wannamoisett | 5.9 h | OSM | roofs in the lidar read as trees; boundary hole for the pond |

One full rebuild takes 2–4 minutes for a course with a canopy raster and longer
for a lidar point-cloud course (Franklin's lidar is 154 million points).
Rebuilding all 13 data folders takes about 45–60 minutes on this sandbox's two CPUs.

The work falls into six kinds:

1. **Waiting on you.** Every course needs files only you can download (OSM export,
   DOGAMI or USGS rasters, lidar, scorecard) and several decisions (tees, water
   colour, out of bounds, wind, which tree to remove). Each round trip costs
   anywhere from minutes to hours, and it is the largest cost on most courses.
2. **Tracing what OSM lacks.** Courses with complete OSM took 0.5–2.5 hours;
   courses that needed tracing took 4–6 hours.
3. **Pipeline changes and regression rebuilds.** Ten of the twelve course chats
   changed `pipeline/` code. Each change means rebuilding every other course,
   which got slower with each course added. Three chats were stuck earlier today
   waiting on East Potomac regression rebuilds.
4. **Merge conflicts.** Every course edits the same shared files: `index.json`,
   `course_cards.json`, `title/index.json`, `CLAUDE.md` (status line and a
   section 11.x), `DECISIONS.md` and `COURSE_LESSONS.md`. Each merge after the
   first conflicts in all six, and the section numbers clash (two "11.18"s
   tonight).
5. **Re-deciding the same things.** You gave the same answers on most courses:
   every penalty area red, Blue tees only, out of bounds = the course boundary,
   pins at green centres, remove a tree that blocks a fairway-centre drive. Each
   chat still asked.
6. **Full rebuilds for small iterations.** Moving one tee or one tree reruns
   every step, including trees (s05) and all the art (s09, s09b), which are the
   slowest steps.

## Recommendations, in priority order

### 1. Standing defaults instead of questions (saves 1–3 round trips per course; docs only)

Write your usual answers into `docs/COURSE_BUILD.md` section 4 as **defaults
that apply unless you say otherwise**:

- Tee sets: Blue only (or the set closest to 6,300 yd if there is no Blue).
- Every penalty area red. Out of bounds = the course boundary. The driving range
  is out of bounds.
- Pins: the game makes them (pins.ts), so the course only needs a green centre.
- Trees that block a fairway-centre drive, or that stand inside a fairway, are
  removed automatically and listed in the report (no question).
- Wind: from a regional table (inland Pacific NW 1–7 mph, inland New England
  1–9 mph, coast 3–14 mph).
- A new theme only when the trees clearly differ; otherwise the region's theme.
- Course card hole: the chat picks it and you change it later if you want.

The chat then sends **one** intake message: the data request plus the list of
defaults it will use and anything that is genuinely unclear. You answer once.

### 2. Per-course files instead of shared files (removes nearly all merge conflicts; small code change)

Make the shared files generated, not edited:

- `game/public/courses/index.json` → written by a small script from each
  course's `game/public/courses/<id>/course.json` (it already holds name,
  state, theme, holes, par and tees). No course edits the list itself.
- `assets-src/course_cards.json` and `sprites/title/index.json` → read from
  `data/<id>/card.json` (hole and reason), one file per course.
- `CLAUDE.md` section 11.x → move each course's section to
  `docs/courses/<id>.md`. Section 11 becomes a list of links, and section 0 gets
  one line per course, appended in order.
- `DECISIONS.md` and `COURSE_LESSONS.md` → the course chat writes
  `docs/courses/<id>.md` (decisions and lessons). The design chat folds lessons
  into `COURSE_LESSONS.md` after a merge.

Merges then touch only the course's own folders, and merging stops needing a
careful chat.

### 3. Pipeline changes: config keys only, regression in one command (saves 30–60 min per course and stops chats blocking each other)

- **Rule:** a course chat may add a config key with a default that changes
  nothing (as `red_water_osm`, `drop_trees`, `remove_wires` and `roof_last_share`
  already do), but should not change existing behaviour. When an existing behaviour
  must change, the developer takes it to the design chat as a request.
- **`make regress`:** one command that rebuilds every course whose output
  could change, compares SHA-256 hashes against a committed
  `data/<id>/build_hashes.json`, and prints a one-line verdict per course. Run it
  once, before merging.
- **Skip unaffected courses:** a course that doesn't use a changed config key,
  and whose inputs didn't change, can't change. A short script can look at the
  `git diff` of `pipeline/` and the keys each course uses to pick the courses
  to rebuild.
- **Raw data fetched automatically:** `make fetch NAME=<id>` downloads the
  course's release assets through `gh api` into `raw/`, as listed in a
  `data/<id>/release.json` (asset name, SHA-256, where it goes). Tonight that
  took me three manual steps per lidar course.

### 4. Cache the pipeline steps (cuts small iterations from ~4 min to under 1)

Each step writes a small stamp: a hash of its inputs (the files it reads, the
config keys it uses, its own source). `make course` skips a step whose stamp
matches. In practice:

- Changing a tee, a pin or a scorecard reruns s06 to s10 only, not trees.
- Changing a tree removal reruns s05 onwards, not the heightmap.
- A Franklin rebuild after a small edit would stop re-reading 154 million lidar
  points.

Also clip big lidar to the world box once, at intake, and keep the clip in the
release (Indian Island already does this; Franklin's 1 GB zip is not clipped).

### 5. Tracing: make the desk the default for any gap (saves 1–3 hours on traced courses)

The tracing desk (Indian Island, Oregon GC, Waverley) worked well. To make it
faster:

- Open it by default when the audit finds missing greens, tees or hole lines,
  with the chat's proposals already drawn in (`propose_trace.py`, lidar tee pads).
- Tees: with tees now placed in the centre of their boxes (tonight's change),
  you only need to draw the box, not the spot.
- Hole lines: draw tee → bend → green in the desk and have the chat snap the
  ends to the tee and green centres.
- When open imagery is poor (Indian Island), say at intake whether you will
  supply Google or Bing screenshots, so the chat doesn't try the poor imagery first.

### 6. One intake page for you (saves your time more than the chat's)

A small page (an artifact) with: course name, town, links for each download
(already filled in for the course's bounding box), drop zones for the files,
the scorecard photo, and checkboxes for the defaults in recommendation 1. It
uploads to the course's GitHub release, and the chat starts from there. This
turns several messages into one sitting.

### 7. Scorecard from a photo, checked automatically

The chat already reads scorecard images. Add a check to s06 that every tee set
adds up to the printed totals (two cards had typos) and fails loudly if not, so
the chat doesn't hand-check it.

### 8. Tests by course list, not by course file (saves 10–15 min per course)

Each course has its own `tests/unit/<id>.test.ts`, mostly the same checks.
Replace them with one test that walks `index.json` and runs the shared checks on
every course: files load, tees on tee boxes, a fairway-centre drive clears the
trees, every hole playable by the robot. Only real special cases (a two-tier
green, an island) keep their own test. Then a new course needs no new test code.

## What I would do first

1. Recommendation 1 (defaults): an hour of documentation, saves the most waiting.
2. Recommendation 2 (per-course files): about half a day of design-chat work.
   Every merge after that is trivial.
3. Recommendation 3 (`make regress`, `make fetch`): half a day; ends the
   regression waits.
4. Recommendation 4 (step caching): a day; the biggest speed-up for iterating on a course.

Together these should bring a complete-OSM course to under an hour, and a traced
course to 2–3 hours, mostly spent in the desk.
