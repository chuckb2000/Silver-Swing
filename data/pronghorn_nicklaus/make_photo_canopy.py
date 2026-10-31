"""Pronghorn Nicklaus (course chat, 2026-10-31): a canopy height raster from the OSIP 2024
photo, because no lidar canopy reaches the course.

Why: the only flights over the course are 2023 (DOGAMI's ODF Private Forest Accords and USGS
OR_SouthEast Prineville/Maury). DOGAMI publishes their bare earth (used for the heights) but
its canopy and highest-hit services return no data here, the older 2011 and 2002 flights have
a void over the course, and the USGS lidar project OR_SouthEast_D22 has no point-cloud tiles
in MGRS square 10TFP 45x93x-46x95x (its download lists, 2026-10-31). So CLAUDE.md 5.4 step 2
applies: trees from the imagery, RGB only, lower confidence.

Classifier (checked on the photo at 0.5 m, 2026-10-31): the junipers are dark, slightly
blue-green crowns on pale pumice ground; irrigated turf is much greener (2G-R-B over the sum
about 0.28), the ground is bright (V > 130), water and asphalt are blue-grey. A pixel is
canopy where, smoothed over 1.5 m: V = (R+G+B)/3 < 100, 0.03 < E = (2G-R-B)/(R+G+B) < 0.19,
G >= R - 2 and B - G < 6. Then: one opening and closing, patches under 3 m2 dropped, and no
canopy on OSM buildings (+2 m), roads (+4 m), cart paths (+1.5 m), water or pools.

Heights are NOT measured: per crown patch, a dome rising 1.2 m per metre in from the edge
from 3.5 m, capped at 2 + 1.3 x the patch's equivalent radius, between 4.5 and 12 m
(western juniper is mostly 5-9 m here). s05 then finds the tops and crown radii as it does
on a lidar canopy. Tree types come from s05's crown-shape rule.

Writes proposed/photo_canopy_m.tif (1 m, the world grid, EPSG:32610, metres) and
proposed/photo_canopy.jpg (photo with the crown outlines, for checking).

    python3 data/pronghorn_nicklaus/make_photo_canopy.py   (after s02: reads build/course_local.geojson)
"""
from __future__ import annotations

import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.features import rasterize
from scipy import ndimage

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "pipeline"))
from common import World, load_config  # noqa: E402
from gorse import ortho_on_world  # noqa: E402


def main() -> None:
    cfg = load_config("pronghorn_nicklaus")
    world = World(cfg)
    rgb = ortho_on_world(cfg, world).astype(np.float64)  # 3 x 2H x 2W, row 0 = north, 0.5 m
    R, G, B = (ndimage.uniform_filter(c, 3) for c in rgb)
    V = (R + G + B) / 3
    E = (2 * G - R - B) / np.maximum(R + G + B, 1.0)
    m = (V < 100) & (E > 0.03) & (E < 0.19) & (G >= R - 2) & ((B - G) < 6)
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_closing(m, iterations=1)

    # OSM exclusions on the 0.5 m grid (local metres, row 0 = north)
    g = gpd.read_file(HERE / "build" / "course_local.geojson")
    H2, W2 = m.shape
    tr = Affine(0.5, 0, 0, 0, -0.5, world.height)
    shapes = []
    for kind, buf in (("building", 2.0), ("highway", 4.0), ("cartpath", 1.5), ("parking", 1.0),
                      ("water_hazard", 0.5), ("pool", 0.5), ("water", 0.5)):
        for geom in g[g.kind == kind].geometry:
            if geom is not None and not geom.is_empty:
                shapes.append((geom.buffer(buf), 1))
    if shapes:
        m &= ~rasterize(shapes, out_shape=(H2, W2), transform=tr, fill=0, dtype="uint8").astype(bool)

    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1)) * 0.25
    keep_ids = 1 + np.where(sizes >= 3.0)[0]
    m = np.isin(lab, keep_ids)

    # to the 1 m grid: a cell is canopy where at least 2 of its 4 half-metre cells are
    H, W = H2 // 2, W2 // 2
    m1 = m[:2 * H, :2 * W].reshape(H, 2, W, 2).sum(axis=(1, 3)) >= 2
    lab1, n1 = ndimage.label(m1)
    area = ndimage.sum(m1, lab1, range(1, n1 + 1))
    r_eq = np.sqrt(np.maximum(area, 1) / np.pi)
    cap = np.clip(2.0 + 1.3 * r_eq, 4.5, 12.0)
    dist = ndimage.distance_transform_edt(m1)
    h = np.where(m1, np.minimum(3.5 + 1.2 * (dist - 1), cap[np.maximum(lab1 - 1, 0)]), 0.0).astype(np.float32)

    out = HERE / "proposed" / "photo_canopy_m.tif"
    with rasterio.open(out, "w", driver="GTiff", height=H, width=W, count=1, dtype="float32",
                       crs=f"EPSG:{world.epsg}", transform=Affine(1, 0, world.x0, 0, -1, world.y0 + world.height),
                       compress="deflate", nodata=None) as dst:
        dst.write(h, 1)

    img = np.moveaxis(rgb, 0, -1).astype(np.uint8).copy()
    edge = m & ~ndimage.binary_erosion(m)
    img[edge] = [255, 0, 0]
    Image.fromarray(img).resize((W2 // 2, H2 // 2), Image.NEAREST).save(HERE / "proposed" / "photo_canopy.jpg", quality=80)
    print(f"canopy cells {int(m1.sum())} m2 in {n1} patches; heights {h[m1].min():.1f}-{h[m1].max():.1f} m -> {out.name}")


if __name__ == "__main__":
    main()
