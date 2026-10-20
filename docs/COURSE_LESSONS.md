# Lessons from building courses

Read this after `docs/COURSE_BUILD.md` (the procedure) and before starting a
new course. Each lesson is something that cost time on an earlier course,
with what to do instead. Add to it at the end of every course build.

Sources so far: East Potomac Golf Links (2026-10-19, three courses on one
island), Langston (2026-10-19, a course in two parts across a lake), Indian
Island (2026-10-19, half the course traced), Tualatin Country Club
(2026-10-19, section 9), Eastmoreland (2026-10-19, Portland) and Oregon Golf
Club (2026-10-19, section 10). Oswego Lake and Highland Links notes live in
DECISIONS.md.

---

## 1. Before you start

- **Check other branches first.** Another course chat may already have done
  the Phase 0 pipeline work (`git ls-remote origin`, then `git log` of each
  `course/*` branch). East Potomac found `course/highland_links` had already
  generalised the pipeline, so it started from that branch instead of redoing it.
  If you build on another course's branch, say so in the PR (merge order).
- **`main` moves while you work.** The design chat merged course cards, logos
  and a PNG-decoding fix during the East Potomac build. Fetch `main` before
  the hand-off, merge it, and run every test again; new screens (the course
  cards) can change what your course needs (a short name, a card).
- **Merging `main` after another course landed.** Building on another
  course's branch means `main` later holds a newer copy of the same pipeline
  files, and nearly every file conflicts. Per file: take `main`'s version,
  then re-apply only your own change (`git diff <your branch point> HEAD --
  <file> | git apply --3way`) and fix the hunks that don't apply. Then
  rebuild every existing course in the merged tree and in a `main` worktree
  (fetch their release raw files into both) and compare checksums; install
  anything their steps need (`laspy[lazrs]` for Highland Links).
- **The developer may be asleep.** When told to work without asking, take the
  reasonable call, write it down (DECISIONS.md and the report's open items,
  each with a recommendation), and keep anything over 8 % or hard to undo as
  a question for the morning. The developer reviews the list, not the process.

## 2. Data

- **Release assets download fast through `gh api`.** Use
  `gh api -H "Accept: application/octet-stream" repos/<owner>/<repo>/releases/assets/<id> > file`
  (list ids with `gh api repos/<owner>/<repo>/releases`). `gh release` and
  `gh pr create` use GraphQL, which is blocked in this sandbox; use the REST
  endpoints (`gh api repos/.../pulls` to open a PR).
- **Identify each raster by looking at it.** The DC files had no useful names
  (`DC.TIF.1`, `DC.TIF.2`). Percentiles over the course plus a quick
  greyscale picture showed which was the bare-earth DEM (water ~0.15 m, park
  2-8 m) and which was a normalized surface model (height above ground,
  water = -5). A normalized surface model *is* a canopy height model: pass it
  as `chm`.
- **City- or state-wide rasters are too big to load whole** (19,200 x 24,000
  float32 = 3.7 GB as float64). Clip them first with `pipeline/clip_raster.py`
  (world + 100 m, source CRS kept, no resampling) and commit the clips
  (~5 MB each). Keep the full files in the GitHub release and record their
  SHA-256 in `DATA_REQUEST.md`.
- **The developer's Overpass GeoJSON beats their GeoPackage.** The GDAL OSM
  driver turns some closed tee ways into lines (3 tees lost at East Potomac,
  7 at Highland Links). Use `raw/overpass.geojson`.
- **OSM tag values can break the GeoJSON writer.** A value holding both `'`
  and `"` (`maxheight=13'9"`) made the writer store the whole tag dict as a
  string; s01 now writes the inch mark as a double prime. If a later step
  says `'str' object has no attribute 'get'`, look for this first.
- **Scorecards have typos.** The White course card printed a total of 2,943 for
  holes that add up to 2,493. Always add the holes up and compare with the
  printed totals; note any mismatch.
- **Ratings differ between websites.** Two listings gave different
  ratings/slopes for the same tees. Use one, name it, list the other as an open
  item. A par-3 course may have no rating at all (we store 0).
- **Search the web for facts you would otherwise guess:** architect and
  year, where the signature trees are, which tee is the back tee. Cite the
  source in the report.

## 3. Layout

- **Expect missing tees.** OSM had 33 tee boxes for 36 holes x 2 tee sets.
  Tee boxes are raised, levelled pads, and a 1 m lidar DEM shows them
  clearly: `pipeline/propose_tees.py` searches a corridor along each hole's
  tee-shot axis (140 m behind the line start) for raised flat pads and
  measures each one against the card. Run it as soon as s00-s02 are done, look
  at `proposed/tees_lidar.png`, and add the pads within 8 % through
  `edits.json`. The developer approved all 19 used at East Potomac.
  - What made detection work: a 61 m running median (31 m lost the long tee
    complexes), height above it > 0.15 m, slope < 6 %, a 0.15 m step down to
    a ring 1.5-4 m outside, and searching per hole in a corridor (a
    course-wide search merged pads with mounds and failed the shape test).
  - Par-3-course tees and some back tees are on grade: no pad to find.
- **A hole line that starts in the wrong place shows up as a FAIL.** Blue 13
  measured 261 yd against 371: the OSM line started ~100 m in front of the
  back tee. The developer chose "use the back tee"; `edits.json`
  `extend_start` moves the line start back along its first segment.
  Check the hole on any map you have (an NPS map in `reference/` showed it)
  before asking, and offer the fix with the distance in metres.
- **Put every layout edit in `edits.json`, never hand-edit `edited/`.**
  `merge_edits.py` (run by `make course` after s01) rebuilds
  `edited/course.geojson` from `raw/` plus `edits.json`, each edit with its
  reason, so a new OSM download doesn't wipe the edits.
- **Check whether each fairway really meets its green, and fix only where
  OSM is wrong.** On many real holes the fairway does *not* reach the green:
  rough, a bunker, a ditch, a pond or a forced carry sits in between. Those
  must stay exactly as mapped. At East Potomac the OSM fairways stopped short
  of 19 of 36 greens (or met them with ragged corners) although on the
  ground every fairway is mown up to the collar; the developer confirmed it,
  so that course uses `"connect_fairways": true`.
  - Decide per course and per hole, from the developer's photos, public
    imagery (look only, COURSE_BUILD.md 1.2) or the developer's word. When
    unsure, ask; don't connect by default.
  - `"connect_fairways": true` connects every hole that has a fairway on its
    line: use it only when that is true of the whole course. For a course
    where only some holes are mis-mapped, list them:
    `"connect_fairways": ["3", "11"]` (or `["blue 7"]` with layouts).
  - Check `build/approaches.json` and look at every approach. Keep the hull
    inside a corridor along the hole line, or it fills bays between fairway
    lobes (Red 8 grew 1,160 m2 before the corridor).
- **Trees standing in a fairway.** Lidar can put a tree inside a mapped
  fairway, either a tree that is really there or one where OSM traced the
  fairway loosely. At East Potomac the developer saw one mid-fairway and
  asked for such trees to be removed, so `"trees_off_fairways_m": 2` drops trees whose top is more than 2 m inside a
  fairway (edge trees, whose crowns overhang it, stay). Some courses do have a
  tree in the fairway on purpose: check before switching it on. If
  `connect_fairways` is on too, the tree check also covers the new approaches
  (s02b runs before s05).
- **Aim at the middle of the fairway from every tee.** At East Potomac ten
  Blue tee shots clipped a crown within 40 m of the tee. Moving the virtual
  tee to the back of a shared box (to reach the longer set's yardage) put it
  under trees at the box edge, and tees with no mapped box (a moved line
  start) can sit in a stand of trees. Run the check for every hole and tee
  set (the test in `east_potomac.test.ts`: perfect auto-club shot, every
  canopy a hit). Every course build clears them (the developer: "it should
  just be the case"): s06 first moves the tee within its box, then s06b drops
  the trees still in the way. A blocked tee shot can be on purpose: Oswego
  Lake hole 10 is a dogleg the developer keeps, listed in `keep_tee_trees`.
  Read the s06b line of the build log and ask about any hole where it drops
  trees on a new course.
- **Several courses on one site:** list them as `layouts` in
  `course_config.json` (COURSE_BUILD.md 3.5). Holes go to the layout whose
  `leisure=golf_course` polygon contains them; all greens are shaped once so
  the ground is the same in every layout; OB is the union of all course
  polygons. The game gets one course per layout, sharing files through
  `../<data id>/` paths.
- **Name layouts so they fit on a course card** (about 26 characters):
  "East Potomac Blue Course", not "East Potomac Golf Links - Blue Course",
  which the card cut to "east potomac golf links -..." for all three.
- **Tee sets that fail on several holes:** build only the sets that work
  (often just the default) and list the rest. The game only plays the
  default tee anyway (until the design chat adds a tee choice).

- **When OSM lacks whole holes, trace them yourself and let the developer
  correct them in a tracing desk** (Indian Island, 2026-10-19: OSM had 8 of
  18 holes). `propose_trace.py` gets a first pass from the state
  orthophoto and the DEM: the green as the patch of smooth turf at a seed,
  fairways from a classifier trained on the course's own OSM fairways,
  bunkers as bright sand, tee pads from the DEM, water from the
  hydro-flattened DEM. Then publish the tracing desk (`desk_export.py` +
  `pipeline/desk/index.html`). The developer drags outlines into place and
  marks tees there instead of in QGIS, and you read the saves back. What
  mattered:
  - Show the shapes smooth. Raw traced outlines looked jagged and lost the
    developer's trust; greens are smooth, mostly convex blobs.
  - Give the desk a live yardage readout against the card for each tee
    box. The first traced tees measured like the White card (-0.6 % total)
    while seven holes failed Blue by more than 8 %. Back tees at ground
    level show in neither the photo nor the lidar, and only the developer
    could place them.
  - Put dogleg bend points at the centre of the developer's fairway where
    it lies farthest from the tee-green chord. A bend picked by eye cut
    corners and cost 3-5 % on three holes.
  - Store the developer's saves in the repo (`data/<id>/desk/`) so the
    build stays reproducible without the page.
- **Prefer state orthoimagery to the developer's Google screenshots.** At
  Indian Island the Google screenshots were only used to identify holes;
  every shape was traced from the NYS orthoimagery, which is open data,
  georeferenced and sharper. Google screenshots may now be traced when the
  developer supplies them (CLAUDE.md 5.1 note, `source=google`); keep them
  for features the open imagery can't show.
- **Big lidar uploads:** LAS files of 180-330 MB failed in the browser's
  release upload, though GitHub allows 2 GB per asset. Ask for one zip (or
  LAZ). A state project may have no vegetation class: take class 1
  (unclassified) and let s05 drop trees on OSM buildings. The points' GPS
  times give the flight date, which tells you whether it was leaf-off.
- **Count the boundary's parts.** The game takes one OB polygon and s10
  used to keep only the largest part. Eastmoreland's OSM boundary is two
  polygons either side of a road, so the whole front nine was out of bounds;
  nothing failed until the robot round scored 16 on every front-nine hole. Look
  at the boundary's geometry type in Phase 1 and run a robot round as soon as
  the course exports. Fix: `join_boundary_parts`.
- **natural=water inside the boundary is not in play.** s08 paints OSM
  `natural=water` only outside the course; inside it becomes rough. A lake the
  holes play over must be added as a `golf=lateral_water_hazard` (or
  `water_hazard`) penalty area (Eastmoreland: `make_water.py` +
  `edits.json`). Streams mapped only as lines need `propose_channels.py`.

## 4. World and pipeline

- **The 2,048 m limit can bind.** The island is 1.93 km long; the world became
  1,280 x 2,048 m with only 45-74 m of scenery at the ends. Check the
  boundary's bounding box against the limit in Phase 1.
- **Run the steps in order after any upstream change.** Running s04 before
  the lidar tees were merged left them unlevelled; the first clean
  `make course` gave different heights. Before the hand-off, delete
  `data/<id>/build` and `edited/`, run `make course` twice, and compare
  checksums of everything exported (must match).
- **Keep every existing course byte-identical.** Gate new behaviour behind a
  config key (`layouts`, `blossom`, `connect_fairways`,
  `trees_off_fairways_m`, `paint_range_outside`) so courses without it skip
  it. Save checksums of a parent-commit rebuild in a separate `git worktree`
  and compare after every pipeline change (Oswego: 211 files).
- **Don't change pipeline files while a build is running from them.** Use a
  worktree for the baseline build.
- **Run the regression check only after changing code in `pipeline/`**
  (developer, 2026-10-19). Changes to `data/<id>/` files, the course config
  or a scorecard can't touch other courses; skip it for them. Run it once
  more before asking the developer to merge.
- **`pkill -f` patterns can match your own shell** (`pkill -f "s0[0-9]"`
  killed the session's shell). Kill by PID. Likewise a `pgrep -f <name>`
  wait loop matches its own command line and never ends.

- **Bash calls stop at 10 minutes.** A Playwright pass over 18 holes takes
  longer on software WebGL: start it with `nohup ... &` and poll, or split it
  by hole (env vars in the spec).

## 5. Trees and theme

- **A theme's flair can be data-driven without a game change.** The game draws
  tree *i* with sprite variant *i* mod 3. The potomac sheet draws deciduous
  variant 2 as a cherry in bloom, and s05 orders `trees.json` so cherries sit
  at indices with *i* mod 3 = 2 (conifers fill the remaining slots). Cherries
  are chosen by a written rule (deciduous, <= 12 m, outside the boundary,
  within 45 m of water and 100 m of the boundary), flagged `c: 2`, and
  described as flair, not surveyed species. Ask the design chat for a proper
  tree kind (request in `docs/requests/east_potomac_design_requests.md`).
- **New theme = palette with the same keys + tree painters.**
  `assets-src/palettes/<theme>.json` with a `"trees"` entry naming the
  conifer and deciduous painters: a name in `trees.py` `PAINTERS` (coastal)
  or `"module:function"` for a theme module (`"trees_potomac:deciduous"`;
  recolour the pnw shapes, new shapes only where needed). `make assets`
  builds `sprites/trees_<theme>.*`; check that `trees.png` (pnw) and the
  other themes' sheets are unchanged. s09b uses the same painters for the
  putting views.
- **Look at the sprites at 5x on grass before rendering the course.**
- **Flowering shrubs are trees.json `c: 3`** (sprites/shrubs.png). The game
  picks a bush's colour from its index (% 8), so give each bush its colour
  first and then place it at a matching index (`garden.order_trees()`); redo
  the ordering after anything drops trees from the list (s06b), or every bush
  after the drop shifts colour. Eastmoreland first painted the garden flat
  into the terrain art; clumps under ~2 m across read as dark dots at 2 px/m,
  and flat paint can't stand up in 3/4 view. Highest-hit lidar can't see
  shrubs under trees; a lower density there is flair and is written down as
  such.
- **DOGAMI downloads arrive as `exportImage.N.tiff`.** Tell them apart by
  their values (ground in the tens to hundreds of feet vs canopy from 0) and a
  quick picture, as with the DC rasters.

## 6. Checking the build

- **Look at every hole in the browser.** A Playwright script (tee aim,
  Tab overview, the approach at rest, 10 m and 3 m putts) plus contact sheets
  of 3 holes x 5 views is fast to read. Ways in: start the `courses` scene and
  call its `choose(id)`; jump holes with `round.startHole(k)` and
  `startHoleIntro(false)`; move the ball with `round.ball = {...};
  round.refreshLie(); play.beginShot(false, true)`. `vite preview` serves
  `dist/`, so run `npm run build` after every export before looking.
- **Write the developer's complaints as tests.** At East Potomac "fairways
  must meet the green" and "no tree inside a fairway" became checks in
  `game/tests/unit/east_potomac.test.ts` (true for that course only, not a
  general rule); confirm a new test fails on the old
  data before trusting it.
- **Robot rounds find data problems.** Report the score, penalties per hole
  and any hole over par + 4 for several seeds.
- **Course cards:** after the export, run `assets-src/course_cards.py <id>
  --sheet`, pick greens that show what makes the course special (cherries
  here), confirm with the developer, delete the contact sheets.

- **The pipeline's tee-shot check can pass by centimetres where the game
  fails.** Stone Creek 15: s06b cleared the hole by 0.1 m under a 43 m fir's
  crown, but the game test's ball (launched from the game's own tee height)
  clipped it. Run the game test for every hole after s06b; where it disagrees,
  set `tee_shot_margin_m` (0.5 m did it) rather than dropping trees by hand.
- **Read the build arrays the right way up.** `height_base.npy` (and the other
  s04/s05 grids) run south to north (row 0 = south); `surface.npy` and the
  exported PNGs run north to south. A hillshade drawn with the wrong origin
  looks plausible and puts the creek on the wrong side of the course.
- **Rebasing in the shallow clone fails.** With `--depth 1` there is no merge
  base, so `git rebase origin/main` sees every file as added on both sides.
  When `main` moves before anything is shared, recreate the branch from the new
  `main` and copy the course's own files back in.

## 7. Hand-off

- Branch `course/<id>`, merge `main`, all tests green, push, PR through
  `gh api`. The PR body: what was built, checks run, numbered decisions with
  recommendations, design-chat requests, merge order.
- After the developer answers, post a short PR comment listing what changed.
- If a push hook says the branch has "no remote branch" after a successful
  push, the local branch just lacks tracking in the shallow clone: set
  `branch.<name>.remote/merge` and a fetch refspec.

## 8. Langston (2026-10-19)

- **Check whether the OSM boundary is one polygon.** Langston's
  `leisure=golf_course` is a multipolygon in two parts (mainland and island)
  with a lake between them, and the game's out-of-bounds line is a single
  polygon: s10 kept the bigger part, so four holes would have been out of
  bounds. Look at the part count in Phase 1. `join_boundary` joins parts
  across named water (which becomes a penalty area).
- **Read the scorecard's tee names.** The developer said "Blue"; the card
  says Royal, White, Gold, Wake-Robin. Use the card's names and say so.
  Add up every row: the Wake-Robin back nine is misprinted.
- **One OSM tee per hole usually means one tee set.** Measure every OSM box
  against every column of the card before choosing what to build: Langston's
  boxes were mostly White, with a few back tees. The lidar pads filled the rest.
- **A back tee can be off the hole line.** The hole 10 back tee is across the
  lake, 95 m from the OSM line start, where the corridor search never looks.
  `propose_tees.py --wide=<holes>` searches a 250 m circle; then tag the pad
  `hole=<n>`, `tee_set=<name>` (s06 only considers boxes near the line start).
  A wide search finds many non-tees (green complexes, mounds, road shoulders):
  pick by position and look at the picture.
- **Check that a proposed pad is not another feature.** The best pad for Royal
  6 overlapped an OSM bunker (bunkers paint over tees), which the
  "every tee is on a tee box" test caught. Drop it rather than keep it.
- **Streams mapped only as lines** can be made into penalty areas from the
  DEM channel (`propose_channels.py`). A stream falls along its length: tag it
  `flatten=no`, or s04 flattens it to its 10th percentile and cuts a trench.
- **Trees inside a lake polygon** may stand on its islands. Filling a lake
  over its islands to make one penalty area dropped 440 trees until s05 kept
  trees in the joined areas.
- **The developer may send corrections mid-build** (Langston's two-tier 13th
  green came after the first export). Keep every step rebuildable so such a
  change is one config entry and a rerun from s06.

## 9. Tualatin Country Club (2026-10-19)

- **OSM may map every tee, fairway and green but no hole lines or pins.**
  Don't guess the routing. Plot the greens with letters and the tee boxes
  with numbers (`data/tualatin/proposed/osm_labelled.png`) and ask the
  developer which green is which hole; that one picture settled all 18.
  Then check it against the card: for each hole, the tee box beside the
  previous green should sit at the card distance from the green
  (straight-line distances were within 5 % on every hole).
- **Draw hole lines from the mapped features, not by eye.**
  `data/tualatin/make_holes.py`: tee box centroid -> fairway centre line
  -> green centroid, pins at green centroids, added through `edits.json`.
  The fairway centre line is the *longest path* through the medial axis
  (skeleton) of the fairway polygon; the raw skeleton has spurs into every
  corner and lobe, and a bend chosen on a spur was 69 m off line.
- **Put a dogleg's bend in the landing zone** (250 yd from the tee, the
  USGA's scratch landing area), not at the axis point farthest from the
  straight line. Where the line bends decides where the game's default
  aim points the drive: the farthest-point bend aimed hole 11's drive down
  the right edge of a tree-lined chute, where a perfect drive clipped three
  26-40 m trees; the landing-zone bend cleared it without touching a tree. Start the line at
  the Blue box (run s06 once, then use the box it assigns).
- **Check tee shots with the game's own flight model.** A drive aimed down
  the centre line (`Round.lineAim`) with a perfect strike, through
  `simulateShot` without obstacles, then test every sample against each
  tree's trunk and canopy cylinder: that names the blocking trees, their
  heights and the ball's height. Do the approach from where that drive
  stops too. The test is in `game/tests/unit/tualatin.test.ts`.
- **Look at the greens the way the game draws them.** Trees on the near
  (south) side of a green are drawn over it in the 3/4 view, so a contact
  sheet of greens (the course-card sheet) shows trees "blocking" a green
  that a top-down plot doesn't. The developer spotted two on hole 13 and
  had them removed (`drop_trees`, which also clears their canopy so no
  woods patch is left on the ground).
- **Water in play outside the boundary.** A river along the boundary is
  out of bounds by default (everything outside is OB). If the developer
  says it is a red penalty area, list it in `red_water_osm`; the game
  checks water before OB and keeps drops inside the boundary.
- **A swimming pool tagged `natural=water` inside the boundary** is drawn
  as rough unless it is listed somewhere; check every water feature inside
  the boundary, not only the ones tagged as hazards.
- **DOGAMI image services** (Oregon) give a 1 m GeoTIFF in the course's
  UTM zone in one browser click, already on the world grid (s00 copies it
  cell for cell). The links are in `data/tualatin/DATA_REQUEST.md`.
- **Regression checks catch small slips.** Inserting a block into s05 split
  an existing `if` and dropped two keys from East Potomac's tree report;
  comparing each step's outputs with a `main` worktree found it in a
  minute. Re-check after every pipeline edit, not only the first.
- **In-game screenshots take about a minute a hole** (5 views) in the
  sandbox. Run them in the background in chunks and read the first
  contact sheets while the rest render.
- `npm install` may rewrite `game/package-lock.json`; revert it unless the
  course needs a new package.

## 10. Oregon Golf Club (2026-10-19)

- **Check the boundary's size against 2,048 m before anything else.** The
  course was 2,120 m north-south, so the limit couldn't hold even with no
  scenery; the developer approved 1,280 x 2,304 m in the first message. The
  game loaded it without trouble (see the report for the timings).
- **Release file names may say nothing** (`exportImage.6.tiff`). The values
  tell: a bare-earth DTM has no zeros and the river flat at its minimum; a
  canopy model is mostly 0-1 with tall tails.
- **A canopy model contains power lines.** Look at the CHM picture for long
  straight thin lines before running s05. Here they made 1,254 false trees
  (rows of 20-30 m "trees" under the line, 70-82 m "conifers" at a river
  crossing). `remove_wires` takes them out: grey opening (5 x 5 m), cells
  more than 3 m above it, thin networks with a skeleton over 40 m and a mean
  width under 3 m. A plain "long and thin" test on connected components
  fails, because the two conductors of a line and the tree tips they touch
  join into one wide component; measure width as cells / skeleton cells.
  Quick check: the tallest tree (Pacific Northwest firs top out near 60 m).
- **OSM may map the range's targets but not the range.** Build the edge from
  mapped geometry (the path loop around the targets) and show it as a
  proposal. Check what each feature inside is before cutting it out: a
  735 m2 "fairway" I took for part of the short-game area was the mown
  collar of a range target, and it left a hole in the range.
- **Ask how the range looks on the ground.** A range drawn with fairway
  stripes invites players to hit there. This one is rough, so it is drawn as
  rough with range balls and OB stakes (`range_art`).
- **Tee complexes that step sideways.** s06 looks for tee boxes within 25 m
  of the hole line; on a hillside a forward box can be 30 m to the side.
  Measure every box near the line start against the card; assign a clear
  match by tag (`hole`, `tee_set` in `edits.json`) and say it was the course
  chat's call (s06's report line says "developer").
- **Hillside tees are cut, not raised**: `propose_tees.py` found no pads for
  the three tee sets that share a box. Don't expect lidar to fill every gap.
- **Look at the green contact sheet for trees drawn over a pin.** A tree
  7 m south of a green still covers it in the 3/4 view.
- **Two CPUs:** the regression rebuild and the in-game screenshots slow each
  other down several times over. Run the regression first, or accept about
  7 minutes a hole for screenshots while it runs.
- **The tracing desk fixes OSM courses too.** The developer asked to correct
  the driving range and hole 9's fairway themselves; the desk (with
  `--edit-osm` and `--area range`, over a lidar relief because there was no
  photo yet) took about twenty minutes from request to saves. Offer it
  whenever a mapped shape is wrong and the developer knows the course.
