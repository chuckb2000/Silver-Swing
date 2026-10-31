"""The developer's tees from the tracing desk as tee boxes (developer, 2026-10-31).

    python3 data/<id>/make_desk_tees.py <id> <tee set>

Reads data/<id>/desk/hole<NN>.json (the desk's "bluetee" shape: the box the
developer marked for <tee set>, in local metres from the course's world origin)
and writes data/<id>/proposed/desk_tees.geojson: one golf=tee polygon per hole,
tagged hole=<n> and tee_set=<tee set>, so s06 uses it for that hole and set
whatever its distance. The developer: "they are acceptable as I've saved them.
Make sure that there is actually always a tee box under where I marked the tee."
A mark under 60 m2 is grown to an 8 x 6 m pad on the developer's centroid, its
long side along the hole line's first segment; a larger mark is kept as drawn.
Each box is tagged tee_pos=mark: s06 puts the tee at the box's centroid (the
developer's) and never moves it, so the mark sets the yardage.
"""
from __future__ import annotations

import glob
import json
import math
import sys
from pathlib import Path

import geopandas as gpd
from shapely.affinity import rotate, translate
from shapely.geometry import Polygon, box

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from common import World, load_config  # noqa: E402

MIN_AREA, PAD_L, PAD_W = 60.0, 8.0, 6.0


def main():
    cid, tee_set = sys.argv[1], sys.argv[2]
    cdir = ROOT / "data" / cid
    cfg = load_config(cid)
    world = World(cfg)
    epsg = cfg["epsg"]
    lay = gpd.read_file(cdir / "edited" / "course.geojson").to_crs(epsg)
    holes = lay[lay.tags.apply(lambda t: (json.loads(t) if isinstance(t, str) else t).get("golf") == "hole")]
    feats = []
    for path in sorted(glob.glob(str(cdir / "desk" / "hole*.json"))):
        d = json.load(open(path))
        n = str(d["hole"])
        marks = [f for f in d["features"] if f["kind"] == "bluetee"]
        if not marks:
            continue
        poly = Polygon([(world.x0 + x, world.y0 + y) for x, y in marks[0]["poly"]])
        c = poly.centroid
        row = holes[holes.tags.apply(lambda t: str((json.loads(t) if isinstance(t, str) else t).get("ref")) == n)]
        line = row.geometry.iloc[0]
        (ax, ay), (bx, by) = line.coords[0], line.coords[1]
        ang = math.degrees(math.atan2(by - ay, bx - ax))
        grown = poly.area < MIN_AREA
        if grown:
            pad = box(-PAD_L / 2, -PAD_W / 2, PAD_L / 2, PAD_W / 2)
            poly = translate(rotate(pad, ang, origin=(0, 0)), c.x, c.y)
        note = (f"developer's mark ({Polygon(marks[0]['poly']).area:.0f} m2) grown to an {PAD_L:g} x {PAD_W:g} m pad on its centroid"
                if grown else "the developer's mark as drawn")
        feats.append({"osm": f"desk_tee_{n}", "kind": "tee", "geometry": poly,
                      "tags": {"golf": "tee", "hole": n, "tee_set": tee_set, "tee_pos": "mark",
                               "source": "tracing desk (developer 2026-10-31)", "note": note}})
        print(f"hole {n}: {note}; centroid {c.x - world.x0:.1f}, {c.y - world.y0:.1f} (local m)")
    out = gpd.GeoDataFrame(feats, crs=epsg).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    out.to_file(cdir / "proposed" / "desk_tees.geojson", driver="GeoJSON")
    print("ids:", [f["osm"] for f in feats])


if __name__ == "__main__":
    main()
