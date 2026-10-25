"""PNG saves that skip the encoding when the same image was saved before (design chat,
2026-10-25). The art steps write hundreds of PNGs with optimize=True (the slow part of
saving); when a rebuild draws an image exactly as before, the bytes are copied from the
cache instead (data/<id>/build/.png_cache, set by stepcache.py as SS_PNG_CACHE). The
file written is byte for byte what Pillow would write. Without SS_PNG_CACHE it's a plain save.
"""
from __future__ import annotations

import hashlib
import os
import zlib
from pathlib import Path

from PIL import Image
import PIL


def save_png(img: Image.Image, path, **kw) -> None:
    cache = os.environ.get("SS_PNG_CACHE")
    if not cache:
        img.save(path, **kw)
        return
    h = hashlib.blake2b(digest_size=20)
    h.update(f"{PIL.__version__} {zlib.ZLIB_RUNTIME_VERSION} {img.mode} {img.size} {sorted(kw.items())}".encode())
    if img.mode == "P":
        h.update(bytes(img.getpalette() or []))
        if "transparency" in img.info:
            h.update(repr(img.info["transparency"]).encode())
    h.update(img.tobytes())
    hit = Path(cache) / f"{h.hexdigest()}.png"
    if hit.exists():
        Path(path).write_bytes(hit.read_bytes())
        return
    img.save(path, **kw)
    hit.parent.mkdir(parents=True, exist_ok=True)
    tmp = hit.with_suffix(f".{os.getpid()}.tmp")
    tmp.write_bytes(Path(path).read_bytes())
    os.replace(tmp, hit)
