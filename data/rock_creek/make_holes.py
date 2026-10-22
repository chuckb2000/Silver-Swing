"""Rock Creek: the 14 hole lines, a pin per hole and the clubhouse as a building
(a proposal; course chat, 2026-10-22).

    python3 data/rock_creek/make_holes.py      (after s01; writes proposed/holes.geojson)

OSM maps 9 hole lines with no number or par, for old holes 6-9 of the front and
old 14-18 of the back. The card plays 14: the front nine and the "back five"
(old 10, 11, 15, 17, 18 as 10-14). The routing comes from the 1927 Flynn plan
fitted to the OSM greens, the NCPC 2023 submission and the DC 2023 orthophoto
(proposed/routing_proposal.jpg). Each line runs tee -> bend -> green centre;
lines that follow an OSM line keep its points (old 15 and old 18 start further
back, at the tee by the previous green). Pins: the OSM pin on that green if
there is one, else the green's centre. The clubhouse is tagged golf=clubhouse,
which s01 does not draw, so it is added as a building (Wannamoisett lesson).
edits.json drops the OSM hole lines and pins and adds these.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString, Point, shape

HERE = Path(__file__).resolve().parent
EPSG = 32618

# hole -> (par, points before the green in UTM 18N, OSM green, source)
HOLES = {
    1: (4, [(323201, 4314792)], "w253129263", "west from the east end of the big tee by the car park (OSM tee w986689208)"),
    2: (4, [(322980.6, 4314713.0)], "w253126386", "from the tee box the developer marked, east, south of hole 1, to the green south of the car park"),
    3: (3, [(323154, 4314680)], "w253126390", "OSM line w1025695272 from tee w986689198"),
    4: (3, [(323481, 4314856)], "w274704937", "lidar pad lidar_tee_84 by the Joyce Road bend, north to the east-edge green (1927 hole 6's green)"),
    5: (3, [(323453.8, 4314911.3)], "w274704936", "from the tee box the developer marked, north up the strip w986689211 to the green by the 16th Street houses"),
    6: (4, [(323409, 4315099), (323386, 4314894)], "w253129251", "OSM line w1025695271, from lidar pad lidar_tee_56 beside its start; bend in the landing zone (215 m out), 8 m left of the middle of fairway w313026151 so a drive run down the slope (it falls to the right) stays on it"),
    7: (3, [(323321, 4314814)], "w253129252", "OSM line w1025695269 from tee w986689202"),
    8: (4, [(323357, 4314980)], "w253129254", "OSM line w1025695270 from tee w986689212"),
    9: (4, [(323280, 4315200), (323262, 4315030)], "w253129350", "lidar pad lidar_tee_74 beside 10th green, south down the middle to the green beside the clubhouse (1927 hole 9)"),
    10: (4, [(323142, 4314935), (323220, 4315130)], "w253126382", "north from tee w986689209 up fairway w313026150, right to green w253126382 (1927 hole 10)"),
    11: (3, [(323280, 4315200)], "w253126380", "lidar pad lidar_tee_74 beside the 10th green, north-west to the north-edge green (1927 hole 11)"),
    12: (4, [(322910, 4314879), (323054, 4315039)], "w253126383", "old 15: OSM line w1025695268, started back at lidar pad lidar_tee_16 by old 16's green; bend at the middle of fairway w915922528 in the landing zone (215 m out)"),
    13: (3, [(322907, 4314944)], "w253129266", "old 17: OSM line w1025695265 from tee w915922537"),
    14: (4, [(322873, 4314773), (322981, 4314798)], "w253129349", "old 18: from the open grass east of old 17's green (GolfDC course map), along the open corridor in the canopy model between two tree clumps to OSM line w1025695264's fairway"),
}

# tee boxes the developer marked with yellow dots on photo crops (2026-10-22,
# reference/developer_tee_marks.jpg): each box is the minimum rotated rectangle
# around the marks, in UTM 18N
DEV_TEES = {"2": [[322986.5, 4314708.7], [322974.2, 4314709.5], [322974.7, 4314717.3], [322987.0, 4314716.6], [322986.5, 4314708.7]], "5": [[323458.6, 4314919.3], [323453.8, 4314902.1], [323449.0, 4314903.4], [323453.8, 4314920.6], [323458.6, 4314919.3]], "14": [[322860.5, 4314773.6], [322887.9, 4314776.1], [322888.3, 4314770.8], [322861.0, 4314768.3], [322860.5, 4314773.6]]}


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    greens = g[g.kind == "green"].set_index("osm")
    pins = g[g.kind == "pin"]
    rows = []
    for n, (par, pts, gid, why) in HOLES.items():
        gr = greens.loc[gid].geometry
        on = pins[pins.geometry.within(gr)]
        if len(on):
            pin, psrc = on.geometry.iloc[0], f"OSM pin {on.osm.iloc[0]}"
        else:
            pin = gr.centroid if gr.buffer(-1.0).contains(gr.centroid) else gr.representative_point()
            psrc = f"centre of green {gid} (proposal)"
        c = gr.centroid
        line = LineString(pts + [(c.x, c.y)])
        rows.append({"osm": f"x_hole_{n}", "kind": "hole",
                     "tags": {"golf": "hole", "ref": str(n), "par": str(par), "source": f"course chat proposal: {why}"},
                     "geometry": line})
        rows.append({"osm": f"x_pin_{n}", "kind": "pin",
                     "tags": {"golf": "pin", "ref": str(n), "source": psrc}, "geometry": pin})
        print(f"hole {n:2d} par {par}: {line.length / 0.9144:5.0f} yd to {gid}; pin: {psrc}")
    from shapely.geometry import Polygon
    for n, ring in DEV_TEES.items():
        rows.append({"osm": f"x_tee_{n}", "kind": "tee",
                     "tags": {"golf": "tee", "hole": str(n), "tee_set": "White",
                              "source": "tee box marked by the developer on the DC 2023 orthophoto (yellow dots, 2026-10-22)"},
                     "geometry": Polygon(ring)})
    club = g[g.osm == "w71455383"].iloc[0]
    rows.append({"osm": "x_clubhouse", "kind": "building",
                 "tags": {"building": "yes", "name": club.tags.get("name", ""), "source": "OSM w71455383 (golf=clubhouse), drawn as a building"},
                 "geometry": club.geometry})
    out = gpd.GeoDataFrame(rows, crs=EPSG).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "holes.geojson", driver="GeoJSON")
    print(f"wrote proposed/holes.geojson ({len(out)} features)")


if __name__ == "__main__":
    main()
