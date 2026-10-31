"""Yale's tee boxes -> data/yale/proposed/tees.geojson (course chat, 2026-10-31).

OSM maps Yale's tees as points (golf=tee nodes with tee=black/blue/green/yellow, the
pre-restoration sets) and the tee pads themselves as small golf=fairway ways. This copies
each pad as a tee polygon (kind tee) and, for the two sets built, tags the pad that plays
nearest the 2026 card with hole=<n> and tee_set (forced in s06). edits.json adds these and
drops the fairway-tagged originals and the tee points (s06 needs polygons).

Two pads OSM lacks are made here, both from the 2023 CT lidar DEM (raw/ct2023_dem.tif) and
checked against the spring 2023 leaf-off photo:
  * hole 12's back tee: the raised flat pad under the 12 black and blue markers (a region
    grown from the marker over cells within 0.3 m of its height and under 8 % slope,
    then its minimum rotated rectangle);
  * hole 14's strip (w287211700) holds all four sets' markers; it is cut across its axis
    at the green marker, so the back part (black and blue markers) is the Long and
    Championship box and the front part stays a plain tee.

Run: python3 data/yale/make_tees.py  (rewrites proposed/tees.geojson)
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import shapes
from scipy import ndimage
from shapely import affinity
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import split

HERE = Path(__file__).resolve().parent
EPSG = 32618

# Every fairway-tagged way that is really a tee pad (a tee marker on it, or an unmarked pad
# in a hole's tee complex, checked on the 2023 photos and the DEM).
PADS = [
    "w285156450", "w285156451", "w285156452", "w285156455", "w285156458", "w285156460",
    "w285156461", "w285156464", "w285156465", "w285156466", "w285156467", "w285156469",
    "w287209653", "w287209655", "w287209657", "w287209658", "w287209659", "w287209661",
    "w287209662", "w287209663", "w287209665", "w287209668", "w287211683", "w287211685",
    "w287211686", "w287211688", "w287211689", "w287211690", "w287211691", "w287211693",
    "w287211694", "w287211695", "w287211696", "w287211697", "w287211698", "w287211700",
    "w287211701", "w734021722", "w734021723", "w734021724", "w734021725", "w734021730",
    "w734021735", "w734021744", "w734021748", "w734021749", "w734027539", "w734027540",
    "w734027543", "w734027546", "w734027548", "w734027556", "w734027557",
]

# hole -> {set: pad}. "trace12" and "w287211700_back" are made below.
ASSIGN = {
    1: {"Long": "w734021722"},  # Championship: the developer's desk tee (make_desk_tees.py)
    2: {"Long": "w734021730", "Championship": "w734021748"},
    3: {"Long": "w285156455", "Championship": "w285156466"},
    4: {"Long": "w734021735", "Championship": "w285156461"},
    5: {"Long": "w285156450", "Championship": "w285156450"},
    6: {"Long": "w285156465", "Championship": "w285156465"},
    7: {"Long": "w734021749", "Championship": "w734021749"},
    8: {"Long": "w287209665", "Championship": "w287209657"},
    9: {"Long": "w287209653", "Championship": "w287209653"},
    10: {"Long": "w734027539"},  # Championship: desk tee
    11: {"Long": "w287209662", "Championship": "w287209655"},
    12: {"Long": "trace12", "Championship": "trace12"},
    13: {"Long": "w287211690", "Championship": "w734027548"},
    14: {"Long": "w287211700_back", "Championship": "w287211700_back"},
    15: {"Long": "w287211685", "Championship": "w287211685"},
    16: {"Long": "w287211686", "Championship": "w285156451"},
    17: {"Long": "w287211701"},  # Championship: desk tee
    18: {"Long": "w287211694", "Championship": "w287211698"},
}


def pad_from_dem(x: float, y: float, tol: float = 0.3, radius: int = 30) -> Polygon:
    """The flat raised pad under (x, y) (EPSG:32618), from the DEM, as a rotated rectangle."""
    src = rasterio.open(HERE / "raw" / "ct2023_dem.tif")
    a = src.read(1).astype("float64") * 0.3048
    r, c = src.index(x, y)
    win = a[r - radius:r + radius + 1, c - radius:c + radius + 1]
    gy, gx = np.gradient(win)
    z0 = float(np.median(win[radius - 1:radius + 2, radius - 1:radius + 2]))
    m = (np.abs(win - z0) < tol) & (np.hypot(gx, gy) < 0.08)
    lab, _ = ndimage.label(m)
    reg = ndimage.binary_fill_holes(ndimage.binary_opening(lab == lab[radius, radius]))
    lab2, _ = ndimage.label(reg)
    reg = lab2 == lab2[radius, radius]
    t = src.window_transform(rasterio.windows.Window(c - radius, r - radius, 2 * radius + 1, 2 * radius + 1))
    poly = max((shape(s) for s, _ in shapes(reg.astype("uint8"), mask=reg, transform=t)), key=lambda q: q.area)
    return poly.minimum_rotated_rectangle


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    W = cfg["world"]
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(EPSG)
    g["tags"] = g["tags"].apply(lambda t: t if isinstance(t, dict) else json.loads(t))
    pads = {r.osm: r.geometry for _, r in g[g.osm.isin(PADS)].iterrows()}
    missing = set(PADS) - set(pads)
    if missing:
        raise SystemExit(f"pads not in raw/osm.geojson: {sorted(missing)}")
    marks = {(str(r.tags.get("ref")), r.tags.get("tee")): r.geometry for _, r in g[g.kind == "tee"].iterrows()}

    # hole 12's back tee from the DEM, seeded between its black and blue markers
    b, u = marks[("12", "black")], marks[("12", "blue")]
    pads["trace12"] = pad_from_dem((b.x + u.x) / 2, (b.y + u.y) / 2)

    # hole 14's strip cut across its axis at the green marker
    strip = pads.pop("w287211700")
    rect = strip.minimum_rotated_rectangle
    cs = list(rect.exterior.coords)
    e = max(((cs[i], cs[i + 1]) for i in range(4)), key=lambda s: Point(s[0]).distance(Point(s[1])))
    ax = np.subtract(e[1], e[0]); ax = ax / np.linalg.norm(ax)
    gm = marks[("14", "green")]
    perp = np.array([-ax[1], ax[0]]) * 60
    cut = LineString([(gm.x - perp[0], gm.y - perp[1]), (gm.x + perp[0], gm.y + perp[1])])
    parts = list(split(strip, cut).geoms)
    bm = marks[("14", "black")]
    back = min(parts, key=lambda p: p.distance(bm))
    pads["w287211700_back"] = back
    for i, p in enumerate(q for q in parts if q is not back):
        pads[f"w287211700_front{i}"] = p

    sets = {}
    for n, d in ASSIGN.items():
        for ts, pid in d.items():
            sets.setdefault(pid, {}).setdefault(n, []).append(ts)
    rows = []
    for pid, geom in sorted(pads.items()):
        tags = {"golf": "tee"}
        src = "OSM golf=fairway way " + pid if pid.startswith("w") and "_" not in pid else ""
        if pid == "trace12":
            src = "traced from the 2023 CT lidar DEM under the hole 12 black/blue markers (course chat 2026-10-31)"
        elif pid.startswith("w287211700_"):
            src = "OSM way w287211700 cut at the hole 14 green marker (course chat 2026-10-31)"
        tags["source"] = src
        if pid in sets:
            (n, tss), = sets[pid].items()
            tags["hole"] = str(n)
            tags["tee_set"] = ";".join(tss)
        rows.append({"osm": f"tee_{pid}", "kind": "tee", "tags": tags, "geometry": geom})
    out = gpd.GeoDataFrame(rows, crs=EPSG).to_crs(4326)
    out["tags"] = out["tags"].apply(json.dumps)
    (HERE / "proposed").mkdir(exist_ok=True)
    out.to_file(HERE / "proposed" / "tees.geojson", driver="GeoJSON")
    print(f"[make_tees] {len(out)} tee boxes; {sum(1 for r in rows if 'hole' in r['tags'])} assigned")


if __name__ == "__main__":
    main()
