"""Course-chat tool (not a `make course` step): turn the developer's corrected
shapes from the tracing desk into an approved proposals file.

    python3 desk_to_proposed.py <course>     (after propose_trace.py)

Reads data/<course>/desk/hole<NN>.json (what the developer saved in the
tracing-desk page: greens, fairways, bunkers and tee boxes per hole, and the
hole's Blue tee box (`bluetee`, written as golf=tee + hole + tee_set=Blue so
s06 uses it for that hole), in local metres) and data/<course>/proposed/traced.geojson (for the parts the desk does
not edit: water, penalty areas, the grown boundary), and writes
proposed/approved.geojson (WGS84) with:
  - every desk shape, tagged golf=<kind>, approved=developer <date>;
  - a pin at each desk green's centroid (moved inside if needed), unless an
    OSM pin already lies on that green;
  - each traced hole line rebuilt: from the centroid of the hole's desk tee
    farthest from its green, through the spec's bend points, to the desk
    green's centroid (hole par/handicap from trace_spec.json);
  - the traced water, penalty areas and boundary, unchanged.
edits.json then adds this file's features (merge_edits.py, run by make course).
"""
from __future__ import annotations

import glob
import json
import warnings

import geopandas as gpd
from shapely.geometry import LineString, Polygon

from common import World, build_dir, course_dir, course_name_from_argv, load_config

warnings.filterwarnings("ignore")


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    world = World(cfg)
    cdir = course_dir(name)
    spec = json.load(open(cdir / "trace_spec.json"))
    g = gpd.read_file(build_dir(name) / "course_local.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    osm_pins = list(g[(g.kind == "pin") & ~g.osm.astype(str).str.startswith("desk_")].geometry)  # OSM's own pins only
    tr = gpd.read_file(cdir / "proposed" / "traced.geojson").to_crs(cfg["epsg"])
    tr["geometry"] = tr.geometry.translate(-world.x0, -world.y0)
    tr["tags"] = tr["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))

    feats = []
    greens, tees = {}, {}
    for path in sorted(glob.glob(str(cdir / "desk" / "hole*.json"))):
        d = json.load(open(path))
        k = str(d["hole"])
        when = d.get("savedAt", "")[:10]
        for f in d["features"]:
            p = Polygon(f["poly"])
            if not p.is_valid:
                p = p.buffer(0)
            kind = "tee" if f["kind"] == "bluetee" else f["kind"]
            tags = {"golf": kind, "hole": k, "source": "tracing desk (developer)", "approved": f"developer {when}"}
            if f["kind"] == "bluetee":  # the developer's Blue tee for this hole (s06: tagged hole + tee_set wins)
                tags["tee_set"] = spec.get("desk", {}).get("tee", "Blue")  # trace_spec "desk": the tee set marked (default Blue)
            if f.get("id", "").startswith("tr_"):
                tags["traced_from"] = f["id"]
            prefix = f"desk_{k}_{f['kind']}_"
            fid = prefix + str(sum(1 for x in feats if x["osm"].startswith(prefix)))
            feats.append({"osm": fid, "kind": kind, "geometry": p, "tags": tags})
            if f["kind"] == "green":
                greens[k] = p
            if kind == "tee":
                tees.setdefault(k, []).append(p)
        if d.get("note"):
            print(f"[desk] hole {k} note: {d['note']}")

    # optional (trace_spec "double_greens"): a green shared by two holes, which the developer drew
    # once per hole (Langdon Farms 9/18): the smaller drawing stays that hole's green and the larger
    # loses it, so each hole has its own green centre and pin and the two parts make one green
    for dg in spec.get("double_greens", []):
        a, b = dg["holes"]
        big, small = (a, b) if greens[a].area >= greens[b].area else (b, a)
        cut = greens[big].difference(greens[small])
        cut = max(getattr(cut, "geoms", [cut]), key=lambda q: q.area)
        greens[big] = cut
        for f in feats:
            if f["osm"].startswith(f"desk_{big}_green_"):
                f["geometry"] = cut
                f["tags"]["double_green"] = f"with hole {small}: its own part (the developer's drawing minus hole {small}'s green)"
            if f["osm"].startswith(f"desk_{small}_green_"):
                f["tags"]["double_green"] = f"with hole {big}"

    for k, p in greens.items():
        if any(p.contains(q) for q in osm_pins):
            continue
        c = p.centroid if p.contains(p.centroid) else p.representative_point()
        feats.append({"osm": f"desk_{k}_pin", "kind": "pin", "geometry": c,
                      "tags": {"golf": "pin", "hole": k, "source": "centroid of the developer's green (proposal)"}})

    for k, h in spec["holes"].items():
        gc = greens[k].centroid if greens[k].contains(greens[k].centroid) else greens[k].representative_point()  # as the pin
        start = max(tees[k], key=lambda t: t.centroid.distance(gc)).centroid
        L = LineString([start.coords[0], *map(tuple, h["bends"]), gc.coords[0]])
        feats.append({"osm": f"desk_{k}_hole", "kind": "hole", "geometry": L,
                      "tags": {"golf": "hole", "ref": k, "par": str(h["par"]), "handicap": str(h["handicap"]),
                               "source": "back desk tee -> spec bend points -> desk green centroid"}})

    for _, r in tr[tr.kind.isin(["water", "lateral_water_hazard", "water_hazard", "boundary"])].iterrows():
        feats.append({"osm": r.osm, "kind": r.kind, "geometry": r.geometry, "tags": r.tags})

    out = gpd.GeoDataFrame(feats, geometry="geometry")
    out["geometry"] = out.geometry.translate(world.x0, world.y0)
    out = out.set_crs(cfg["epsg"]).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    out.to_file(cdir / "proposed" / "approved.geojson", driver="GeoJSON")
    counts = {}
    for f in feats:
        counts[f["kind"]] = counts.get(f["kind"], 0) + 1
    print(f"[desk] proposed/approved.geojson: {len(feats)} features {counts}")
    for k in sorted(spec["holes"], key=int):
        L = [f for f in feats if f["osm"] == f"desk_{k}_hole"][0]["geometry"]
        print(f"[desk] hole {k}: line {L.length / 0.9144:.0f} yd")


if __name__ == "__main__":
    main()
