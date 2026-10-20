"""Regression check for pipeline changes (docs/reports/course_creation_speedup.md,
item 3): rebuild courses and say, per course, whether its committed game files
and reports came out the same.

    python3 pipeline/regress.py                      # every course   (make regress)
    python3 pipeline/regress.py tualatin langston    # some courses   (make regress NAMES="tualatin langston")
    python3 pipeline/regress.py --since origin/main  # only what the changes since that commit can affect
    python3 pipeline/regress.py --mine <id> ...      # your own course is allowed to change

The committed files are the baseline (no "before" build is needed). Missing
build inputs are fetched first (fetch_raw.py). Exit code 1 if a course other
than --mine changed. Courses are built one after another (the sandbox has two
CPUs; a full run takes 45-60 minutes, East Potomac and Franklin the longest).
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHARED = ("pipeline/", "assets-src/", "Makefile")  # a change here can reach every course


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


def affected(changed: list[str]) -> list[str]:
    """Courses whose build a set of changed files can reach: a course's own folder reaches
    that course; a theme's palette or tree painters (palettes/<t>.json, trees_<t>.py) the
    courses of that theme; any other shared file every course."""
    out = set()
    courses = all_courses()
    for f in changed:
        if f.startswith(NO_BUILD) or f.startswith("game/") or f.startswith("docs/") or f.endswith(".md"):
            if not f.startswith("data/"):
                continue
        m = f.split("/")
        if f.startswith("data/") and len(m) > 2:
            if m[1] in courses:
                out.add(m[1])
            continue
        if f.startswith("assets-src/palettes/") and f.endswith(".json"):
            out |= {c for c in courses if theme_of(c) == m[-1][:-5]}
            continue
        if f.startswith("assets-src/trees_") and f.endswith(".py"):
            out |= {c for c in courses if theme_of(c) == m[-1][len("trees_"):-3]}
            continue
        if f.startswith(SHARED):
            return courses
    return sorted(out)


def changed_files(name: str) -> list[str]:
    out = subprocess.check_output(["git", "status", "--porcelain", "--", *outputs(name)], cwd=ROOT, text=True)
    return [line[3:] for line in out.splitlines()]


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
        subprocess.run([sys.executable, "pipeline/fetch_raw.py", n], cwd=ROOT, check=True)
        log = ROOT / "data" / n / "build" / "regress.log"
        log.parent.mkdir(parents=True, exist_ok=True)
        with open(log, "w") as f:
            r = subprocess.run(["make", "course", f"NAME={n}"], cwd=ROOT, stdout=f, stderr=subprocess.STDOUT)
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
