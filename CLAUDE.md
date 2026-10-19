Art style:

It's **top-down pixel art**, viewed from directly overhead with a slight
3/4 tilt on vertical objects like trees and the golfer, so you see their
fronts as well as their tops.

**Rendering**

-   Low-resolution sprites scaled up with hard, unfiltered pixel edges.
    The iPad screenshot uses a finer pixel scale with a wider view, but
    the style is the same.

-   Trees are drawn as rounded clumps of foliage with dark outlines and
    two or three tones of shading, highlighted on the upper-left.

-   Shadows are flat, semi-transparent shapes all cast in one diagonal
    direction, which reads as a single sun source.

-   Terrain types are separated by flat color blocks: the darker rough,
    the lighter fairway, the tee box with mowing stripes, white sand
    bunkers, and red-brown flowerbeds. Edges between them are slightly
    jagged.

-   Water uses a small repeating wave pattern rather than
    animation-style detail.

**Color**

-   The palette is saturated and limited, and it changes per course:
    tropical (palms, bright blue water), autumn (orange, red, and yellow
    birches), and temperate forest greens.

-   Shading stays within a few hues per material, with no gradients.

**Characters**

-   The in-play golfer is a tiny sprite, just a few pixels wide, mostly
    a cap and shirt seen from above.

-   A larger, more detailed pixel portrait of the player appears on some
    screens, such as the island hole.

**UI**

-   Orange buttons with a darker bottom edge give them a raised, chunky
    look.

-   Info panels (par, shot, wind) are dark and semi-transparent, with a
    diagonal hatch texture.

-   Text is a rounded, lowercase pixel font with an outline.

-   The swing meter is a circular arc with colored accuracy zones
    (green, yellow, red) at the power and timing points.

Overall it resembles 16-bit-era sports games, updated with a cleaner,
flatter modern indie pixel-art look.

**[Swing Design]{.underline}**

**Core loop: three-tap meter**

1.  **Tap 1 -- start.** A cursor moves left to right across a horizontal
    bar.

2.  **Tap 2 -- power.** Where the cursor stops sets power (0--100%). The
    cursor then reverses back toward the start.

3.  **Tap 3 -- accuracy.** The player taps as the cursor passes a small
    "impact" zone near the start of the bar. The distance from the
    center of that zone sets hook or slice.

If the player never taps 2, the shot auto-fires at a weak mishit. If the
player never taps 3, it is a shank.

**Tuning that makes it feel good**

**Meter speed**

-   Use constant cursor speed. Easing makes the timing hard to read.

-   One full trip should take about 0.9--1.3 s. Use the slower end for
    beginners.

**Power**

-   Distance = club max carry × power. Keep it linear so players can
    learn it ("70% on a 7-iron ≈ 105 yds").

-   Allow an overswing zone from 100% to about 110%. It adds distance
    but shrinks the accuracy window by roughly half, which creates a
    risk/reward choice on every drive.

-   Show a ghost tick at the last shot's power so players can calibrate.

**Accuracy window**

-   Inside a perfect zone of about ±2--3% of the bar width, the shot
    goes straight.

-   Outside it, lateral angle = offset × club factor. The driver gets
    the highest factor and wedges the lowest. A tap that is early in
    time gives a hook, and a late tap gives a slice (mirror this for
    left-handed players).

-   Mishits also lose some distance, around 5--15%, so missing the zone
    always costs something.

-   Scale the window width by:

    -   **Club:** wedges wide, driver narrow.

    -   **Lie:** fairway normal, rough about 0.7×, bunker about 0.5×.

    -   **Equipment and stat upgrades:** this is your progression hook.

**Input handling (matters most on mobile)**

-   Register taps on touch-down, not release.

-   Use the input event timestamp, not the frame the tap was processed
    on. Otherwise frame drops register as player error.

-   Offer an optional latency calibration setting.

**Pre-shot layer (keep it minimal)**

-   **Aim:** drag or arrow keys move a landing marker. Show where a 100%
    shot with the current club lands, before wind.

-   **Club select:** auto-pick the club whose full carry is closest to
    the distance, with manual override.

-   **Spin (optional):** a small ball icon where tapping top or bottom
    adds topspin (roll) or backspin (check). This adds depth without
    changing the swing.

-   **Wind:** display direction and speed, and apply it to the ball in
    flight. Do not alter the meter.

**Putting**

Use a separate two-tap mode with power only. Accuracy timing on putts
feels arbitrary. Let aim plus green slope (arrows or a pixel grid
overlay) carry the skill.

**Difficulty knobs**

In order of impact: meter speed, perfect-zone width, landing-marker
preview on or off, and wind strength.

**Sketch**

js

// on tap 3

const offset = tapPos - impactCenter; // signed, % of bar

const perfect = Math.abs(offset) \<= perfectZone \* lieMult \*
clubWindowMult;

const curve = perfect ? 0 : offset \* club.curveFactor; // degrees

const dist = club.maxCarry \* power \* (perfect ? 1 : 1 - Math.min(0.15,
Math.abs(offset) \* 0.01));

launchBall({ aimAngle: aim + curve, dist, spin, wind });

The design principle is that **power is a planning decision and accuracy
is a skill check**. Keep the two on separate taps with clear feedback
for each, such as a "PERFECT" flash and a distinct sound, so players can
always tell which one they got wrong.

**[Course Design]{.underline}**

**Purpose and scope**

These are instructions to Claude for building each course in the game
from real-world data, so that layouts, terrain and yardages match the
real course.

-   **Goal:** every hole matches the real routing, hazard placement and
    elevation, and its playing length is within tolerance of the
    official scorecard.

-   **Region:** courses near the developer\'s hometown (central
    Maryland). Use Maryland-specific data sources where they are better
    than national ones.

-   **Your role:** write data queries and scripts, clean and validate
    data, compute yardages, produce engine-ready assets, and report
    discrepancies. Manual tracing in QGIS is done by the developer
    unless they say otherwise.

-   **Rule:** never invent course geometry. If a feature is missing from
    the data, flag it as an open item rather than guessing.

**Source data**

Use these sources in priority order. Prefer public-domain or openly
licensed data.

  --------------------------------------------------------------------------
  **Data**     **Source**              **Format**   **License / notes**
  ------------ ----------------------- ------------ ------------------------
  Course       OpenStreetMap via       GeoJSON      ODbL: attribution
  layout       Overpass API / Overpass              required; share-alike
  (first       Turbo                                applies to derived
  choice)                                           databases

  Imagery for  USDA NAIP (\~60 cm) or  GeoTIFF /    Public domain / state
  tracing gaps Maryland iMAP           WMS          open data. Do not trace
               orthoimagery                         Google or Bing imagery

  Elevation    USGS 3DEP 1 m DEM, or   GeoTIFF      Public domain
               Maryland iMAP lidar                  

  Yardages,    Official scorecard      Manual entry Facts; record source and
  par,         (course website,        to CSV       date
  handicap     printed card, BlueGolf)              
  --------------------------------------------------------------------------

Relevant OSM tags:

-   leisure=golf_course: course boundary

-   golf=hole: line from tee to green; tags ref (hole number), par,
    handicap, sometimes dist

-   golf=tee, golf=fairway, golf=green, golf=bunker, golf=rough,
    golf=water_hazard, golf=lateral_water_hazard, golf=cartpath,
    golf=pin

-   natural=water, natural=wood, natural=tree_row, landuse=grass

**Pipeline**

Run these steps per course, in order. Keep all scripts in the repo so
any course can be rebuilt from source.

1.  **Find the course boundary.** Query OSM for the leisure=golf_course
    polygon by name. If it isn\'t found, ask the developer for a
    bounding box.

2.  **Pull OSM golf features.** Write an Overpass query for all golf=\*
    and relevant natural=\* features inside the boundary. Export the
    result as GeoJSON to data/\<course\>/raw/osm.geojson.

3.  **Audit coverage.** Produce a per-hole checklist showing which holes
    have a tee, a golf=hole line, a fairway, a green and hazards. List
    missing or suspect features (for example, a hole line that doesn\'t
    end on a green).

4.  **Fill gaps (developer task).** The developer traces missing
    features in QGIS over NAIP or Maryland iMAP imagery, using the same
    OSM tags. Merge the traces into
    data/\<course\>/edited/course.geojson. Your job is to validate the
    merged file: closed polygons, no self-intersections, every feature
    tagged, every hole numbered 1--18.

5.  **Reproject.** Convert all geometry from WGS84 (EPSG:4326) to UTM
    Zone 18N (EPSG:32618) so coordinates are in meters. Then set the
    origin to the course\'s southwest corner.

6.  **Get elevation.** Download the USGS 3DEP 1 m DEM (or Maryland iMAP
    lidar) tiles covering the boundary plus a 50 m buffer. Mosaic them,
    clip, and reproject to EPSG:32618.

7.  **Build the heightmap.** Resample the DEM to the engine\'s terrain
    grid and export a 16-bit PNG or raw file. Record the min and max
    elevation in metadata so the engine can rescale.

8.  **Add scorecard data.** Load data/\<course\>/scorecard.csv (hole,
    par, handicap, yardage per tee set). Run yardage validation (next
    section).

9.  **Export.** Write engine-ready outputs (see Output formats) and a
    short report listing any open items.

**Yardage validation**

Measure each hole the way courses do, then compare it to the scorecard.
Report every hole; don\'t silently fix mismatches.

-   **How to measure:** start at the center of the tee box for the tee
    set, follow the golf=hole line through each bend point (the dogleg
    turn at the fairway center), and end at the center of the green. Sum
    the segment lengths in projected meters and convert to yards (1 yd =
    0.9144 m).

-   **Horizontal distance only.** Ignore elevation change; scorecards
    do.

-   **Per tee set:** if the course has several tee sets, there must be a
    tee polygon and a measured length for each one.

  -----------------------------------------------------------------------
  **Difference from  **Action**
  scorecard**        
  ------------------ ----------------------------------------------------
  ≤ 3%               Pass. Normal variation from tee placement.

  3--8%              Flag. Check tee assignment and dogleg bend points;
                     suggest a fix.

  \> 8%              Fail. Likely wrong tee, wrong green, or mis-numbered
                     hole. Stop and ask the developer.
  -----------------------------------------------------------------------

Output a table per course: hole, par, scorecard yards, measured yards,
difference (yd and %), status.

**Playability adjustments**

Keep real geometry as the baseline. Prefer tuning in this order, and log
every adjustment per hole in data/\<course\>/adjustments.json with a
reason.

1.  **Gameplay tuning first:** ball physics, roll-out, wind, lie
    penalties, and green speed. These don\'t change the map.

2.  **Tee position:** move the virtual tee anywhere within the real tee
    polygon.

3.  **Surface edges:** widen fairways or shrink rough by up to 5 m per
    side; soften or exaggerate green contours (the 1 m DEM is too coarse
    for real green breaks, so greens are hand-shaped).

4.  **Hole length (last resort):** scale a single hole along its own
    line by at most ±5%. Never apply a global scale to the whole course.

After any change to steps 2--4, re-run yardage validation and show both
real and adjusted yardage in the report.

**Output formats and engine conventions**

-   **Units:** 1 engine unit = 1 meter. Display yardage in the UI by
    converting at runtime.

-   **Axes:** +X = east, +Z = north (or the engine\'s equivalent), Y =
    up. Origin at the course\'s southwest corner in UTM 18N.

-   **Per-course folder** data/\<course\>/:

    -   raw/: untouched downloads (OSM GeoJSON, DEM tiles)

    -   edited/course.geojson: merged, validated layout in WGS84

    -   build/course_local.geojson: reprojected to local meters

    -   build/heightmap.png + heightmap.json (resolution, extent,
        min/max elevation)

    -   scorecard.csv, adjustments.json, validation_report.md

-   **Surfaces:** each polygon carries a surface property (tee, fairway,
    rough, green, bunker, water, woods, cartpath) that maps to a physics
    material and a terrain texture.

-   **Holes:** each hole record has number, par, handicap, tee positions
    per tee set, ordered centerline points, green center, and default
    pin positions.

-   **Rebuildable:** one command (for example, make course
    NAME=\<course\>) regenerates build/ from raw/ and edited/.

**Constraints and legal notes**

-   **Open items:** when data is missing or contradictory (for example,
    a scorecard that doesn\'t match the measured layout), list it in
    validation_report.md and ask. Do not fill gaps with guesses.

**Silver Swings Golf --- Project Spec for Claude**

Read this file at the start of every session. It is the source of truth
for this project. Numbers marked **(tune)** are starting values. Change
them if playtesting shows a better value, and log the change in
DECISIONS.md with the reason.

**0. Current status (update every session)**

-   **Milestone:** M0-M5 implemented in the first session; two
    playtests done and their fixes are in (the developer shot 71 over 18
    in the second); Phase 0 (multi-course support, shared leaderboard,
    hosting) done in the second session; waiting on a third playtest of
    putting to sign off on feel (M2) and on the open items below (M3
    acceptance).

-   **Code and hosting:** private GitHub repo `chuckb2000/silver-swing`
    (default branch `main`). Cloudflare Pages builds and publishes `main`
    on every push and gives other branches preview addresses. The design
    chat works on branches and asks the developer to merge; the
    course-building chat follows docs/COURSE_BUILD.md section 0.

-   **Last session (2026-10-18):** Built the whole game in one pass:
    pipeline steps s01-s10 for Oswego Lake CC (OSM GeoPackages + DOGAMI
    DTM/CHM supplied by the developer), all 18 Blue-tee holes pass
    yardage validation (6,235 yd vs 6,279 card), 7,547 lidar trees,
    generated art/font/sound, Phaser game with three-tap meter, physics,
    USGA relief, scorecard, leaderboard, resume, settings. Then reworked
    it after the developer's first nine-hole playtest: device-resolution
    rendering with a smooth camera (no shake), a zoomed high-resolution
    putting view per green (pipeline s09b), slower symmetric meter with
    max power at the end and miss direction following the meter, three-tap
    putts, swing lengths for short shots, finer aiming and drag-to-look,
    per-round wind (1-7 mph, drifting), more roll-out, still water, and a
    default aim that keeps the ball out of the trees (hole 7) without
    picking the best line. After the second (18-hole) playtest: no camera
    pan on the swing, 1.3x faster flight playback, yellow misses curve
    more, near (12 px/m) and close-up (24 px/m) putting views with the cup
    and ball near true size in the close-up (an earlier magnification
    around the hole was removed: it made balls orbit the cup), decluttered
    hole area, putting in whole feet, scorecard symbols that fit, and a
    camera that returns to the golfer after the third tap to show the
    swing; the driver only off the tee; building walls drawn (they
    were missing). 82 unit tests and 2 Playwright tests pass.
    Deviations are logged in DECISIONS.md. The build is also published as
    a claude.ai artifact (page = game/dist/artifact.html, written by
    `npm run build`).

-   **Session 2 (2026-10-18):** Phase 0. The game is **Silver Swings
    Golf**. Course list `game/public/courses/index.json` (written by
    pipeline s10), course picker on the new-round screen, one course loaded
    at a time (`src/data/courses.ts`), per-course credits / resume /
    leaderboards / tree theme, 9-hole courses (9 holes or 18 twice around;
    `Round.courseHole` vs the scorecard `holeNumber`), and a shared online
    leaderboard (Cloudflare Pages Function + D1, `game/functions`,
    `src/server/scores.ts`, `src/save/online.ts`) next to the local one.
    95 unit tests and 2 Playwright tests pass; the function was also run
    under wrangler with a local D1.

-   **Next task:** the developer binds a D1 database as `DB` to the
    Cloudflare Pages project; then the third playtest (putting, yellow
    misses), the club's printed scorecard and the hole 3 Blue tee box. New
    courses: a separate chat following docs/COURSE_BUILD.md.

-   **Open items:** data/oswego_lake/validation_report.md (hole 3 tee
    not mapped; holes 7/11 OSM lines start on each other's tees;
    stroke-index conflict; tree species inferred without imagery) and
    section 11.4.

**1. Overview**

-   **What it is:** a 2D, top-down pixel-art golf game with a slight 3/4
    tilt, set on real local courses rebuilt from public map, lidar and
    imagery data. The visual reference is **Pixel Pro Golf** (mobile,
    2020). Match its feel, but every asset must be original.

-   **Audience:** personal and non-commercial. The developer decided on
    2026-10-18 that sharing it with friends is fine as long as no money is
    made from it.

-   **Platform:** desktop web browser first (latest Chrome, Firefox,
    Safari, Edge). Mouse and keyboard are primary. Touch should work but
    is secondary.

-   **First course:** Oswego Lake Country Club, Lake Oswego, Oregon
    (section 11).

-   **Claude\'s role:** Claude writes all game code, generates all art
    and sound programmatically, writes the data pipeline, and validates
    course data. The developer playtests, makes the calls on open items,
    and runs any download Claude\'s environment can\'t reach.

**Hard rules**

1.  **Never invent course geometry.** If data is missing or
    contradictory, record it as an open item and ask the developer.

2.  Every asset is original. Never copy sprites, fonts, UI or sound from
    Pixel Pro Golf or any other game.

3.  Everything is rebuildable from source with one command per course.

4.  Physics and rules logic is deterministic and unit-tested (seeded
    RNG, fixed timestep).

**2. Tech stack**

  ---------------------------------------------------------------------------
  **Concern**   **Choice**                        **Why**
  ------------- --------------------------------- ---------------------------
  Game engine   **Phaser 3** (latest 3.x)         Mature 2D browser engine
                                                  with good pixel-art
                                                  support, and Claude knows
                                                  it well

  Language      **TypeScript** (strict)           Catches errors in physics
                                                  and rules code

  Build/dev     **Vite**                          Fast; outputs a static
  server                                          build

  Unit tests    **Vitest**                        Physics calibration, rules,
                                                  swing math

  Smoke/e2e     **Playwright** (Chromium is       Loads the game and plays a
  tests         preinstalled in Claude\'s         scripted hole
                environment)                      

  Data pipeline **Python 3**: geopandas, shapely, Standard GIS tooling
                pyproj, rasterio, numpy, scipy,   
                Pillow; PDAL optional for point   
                clouds                            

  Sprite        Python + Pillow scripts that draw Claude generates the art;
  generation    palette-indexed PNGs from code    it\'s reproducible and easy
                                                  to tweak

  Sound         **ZzFX** (MIT, tiny synth) via    Generated sound, no audio
                Web Audio                         files to source

  Saving        IndexedDB (via idb-keyval), with  Leaderboard and saves
                localStorage fallback             persist locally

  Hosting       **Cloudflare Pages** built from the Free plan, updates on
                GitHub repo (root `game`, build   every push; D1 database
                `npm run build`, output `dist`);  for the shared leaderboard
                Pages Function + D1 for the
                shared leaderboard
  ---------------------------------------------------------------------------

Phaser config: pixelArt: true, roundPixels: true, antialias: false,
Scale mode FIT with **integer zoom only** (compute the largest integer
multiple that fits; letterbox the rest).

**3. Scale and coordinate conventions**

-   **Internal render resolution:** 480 × 270, scaled up by an integer
    (4× = 1920×1080, 3× = 1440×810, 2× = 960×540).

-   **World scale:** **2 pixels = 1 meter** (0.5 m per pixel). At
    480×270 the view shows 240 m × 135 m, so a full driver shot is about
    one screen width. **(tune)**, but changing it means rebuilding all
    course art.

-   **Physics units:** meters, seconds, radians. Convert to yards only
    for display (1 yd = 0.9144 m).

-   **World axes (2D):** x = meters east, y = meters north, z =
    elevation in meters. Screen position: screenX = x \* 2, screenY =
    (worldHeight - y) \* 2 - z_visual, where the ball\'s height above
    the ground (z - terrainZ) is drawn as an upward offset of
    heightAboveGround \* 2 \* 0.7 px. Its shadow stays on the ground.

-   **Origin:** the southwest corner of the course bounding box
    (boundary + 50 m buffer), in UTM. The Oregon course is in **UTM Zone
    10N, EPSG:32610**. Pick each course\'s zone from its longitude.

-   **3/4 tilt:** terrain is drawn straight top-down. Vertical objects
    (trees, golfer, flag, buildings) are drawn as sprites showing front
    and top, anchored at their base and depth-sorted by y so nearer
    objects overlap farther ones.

**4. Art direction**

Generate all art in code (section 2). Put any reference screenshots the
developer provides in reference/ and look at them before doing art work.

**Rendering**

-   Low-resolution sprites with hard, unfiltered pixel edges. No
    smoothing or sub-pixel rendering.

-   Trees are rounded clumps of foliage with dark outlines and 2--3
    tones of shading, highlighted on the upper-left.

-   **Single sun from the upper-left.** Shadows are flat,
    semi-transparent (≈35% black) shapes, all cast toward the
    lower-right at the same angle. Shadow length scales with object
    height.

-   Terrain types are flat color blocks with slightly jagged edges:
    rough (darker), fairway (lighter, with mowing stripes), tee box
    (stripes), green (lightest, fine checker), white sand bunkers with a
    1-px darker lip, water with a small repeating wave pattern (2--3
    frame shimmer at most).

-   **Elevation shown in 2D:** a posterized hillshade (2--3 bands, never
    a smooth gradient) baked lightly into the terrain colors. On greens
    during putting, show a slope-arrow overlay (section 7.6).

-   No gradients anywhere. Use dithering if a transition is needed.

**Color**

-   A limited, saturated palette per course theme. Each theme has ≤ 32
    colors, defined in assets-src/palettes/\<theme\>.json.

-   **Oregon / Pacific Northwest theme** (first course): deep green
    Douglas fir and western red cedar (conical conifers, the majority of
    trees), Oregon white oak and big-leaf maple (rounded deciduous),
    lush green rough, blue-grey water.

-   Planned future themes: autumn and temperate forest.

**Characters**

-   **In-play golfer:** about 12×16 px, mostly cap and shirt seen from
    above at the 3/4 angle. Animation frames: idle, backswing,
    downswing, follow-through, putt stroke. Mirror for left-handed play.

-   **Portrait:** a larger 48×48 pixel portrait on the hole-intro and
    scorecard screens.

-   **Ball:** 2×2 px white ball with a 2×1 px shadow. **Flag:** a 3×16
    px pin with a 2-frame waving flag. **Cup:** 3 px dark ellipse. It is
    drawn larger than real size for visibility, but physics uses the
    real size.

**Off-course surroundings**

Areas outside the course boundary use OSM building footprints (drawn as
pixel roofs with shadows), highway lines (roads, gray) and generic lawn
and trees. Don\'t leave blank space.

**UI**

-   Orange buttons with a darker bottom edge for a chunky, raised look.
    They shift down 1 px when pressed.

-   Info panels (hole, par, distance, shot count, wind, lie) are dark
    and semi-transparent with a diagonal hatch texture.

-   Text uses a rounded, lowercase pixel font with a 1-px dark outline.
    Generate a bitmap font, or use a free pixel font with a verified
    permissive license.

-   **Swing meter:** a horizontal bar (section 6) with colored accuracy
    zones (green perfect, yellow, red), plus a ghost tick for the last
    shot\'s power.

-   A mini-map in a corner shows the whole hole, the ball and the aim
    line.

**5. Data pipeline: building courses from real data**

New courses are built in a separate chat following
`docs/COURSE_BUILD.md` (procedure, ownership split, checks). This section
stays the source of truth for the rules.

**5.1 Source data (priority order; prefer public-domain or openly
licensed data)**

  ------------------------------------------------------------------------------------
  **Data**             **Source**                   **Format**   **License / notes**
  -------------------- ---------------------------- ------------ ---------------------
  Course layout (first OpenStreetMap via Overpass   GeoJSON      ODbL: attribution
  choice)              API                                       required (\"©
                                                                 OpenStreetMap
                                                                 contributors\" in
                                                                 credits)

  Building footprints, OpenStreetMap                GeoJSON      Same
  roads                                                          

  Elevation            **Oregon:** DOGAMI lidar     GeoTIFF /    Public
                       (bare-earth DEM, highest-hit LAZ          
                       DSM) from the DOGAMI Lidar                
                       Data Viewer. **Anywhere in                
                       the US:** USGS 3DEP 1 m DEM               
                       and 3DEP lidar point clouds               

  Imagery for tracing  **USDA NAIP** (≈60 cm,       GeoTIFF      Public domain / state
  and tree detection   4-band including                          open data
                       near-infrared), or a state                
                       program (Oregon Statewide                 
                       Imagery Program)                          

  Developer-uploaded   Any **georeferenced**        GeoTIFF /    Google and Bing
  imagery              GeoTIFF. A plain screenshot  PNG          imagery: visual
                       is also OK if the developer               reference only.
                       gives ≥ 3 control points                  Don\'t extract
                       (pixel ↔ lat/lon) so Claude               geometry from it
                       can georeference it                       (their terms prohibit
                                                                 it)

  Yardages, par,       The club\'s official         Manual entry Record the source and
  handicap,            scorecard (website or        → CSV        date
  rating/slope         printed card). Third-party                
                       sites (GolfPass, BlueGolf)                
                       are fallbacks                             
  ------------------------------------------------------------------------------------

**Network note:** Claude\'s environment may block Overpass, USGS or
DOGAMI downloads. If so, Claude writes the download script and the
developer runs it locally and uploads the files, or the developer
downloads them by hand. Never stall on this; ask.

**5.2 Relevant OSM tags**

-   leisure=golf_course for the boundary (also the default out-of-bounds
    line)

-   golf=hole: a line from tee to green with ref (hole number), par,
    handicap, sometimes dist

-   golf=tee, golf=fairway, golf=green, golf=bunker, golf=rough,
    golf=water_hazard (yellow), golf=lateral_water_hazard (red),
    golf=cartpath, golf=pin, golf=driving_range

-   natural=water, natural=wood, natural=tree, natural=tree_row,
    landuse=grass, building=\*, highway=\*

-   Custom properties added in editing: ob=yes (extra out-of-bounds
    lines inside the boundary), tee_set=\<name\> on tee polygons,
    penalty=red\|yellow to override water defaults

**5.3 Pipeline steps (per course, in order; all scripts live in
pipeline/)**

1.  **Find the boundary.** Query OSM for leisure=golf_course by name. If
    it isn\'t found or is ambiguous, ask the developer for a bounding
    box.

2.  **Pull OSM features.** Get all golf=\*, relevant natural=\*,
    building, highway and landuse features inside the boundary + 150 m.
    Save to data/\<course\>/raw/osm.geojson.

3.  **Audit coverage.** Write a per-hole checklist (tee per tee set,
    hole line, fairway, green, bunkers, water) and list missing or
    suspect features, for example a hole line that doesn\'t end on a
    green, or a missing tee set.

4.  **Fill gaps.** Claude first tries to auto-detect gaps from imagery
    (5.4) and proposes them in data/\<course\>/proposed/\*.geojson. The
    developer reviews, edits or traces in QGIS, and merges everything
    into data/\<course\>/edited/course.geojson. Claude then validates
    it: closed polygons, no self-intersections, every feature tagged,
    holes numbered 1--18, each green has a pin.

5.  **Reproject** to the course\'s UTM zone and shift the origin
    (section 3).

6.  **Elevation.** Get bare-earth DEM tiles covering the boundary + 50 m
    buffer, then mosaic, clip and reproject. Also get a DSM (highest
    hit), or a lidar point cloud, for trees (5.4).

7.  **Heightmap.** Resample the bare-earth DEM to 1 m. Export a 16-bit
    PNG plus heightmap.json (resolution, extent, min/max elevation).

8.  **Shape greens** (5.6).

9.  **Scorecard.** Load scorecard.csv and run yardage validation (5.5).

10. **Rasterize and render** (5.7).

11. **Export** to game/public/courses/\<course\>/ and write
    validation_report.md, including open items.

**5.4 Automatic tree detection**

The developer wants trees placed from real data, not by hand. In order
of preference:

1.  **Lidar canopy height model (best):** CHM = DSM (highest hit) −
    bare-earth DEM. Find individual trees with a local-maximum filter
    whose window grows with canopy height (≈3 m window for short trees,
    ≈8 m for tall conifers), keeping maxima above 4 m. Estimate crown
    radius from the watershed region around each top. Output a tree
    list: {x, y, height_m, crown_radius_m, type}.

2.  **Imagery (NAIP or developer upload with a near-infrared band):**
    NDVI \> ≈0.3 plus a texture or darkness threshold marks canopy. This
    confirms CHM trees and drops false positives (buildings). With
    RGB-only imagery, use a color and texture classifier, with lower
    confidence.

3.  **OSM** natural=tree points and natural=wood polygons as a fallback.
    Fill wood polygons with trees by Poisson-disk sampling at a
    realistic density.

-   **Tree type:** conifer if the crown is narrow relative to its
    height, or if a leaf-off image (when available) still shows green
    there. Otherwise deciduous.

-   Drop any detected tree that falls inside a green, tee, bunker or
    water polygon, and report it.

-   Write trees.json plus a preview PNG overlay for the developer to
    check.

**5.5 Yardage validation**

Measure each hole the way courses do, then compare it to the scorecard.
Report every hole and never silently fix a mismatch.

-   **How to measure:** start at the center of the tee polygon for that
    tee set, follow the golf=hole line through each bend point (the
    dogleg turn at fairway center), and end at the green center. Sum the
    segment lengths in projected meters, then convert to yards.

-   **Horizontal distance only.** Ignore elevation; scorecards do.

-   **Per tee set:** every tee set needs a tee polygon and a measured
    length. Combo tees (e.g. \"Blue/White\") reuse the polygons of their
    parents.

  -----------------------------------------------------------------------
  **Difference from     **Action**
  scorecard**           
  --------------------- -------------------------------------------------
  ≤ 3%                  Pass

  3--8%                 Flag: check the tee assignment and bend points,
                        and suggest a fix

  \> 8%                 Fail: stop and ask the developer
  -----------------------------------------------------------------------

Output a table per course: hole, par, tee set, scorecard yards, measured
yards, difference (yd and %), status.

**5.6 Playability adjustments**

Keep real geometry as the baseline. Tune in this order, and log every
change per hole in data/\<course\>/adjustments.json with a reason:

1.  **Gameplay tuning** (physics, roll-out, wind, lie penalties, green
    speed). This doesn\'t change the map.

2.  **Tee position:** move the virtual tee within the real tee polygon.

3.  **Surface edges:** widen fairways or shrink rough by ≤ 5 m per side.

4.  **Greens:** lidar is too coarse for real green breaks, so greens are
    shaped by script. Fit a plane to the DEM over the green for the
    overall tilt, clamp it to 1--3%, then add 1--2 low-frequency
    undulations (≤ 1.5% local change). Keep a flat area (≤ 2%) at least
    3 m in radius around the pin. Blend into the surrounding terrain
    over 3 m.

5.  **Hole length (last resort):** scale one hole along its own line by
    at most ±5%. Never scale the whole course.

After any change from steps 2--5, re-run validation and show both the
real and adjusted yardage.

**5.7 Rasterization: from GeoJSON to game data and pixels**

1.  **Surface map:** rasterize all polygons into a 0.5 m/pixel,
    1-byte-per-pixel **surface ID map**. Where polygons overlap, the
    higher priority wins: water \> green \> bunker \> tee \> cartpath \>
    fairway \> fringe \> rough \> woods \> ob. Generate fringe as a 1.5
    m ring around each green. Label everything outside the boundary ob.
    **This one map is used for both physics and rendering.** They must
    never disagree.

2.  **Terrain art:** per pixel, look up the surface\'s base palette
    color, then apply:

    -   a dither/noise texture per surface

    -   mowing stripes on fairways and tees (4 m bands aligned with the
        hole line)

    -   a 1-px edge outline between surfaces

    -   the posterized hillshade

    -   wave pattern on water

Bake into 512×512 PNG chunks plus a downsampled mini-map.

3.  **Objects:** trees (sprite chosen and scaled by crown radius,
    minimum 12 px), buildings and the flag are **runtime sprites**,
    depth-sorted, with drop shadows. They are not baked into terrain.

**5.8 Output files (game/public/courses/\<course\>/)**

-   course.json: metadata (name, location, attribution, tee sets with
    rating/slope, theme), world size, and holes\[\]. Each hole has
    number, par, handicap, tee positions per tee set, ordered centerline
    points, green center, pin position, and yardage per tee set (real
    and adjusted).

-   surface.png (indexed surface map) and surface_legend.json

-   height.png (16-bit) and height.json

-   trees.json, buildings.json

-   terrain/chunk\_\<i\>\_\<j\>.png, minimap.png

-   data/\<course\>/ also keeps raw/, edited/, proposed/, build/,
    scorecard.csv, adjustments.json, validation_report.md

make course NAME=\<course\> regenerates everything from raw/ + edited/.

**6. Swing design**

**Design principle:** power is a planning decision and accuracy is a
skill check. Keep them on separate taps with distinct feedback
(\"PERFECT\" flash plus sound, and a visible miss direction), so the
player always knows which one went wrong.

**6.1 Three-tap meter (full shots)**

The bar runs from 0% on the left to 110% on the right. The impact zone
sits near the left end, centered at 5%.

1.  **Tap 1 (start):** the cursor moves right at constant speed.

2.  **Tap 2 (power):** the cursor\'s position sets power (0--110%). The
    cursor reverses and moves left.

3.  **Tap 3 (accuracy):** the player taps as the cursor passes the
    impact zone.

    -   Tap while the cursor is still **right** of the zone center
        (**early**) → **hook** (right-hander: curves left).

    -   Tap after it passes the center (**late**) → **slice** (curves
        right).

    -   Mirror both for left-handed players.

**Missed taps:** no tap 2 before the cursor reaches 110% = auto-fire at
30% power as a mishit. No tap 3 before the cursor passes 0% = **shank**:
40% distance, 35° to the right (mirrored for lefties).

**Input:** space bar, left mouse button, or touch. Register on
key-down/pointer-down, not release. Use the event\'s timeStamp, not
frame time, so dropped frames don\'t count as player error. Offer a
latency calibration setting (± ms offset).

**6.2 Tuning (tune)**

-   **Constant cursor speed.** One full trip from 0% to 110% takes 1.1 s
    on Normal (section 9 has the presets).

-   **Power:** carry = club carry × power, linear (70% of a 7-iron ≈ 101
    m / 111 yd).

-   **Overswing (100--110%):** adds distance linearly up to +8% at 110%,
    but **halves the perfect zone and doubles the curve factor**.

-   **Ghost tick** at last shot\'s power.

-   **Perfect zone:** ±2.5% of bar width (Normal), multiplied by club,
    lie and overswing multipliers.

-   **Outside the perfect zone:**

    -   excess = \|offset\| − perfectHalfWidth (in % of bar)

    -   curveDeg = sign(offset) × min(25, excess × club.curveFactor ×
        overswingMult)

    -   distanceLoss = min(0.15, 0.05 + 0.01 × excess), so any miss
        costs 5--15%

-   Curve is applied as a **bend over the flight**, not an instant
    angle. Lateral offset grows with the square of flight progress. The
    final lateral miss ≈ carry × tan(curveDeg).

ts

// on tap 3

const half = perfectZone \* lie.windowMult \* club.windowMult \*
(overswing ? 0.5 : 1);

const offset = tapPos - IMPACT_CENTER; // signed, % of bar

const excess = Math.max(0, Math.abs(offset) - half);

const curve = excess === 0 ? 0

: Math.sign(offset) \* Math.min(25, excess \* club.curveFactor \*
(overswing ? 2 : 1));

const loss = excess === 0 ? 0 : Math.min(0.15, 0.05 + 0.01 \* excess);

const carry = club.carryM \* powerCurve(power) \* (1 - loss) \*
lie.distMult;

launchBall({ aim, curveDeg: handed(curve), carry, club, spin, wind, lie
});

**6.3 Pre-shot layer**

-   **Aim:** mouse drag/move, or the A/D or arrow keys, moves a landing
    marker. The marker shows where a 100% shot with the current club
    lands on flat ground with no wind. Holding Shift gives fine aim.

-   **Club select:** auto-picks the club whose full carry is closest to
    the distance to the pin (adjusted for lie). Override with W/S or the
    mouse wheel. Lie restrictions apply (7.4).

-   **Spin:** a ball icon. Click its top for topspin (more roll) or its
    bottom for backspin (check/stop). Keys Q/E.

-   **Wind:** shown as an arrow with speed in mph. It affects the ball
    in flight only, never the meter.

**6.4 Putting**

A separate **two-tap power-only** mode, used whenever the putter is
selected (on or off the green):

-   Tap 1 starts the cursor; tap 2 sets power.

-   100% power = the ball rolls **25 m on a flat green at stimp 10**.

-   The aim line and the green\'s slope overlay carry the skill.

-   A light \"lag\" ghost shows last putt\'s power.

**7. Physics (Claude decides; these are the starting model and
calibration targets)**

All physics runs at a **fixed 120 Hz step**, deterministic, with a
seeded RNG per round. Put it in game/src/systems/physics/ with no Phaser
dependency, so it is unit-testable.

**7.1 Clubs: 14-club bag of a solid low-handicap amateur (≈5 handicap)**

  --------------------------------------------------------------------------------------
  **Club**   **Carry   **Carry   **Apex   **Hang   **Fairway    **Curve       **Window
             (yd)**    (m)**     (m)**    (s)**    roll (yd)**  factor        mult**
                                                                (°/%)**       
  ---------- --------- --------- -------- -------- ------------ ------------- ----------
  Driver     245       224.0     28       6.0      20           2.0           0.80

  3-wood     225       205.7     26       5.8      14           1.8           0.85

  5-wood     210       192.0     26       5.7      10           1.6           0.88

  4-hybrid   195       178.3     25       5.6      8            1.4           0.92

  5-iron     180       164.6     25       5.5      7            1.3           0.95

  6-iron     170       155.4     25       5.4      6            1.2           1.00

  7-iron     158       144.5     25       5.3      5            1.1           1.00

  8-iron     146       133.5     24       5.2      4            1.0           1.05

  9-iron     134       122.5     24       5.1      3            0.9           1.10

  PW (46°)   122       111.6     23       5.0      2            0.8           1.15

  GW (50°)   108       98.8      22       4.8      1            0.7           1.20

  SW (56°)   92        84.1      20       4.5      1            0.6           1.25

  LW (60°)   75        68.6      19       4.2      0            0.6           1.25

  Putter     ---       ---       0        ---      ---          0             ---
  --------------------------------------------------------------------------------------

These are carry distances in calm air, on level ground, at 100% power
with a perfect strike. At less than full power, scale apex and hang time
by √power, so partial shots fly lower.

**7.2 Flight model (parametric 3D, rendered in 2D)**

-   The ball has a position (x, y, z). Horizontal progress follows the
    aim direction plus the curve bend. Height above the launch point
    follows an asymmetric arc that peaks at 55% of carry (golf shots
    descend more steeply than they rise). Speed along the path is set so
    flight time = hang time.

-   **Elevation is automatic:** the ball lands when z ≤ terrainZ(x, y).
    Uphill shots land shorter; downhill shots fly farther. Don\'t apply
    separate \"plays-like\" math.

-   **Wind** (constant per hole, small ±10% gusts per shot):

    -   Crosswind drift = crossWind (m/s) × hangTime × 0.3

    -   Headwind reduces carry 1% per mph; tailwind adds 0.5% per mph

    -   Calibration target: 10 mph crosswind moves a 7-iron 7--9 yd

-   **Trees:**

    -   **Trunk** (radius 0.4 m, full tree height): hard collision,
        reflect, restitution 0.5.

    -   **Canopy** (cylinder of crown radius, from 40% of height up to
        full height): each step the ball is inside, chance of hitting a
        branch = 0.15 per meter traveled. On a hit, speed × U(0.3, 0.6),
        direction randomized ±60°, and the vertical component is zeroed
        (the ball drops out of the tree).

**7.3 Bounce and roll**

  --------------------------------------------------------------------------
  **Surface**   **Restitution           **Horizontal speed  **Rolling
                (vertical)**            kept on 1st         deceleration
                                        bounce**            (m/s²)**
  ------------- ----------------------- ------------------- ----------------
  Green (stimp  0.20                    0.55                0.55
  10)                                                       

  Fringe        0.18                    0.50                0.9

  Fairway / tee 0.25                    0.60                1.4

  Rough         0.12                    0.35                3.5

  Woods (pine   0.15                    0.40                2.5
  straw)                                                    

  Bunker        0.00                    0.05                8.0 (stops
                                                            almost dead)

  Cart path     0.50                    0.80                0.6

  Water         Splash; the ball stays  ---                 ---
                in. Penalty (section 8)                     

  Out of bounds Normal bounce, then the ---                 ---
                rules check (section 8)                     
  --------------------------------------------------------------------------

-   **Spin:**

    -   Backspin: first-bounce horizontal speed × 0.6 and rolling
        deceleration × 1.6. Wedges on the green may spin back up to 2 m.

    -   Topspin: horizontal speed × 1.15 and deceleration × 0.75.

    -   From rough, backspin is limited to 30% effect (\"flyer\").

-   **Slope:** add g × sinθ along the downhill gradient of the heightmap
    during roll. The ball stops when speed \< 0.05 m/s **and** the slope
    pull \< static friction (green ≈ 0.05 g, fairway ≈ 0.08 g).

-   **Calibration targets** (as Vitest tests):

    -   Every club\'s carry is within ±2% of the table at 100%, perfect,
        calm, flat.

    -   Roll-out on a flat fairway is within ±40% of the table.

    -   A putt at 100% rolls 25 m ±0.5 m on a flat stimp-10 green.

**7.4 Lies (tune)**

  -------------------------------------------------------------------------
  **Lie**         **Distance mult**       **Accuracy   **Restrictions**
                                          window       
                                          mult**       
  --------------- ----------------------- ------------ --------------------
  Tee             1.00                    1.10         ---

  Fairway         1.00                    1.00         ---

  Fringe          0.97                    0.95         ---

  Rough           0.85 (random            0.70         Driver not allowed;
                  0.80--0.90; occasional               woods × 0.8 extra
                  flyer 1.05)                          

  Woods / under   0.80                    0.60         Max apex limited by
  trees                                                the canopy overhead
                                                       (punch shot)

  Fairway bunker  0.85                    0.55         Driver and woods not
  (\> 30 m from                                        allowed
  green)                                               

  Greenside       0.50 for non-wedges;    0.60         Putter not allowed
  bunker (≤ 30 m  wedges use \"splash\"                
  from green)     carry = 0.45 × club                  
                  carry                                

  Cart path       1.00                    0.90         Free relief offered
                                                       first (8.4)

  Green           ---                     ---          Putter by default;
                                                       chipping allowed
  -------------------------------------------------------------------------

The info panel always shows the current lie and its effect, e.g. \"rough
−15%\".

**7.5 Cup**

-   Real cup radius is 0.054 m. The ball **holes out** if its path
    passes within 0.054 m of the cup center at speed \< 1.3 m/s.

-   A path within 0.054--0.075 m at speed \< 0.6 m/s **lips in**. Faster
    or wider is a lip-out with deflection.

-   Hitting the flagstick is ignored (it\'s always out).

**7.6 Green reading**

While putting, overlay a pixel grid of slope arrows every 1 m. Arrow
length or color shows steepness, in 3 steps (\< 1%, 1--2%, \> 2%).

**8. Rules (USGA Rules of Golf, stroke play)**

Default is strict stroke play. Implement these, each as a pure function
in game/src/systems/rules/ with unit tests. A club-length is 1.14 m
(driver length).

**8.1 Out of bounds (Rule 18.2)**

-   **Default:** stroke and distance. One penalty stroke; replay from
    the previous spot.

-   **Optional setting:** Model Local Rule E-5. Two penalty strokes;
    drop near where the ball went out or on the fairway, no nearer the
    hole.

-   OB = outside leisure=golf_course or past any ob=yes line.

**8.2 Penalty areas (Rule 17)**

A ball at rest in water must take relief, since the game doesn\'t allow
playing from water. One penalty stroke. Options:

-   **Yellow:** (a) stroke and distance; (b) back-on-the-line relief

-   **Red:** the yellow options, plus (c) lateral relief within 2
    club-lengths of where the ball last crossed the edge, no nearer the
    hole

**8.3 Unplayable ball (Rule 19)**

Available anywhere except a penalty area, from a button in the pre-shot
UI. One penalty stroke. Options: stroke and distance, back-on-the-line,
or within 2 club-lengths. In a bunker:

-   the back-on-the-line and 2-club-length options must stay in the
    bunker

-   or, for 2 penalty strokes, back-on-the-line outside the bunker

**8.4 Free relief**

-   **Immovable obstructions (Rule 16.1):** cart paths and buildings
    inside the boundary. Nearest point of complete relief + 1
    club-length, no nearer the hole. The player chooses between taking
    relief and playing it as it lies.

-   **Wrong green (Rule 13.1f):** relief is **required**, using the same
    procedure.

**8.5 Relief procedure (UI)**

1.  Show the relief area as a highlighted region.

2.  The player clicks a point inside it, or accepts the suggested point.

3.  The ball is placed there. A drop that rolls out of the area isn\'t
    simulated.

**8.6 Other rules**

-   **Lost ball:** doesn\'t apply, since the game always knows where the
    ball is.

-   **Holing out:** required. No gimmes in strict mode.

-   **Casual settings** (off by default): gimmes inside 0.6 m, maximum
    score per hole (double par), mulligans. A round played with any
    casual setting is marked **casual** and kept off the main
    leaderboard (section 10).

-   **Scorecard:** track gross score per hole, putts, fairways hit,
    greens in regulation and penalty strokes.

**9. Difficulty presets**

  -----------------------------------------------------------------------------
  **Preset**   **Meter     **Perfect zone  **Landing-marker      **Max wind
               trip (s)**  (±%)**          preview**             (mph)**
  ------------ ----------- --------------- --------------------- --------------
  Easy         1.3         3.5             On                    8

  Normal       1.1         2.5             On                    15

  Pro          0.9         1.8             Off                   22
  -----------------------------------------------------------------------------

Wind per hole: direction is uniform random. Speed is weighted toward
calm (≈60% of holes below half the max). It is seeded per round.

**10. Game structure**

**10.1 Screens**

1.  Title → **Play** / Leaderboard / Settings / Credits

2.  Choose a state → choose a course (cards with a crop of the course
    art and the course's logo; see DECISIONS.md) → new round: tees (default
    **Blue** for the first course) → round length (18 / front 9 / back 9;
    a 9-hole course: 9 / 18 twice around) → difficulty → player name

3.  **Hole intro:** hole number, par, yardage and handicap; golfer
    portrait; a skippable flyover from the tee to the green.

4.  **Play**

5.  **Hole complete:** score name (birdie etc.) and running total

6.  **Round summary:** full scorecard and stats. Save to the
    leaderboard.

**10.2 Modes**

-   **M1--M5:** single player

-   **Later:** local pass-and-play for up to 4 players, and a practice
    range plus a practice green

**10.3 Camera**

-   **Aiming:** frame the ball and the landing marker together. If they
    don\'t fit at 1×, center on the marker with an edge arrow pointing
    back to the ball.

-   **In flight:** follow the ball with smoothing (lerp 0.12 per frame)
    and look ahead in its direction of travel. Hold briefly on the
    landing, then pan back to the golfer for the next shot.

-   **Putting:** 2× zoom centered between ball and cup. Use integer zoom
    levels only (1×, 2×).

-   **Overview:** press Tab (or a button) to show a full-screen
    pre-rendered mini-map of the hole.

**10.4 Saving and leaderboard**

Stored locally in IndexedDB. On the hosted site, finished rounds are also
sent to a shared online leaderboard for everyone who plays there (the
"friends" tab; no accounts or anti-cheat, by the developer's choice); the
local leaderboard stays as the offline copy.

-   **Leaderboard:** one board per course × tee set × round length,
    filterable by difficulty. Each entry has player name, date, gross
    score, score to par, difficulty, full hole-by-hole scorecard and
    stats.

-   **Ranking:** lowest gross wins; ties broken by the back-9 score
    (standard countback), then by date. Casual rounds go on a separate
    \"casual\" tab.

-   **Personal bests:** per player, per course.

-   **Round in progress:** auto-saved after every shot so a closed tab
    can be resumed.

-   **Settings:** handedness, difficulty, units (yd/m), latency offset,
    master volume/mute.

-   **Export/import:** the leaderboard as JSON, as a backup.

**10.5 Audio (low priority; generated with ZzFX)**

-   **Required:**

    -   swing whoosh

    -   ball strike, with a sharper variant for a PERFECT strike and a
        soft tick for putts

-   **Nice to have:**

    -   cup drop

    -   splash

    -   quiet looping outdoor ambience (generated wind noise plus
        occasional synthesized bird chirps)

-   Master volume and mute in settings. Respect browser autoplay rules:
    start audio on the first user input.

**11. First course: Oswego Lake Country Club**

**11.1 Facts**

-   **Location:** Lake Oswego, Clackamas County, Oregon

-   **Original design:** H. Chandler Egan, 1924. Later work by John
    Harbottle III and by Bill and John F. Robinson (1992).

-   **Par:** 71

-   **UTM zone:** 10N (EPSG:32610)

-   **Elevation data:** DOGAMI lidar covers the Portland metro area. Use
    its bare-earth DEM and highest-hit DSM.

-   **Terrain:** expect hilly terrain and dense conifers. The tree
    pipeline (5.4) matters here.

**11.2 Scorecard**

Source: GolfPass, retrieved 2026-10-18. **Must be verified against the
club\'s official card** (see 11.4).

  --------------------------------------------------------------------------------------------
  **Hole**    **Par**   **HCP (GolfPass)**     **Black**   **Blue**    **White**   **Red**
  ----------- --------- ---------------------- ----------- ----------- ----------- -----------
  1           5         5                      539         533         488         461

  2           4         3                      419         408         351         332

  3           3         13                     183         166         137         107

  4           4         11                     363         354         312         305

  5           5         9                      482         471         455         412

  6           4         1                      436         419         408         402

  7           4         7                      347         338         324         259

  8           3         15                     200         180         166         159

  9           4         17                     399         382         368         331

  **Out**     **36**                           **3,368**   **3,251**   **3,009**   **2,768**

  10          5         16                     447         440         430         379

  11          3         10                     199         190         177         154

  12          4         2                      426         399         390         382

  13          4         8                      381         342         326         276

  14          3         18                     150         137         125         100

  15          4         4                      442         425         410         345

  16          4         14                     417         401         380         337

  17          3         6                      191         175         165         155

  18          5         12                     536         519         498         452

  **In**      **35**                           **3,189**   **3,028**   **2,901**   **2,580**

  **Total**   **71**                           **6,557**   **6,279**   **5,910**   **5,348**
  --------------------------------------------------------------------------------------------

-   **Ratings/slopes (GolfPass):** Black 72.9/134, Blue 71.4/133, White
    69.4/131, Red (women) 72.2/128.

-   **Combo tees** listed by GolfPass: Black/Blue 6,394; Blue/White
    6,036; White/Red 5,598. Build these only if the developer wants
    them.

**11.3 Default tee**

Blue (6,279 yd) suits the club distances in 7.1.

**11.4 Known open items**

1.  **Handicap order conflict.** A second source (golfingrecord.com)
    gives a different stroke-index order (e.g. hole 5 = 1, hole 6 = 9)
    and Blue rating/slope 70.4/132. Confirm against the official card.

2.  **Red tee par.** GolfPass lists 73 for the women\'s tees in one
    table and 71 in another. Confirm.

3.  **OSM coverage** for this course is unknown until step 5.3.3 runs.

4.  **Water.** Confirm whether any holes play along Oswego Lake or have
    ponds or creeks, and whether each is red or yellow.

**12. Repository layout**

/CLAUDE.md ← this file

/DECISIONS.md ← log of tuning and design changes, with reasons

/docs/COURSE_BUILD.md ← runbook for building a new course

/game/functions/api/scores.ts ← Cloudflare Pages Function: shared leaderboard

/game/public/courses/index.json ← the course list (written by pipeline s10)

/Makefile ← make dev \| make test \| make course NAME=x \| make assets

/reference/ ← developer screenshots (art reference only)

/game/ ← Vite + Phaser + TS

src/scenes/ ← Boot, Title, CourseSelect, HoleIntro, Play, Summary,
Leaderboard, Settings

src/systems/physics/ ← pure TS, no Phaser

src/systems/rules/ ← pure TS, no Phaser

src/systems/swing/ ← meter logic, pure TS

src/data/clubs.ts ← table 7.1

src/ui/ src/audio/ src/save/

public/courses/\<course\>/ ← pipeline output

public/sprites/ ← generated sprite sheets

tests/ ← vitest + playwright

/assets-src/ ← Python sprite/palette/font generators

/pipeline/ ← Python GIS scripts (one per step in 5.3)

/data/\<course\>/ ← raw, edited, proposed, build, scorecard.csv,
adjustments.json, validation_report.md

**13. Milestones**

Do one milestone at a time. At the end of each:

-   update section 0

-   run all tests

-   give the developer a short \"how to try it\" note

  ----------------------------------------------------------------------------
  **\#**   **Milestone**                              **Done when**
  -------- ------------------------------------------ ------------------------
  M0       Scaffold: repo, Vite + Phaser + TS,        make dev shows a title
           Makefile, Vitest + Playwright, empty       screen; make test passes
           scenes                                     

  M1       **Test hole:** a synthetic par-4 (flat,    A hole can be played
           hand-made polygons), placeholder art, full start to finish; physics
           swing meter, flight, bounce, roll,         calibration tests pass
           putting, holing out                        

  M2       Feel pass: generated art style (section    The developer signs off
           4), camera, UI panels, wind, lies, spin,   on feel
           trees, sound                               

  M3       Pipeline: Oswego Lake CC data, tree        All 18 holes pass or
           detection, validation report, rendered     have been explicitly
           course                                     accepted by the
                                                      developer

  M4       Rules and structure: USGA penalties and    Rules unit tests pass; a
           relief, scorecard, screen flow, settings   full 18 is playable

  M5       Saving: leaderboard, personal bests,       Scores persist across
           resume round, export/import                reloads

  M6+      Practice range, pass-and-play, more        ---
           courses, more themes                       
  ----------------------------------------------------------------------------

**14. Legal and attribution**

-   Non-commercial: no sales, ads or paid access. Sharing with friends is
    fine (developer's decision, 2026-10-18). No club logos or trademarks.

-   The credits screen says: \"Map data © OpenStreetMap contributors
    (ODbL)\", plus USGS, DOGAMI and USDA NAIP as used.

-   No club logos, trademarks or official course imagery in the game.

-   Pixel Pro Golf is a style reference only. Nothing is copied from it.
