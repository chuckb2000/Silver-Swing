# Local Golf — Oswego Lake Country Club

A top-down pixel-art golf game played on a real course rebuilt from open data
(OpenStreetMap layout, DOGAMI lidar elevation and trees). Personal project; see
`CLAUDE.md` for the full spec and `DECISIONS.md` for what changed and why.

## Play

```
cd game
npm install
npm run dev          # http://localhost:5173
```

or `make dev` from the repo root. `npm run build` writes a static site to
`game/dist/` that can be served from any static host (it needs a web server;
opening `index.html` from disk won't load the data). The build also writes
`dist/artifact.html`, the same page without its `<html>`/`<head>`/`<body>`
wrapper, for hosts that add their own (the claude.ai artifact).

This is a non-commercial project: share it with friends, but don't sell it or
charge for access.

Scores are saved in the browser you play in. Leaderboard → export gives you
backup text to copy; import (paste or file) restores it on another device.

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

## Rebuild the course or the art

```
make course NAME=oswego_lake   # pipeline/s01..s10: raw/ -> game/public/courses/oswego_lake
make assets                    # sprites, trees, icons, bitmap font (assets-src/)
```

Python needs geopandas, shapely, pyproj, rasterio, pyogrio, scipy,
scikit-image and Pillow (`pip install -r pipeline/requirements.txt`).
Inputs live in `data/oswego_lake/raw/` (OSM GeoPackages, DOGAMI DTM and
canopy-height GeoTIFFs). The yardage check and open items are in
`data/oswego_lake/validation_report.md`.

## Tests

```
make test   # Vitest: physics calibration, swing, rules, full robot round on the real data
make e2e    # Playwright: title -> setup -> play hole 1 to the cup; phone layout
```

## Credits

Map data © OpenStreetMap contributors (ODbL). Elevation and canopy height:
Oregon Department of Geology and Mineral Industries (DOGAMI) lidar. Scorecard:
GolfPass listing. Engine: Phaser 3 (MIT). Sound: ZzFX by Frank Force (MIT).
All sprites, the font and the sounds are generated in code for this project.
Not affiliated with Oswego Lake Country Club.
