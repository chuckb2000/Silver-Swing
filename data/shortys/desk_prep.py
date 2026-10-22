"""Put this course's proposals into the tracing desk's input (course-chat helper,
not a `make course` step).

    python3 data/<id>/desk_prep.py          (after make_proposals.py and s02)

Shorty's and Bandon Preserve are OSM courses with gaps (no fairways, missing
tees, one missing green), not traced courses, so the shared desk tools are used
as they are and this script bridges them:

- writes proposed/traced.geojson from proposed/*.geojson (make_proposals.py):
  fairways cut into one piece per hole (each part of the turf goes to its
  nearest hole line), proposed and split greens, proposed back tees
  (`tr_tee_<hole>_back`) and, for each hole whose OSM box reaches the Back
  card, that box (`tr_tee_<hole>_osm`, a copy) so the desk can show the Back
  yardage for every hole;
- writes the "desk" keys of trace_spec.json (the photo, and the tee set marked:
  Back, with the second card column);
- after `desk_export.py <id> OUT --traced --edit 1-N`, run
  `python3 data/<id>/desk_prep.py --mark OUT` to turn each hole's proposed back
  tee (or its chosen OSM box) into the desk's "Back tee" (kind bluetee) in
  OUT/holes.json, so the page's live readout measures it against the card.
"""
from __future__ import annotations

import csv
import json
import sys
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely import voronoi_polygons
from shapely.geometry import MultiPoint, Point
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from s06_holes import box_centre, path_from  # noqa: E402

warnings.filterwarnings("ignore")
CID = HERE.name
EPSG = 32610
YD = 0.9144
REF = {"shortys": "Middle", "bandon_preserve": "Front"}[CID]
NHOLES = {"shortys": 19, "bandon_preserve": 13}[CID]
PROPOSALS = {"shortys": ["fairways.geojson", "green2.geojson"],
             "bandon_preserve": ["fairways.geojson", "tees.geojson"]}[CID]


def hole_lines(g):
    out = {}
    for _, h in g[(g.kind == "hole") & (g.geom_type == "LineString")].iterrows():
        ref = h.tags.get("ref")
        if ref and ref.isdigit() and 1 <= int(ref) <= NHOLES and h.osm in KEEP:
            out[int(ref)] = h.geometry
    return out


def edited():
    g = gpd.read_file(HERE / "edited" / "course.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    return g


KEEP: set = set()


def prep():
    global KEEP
    g = edited()
    ed = json.load(open(HERE / "edits.json"))
    dropped = {d["osm"] for d in ed["drop"]}
    KEEP = set(g[(g.kind == "hole") & ~g.osm.isin(dropped)].osm)
    lines = hole_lines(g)
    assert sorted(lines) == list(range(1, NHOLES + 1)), sorted(lines)
    card = {int(r["hole"]): r for r in csv.DictReader(open(HERE / "scorecard.csv"))}
    greens = g[(g.kind == "green") & g.geom_type.isin(["Polygon", "MultiPolygon"])]

    # Voronoi cells of the hole lines (densified), one per hole
    pts, lab = [], []
    for n, L in lines.items():
        for d in np.arange(0, L.length + 2, 2.0):
            p = L.interpolate(min(d, L.length))
            pts.append(p)
            lab.append(n)
    cells = voronoi_polygons(MultiPoint(pts), extend_to=unary_union(list(lines.values())).buffer(2000).envelope)
    by_hole = {}
    for cell in cells.geoms:
        i = next(i for i, p in enumerate(pts) if cell.contains(p) or cell.touches(p))
        by_hole.setdefault(lab[i], []).append(cell)
    by_hole = {n: unary_union(c) for n, c in by_hole.items()}

    feats = []
    for fn in PROPOSALS:
        p = gpd.read_file(HERE / "proposed" / fn).to_crs(EPSG)
        p["tags"] = p["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
        for _, r in p.iterrows():
            if r.kind == "fairway":
                for n, cell in by_hole.items():
                    part = r.geometry.intersection(cell)
                    for q in getattr(part, "geoms", [part]):
                        if q.geom_type == "Polygon" and q.area >= 20:
                            feats.append({"osm": f"tr_fairway_{n}_{len([f for f in feats if f['osm'].startswith(f'tr_fairway_{n}_')])}",
                                          "kind": "fairway", "geometry": q, "tags": {**r.tags, "hole": str(n)}})
            elif r.kind == "tee":
                n = r.tags["hole"]
                feats.append({"osm": f"tr_tee_{n}_back", "kind": "tee", "geometry": r.geometry, "tags": r.tags})
            elif r.kind == "green":
                feats.append({"osm": f"tr_green_{r.tags['hole']}", "kind": "green", "geometry": r.geometry, "tags": r.tags})
    # the mapped box that gives each remaining hole its Back yardage (copied so the desk can mark it)
    have = {f["tags"]["hole"] for f in feats if f["kind"] == "tee"}
    tees = g[(g.kind == "tee") & (g.geom_type == "Polygon")]
    for n, L in lines.items():
        if str(n) in have:
            continue
        gp = greens.geometry.iloc[int(np.argmin(greens.distance(Point(L.coords[-1]))))]
        tg = next((f["geometry"] for f in feats if f["kind"] == "green" and f["tags"].get("hole") == str(n)), gp)
        gc = tg.centroid
        want = float(card[n]["back"])
        best = None
        for _, t in tees.iterrows():
            if t.geometry.distance(Point(L.coords[0])) > 70:
                continue
            yd = path_from(box_centre(t.geometry)[0], L, gc)[0] / YD
            if best is None or abs(yd - want) < best[0]:
                best = (abs(yd - want), t)
        if best:
            t = best[1]
            feats.append({"osm": f"tr_tee_{n}_osm", "kind": "tee", "geometry": t.geometry,
                          "tags": {"golf": "tee", "hole": str(n), "copy_of": t.osm, "source": f"OSM tee box {t.osm} (the one nearest the Back card)"}})
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
    out["tags"] = out.tags.apply(json.dumps)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "traced.geojson", driver="GeoJSON")
    spec_p = HERE / "trace_spec.json"
    spec = json.load(open(spec_p)) if spec_p.exists() else {}
    spec.update({"note": "Desk settings only (Shorty's and Bandon Preserve are OSM courses; their proposals come from "
                         "make_proposals.py, put in proposed/traced.geojson by desk_prep.py).",
                 "ortho": "raw/osip2024_05m.tif",
                 "desk": {"tee": "Back", "ref": REF, "photo": "OSIP 2024 orthophoto"}})
    spec_p.write_text(json.dumps(spec, indent=1) + "\n")
    kinds = {}
    for f in feats:
        kinds[f["kind"]] = kinds.get(f["kind"], 0) + 1
    print(f"[desk_prep] {CID}: proposed/traced.geojson {kinds}")


def mark(out_dir):
    p = Path(out_dir) / "holes.json"
    holes = json.load(open(p))
    for h in holes:
        tees = [f for f in h["features"] if f["kind"] == "tee" and (f["id"].endswith("_back") or f["id"].endswith("_osm"))]
        if not any(f["kind"] == "bluetee" for f in h["features"]) and tees:
            tees[0]["kind"] = "bluetee"
    p.write_text(json.dumps(holes))
    print(f"[desk_prep] {CID}: Back tee marked on {sum(any(f['kind'] == 'bluetee' for f in h['features']) for h in holes)} of {len(holes)} holes")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--mark":
        mark(sys.argv[2])
    else:
        prep()
