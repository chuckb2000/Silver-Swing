# Newport Country Club — sources (2026-10-24)

No web source was read for Newport: the session's shared web search budget
(200 searches, used by several scouting agents) ran out before the first
Newport search, and the page fetcher refuses pages that no search returned
(a direct fetch of the Wikipedia article was refused).

Used instead (in the repository):

| File | What it gave |
|---|---|
| `data/triggs/DATA_REQUEST.md` | the 2022 USGS Lidar: RI Statewide survey (`RI_Statewide_D22`, flown March 2022, leaf-off, no vegetation class), the DEM tile naming, NOAA DAV dataset 9981 and its recipe (proven: job delivered as LAZ in NAD83(2011) / RI metres + NAVD88) |
| `data/wannamoisett/DATA_REQUEST.md` | the same survey; point classes 1, 2, 7, 9, 17, 18, 20 |
| `docs/scouting/tools/make_links.py` | the box, the Overpass query, the 3DEP and NAIP links, 3DEP tile id x30y460 |

Everything in README.md marked ⚠ is from memory and unverified.
