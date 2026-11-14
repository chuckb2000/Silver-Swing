"""Northwood: proposals made from OSM itself (no new geometry), for edits.json.

  python3 data/northwood/make_proposals.py   -> proposed/osm_retags.geojson

- the clubhouse (w1009239025) is mapped golf=clubhouse + building=yes, which s01 reads as a
  golf feature, not a building: copied as a building (s03 "Checks from earlier courses");
- the 20 golf=path ways (highway=path, foot=designated) inside the course boundary, which s01
  doesn't read: copied as golf=cartpath (drawn as paths, free relief), as at Bandon Preserve.

Same geometry as OSM; only the tags change. The originals are dropped in edits.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(lambda t: dict(t) if isinstance(t, dict) else json.loads(t))
    rows = []
    for _, r in g.iterrows():
        t = r["tags"]
        if t.get("golf") == "clubhouse":
            rows.append({"osm": f"{r['osm']}_building", "kind": "building",
                         "tags": {"building": "yes", "name": t.get("name", "")}, "geometry": r.geometry})
        elif t.get("golf") == "path":
            rows.append({"osm": f"{r['osm']}_cartpath", "kind": "cartpath",
                         "tags": {**{k: v for k, v in t.items() if k != "golf"}, "golf": "cartpath", "was": "golf=path"},
                         "geometry": r.geometry})
    out = gpd.GeoDataFrame(rows, geometry="geometry", crs=g.crs)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "osm_retags.geojson", driver="GeoJSON")
    print(f"[northwood] proposed/osm_retags.geojson: {len(out)} features "
          f"({(out.kind == 'cartpath').sum()} cart paths, {(out.kind == 'building').sum()} building)")
    print(json.dumps(sorted(out.osm.tolist())))


if __name__ == "__main__":
    main()
