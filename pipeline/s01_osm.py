"""Step 1-2: load the OSM extract(s), keep the features the game needs, and
write data/<course>/raw/osm.geojson (WGS84) with normalised properties.

Sources (cfg["osm_sources"], merged in order; a feature already loaded from
an earlier source is skipped):
  *.gpkg     GDAL-style OSM GeoPackages (points / lines / multipolygons layers
             with an hstore `other_tags` column), as used for Oswego Lake
  *.geojson  Overpass Turbo exports (osmtogeojson: tags as properties, ids
             like "way/123"), as used for Highland Links
Both go through the same classify(), so every later step sees {osm, kind, tags}.
"""
from __future__ import annotations

import re

import geopandas as gpd
import pandas as pd

from common import course_dir, course_name_from_argv, load_config

HSTORE = re.compile(r'"((?:[^"\\]|\\.)*)"=>"((?:[^"\\]|\\.)*)"')
DIRECT_COLS = [
    "name", "highway", "waterway", "barrier", "man_made", "building", "amenity",
    "landuse", "leisure", "natural", "sport", "ref", "aeroway", "boundary",
]


def parse_tags(row) -> dict:
    tags = {}
    for c in DIRECT_COLS:
        if c in row and isinstance(row[c], str) and row[c]:
            tags[c] = row[c]
    ot = row.get("other_tags")
    if isinstance(ot, str):
        for k, v in HSTORE.findall(ot):
            tags[k] = v.replace('\\"', '"')
    return tags


def classify(tags: dict, geom_type: str) -> str | None:
    g = tags.get("golf")
    if tags.get("leisure") == "golf_course":
        return "boundary"
    if g:
        if g in ("tee", "green", "fairway", "bunker", "rough", "driving_range",
                 "water_hazard", "lateral_water_hazard", "hole", "pin", "cartpath"):
            return g
        return "golf_other"
    if "building" in tags:
        return "building"
    if tags.get("natural") in ("water", "wetland"):
        return "water"
    if tags.get("leisure") == "swimming_pool":
        return "pool"
    if tags.get("natural") in ("wood",) or tags.get("landuse") == "forest":
        return "wood"
    if tags.get("natural") == "tree":
        return "tree"
    if tags.get("natural") == "tree_row":
        return "tree_row"
    if tags.get("amenity") == "parking":
        return "parking"
    if "highway" in tags and geom_type in ("LineString", "MultiLineString"):
        return "highway"
    if "waterway" in tags and geom_type in ("LineString", "MultiLineString"):
        return "waterway"
    if tags.get("landuse") in ("grass", "meadow") or tags.get("leisure") in ("park", "garden", "pitch"):
        return "grass"
    return None


def load_gpkg(path):
    frames = []
    for layer, idcol in (("multipolygons", None), ("lines", "osm_id"), ("points", "osm_id"),
                         ("multilinestrings", "osm_id")):
        try:
            g = gpd.read_file(path, layer=layer)
        except Exception:
            continue
        if g.empty:
            continue
        g = g.to_crs(4326)
        rows = []
        for _, r in g.iterrows():
            tags = parse_tags(r)
            if layer == "multipolygons":
                if isinstance(r.get("osm_way_id"), str) and r["osm_way_id"]:
                    oid = f"w{r['osm_way_id']}"
                else:
                    oid = f"r{r['osm_id']}"
            elif layer == "points":
                oid = f"n{r['osm_id']}"
            else:
                oid = f"w{r['osm_id']}" if layer == "lines" else f"r{r['osm_id']}"
            kind = classify(tags, r.geometry.geom_type)
            if kind is None:
                continue
            rows.append({"osm": oid, "kind": kind, "tags": tags, "geometry": r.geometry})
        if rows:
            frames.append(gpd.GeoDataFrame(rows, crs=4326))
    return pd.concat(frames, ignore_index=True) if frames else None


def load_overpass(path):
    """Overpass Turbo / osmtogeojson GeoJSON -> rows like load_gpkg's."""
    import json
    from shapely.geometry import shape
    d = json.load(open(path))
    rows = []
    for f in d.get("features", []):
        props = f.get("properties") or {}
        raw = props["tags"] if isinstance(props.get("tags"), dict) else props
        tags = {k: str(v) for k, v in raw.items()
                if not k.startswith("@") and k not in ("id", "tags", "meta", "relations") and not isinstance(v, (dict, list))}
        fid = str(f.get("id") or props.get("@id") or props.get("id") or "")
        typ, _, num = fid.partition("/")
        oid = {"node": "n", "way": "w", "relation": "r"}.get(typ, "x") + num
        if f.get("geometry") is None:
            continue
        geom = shape(f["geometry"])
        kind = classify(tags, geom.geom_type)
        if kind is None:
            continue
        rows.append({"osm": oid, "kind": kind, "tags": tags, "geometry": geom})
    return gpd.GeoDataFrame(rows, crs=4326) if rows else None


def main():
    name = course_name_from_argv()
    cfg = load_config(name)
    cdir = course_dir(name)
    merged = None
    for src in cfg["osm_sources"]:
        g = load_overpass(cdir / src) if str(src).endswith(".geojson") else load_gpkg(cdir / src)
        if g is None:
            continue
        if merged is None:
            merged = g
        else:
            new = g[~g["osm"].isin(set(merged["osm"]))]
            merged = pd.concat([merged, new], ignore_index=True)
    merged = gpd.GeoDataFrame(merged, crs=4326)
    # Flatten tags into a JSON-friendly column
    out = merged.copy()
    out["tags"] = out["tags"].apply(lambda t: {k: v for k, v in t.items()})
    path = cdir / "raw" / "osm.geojson"
    out.to_file(path, driver="GeoJSON")
    counts = out["kind"].value_counts().to_dict()
    print(f"[s01] wrote {path.relative_to(cdir.parent.parent)}: {len(out)} features")
    for k in sorted(counts):
        print(f"       {k:22s} {counts[k]}")


if __name__ == "__main__":
    main()
