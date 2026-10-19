"""Step 1b (optional): build edited/course.geojson from raw/osm.geojson plus
the edits listed in data/<course>/edits.json, so every change to the OSM
layout is written down with its reason and rebuilt by `make course`.

edits.json:
  {"add":  [{"from": "proposed/<file>.geojson", "ids": ["<osm id>", ...], "tags": {...}, "reason": "..."}],
   "tags": [{"osm": "<osm id>", "set": {"key": "value"}, "reason": "..."}],
   "drop": [{"osm": "<osm id>", "reason": "..."}],
   "extend_start": [{"osm": "<hole line id>", "extend_m": 100.0, "reason": "..."}]}

"add" copies features from a proposals file (matched on their `osm` id) and
sets `tags` on them; "tags" sets tags on existing features; "drop" removes
features; "extend_start" moves the first point of a line back along its first
segment by extend_m metres (measured in the course EPSG), i.e. moves the tee
of a hole without a mapped tee box back. Without edits.json the step does nothing (and an edited/ file made
by hand, if any, is left alone).
"""
from __future__ import annotations

import json

import geopandas as gpd
import pandas as pd

from common import course_dir, course_name_from_argv


def main():
    name = course_name_from_argv()
    cdir = course_dir(name)
    path = cdir / "edits.json"
    if not path.exists():
        print("[merge_edits] no edits.json - nothing to do")
        return
    ed = json.load(open(path))
    g = gpd.read_file(cdir / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    n_add = n_tag = n_drop = 0
    for a in ed.get("add", []):
        src = gpd.read_file(cdir / a["from"]).to_crs(4326)
        src["tags"] = src["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
        missing = set(a["ids"]) - set(src["osm"])
        if missing:
            raise SystemExit(f"[merge_edits] {a['from']} has no features {sorted(missing)}")
        rows = src[src["osm"].isin(a["ids"])][["osm", "kind", "tags", "geometry"]].copy()
        rows["tags"] = rows["tags"].apply(lambda t: {**t, **a.get("tags", {})})
        g = pd.concat([g, rows], ignore_index=True)
        n_add += len(rows)
    for t in ed.get("tags", []):
        sel = g["osm"] == t["osm"]
        if not sel.any():
            raise SystemExit(f"[merge_edits] no feature {t['osm']} to tag")
        for i in g.index[sel]:
            g.at[i, "tags"] = {**g.at[i, "tags"], **t["set"]}
            n_tag += 1
    for d in ed.get("drop", []):
        sel = g["osm"] == d["osm"]
        if not sel.any():
            raise SystemExit(f"[merge_edits] no feature {d['osm']} to drop")
        g = g[~sel]
        n_drop += int(sel.sum())
    g = gpd.GeoDataFrame(g, crs=4326)
    n_ext = 0
    if ed.get("extend_start"):
        import math
        from shapely.geometry import LineString
        from common import load_config
        epsg = load_config(name)["epsg"]
        gu = g.to_crs(epsg)
        for e in ed["extend_start"]:
            sel = gu.index[gu["osm"] == e["osm"]]
            if len(sel) != 1:
                raise SystemExit(f"[merge_edits] extend_start: no single feature {e['osm']}")
            i = sel[0]
            cs = list(gu.at[i, "geometry"].coords)
            (ax, ay), (bx, by) = cs[0], cs[1]
            ln = math.hypot(bx - ax, by - ay)
            d = float(e["extend_m"])
            cs[0] = (ax - (bx - ax) / ln * d, ay - (by - ay) / ln * d)
            gu.at[i, "geometry"] = LineString(cs)
            gu.at[i, "tags"] = {**gu.at[i, "tags"], "start_moved_m": f"{d:g}"}
            n_ext += 1
        g = gu.to_crs(4326)
    bad = [r.osm for _, r in g.iterrows() if r.geometry.geom_type in ("Polygon", "MultiPolygon") and not r.geometry.is_valid]
    if bad:
        print(f"[merge_edits] warning: invalid polygons {bad} (s02 repairs them)")
    out = cdir / "edited" / "course.geojson"
    out.parent.mkdir(exist_ok=True)
    g.to_file(out, driver="GeoJSON")
    print(f"[merge_edits] {out.relative_to(cdir)}: {len(g)} features ({n_add} added, {n_tag} retagged, {n_drop} dropped, {n_ext} lines extended)")


if __name__ == "__main__":
    main()
