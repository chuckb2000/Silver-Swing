# Silver Swings Golf

A top-down pixel-art golf game played on real courses rebuilt from open data
(OpenStreetMap layout, lidar elevation and trees). First course: Oswego Lake
Country Club. Personal, non-commercial project for friends; see `CLAUDE.md`
for the full spec, `DECISIONS.md` for what changed and why, and
`docs/COURSE_BUILD.md` for adding a course.

## Play

The site is built and published by Cloudflare Pages from this repository's
`main` branch on every push (project settings: root directory `game`, build
command `npm run build`, output `dist`; Node 22 from `game/.node-version`).
Other branches get their own preview address.

Locally:

```
cd game
npm install
npm run dev          # http://localhost:5173
```

or `make dev` from the repo root. `npm run build` writes the static site to
`game/dist/` (it needs a web server; opening `index.html` from disk won't load
the data). The build also writes `dist/artifact.html`, the same page without
its `<html>`/`<head>`/`<body>` wrapper, for hosts that add their own (the
claude.ai preview).

## Courses

`game/public/courses/index.json` lists the courses the game offers; each
course's files are in `game/public/courses/<id>/`, written by the pipeline
(`make course NAME=<id>`, whose last step also updates the list). The course is
picked on the new-round screen and only that course is loaded. 18-hole courses
offer 18 holes, front 9 or back 9; 9-hole courses offer 9 holes or 18 (twice
around).

## Leaderboard

Each device keeps its own leaderboard (export / import as text from the
leaderboard screen). On the Cloudflare site there is also a shared
leaderboard for everyone who plays there ("friends" tab): finished rounds are
sent to it automatically, including rounds played before it existed or while
offline. It is a Cloudflare Pages Function (`game/functions/api/scores.ts`,
logic in `game/src/server/scores.ts`) storing rounds in a Cloudflare D1
database, which must be bound to the Pages project as `DB` (Settings →
Bindings, for Production and Preview). The table is created on first use.
Without that binding, or when running locally with Vite, the game simply
shows this device's leaderboard. To try the function locally:
`npx wrangler pages dev dist --d1 DB=local` from `game/` after a build.

### Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Aim | drag the landing marker (putts: the ring), or tap the `<` `>` buttons | A / D or ← / → (tap: 1 m at the target; hold to move faster; Shift for fine) |
| Look around the hole | drag anywhere else (the aim stays put) | — |
| Club | `^` `v` buttons or mouse wheel | W / S or ↑ / ↓ |
| Swing length / putter scale | `full` / `3/4` / `1/2` / `1/4` button (putter: distance) | P |
| Spin (top / back) | ball button | Q / E |
| Swing: start, power, accuracy | swing button, then tap anywhere | Space (three presses) |
| Skip intro / fast-forward | tap | Space |
| Hole overview map | `map` button | Tab or M |
| Scorecard | `card` button | C |
| Unplayable ball | `unplayable` button | U |
| Pause / settings | — | Esc |

Swing (putts too): the first tap starts the cursor at the centre of the
green accuracy zone; the second tap sets the power as it runs right
(100–110 % is overswing). The cursor then comes back through the zone: tap
inside the green band for a straight shot. Tapping left of centre sends the
ball left, right of centre sends it right. If the cursor reaches the right
end it turns back by itself at full power. Short shots get a shorter swing
automatically (shown on the swing-length button) so you are never rushed.

Putting zooms into a detailed view of the green with slope chevrons, as
close as the putt allows (three scales). On short putts the cup and ball are
drawn at about their real size, so if the ball looks like it misses, it
misses. Putt distances are in feet (metres with metric units), and orange
dots on the aim line mark 25 / 50 / 75 / 100 % of the putter scale
(12 / 24 / 48 / 80 ft).

## Rebuild a course or the art

```
make course NAME=oswego_lake     # pipeline/s00..s10: raw/ (+ edited/) -> game/public/courses/oswego_lake (+ index.json)
make course NAME=highland_links  # needs the release downloads first (below)
make assets                      # sprites, trees of every theme, icons, bitmap font (assets-src/)
```

Python needs geopandas, shapely, pyproj, rasterio, pyogrio, scipy,
scikit-image, Pillow and laspy with lazrs (`pip install -r pipeline/requirements.txt`).
Inputs live in `data/<course>/raw/`: Oswego Lake has OSM GeoPackages and
DOGAMI DTM / canopy-height GeoTIFFs in git. Highland Links' DEM tile and lidar
zip are too big for git; download them from the GitHub release
`data-highland-links` into `data/highland_links/raw/` (unzip the lidar into
`raw/laz_dav/`), as listed in `data/highland_links/DATA_REQUEST.md`. The yardage
check and open items are in `data/<course>/validation_report.md`.

## Tests

```
make test   # Vitest: physics, swing, rules, every course in index.json (files + robot round), 9-hole rounds, shared leaderboard server
make e2e    # Playwright: title -> setup -> play hole 1 to the cup; phone layout
```

## Credits

Map data © OpenStreetMap contributors (ODbL). Per-course data sources
(elevation, canopy height, scorecard) are listed in each course's
`course.json` and shown on the credits screen; Oswego Lake uses Oregon
Department of Geology and Mineral Industries (DOGAMI) lidar and a GolfPass
scorecard listing. Engine: Phaser 3 (MIT). Sound: ZzFX by Frank Force (MIT).
All sprites, the font and the sounds are generated in code for this project.
Not affiliated with any club.
