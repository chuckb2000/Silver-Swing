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

For a course built from OSM (no traced.geojson; Oregon Golf Club), only the
desk shapes are written: hole lines stay OSM's unless trace_spec.json lists the
hole under "holes"; a saved "range" page becomes golf=driving_range (its interior
holes kept); and the OSM ids the desk offered for each saved page
(desk_offered.json, written by desk_export.py) are printed as the ones to drop
in edits.json, since the saved shapes replace them.
"""
from __future__ import annotations

import glob
import json
import warnings

import geopandas as gpd
from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

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
    traced = cdir / "proposed" / "traced.geojson"
    tr = None
    if traced.exists():
        tr = gpd.read_file(traced).to_crs(cfg["epsg"])
        tr["geometry"] = tr.geometry.translate(-world.x0, -world.y0)
        tr["tags"] = tr["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    offered_path = cdir / "desk_offered.json"
    offered = json.load(open(offered_path)) if offered_path.exists() else {}
    replaced = []

    feats = []
    greens, tees = {}, {}
    dg_pages = {f"{a}-{b}" for a, b in (dg["holes"] for dg in spec.get("double_greens", []))}
    dg_saved = {}  # a double green's own page (desk_export.py --area double): its whole outline
    dg_shapes = {}  # and its other shapes
    for path in sorted(glob.glob(str(cdir / "desk" / "hole*.json"))):
        d = json.load(open(path))
        k = str(d["hole"])
        if k in dg_pages:
            ps = [Polygon(f["poly"], f.get("holes") or []) for f in d["features"] if f["kind"] == "green"]
            dg_saved[k] = (unary_union([p if p.is_valid else p.buffer(0) for p in ps]), d.get("savedAt", "")[:10])
            # other shapes on the page (a fairway round the green): kept as they are, each given to
            # the hole whose keep point is nearer its centre (the surface map's priority puts the green on top)
            dg_other = [f for f in d["features"] if f["kind"] in ("fairway", "bunker")]
            dg_shapes[k] = [(f["kind"], (lambda p: p if p.is_valid else p.buffer(0))(Polygon(f["poly"], f.get("holes") or []))) for f in dg_other]
            if d.get("note"):
                print(f"[desk] {k} green note: {d['note']}")
            continue
        when = d.get("savedAt", "")[:10]
        replaced += offered.get(k, [])
        for f in d["features"]:
            p = Polygon(f["poly"], f.get("holes") or [])
            if not p.is_valid:
                p = p.buffer(0)
            kind = {"bluetee": "tee", "range": "driving_range"}.get(f["kind"], f["kind"])
            tags = {"golf": kind, "hole": k, "source": "tracing desk (developer)", "approved": f"developer {when}"}
            if kind == "driving_range":
                del tags["hole"]
            if f.get("id") in offered.get(k, []):
                tags["replaces"] = f["id"]
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

    # optional (--traced-fallback): a hole the developer has not saved keeps the course chat's
    # traced green, tees and nearest bunkers, tagged approved=pending so it is never mistaken
    # for the developer's approval (Waverley hole 14, 2026-10-19)
    if "--traced-fallback" in __import__("sys").argv:
        lines = {str(r.tags.get("ref")): r.geometry for _, r in tr[tr.kind == "hole"].iterrows()}
        for k in sorted(set(spec["holes"]) - set(greens), key=int):
            print(f"[desk] hole {k}: no desk save, using the traced shapes (approved=pending)")
            for _, r in tr.iterrows():
                if r.kind == "green" and str(r.tags.get("hole")) == k:
                    pass
                elif r.kind == "tee" and str(r.osm).split("_")[2] == k:
                    pass
                elif r.kind == "bunker" and min(lines, key=lambda h: lines[h].distance(r.geometry)) == k:
                    pass
                else:
                    continue
                tags = {"golf": r.kind, "hole": k, "source": r.tags.get("source", "traced"), "traced_from": r.osm,
                        "approved": "pending (no desk save)"}
                feats.append({"osm": f"desk_{k}_{r.kind}_{r.osm}", "kind": r.kind, "geometry": r.geometry, "tags": tags})
                if r.kind == "green":
                    greens[k] = r.geometry
                if r.kind == "tee":
                    tees.setdefault(k, []).append(r.geometry)
    # optional (trace_spec "double_greens"): a green shared by two holes, which the developer drew
    # once per hole (Langdon Farms 9/18). With "split" (a line across the green) and "keep" (a point
    # on each hole's side), both drawings are joined and cut along the line, and each hole gets the
    # part on its side (developer, 2026-10-20: 18's pin always left of the pond, 9's always right).
    # Without them the smaller drawing stays that hole's green and the larger loses it. Either way
    # each hole has its own green centre and pin and the two parts make one green.
    from shapely.geometry import Point
    from shapely.ops import split as ssplit
    for dg in spec.get("double_greens", []):
        a, b = dg["holes"]
        page = dg_saved.get(f"{a}-{b}")
        if page is not None and "split" in dg:
            # the developer traced the whole green on its own page: that outline replaces both
            # holes' drawings (their hole pages' greens are ignored)
            whole, when = page
            for i, (kind, p) in enumerate(dg_shapes.get(f"{a}-{b}", [])):
                near = min((a, b), key=lambda h: p.centroid.distance(Point(dg["keep"][h])))
                feats.append({"osm": f"desk_{a}-{b}_{kind}_{i}", "kind": kind, "geometry": p,
                              "tags": {"golf": kind, "hole": near, "source": f"tracing desk (developer), {a}/{b} green page",
                                       "approved": f"developer {when}"}})
            feats = [f for f in feats if not (f["osm"].startswith(f"desk_{a}_green_") or f["osm"].startswith(f"desk_{b}_green_"))]
            for k in (a, b):
                feats.append({"osm": f"desk_{k}_green_0", "kind": "green", "geometry": whole,
                              "tags": {"golf": "green", "hole": k, "source": f"tracing desk (developer), {a}/{b} green page",
                                       "approved": f"developer {when}"}})
                greens[k] = whole
        if "split" in dg:
            whole = greens[a].union(greens[b])
            parts = list(ssplit(whole, LineString(dg["split"])).geoms)
            new = {}
            for k in (a, b):
                kp = Point(dg["keep"][k])
                new[k] = min(parts, key=lambda q: q.distance(kp))
            if new[a].equals(new[b]):
                raise SystemExit(f"[desk] double green {a}/{b}: the split line does not separate the keep points")
            why = {k: f"with hole {b if k == a else a}: the part on its side of the split line {dg['split']}" for k in (a, b)}
        else:
            big, small = (a, b) if greens[a].area >= greens[b].area else (b, a)
            cut = greens[big].difference(greens[small])
            new = {big: max(getattr(cut, "geoms", [cut]), key=lambda q: q.area), small: greens[small]}
            why = {big: f"with hole {small}: its own part (the developer's drawing minus hole {small}'s green)",
                   small: f"with hole {big}"}
        for k in (a, b):
            greens[k] = new[k]
            for f in feats:
                if f["osm"].startswith(f"desk_{k}_green_"):
                    f["geometry"] = new[k]
                    f["tags"]["double_green"] = why[k]

    for k, p in greens.items():
        if any(p.contains(q) for q in osm_pins):
            continue
        c = p.centroid if p.contains(p.centroid) else p.representative_point()
        feats.append({"osm": f"desk_{k}_pin", "kind": "pin", "geometry": c,
                      "tags": {"golf": "pin", "hole": k, "source": "centroid of the developer's green (proposal)"}})

    for k, h in spec.get("holes", {}).items():
        gc = greens[k].centroid if greens[k].contains(greens[k].centroid) else greens[k].representative_point()  # as the pin
        start = max(tees[k], key=lambda t: t.centroid.distance(gc)).centroid
        L = LineString([start.coords[0], *map(tuple, h["bends"]), gc.coords[0]])
        feats.append({"osm": f"desk_{k}_hole", "kind": "hole", "geometry": L,
                      "tags": {"golf": "hole", "ref": k, "par": str(h["par"]), "handicap": str(h["handicap"]),
                               "source": "back desk tee -> spec bend points -> desk green centroid"}})

    if tr is not None:
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
    if replaced:
        print(f"[desk] replaced by the desk (drop in edits.json): {json.dumps(sorted(set(replaced)))}")
    for k in sorted(spec.get("holes", {}), key=int):
        L = [f for f in feats if f["osm"] == f"desk_{k}_hole"][0]["geometry"]
        print(f"[desk] hole {k}: line {L.length / 0.9144:.0f} yd")


if __name__ == "__main__":
    main()
