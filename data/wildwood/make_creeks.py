"""Creek penalty areas for Wildwood, from pipeline/propose_channels.py's lidar channels.

    cd pipeline && python3 propose_channels.py wildwood w428675793 w428683557 w534446765 w428675795
    python3 data/wildwood/make_creeks.py

Takes proposed/channels_lidar.geojson and writes proposed/creeks.geojson (WGS84):
- only the parts inside the OSM course boundary (the developer kept the mapped
  out-of-bounds line, 2026-10-24, so creek outside it stays out of bounds);
- 3 m clear of every green and tee box (an OSM stream line crosses the 14th green,
  where the lidar shows no channel);
- without w534446765 (a tributary across the 14th: no channel in the lidar,
  median depth 0.12 m, and no creek there on the club's course map);
- each piece under 15 m2 dropped (slivers left by the cuts);
- tagged flatten=no so s04 keeps the falling creek bed.
"""
import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import shape
from shapely.ops import unary_union

C = Path(__file__).resolve().parent
cfg = json.load(open(C / "course_config.json"))
EPSG = cfg["epsg"]
SKIP = {"channel_w534446765"}

local = json.load(open(C / "build" / "course_local.geojson"))["features"]
x0, y0 = cfg["world"]["x0"], cfg["world"]["y0"]
by = {}
for f in local:
    by.setdefault(f["properties"]["kind"], []).append(shape(f["geometry"]))
from shapely.affinity import translate  # noqa: E402

bnd = translate(by["boundary"][0], x0, y0)
keep_off = translate(unary_union(by["green"] + by["tee"]).buffer(3.0), x0, y0)

ch = gpd.read_file(C / "proposed" / "channels_lidar.geojson").to_crs(EPSG)
rows = []
for _, r in ch.iterrows():
    if r.osm in SKIP:
        continue
    g = r.geometry.intersection(bnd).difference(keep_off)
    parts = [p for p in getattr(g, "geoms", [g]) if p.geom_type == "Polygon" and p.area >= 15]
    for i, p in enumerate(parts):
        tags = dict(r.tags) if isinstance(r.tags, dict) else json.loads(r.tags)
        tags.update({"flatten": "no", "name": "creek", "clipped": "inside the boundary, 3 m off greens and tees"})
        rows.append({"osm": f"creek_{r.osm.split('_', 1)[1]}_{i}", "kind": "lateral_water_hazard", "tags": tags,
                     "area_m2": round(p.area), "geometry": p})
out = gpd.GeoDataFrame(rows, crs=EPSG).to_crs(4326)
out["tags"] = out["tags"].apply(json.dumps)
out.to_file(C / "proposed" / "creeks.geojson", driver="GeoJSON")
for r in rows:
    print(f"{r['osm']}: {r['area_m2']} m2")
print(f"[make_creeks] {len(rows)} pieces, {sum(r['area_m2'] for r in rows)} m2 -> proposed/creeks.geojson")
