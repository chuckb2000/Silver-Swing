# Building a course without good OSM data

A guide for the course-building chat, for when OpenStreetMap maps only part
of a course or none of it. Read it after `docs/COURSE_BUILD.md` (the
procedure) and `docs/COURSE_LESSONS.md`. It is the method used for Indian
Island (2026-10-19): OSM had 8 of 18 holes. The other 10 were traced by
Claude and corrected by the developer in the desk without QGIS: about 35
minutes for the shapes, and 15 more to mark all 18 Blue tees.

The idea: **Claude traces a first pass from open imagery and lidar, and the
developer corrects it in a web page** (the tracing desk). The developer knows
the course, so they check the shapes and place what no data shows, mostly
back tees. Nothing goes into the build until the developer has saved it in
the desk (COURSE_BUILD.md 1.1).

---

## 1. Decide early (Phase 1)

Run the OSM coverage audit as soon as the Overpass export arrives (s01-s03,
or a quick count of `golf=hole`, `green`, `tee` and `fairway` per hole).
If whole holes are missing, tell the developer at once and plan for tracing.
It changes the data request.

What OSM still gives you, even when the golf features are thin:
- the `leisure=golf_course` boundary (check that it covers every hole);
- roads, buildings, water and woods for the scenery;
- the holes it does map. These are the training data for the fairway
  classifier (section 4), so a half-mapped course is easier than an unmapped one.

With no `golf=*` features at all, the classifier has nothing to learn from:
ask the developer to trace two or three fairways in the desk first, or
tune the fairway threshold by eye.

## 2. The data request

Ask for these in the one data request (COURSE_BUILD.md 5), all into the
course's GitHub release `data-<id>`:

| Data | Why | Where it came from for Indian Island |
|---|---|---|
| **Orthoimagery**, 0.3-0.6 m, open licence, georeferenced | the tracing base | NYS statewide orthoimagery, exported by the developer from the state's ArcGIS `MapServer/export` with an exact bbox in the URL, so the PNG's corners are known (no control points needed) |
| **Bare-earth DEM**, 1 m | greens and tees are raised pads; water is hydro-flattened | NYS `DEM_2024_Long_Island` `ImageServer/exportImage`, one URL |
| **Lidar point cloud** | trees, and leaf-off conifer/deciduous | NYS 2024 lidar tiles; the index's `DIRECT_DL` field gives each tile's URL |
| **Official scorecard**, all tee sets | yardages for every tee set, not just the one built | county PDF |
| The developer's **screenshots** (Google, Bing, a routing map) | to identify holes | look at them first; trace from them only when the open imagery can't show a feature (CLAUDE.md 5.1 note, `source=google`) |

Tips:
- Put the URLs in `DATA_REQUEST.md` with the bbox already filled in, in the
  service's native CRS. The sandbox usually can't reach state servers.
- State portals often split imagery requests at 4,096 px: ask for two or
  more halves with adjoining bboxes.
- Big LAS files fail in the browser's release upload although GitHub allows
  2 GB. Ask for one zip, or LAZ.
- A state lidar project may have no vegetation class. Use class 1
  (unclassified) in `laz.classes`; s05 drops trees on OSM buildings. The
  points' GPS times give the flight date: spring = leaf-off, and `leaf_off: true`.

## 3. Georeference and check alignment

1. Mosaic the image halves, set the transform from the request's bbox,
   reproject to the world grid (course EPSG, local origin) and save as a
   JPEG-compressed GeoTIFF in `raw/` (Indian Island: `raw/nys_ortho_032m.tif`,
   5.5 MB at 0.32 m for 1.8 x 1.0 km). Record the SHA-256 of the originals.
2. **Check alignment** before tracing: draw the mapped OSM bunkers and greens
   on a crop of the image. They should sit on the imaged features within
   1-2 m.
3. Build a relief hillshade of the DEM (height above a ~41 m median, coloured)
   at the same grid. Look at the image and the hillshade **side by side**
   (an aligned pair of crops with a metre grid) for every area you trace.
   Greens are raised mounds and tees are rectangular pads, often clearer in
   the hillshade than on the photo, especially on winter imagery.

## 4. Identify the holes, then write `trace_spec.json`

Work out which green and tee belong to which hole from the scorecard's map,
the card yardages and the developer's screenshots. A routing map's flags are
not to scale; use it for order, never for positions.

`data/<id>/trace_spec.json` holds every choice you make by eye, so the trace
is rebuildable (local metres, world origin):

```jsonc
{
  "ortho": "raw/<image>.tif",
  "greens": {"9": {"seed": [x, y], "t": 3.6}},          // a point on the green; t = texture threshold
  "tees": [{"hole": "9", "seed": [x, y]}],               // one per pad; several per hole is fine
  "holes": {"9": {"par": 4, "handicap": 7, "tee": [x, y], "bends": [[x, y]]}},
  "fairways": {"holes": ["9", "10"], "corridor_m": 40, "prob": 0.5, "min_area_m2": 250},
  "bunkers": {"near_m": 45, "min_area_m2": 12, "max_area_m2": 700, "min_z_m": 1.0,
              "min_brightness": 190, "min_compactness": 0.35},
  "water": {"max_z_m": 0.8, "flat_m": 0.004, "min_area_m2": 1500, "edge_z_m": 0.47,
            "hazard_strip_m": 100, "pond_seed": [x, y], "pond_max_z_m": 0.35, "pond_radius_m": 90,
            "pond_parts": [{"penalty": "red", "why": "..."}], "boundary_close_m": 15}
}
```

Then run (after s00-s02):

```
python3 pipeline/propose_trace.py <id>       # -> proposed/traced.geojson + traced_overview.png + traced_holeNN.png
python3 pipeline/propose_tees.py <id>        # raised pads vs every tee set on the card -> proposed/tees_lidar.*
```

What each part does, and how to tune it:

| Feature | Method | Tuning |
|---|---|---|
| Greens | the seed's patch of smooth mown turf (low local brightness std), then given a green's shape: smooth, mostly convex, same area | Calibrate `t` on the OSM greens first (Indian Island: 3.6 gave IoU 0.8-0.9). Try a few seeds 4 m apart and keep the most compact result. Winter imagery has blotchy greens: raise `t` to 4.5-5.0. |
| Fairways | gradient-boosted classifier on photo colour + texture, trained on this course's OSM fairways vs the rest of its mapped holes; pixels above `prob` within `corridor_m` of each hole line | Holdout accuracy should be ~0.95. Expect ragged edges and gaps: the developer fixes them in the desk. |
| Bunkers | bright, unsaturated sand near a traced hole, inside the boundary, above `min_z_m`, compact | Concrete pads and plant tanks pass as sand; `min_compactness` and keeping to the boundary removed most. The developer deletes the rest. |
| Tee pads | raised levelled pads in the DEM, drawn as rotated rectangles | Back tees on grade show nowhere: the developer marks them (section 6). |
| Hole lines | tee pad -> `bends` -> green centroid | Put each bend at the **centre of the fairway where it lies farthest from the tee-green chord**, on holes that bend more than ~30 m off it. A bend picked by eye cut 3-5 % off three holes. |
| Water | hydro-flattened DEM cells (5 x 5 range < `flat_m`, below `max_z_m`), plus low cells joining them; a pond from `pond_seed` within `pond_radius_m` (it may open to the bay) | Water touching the course becomes a penalty area out to `hazard_strip_m`, and the boundary is grown to include it. Ask the developer the colour of each one, and whether any yellow should exist at all. |

**Look at every hole's preview before showing anything.** Fix seeds and
parameters, re-run, and only then publish the desk.

## 5. The tracing desk

`pipeline/desk/index.html` is a claude.ai page. The developer sees each hole
on the photo with the traced outlines, drags points (or redraws, adds,
deletes shapes) and saves the hole. It has:
- holes as chips, with a dot for saved/unsaved and a bar for the Blue tee's yardage status;
- editable shapes (green, fairway, bunker, tee box, Blue tee) and dashed
  reference outlines (other holes, OSM shapes, lidar pads), the boundary in
  orange, the line of play;
- a **live yardage readout**: Blue/White card, the marked Blue tee's measured
  yardage (pipeline s06's method: tee centre, bends ahead, green centre)
  with a pass/flag/fail pill, and the back-of-box yardage;
- a note box per hole.

To publish it:

```
python3 pipeline/desk_export.py <id> /tmp/desk --edit 9-18    # holes whose shapes are editable
cp pipeline/desk/index.html /tmp/desk/                          # change its <title> to the course
```

Publish `/tmp/desk/index.html` with the Artifact tool, with `holes.json`
and `img/holeNN.jpg` as files and `capabilities: {"db": {}, "user": {}}`.
Each save writes the database document `holes/<n>`. To publish to the same
URL again, use the same file path in the same session; from a new session,
pass the artifact's URL.

Tell the developer how to use it in four lines: pick a hole; drag points;
use **Mark Blue tee**; **Save hole**.

## 6. Tees: let the developer place them

At Indian Island the traced tees measured like the **White** card (6,049 yd
vs White 6,077) while seven holes failed Blue by more than 8 %. On flat
ground the back tees are often at grade, invisible to lidar and indistinct on
the photo. Before tracing more, compare the traced lengths with **every tee
set on the card** (keep all of them in `scorecard.csv`; list the unbuilt sets
in `tee_sets` with `"playable": false`). If they match another set, show the
developer and ask which tees to build. If they want the longer set, give them the
desk's Blue-tee readout and let them mark every hole; they got all 18 within
5 % in one pass.

## 7. Read back and build

```
# read every saved hole (ArtifactData list of collection "holes", out_dir=<tmp>)
# then copy each to data/<id>/desk/hole<NN>.json (drop the "by" field)
python3 pipeline/desk_to_proposed.py <id>     # -> proposed/approved.geojson
```

`desk_to_proposed.py` writes every desk shape (`bluetee` becomes `golf=tee`
+ `hole` + `tee_set=Blue`, which s06 always uses for that hole), a pin per
new green unless OSM has one on it, rebuilt hole lines (back tee -> spec bends ->
green centroid) and the traced water, penalty areas and grown boundary.
Then:

- `edits.json`: one `add` of every id in `proposed/approved.geojson`, and a
  `drop` of the OSM boundary when the grown one replaces it. Refresh the id
  list whenever the approved file is rebuilt.
- `make course NAME=<id>` (or s01 onwards). Read `build/validation_table.md`.
- Keep the developer's saves in the repo (`data/<id>/desk/`): they are the
  source; the page is only the editor.

## 8. Checks specific to traced courses

- **Before publishing the desk:** every green and fairway looks smooth (no
  jagged outlines: the developer noticed at once), bunkers sit on sand, each
  hole has one green and its line ends on it.
- **After reading back:** no invalid polygons (`merge_edits.py` warns), one
  Blue tee per hole, `s03_audit` shows every hole with a tee, fairway, green
  and pin.
- **Roads inside the boundary:** decide which are out of bounds (config
  `ob_highways`) and which give free relief.
- **The course's own test file** (`game/tests/unit/<id>.test.ts`): tees on
  tee boxes, pins on greens, yardages, out-of-bounds roads, penalty colours,
  robot rounds. Use real points from the data in tests, not hand-picked
  coordinates.
- **Play every hole in the browser** (COURSE_BUILD.md 8.3) and look at the
  overview: traced courses are where shapes go wrong.
