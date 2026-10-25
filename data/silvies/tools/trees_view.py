"""Course-chat look helper: build/trees.json over the photo in a box (local metres).
    python3 data/silvies/tools/trees_view.py x0 y0 x1 y1 out.jpg [px_per_m]
Trees: circle of crown radius, yellow = conifer, cyan = deciduous, magenta dots = bushes (c: 3)."""
import json, sys
from pathlib import Path
import numpy as np, rasterio
from rasterio.windows import from_bounds
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parents[1]
cfg = json.load(open(HERE / 'course_config.json')); X0, Y0 = cfg['world']['x0'], cfg['world']['y0']
x0, y0, x1, y1 = [float(v) for v in sys.argv[1:5]]; out = sys.argv[5]; s = float(sys.argv[6]) if len(sys.argv) > 6 else 3
with rasterio.open(HERE / cfg['ortho']['path']) as src:
    a = src.read(window=from_bounds(X0 + x0, Y0 + y0, X0 + x1, Y0 + y1, src.transform), out_shape=(3, int((y1 - y0) * s), int((x1 - x0) * s)))
im = Image.fromarray(np.moveaxis(a, 0, 2)); d = ImageDraw.Draw(im)
for t in json.load(open(HERE / 'build' / 'trees.json')):
    if not (x0 <= t['x'] <= x1 and y0 <= t['y'] <= y1): continue
    px, py = (t['x'] - x0) * s, (y1 - t['y']) * s
    if t['type'] == 'shrub':
        d.ellipse([px - 1.5, py - 1.5, px + 1.5, py + 1.5], fill=(255, 0, 255))
    else:
        r = t['r'] * s
        d.ellipse([px - r, py - r, px + r, py + r], outline=(255, 230, 0) if t['type'] == 'conifer' else (0, 230, 255), width=2)
im.save(out, quality=88)
