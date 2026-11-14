"""South 16's tee boxes, which OSM doesn't map, from the 2024 bare-earth DEM.

The developer (2026-11-13, a circled screenshot): South 16 does not play from the boxes
north of South 15's green (those are North 18's); its tees are in the strip between the
cart path south of that green and the tree line, hard to see in the trees' shade. The
DEM shows four raised, levelled, rectangular pads there. Their distances to South 16's
green (OSM w904358577) are the card's Green, Black, Tan and Red (334, 318, 295, 249 yd).

Rule: in the strip x 505860-505980 / y 5036645-5036690 (the DEM's NAD83 / UTM 10N), cells of the DEM
(smoothed with sigma 0.7 m) more than 0.15 m above its 25 m running median and flatter
than 6 %, opened once; components of 40-700 m2 that fill at least 60 % of their minimum
rotated rectangle. Each pad is written as that rectangle, a golf=tee polygon
(source: the DEM), to proposed/tees_s16.geojson (WGS84, the merge_edits format), with the
card set its distance matches.

    python3 data/reserve/make_s16_tees.py
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.windows import from_bounds
from scipy import ndimage
from shapely.geometry import shape

HERE = Path(__file__).resolve().parent
STRIP = (505860.0, 5036645.0, 505980.0, 5036690.0)
GREEN = "w904358577"
SETS = [("Green", 334), ("Black", 318), ("Tan", 295), ("Red", 249)]


def main() -> None:
    cfg = json.load(open(HERE / "course_config.json"))
    with rasterio.open(HERE / cfg["dtm"]["path"]) as r:
        w = from_bounds(STRIP[0] - 100, STRIP[1] - 100, STRIP[2] + 100, STRIP[3] + 100, r.transform)
        z = r.read(1, window=w).astype(float)
        tr = r.window_transform(w)
        crs = r.crs
    zs = ndimage.gaussian_filter(z, 0.7)
    rel = zs - ndimage.median_filter(zs, size=25)
    gy, gx = np.gradient(zs)
    m = ndimage.binary_opening((rel > 0.15) & (np.hypot(gx, gy) < 0.06), iterations=1)
    lab, _ = ndimage.label(m)
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(crs)  # the DEM's own CRS (NAD83 / UTM 10N)
    green = g[g.osm == GREEN].geometry.iloc[0].centroid
    pads = []
    for s, v in shapes(lab.astype(np.int32), mask=lab > 0, transform=tr):
        p = shape(s)
        c = p.centroid
        if not (40 <= p.area <= 700 and STRIP[0] < c.x < STRIP[2] and STRIP[1] < c.y < STRIP[3]):
            continue
        rect = p.minimum_rotated_rectangle
        if p.area / rect.area < 0.6:
            continue
        pads.append(rect)
    pads.sort(key=lambda p: -p.centroid.distance(green))
    rows = []
    for p in pads:
        yd = p.centroid.distance(green) / 0.9144
        name, card = min(SETS, key=lambda s: abs(s[1] - yd))
        if abs(yd - card) / card > 0.05:
            print(f"[s16 tees] pad at ({p.centroid.x:.0f}, {p.centroid.y:.0f}) {yd:.0f} yd matches no set; left out")
            continue
        tags = {"golf": "tee", "source": "2024 bare-earth DEM (USGS 3DEP OR_PortlandMetro_B24), make_s16_tees.py",
                "note": f"South 16 {name} box ({yd:.0f} yd to the green centre; card {card}); developer: tees in this strip, 2026-11-13"}
        rows.append((f"s16_tee_{name.lower()}", "tee", json.dumps(tags), p))
        print(f"[s16 tees] {name:5} pad at ({p.centroid.x:.1f}, {p.centroid.y:.1f}), {p.area:.0f} m2, {yd:.0f} yd (card {card})")
    out = gpd.GeoDataFrame({"osm": [r[0] for r in rows], "kind": [r[1] for r in rows], "tags": [r[2] for r in rows]},
                           geometry=[r[3] for r in rows], crs=crs).to_crs(4326)
    path = HERE / "proposed" / "tees_s16.geojson"
    path.unlink(missing_ok=True)
    out.to_file(path, driver="GeoJSON")


if __name__ == "__main__":
    main()
