"""Build one course: `make course NAME=<id>` (CLAUDE.md 5.3; docs/COURSE_BUILD.md).

    python3 pipeline/build.py <id>                # every step, with the course's pinned pipeline if it has one
    python3 pipeline/build.py <id> --from s06_holes   # that step and the ones after it
    python3 pipeline/build.py <id> --only s10_export  # one step
    python3 pipeline/build.py <id> --head         # this checkout's pipeline even if the course is pinned
    python3 pipeline/build.py <id> --fresh        # no reuse of earlier results (memo.py): what regress does

A pinned course (data/<id>/pipeline_pin.json, pipeline/pins.py) is built by its own
pipeline, unpacked from git, so changes to the shared code never change it.
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

STEPS = ["s00_prepare_rasters", "s01_osm", "merge_edits", "s02_reproject", "s02b_approaches", "s03_audit",
         "s04_elevation", "s05_trees", "s06_holes", "s06b_tee_shots", "s07_greens", "s08_surface",
         "s09_render", "s09b_green_views", "s10_export"]
# the pipeline before build.py existed (pins made from main on 2026-10-25 and earlier) ran these, from the Makefile
LEGACY_STEPS = STEPS


def run_steps(name: str, pipeline_dir: Path, steps: list[str], env: dict) -> int:
    total = time.time()
    for s in steps:
        t0 = time.time()
        r = subprocess.run([sys.executable, f"{s}.py", name], cwd=pipeline_dir, env=env)
        if r.returncode:
            print(f"[build] {name}: {s} failed (exit {r.returncode})", flush=True)
            return r.returncode
        print(f"[build] {name}: {s} {time.time() - t0:.1f} s", flush=True)
    print(f"[build] {name}: {len(steps)} steps in {time.time() - total:.0f} s", flush=True)
    return 0


def pick(steps: list[str], start: str | None, only: str | None) -> list[str]:
    for s in (start, only):
        if s and s not in steps:
            sys.exit(f"[build] no step {s}; steps: {', '.join(steps)}")
    if only:
        return [only]
    return steps[steps.index(start):] if start else steps


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    flags = {a for a in argv if a.startswith("--") and "=" not in a}
    opt = dict(a[2:].split("=", 1) for a in argv if a.startswith("--") and "=" in a)
    # `--from X` and `--only X` as two words
    for k in ("from", "only"):
        if f"--{k}" in flags:
            i = argv.index(f"--{k}")
            opt[k] = argv[i + 1]
            args.remove(argv[i + 1])
            flags.discard(f"--{k}")
    if len(args) != 1:
        sys.exit(__doc__)
    name = args[0]
    env = dict(os.environ)
    if "--fresh" in flags:
        env["SS_FRESH"] = "1"
    steps = pick(STEPS, opt.get("from"), opt.get("only"))
    if "--here" in flags or "--head" in flags:
        return run_steps(name, HERE, steps, env)
    import pins
    pin = pins.read_pin(name)
    if not pin or pins.same_as_checkout(pin):
        return run_steps(name, HERE, steps, env)
    snap = pins.materialize(pin)
    print(f"[build] {name}: pinned pipeline {pins.snapshot_key(pin)} ({pin['commit'][:10]}, {pin.get('date', '')})", flush=True)
    pinned_build = snap / "pipeline" / "build.py"
    if pinned_build.exists():
        return subprocess.run([sys.executable, str(pinned_build), name, "--here", *[a for a in argv if a != name]],
                              env=env).returncode
    return run_steps(name, snap / "pipeline", pick(LEGACY_STEPS, opt.get("from"), opt.get("only")), env)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
