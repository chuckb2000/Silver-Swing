# Northwood: data request

Course box (WGS84, south west north east): 38.466 -123.012 38.490 -122.976
(a generous box round 19400 Highway 116, Monte Rio; tightened once the OSM boundary is in).

## 1. The fetch workflow could not start (2026-11-12)

The push of `data/northwood/fetch.json` started `fetch-data.yml` (run 43365234609), but GitHub
refused to start the job: "The job was not started because recent account payments have failed
or your spending limit needs to be increased." Nothing was downloaded; the release `data-northwood`
does not exist yet.

Fix (recommended), about two minutes:
1. On github.com, click your profile picture (top right) > Settings.
2. In the left column, open "Billing and licensing" (older name: "Billing and plans").
3. Under "Payment information", check the card on file is current.
4. Under "Budgets and alerts" (older: "Spending limits"), find the Actions budget. If it is $0 or
   used up, raise it (a few dollars covers this course: the runs are a few minutes each, lidar up
   to about an hour).
5. Tell the course chat. It pushes the request again; nothing else is needed from you.

The included Actions minutes reset with the monthly billing cycle, so waiting for the reset also
works.

## 2. Fallback, only if you'd rather not change billing

a. OpenStreetMap: open overpass-turbo.eu, paste the query in docs/COURSE_BUILD.md 5.1 with
   `{{bbox}}` replaced by `38.466,-123.012,38.490,-122.976`, press Run, then Export > GeoJSON >
   download. Upload the file to a new release `data-northwood` (repository > Releases > Draft a
   new release > tag `data-northwood` > attach > Publish release).
b. Elevation and trees: apps.nationalmap.gov/downloader, draw the box above, tick "Elevation
   Products (3DEP)" > "1 meter DEM" and "Lidar Point Cloud (LPC)", Search, and send the course
   chat the list of product names; it picks the tiles, you download those and attach them to the
   same release.

## 3. Scorecard (open)

No official card online that the chat could reach. Two third-party versions differ on holes
1, 2, 4, 5 and 9 (see the intake message). A photo of the printed card (both sides) settles it.
