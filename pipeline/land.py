"""Get a finished course ready to merge: `make land NAME=<id>` (design chat, 2026-10-25).

One command for what the design chat used to do by hand after each course:
1. the course and its layouts join the daily rotation from tomorrow (America/New_York)
   in game/src/data/dailyRoster.ts, so a course never changes a day that has started
   (a course already in the rotation stays as it is);
2. the course is pinned to the pipeline that built it (pipeline/pins.py), if it isn't;
3. the course test (course_play.test.ts with data/<id>/checks.json, and <id>.test.ts if
   there is one) and the type check run.
Nothing else needs editing: the course list is made from course.json files, CLAUDE.md
points at docs/courses/, and lessons stay in the course's own file.

    python3 pipeline/land.py <id> [--no-tests] [--no-verify]

It also rebuilds the course with its pinned pipeline and checks the committed files
come out the same (regress.py; --no-verify skips that, a few minutes).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
ROSTER = ROOT / "game" / "src" / "data" / "dailyRoster.ts"
# courses the developer has said are never to be merged (and why); land refuses them
NOT_TO_MERGE = {"rock_creek": "Rock Creek Park: not up to the developer's standards (developer, 2026-10-25; PR #48 closed)"}


def game_ids(name: str) -> list[str]:
    cfg = json.load(open(ROOT / "data" / name / "course_config.json"))
    lays = [l["id"] for l in cfg.get("layouts", []) if l.get("id")]
    return lays or [cfg.get("id", name)]


def add_to_roster(ids: list[str], day: str) -> list[str]:
    src = ROSTER.read_text()
    m = re.search(r"export const DAILY_ROSTER[^{]*\{(.*?)\n\};", src, re.S)
    if not m:
        sys.exit("[land] can't find DAILY_ROSTER in dailyRoster.ts")
    body = m.group(1)
    changed = []
    for gid in ids:
        if re.search(rf"\n  {re.escape(gid)}: '\d{{4}}-\d{{2}}-\d{{2}}'", body):
            continue
        changed.append(gid)
    if changed:
        add = f"\n  // landed {datetime.now(ZoneInfo('America/New_York')).strftime('%Y-%m-%d')} (pipeline/land.py)\n" + \
              "".join(f"  {gid}: '{day}',\n" for gid in changed)
        new_body = body.rstrip("\n") + add.rstrip("\n")
        src = src[:m.start(1)] + new_body + src[m.end(1):]
        ROSTER.write_text(src)
    return changed


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    name = args[0]
    if name in NOT_TO_MERGE:
        sys.exit(f"[land] {name} is not to be merged: {NOT_TO_MERGE[name]}")
    if not (ROOT / "data" / name / "course_config.json").exists():
        sys.exit(f"[land] no data/{name}/course_config.json")
    tomorrow = (datetime.now(ZoneInfo("America/New_York")) + timedelta(days=1)).strftime("%Y-%m-%d")
    ids = game_ids(name)
    added = add_to_roster(ids, tomorrow)
    print(f"[land] daily rotation: {', '.join(added) + ' from ' + tomorrow if added else 'already in'}")
    sys.path.insert(0, str(ROOT / "pipeline"))
    import pins
    if not pins.read_pin(name):
        if pins.dirty():
            print("[land] not pinned: commit pipeline/ and assets-src/ first, then run this again (or pins.py pin)")
        else:
            pins.pin([name])
    else:
        p = pins.read_pin(name)
        print(f"[land] pinned to pipeline {p['trees']['pipeline'][:12]} ({p['commit'][:10]})")
    if "--no-verify" not in argv and pins.read_pin(name):
        r = subprocess.run([sys.executable, str(ROOT / "pipeline" / "regress.py"), name], cwd=ROOT)
        if r.returncode:
            print(f"[land] {name}: the pinned pipeline doesn't rebuild the committed files (regress above)")
            return 1
    if "--no-tests" in argv:
        return 0
    game = ROOT / "game"
    files = ["tests/unit/course_play.test.ts", "tests/unit/courses.test.ts", "tests/unit/player.test.ts"]
    own = game / "tests" / "unit" / f"{name}.test.ts"
    if own.exists():
        files.append(str(own.relative_to(game)))
    r1 = subprocess.run(["npx", "tsc", "--noEmit", "-p", "."], cwd=game)
    r2 = subprocess.run(["npx", "vitest", "run", *files, "-t", "|".join(ids) + "|registry|daily"], cwd=game)
    ok = r1.returncode == 0 and r2.returncode == 0
    print(f"[land] {name}: {'ready to merge' if ok else 'tests failed'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
