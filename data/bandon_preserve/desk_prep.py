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
# Back tee boxes the developer picked by hand (hole -> OSM box, reason); others: the box nearest the card
TEE_CHOICE = {"shortys": {3: ("w1547384735", "the developer's Back tee for hole 3 (2026-10-22, circled on a game screenshot); "
                                             "it measures about 70 yd against 85 on the card, accepted")}}.get(CID, {})


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
        if n in TEE_CHOICE:  # the developer named this hole's Back tee box
            t = tees[tees.osm == TEE_CHOICE[n][0]].iloc[0]
            feats.append({"osm": f"tr_tee_{n}_osm", "kind": "tee", "geometry": t.geometry,
                          "tags": {"golf": "tee", "hole": str(n), "copy_of": t.osm, "source": f"OSM tee box {t.osm}: {TEE_CHOICE[n][1]}"}})
            continue
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
    """Also show each hole's own OSM greens, bunkers and tees as solid shapes (ids osm_<hole>_<i>),
    not dashed references: they are built as mapped, and the developer should not read them as
    shapes left to trace (developer, 2026-10-22). Unchanged ones are ignored on read-back."""
    from shapely.geometry import LineString, Polygon
    p = Path(out_dir) / "holes.json"
    holes = json.load(open(p))
    lines = {h["hole"]: LineString(h["line"]) for h in holes if len(h["line"]) > 1}
    for h in holes:
        if h["hole"] not in lines:
            continue
        near = lines[h["hole"]].buffer(25)
        mine = [Polygon(f["poly"]) for f in h["features"]]
        keep, n = [], 0
        for r in h["refs"]:
            q = Polygon(r["poly"])
            own = (r["kind"] in ("green", "bunker", "tee") and q.is_valid and q.intersects(near)
                   and min(lines, key=lambda k: lines[k].distance(q)) == h["hole"]
                   and not any(q.symmetric_difference(m).area < 0.05 * q.area for m in mine if m.is_valid))
            if own:
                h["features"].append({"id": f"osm_{h['hole']}_{n}", "kind": r["kind"], "poly": r["poly"]})
                n += 1
            else:
                keep.append(r)
        h["refs"] = keep
    for h in holes:
        tees = [f for f in h["features"] if f["kind"] == "tee" and (f["id"].endswith("_back") or f["id"].endswith("_osm"))]
        if not any(f["kind"] == "bluetee" for f in h["features"]) and tees:
            tees[0]["kind"] = "bluetee"
    p.write_text(json.dumps(holes))
    print(f"[desk_prep] {CID}: Back tee marked on {sum(any(f['kind'] == 'bluetee' for f in h['features']) for h in holes)} of {len(holes)} holes")


def approve():
    """The developer approved the desk as shown, with no edits (2026-10-22: "they all look good"):
    write proposed/approved.geojson from the proposals (the whole turf, not the desk's per-hole
    pieces; the approved new green; one Back tee per hole, tagged hole + tee_set=Back so s06 uses
    it, copied where two holes share a mapped box) and put it in course_edits.json."""
    import datetime
    if list((HERE / "desk").glob("hole*.json")):
        raise SystemExit("[approve] the desk has saves in data/<id>/desk/: read them in instead")
    when = datetime.date(2026, 10, 22).isoformat()
    tr = gpd.read_file(HERE / "proposed" / "traced.geojson").to_crs(EPSG)
    tr["tags"] = tr["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    feats = []
    for _, r in tr[tr.kind == "tee"].iterrows():
        n = r.tags["hole"]
        feats.append({"osm": f"a_tee_back_{n}", "kind": "tee", "geometry": r.geometry,
                      "tags": {**{k: v for k, v in r.tags.items() if k not in ("assigned_by",)}, "golf": "tee", "hole": n,
                               "tee_set": "Back", "approved": f"developer {when} (tracing desk, as shown)"}})
    for _, r in tr[tr.kind == "green"].iterrows():
        feats.append({"osm": f"a_green_{r.tags['hole']}", "kind": "green", "geometry": r.geometry,
                      "tags": {**r.tags, "approved": f"developer {when} (tracing desk, as shown)"}})
    fw = gpd.read_file(HERE / "proposed" / "fairways.geojson").to_crs(EPSG)
    fw["tags"] = fw["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    for _, r in fw.iterrows():
        feats.append({"osm": f"a_{r.osm[2:]}", "kind": "fairway", "geometry": r.geometry,
                      "tags": {**r.tags, "approved": f"developer {when} (tracing desk, as shown)"}})
    if (HERE / "proposed" / "pins.geojson").exists():
        pins = gpd.read_file(HERE / "proposed" / "pins.geojson").to_crs(EPSG)
        pins["tags"] = pins["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
        for _, r in pins.iterrows():
            feats.append({"osm": f"a_pin_{r.tags['ref']}", "kind": "pin", "geometry": r.geometry, "tags": r.tags})
    out = gpd.GeoDataFrame(feats, geometry="geometry", crs=f"EPSG:{EPSG}")
    out["tags"] = out.tags.apply(json.dumps)
    out[["osm", "kind", "tags", "geometry"]].to_file(HERE / "proposed" / "approved.geojson", driver="GeoJSON")
    ce_p = HERE / "course_edits.json"
    ce = json.load(open(ce_p))
    ce["add"] = [a for a in ce["add"] if a["from"] != "proposed/approved.geojson"] + [{
        "from": "proposed/approved.geojson", "ids": sorted(f["osm"] for f in feats),
        "reason": f"approved by the developer {when} in the tracing desk, as shown: the mown turf as fairway, one Back tee per hole"
                  + (", hole 2's traced green and a centre pin per green" if CID == "shortys" else "")
                  + " (desk_prep.py --approve)"}]
    for a in ce["add"]:
        a["reason"] = a["reason"].replace("PROPOSAL, shown in the tracing desk 2026-10-22", f"approved by the developer {when}")
    ce_p.write_text(json.dumps(ce, indent=1) + "\n")
    kinds = {}
    for f in feats:
        kinds[f["kind"]] = kinds.get(f["kind"], 0) + 1
    print(f"[approve] {CID}: proposed/approved.geojson {kinds}")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--mark":
        mark(sys.argv[2])
    elif len(sys.argv) > 1 and sys.argv[1] == "--approve":
        approve()
    else:
        prep()
