"""Fairway main axis (the longest path through the medial axis of a fairway
polygon), as data/tualatin/make_holes.py draws it; shared here for course
scripts that place dogleg bends (data/langdon/make_bends.py)."""
from __future__ import annotations

import numpy as np


def centreline(geom, res=0.5):
    """Main axis of each fairway polygon: the longest path through the raster
    skeleton (medial axis) of the polygon, end to end, so side spurs into
    corners and lobes are left out. Returns the axis points of all parts."""
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    return np.vstack([_main_axis(p, res) for p in polys if p.area > 200])


def _main_axis(poly, res):
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra
    from skimage.morphology import skeletonize
    minx, miny, maxx, maxy = poly.bounds
    w, h = int((maxx - minx) / res) + 3, int((maxy - miny) / res) + 3
    tr = from_origin(minx - res, maxy + res, res, res)
    m = rasterize([(poly, 1)], out_shape=(h, w), transform=tr).astype(bool)
    sk = skeletonize(m)
    rr, cc = np.nonzero(sk)
    idx = -np.ones(sk.shape, dtype=np.int64)
    idx[rr, cc] = np.arange(len(rr))
    a, b, wts = [], [], []
    for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
        r2, c2 = rr + dr, cc + dc
        ok = (r2 >= 0) & (r2 < sk.shape[0]) & (c2 >= 0) & (c2 < sk.shape[1])
        j = np.full(len(rr), -1)
        j[ok] = idx[r2[ok], c2[ok]]
        sel = j >= 0
        a += list(np.nonzero(sel)[0]); b += list(j[sel]); wts += [np.hypot(dr, dc)] * int(sel.sum())
    G = coo_matrix((wts, (a, b)), shape=(len(rr), len(rr))).tocsr()
    G = G + G.T
    d0 = dijkstra(G, indices=0)
    d0[np.isinf(d0)] = -1
    u = int(np.argmax(d0))                      # one end of the longest path
    du, pred = dijkstra(G, indices=u, return_predecessors=True)
    du[np.isinf(du)] = -1
    v = int(np.argmax(du))                      # the other end
    path = [v]
    while path[-1] != u and pred[path[-1]] >= 0:
        path.append(int(pred[path[-1]]))
    p = np.array(path)
    xs = tr.c + (cc[p] + 0.5) * res
    ys = tr.f - (rr[p] + 0.5) * res
    return np.column_stack([xs, ys])
