"""Put a course's build inputs that aren't kept in git (lidar, big DEM tiles)
into data/<id>/raw/, from the GitHub release named in data/<id>/release.json
(docs/reports/course_creation_speedup.md, item 3).

    python3 pipeline/fetch_raw.py <id>        # or: make fetch NAME=<id>

release.json: {"release": "<tag>", "files": [entry, ...]}. Each entry names a
release `asset` and its `sha256`, and the files it gives (`outputs`: path under
data/<id>/ -> sha256). The asset is copied (`to`: a folder), unzipped
(`extract`: member names, into `to`) or fed to a script (`run`: a command with
{file} for the asset's path). An entry whose outputs are all in place with the
right hashes is skipped, so this is quick when nothing is missing. Downloads go
through `gh api` (REST), resume after a dropped connection, and are checked
against the hash before use. A course without release.json needs nothing.
"""
from __future__ import annotations

import hashlib
import json
import shlex
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def repo_slug() -> str:
    url = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=ROOT, text=True).strip()
    tail = url.split("github.com")[-1].lstrip(":/")
    return tail[:-4] if tail.endswith(".git") else tail


def gh_json(path: str):
    return json.loads(subprocess.check_output(["gh", "api", path], text=True))


def download(slug: str, asset: dict, dest: Path, want_sha: str):
    """Download a release asset to `dest`, resuming after dropped connections."""
    size = int(asset["size"])
    for attempt in range(20):
        have = dest.stat().st_size if dest.exists() else 0
        if have >= size:
            break
        cmd = ["gh", "api", f"repos/{slug}/releases/assets/{asset['id']}", "-H", "Accept: application/octet-stream"]
        if have:
            cmd += ["-H", f"Range: bytes={have}-"]
        with open(dest, "ab") as out:
            subprocess.run(cmd, stdout=out, check=False)
        got = dest.stat().st_size
        print(f"[fetch]   {asset['name']}: {got / 1e6:.0f} of {size / 1e6:.0f} MB")
        if got == have:
            print("[fetch]   no progress; trying again")
    if dest.stat().st_size != size:
        raise SystemExit(f"[fetch] {asset['name']}: download incomplete ({dest.stat().st_size} of {size} bytes)")
    if sha256(dest) != want_sha:
        raise SystemExit(f"[fetch] {asset['name']}: SHA-256 differs from release.json; not used")


def outputs_ok(cdir: Path, entry: dict) -> bool:
    return all((cdir / p).exists() and sha256(cdir / p) == s for p, s in entry["outputs"].items())


def main(name: str):
    cdir = ROOT / "data" / name
    spec_path = cdir / "release.json"
    if not spec_path.exists():
        print(f"[fetch] {name}: every build input is in git (no release.json)")
        return
    spec = json.load(open(spec_path))
    todo = [e for e in spec["files"] if not outputs_ok(cdir, e)]
    if not todo:
        print(f"[fetch] {name}: all {len(spec['files'])} inputs in place")
        return
    slug = repo_slug()
    rel = gh_json(f"repos/{slug}/releases/tags/{spec['release']}")
    assets = {a["name"]: a for a in rel["assets"]}
    with tempfile.TemporaryDirectory(prefix=f"fetch_{name}_") as tmp:
        for e in todo:
            a = assets.get(e["asset"])
            if not a:
                raise SystemExit(f"[fetch] release {spec['release']} has no asset {e['asset']}")
            print(f"[fetch] {name}: {e['asset']} ({int(a['size']) / 1e6:.0f} MB)")
            f = Path(tmp) / e["asset"]
            download(slug, a, f, e["sha256"])
            if "extract" in e:
                to = cdir / e["to"]
                to.mkdir(parents=True, exist_ok=True)
                with zipfile.ZipFile(f) as z:
                    for m in e["extract"]:
                        with z.open(m) as src, open(to / Path(m).name, "wb") as dst:
                            shutil.copyfileobj(src, dst, 1 << 20)
            elif "run" in e:
                subprocess.run(shlex.split(e["run"].replace("{file}", str(f))), cwd=ROOT, check=True)
            else:
                to = cdir / e["to"]
                to.mkdir(parents=True, exist_ok=True)
                shutil.move(str(f), to / e["asset"])
            f.unlink(missing_ok=True)
            if not outputs_ok(cdir, e):
                raise SystemExit(f"[fetch] {e['asset']}: the files it gives don't match release.json")
    print(f"[fetch] {name}: done")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
