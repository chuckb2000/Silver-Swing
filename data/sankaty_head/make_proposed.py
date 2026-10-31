"""Proposals for Sankaty Head's edits.json (course chat, 2026-10-31). Writes proposed/sankaty.geojson.

    python3 data/sankaty_head/make_proposed.py

Every feature comes from mapped OSM geometry or from a point on a hole line, never drawn freehand:

- p_range: the practice ground east of the clubhouse as one driving range (OB, standing default):
  the union of OSM's field outline (w871621737, golf=rough), its striped hitting area
  (w871621736, golf=fairway) and the strip at its north-east end (w871621735, golf=fairway).
- p_tee9_back / p_tee9_fwd: the two mown tee pads of hole 9 just south of Polpis Road, mapped in OSM
  as golf=fairway (w843609205, w843609206); NAIP shows them as tee rectangles, and the 9th's line
  starts on the back one.
- p_path_<osm>: every golf=path line (64; highway=path/footway) as a cart path: the light
  crushed-shell/sand cart paths in NAIP (2-3 m wide). A tag edit can't do it (merge_edits sets tags
  but keeps s01's kind, and golf=path is "golf_other"), so they are copied with kind cartpath and
  the originals dropped.
- p_sea: the Atlantic polygon OSM tags golf=lateral_water_hazard (w843610721, 3 km2, almost all
  outside the boundary; the audit's "neighbour's penalty area"), as plain natural=water: beyond the
  boundary it is out of bounds and drawn as sea.
- p_tee1, p_tee12: tee boxes on the mown "infinity" tees (Urbina's restoration lowered the tees to
  fairway height: LINKS Magazine) where the hole line starts: a 12 x 8 m box (hole 1, on the mown
  lobe north of the practice putting green) and a 20 x 6 m box (hole 12, on the narrow mown strip
  west of the 11th green), each along the line's first segment and centred on its start
  point, checked against NAIP to lie on the mown grass.
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely import affinity
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

D = Path(__file__).resolve().parent
EPSG = 32619
g = gpd.read_file(D / "raw" / "osm.geojson").to_crs(EPSG)
g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
by = {r.osm: r for r in g.itertuples()}


def hole_line(ref):
    return [r.geometry for r in g.itertuples() if r.kind == "hole" and r.tags.get("ref") == str(ref) and r.tags.get("name")][0]


def tee_box(ref, length, width, forward_shift=0.0):
    """A box `length` along the hole's first segment (back edge at the line start), `width` across."""
    L = hole_line(ref)
    (x0, y0), (x1, y1) = L.coords[0], L.coords[1]
    ang = np.degrees(np.arctan2(y1 - y0, x1 - x0))
    b = box(-length / 2, -width / 2, length / 2, width / 2)
    b = affinity.rotate(b, ang, origin=(0, 0))
    d = length / 2 - forward_shift
    return affinity.translate(b, x0 + d * np.cos(np.radians(ang)) - 0.0, y0 + d * np.sin(np.radians(ang)))


feats = [
    ("p_range", "driving_range", {"golf": "driving_range", "source": "OSM w871621737+w871621736+w871621735 (course chat)"},
     unary_union([by["w871621737"].geometry, by["w871621736"].geometry, by["w871621735"].geometry]).buffer(0)),
    ("p_tee9_back", "tee", {"golf": "tee", "source": "OSM w843609205 (golf=fairway), retagged"}, by["w843609205"].geometry),
    ("p_tee9_fwd", "tee", {"golf": "tee", "source": "OSM w843609206 (golf=fairway), retagged"}, by["w843609206"].geometry),
    # each box centred on its line start, so its deepest point (the virtual tee) is the start
    ("p_tee1", "tee", {"golf": "tee", "source": "course chat: box on the mown tee at the hole 1 line start (NAIP)"}, tee_box(1, 12, 8, 6)),
    ("p_tee12", "tee", {"golf": "tee", "source": "course chat: box on the mown strip at the hole 12 line start (NAIP)"}, tee_box(12, 20, 6, 10)),
]
feats.append(("p_sea", "water", {"natural": "water", "source": "OSM w843610721 (golf=lateral_water_hazard), as natural=water"}, by["w843610721"].geometry))
for r in g.itertuples():
    if r.tags.get("golf") == "path":
        feats.append((f"p_path_{r.osm}", "cartpath", {**r.tags, "golf": "cartpath", "source": f"OSM {r.osm} golf=path, as a cart path"}, r.geometry))
out = gpd.GeoDataFrame({"osm": [f[0] for f in feats], "kind": [f[1] for f in feats],
                        "tags": [json.dumps(f[2]) for f in feats]}, geometry=[f[3] for f in feats], crs=EPSG).to_crs(4326)
(D / "proposed").mkdir(exist_ok=True)
out.to_file(D / "proposed" / "sankaty.geojson", driver="GeoJSON")
for f in feats[:5]:
    print(f[0], f[1], round(f[3].area), "m2")
