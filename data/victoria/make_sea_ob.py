"""Split the sea into the part inside the course's out-of-bounds line (a red penalty area) and
the part beyond it (out of bounds, drawn as water), and extend the boundary over the first part.
Course-chat helper, not a make step.

    python3 data/victoria/make_sea_ob.py   ->  proposed/sea_split.geojson, proposed/boundary_sea.geojson

Developer, 2026-10-31: "the ocean is a water hazard, not out of bounds" (a Street View photo of the
red stakes along the shore), then a drawing of the out-of-bounds line: from the coast below the 7th
due east to the edge of the world (about y 596 -> 569 m local), and from the coast at the 3rd south
to the world edge (x about 202-215 m). The sea south-east of those two lines is inside the line
(red penalty area, `sea_in`); the bay north of the east line (beside 7, 13 and 14, behind the Beach
Drive houses) and the sea west of the south line stay out of bounds (`sea_out`, natural=water outside
the boundary: s08 paints it ob_water). "Don't put OB stakes in the water": `sea_out` is listed in
config `no_stakes_osm`, so s09/s09b draw no stakes where the line runs through water.
The points are read off the developer's drawing (local metres, ±3 m); the boundary already met the
coastline along the course, so the new area is all water (1 m2 of land).
"""
from __future__ import annotations

import json
from pathlib import Path

import pyproj
from shapely.geometry import Polygon, mapping, shape
from shapely.ops import transform, unary_union

HERE = Path(__file__).resolve().parent
cfg = json.load(open(HERE / "course_config.json"))
w = cfg["world"]
to_utm = pyproj.Transformer.from_crs(4326, cfg["epsg"], always_xy=True).transform
to_wgs = pyproj.Transformer.from_crs(cfg["epsg"], 4326, always_xy=True).transform
local = lambda geom: transform(lambda x, y, z=None: (x - w["x0"], y - w["y0"]), transform(to_utm, geom))  # noqa: E731
wgs = lambda geom: transform(to_wgs, transform(lambda x, y, z=None: (x + w["x0"], y + w["y0"]), geom))  # noqa: E731

sea = unary_union([local(shape(f["geometry"])) for f in json.load(open(HERE / "proposed" / "sea.geojson"))["features"]])
bf = json.load(open(HERE / "proposed" / "boundary.geojson"))["features"][0]
bnd = local(shape(bf["geometry"]))

# the developer's line (local metres), east part from inside the course out to the world's east edge,
# south part from the world's south edge up to the coast at the 3rd
east = [(640, 596.2), (700, 596.2), (810, 596.2), (830, 594.5), (850, 592.2), (870, 588.5), (890, 582.8),
        (910, 576.6), (930, 569.8), (940, 569.1), (w["width"] + 50, 569.2)]
south = [(207.7, -50), (207.7, 0), (211.0, 10), (214.6, 20), (215.1, 30), (214.7, 40), (213.5, 50), (212.7, 60),
         (211.6, 70), (211.1, 80), (210.1, 90), (210.0, 100), (207.7, 110), (207.1, 120), (207.1, 140), (205.9, 150),
         (205.6, 160), (205.4, 170), (204.2, 180), (202.3, 190), (200, 200)]
region = Polygon(east + [(w["width"] + 50, -50)] + south)
sea_in = sea.intersection(region).difference(bnd)
sea_out = sea.difference(region)
new_bnd = unary_union([bnd, region.intersection(unary_union([sea, bnd]))])
if new_bnd.geom_type == "MultiPolygon":
    new_bnd = max(new_bnd.geoms, key=lambda p: p.area)
print(f"[sea] in: {sea_in.area / 1e4:.1f} ha, out: {sea_out.area / 1e4:.1f} ha; boundary {bnd.area / 1e4:.1f} -> {new_bnd.area / 1e4:.1f} ha")

src = "developer 2026-10-31 (drawing of the OB line; the ocean inside it is a red penalty area)"
feats = [
    {"type": "Feature", "id": "sea_in", "properties": {"osm": "sea_in", "kind": "water", "tags": {
        "natural": "water", "water": "sea", "name": "Haro Strait / Juan de Fuca", "penalty": "red", "source": src}},
     "geometry": mapping(wgs(sea_in))},
    {"type": "Feature", "id": "sea_out", "properties": {"osm": "sea_out", "kind": "water", "tags": {
        "natural": "water", "water": "sea", "name": "Haro Strait / Juan de Fuca (beyond the OB line)", "source": src}},
     "geometry": mapping(wgs(sea_out))},
]
json.dump({"type": "FeatureCollection", "features": feats}, open(HERE / "proposed" / "sea_split.geojson", "w"))
props = dict(bf["properties"])
props["osm"] = "bd_r2579054_sea"
props["tags"] = dict(props.get("tags") or {}, note="OSM boundary (make_boundary.py) extended over the sea inside the developer's OB line (make_sea_ob.py)")
json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "id": "bd_r2579054_sea", "properties": props,
                                                       "geometry": mapping(wgs(new_bnd))}]},
          open(HERE / "proposed" / "boundary_sea.geojson", "w"))
