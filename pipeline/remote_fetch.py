"""Downloads on a GitHub Actions runner: the first way to get a course's data
(developer, 2026-10-29: "You didn't tell me about GitHub Action!").

The sandbox can't reach Overpass, USGS or most data sites, and its proxy blocks the
GitHub Actions API, but it can push a branch and read a release. So a course chat
writes a request, data/<id>/fetch.json, commits it and pushes its branch;
.github/workflows/fetch-data.yml runs this script on a runner (open internet), which
downloads each item and attaches it to the course's release (data-<id>, made if
missing). Then, in the sandbox:

    python3 pipeline/remote_fetch.py new <id> --box S W N E [--osm] [--dem] [--lidar] [--list]
        write data/<id>/fetch.json: the standard Overpass export and/or 3DEP items for
        the box (lat/lon; course boundary + 200 m). Edit it for anything else.
    python3 pipeline/remote_fetch.py wait <id> [--minutes 60]
        wait for the run's log (fetch-log-<id>.json in the release) and print it;
        exit 0 when every item came.
    python3 pipeline/remote_fetch.py pull <id> [--to DIR] [FILE ...]
        download the release's files (default DIR: data/<id>/incoming/, not in git),
        then put them into raw/ with pipeline/intake.py and release.json as usual
        (docs/COURSE_BUILD.md 5.6, 5.7); the log has every file's sha256 for release.json.

Request (data/<id>/fetch.json, or fetch/requests/<name>.json for one that isn't a course):
    {"release": "data-<id>",           # optional; this is the default for a course
     "items": [
       {"name": "<id>_overpass.geojson", "osm_box": [south, west, north, east]},
       {"name": "x_overpass.geojson", "overpass": "<Overpass QL ending in out geom;>"},
       {"name": "x.tif", "url": "https://..."},
       {"name": "dem", "tnm": {"dataset": "dem1m", "bbox": [west, south, east, north]}},
       {"name": "lidar", "tnm": {"dataset": "lpc", "bbox": [w, s, e, n], "only": "MD_4County"}}
     ]}
- osm_box: the standard export (OSM_QUERY below: the layout, buildings, roads, water and
  ground cover) for the box. overpass: any query. Both are run on overpass-api.de (then a
  mirror) and converted with osmtogeojson, the converter Overpass Turbo uses, so the file
  reads like a Turbo export (`intake.py osm`). An export with no features is an error.
- url: any public file. Direct links only: a page you sign in to, or an order you wait
  for by email (NOAA Data Access Viewer jobs), still goes to the developer.
- tnm: the USGS National Map (3DEP). "dataset": "dem1m" (1 m DEM), "dem13" (1/3 arc-second
  DEM) or "lpc" (lidar point cloud, LAZ). Every product whose footprint meets the box is
  attached under its own file name, so first run it with "list": true (the log lists each
  product's title, size and date, nothing downloaded), then keep one project with "only"
  (a part of the title or URL, such as the project name). "max" caps the tiles (40).
An item already in the release is skipped unless it says "force": true, so pushing the
request again only fetches what is new. The run attaches fetch-log-<name>.json (each
item: ok or the error; each file's size and sha256), since the sandbox can't read the
job's own log. Files over 2 GB (GitHub's limit for a release file) are reported, not
attached. A run takes as long as the downloads: USGS lidar is slow (about 15 MB/min).
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

# The standard export for a course (docs/COURSE_BUILD.md 5.1): {box} is "south,west,north,east".
OSM_QUERY = """[out:json][timeout:300][bbox:{box}];
(
  nwr["leisure"="golf_course"];
  nwr["golf"];
  nwr["natural"~"^(water|wetland|wood|tree|tree_row|scrub|heath|grassland|sand|beach|bare_rock|cliff)$"];
  nwr["landuse"~"^(grass|meadow|forest|farmland|reservoir|basin)$"];
  nwr["leisure"~"^(park|garden|pitch|swimming_pool)$"];
  nwr["building"];
  way["highway"];
  way["waterway"];
  way["barrier"~"^(wall|fence|retaining_wall)$"];
  nwr["amenity"="parking"];
  nwr["man_made"~"^(windmill|lighthouse)$"];
);
out geom;"""


# ---------------------------------------------------------------- shared

def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def gh(*args: str) -> str:
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def slug() -> str:
    url = subprocess.check_output(["git", "remote", "get-url", "origin"], cwd=ROOT, text=True).strip()
    return url.split("github.com")[-1].lstrip(":/").removesuffix(".git")


def request_path(name: str) -> Path:
    """data/<id>/fetch.json for a course, else fetch/requests/<name>.json."""
    p = ROOT / "data" / name / "fetch.json"
    return p if p.exists() or (ROOT / "data" / name).is_dir() else ROOT / "fetch" / "requests" / f"{name}.json"


def name_of(path: Path) -> str:
    return path.parent.name if path.name == "fetch.json" else path.stem


def release_of(path: Path, req: dict) -> str:
    return req.get("release") or f"data-{name_of(path)}"


def release_assets(tag: str) -> list[dict]:
    try:
        return json.loads(gh("api", f"repos/{slug()}/releases/tags/{tag}"))["assets"]
    except subprocess.CalledProcessError:
        return []


def download_asset(asset: dict, dest: Path):
    """A release file through `gh api`, resuming a cut download (as pipeline/fetch_raw.py)."""
    size = int(asset["size"])
    for _ in range(20):
        have = dest.stat().st_size if dest.exists() else 0
        if have >= size:
            break
        cmd = ["gh", "api", f"repos/{slug()}/releases/assets/{asset['id']}", "-H", "Accept: application/octet-stream"]
        if have:
            cmd += ["-H", f"Range: bytes={have}-"]
        with open(dest, "ab") as out:
            subprocess.run(cmd, stdout=out, check=False)
    if dest.stat().st_size != size:
        raise RuntimeError(f"{asset['name']}: {dest.stat().st_size} of {size} bytes")


# ---------------------------------------------------------------- on the runner

def get(url: str, dest: Path, data: bytes | None = None, tries: int = 5, timeout: int = 600):
    """Download to dest, resuming a GET after a dropped connection."""
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
        except Exception as e:  # noqa: BLE001 - retried, then reported
            last = e
            time.sleep(min(60, 5 * 2**attempt))
    raise RuntimeError(f"{url}: {last}")


def ensure_release(tag: str) -> set[str]:
    out = subprocess.run(["gh", "release", "view", tag, "--json", "assets"], capture_output=True, text=True)
    if out.returncode != 0:
        gh("release", "create", tag, "--title", tag, "--notes", "Downloads for course building (pipeline/remote_fetch.py).")
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


def overpass(query: str, dest: Path) -> dict:
    raw = dest.with_suffix(".osm.json")
    body = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    for url in OVERPASS:
        try:
            raw.unlink(missing_ok=True)
            get(url, raw, data=body, tries=3, timeout=600)
            head = raw.read_bytes()[:200].lstrip()
            if not head.startswith(b"{"):
                raise RuntimeError(f"not JSON: {head[:160]!r}")
            j = json.loads(raw.read_text())
            if not j.get("elements"):
                raise RuntimeError(j.get("remark") or "no elements: check the box (south, west, north, east)")
            break
        except Exception as e:  # noqa: BLE001
            errors.append(f"{url}: {e}")
    else:
        raise RuntimeError("; ".join(errors))
    with open(dest, "w") as out:
        subprocess.run(["osmtogeojson", str(raw)], stdout=out, check=True)
    raw.unlink()
    feats = json.loads(dest.read_text())["features"]
    return {"features": len(feats), "golf_courses": sum(1 for f in feats if (f.get("properties") or {}).get("leisure") == "golf_course")}


def tnm(item: dict, tag: str, have: set[str], force: bool) -> list[dict]:
    t = item["tnm"]
    w, s, e, n = t["bbox"]
    q = {"datasets": DATASETS[t["dataset"]], "bbox": f"{w},{s},{e},{n}", "max": 500, "outputFormat": "JSON"}
    if t["dataset"].startswith("dem"):
        q["prodFormats"] = "GeoTIFF"
    listing = WORK / f"{item['name']}.tnm.json"
    get(f"{TNM}?{urllib.parse.urlencode(q)}", listing)
    found = [x for x in json.loads(listing.read_text()).get("items", []) if x.get("downloadURL")]
    # TNM can list one product many times (VT_Statewide_A23: every lidar tile 27 times,
    # Burlington CC 2026-10-30): keep each download URL once.
    seen: set[str] = set()
    found = [x for x in found if not (x["downloadURL"] in seen or seen.add(x["downloadURL"]))]
    only = t.get("only")
    if only:
        found = [x for x in found if only in x.get("title", "") or only in x["downloadURL"]]
    head = {"products": [{"title": x.get("title"), "bytes": x.get("sizeInBytes"), "date": x.get("publicationDate"),
                          "url": x["downloadURL"]} for x in found]}
    if t.get("list"):
        return [head]
    cap = int(t.get("max", 40))
    if len(found) > cap:
        head["error"] = f"{len(found)} products, over the cap of {cap}: none downloaded (add \"only\", shrink the box or raise \"max\")"
        return [head]
    recs = [head]
    names = [urllib.parse.urlparse(x["downloadURL"]).path.rsplit("/", 1)[-1] for x in found]
    for x, name in zip(found, names):
        u = x["downloadURL"]
        if names.count(name) > 1:  # the same tile name in two sub-projects: keep both
            name = f"{urllib.parse.urlparse(u).path.rsplit('/', 3)[-3]}_{name}"
        if name in have and not force:
            recs.append({"file": name, "skipped": "already in the release"})
            continue
        p = WORK / name
        try:
            get(u, p)
            recs.append({"source": u, **attach(tag, p)})
        except Exception as ex:  # noqa: BLE001
            recs.append({"source": u, "file": name, "error": str(ex)[:500]})
        finally:
            p.unlink(missing_ok=True)  # one tile on the runner's disk at a time
    return recs


def run_request(path: Path) -> None:
    name = name_of(path)
    req = json.loads(path.read_text())
    tag = release_of(path, req)
    have = ensure_release(tag)
    run = f"{os.environ.get('GITHUB_SERVER_URL', '')}/{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
    log = {"request": str(path.relative_to(ROOT)), "release": tag, "run": run,
           "commit": os.environ.get("GITHUB_SHA", ""), "started": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "items": []}
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
            elif "osm_box" in item or "overpass" in item:
                query = item.get("overpass") or OSM_QUERY.format(box=",".join(str(v) for v in item["osm_box"]))
                dest = WORK / item["name"]
                rec.update(overpass(query, dest))
                rec.update(attach(tag, dest), ok=True)
                dest.unlink(missing_ok=True)
            elif "url" in item:
                dest = WORK / item["name"]
                get(item["url"], dest)
                rec.update(attach(tag, dest), source=item["url"], ok=True)
                dest.unlink(missing_ok=True)
            else:
                raise ValueError("an item needs osm_box, overpass, url or tnm")
            if rec.get("error"):
                rec["ok"] = False
        except Exception as e:  # noqa: BLE001 - logged; the next item still runs
            rec.update(ok=False, error=str(e)[:2000])
        log["items"].append(rec)
        print(json.dumps(rec)[:500], flush=True)
        save(False)
    save(True)


def changed_requests(before: str) -> list[Path]:
    """Requests this push added or changed (every request on a manual run or a new branch)."""
    reqs = sorted(ROOT.glob("data/*/fetch.json")) + sorted(ROOT.glob("fetch/requests/*.json"))
    if not before or set(before) == {"0"}:
        return reqs if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch" else _since_main(reqs)
    subprocess.run(["git", "fetch", "-q", "--depth=1", "origin", before], cwd=ROOT, capture_output=True)
    out = subprocess.run(["git", "diff", "--name-only", before, "HEAD"], cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        return _since_main(reqs)
    changed = set(out.stdout.split())
    return [p for p in reqs if str(p.relative_to(ROOT)) in changed]


def _since_main(reqs: list[Path]) -> list[Path]:
    """A new branch: the requests that differ from main (all of them if main can't be read)."""
    subprocess.run(["git", "fetch", "-q", "--depth=1", "origin", "main"], cwd=ROOT, capture_output=True)
    out = subprocess.run(["git", "diff", "--name-only", "FETCH_HEAD", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        return reqs
    changed = set(out.stdout.split())
    return [p for p in reqs if str(p.relative_to(ROOT)) in changed]


# ---------------------------------------------------------------- in the sandbox

def cmd_new(a) -> int:
    s, w, n, e = a.box
    if not (s < n and w < e and -90 <= s <= 90 and -180 <= w <= 180):
        print("--box is south west north east, in degrees", file=sys.stderr)
        return 2
    items = []
    if a.osm or not (a.dem or a.lidar):
        items.append({"name": f"{a.id}_overpass.geojson", "osm_box": [s, w, n, e]})
    for want, ds in ((a.dem, "dem1m"), (a.lidar, "lpc")):
        if want:
            items.append({"name": f"{a.id}_{ds}", "tnm": {"dataset": ds, "bbox": [w, s, e, n], **({"list": True} if a.list else {})}})
    p = ROOT / "data" / a.id / "fetch.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    old = json.loads(p.read_text()) if p.exists() else {"items": []}
    keep = [i for i in old.get("items", []) if i["name"] not in {x["name"] for x in items}]
    p.write_text(json.dumps({**({"release": old["release"]} if old.get("release") else {}), "items": keep + items}, indent=1) + "\n")
    print(f"wrote {p.relative_to(ROOT)}: commit it and push the branch; then `python3 pipeline/remote_fetch.py wait {a.id}`")
    return 0


def read_log(name: str, tag: str) -> dict | None:
    a = next((x for x in release_assets(tag) if x["name"] == f"fetch-log-{name}.json"), None)
    if not a:
        return None
    return json.loads(subprocess.check_output(["gh", "api", f"repos/{slug()}/releases/assets/{a['id']}", "-H", "Accept: application/octet-stream"]))


def cmd_wait(a) -> int:
    path = request_path(a.name)
    req = json.loads(path.read_text()) if path.exists() else {}
    tag = a.release or release_of(path, req)
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    end = time.time() + a.minutes * 60
    log = None
    while True:
        log = read_log(name_of(path), tag)
        fresh = log and (not a.this_commit or log.get("commit") == head)
        if fresh and log.get("done"):
            break
        if time.time() > end:
            break
        time.sleep(30)
    if not log:
        print(f"no fetch-log-{name_of(path)}.json in {tag} after {a.minutes} min (pushed? the branch must not be main)", file=sys.stderr)
        return 2
    print(json.dumps(log, indent=1))
    if not log.get("done"):
        print(f"still running after {a.minutes} min: wait again", file=sys.stderr)
        return 3
    return 0 if all(i.get("ok") for i in log["items"]) else 1


def cmd_pull(a) -> int:
    path = request_path(a.name)
    req = json.loads(path.read_text()) if path.exists() else {}
    tag = a.release or release_of(path, req)
    to = Path(a.to) if a.to else ROOT / "data" / a.name / "incoming"
    to.mkdir(parents=True, exist_ok=True)
    assets = [x for x in release_assets(tag) if not x["name"].startswith("fetch-log-") and (not a.files or x["name"] in a.files)]
    if not assets:
        print(f"nothing to pull from {tag}", file=sys.stderr)
        return 1
    for x in assets:
        dest = to / x["name"]
        if dest.exists() and dest.stat().st_size == x["size"]:
            print(f"have {dest.relative_to(ROOT) if dest.is_relative_to(ROOT) else dest}")
            continue
        download_asset(x, dest)
        print(f"got  {dest.relative_to(ROOT) if dest.is_relative_to(ROOT) else dest}  {x['size']:,} bytes  sha256 {sha256(dest)}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd")
    r = sub.add_parser("run", help="on the runner: fetch the requests this push changed")
    r.add_argument("--before", default="")
    n = sub.add_parser("new", help="write data/<id>/fetch.json")
    n.add_argument("id")
    n.add_argument("--box", nargs=4, type=float, required=True, metavar=("S", "W", "N", "E"))
    n.add_argument("--osm", action="store_true", help="the standard Overpass export (the default when nothing is named)")
    n.add_argument("--dem", action="store_true", help="USGS 3DEP 1 m DEM tiles")
    n.add_argument("--lidar", action="store_true", help="USGS 3DEP lidar (LAZ) tiles")
    n.add_argument("--list", action="store_true", help="3DEP items list the products only (then add \"only\" and push again)")
    wt = sub.add_parser("wait", help="wait for a request's log and print it")
    wt.add_argument("name")
    wt.add_argument("--release")
    wt.add_argument("--minutes", type=float, default=60)
    wt.add_argument("--this-commit", action="store_true", help="wait for the log of the commit checked out here")
    p = sub.add_parser("pull", help="download the release's files")
    p.add_argument("name")
    p.add_argument("files", nargs="*")
    p.add_argument("--release")
    p.add_argument("--to")
    a = ap.parse_args()
    if a.cmd == "run":
        WORK.mkdir(parents=True, exist_ok=True)
        reqs = changed_requests(a.before)
        print(f"requests: {[str(p.relative_to(ROOT)) for p in reqs]}", flush=True)
        for path in reqs:
            run_request(path)
        return 0
    if a.cmd == "new":
        return cmd_new(a)
    if a.cmd == "wait":
        return cmd_wait(a)
    if a.cmd == "pull":
        return cmd_pull(a)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
