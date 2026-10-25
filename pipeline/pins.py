"""Each course is built by the pipeline it was made with (design chat, 2026-10-25).

A finished course keeps `data/<id>/pipeline_pin.json`: the git trees of `pipeline/`
and `assets-src/` that built its committed files. `make course NAME=<id>` builds a
pinned course with that pipeline, unpacked from git into `.pins/<key>/` (gitignored),
so a later change to the shared code can't change it and needs no regression check
of the other courses. A course without a pin (one being built) uses this checkout.

    python3 pipeline/pins.py status              # every course: pinned to what, same as this checkout?
    python3 pipeline/pins.py pin <id> ...        # pin to this checkout's committed pipeline/ and assets-src/
    python3 pipeline/pins.py pin --at <commit> <id> ...   # pin to a commit's (what built the course's files)
    python3 pipeline/pins.py unpin <id> ...      # build with this checkout from now on (then rebuild, compare, pin)

Updating an old course to the current pipeline is a choice made for that course:
unpin it, `make course`, look at what changed, and pin it again.

The trees are content addresses, so a pin survives a rebase. They must be in a
commit that reaches `main` (pin after committing; courses merge with merge commits).
In a partial or shallow clone a missing tree is fetched from `origin` by the
commit recorded with it.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tarfile
import io
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PIN_FILE = "pipeline_pin.json"
# the files under the pinned folders that course builds read: the pipeline's own top-level files and
# assets-src's top-level modules and palettes; everything else there (logos, cards, logo concepts, music,
# title art, UI sprites) can change without moving a course off this checkout's pipeline
NOT_BUILD_PY = ("assets-src/logos.py", "assets-src/course_cards.py", "assets-src/title_art.py",
                "assets-src/sprites.py", "assets-src/font.py", "assets-src/build_assets.py",
                # the pipeline's tools, run by hand or by make, never inside a build step
                "pipeline/pins.py", "pipeline/regress.py", "pipeline/land.py", "pipeline/intake.py",
                "pipeline/fetch_raw.py", "pipeline/clip_raster.py", "pipeline/propose_channels.py",
                "pipeline/propose_tees.py", "pipeline/propose_trace.py", "pipeline/desk_export.py",
                "pipeline/desk_to_proposed.py")


def builds_read(path: str) -> bool:
    parts = path.split("/")
    if parts[0] == "pipeline":
        return len(parts) == 2 and path not in NOT_BUILD_PY
    if parts[0] == "assets-src":
        return (len(parts) == 2 and path.endswith(".py") and path not in NOT_BUILD_PY) or parts[1] == "palettes"
    return False


PINNED = ("pipeline", "assets-src")      # what a pin freezes; data/ and game/ are always this checkout's
SNAP_DIR = ROOT / ".pins"


def git(*args: str, check: bool = True, **kw) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=check, capture_output=True, text=True, **kw).stdout.strip()


def all_courses() -> list[str]:
    return sorted(p.parent.name for p in (ROOT / "data").glob("*/course_config.json"))


def read_pin(name: str) -> dict | None:
    p = ROOT / "data" / name / PIN_FILE
    return json.load(open(p)) if p.exists() else None


def head_trees(rev: str = "HEAD") -> dict:
    """The committed trees of the pinned folders at a commit."""
    return {d: git("rev-parse", f"{rev}:{d}") for d in PINNED}


def dirty(paths=PINNED, build_only: bool = False) -> list[str]:
    out = git("status", "--porcelain", "--", *paths)
    files = [line[3:] for line in out.splitlines()]
    return [f for f in files if builds_read(f)] if build_only else files


def build_key(rev: str = "HEAD") -> str:
    """A digest of the pinned folders' files that course builds read (builds_read)."""
    import hashlib
    lines = [l for l in git("ls-tree", "-r", rev, "--", *PINNED).splitlines() if builds_read(l.split("\t", 1)[1])]
    return hashlib.sha256("\n".join(lines).encode()).hexdigest()


def same_as_checkout(pin: dict) -> bool:
    """Does this checkout's committed and clean pipeline build the same as the pin?"""
    if pin.get("build_key"):
        return not dirty(build_only=True) and pin["build_key"] == build_key()
    return not dirty() and all(pin["trees"][d] == t for d, t in head_trees().items())


def snapshot_key(pin: dict) -> str:
    return "-".join(pin["trees"][d][:12] for d in PINNED)


def _have(obj: str) -> bool:
    return subprocess.run(["git", "cat-file", "-e", obj], cwd=ROOT, capture_output=True).returncode == 0


def materialize(pin: dict) -> Path:
    """Unpack the pinned trees into .pins/<key>/ (once) with links to this checkout's data/ and game/."""
    snap = SNAP_DIR / snapshot_key(pin)
    if (snap / ".complete").exists():
        return snap
    for d in PINNED:
        t = pin["trees"][d]
        if not _have(t):
            print(f"[pins] fetching the pinned {d} ({t[:12]}) from origin", flush=True)
            subprocess.run(["git", "fetch", "-q", "origin", pin["commit"]], cwd=ROOT, check=False)
            if not _have(t):
                sys.exit(f"[pins] the pinned {d} tree {t} isn't in this clone or on origin (commit {pin['commit']}); "
                         f"was the course branch merged with a merge commit?")
    if snap.exists():
        shutil.rmtree(snap)
    snap.mkdir(parents=True)
    for d in PINNED:
        tar = subprocess.run(["git", "archive", "--format=tar", pin["trees"][d]], cwd=ROOT, check=True, capture_output=True).stdout
        with tarfile.open(fileobj=io.BytesIO(tar)) as tf:
            tf.extractall(snap / d, filter="data")
    # the pinned code finds the repo as Path(__file__).resolve().parent.parent: point it at the real folders
    for d in ("data", "game"):
        os.symlink(os.path.relpath(ROOT / d, snap), snap / d)
    (snap / ".complete").write_text(json.dumps(pin, indent=1) + "\n")
    return snap


def pin(names: list[str], at: str | None = None):
    bad = [] if at else dirty(build_only=True)
    if bad:
        sys.exit(f"[pins] commit pipeline/ and assets-src/ first (a pin names committed trees): {', '.join(bad[:5])}")
    rev = at or "HEAD"
    trees = head_trees(rev)
    rec = {"trees": trees, "build_key": build_key(rev), "commit": git("rev-parse", rev), "date": git("log", "-1", "--format=%cs", rev),
           "note": "the pipeline that built this course's committed files; pipeline/pins.py"}
    for n in names:
        (ROOT / "data" / n / PIN_FILE).write_text(json.dumps(rec, indent=1) + "\n")
        print(f"[pins] {n}: pinned to pipeline {trees['pipeline'][:12]}, assets-src {trees['assets-src'][:12]} ({rec['commit'][:10]})")


def unpin(names: list[str]):
    for n in names:
        p = ROOT / "data" / n / PIN_FILE
        if p.exists():
            p.unlink()
            print(f"[pins] {n}: unpinned (builds with this checkout)")


def status():
    print("| course | pinned pipeline | pinned assets-src | commit | as this checkout |\n|---|---|---|---|---|")
    for n in all_courses():
        p = read_pin(n)
        if not p:
            print(f"| {n} | - | - | - | unpinned: builds with this checkout |")
            continue
        same = same_as_checkout(p)
        print(f"| {n} | {p['trees']['pipeline'][:12]} | {p['trees']['assets-src'][:12]} | {p['commit'][:10]} ({p.get('date', '')}) | {'yes' if same else 'no'} |")


if __name__ == "__main__":
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("status", [])
    if cmd == "status":
        status()
    elif cmd == "pin" and args[:1] == ["--at"] and len(args) > 2:
        pin(args[2:], at=args[1])
    elif cmd == "pin" and args:
        pin(args)
    elif cmd == "unpin" and args:
        unpin(args)
    else:
        sys.exit(__doc__)
