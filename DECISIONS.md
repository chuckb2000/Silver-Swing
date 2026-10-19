# Decisions log

Changes from the starting values in CLAUDE.md, and choices the spec left open. Newest first within each area. Date: 2026-10-18 (first build session, then the first and second playtests).

## Course data read without a canvas (2026-10-19, a friend's report)

- **Report:** out of bounds in the middle of hole 6 and fairway lies reading as rough (hole 1 and others) on Oswego Lake.
- **Cause:** the surface map (surface.png, one id per pixel) and the heightmap (height.png) were read back through a canvas. Safari 26 (in all browsing modes), Brave and Firefox with resistFingerprinting add small random changes to canvas reads as anti-fingerprinting. A change of 1 turns fairway (2) into rough (1) and rough (1) into out of bounds (0), and adds bumps to the heights. Simulating that noise in Chromium gave about 11,000 out-of-bounds pixels inside the course; desktop Chrome has no noise, which is why the playtests didn't show it. The course data itself was checked and is fine: no out of bounds inside the boundary except the practice range (by design, `driving_range_is_ob`), and hole 1's drawn fairway matches its physics map.
- **Fix:** `src/data/png.ts` decodes the PNG bytes directly (DecompressionStream plus the PNG row filters), so the values are exact in every browser; the canvas is kept only as a fallback for browsers without DecompressionStream. The loader also warns if the surface map has an id it doesn't know. Tests: the decoder against pngjs for every filter and colour type and on every course's images; a browser test that injects canvas noise and checks there is no out of bounds inside the course.
- **Practice range:** stays out of bounds (developer, 2026-10-19). It is the only out-of-bounds area inside the Oswego Lake boundary; everything else inside the course is in play.

## Course select by state, cards and logos (developer, 2026-10-18)

- **Play → choose a state → choose a course.** State buttons (A-Z, with a course count) lead to that state's courses as cards; a card loads its course and opens the new-round screen, which keeps a "change" button. The leaderboard uses the same two screens to switch courses (purpose "board": it only picks, nothing is loaded).
- **State:** a course's `state` field (postal code) in courses/index.json, or else the last part of its `location` ("..., Oregon" → OR). Course chats should add `state` to course_config.json and copy it through s10.
- **Cards:** a close crop of the course's own art around a signature green, with its trees and flag, drawn exactly as in the game at 2 px/m (`assets-src/course_cards.py` → `sprites/cards/<id>.png`; the hole per course is in `assets-src/course_cards.json`, else the green with the most sand and water around it). Oswego Lake uses hole 3, the pond green.
- **Logos:** original 32 x 32 pixel emblems from `assets-src/logos.py` → `sprites/logos/<id>.png`, chosen by the developer; never a club's real logo. Oswego Lake: blue anchor with a white outline. Prebuilt for courses not built yet (their course ids must match): highland_links (lighthouse with beam), langdon (red barn), east_potomac (domed columned memorial), langston (three-petalled orange wildflower), stone_creek (waterfall), waverley (green and white locomotive), eastmoreland (pink rhododendron), willamette_valley (glass of red wine), indian_island (flint arrowhead pointing right), gearhart (wrecked sailing ship, half sunk), tualatin (arched wooden footbridge). A course without a logo shows a lettered badge; without a card, a plain tile.
- **Card art loads in place** (2026-10-19): card pictures and logos are added to the cards on screen as they arrive instead of redrawing the list, so a tap can't land on a card that is being replaced. The browser test taps like a person (a 60 ms press, two frames after the screen redraws: objects made in a redraw only take input from the next frame) and retries a tap that gets no response; the test machine can run at about 5 frames a second.

## Phase 0 decisions (developer, 2026-10-18)

- **Name:** the game is called **Silver Swings Golf**.
- **Code:** one private GitHub repository shared by the design chat and the course-building chat (docs/COURSE_BUILD.md section 0.1).
- **Hosting:** Cloudflare Pages, built from the GitHub repo on every push (root `game`, build `npm run build`, output `dist`, Node 22 from `game/.node-version`). Chosen over Netlify because Netlify's free plan is credit-based (15 credits per deploy out of 300 a month, sites pause when they run out), which frequent updates would exhaust; Cloudflare Pages' free plan has no bandwidth charge and 500 builds a month.
- **Leaderboard:** shared between friends (an online leaderboard on the same Cloudflare account), keeping the local one as the offline copy.
- **9-hole courses** will be added, so the game must support them.
- **Title screen** shows the game name; the course is chosen on the new-round screen.
- **No anti-cheat on the shared leaderboard** (developer, 2026-10-18): anyone who can open the site can post a round. The server only checks that a round is well-formed, caps request size, and ignores ids it already has.

## Phase 0 implementation (session 2, 2026-10-18)

- **Course list:** `game/public/courses/index.json`, upserted by pipeline s10 (`update_registry`). The game loads it at boot, starts with the last course played (`settings.courseId`) or the first, and loads other courses on demand from the new-round screen. Switching stops the menu background, removes the old course's textures (`chunk_*`, `mini_*`, `green_*`, `overview`) and data, then loads the new one.
- **9-hole courses:** round lengths `9` and `9x2` (18 twice around). `cfg.holes` holds scorecard numbers (1-18); `Round.courseHole = ((n - 1) mod courseHoles) + 1` is used for everything that reads course data (tees, greens, putting views, minimaps). Front/back nine totals and the countback work unchanged.
- **Shared leaderboard:** Cloudflare Pages Function `game/functions/api/scores.ts` (logic in `src/server/scores.ts`, shared shape check in `src/save/entry.ts`) storing one row per round in D1 (`rounds`, created on first use; full round JSON in `data`). `GET ?ping=1` / `GET ?course=<id>` / `POST` (one round or up to 50, `INSERT OR IGNORE` by id). The client (`src/save/online.ts`) sends every local round the server hasn't acknowledged (tracked in storage key `uploaded`) at boot, after each round and after an import, so offline rounds and imported backups reach the board too. Without the server (Vite dev, claude.ai preview, no `DB` binding) the game shows only this device's board.
- **Storage keys unchanged** (`local-golf` IndexedDB store and `local-golf:` localStorage prefix), so rounds saved before the rename are kept.
- **Credits** list the current course's designers and data sources from `course.json`.

## Putting and swing camera fixes (2026-10-18, after the second playtest)

- **No driver off the deck.** The driver is only selectable for a tee shot (ball teed up on the tee box); from anywhere else, including the fairway, it's skipped by club selection.
- **Building walls fixed.** The renderer's wall-facing test had its direction flipped, so the walls facing the camera were never drawn and grass showed between roof and footprint. Fixed in s09 and s09b; the course and putting art were re-rendered.

- **Hole magnification removed.** The radial warp around the pin (below) made a ball passing near the hole slow down and then whip around it, and bent the aim line when it was moved off the hole. The drawing is now a straight map of the physics everywhere. The terrain was never changed.
- **Close-up putting view at 24 px/m** (pipeline s09b layer `close`, 48 m window, files `gNNc*`). Short putts use the closest of close (24 px/m), near (12 px/m) and far (6 px/m) in which ball and hole fit on screen. In the close-up the cup is drawn 4 texels across (about the real 10.8 cm hole plus its lip) and the ball 2 texels, so a ball that looks like it misses does miss. The near and far views keep the larger cup for visibility on long putts.
- **Slope marks** are at most ~0.7 m apart in the close-up (otherwise they crowd the screen).
- **Swing camera.** The first tap still starts the meter at once with no camera move. After the third tap, if the golfer is off screen, the camera pans back to him (about 1 s), shows the backswing, strikes, then follows the ball. If he is on screen the ball is struck immediately as before.

## After the second playtest (2026-10-18)

- **No pan to the golfer on the swing.** The first tap starts the meter at once and the camera stays where it is (replaces "the swing waits for the camera" below; the pan now happens after the third tap, see above).
- **Ball flight plays 1.3x faster** on screen (the physics and hang times are unchanged; only playback speeds up). Putts still play in real time.
- **Yellow misses curve more.** Outside the perfect zone the curve is `max(excess, 0.9 + 0.75 * min(excess, 1.2))` x the club's curve factor, so a yellow (good-band) miss bends at least 0.9-1.8 units instead of 0-1.2. Red misses (excess above about 3.6 % of the bar) are unchanged.
- **Putting graphics, not easier putting.** Physics and the cup size are unchanged. Instead:
  - two putting views per green from the pipeline (s09b): the 6 px/m view for long putts and a 12 px/m close-up for short ones; the camera zooms between them;
  - the ball is drawn smaller than the cup (ball 4 px with outline, cup 7 x 5 px) and the golfer turns see-through while lining up a putt when he would hide the ball;
  - (removed later, see above) the drawn cup is larger than the real one, so near the hole positions were magnified radially around the pin;
  - less clutter near the hole: the flag fades when the ball is within 4 m, slope chevrons and aim dots leave a clear ring around the cup.
- **Units.** With yards selected, putting distances are in whole feet everywhere (info panel, meter labels, putter scale). Putter scales are 12 / 24 / 48 / 80 ft (4 / 8 / 16 / 24 m). Meter labels are whole numbers.
- **Scorecard.** The score row is taller so circles (birdie, filled for eagle) and squares (bogey, filled for double) fit around the number.

## After the first playtest (2026-10-18)

- **Rendering at device resolution.** The canvas now renders at the screen's own resolution and every camera zooms by a whole number (one art pixel = Z x Z screen pixels), above about 4 megapixels at half resolution. The art stays pixel-exact, but the camera and the ball move in screen-pixel steps instead of whole art pixels. This fixes the shaky camera: Phaser's pixel rounding floored every sprite to a whole world pixel (0.5 m), so slow movement (putts, camera easing) stepped and jittered. The camera is a critically damped spring snapped to screen pixels (ui/cameraRig.ts).
- **Putting view.** On the green (putter in hand, ball inside the art window) the camera zooms 3x into a 120 m x 120 m high-resolution drawing of the green and its surroundings at 6 px/m, made by the pipeline (s09b) in the course's style, with its own high-resolution tree sprites. The camera stays still during a putt. Bigger ball and cup, the flag stays in (thins out when the ball is near), the ball visibly drops into the cup. Orange dots on the aim line mark 25/50/75/100 % of the putter scale.
- **Swing meter.** Slower (100 % takes 2.0 / 1.6 / 1.25 s on easy / normal / pro, was 1.2 / 1.0 / 0.8). The cursor starts at the centre of a symmetric accuracy zone (red-yellow-green-yellow-red) and returns through it, so the third tap can miss on either side. A miss left of centre sends the ball left (hook for a right-hander), right of centre sends it right (slice); the direction no longer flips for left-handers, only the name does. Reaching the right end of the bar is maximum power and the meter carries on for the third tap (it used to be a 30 % mishit). No third tap before the left end is the biggest miss to the left. Shanks are gone.
- **Putts take three taps too**; the third sets the start line (up to 6 degrees off, plus a little distance) and the putter's window is 1.4x a full swing's. A putting meter that reaches the end is a full-scale putt (it used to cancel).
- **Swing length.** Full clubs have full / 3/4 / 1/2 / 1/4 swings (the meter's 100 % is that much of the club). It is picked automatically so the needed power lands around 75-90 % of the meter, and can be changed with the scale button or P, like the putter scale.
- **The swing waits for the camera.** The first tap pans back to the golfer if needed; the cursor starts when the camera arrives.
- **Aiming.** A tap of an aim key or button moves the target 1 m sideways at the landing spot (putts: 5 cm at the hole); holding moves it continuously, 3 m/s ramping to 14 m/s (putts 0.25 to 1.2 m/s). It used to be 2 degrees a tap and 40 degrees a second. Dragging the landing marker (or the putt ring) aims; dragging anywhere else looks around the hole without moving the aim.
- **Default aim.** Straight down the hole or at the pin, as before, moved only as far as needed (up to 16 degrees) when a perfect shot down that line would hit a tree, finish in trees, water or out of bounds, or land behind a tree on screen. It does not look for the best line; the player still does that. The landing marker now accounts for elevation (it is where a perfect shot first touches the ground).
- **Wind.** One weather system per round: the speed starts inside the course's range (1-7 mph at Oswego Lake, `wind_mph` in course_config.json) and drifts at most 1.2 mph and 18 degrees from one hole to the next. Easy uses 60 % of the range. Gusts are +-8 % per shot.
- **Roll-out** is about 40 % longer for every club (driver 28 yd on a flat fairway, was 20).
- **Water is still** (no animation frames).
- **Hole fly-over** is slower (cruise 75 m/s, 2.8-7.5 s depending on the hole), eases in and out along the rounded centre line, and cuts back to the tee with a short fade.
- **Leaderboard backup is copy-and-paste text** (import also accepts a file) instead of a file download, because sandboxed frames such as the hosted artifact block downloads.
- **Sharing.** The developer decided that sharing the game with friends is fine as long as it is not monetised; the spec's "personal use only" note is updated.

## Data and pipeline

- **OSM came from developer-supplied GeoPackages, not Overpass.** Overpass, Nominatim and the OSM API are blocked from Claude's sandbox (and robots-disallowed for the fetch tool). The developer uploaded two GDAL-style OSM extracts (`raw/osm_a.gpkg`, `raw/osm_b.gpkg`); `s01_osm.py` merges them (b first, then anything only in a). An Overpass GeoJSON dropped in as `raw/osm.geojson` would work too.
- **Elevation and trees from DOGAMI image services.** The developer downloaded two `exportImage` GeoTIFFs (1 m, EPSG:32610, feet): the bare-earth DTM and the canopy height model (CHM = highest hit − bare earth). Exact request URLs are in `data/oswego_lake/course_config.json` notes and the session log. NAIP imagery did not download, so tree type (conifer/deciduous) is inferred from crown shape only: narrow crowns (r/h < 0.17), tall narrow crowns (h > 28 m, r/h < 0.3) or pointed CHM profiles are conifers. Result: 44% conifers overall, 51% inside the course; nearly every tree over 30 m is a conifer.
- **World extent = course bounding box + ~120 m**, rounded to whole 512 px chunks (1536 × 1024 m), instead of +50 m. The extra ring is scenery (houses, roads, the lake, trees) so the camera never shows empty space near the boundary.
- **Heightmap.** 1 m vertex grid (1537 × 1025). The spec's 16-bit PNG is written to `data/<course>/build/heightmap.png`; the game reads `height.png`, an 8-bit RGB PNG with the 16-bit value split across R and G, because browsers cannot read 16-bit PNG channels exactly. A Gaussian σ = 1 m smooths lidar noise. Ponds are flattened to their 10th-percentile level and tee boxes are levelled (2 m blend).
- **Lake.** Oswego Lake is not in the OSM extract; it is taken from the DTM (flat area below 31 m connected to the minimum) and drawn as off-course water.
- **Greens are an analytic model**, evaluated identically in `pipeline/terrain.py` (art) and `game/src/systems/physics/terrain.ts` (physics): plane fitted to the DTM, tilt clamped to **1–2.5 %** (inside the spec's 1–3 % range; 3 % plus undulations produced spots above 10 %), 1–2 Gaussian undulations ≤ 1.5 %, a pin plateau ≤ 1.5 % within 3 m blending out by 9 m, and a 3 m smoothstep into the surrounding terrain. Max green slope is now 2.8–6.2 % (see `build/greens_report.md`).
- **Fringe is painted above fairway.** The spec's priority (fairway > fringe) erased the collar wherever a fairway touches a green. Every other priority is as specified.
- **Woods inside the course** = contiguous lidar canopy (CHM > 4 m) patches over 150 m²; single trees leave the ground as rough. Off-course woods use CHM > 6 m patches over 400 m² plus OSM `natural=wood/wetland`.
- **Driving range is out of bounds** (configurable with `driving_range_is_ob`).
- **Tee assignment.** Tees carry no colour tags in OSM, so the Blue tee for each hole is chosen by a joint assignment (Hungarian algorithm) over candidate boxes near the hole line: cost = |measured − card| % + 0.05 per metre off the line, boxes over 8 % excluded, one box per hole. This resolves holes 7 and 11, whose OSM lines start on each other's tee complexes.
- **Hole 3** has no mapped tee box near its Blue yardage; the virtual tee is the start of the OSM hole line (171 yd vs 166 on the card, +2.8 %). Open item.
- **Playability step 2 (tee inside its box)** applied to holes 10, 12, 16 and 17 (all were 3.3–3.9 % short from the box centre and are within 0.6 % after the move). Logged in `data/oswego_lake/adjustments.json`. Final Blue total 6,235 yd vs 6,279 on the card (−0.7 %); every hole passes (≤ 3 %).
- **Handicaps** use the GolfPass stroke index. OSM tags hole 18 with handicap 5 (GolfPass: 12); listed as an open item with the golfingrecord.com conflict.
- **Tree shadows and buildings are baked into the terrain art** (the spec makes them runtime sprites). Shadows lie on the ground beneath every object, so baking them is both faster and correctly layered; buildings are drawn in 3/4 view (south walls + two-tone roof) and only ever stand outside the playing lines. Trees themselves stay runtime sprites, depth-sorted.

## Physics

- **Roll-out calibration.** With the table's restitution and "horizontal speed kept" values, a driver landing at ~26 m/s rolled ~70 m. Each club now has a first-bounce retention factor found by bisection (`calibrate.ts`) so flat-fairway roll-out matches the club table exactly (unit-tested). Surface differences still come from the table's `kept` values. Later bounces keep 50 % + 50 % × `kept`.
- **Slope on a rolling ball uses 5/7 g sin θ** (a rolling solid sphere), not g sin θ.
- **A ball comes to rest** when its speed is below 0.05 m/s and the slope pull is below max(static friction, rolling deceleration). With static friction alone, balls crept forever down 10–20 % fairway slopes that grass would hold.
- **Flight progress eases** (`u = 1.3τ − 0.3τ²`), so the ball slows along its path while total flight time still equals the hang time and the apex stays at 55 % of carry.
- **Punch shots** (apex capped under a canopy) shorten hang time by √(capped apex / apex).
- **Canopy hits** have a 0.12 s cooldown so one branch doesn't register several times in consecutive steps.

## Gameplay

- **Putter scale.** The putting meter's 100 % is the active scale — 6, 12 or 25 m on a flat stimp-10 green — auto-picked as the smallest scale ≥ 1.6 × the distance (key P or the button to change). The spec's single 25 m scale gave too little control on short putts.
- **Auto club** picks the putter on the green and on the fringe within 15 m.
- **Mulligan, gimmes, max double par** are casual settings; any of them marks the round casual (separate leaderboard tab).
- **Hole intro and scorecard show the card yardage**; in-play distances are measured.

## Presentation

- **Scaling.** The integer zoom is chosen so the short side of the internal canvas is ~270 px, and the internal resolution then fills the window inside the phone's safe area (no letterbox). Portrait phones get a tall view (e.g. 293 × 633 at 4×). Settings → pixel size nudges the zoom ±1.
- **Drops use 2× camera zoom, putting 3× with its own art**; small sprites (golfer, ball, flag, markers) are drawn at 1/zoom scale so they keep their on-screen size and stay pixel-exact.
- **The camera pans back to the golfer when the swing starts** (tap 1; the meter waits for it) and then follows the ball; while aiming it follows the spec (frame ball + marker, or centre on the marker with an edge arrow to the ball).
- **The ball grows with height** (2 → 3 → 4 px, outlined) so it stays readable in flight.
- **Trees in front of the golfer or ball fade to 42 %.**
- **Slope arrows** are 3 × 3 chevrons every 1.5 m (1 m was unreadably dense at 2 px/m).
- **Swing meter** is the horizontal bar from section 6 (the art-style notes mention a circular arc; the detailed spec wins).
- **Wind arrows** are pre-rendered in 16 directions.

## Tooling

- TypeScript 6.0.3, Vite 8, Vitest 5, Phaser 3.90.0, Playwright 1.56.0 (matches the preinstalled Chromium build).
- `window.__autoplay` (src/dev/autoplay.ts) is a robot golfer used by the Playwright smoke test; it drives the real input path (`PlayScene.tap` with timestamps).
