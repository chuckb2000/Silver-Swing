"""The sea and its rocky shore, for Lofoten Links (course-chat helper, not a make step).

    python3 data/lofoten/make_shore.py      (after pipeline/propose_sea.py and make_boundary.py)

Two features, both one red penalty area with the sea (developer's brief, 2026-11-13: the sea
is a penalty area):

- `sea`, drawn as water: where the Kartverket DTM (raw/dtm_clip.tif, 1 m) is at or below
  SEA_Z, in the pieces that touch OSM's sea (so inland bogs and pools at sea level stay
  land). OSM's coastline here is drawn in long straight runs that cut across the rocky
  points and islets; the DTM follows the real shoreline (developer, 2026-11-13: "this coast
  is so jagged", with an aerial of the 14th).
- `shore`, drawn as rock (config rock_water_osm, as Cypress Point): the land between the
  course boundary and the sea that was already part of the penalty area: the old envelope
  (OSM's sea, plus the land outside the boundary, inside its convex hull, within SHORE_M of
  both the sea and the boundary), less the water, roads (+3 m) and buildings (+2 m), and
  every islet in the sea. Its edge on the course side is the course boundary (OSM's), as before.

Writes proposed/sea_shore.geojson (ids `sea` and `shore`).
"""
from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import shapes
from shapely.geometry import box, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
SHORE_M = 40.0
SEA_Z = 0.3          # m: the DTM is 0 over the sea; the lowest wet rock is a few tenths above
MIN_ROCK_M2 = 4.0    # specks of rock in the water smaller than this are left as water


def main():
    cfg = json.load(open(HERE / "course_config.json"))
    epsg = cfg["epsg"]
    w = cfg["world"]
    world = box(w["x0"], w["y0"], w["x0"] + w["width"], w["y0"] + w["height"])
    osea = gpd.read_file(HERE / "proposed" / "sea.geojson").to_crs(epsg).geometry.iloc[0]
    bnd = gpd.read_file(HERE / "proposed" / "boundary.geojson").to_crs(epsg).geometry.iloc[0]
    g = gpd.read_file(HERE / "raw" / "osm.geojson").to_crs(epsg)
    roads = unary_union([r.buffer(3.0) for r in g[g.kind == "highway"].geometry])
    bld = unary_union(list(g[g.kind == "building"].geometry.buffer(2.0)))

    with rasterio.open(HERE / "raw" / "dtm_clip.tif") as src:
        z = src.read(1)
        wet = (z <= SEA_Z) & np.isfinite(z)
        pieces = [shape(s) for s, v in shapes(wet.astype(np.uint8), mask=wet, transform=src.transform) if v == 1]
        pieces = gpd.GeoSeries(pieces, crs=src.crs).to_crs(epsg)
    pieces = pieces[pieces.intersects(osea)]
    water = unary_union(list(pieces)).buffer(0)
    # fill rock specks under MIN_ROCK_M2 (single noisy cells), keep real rocks and islets
    if water.geom_type == "Polygon":
        water = [water]
    else:
        water = list(water.geoms)
    from shapely.geometry import Polygon
    water = unary_union([Polygon(p.exterior, [i for i in p.interiors if Polygon(i).area >= MIN_ROCK_M2]) for p in water])
    water = water.intersection(world).difference(bnd)

    land_old = osea.buffer(SHORE_M).intersection(bnd.buffer(SHORE_M)).intersection(bnd.convex_hull).difference(bnd)
    envelope = unary_union([osea, land_old]).intersection(world)
    shore = envelope.difference(water).difference(bnd).difference(roads).difference(bld)
    # islets: rock wholly inside the water's outline
    islets = unary_union([Polygon(i) for p in getattr(water, "geoms", [water]) for i in p.interiors]).difference(bnd)
    shore = unary_union([shore, islets]).buffer(0.3).buffer(-0.3)
    shore = unary_union([p for p in getattr(shore, "geoms", [shore]) if p.area >= MIN_ROCK_M2])
    print(f"[shore] water {water.area / 1e4:.1f} ha (OSM's sea {osea.intersection(world).area / 1e4:.1f} ha), "
          f"rock shore {shore.area / 1e4:.1f} ha; land OSM drew as sea now rock: {osea.difference(water).intersection(world).area / 1e4:.1f} ha")
    src_note = "Kartverket DTM 1 m at or below 0.3 m, the pieces touching OSM's sea (make_shore.py)"
    rows = [{"osm": "sea", "kind": "water", "tags": json.dumps({"natural": "water", "name": "the Norwegian Sea", "source": src_note}), "geometry": water},
            {"osm": "shore", "kind": "water", "tags": json.dumps({"natural": "bare_rock", "name": "the shore",
             "source": "the land between the course boundary and the sea, and the islets (make_shore.py); part of the sea's penalty area, drawn as rock"}), "geometry": shore}]
    gpd.GeoDataFrame(rows, geometry="geometry", crs=f"EPSG:{epsg}").to_crs(4326).to_file(HERE / "proposed" / "sea_shore.geojson", driver="GeoJSON")


if __name__ == "__main__":
    main()
