"""Hole 13 green (developer 2026-10-19: green "A", left of the pond, where OSM's
hole line and pin end; OSM has no green there). Traced from the OSIP 2022
orthophoto (raw/osip2022_h13.tif, 0.3 m, EPSG:32610) with propose_trace.py's
green method (smooth mown turf connected to the pin, then a green's shape).

    cd pipeline && python3 ../data/willamette_valley/trace_h13.py

Writes proposed/green13.geojson (WGS84) and proposed/green13.png. It goes into
edited/ through edits.json after the developer approves it.
"""
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from shapely.affinity import translate

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from propose_trace import Ortho, green_shape, trace_green  # noqa: E402

CD = Path(__file__).resolve().parent
cfg = json.load(open(CD / "course_config.json"))
W = cfg["world"]
IMG = CD / "raw" / "osip2022_h13.tif"
PIN = (427.707, 229.666)          # OSM pin n9682559882, local metres
T = float(sys.argv[1]) if len(sys.argv) > 1 else 3.5

with rasterio.open(IMG) as r:
    b = r.bounds
box = SimpleNamespace(x0=b.left, y0=b.bottom, width=b.right - b.left, height=b.top - b.bottom)
o = Ortho(IMG, box)
dx, dy = box.x0 - W["x0"], box.y0 - W["y0"]   # image-local -> world-local
seed = (PIN[0] - dx, PIN[1] - dy)
raw = trace_green(o, seed, T)
if raw is None:
    raise SystemExit("no green patch at the pin")
green = translate(green_shape(raw), dx, dy)
print(f"[trace_h13] t={T}: traced {raw.area:.0f} m2 -> green {green.area:.0f} m2, pin inside: {green.contains(__import__('shapely').geometry.Point(PIN))}")

g = gpd.GeoDataFrame([{"osm": "tr_green13", "kind": "green",
                       "tags": json.dumps({"golf": "green", "proposed": "trace", "source": "OSIP 2022 orthophoto (Oregon Statewide Imagery Program)", "hole": "13"}),
                       "geometry": translate(green, W["x0"], W["y0"])}], crs=cfg["epsg"]).to_crs(4326)
g.to_file(CD / "proposed" / "green13.geojson", driver="GeoJSON")

# preview: orthophoto with the traced outline and the pin
rgb = np.clip(o.rgb[..., :3], 0, 255).astype(np.uint8)
S = 2
im = Image.fromarray(rgb).resize((o.W * S, o.H * S), Image.NEAREST)
d = ImageDraw.Draw(im)
to = lambda x, y: ((x - dx) / o.res * S, (box.height - (y - dy)) / o.res * S)  # noqa: E731
d.line([to(*p) for p in green.exterior.coords], fill=(255, 220, 0), width=3)
px, py = to(*PIN)
d.ellipse([px - 6, py - 6, px + 6, py + 6], outline=(255, 0, 0), width=3)
im.crop((int(to(PIN[0] - 45, 0)[0]), int(to(0, PIN[1] + 35)[1]), int(to(PIN[0] + 45, 0)[0]), int(to(0, PIN[1] - 35)[1]))).save(CD / "proposed" / "green13.png")
