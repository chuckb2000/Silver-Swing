# Baltimore Country Club (Five Farms, East Course) — scouting (2026-10-24, partial)

A. W. Tillinghast's East Course at Five Farms, the Baltimore Country Club's
36-hole site in Lutherville-Timonium, Baltimore County: a championship
parkland course with a long record of national events. It is on the list
because central Maryland is the developer's home.

**Status: partial.** The scouting turn's shared web-search budget ran out
before this course was searched, and no page about it could be opened. The
box and download links are complete (from the club's address as
remembered, with a 7 km box so a small error doesn't matter, and an OSM
query that finds the club by name). Every fact below marked *(unverified)*
is from the model's own knowledge and must be checked; the scorecard is
missing entirely. A follow-up scouting message can finish it
(`sources.md` lists the searches to run).

## At a glance

| | |
|---|---|
| Id | `baltimore_cc` |
| Location | Five Farms, 11500 Mays Chapel Road, Lutherville-Timonium, Baltimore County, MD *(address unverified)*; estimated centre 39.445, -76.655 (from the address and the I-83 exits, not checked on a map) |
| UTM | zone 18, EPSG:32618 |
| Holes / par | 18 / not known (East Course); the West Course is a second 18 on the site |
| Designed | A. W. Tillinghast, 1926 *(unverified)*. Restoration: the brief names Keith Foster (2000s); not checked |
| Access | private |
| Notable | *(all unverified)* club founded 1898, its first course (Roland Park, Baltimore City) hosted the 1899 U.S. Open; at Five Farms: 1928 PGA Championship, 1932 U.S. Amateur, 1965 Walker Cup, 1988 U.S. Women's Open, Senior Players Championship (believed 2007-2010). The brief's "1988 Walker Cup" is probably the 1988 U.S. Women's Open (Walker Cups are in odd years; 1987 and 1989 were elsewhere). Later or future USGA events not checked |
| In video games | not checked |
| Default tee (standing defaults) | not known (no card yet): Blue if the card has one, else the set closest to 6,300 yd |

## Data status

| Item | Status |
|---|---|
| Scorecard | **missing**: nothing read; best route a photo of the printed card (`scorecard_sources.md`) |
| OSM | unknown until the export (the name query finds the club if it is named "Baltimore Country Club" or "Five Farms") |
| Bare earth | 3DEP 1 m (tool links, 4 pieces); the lidar project and year are unknown: the developer reads them off the National Map downloader. Tiles x35y437, x35y438, x36y437, x36y438 |
| Canopy | NOAA DAV point cloud, dataset to be picked by the developer on the site (the newest USGS / Maryland lidar covering the course); MD iMAP may offer a DSM or normalized surface model (unchecked; DATA_REQUEST 4a) |
| Orthophoto | NAIP at 1 m (tool links, 4 pieces); MD iMAP six-inch leaf-off orthos preferred if their service can be reached (4a) |

## Build notes

- **Theme:** `anacostia` is the recommendation: the DC theme 50 km away
  (late-summer Mid-Atlantic turf, oaks and sycamores, murky olive water,
  no blossoms). Its pine sprite is loblolly; Baltimore County's conifers are
  more eastern white pine and Virginia pine, which reads the same at this
  scale. `potomac` has cherry blossoms in its sprites, so it doesn't fit.
  If the developer wants an early-fall look, `seekonk` (white pine, oak,
  maples starting to turn) is the other option. No new theme expected.
- **Trees:** Piedmont parkland (oaks, tulip poplar, maples, sycamore along
  streams, white pine): to be confirmed from the lidar and orthos. Note the
  lidar year against later tree work.
- **Water:** not known; Piedmont streams are likely on a site this size.
  All red (standing default).
- **Out of bounds:** the OSM boundary; roads inside it are cart paths;
  houses along the edges (Mays Chapel) are outside.
- **Two courses on the site:** East (Tillinghast) and West *(architect and
  year unverified)*. Build the East first. Keep the West in mind as a second
  `layouts` entry (COURSE_BUILD 3.5): the OSM boundary may be one polygon
  for both or one per course; if one, the holes split by `layout=` tags or by
  numbering (two sets of 1-18). Note it in the course file.
- **Renovations:** to be checked (restoration architect and year) against the
  lidar and NAIP years.
- **Wind:** inland Piedmont, not tidal: **1-9 mph** (the inland band).
- **Course card hole:** the course chat's pick from the contact sheet
  (nothing known about the greens yet).
- **Logo idea:** a farm weathervane whose arrow is a golfer at the top of the
  swing, above five fence rails, for "Five Farms". Not the club's crest or
  any club mark.
- **Hard parts:** no scorecard; the box from a remembered address (step 1 of
  the data request checks it); a second course in the same boundary; the
  unknown lidar year.

## Open questions for the developer

1. Can you get a photo of the printed East Course card? — recommendation:
   yes, it is the only reliable source for a private club.
2. East Course only, or East and West as two layouts? — recommendation: East
   now, West later if the card and OSM allow.
3. Theme `anacostia` (late summer) or `seekonk` (early fall)? —
   recommendation: `anacostia`.
4. Logo: the Five Farms weathervane, or something else (a black-eyed Susan in
   the cup, Maryland's state flower)? — recommendation: the weathervane.
5. Run a follow-up scouting message to finish this folder (facts, card,
   lidar project, MD iMAP endpoints) before the course chat starts? —
   recommendation: yes; the downloads in DATA_REQUEST.md don't depend on it.

## Kickoff prompt

```
Build Baltimore Country Club, East Course at Five Farms (`baltimore_cc`, Lutherville-Timonium, MD) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/baltimore_cc/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `baltimore_cc-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. Work on branch
course/baltimore_cc. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```

(The scouting for this course is partial: there is no `scorecard.csv` yet
and the facts are unverified. Paste the prompt only after the card is in the
release or a follow-up scouting has filled the folder.)
