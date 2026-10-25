"""Course-chat look helper (COURSE_LESSONS.md 15): channels in the bare-earth DEM, mapped or
not. Height minus a 25 m running median; cells below -0.25 m red, over a hillshade, with
OSM water, streams and hole lines. Writes proposed/channels.png.
    python3 data/silvies/tools/channels.py"""
import json
from pathlib import Path
import numpy as np, geopandas as gpd
from scipy import ndimage
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parents[1]
h = np.load(HERE / 'build' / 'height_base.npy')[::-1]   # rows south->north -> north->south
med = ndimage.median_filter(h[::2, ::2], size=13)
med = np.kron(med, np.ones((2, 2)))[:h.shape[0], :h.shape[1]]
rel = h - med
gy, gx = np.gradient(h)
shade = np.clip(128 + 400 * (-gx - gy) / np.sqrt(2), 0, 255).astype(np.uint8)
rgb = np.stack([shade] * 3, -1)
rgb[rel < -0.25] = [220, 40, 40]
rgb[rel < -0.6] = [255, 0, 0]
im = Image.fromarray(rgb)
d = ImageDraw.Draw(im)
g = gpd.read_file(HERE / 'build' / 'course_local.geojson')
H = h.shape[0]
P = lambda x, y: (x, H - y)
for _, r in g.iterrows():
    gm = r.geometry
    if r.kind in ('lateral_water_hazard', 'water_hazard', 'water'):
        for p in getattr(gm, 'geoms', [gm]):
            d.line([P(*c) for c in p.exterior.coords], fill=(0, 120, 255), width=3)
    elif r.kind in ('waterway',):
        for l in getattr(gm, 'geoms', [gm]):
            d.line([P(*c) for c in l.coords], fill=(0, 200, 255), width=2)
    elif r.kind == 'hole':
        d.line([P(*c) for c in gm.coords], fill=(255, 220, 0), width=2)
    elif r.kind == 'green':
        d.line([P(*c) for c in gm.exterior.coords], fill=(0, 255, 0), width=2)
    elif r.kind == 'boundary':
        for p in getattr(gm, 'geoms', [gm]):
            d.line([P(*c) for c in p.exterior.coords], fill=(255, 150, 0), width=3)
im.resize((1024, 1024)).save(HERE / 'proposed' / 'channels.png')
