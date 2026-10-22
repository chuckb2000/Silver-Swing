"""Propose the course's out-of-bounds line (course-chat tool, not a `make course` step).

    python3 data/lake_oswego_muni/make_boundary.py      # after s02

OSM's `leisure=golf_course` (way 60087783) is the city's whole golf property, mapped
before the rebuild: it holds the Lake Oswego Recreation and Aquatics Center, its
construction yard and stormwater pond, and the clubhouse. The city's course map
(release muni-data, Screenshot 2026-10-22 122955; look only) draws the course's edge
along the north side of the aquatics center. This keeps the OSM line on the north, west
and east, and cuts it along that edge as the OSIP 2024 photo shows it: the construction
fence and path north of the center, around the turf west of the clubhouse (the hole 1
tee), and east past the clubhouse to the OSM east edge. The driving range stays inside
and is out of bounds by its own polygon (`driving_range_is_ob`).

Writes proposed/boundary.geojson (WGS84, one `leisure=golf_course` polygon, id
`prop_boundary`) and proposed/boundary.png (OSM line orange, proposal red).
"""
import json
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, mapping
from shapely.ops import transform

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from common import World, load_config  # noqa: E402

# the cut, local metres (world origin 524034, 5026969): everything south of this line goes
CUT = [(245, 0), (245, 250), (260, 286), (290, 293), (330, 300), (370, 301), (395, 308), (415, 328),
       (440, 352), (455, 358), (474, 358), (474, 383), (700, 383), (700, 0)]


def main():
    cfg = load_config("lake_oswego_muni")
    w = World(cfg)
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    osm = g[g.kind == "boundary"].geometry.iloc[0]
    new = osm.difference(Polygon(CUT))
    if new.geom_type != "Polygon":
        new = max(new.geoms, key=lambda p: p.area)
    new = new.simplify(0.05)
    print(f"[boundary] OSM {osm.area / 1e4:.2f} ha -> proposal {new.area / 1e4:.2f} ha")

    from pyproj import Transformer
    tr = Transformer.from_crs(f"EPSG:{cfg['epsg']}", "EPSG:4326", always_xy=True)
    ll = transform(lambda x, y: tr.transform(np.asarray(x) + w.x0, np.asarray(y) + w.y0), new)
    fc = {"type": "FeatureCollection", "features": [{
        "type": "Feature", "id": "prop_boundary", "geometry": mapping(ll),
        "properties": {"@id": "prop_boundary", "leisure": "golf_course", "name": cfg["boundary_name"],
                       "source": "OSM way 60087783 cut along the north side of the aquatics center (OSIP 2024 photo)",
                       "proposed": "course chat 2026-10-22"}}]}
    (HERE / "proposed").mkdir(exist_ok=True)
    json.dump(fc, open(HERE / "proposed" / "boundary.geojson", "w"), indent=1)

    with rasterio.open(HERE / cfg["ortho"]["path"]) as r:
        im = Image.fromarray(r.read().transpose(1, 2, 0)).convert("RGB")
    res = 0.32
    d = ImageDraw.Draw(im)

    def px(p):
        return [(x / res, (w.height - y) / res) for x, y in p.exterior.coords]
    d.line(px(osm), fill=(255, 150, 0), width=4)
    d.line(px(new), fill=(230, 20, 20), width=4)
    im.crop((int(140 / res), int((w.height - 680) / res), int(640 / res), int((w.height - 200) / res))).save(
        HERE / "proposed" / "boundary.png")


if __name__ == "__main__":
    main()
