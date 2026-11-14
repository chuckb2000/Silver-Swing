"""The Reserve's canopy heights: DOGAMI's CANOPY_HEIGHT_MODEL_MOSAIC (feet, 1 m, EPSG:32610;
its catalog names OLC_METRO_2014 here), fetched by the GitHub Actions workflow in two halves
of the world + 100 m (one 3000 x 3000 request failed with HTTP 500), joined into
raw/dogami_chm_2014_ft.tif.

    python3 data/reserve/make_chm.py <the north half's file>   (release.json; the south half
                                                                 is in raw/dogami_src/)
"""
import shutil
import sys
from pathlib import Path

import rasterio
from rasterio.merge import merge

HERE = Path(__file__).resolve().parent
src = HERE / "raw" / "dogami_src"
src.mkdir(parents=True, exist_ok=True)
north = src / "dogami_chm_ft_n.tif"
if len(sys.argv) > 1 and Path(sys.argv[1]).resolve() != north.resolve():
    shutil.copy(sys.argv[1], north)
halves = [rasterio.open(p) for p in (north, src / "dogami_chm_ft_s.tif")]
a, t = merge(halves)
prof = halves[0].profile
prof.update(height=a.shape[1], width=a.shape[2], transform=t, compress="deflate", predictor=3, tiled=True)
out = HERE / "raw" / "dogami_chm_2014_ft.tif"
with rasterio.open(out, "w", **prof) as o:
    o.write(a)
print(f"[chm] {out.relative_to(HERE)}: {a.shape[2]} x {a.shape[1]} m")
