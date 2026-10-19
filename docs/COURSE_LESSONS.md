# Lessons from building courses

Read this after `docs/COURSE_BUILD.md` (the procedure) and before starting a
new course. Each lesson is something that cost time on an earlier course,
with what to do instead. Add to it at the end of every course build.

Sources so far: East Potomac Golf Links (2026-10-19, three courses on one
island) and Indian Island (2026-10-19, half the course traced). Oswego Lake
and Highland Links notes live in DECISIONS.md.

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

## 7. Hand-off

- Branch `course/<id>`, merge `main`, all tests green, push, PR through
  `gh api`. The PR body: what was built, checks run, numbered decisions with
  recommendations, design-chat requests, merge order.
- After the developer answers, post a short PR comment listing what changed.
- If a push hook says the branch has "no remote branch" after a successful
  push, the local branch just lacks tracking in the shallow clone: set
  `branch.<name>.remote/merge` and a fetch refspec.
