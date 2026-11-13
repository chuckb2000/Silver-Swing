"""Regression check: rebuild courses and say, per course, whether its committed
game files and reports came out the same.

    python3 pipeline/regress.py --since origin/main  # only what the changes since that commit can affect
    python3 pipeline/regress.py tualatin langston    # some courses   (make regress NAMES="tualatin langston")
    python3 pipeline/regress.py                      # every course   (make regress; hours: rarely needed)
    python3 pipeline/regress.py --mine <id> ...      # your own course is allowed to change

Each course is built with its pinned pipeline (pipeline/pins.py), so a change to
`pipeline/` or `assets-src/` can only reach the courses that aren't pinned (the
ones being built); `--since` picks those. A full run checks that every course
still rebuilds from its own data and pipeline (the Python packages can drift).

The committed files are the baseline (no "before" build is needed). Missing
build inputs are fetched first (fetch_raw.py). Builds run with --fresh (no
reuse of earlier results). Exit code 1 if a course other than --mine changed.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHARED = ("pipeline/", "assets-src/", "Makefile")  # a change here can reach every unpinned course


def all_courses() -> list[str]:
    return sorted(p.parent.name for p in (ROOT / "data").glob("*/course_config.json"))


def outputs(name: str) -> list[str]:
    """The paths a course's build writes into git: its data folder and its game folders (one per layout)."""
    cfg = json.load(open(ROOT / "data" / name / "course_config.json"))
    ids = [name] + [lay["id"] for lay in cfg.get("layouts", [])]
    return [f"data/{name}"] + [f"game/public/courses/{i}" for i in ids]


def since(ref: str) -> list[str]:
    changed = subprocess.check_output(["git", "diff", "--name-only", ref, "--"], cwd=ROOT, text=True).split()
    changed += subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"], cwd=ROOT, text=True).split()
    return affected(changed)


# assets-src files no course build reads (logos, cards, the title art, UI sprites, the font)
NO_BUILD = ("assets-src/course_logos/", "assets-src/cards/", "assets-src/logos.py", "assets-src/course_cards.py",
            "assets-src/title_art.py", "assets-src/sprites.py", "assets-src/font.py", "assets-src/build_assets.py")


def theme_of(name: str) -> str:
    return json.load(open(ROOT / "data" / name / "course_config.json")).get("theme", "pnw")


def pinned(name: str) -> bool:
    return (ROOT / "data" / name / "pipeline_pin.json").exists()


def affected(changed: list[str]) -> list[str]:
    """Courses whose build a set of changed files can reach: a course's own folder reaches
    that course; shared code (pipeline/, assets-src/, the Makefile) only the courses without
    a pinned pipeline, and a theme's palette or tree painters only those of that theme."""
    out = set()
    courses = [c for c in all_courses() if not pinned(c)]
    every = all_courses()
    for f in changed:
        if f.startswith(NO_BUILD) or f.startswith("game/") or f.startswith("docs/") or f.endswith(".md"):
            if not f.startswith("data/"):
                continue
        m = f.split("/")
        if f.startswith("data/") and len(m) > 2:
            if m[1] in every:
                out.add(m[1])
            continue
        if f.startswith("assets-src/palettes/") and f.endswith(".json"):
            out |= {c for c in courses if theme_of(c) == m[-1][:-5]}
            continue
        if f.startswith("assets-src/trees_") and f.endswith(".py"):
            out |= {c for c in courses if theme_of(c) == m[-1][len("trees_"):-3]}
            continue
        if f.startswith(SHARED):
            out |= set(courses)
    return sorted(out)


def same_pixels(path: str) -> bool:
    """A changed PNG whose pixels (mode, size, palette) are the committed file's: only its compressed
    bytes differ, as they do between machines with another zlib or Pillow (2026-11-13: every course
    built in a course chat's sandbox re-encoded differently here, pixel for pixel the same)."""
    if not path.endswith(".png"):
        return False
    import io
    import numpy as np
    from PIL import Image
    try:
        old = subprocess.run(["git", "show", f"HEAD:{path}"], cwd=ROOT, capture_output=True, check=True).stdout
        a, b = Image.open(io.BytesIO(old)), Image.open(ROOT / path)
        return (a.mode == b.mode and a.size == b.size and a.getpalette() == b.getpalette()
                and np.array_equal(np.asarray(a), np.asarray(b)))
    except Exception:
        return False


def changed_files(name: str) -> list[str]:
    """Committed files the build changed, and new files outside raw/ (fetch_raw puts release files in raw/).
    PNGs that differ only in their compressed bytes go back to the committed copy and don't count."""
    out = subprocess.check_output(["git", "status", "--porcelain", "--", *outputs(name)], cwd=ROOT, text=True)
    files = [line[3:] for line in out.splitlines() if not (line.startswith("??") and "/raw/" in line)]
    modified = {line[3:] for line in out.splitlines() if line.startswith(" M")}
    same = [f for f in files if f in modified and same_pixels(f)]
    if same:
        subprocess.run(["git", "checkout", "--", *same], cwd=ROOT, check=True)
        print(f"[regress] {name}: {len(same)} PNGs re-encoded only (the same pixels): kept as committed", flush=True)
    return [f for f in files if f not in same]


def main(argv: list[str]):
    mine, names, i = set(), [], 0
    while i < len(argv):
        a = argv[i]
        if a == "--since":
            names += since(argv[i + 1]); i += 2; continue
        if a == "--mine":
            i += 1
            while i < len(argv) and not argv[i].startswith("--"):
                mine.add(argv[i]); i += 1
            continue
        names.append(a); i += 1
    names = sorted(set(names)) if names or "--since" in argv else all_courses()
    if not names:
        print("[regress] nothing the changes can affect")
        return 0
    rows, bad = [], False
    for n in names:
        t0 = time.time()
        if subprocess.run([sys.executable, "pipeline/fetch_raw.py", n], cwd=ROOT).returncode:
            rows.append((n, (time.time() - t0) / 60, "FETCH FAILED (see above): not rebuilt"))
            print(f"[regress] {n}: fetch failed, not rebuilt", flush=True)
            bad = True
            continue
        log = ROOT / "data" / n / "build" / "regress.log"
        log.parent.mkdir(parents=True, exist_ok=True)
        with open(log, "w") as f:
            r = subprocess.run([sys.executable, "pipeline/build.py", n, "--fresh"], cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
        mins = (time.time() - t0) / 60
        if r.returncode:
            rows.append((n, mins, f"BUILD FAILED (see data/{n}/build/regress.log)"))
            bad = True
            continue
        diff = changed_files(n)
        if not diff:
            verdict = "unchanged"
        else:
            verdict = f"{len(diff)} files changed: " + ", ".join(diff[:4]) + (" ..." if len(diff) > 4 else "")
            if n not in mine:
                bad = True
        rows.append((n, mins, verdict))
        print(f"[regress] {n}: {verdict} ({mins:.1f} min)", flush=True)
    print("\n| course | minutes | result |\n|---|---|---|")
    for n, m, v in rows:
        print(f"| {n}{' (yours)' if n in mine else ''} | {m:.1f} | {v} |")
    if bad:
        print("\n[regress] a course changed: look at each difference (images side by side), then fix it or explain it to the developer")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
