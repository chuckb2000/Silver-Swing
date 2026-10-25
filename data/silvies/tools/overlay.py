"""Course-chat look helper: the OSIP photo with OSM outlines and labels over a box (local metres).
    python3 data/silvies/tools/overlay.py x0 y0 x1 y1 out.png [px_per_m]"""
import json, sys
import numpy as np, rasterio, geopandas as gpd
from rasterio.windows import from_bounds
from PIL import Image, ImageDraw
HERE = __import__('pathlib').Path(__file__).resolve().parents[1]
cfg = json.load(open(HERE / 'course_config.json'))
X0w, Y0w = cfg['world']['x0'], cfg['world']['y0']
x0, y0, x1, y1 = [float(v) for v in sys.argv[1:5]]
out = sys.argv[5]; ppm = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
with rasterio.open(HERE / cfg['ortho']['path']) as s:
    w = from_bounds(X0w + x0, Y0w + y0, X0w + x1, Y0w + y1, s.transform)
    a = s.read(window=w, out_shape=(3, int((y1 - y0) * ppm), int((x1 - x0) * ppm)))
im = Image.fromarray(np.moveaxis(a, 0, 2)).convert('RGB'); d = ImageDraw.Draw(im)
g = gpd.read_file(HERE / 'build' / 'course_local.geojson')
def P(x, y): return ((x - x0) * ppm, (y1 - y) * ppm)
col = {'green': (255, 0, 255), 'tee': (0, 255, 255), 'fairway': (255, 255, 0), 'bunker': (255, 128, 0), 'boundary': (255, 0, 0), 'lateral_water_hazard': (0, 128, 255), 'cartpath': (200, 200, 200), 'rough': (160, 255, 160)}
for _, r in g.iterrows():
    gm = r.geometry; k = r.kind
    if gm is None: continue
    if k in col:
        for p in getattr(gm, 'geoms', [gm]):
            if p.geom_type == 'Polygon':
                d.line([P(*c) for c in p.exterior.coords], fill=col[k], width=1)
            elif p.geom_type == 'LineString':
                d.line([P(*c) for c in p.coords], fill=col[k], width=1)
    if k == 'hole':
        d.line([P(*c) for c in gm.coords], fill=(255, 40, 40), width=2)
        tags = r.tags if isinstance(r.tags, dict) else json.loads(r.tags)
        sx, sy = P(*gm.coords[0]); d.rectangle([sx - 1, sy - 1, sx + 14, sy + 10], fill=(0, 0, 0)); d.text((sx + 1, sy), str(tags.get('ref')), fill=(255, 80, 80))
    if k == 'green':
        c = gm.centroid; px, py = P(c.x, c.y); d.text((px + 6, py - 4), r.osm[-3:], fill=(255, 255, 255))
# metre grid every 100 m
for gx in range(int(x0 // 100 + 1) * 100, int(x1), 100):
    d.line([P(gx, y0), P(gx, y1)], fill=(255, 255, 255), width=1); d.text(P(gx + 2, y1 - 2), str(gx), fill=(255, 255, 255))
for gy in range(int(y0 // 100 + 1) * 100, int(y1), 100):
    d.line([P(x0, gy), P(x1, gy)], fill=(255, 255, 255), width=1); d.text(P(x0 + 2, gy + 8), str(gy), fill=(255, 255, 255))
im.save(out)
