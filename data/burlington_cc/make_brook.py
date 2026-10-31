"""The brook between the two ponds by the 11th green (OSM stream w1011484692) as a narrow
penalty area: the stream line buffered to 2.5 m wide, minus the cart paths beside it and
their bridges (each path buffered 1.75 m), so the bridges stay paths. Developer, 2026-10-31:
"a tiny little creek with bridges over it"; replaces the 8 m lidar channel from
propose_channels.py. Writes proposed/brook.geojson (WGS84).
Run: python3 data/burlington_cc/make_brook.py"""
import json
from pathlib import Path
from pyproj import Transformer
from shapely import transform
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
fwd = Transformer.from_crs(4326, 32618, always_xy=True)
inv = Transformer.from_crs(32618, 4326, always_xy=True)
to_utm = lambda g: transform(g, lambda c: __import__("numpy").column_stack(fwd.transform(c[:, 0], c[:, 1])))
to_wgs = lambda g: transform(g, lambda c: __import__("numpy").column_stack(inv.transform(c[:, 0], c[:, 1])))

fs = json.load(open(HERE / "raw/overpass.geojson"))["features"]
stream = next(to_utm(shape(f["geometry"])) for f in fs if f.get("id") == "way/1011484692")
paths = [to_utm(shape(f["geometry"])) for f in fs
         if f["properties"].get("highway") in ("path", "footway", "service", "track")]
near = [p for p in paths if p.distance(stream) < 15]
# The two cart-path bridges OSM leaves out: each joins a path end on one bank to the path end
# facing it on the other (the paths stop at the banks). Ends in UTM 18N metres, from the OSM ways.
ends = {f["id"]: to_utm(shape(f["geometry"])) for f in fs if f.get("id") in
        ("way/1011553253", "way/1011556685", "way/1011556687")}
def end_near(way, x, y):
    g = ends[way]; a, b = g.coords[0], g.coords[-1]
    return min((a, b), key=lambda c: (c[0] - x) ** 2 + (c[1] - y) ** 2)
from shapely.geometry import LineString
bridges = {
    "bridge_north": LineString([end_near("way/1011553253", 643245, 4924738), end_near("way/1011556687", 643252, 4924732)]),
    "bridge_south": LineString([end_near("way/1011556685", 643240, 4924706), end_near("way/1011556687", 643247, 4924703)]),
}
for k, b in bridges.items():
    assert b.crosses(stream) or b.distance(stream) < 1.5, f"{k} does not cross the brook"
brook = stream.buffer(1.25, cap_style="flat").difference(
    unary_union([p.buffer(1.75) for p in near] + [b.buffer(1.75, cap_style="flat") for b in bridges.values()]))
feat = {"type": "Feature",
        "properties": {"osm": "channel_w1011484692", "kind": "lateral_water_hazard",
                       "tags": {"golf": "lateral_water_hazard", "natural": "water", "penalty": "red",
                                "source": "OSM stream line w1011484692 buffered to 2.5 m, minus the cart paths (make_brook.py)",
                                "width_m": "2.5", "flatten": "no"}},
        "geometry": mapping(to_wgs(brook))}
bridge_feats = [{"type": "Feature",
                 "properties": {"osm": k, "kind": "cartpath",
                                "tags": {"golf": "cartpath", "highway": "path", "bridge": "yes",
                                         "source": "joins the OSM path ends across the brook (make_brook.py)"}},
                 "geometry": mapping(to_wgs(b))} for k, b in bridges.items()]
json.dump({"type": "FeatureCollection", "features": [feat] + bridge_feats}, open(HERE / "proposed/brook.geojson", "w"), indent=1)
print(f"brook: {brook.area:.0f} m2, {len(near)} paths cut out, {brook.geom_type}; bridges", {k: round(b.length, 1) for k, b in bridges.items()})
