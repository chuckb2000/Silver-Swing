"""Proposals for The Aquidneck Club (course chat, 2026-10-31), written to proposed/aquidneck.geojson
and added through edits.json:
- two back-tee pads OSM doesn't map (17 and 3 Gold): the flat top of a raised pad in the 2022
  bare-earth DEM (1 m), grown by 1 m (the DEM's cell), at the card distance from the green, with a
  mown pad and a footpath to it on the NAIP photo;
- the practice ground (the course boundary's southern lobe: range tee, hitting bays, target greens,
  short-game area, car park) as golf=driving_range, out of bounds (standing default), cut from the
  boundary at y = 540 m local (35 m south of the 1st tee boxes);
- hole 8's line from the centroid of the developer's Gold desk tee (desk/hole08.json; the tee box itself
  is proposed/approved.geojson, from pipeline/desk_to_proposed.py) to the end of OSM's line w951590882
  on the green, so the line starts on the tee the developer marked (replaces w951590882);
- hole 9's line with one bend: OSM's w951590893 runs up the right edge of the fairway through the woods
  (a drive down it hits trees), so the same tee and green points with a bend on the main axis of the
  hole's fairway w951590886 (pipeline/fairway_axis.py) 250 yd from the tee (replaces w951590893);
- the clubhouse (w940801546, golf=clubhouse + building=yes, which s01 reads as a golf feature, not a
  building) copied as a building, so it is drawn and its roof's lidar returns are not read as trees.
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
import sys
import numpy as np
sys.path.insert(0, str(D.parent.parent / "pipeline"))
from fairway_axis import centreline  # noqa: E402

osm = gpd.read_file(D / "raw" / "osm.geojson").to_crs(EPSG)
osm["geometry"] = osm.geometry.translate(-W["x0"], -W["y0"])
line = lambda oid: osm[osm["osm"] == oid].geometry.iloc[0]  # noqa: E731

desk8 = json.load(open(D / "desk" / "hole08.json"))
tee8 = sg.Polygon([f for f in desk8["features"] if f["kind"] == "bluetee"][0]["poly"]).centroid
L8 = line("w951590882")
feats.append({"osm": "hole8_desk_tee", "kind": "hole", "geometry": local_to_utm(sg.LineString([tee8.coords[0], *L8.coords[1:]])),
              "tags": {"golf": "hole", "ref": "8", "par": "3", "proposed": "yes",
                       "note": "OSM line w951590882 starting at the centroid of the developer's Gold desk tee (desk/hole08.json, 2026-10-31)"}})

L9 = line("w951590893")
fw9 = b[b["osm"] == "w951590886"].geometry.iloc[0]
ax = centreline(fw9)
t9 = sg.Point(L9.coords[0])
bend9 = ax[np.argmin(abs(np.hypot(ax[:, 0] - t9.x, ax[:, 1] - t9.y) - 250 * 0.9144))]
feats.append({"osm": "hole9_bend", "kind": "hole", "geometry": local_to_utm(sg.LineString([L9.coords[0], tuple(bend9), L9.coords[-1]])),
              "tags": {"golf": "hole", "ref": "9", "par": "5", "proposed": "yes",
                       "note": "OSM line w951590893 with one bend on the fairway main axis 250 yd from the tee (pipeline/fairway_axis.py): the OSM line ran along the woods on the fairway right edge"}})
club = osm[osm["osm"] == "w940801546"].iloc[0]
feats.append({"osm": "w940801546_building", "kind": "building", "geometry": local_to_utm(club.geometry),
              "tags": {"building": "yes", "name": "The Aquidneck Club", "source": "OSM w940801546 (golf=clubhouse)"}})
print("hole 8 tee (desk centroid)", tee8, "line", round(sg.LineString([tee8.coords[0], *L8.coords[1:]]).length / 0.9144, 1), "yd; hole 9 bend", bend9)

gdf = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
gdf["tags"] = gdf["tags"].apply(json.dumps)
gdf.to_crs(4326).to_file(D / "proposed" / "aquidneck.geojson", driver="GeoJSON")
print(gdf[["osm", "kind"]], [round(g.area) for g in gdf.geometry])
