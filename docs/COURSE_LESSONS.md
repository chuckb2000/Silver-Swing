# Lessons from building courses

Read this after `docs/COURSE_BUILD.md` (the procedure) and before starting a
new course. Each lesson is something that cost time on an earlier course,
with what to do instead. Course chats don't edit this file (2026-10-20): they
write their lessons in `docs/courses/<id>.md`, and the design chat folds them
in here after the merge.

Sources so far: East Potomac Golf Links (2026-10-19, three courses on one
island), Langston (2026-10-19, a course in two parts across a lake), Indian
Island (2026-10-19, half the course traced), Tualatin Country Club
(2026-10-19, section 9), Eastmoreland (2026-10-19, Portland), Willamette Valley
(2026-10-19, section 10), Oregon Golf Club (2026-10-19, section 11) and
Franklin Country Club (2026-10-19, section 12) and Langdon Farms (2026-10-19, section 15, every hole traced). Oswego Lake and Highland Links
notes live in DECISIONS.md.

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

## 10. Willamette Valley CC (2026-10-19)

- **Check every polygon's tag against its size.** OSM had two whole fairways
  tagged `golf=tee` (228 x 36 m and 328 x 61 m). The audit only said "no
  fairway" for those holes; sorting tee polygons by area found them at once.
  A wrong tag also misleads the tee-shot test: it aimed hole 9's drive at the
  next hole's fairway, into a tree.
- **`golf=path` is the current OSM tag for cart paths;** the pipeline reads
  only `golf=cartpath`. Relabel through `edits.json` (copy from a `proposed/`
  file with the new kind, drop the original) until s01 learns the new tag.
  `edits.json` `tags` does not change a feature's kind.
- **A hole line that ends off any green, with a pin there, usually means the
  green itself is missing,** not that the line is wrong. The nearest mapped
  green (53 m away) was a practice area; s06 picked it silently. Ask, then
  trace the green.
- **Oregon's state imagery (OSIP 2022, 1 ft, 4-band) exports in one browser
  click** from `imagery.oregonexplorer.info/.../OSIP_2022/OSIP_2022_SL/ImageServer/exportImage`
  with `bboxSR`/`imageSR` 32610. 2048 x 1792 exports at 0.5 m worked. Give each
  link complete, with no "..." shortcuts: a first batch with shortened links
  didn't work for the developer.
- **Placing a tee the developer describes:** put it at the card yardage on the
  feature they name, then look at it on imagery and run the game's tee-shot
  test before showing it. The first spot (on the hole line) was under a tree.
- **The sandbox proxy refuses release uploads** (uploads.github.com, binary
  body). Ask the developer to upload files to the release.
- **`s03_audit.py` with an `edited/` file measures in degrees** (it reads the
  WGS84 file): its distances after `merge_edits` are wrong. Read the first
  audit (before edits) or s06's report instead.

## 11. Oregon Golf Club (2026-10-19)

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
  rough with OB stakes along its edge (`range_art`). No range balls: white
  dots on the range hid the stakes (developer).
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

## 12. Franklin Country Club (2026-10-19)

- **An openstreetmap.org "Export" (`.osm` XML) is as good as an Overpass
  export** if its box covers the world. Convert it with
  `npx osmtogeojson@3.0.0-beta.5` (the converter Overpass Turbo uses), then
  drop the metadata properties (timestamp, version, changeset, user, uid) and
  write the id as `@id` (`data/franklin/osm_to_geojson.py`); otherwise the
  metadata ends up as OSM tags.
- **`golf=water_hazard` exports as yellow.** s10 reads `water_hazard` as
  yellow and `lateral_water_hazard` as red, whatever `penalty_default` says.
  When the developer says "all water is red", tag every hazard
  `penalty=red` in `edits.json` and check `course.json` `water[]`.
- **List every water feature inside the boundary, not only the hazards.**
  Two ponds mapped as plain `natural=water` would have played as rough
  (Tualatin's pool, again). A plot of hazards, plain water, wetlands and
  streams over the holes (`proposed/water_osm.png`) shows them at once.
- **USGS 1 m DEM tile names come from the UTM corner:** `x30y466` covers
  eastings 300-310 km and northings 4,650-4,660 km (the name is the
  north-west corner). A course near a 10 km line needs two tiles; mosaic and
  clip them in a small course script (`data/franklin/clip_dem.py`) rather
  than committing 350 MB tiles.
- **A NOAA Data Access Viewer job can come back in feet both ways.** The
  Franklin job (all classes, one 961 MB LAZ) was NAD83(2011) UTM 19N in US
  survey feet horizontally *and* vertically: s00 reprojects the horizontal
  from the file's CRS, but the vertical needs `laz.units: "ft"`. Read the
  header CRS before the first s00 run.
- **The centre-line test can fail where s06b passes.** s06b aims at the
  middle of the fairway where a drive lands; the course test also flies a
  drive straight down the hole line. At Franklin 18 a broadleaf's crown
  reached 0.5 m over the line 15 m from the tee. Run both before calling the
  tee shots clear.
- **`pkill -f "vite preview"` killed the shell** that ran it (the command
  line contained the pattern). Start the preview server once and leave it,
  or kill it by PID.
- **A big wooded world means many trees.** 37,340 lidar trees (2.5x Indian
  Island) and a 17 MB export; the game only builds sprites for cells near
  the camera. Measure the course's load time in the browser.

## 13. Waverley Country Club (2026-10-19)

- **OSM can have fairways and nothing else.** Waverley's OSM had the
  boundary, 18 fairways, a pond and the clubhouse: no holes, greens, tees,
  bunkers or pins. The Indian Island tools covered it: trace from the state
  orthophoto and DEM, then the tracing desk. `desk_export.py --traced`
  starts the desk from `proposed/traced.geojson`; `desk_to_proposed.py
  --traced-fallback` keeps the traces of any hole the developer doesn't save,
  tagged `approved=pending` (hole 14 was missed).
- **Oregon imagery: OSIP 2024 ImageServer.** `exportImage` with `f=image`
  failed in the developer's browser; `f=json` returns a link (`href`) to the
  finished GeoTIFF, which downloads. The service caps height at 4,100 px, so
  a 1 ft course takes two halves. `data/waverley/make_ortho.py` mosaics them
  onto the world grid.
- **Club layout maps are schematic and rotated.** A similarity fit onto the
  lidar got within 20-40 m, enough to tell which OSM fairway is which hole,
  but not where a green is. Zoom into the map itself to read each hole's
  direction (which end has the green circle, where the tee rectangles are):
  reading the fitted positions alone put hole 15's green at the wrong end.
- **Greens in tree shadow defeat the texture trace** (three at Waverley).
  Place an `ellipse` by eye in `trace_spec.json` and say so; the developer
  corrects it in the desk.
- **Tune sand per image.** OSIP sand is darker and greener than the NYS
  photo (`bunkers.max_exg` 28, `min_brightness` 150), and sand on the
  riverbank looked like bunkers until `min_z_m` sat above the bank
  (6 m against a 2.3 m river).
- **A `natural=water` pond inside the boundary paints as rough.** List it in
  `red_water_osm` (or retag it as a penalty area); check every pond on the
  surface map.
- **Measure the developer's tees before building.** Straight tee-to-green
  distances for every desk tee against the card show the >8 % holes and
  missing saves at once, so all the questions go in one message.
- **Bend points from the hole's own fairway.** Taking the farthest fairway
  centre from all fairways near the line picks up neighbouring holes; use
  the hole's own OSM fairway id.
- **The desk used to label saves with Indian Island's origin**; the
  coordinates were right. `desk_export.py` now writes each hole's `units`.
- **`pkill -f "playwright test"` killed the session's shell** (as the earlier
  lesson warns for `s0[0-9]`). Kill by PID. The 90-screenshot look takes
  longer than a foreground command: run it in the background, or in chunks
  (`LOOK_FROM` in the script).
- **Check the desk with saved data before handing it over.** Once holes
  were saved, loading them reset the open hole and every hole button threw
  (fixed in `openHole`). A local copy of the page with a stub `window.claude`
  serving the saved docs reproduced it in a minute.

## 14. Wannamoisett (2026-10-19)

- **Look at the OSM boundary's inner rings, not only its parts.** The course
  relation cut the pond beside hole 14 out as an inner ring, so the pond was
  out of bounds. `join_boundary` with that water fills it; s02 now skips
  adding a second penalty polygon where the water is already a mapped hazard.
- **Class-1 lidar holds roofs, and leaf-off they look like pines.** Where a
  project has no vegetation class and OSM maps few houses, every unmapped roof
  becomes a "crown" whose returns are all last returns, which the leaf-off
  conifer split reads as a pine (30 % "pines" here, mostly roofs). Plot the
  per-crown last-return share before trusting the split: it was bimodal plus
  a roof mode at 0.85-1 (median 6.6 m high, almost none on the course).
  `roof_last_share` drops that mode. Then check the crowns it drops inside the
  course: they should all sit on buildings.
- **Read every building tag.** The clubhouse was `golf=clubhouse` +
  `building=yes`; s01 classifies by the golf key first, so it was neither drawn
  nor an obstruction. Add the outline as a building through `edits.json`.
- **Third-party cards disagree on tee names.** A scorecard site called the
  6,732-yd set "Blue"; GolfPass calls the same numbers "Black" and its 6,417
  set "Blue"; the club website's newer totals keep GolfPass's order. Pick one
  naming, say so, and line up the handicap row column by column (GolfPass
  shifted its back nine by one; a clean 1-18 set is the check).
- **Uploads can arrive partially.** Six of nine lidar tiles reached the release;
  the missing one held 70 % of the course. Check the asset list against the
  request and say exactly which files are missing and what they cover.
- **Run a fixed build twice from clean** (delete `build/` and `edited/`) and
  compare checksums; start background builds with an explicit `cd` (a nohup
  shell started elsewhere found no Makefile and silently did nothing).
- **Rebuild every course from clean in the regression check.** A step that reads its own output from a previous run (Eastmoreland's garden read `chm_local.npy` before s05 wrote it) passes in the chat that built it and fails for everyone else (fixed on main the same day).

## 15. Langdon Farms (2026-10-19)

- **OSIP exportImage can fail as TIFF and work as JPEG.** Every TIFF export
  (OSIP 2024 WM and SL, OSIP 2022, NAIP) gave the developer "Error exporting
  image, Code: 500"; the same 2024 request with `format=jpg` worked at once.
  A JPEG has no georeferencing, but the bbox in the URL fixes its corners:
  mosaic the halves and set the transform from the bbox (the alignment
  against OSM bunkers and ponds was within 1-2 m). Offer a small test link
  first (1,024 m square), then the full halves.
- **A course with no mapped holes can still be traced in one pass.** OSM had
  only hole 1. A labelled map of candidate greens (letters on the photo,
  `proposed/greens_labelled.jpg`) got the routing in one reply, including
  which candidates were nursery greens, fairway or a tee. Then
  `propose_trace.py` and the desk with `--traced` (traced shapes as the
  editable first pass); the developer corrected all 18 holes and marked every
  Tee 7 box in about 45 minutes.
- **Greens: texture alone runs into the collar on summer imagery.** On the one
  mapped green the texture trace gave IoU 0.37 (1,300 m2 for a 480 m2
  green). Adding "brightness within 5.5 of the seed's" (`br_delta`) gave 0.81.
  Calibrate on any mapped green before tracing the rest, and try seeds a few
  metres apart (keep the most compact result).
- **No mapped fairways to train on:** a colour rule (smoothed 2G-R-B, texture
  and G-R) is a usable first pass in a dry summer photo, where the irrigated
  fairways are bluer and smoother than the rough. Expect the developer to
  redraw most of them anyway.
- **Lidar tee pads are unreliable on a flat, tree-lined course.** Most raised
  flat patches near the line starts were tree bases and mounds. Let the
  developer mark the tee boxes in the desk and use the pads only as hints.
- **Double greens:** the developer drew the shared green once per hole. Keep
  the smaller drawing as that hole's green and give the other hole the rest
  (trace_spec `double_greens`), so each hole has its own centre and pin. The
  rest can be a crescent whose centroid is off the green: measure and centre
  the putting views on a point inside it.
- **Check `main` for an option before writing one.** I wrote a boundary join
  for the two parts either side of OR 551, then found Eastmoreland's
  `join_boundary_parts` on `main` doing the same; extending it to boundaries
  mapped as separate ways was a five-line change. Fetch `main` (and read its
  COURSE_LESSONS) as soon as a course needs a pipeline change.
- **Identify a building the developer names by asking where it is.** "The
  barn on 8" was not the unmapped building beside the 8th tee I guessed; it
  was on the left of the fairway, away from hole 9. Show the candidate on the
  photo and ask before colouring or tagging it.
- **A shallow clone can't merge `main` after it has moved** (no merge base).
  `git fetch --depth=300 origin main` gave the base, and per file "take
  main's, re-apply mine" (`git diff <base> HEAD -- <file> | git apply --3way`)
  resolved the desk files that both branches changed.
- **Look for creeks OSM doesn't map at all.** The first Langdon build missed a
  creek across hole 7; the developer saw it. A relative-height map of the DEM
  (height minus a 25 m running median, cells below -0.25 m in red) over the
  whole course shows every channel at once, mapped or not. Make it in Phase 3
  and ask about each channel that crosses or runs beside a hole. For one OSM
  lacks, take the line from the channel itself (`data/langdon/make_creek_line.py`)
  and run `propose_channels.py --lines=`.
- **Split a double green the way the holes use it, and check the game's
  pins.** The game adds up to three pin positions anywhere on a hole's green
  (`pins.ts`), so a hole's part of a shared green must be only the side that
  hole plays to: Langdon's first split gave 18 the north end of the pond, the
  game put an 18 pin on 9's side, outside 18's putting views, and the
  developer putted blind. Ask which side each hole uses, cut the joined green
  with a line (trace_spec `double_greens` `split`), and test every spot from
  `coursePins` against the side and the putting views.

## 16. Gearhart Golf Links (2026-10-20)

Folded in from docs/courses/gearhart.md at the merge.

-   **Check the lidar's date against the course's history.** The DOGAMI
    mosaic here predates a renovation that removed most trees; the first
    tree pass put 1,067 trees on an open links. Comparing every crown with
    the latest state orthophoto (dark-canopy share in the crown, best within
    2.5 m for the lean of tall crowns in the photo) separated the 737 gone
    from the 248 standing cleanly; the developer confirmed the result at a
    glance.
-   **`drop_trees` clears the canopy too**, so removing hundreds of trees
    leaves no woods patches behind; keep the list one entry per line.
-   **The pipeline takes every `leisure=golf_course` polygon as a boundary**
    (`boundary_name` is not read). A second export with a wider box pulled in
    two unnamed course polygons nearby; drop them in `edits.json`.
-   **A long teeing ground can hold a set its centroid misses.** s06 assigns
    boxes by centroid, so a 46 m box covering 130-180 yd was skipped for a
    176 yd card; measure every box's yardage range before taking a lidar pad.
    The pad here was rough in the 2024 photo.
-   **Fescue vs mown rough is one colour rule on a summer photo** (green minus
    red: turf +10 to +26, fescue -10 to +1); OSM's `golf=rough` covered only
    part of it.
-   **Playwright ignores specs inside its own output folder** (`test-results/`)
    and wipes it at the start of a run; keep a throwaway look script under
    `playwright-report/` (also git-ignored) with its own config.

## 17. Bandon Trails (2026-10-20)

Folded in from docs/courses/bandon_trails.md at the merge.

-   **A resort export holds every course in the box.** The pipeline takes every
    `leisure=golf_course` and every `golf=hole` it finds, so the neighbours' boundaries
    and hole lines must be dropped (`make_edits.py` does it by name and checks each
    line lies outside the boundary). Their greens off the map must go too, or s09 fails.
-   **Overpass exports made with metadata on** carry @user/@uid/@timestamp per feature;
    strip them before s01 (they would become OSM tags).
-   **Long shared tee complexes measure badly from the centre.** Four holes were over 8 %
    from the box centres and within 3 % once s06 moved the tee along the box. Read the
    adjusted column before calling a FAIL.
-   **On a coastal conifer course the "deciduous" crowns are pines.** A theme can draw
    the broad-crown class as shore pine; say so as a drawing choice.
-   **The 2024 orthophoto settles the lidar's age** when the mosaic gives no year:
    overlay the crowns on photo crops.
-   **`golf=path`** is still not read by s01 (COURSE_LESSONS.md 10); `make_edits.py`
    copies it as a cart path with a new id (dropping by id would otherwise remove the copy).

## 18. Chambers Bay (2026-10-20)

Folded in from docs/courses/chambers_bay.md at the merge (lidar rebuild folded in the same day).

-   **Look at the lidar's "trees" on a treeless course before trusting them.** Of 32 crowns inside the boundary, 2 were structures; outside it a parked freight train made 166 identical 4.7 m crowns along the track, and the mine ruins 17 more. Equal heights in a straight line are a vehicle or a structure. Drop them with `not_trees_areas` (a GeoJSON of areas whose crowns aren't trees).
-   **OSM tags the pipeline doesn't read can still be used:** `historic=ruins` polygons became buildings through a `proposed/` file and `edits.json`; OSM `natural=tree` points with `leaf_type` can set a lidar tree's type (`tree_types_osm`).
-   **Ask what the lidar buys before waiting for it.** Here the DEM gave every elevation and the course has one tree in play; the point cloud only changes scenery outside the boundary, so the course was finished on the OSM tree fallback and the lidar becomes a one-step rebuild. A NOAA Data Access Viewer job can take hours.

-   **A complete-looking OSM course can still lack the middle tees.** Chambers Bay's OSM maps the tips (the 2015 U.S. Open tees) and some forward boxes. On four holes no box was near the Blue card. Measure every box near each hole against every column of the card first (here 4729 = Black 295, 4730 = Sand 253 on 12), so the missing set is clear before asking.
-   **Measure off-line boxes the way s06 does** (`path_from`: straight from the tee to the next bend). Adding the sideways offset to the along-line distance put hole 3's White box (126 yd) at 149 and made it look like the Blue tee.
-   **On a links course, place a missing tee where the card distance crosses the line on mown grass.** A contour of s06's own distance over the photo, plus a green-pixel test away from paths and sand, found the spot on 3, 12 and 15 in one pass; where it fell in waste sand (11), say so instead of placing a tee there.
-   **The USDA NAIP ImageServer (gis.apfo.usda.gov) reset the developer's connection;** the same NAIP from `imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage` (JPEG, up to 4,000 px) worked at once. Pierce County's own orthophotos are vendor-licensed.
-   **A long, narrow tee strip has a centre ridge only at its wide end,** so s06's tee move (which stays on the ridge) can overshoot the card (hole 13: 521 vs 500). Accept it as a flag or ask the design chat; don't hand-place the tee.
-   **Big practice ranges can be mapped as `golf=fairway`.** List every fairway, green and tee farther than 15 m from any hole line; the 3 ha "fairway" east of 7 and 10 was the range (striped hitting areas on the photo).
-   **Scratch runs that edit the config must restore it with an absolute path.** A `trap` that copied a relative path after the script had changed directory left the config without its `laz` key.
-   **Hydro-flattened sea** sits at one value (-1.49 m here); `lake_level_max_m` just above it turns the sound into water without touching the beach.

## 19. East Potomac: fairway joins (2026-10-20)

-   **Rounded fairway corners pull in at every join.** s08 rounds each fairway piece on its own, so an s02b approach and the fairway it extends, or two OSM fairways drawn edge to edge, each pull back from the shared edge and leave a line of rough and small notches (East Potomac: 161 pockets, 189 m2). Set `merge_touching_fairways` where the fairways come in pieces, and check a course with many s02b approaches for rough slivers inside the fairways.

## 20. Bandon Dunes (2026-10-20)

Folded in from docs/courses/bandon_dunes.md at the merge.

-   **Resort polygons hold several courses.** Drop the other courses'
    `golf=hole` lines and course polygons in `edits.json`, keep their
    surfaces, and drop their greens outside the world. s09 crashed on a
    green beyond the world edge (negative raster size).
-   **Old lidar, new course.** The DOGAMI South Coast lidar predates parts
    of the resort. Comparing tree crowns with a recent photo
    (`trees_need_ortho`) removed 407 trees standing on what are now greens
    and fairways of the Preserve.
-   **Shrubs under 4 m are invisible to the tree finder.** The thickets
    that define this course had to come from the photo. A simple colour
    rule (dark, blue-green, textured) separated them from the fescue cleanly
    in the late-summer OSIP image.
-   **The crown-shape rule misreads coastal pines** (86 % "deciduous"):
    wind-sheared shore pines are broad and flat. Look at the photo before
    trusting the split.
-   **A mapped beach that starts outside the world gives s08 nothing to
    grow from.** Propose the beach from the DEM instead (`make_beach.py`).
-   **Tee boxes beside the line.** s06 looks 25 m either side of the hole
    line. Boxes 26-33 m out (holes 2 and 3) and a tee complex 100 m from a
    misdrawn line start (hole 11) needed `hole`/`tee_set` tags. Measuring
    every box within 160 m against the card found them in one pass.
-   **A sprite outline that uses `np.roll`** wraps a solid bottom row onto
    the top row (a stray line above every gorse bush). Pad before rolling.

## 21. Triggs Memorial (2026-10-20)

Folded in from docs/courses/triggs.md at the merge.

-   **NOAA's Data Access Viewer can ignore the requested projection.** The job came back in RI State Plane metres (EPSG:6567), not UTM 19N; read the LAZ header before the first s00 run. s00 reprojects the horizontal from the file's CRS, so only the vertical units need setting in the config.
-   **rockyweb.usgs.gov can time out in the developer's browser,** and a project's LAZ is not always on prd-tnm.s3.amazonaws.com (only its browse images were). Offer the NOAA viewer job from the start: one clipped zip instead of nine tiles.
-   **A back tee just past the previous green** can sit outside s06's 25 m search: measuring every box within 200 m of the line start against the card found hole 15's Blue box at 506 vs 508 yd.
-   **The card's subtitle is the text before the first comma of `location`.** "Mount Pleasant, Providence, ..." would have shown the neighbourhood; use the town first.
-   **The preliminary build without lidar** (a scratch config with the `laz` key removed, restored by absolute path on exit) let terrain, greens, surfaces and art be checked while the NOAA job ran.

## 22. East Potomac: a tee point needs a box under it (2026-10-20)

- Blue 13 had been lengthened with `extend_start` to reach the card, which put the tee point on
  open grass. A tee must sit on a tee box: look for the raised pad in the lidar (here 56 x 9 m
  against the seawall, 28 m off the OSM hole line, matching the NPS 2016 map) and add it as a tee
  polygon rather than stretching the hole line.
- One box for several sets: a forced tee's `tee_set` may list them, `"Blue;White"` (s06).

## 23. TPC Boston, Pacific Dunes, Old Macdonald, Sheep Ranch (2026-10-21)

Details in each course's file (`docs/courses/<id>.md`, "Lessons").

- **Check an uploaded GeoTIFF on arrival** (dtype, CRS, value range): an image tool's
  "compression" turned TPC Boston's DEM into 8-bit JPEG pictures with no georeferencing. The
  USGS 3DEPElevation ImageServer `exportImage` (float32, 1 m) gives a course area in one request.
- **A neighbour's `golf=water_hazard` ponds outside the boundary are still yellow penalty areas**
  (water is checked before out of bounds): redraw them as plain `natural=water`.
- **Long tee complexes hold several sets**: measure the yardage range inside each box before
  calling a set missing.
- **Neighbouring courses can share one set of downloads and one release** (`release.json`); the
  three Bandon courses did, with no pipeline change. DOGAMI `exportImage` works with `f=json`
  where `f=image` fails, and `identify` settles the lidar's vintage at a point first.
- **Sum the OSM lines against every column of the card first.** Old Macdonald's and Sheep Ranch's
  lines start on the back tees (Black within 3 %); Pacific Dunes' start at forward boxes, with the
  back boxes 54-76 m off the line (outside s06's 25 m search). A line can even start at the
  previous green (Sheep Ranch 3).
- **Lidar that isn't hydro-flattened has no data over the sea**: fill the sea cells joined to the
  raster's edge with the water-line height (`fill_sea.py`, run by `make fetch`) and let s04's
  `lake_level_max_m` make them sea. Lidar older than the course (2008 at Bandon) is fine: greens
  are shaped and tees levelled anyway; `trees_need_ortho` drops trees that are gone.
- **A double green mapped as one polygon** gets one pin for both holes: split it along the
  bisector of the two pins (`split_double_greens.py`, as at Langdon Farms).
- **OSM `handicap` tags can be another row of the card**; s06 uses the card.
- **A developer's draft release isn't visible to `make fetch`**: ask for it to be published.
