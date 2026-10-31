"""Proposals for The Aquidneck Club (course chat, 2026-10-31), written to proposed/aquidneck.geojson
and added through edits.json:
- two back-tee pads OSM doesn't map (17 and 3 Gold): the flat top of a raised pad in the 2022
  bare-earth DEM (1 m), grown by 1 m (the DEM's cell), at the card distance from the green, with a
  mown pad and a footpath to it on the NAIP photo;
- the practice ground (the course boundary's southern lobe: range tee, hitting bays, target greens,
  short-game area, car park) as golf=driving_range, out of bounds (standing default), cut from the
  boundary at y = 540 m local (35 m south of the 1st tee boxes).
Run: python3 data/aquidneck/make_proposed.py
"""
import json
from pathlib import Path
import geopandas as gpd
import shapely.geometry as sg
from shapely.affinity import translate

D = Path(__file__).resolve().parent
W = json.load(open(D / "course_config.json"))["world"]
EPSG = json.load(open(D / "course_config.json"))["epsg"]

def local_to_utm(g):
    return translate(g, W["x0"], W["y0"])

# flat tops found by the DEM (local metres, before the 1 m growth)
PAD17 = [[481.0, 1686.0], [479.0, 1683.0], [480.0, 1681.0], [483.0, 1679.0], [486.0, 1682.0], [486.0, 1684.0], [484.0, 1686.0]]
PAD3 = [[641.0, 903.0], [639.0, 901.0], [638.0, 897.0], [642.0, 893.0], [646.0, 892.0], [648.0, 895.0], [648.0, 898.0], [644.0, 902.0]]
feats = []
for oid, pad, hole, raise_m, note in [
    ("tee_17_gold", PAD17, 17, 0.45, "raised pad 0.45 m, about 199 yd from the green centre (card 202); a mown pad with a footpath from the cart path on NAIP"),
    ("tee_3_gold", PAD3, 3, 0.40, "raised pad 0.40 m west of the cart path, behind the mapped 3rd tee, about 372 yd to the green centre (card 382)"),
]:
    g = sg.Polygon(pad).buffer(1.0, join_style=2)
    feats.append({"osm": oid, "kind": "tee", "geometry": local_to_utm(g),
                  "tags": {"golf": "tee", "hole": str(hole), "tee_set": "Gold", "proposed": "yes",
                           "source": "USGS 3DEP 2022 bare-earth DEM (raised flat pad) + NAIP; course chat trace", "note": note}})

b = gpd.read_file(D / "build" / "course_local.geojson")
bnd = b[b["kind"] == "boundary"].geometry.union_all()
cut = sg.box(-1e4, -1e4, 1e4, 540.0)
rng = bnd.intersection(cut)
feats.append({"osm": "range_aquidneck", "kind": "driving_range", "geometry": local_to_utm(rng),
              "tags": {"golf": "driving_range", "proposed": "yes",
                       "source": "course boundary south of y=540 m local (NAIP: range tee, bays, target greens)"}})
gdf = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
gdf["tags"] = gdf["tags"].apply(json.dumps)
gdf.to_crs(4326).to_file(D / "proposed" / "aquidneck.geojson", driver="GeoJSON")
print(gdf[["osm", "kind"]], [round(g.area) for g in gdf.geometry])
