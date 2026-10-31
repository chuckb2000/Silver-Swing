"""Spruce Peak: proposals for edits.json (course chat, 2026-10-31).

1. proposed/paths_as_cartpaths.geojson: the 19 golf=path ways (the course's cart paths, OSM
   highway=path + foot=designated) copied as golf=cartpath, so s01 reads them (free relief,
   drawn as paths). A closed way (w1058406517, round the practice green) is kept as its line.
2. proposed/boundary.geojson: the out-of-bounds line. OSM's boundary (w510265958) traces the
   mown turf of each corridor along the tree line, and leaves out the 13th hole (tee, green,
   bunkers and line 15-60 m north-west of it) and the 50 m of woods the 10th tee shot carries.
   The boundary used here:
     a. OSM's polygon joined to the 13th: the convex hull of the 13th's features (grown by
        TEE_MARGIN_M) and the boundary edge within REACH_M of them;
     b. grown by GROW_M into the woods all round, as play in the trees beside a corridor is in
        bounds on the course (only the turf line was mapped);
     c. less, from the ground added in (b) only, strips along roads (ROAD_M either side of each
        highway that isn't a footway/path/track) and round every building (BUILDING_M), so houses,
        the lodge and the access roads stay out of bounds.
   The developer can choose OSM's line as it is (see docs/courses/spruce_peak.md, open items).

    python3 data/spruce_peak/make_proposals.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString, MultiPoint
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
EPSG = 32618
BOUNDARY = "w510265958"
HOLE13 = ["w1058397270", "w1058397271", "w1058397272", "w1058397273", "w1058397274", "w1058397276", "r18961561"]
TEE_MARGIN_M = 6.0
REACH_M = 60.0
GROW_M = 20.0
ROAD_M = 5.0
BUILDING_M = 6.0
MINOR_WAYS = {"footway", "path", "track", "steps", "cycleway", "bridleway"}


def tagsof(t):
    return dict(t) if isinstance(t, dict) else json.loads(t)


def main():
    g = gpd.read_file(HERE / "raw" / "osm.geojson")
    g["tags"] = g["tags"].apply(tagsof)
    out = HERE / "proposed"
    out.mkdir(exist_ok=True)

    # 1. cart paths
    paths = g[g.tags.apply(lambda t: t.get("golf") == "path")].copy()
    rows = []
    for _, f in paths.iterrows():
        geom = f.geometry
        if geom.geom_type == "Polygon":
            geom = LineString(geom.exterior.coords)
        rows.append({"osm": f.osm + "_cartpath", "kind": "cartpath",
                     "tags": json.dumps({**f.tags, "golf": "cartpath", "was": "golf=path"}), "geometry": geom})
    gpd.GeoDataFrame(rows, crs=4326).to_file(out / "paths_as_cartpaths.geojson", driver="GeoJSON")
    print(f"[proposals] {len(rows)} golf=path ways -> proposed/paths_as_cartpaths.geojson")

    # 2. boundary
    gu = g.to_crs(EPSG)
    poly = gu[gu.osm == BOUNDARY].geometry.iloc[0]
    h13 = gu[gu.osm.isin(HOLE13)]
    if len(h13) != len(HOLE13):
        raise SystemExit(f"13th hole features missing: {set(HOLE13) - set(h13.osm)}")
    feat = unary_union(list(h13.geometry)).buffer(TEE_MARGIN_M)
    edge = poly.exterior.intersection(feat.buffer(REACH_M))
    pts = [c for p in getattr(feat, "geoms", [feat]) for c in p.exterior.coords]
    pts += [c for part in getattr(edge, "geoms", [edge]) for c in part.coords]
    base = unary_union([poly, MultiPoint(pts).convex_hull])
    grown = base.buffer(GROW_M, join_style=1)
    roads = gu[(gu.kind == "highway") & gu.tags.apply(lambda t: t.get("highway") not in MINOR_WAYS)]
    blds = gu[gu.kind == "building"]
    cut = unary_union([r.buffer(ROAD_M) for r in roads.geometry] + [b.buffer(BUILDING_M) for b in blds.geometry])
    added = grown.difference(base).difference(cut)
    joined = unary_union([base, added])
    if joined.geom_type == "MultiPolygon":
        parts = sorted(joined.geoms, key=lambda p: -p.area)
        print(f"[proposals] dropped {len(parts) - 1} slivers ({sum(p.area for p in parts[1:]):.0f} m2) cut off by roads/buildings")
        joined = parts[0]
    joined = joined.buffer(0)
    golf = gu[gu.kind.isin(["tee", "green", "fairway", "bunker", "hole"])]
    outside = [r.osm for _, r in golf.iterrows() if not joined.buffer(0.5).contains(r.geometry)]
    if outside:
        print(f"[proposals] WARNING golf features not inside the boundary: {outside}")
    row = g[g.osm == BOUNDARY].iloc[0]
    gpd.GeoDataFrame({"osm": ["bd_" + BOUNDARY], "kind": [row.kind],
                      "tags": [json.dumps({**row.tags, "note": f"OSM turf boundary joined to the 13th and grown {GROW_M:.0f} m into the woods, less roads and buildings (make_proposals.py)"})]},
                     geometry=[joined], crs=EPSG).to_crs(4326).to_file(out / "boundary.geojson", driver="GeoJSON")
    print(f"[proposals] boundary {poly.area / 1e4:.1f} ha -> {joined.area / 1e4:.1f} ha (13th joined: +{(base.area - poly.area) / 1e4:.2f} ha)")


if __name__ == "__main__":
    main()
