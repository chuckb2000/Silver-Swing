"""Yale: the developer's Championship tee on 1 (tracing desk, 2026-10-31) sits on the
practice green behind the clubhouse (OSM w284013715, no hole's green; the 2023 data predate
the restoration's new back tee there). The developer: "make sure there is actually always a
tee box under where I marked the tee", so the practice green is cut back 2.5 m clear of the
tee pad: proposed/practice_green_cut.geojson (w284013715_cut), which replaces it in edits.json.

    python3 data/yale/cut_practice_green.py      (after make_desk_tees.py)
"""
import json
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
EPSG = 32618
g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
green = g[g.osm == "w284013715"].iloc[0]
pad = gpd.read_file(HERE / "proposed" / "desk_tees.geojson").to_crs(EPSG)
pad = pad[pad.osm == "desk_tee_1"].geometry.iloc[0]
cut = green.geometry.difference(pad.buffer(2.5))
if cut.geom_type == "MultiPolygon":
    cut = max(cut.geoms, key=lambda p: p.area)
tags = green.tags if isinstance(green.tags, dict) else json.loads(green.tags)
tags = {**tags, "note": "practice green cut back 2.5 m clear of the developer's Championship tee on 1 (cut_practice_green.py)"}
gpd.GeoDataFrame({"osm": ["w284013715_cut"], "kind": ["green"], "tags": [json.dumps(tags)]},
                 geometry=[cut], crs=EPSG).to_crs(4326).to_file(HERE / "proposed" / "practice_green_cut.geojson", driver="GeoJSON")
print(f"practice green {green.geometry.area:.0f} m2 -> {cut.area:.0f} m2")
