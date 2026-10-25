"""Skip build steps whose inputs haven't changed (design chat, 2026-10-25).

build.py runs each step through `python3 stepcache.py run <step> <course>`. That
records what the step really used and made (build/.stamps/<step>.json):
- every file it read under data/, game/ and assets-src/, as it was when first read
  (Python's audit hook, plus rasterio and geopandas, which open files in C);
- every file it wrote, as it left it (also a scan of build/ and the game folder
  by modification time, for files written in C);
- the folders it listed outside build/ (raw/, edited/), the course_config.json
  keys it looked at, the environment variables in ENV_KEYS, and the code.

plan() replays the records: a step can be skipped when its code, config keys
and environment are the same and every file it read is as it would be if the
steps before it had run (a skipped step "writes" the files it wrote last time).
The first step that can't be skipped runs, and so does everything whose files
on disk aren't what the replay says (a later step may have changed them).
`--fresh` (SS_FRESH=1, what regress uses) runs everything.
"""
from __future__ import annotations

import hashlib
import json
import os
import runpy
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TRACKED = ("data", "game", "assets-src")
BIG = 64 << 20          # files above this are known by size and modification time, not content
ENV_KEYS = ("HOLES",)   # environment variables a step reads (s09b: only some holes)
STAMP_VERSION = 1
MISSING = "missing"


def real_roots() -> dict[str, str]:
    return {k: os.path.realpath(ROOT / k) for k in TRACKED}


def rel_key(path, roots=None) -> str | None:
    """'data/sandpines/build/x.npy' for a path under one of the tracked folders, else None."""
    roots = roots or real_roots()
    try:
        p = os.path.realpath(os.fsdecode(path))
    except (TypeError, ValueError):
        return None
    for k, r in roots.items():
        if p == r or p.startswith(r + os.sep):
            return k + p[len(r):]
    return None


def key_path(key: str) -> Path:
    return ROOT / key


def digest(p: Path) -> str:
    try:
        st = p.stat()
    except FileNotFoundError:
        return MISSING
    if p.is_dir():
        return "dir"
    if st.st_size > BIG:
        return f"stat:{st.st_size}:{st.st_mtime_ns}"
    h = hashlib.blake2b(digest_size=16)
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def listing(p: Path) -> str:
    try:
        names = sorted(os.listdir(p))
    except (FileNotFoundError, NotADirectoryError):
        return MISSING
    return hashlib.blake2b("\n".join(names).encode(), digest_size=16).hexdigest()


def value_hash(v) -> str:
    return hashlib.blake2b(json.dumps(v, sort_keys=True, default=str).encode(), digest_size=16).hexdigest()


_libs = None


def libs_hash() -> str:
    """Python and the versions of the libraries that shape the output."""
    global _libs
    if _libs:
        return _libs
    from importlib import metadata
    h = hashlib.blake2b(digest_size=16)
    h.update(f"v{STAMP_VERSION} {sys.version}".encode())
    for pkg in ("numpy", "scipy", "shapely", "pyproj", "rasterio", "geopandas", "pandas", "pillow", "scikit-image",
                "laspy", "pyogrio", "fiona", "matplotlib"):
        try:
            h.update(f"{pkg}={metadata.version(pkg)}".encode())
        except metadata.PackageNotFoundError:
            pass
    _libs = h.hexdigest()
    return _libs


def code_files() -> dict[str, str]:
    """The pipeline and assets-src modules this process has loaded (the step's own code, including
    modules imported by name at run time, such as a theme's tree painters), with their digests."""
    out = {}
    bases = {"pipeline": os.path.realpath(HERE), "assets-src": os.path.realpath(ROOT / "assets-src")}
    for m in list(sys.modules.values()):
        f = getattr(m, "__file__", None)
        if not f:
            continue
        f = os.path.realpath(f)
        for k, b in bases.items():
            if f.startswith(b + os.sep):
                rel = k + f[len(b):]
                out[rel] = digest(ROOT / rel)
    return dict(sorted(out.items()))


def stamp_path(name: str, step: str) -> Path:
    return ROOT / "data" / name / "build" / ".stamps" / f"{step}.json"


def load_record(name: str, step: str) -> dict | None:
    try:
        return json.load(open(stamp_path(name, step)))
    except (OSError, json.JSONDecodeError):
        return None


def settings_match(rec: dict, cfg: dict) -> str:
    """'' when the step's code, environment and config keys are as recorded, else why not."""
    if rec.get("libs") != libs_hash():
        return "Python packages changed"
    for k, h in rec.get("code", {}).items():
        if digest(ROOT / k) != h:
            return f"{k} changed"
    if rec.get("env") != {k: os.environ.get(k) for k in ENV_KEYS}:
        return "environment changed"
    for k, h in rec.get("cfg", {}).items():
        now = value_hash(cfg) if k == "*" else value_hash(cfg[k] if k in cfg else MISSING)
        if now != h:
            return f"config '{k}' changed"
    for k, h in rec.get("dirs", {}).items():
        if listing(key_path(k)) != h:
            return f"{k}/ changed"
    return ""


def plan(name: str, steps: list[str], start: int, cfg: dict) -> tuple[int, dict]:
    """The index of the first step from `start` on that has to run (len(steps) if none), and why
    the ones before it can be skipped or why it can't. Replays the records: a skipped step leaves
    the files it wrote last time; a step whose inputs differ from that replay has to run; and the
    files on disk must match the replay where the run starts (else start at the step that made them)."""
    if os.environ.get("SS_FRESH"):
        return start, {"why": "fresh build"}
    disk: dict[str, str] = {}

    def on_disk(k):
        if k not in disk:
            disk[k] = digest(key_path(k))
        return disk[k]

    skipped: list[dict] = []   # records of the steps start .. m-1, in order

    def replay(upto: int):
        v, mk = {}, {}
        for i, r in enumerate(skipped[:upto - start]):
            for k, h in r.get("writes", {}).items():
                v[k], mk[k] = h, start + i
        return v, mk

    why = ""
    m = start
    virtual: dict[str, str] = {}
    while m < len(steps):
        rec = load_record(name, steps[m])
        if rec is None:
            why = "no record"
            break
        why = settings_match(rec, cfg)
        if why:
            break
        bad = next((k for k, h in rec.get("reads", {}).items() if (virtual[k] if k in virtual else on_disk(k)) != h), None)
        if bad:
            why = f"{bad} changed"
            break
        skipped.append(rec)
        for k, h in rec.get("writes", {}).items():
            virtual[k] = h
        m += 1
    # the files the skipped steps left must still be on disk as they left them
    while m > start:
        virtual, maker = replay(m)
        stale = [k for k, h in virtual.items() if on_disk(k) != h]
        if not stale:
            break
        m = min(maker[k] for k in stale)
        why = f"{stale[0]} isn't as {steps[maker[stale[0]]]} left it"
    return m, {"why": why}


# --- the child: run a step and record what it touched -------------------------------------

class TrackingDict(dict):
    """course_config.json as a step sees it: notes the keys it looks at."""
    seen: set

    def _note(self, k):
        self.seen.add(k)

    def __getitem__(self, k):
        self._note(k); return super().__getitem__(k)

    def get(self, k, d=None):
        self._note(k); return super().get(k, d)

    def __contains__(self, k):
        self._note(k); return super().__contains__(k)

    def setdefault(self, k, d=None):
        self._note(k); return super().setdefault(k, d)

    def pop(self, k, *a):
        self._note(k); return super().pop(k, *a)

    def _all(self):
        if "*" not in self.seen and os.environ.get("SS_TRACE_CFG"):
            import traceback
            traceback.print_stack(limit=4)
        self.seen.add("*")

    def keys(self):
        self._all(); return super().keys()

    def items(self):
        self._all(); return super().items()

    def values(self):
        self._all(); return super().values()

    def __iter__(self):
        self._all(); return super().__iter__()

    def __len__(self):
        self._all(); return super().__len__()

    def __bool__(self):          # `cfg or {}`: only whether it's empty
        return dict.__len__(self) > 0

    def copy(self):
        self._all(); return dict(super().items())

    def __eq__(self, o):
        self._all(); return dict.__eq__(self, o)

    __hash__ = None


def child(step: str, name: str) -> int:
    roots = real_roots()
    reads: dict[str, str] = {}     # first-read state of each file (before the step changes it)
    writes: set[str] = set()
    dirs: dict[str, str] = {}      # folders listed (outside build/), as they were
    start = time.time()
    start_ns = time.time_ns()

    def note_read(path):
        k = rel_key(path, roots)
        if k and k not in reads and k not in writes and not k.endswith((".pyc", ".py")) and "/.stamps/" not in k:
            reads[k] = digest(key_path(k))   # before the step can change it

    def note_write(path):
        k = rel_key(path, roots)
        if k and "/.stamps/" not in k:
            writes.add(k)

    busy = [False]   # the hook's own work (realpath, hashing) opens files too

    def hook(event, args):
        if busy[0] or event not in ("open", "os.listdir", "os.scandir"):
            return
        busy[0] = True
        try:
            _hook(event, args)
        finally:
            busy[0] = False

    def _hook(event, args):
        if event == "open":
            path, mode, flags = args
            if isinstance(path, int) or path is None:
                return
            if mode is None:
                w = bool(flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND))
            else:
                w = any(c in mode for c in "wax+")
            (note_write if w else note_read)(path)
        elif event in ("os.listdir", "os.scandir"):
            p = args[0] if args else "."
            if isinstance(p, int):
                return
            k = rel_key(p if p is not None else ".", roots)
            if k and k.startswith("data/") and "/build" not in k and k not in dirs:
                dirs[k] = listing(key_path(k))

    sys.addaudithook(hook)

    # libraries that open files in C: note the path where Python hands it over
    import rasterio
    _ropen = rasterio.open

    def ropen(fp, mode="r", *a, **kw):
        if isinstance(fp, (str, os.PathLike)):
            (note_write if mode in ("w", "w+", "r+") else note_read)(fp)
        return _ropen(fp, mode, *a, **kw)
    rasterio.open = ropen
    import geopandas
    _gread = geopandas.read_file

    def gread(fn, *a, **kw):
        if isinstance(fn, (str, os.PathLike)):
            note_read(fn)
        return _gread(fn, *a, **kw)
    geopandas.read_file = gread
    _gto = geopandas.GeoDataFrame.to_file

    def gto(self, fn, *a, **kw):
        if isinstance(fn, (str, os.PathLike)):
            note_write(fn)
        return _gto(self, fn, *a, **kw)
    geopandas.GeoDataFrame.to_file = gto

    # course_config.json: note the keys the step reads, against the values on disk
    sys.path.insert(0, str(HERE))
    import common
    seen: set = set()
    _load = common.load_config

    def load_config(n):
        busy[0] = True       # course_config.json is known by the keys read, not as a whole file
        try:
            d = TrackingDict(_load(n))
        finally:
            busy[0] = False
        d.seen = seen
        return d
    common.load_config = load_config
    busy[0] = True
    cfg_on_disk = _load(name)
    busy[0] = False

    sys.argv = [f"{step}.py", name]
    os.chdir(HERE)
    try:
        runpy.run_path(str(HERE / f"{step}.py"), run_name="__main__")
        code = 0
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    if code:
        return code

    # files the step made or changed (also those written by C code: a scan by modification time)
    busy[0] = True       # from here on the opens are the record's own
    for base in output_dirs(name):
        if base.is_dir():
            for p in base.rglob("*"):
                if p.is_file() and p.stat().st_mtime_ns >= start_ns and "/.stamps/" not in str(p):
                    note_write(p)
    stamp = {
        "step": step, "libs": libs_hash(),
        "code": {**code_files(), f"pipeline/{step}.py": digest(HERE / f"{step}.py")},
        "env": {k: os.environ.get(k) for k in ENV_KEYS},
        "cfg": {k: (value_hash(cfg_on_disk) if k == "*" else value_hash(cfg_on_disk.get(k, MISSING) if k in cfg_on_disk else MISSING))
                for k in sorted(seen)},
        "dirs": dict(sorted(dirs.items())),
        "reads": dict(sorted(reads.items())),
        "writes": {k: digest(key_path(k)) for k in sorted(writes)},
        "seconds": round(time.time() - start, 1),
    }
    sp = stamp_path(name, step)
    sp.parent.mkdir(parents=True, exist_ok=True)
    sp.write_text(json.dumps(stamp, indent=1) + "\n")
    return 0


def output_dirs(name: str) -> list[Path]:
    """Where a step writes: the course's build/ and its game folders (one per layout)."""
    try:
        cfg = json.load(open(ROOT / "data" / name / "course_config.json"))
    except OSError:
        cfg = {}
    ids = [name] + [lay["id"] for lay in cfg.get("layouts", []) if lay.get("id")]
    return [ROOT / "data" / name / "build"] + [ROOT / "game" / "public" / "courses" / i for i in dict.fromkeys(ids)]


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "run":
        sys.exit(child(sys.argv[2], sys.argv[3]))
    sys.exit(__doc__)
