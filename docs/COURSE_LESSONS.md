# Lessons from building courses

Read this after the quick path at the top of `docs/COURSE_BUILD.md` and before starting a
course. It holds only the lessons that need judgment. The course-by-course history it was made
from (sections 1-33, to 2026-10-24) is in `docs/archive/COURSE_LESSONS_full.md`; search it when
something here isn't enough. Lessons a script can check are now checks, and procedures and
data-source details are in COURSE_BUILD.md and `docs/COURSE_TRACING.md`. Course chats don't edit
this file: they write their lessons in `docs/courses/<id>.md`; the design chat turns the ones a
script can test into checks, and adds the rest here now and then (not at every merge).

The checks that replaced lessons:

- `make intake NAME=<id>` (`pipeline/intake.py check`), when the downloads arrive: files present
  and covering the world, duplicate uploads, raster CRS, units and kind (DTM, canopy, picture),
  nodata and flattened water, lidar CRS, units, classes, flight dates and tiles that differ, the
  course polygons in the OSM export, world size, scorecard holes, pars, stroke indexes and totals.
- `pipeline/s03_audit.py` (`build/audit.md`, "Checks from earlier courses"), after s01-s02:
  boundaries in parts or with holes, greens and tees across the OB line, hole lines outside it,
  features across the world edge, unread `golf=*` tags, tags that don't fit the size, water that
  would play as rough, neighbours' penalty areas, streams near hole lines, double greens.
- `game/tests/unit/course_play.test.ts` with `data/<id>/checks.json`, after the export: tees,
  pins, yardages, penalty colours, points that must be water or in bounds, tee shots and default
  aim, trees (gone, there, too tall), robot rounds, wind, putting views. Also `pins.test.ts`.

---

## 1. Data

- **Use one source per fact and name it.** Use the card's tee names, even when the developer says
  "Blue" (Langston: Royal, White, Gold). Where sources disagree on tee names or ratings, pick one,
  line the columns up by their totals, and list the other as an open item. No rating: store 0.
- **Ask what the lidar buys before waiting for it.** With few trees in play, finish on the OSM tree
  fallback and make the lidar a one-step rebuild later (Chambers Bay). While a slow job runs, build
  without it from a scratch copy of the config; never leave the real config edited.
- **Compare the lidar's date with the course's history** (intake prints the flight date). Lidar
  from before a renovation carries removed trees and old tee pads; then skip `propose_tees.py`.
- **`trees_need_ortho` needs a look.** It drops crowns the photo no longer shows, but reads a long
  shadow as canopy and a sunlit tree-line edge as gone, and never adds young trees. Show its drops
  over the photo before accepting them; plan a manual pass for new planting.

## 2. Layout

- **A tee needs a tee box under it.** Don't stretch a hole line (`extend_start`) onto grass to
  reach the card; find the pad (lidar, a park or club map) and add it as a tee polygon.
- **Lidar finds raised pads only.** Hillside tees are cut, many back tees and par-3-course tees are
  on grade, and on flat wooded courses most raised flat patches are tree bases and mounds; a wide
  search also finds green complexes and road shoulders. Treat pads as hints.
- **Long or shared tee strips.** s06 assigns a box by its centroid. Cut the OSM box where the cards
  fall (Cypress Point), or tag it `hole`/`tee_set`. Where a narrow strip's centre ridge reaches only
  its wide end and overshoots the card, accept the flag; don't place the tee by hand.
- **Placing a missing tee, or one the developer describes:** at the card distance on the feature
  they name (links: where the card distance crosses the line on mown grass). Look at the photo
  and run the tee-shot test before showing it; if it lands in sand or under a tree, say so.
- **No hole lines.** Plot greens with letters and tee boxes with numbers and ask which is which, in
  one message. With every green and tee mapped, the card alone can give the routing: each tee sits
  by the previous green at the card distance; confirm with the course's hole descriptions.
- **Bend points set both the yardage and the default aim.** Take them from the centre line of the
  hole's own fairway (`fairway_axis.centreline`), in the drive's landing zone (~250 yd), not where
  the fairway is farthest from the chord (that aimed Tualatin 11's drive into a tree line).
- **Fairways that stop short of the green.** Rough, sand, a ditch or water often lies between them
  on purpose: keep it as mapped. Connect only where OSM is wrong, per hole, from photos or the
  developer's word; when unsure, ask. Look at every approach `connect_fairways` makes.
- **Don't cut greens, tees or bunkers out of a proposed fairway.** They paint over it anyway, and
  once s08 rounds the corners each cut leaves a ring of rough.
- **Repairing the boundary.** A part that is only the range: copy the boundary without it. A tee or
  green outside: join the hull of the feature and the boundary edge, less a strip along any road.
  A boundary that traces only the mown turf is not an OB line (Bandon Preserve): say so and ask.
- **The driving range.** Ask how it looks on the ground: drawn with fairway stripes it invites play
  (`range_art`). Where OSM maps the targets but not the range, build its edge from mapped geometry
  and check what each feature inside is before cutting it out (a "fairway" was a target's collar).
- **Double greens.** Ask which side each hole plays to; trace the green whole and cut it with a
  line, so each hole's pin spots stay on its side.
- **Water shapes.** A creek in a ravine is a penalty area to the top of its banks, `flatten=no`;
  where an OB road crosses it, water wins (a bridge). OSM's sea is only a coastline: build the sea
  from the coastline ways (sea on the right), add the shore up to the boundary, stop at roads.
- **Tags the pipeline doesn't read** can still be used through a `proposed/` file and `edits.json`:
  `historic=ruins` as buildings, `natural=tree` `leaf_type` for tree types (`tree_types_osm`).

## 3. Trees and theme

- **Check the standing tree defaults against the course.** Before `trees_off_fairways_m`, look for
  signature or protected trees in fairways (Cypress Point 17, Stanford's oaks): keep them with
  `keep_trees_areas`, or drop trees by list instead. Cut the canopy out of traced sand.
- **A blocked tee shot can be the hole.** Read s06b's line and ask about each hole where it drops
  trees; list deliberate ones in `keep_tee_trees`. Where the pipeline passes a tee shot the game
  fails, set `tee_shot_margin_m` rather than dropping trees by hand.
- **The centre-line test is stricter than the standing rule.** It flags real edge trees where OSM
  draws the hole line along the fairway's edge. Look at the photo before removing trees for it.
- **Look at the canopy picture before s05.** Long, straight, thin lines are power lines
  (`remove_wires`); rows of equal-height crowns are a train or a structure (`not_trees_areas`).
- **Class-1-only lidar holds roofs.** Leaf-off, an unmapped roof's crown is all last returns and
  reads as a pine. Plot the per-crown last-return share (a roof mode at 0.85-1), set
  `roof_last_share`, and check that every crown it drops inside the course sits on a building.
- **Tree types.** The crown-shape rule reads wind-sheared coastal pines as deciduous. Check against
  the photo; a theme may draw the broad class as shore pine, stated as a drawing choice.
- **Lidar misses shrubs** under about 4 m and under trees: take thickets from the photo (dark,
  blue-green, textured), and write down any density under trees as flair.
- **Trees in water.** s05 keeps tops in `natural=water` and `red_water_osm` water. Decide per pond
  from the photo (Langston keeps its island trees) and drop the rest by list.
- **Small features are sprites, not paint.** Clumps under ~2 m painted into the terrain read as
  dark dots at 2 px/m and can't stand up in the 3/4 view.
- **Sprite outlines:** pad the mask before `np.roll`, or the bottom row wraps onto the top (a stray
  line above every bush).

## 4. Checking

- **Confirm a new check fails on the old data** before trusting it.
- **Small or undulating greens** fail `pins.test.ts` (too few pin spots): `green_tilt` with
  `bumps: 0`; put a crescent green's pin at its deepest point.
- **Read build arrays the right way up.** `height_base.npy` and the other s04/s05 grids run south
  to north (row 0 = south); `surface.npy` and the exported PNGs run north to south. A hillshade
  drawn the wrong way looks plausible and puts the creek on the wrong side.
- **Never `pkill -f` or `pgrep -f` a pattern.** It matches its own command line and has killed the
  session's shell. Kill by PID.
- **Commands stop at 10 minutes.** Start long runs with `nohup`, an explicit `cd` and a log, then
  poll, or split them by hole. In-game looks take about a minute a hole, several times longer while
  a rebuild runs on the same two CPUs.

## 5. The developer and hand-off

- **Look on `main` before writing a tool or a key.** A boundary join, a sea fill, a double-green
  split and a tree desk already exist (`pipeline/`, `docs/courses/`, scripts in `data/<id>/`).
- **When the developer is away** and said to go on: take the reasonable call, write it down with a
  recommendation, and keep anything over 8 % or hard to undo as a question for their return.
- **Identify a building the developer names** by showing candidates on the photo; don't guess.
