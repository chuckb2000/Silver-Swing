# Course scouting (2026-10-24)

Nineteen courses scouted for the game: notable courses that video games
rarely carry, and local courses in the areas the game already covers. Each
folder holds what a course chat needs to start: facts, the scorecard, the
download list with exact links, build notes and a kickoff prompt. How the
folders were made: `GUIDE.md`. Not included because other chats are already
building them: Wildwood, Sandpines, Stanford, Cypress Point, Rock Creek Park.

## To build one

1. Open `<id>/DATA_REQUEST.md` and download each file it lists (browser
   links; the OSM step is a paste into overpass-turbo.eu; the tree lidar is a
   NOAA order that arrives by email).
2. On GitHub → Releases → **Draft a new release**, tag `<id>-data`, drop the
   files in, **Publish release**.
3. Start a new chat and paste the kickoff prompt at the end of
   `<id>/README.md`.

None of the links could be opened from the sandbox, and the download boxes
are generous estimates (no OSM access here): the course chat checks every
file on arrival and cuts the real world from the OSM boundary.

## The courses

Status: **ready** = scorecard per hole and facts in hand; **partial** =
usable, with named gaps.

| Course | Where | Why | Status | Default tee | Theme |
|---|---|---|---|---|---|
| [Yale](yale/) | New Haven, CT | Macdonald/Raynor 1926; developer's pick | ready (post-2026 restoration card; all imagery predates the restoration) | Long, 6,361 yd | new darker woods theme (fallback `seekonk`) |
| [Strawberry Farms](strawberry_farms/) | Irvine, CA | developer's pick | ready (third-party card; hole 18 differs between sources) | Blue, 6,276 yd | new `socal` |
| [Portland Golf Club](portland_gc/) | Portland, OR | 1946 PGA, 1947 Ryder Cup | ready | Blue, 6,317 yd | `pnw_club` |
| [Pumpkin Ridge](pumpkin_ridge/) | North Plains, OR | 1996 US Amateur (Tiger), US Women's Opens; Witch Hollow + Ghost Creek | ready (both cards) | Witch Hollow Blue, 6,506 yd | `pnw` |
| [Sahalee](sahalee/) | Sammamish, WA | 1998 PGA; 27 holes in fir and cedar | ready (club's own nine cards) | Blue, 6,754 yd | `pnw` |
| [Pasatiempo](pasatiempo/) | Santa Cruz, CA | MacKenzie 1929, barrancas | ready (club's card images to save) | Gold, 6,495 yd | new `norcal` |
| [San Francisco GC](sfgc/) | San Francisco, CA | Tillinghast; never in a game | ready (third-party card) | Blue, 6,808 yd | new `norcal` |
| [National Golf Links](ngla/) | Southampton, NY | Macdonald 1911; never in a game | partial (older card; newer one only as totals) | Green, 6,505 yd | `coastal` |
| [Shinnecock Hills](shinnecock/) | Southampton, NY | US Open host; shares NGLA's downloads | ready, but it **is** in PGA Tour 2K25 (April 2026) | Blue, 6,141 yd | `coastal` |
| [Fishers Island](fishers_island/) | Fishers Island, NY | Raynor 1926; ocean on both sides | partial (par 70 or 72 unsettled) | Blue, 6,544 yd | `coastal` |
| [Myopia Hunt Club](myopia/) | South Hamilton, MA | four early US Opens; never in a game | ready (third-party card) | White, 6,190 yd | `seekonk` |
| [Eastward Ho!](eastward_ho/) | Chatham, MA | Fowler 1922 on Pleasant Bay; 2024 restoration | ready | Blue, 6,227 yd | `bayside` |
| [Pine Valley](pine_valley/) | Pine Valley, NJ | often ranked #1 in the world; never licensed | ready (third-party, two tee sets) | Regular, 6,532 yd | `bayside` |
| [Sand Hills](sand_hills/) | Mullen, NE | Coore & Crenshaw 1995 | partial (location to confirm on the OSM map first; may need a world over 2,048 m) | Square, 6,432 yd | new `sandhills` |
| [Astoria G&CC](astoria/) | Warrenton, OR | 1923 dune-ridge course near Gearhart | ready (third-party card; club card would settle 3 stroke indexes) | Silver, 6,321 yd | own theme (rough is green, not `gearhart` straw) |
| [Heron Lakes](heron_lakes/) | Portland, OR | Great Blue (RTJ Jr. 1992) + Greenback (RTJ Sr. 1971) | ready (Great Blue cards disagree on 3 holes; club card to save) | Great Blue Blue, 6,244 yd | `pnw` |
| [Pelican Hill](pelican_hill/) | Newport Coast, CA | Fazio's two ocean courses | ready (both cards; 2026 restoration postdates the data) | Ocean South Blue, 6,323 yd | new `socal` |
| [Newport CC](newport/) | Newport, RI | site of the first US Open (1895) | ready (GolfPass card; Wikipedia's differs) | White, 6,204 yd (Blue is the shortest set) | new `newport` from `coastal` |
| [Baltimore CC, Five Farms](baltimore_cc/) | Lutherville-Timonium, MD | Tillinghast 1926; central Maryland | ready (card rows matched to tee names by total) | Blue, 6,620 yd | `anacostia` |

## Suggested order

Ready and easy data first: **Portland GC**, **Pumpkin Ridge** (Oregon: DOGAMI
gives bare earth and canopy in two clicks), then the two you asked for,
**Yale** and **Strawberry Farms**, then **Eastward Ho!** and **Myopia** (same
Massachusetts lidar as TPC Boston and Highland Links), **Pasatiempo**,
**SFGC**, **Pine Valley**, **NGLA**, **Sahalee**, **Fishers Island**,
**Sand Hills**. Shinnecock last if a course already in a video game matters.
Then Heron Lakes, Astoria, Newport, Baltimore CC and Pelican Hill (all ready after the second pass).

## Things several courses share

- **Themes and logos (developer, 2026-10-24):** every kickoff prompt lets the
  course chat design a theme of its own for the course (even where an
  existing theme would fit) and draw its logo from the scouting's logo idea,
  without asking; it shows you both when done. The theme notes below and in
  each brief are the starting points.
- **New themes:** `socal` (Strawberry Farms, Pelican Hill), `norcal`
  (Pasatiempo, SFGC; reuse Cypress Point's or Stanford's if it fits), a
  darker woods theme (Yale; the "temperate forest" theme CLAUDE.md plans),
  `sandhills` (Sand Hills). The rest use existing themes.
- **Wind bands the standing defaults lack:** California coast/hills (2-10 or
  3-12 mph proposed per course) and the plains (5-15 mph for Sand Hills).
- **Restorations after the data:** Yale (2023-26), Pasatiempo (2023-24),
  Eastward Ho! (2024), Sahalee (2022-23 tree removal): the lidar and NAIP show
  the old course; each README says how to handle it.
- **Several courses on one site** (`layouts`): Pumpkin Ridge (two), Heron
  Lakes (two), Pelican Hill (two), Sahalee (three nines), Baltimore CC (East
  and West), Pine Valley (a 10-hole short course).
- **Waste sand** (surface 18, branch `design/waste-sand`): candidates are
  Eastward Ho!'s new sand scrapes and Sand Hills' loose blowouts; Pine
  Valley's sand plays as bunkers (the club's rule).

## Still open

- Printed club cards would settle small conflicts at Astoria (3 stroke
  indexes), Heron Lakes (Great Blue holes 8, 16, 17), Newport and Baltimore CC
  (tee names); each data request lists it as an optional photo.
- The exact 3DEP project and NOAA dataset id for Sahalee, Sand Hills,
  Pasatiempo, SFGC and Strawberry Farms (their requests have the developer
  pick the dataset on the NOAA map instead; that works, it is one more step).
- Video-game checks for Sahalee and Sand Hills.
