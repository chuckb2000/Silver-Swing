"""Downloads on a GitHub Actions runner, for course building (developer, 2026-10-29).

The sandbox can't reach Overpass, USGS or most data sites, and its proxy blocks the
Actions API, but it can push a branch and read a release. So a course chat writes a
request, fetch/requests/<name>.json, and pushes it to a branch named fetch/<something>;
.github/workflows/fetch-data.yml runs this script on a runner, which downloads each item
and attaches it to the request's release. Then, back in the sandbox,
`python3 pipeline/remote_fetch.py --wait <name>` waits for the log and lists what came,
and `make fetch` / pipeline/intake.py take it from there as with the developer's uploads.

Request:
    {"release": "<tag>",              # created if missing (a pre-release)
     "items": [
       {"name": "x_overpass.geojson", "overpass": "<Overpass QL, ending in out geom;>"},
       {"name": "x.tif", "url": "https://..."},
       {"name": "x_dem", "tnm": {"dataset": "dem1m", "bbox": [west, south, east, north]}},
       {"name": "x_lidar", "tnm": {"dataset": "lpc", "bbox": [w, s, e, n]}}
     ]}
- overpass: run on overpass-api.de (then the kumi.systems mirror), converted with
  osmtogeojson, the converter Overpass Turbo uses, so the file is what a Turbo export is.
- url: any public file, kept under its own name.
- tnm: the USGS National Map (3DEP). Every product in the box is attached under its own file
  name (one GeoTIFF or LAZ per tile); "dataset": "dem1m" (1 m DEM), "dem13" (1/3 arc-second
  DEM) or "lpc" (lidar point cloud, LAZ). "max": a cap on the number of tiles (default 40).
An item already in the release is skipped unless the item says "force": true. Each run
attaches fetch-log-<name>.json: for every item, ok or the error, and each file's size and
sha256 (the sandbox can't read the job's own log). Files over 2 GB (GitHub's limit) are
reported, not attached.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQ = ROOT / "fetch" / "requests"
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "fetch"
UA = "silver-swings-golf-course-builder (personal, non-commercial; github actions)"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
TNM = "https://tnmaccess.nationalmap.gov/api/v1/products"
DATASETS = {
    "dem1m": "Digital Elevation Model (DEM) 1 meter",
    "dem13": "National Elevation Dataset (NED) 1/3 arc-second",
    "lpc": "Lidar Point Cloud (LPC)",
}
MAX_ASSET = 2 * 1024**3


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def get(url: str, dest: Path, data: bytes | None = None, tries: int = 5, timeout: int = 600):
    """Download to dest (resuming a GET after a dropped connection)."""
    last = None
    for attempt in range(tries):
        have = dest.stat().st_size if dest.exists() and data is None else 0
        req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
        if have:
            req.add_header("Range", f"bytes={have}-")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r, open(dest, "ab" if have and r.status == 206 else "wb") as out:
                while chunk := r.read(1 << 20):
                    out.write(chunk)
            return
        except Exception as e:  # noqa: BLE001 - every failure is retried, then reported
            last = e
            time.sleep(min(60, 5 * 2**attempt))
    raise RuntimeError(f"{url}: {last}")


def gh(*args: str, check: bool = True) -> str:
    return subprocess.run(["gh", *args], check=check, capture_output=True, text=True).stdout


def ensure_release(tag: str) -> set[str]:
    """The release's asset names (made if missing)."""
    out = subprocess.run(["gh", "release", "view", tag, "--json", "assets"], capture_output=True, text=True)
    if out.returncode != 0:
        gh("release", "create", tag, "--prerelease", "--title", tag, "--notes", "Downloads for course building (pipeline/remote_fetch.py).")
        return set()
    return {a["name"] for a in json.loads(out.stdout)["assets"]}


def attach(tag: str, path: Path) -> dict:
    size = path.stat().st_size
    rec = {"file": path.name, "bytes": size, "sha256": sha256(path)}
    if size > MAX_ASSET:
        rec["error"] = "over GitHub's 2 GB limit for a release file: not attached"
        return rec
    gh("release", "upload", tag, str(path), "--clobber")
    return rec


def overpass(item: dict, dest: Path):
    raw = dest.with_suffix(".osm.json")
    body = urllib.parse.urlencode({"data": item["overpass"]}).encode()
    errors = []
    for url in OVERPASS:
        try:
            raw.unlink(missing_ok=True)
            get(url, raw, data=body, tries=3, timeout=900)
            head = raw.read_bytes()[:200].lstrip()
            if not head.startswith(b"{"):
                raise RuntimeError(f"not JSON: {head[:120]!r}")
            j = json.loads(raw.read_text())
            if j.get("remark") and not j.get("elements"):
                raise RuntimeError(j["remark"])
            break
        except Exception as e:  # noqa: BLE001
            errors.append(f"{url}: {e}")
    else:
        raise RuntimeError("; ".join(errors))
    with open(dest, "w") as out:
        subprocess.run(["osmtogeojson", str(raw)], stdout=out, check=True)
    raw.unlink()
    n = len(json.loads(dest.read_text())["features"])
    return {"features": n}


def tnm(item: dict, tag: str, have: set[str], force: bool) -> list[dict]:
    t = item["tnm"]
    w, s, e, n = t["bbox"]
    q = {"datasets": DATASETS[t["dataset"]], "bbox": f"{w},{s},{e},{n}", "max": 500, "outputFormat": "JSON"}
    if t["dataset"].startswith("dem"):
        q["prodFormats"] = "GeoTIFF"
    listing = WORK / f"{item['name']}.tnm.json"
    get(f"{TNM}?{urllib.parse.urlencode(q)}", listing)
    found = json.loads(listing.read_text()).get("items", [])
    urls = sorted({x["downloadURL"] for x in found if x.get("downloadURL")})
    cap = int(t.get("max", 40))
    recs = [{"tnm_products": len(urls), "titles": sorted({x.get("title", "") for x in found})[:50]}]
    if len(urls) > cap:
        recs[0]["error"] = f"{len(urls)} tiles, over the cap of {cap}: none downloaded (raise \"max\" or shrink the box)"
        return recs
    for u in urls:
        name = urllib.parse.urlparse(u).path.rsplit("/", 1)[-1]
        if name in have and not force:
            recs.append({"file": name, "skipped": "already in the release"})
            continue
        p = WORK / name
        try:
            get(u, p)
            recs.append({"source": u, **attach(tag, p)})
        except Exception as ex:  # noqa: BLE001
            recs.append({"source": u, "file": name, "error": str(ex)})
        finally:
            p.unlink(missing_ok=True)  # one tile on disk at a time
    return recs


def run_request(path: Path) -> None:
    name = path.stem
    req = json.loads(path.read_text())
    tag = req["release"]
    have = ensure_release(tag)
    run = f"{os.environ.get('GITHUB_SERVER_URL', '')}/{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
    log = {"request": name, "release": tag, "run": run, "started": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "items": []}
    logfile = WORK / f"fetch-log-{name}.json"

    def save(done: bool):
        log["done"] = done
        log["updated"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        logfile.write_text(json.dumps(log, indent=1))
        subprocess.run(["gh", "release", "upload", tag, str(logfile), "--clobber"], capture_output=True)

    save(False)
    for item in req["items"]:
        force = bool(item.get("force"))
        rec: dict = {"name": item["name"]}
        try:
            if "tnm" in item:
                rec["files"] = tnm(item, tag, have, force)
                rec["ok"] = not any("error" in f for f in rec["files"])
            elif item["name"] in have and not force:
                rec.update(ok=True, skipped="already in the release")
            elif "overpass" in item:
                dest = WORK / item["name"]
                rec.update(overpass(item, dest))
                rec.update(attach(tag, dest), ok=True)
                dest.unlink(missing_ok=True)
            elif "url" in item:
                dest = WORK / item["name"]
                get(item["url"], dest)
                rec.update(attach(tag, dest), source=item["url"], ok=True)
                dest.unlink(missing_ok=True)
            else:
                raise ValueError("an item needs overpass, url or tnm")
            if rec.get("error"):
                rec["ok"] = False
        except Exception as e:  # noqa: BLE001 - reported in the log, the next item still runs
            rec.update(ok=False, error=str(e)[:2000])
        log["items"].append(rec)
        print(json.dumps(rec)[:500], flush=True)
        save(False)
    save(True)


def changed_requests(before: str) -> list[Path]:
    """Request files added or changed by this push (all of them on a manual run or a new branch)."""
    all_reqs = sorted(REQ.glob("*.json"))
    if not before or set(before) == {"0"}:
        return all_reqs
    out = subprocess.run(["git", "diff", "--name-only", before, "HEAD", "--", "fetch/requests"], cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        return all_reqs
    names = {Path(x).name for x in out.stdout.split()}
    return [p for p in all_reqs if p.name in names]


def wait(name: str, tag: str | None, minutes: float) -> int:
    """In the sandbox: wait for a request's log in its release and print it."""
    if not tag:
        tag = json.loads((REQ / f"{name}.json").read_text())["release"]
    slug = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=ROOT, text=True).strip().split("github.com")[-1].lstrip(":/").removesuffix(".git")
    end = time.time() + minutes * 60
    while True:
        try:
            assets = json.loads(gh("api", f"repos/{slug}/releases/tags/{tag}"))["assets"]
            a = next((x for x in assets if x["name"] == f"fetch-log-{name}.json"), None)
            if a:
                log = json.loads(subprocess.check_output(["gh", "api", f"repos/{slug}/releases/assets/{a['id']}", "-H", "Accept: application/octet-stream"]))
                if log.get("done") or time.time() > end:
                    print(json.dumps(log, indent=1))
                    return 0 if log.get("done") and all(i.get("ok") for i in log["items"]) else 1
        except subprocess.CalledProcessError:
            pass  # no release yet
        if time.time() > end:
            print(f"no finished log for {name} in {tag} after {minutes} min", file=sys.stderr)
            return 2
        time.sleep(30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--changed", default="", help="on the runner: the push's 'before' commit")
    ap.add_argument("--wait", metavar="NAME", help="in the sandbox: wait for fetch-log-NAME.json and print it")
    ap.add_argument("--release", help="with --wait: the release (default: the request's)")
    ap.add_argument("--minutes", type=float, default=30)
    a = ap.parse_args()
    if a.wait:
        sys.exit(wait(a.wait, a.release, a.minutes))
    WORK.mkdir(parents=True, exist_ok=True)
    reqs = changed_requests(a.changed)
    print(f"requests: {[p.name for p in reqs]}", flush=True)
    for p in reqs:
        run_request(p)


if __name__ == "__main__":
    main()
