# Eastward Ho! — scouting (2026-10-24)

Herbert Fowler's 1922 course on Nickerson's Neck in Chatham, a hilly glacial
moraine poking into Pleasant Bay at the elbow of Cape Cod: a figure-8 of two
nines round a hilltop clubhouse, almost no flat lies, blind shots, greens on
ridges and benches, and the bay along about half the holes. Restored by Keith
Foster (2004-07, thousands of trees cut) and again by Kyle Franz (2024: bigger
greens, Fowler's bunkers, sand scrapes, new back tees). GOLF's US top 50; a
second Cape Cod course next to Highland Links, with far more golf in it.

## At a glance

| | |
|---|---|
| Id | `eastward_ho` |
| Location | 325 Fox Hill Road, Chatham, Barnstable County, MA; 41.7172, -69.9827 (OpenGolfAPI's OSM point; where2golf 41.717270, -69.982764) |
| UTM | zone 19, EPSG:32619 |
| Holes / par | 18 / 71 (card B; 18 can be set up as a par 5, par 72) |
| Designed | Herbert Fowler, opened 3 July 1922 (as Chatham Country Club). Keith Foster 2004 (13 bunkers and 13 greens restored, all tees and bunkers renovated, ~20 acres of native grasses) and 2007; Kevin Hargrave (2004, 2007, 2014); Kyle Franz from 2019, full restoration 2024 |
| Access | private |
| Notable | GOLF Top 100 US #50 (2024-25); Golf Digest Second 100 #101, Massachusetts #7 (2025-26); Cape Cod Open 1930, 1932; NEPGA Section Championship 2022 (centennial) |
| In video games | none found (no known EA/Tiger Woods, 2K, Links or Golden Tee appearance; a dedicated search couldn't be run, see sources.md) |
| Default tee (standing defaults) | **Blue**, 6,227 yd, 70.8 / 137 (card B) |

## Data status

| Item | Status |
|---|---|
| Scorecard | third-party, complete per hole: card B (GolfPass, post-2024, 7 sets) in `scorecard.csv`; card A (Stymie, 2022, 6 sets) in scorecard_sources.md; no official card; 18's par unsettled |
| OSM | unknown until the export; OpenGolfAPI (built on OSM) counts 85 bunkers and no water features. Whether it shows the course before or after 2024 is unknown |
| Bare earth | USGS 3DEP 1 m via the exportImage link; project MA_CentralEastern_2021_B21 (covers Cape Cod: Highland Links), flown 20 Mar - 24 Apr 2021, hydro-flattened; tiles x41y462, x41y463 |
| Canopy | lidar points, NOAA Data Access Viewer dataset 9777 (2021, leaf-off): **before** the 2024 tree and fescue clearing |
| Orthophoto | USDA NAIP via the USGS National Map (newest MA flight; year checked on arrival; only a 2025 flight would show the restoration) |

## Build notes

- **Theme:** `bayside` (pitch pine and oak, white sand, grey-blue-green
  estuary water) fits Pleasant Bay. Not `seekonk` (inland white pine and
  turning maples). Highland Links' `coastal` (golden fescue, pitch pine, scrub
  oak) is the alternative for a sandier Cape look. No new theme.
- **Trees:** pitch pine and oak on the moraine, tight on 11 and lining 18.
  Thousands were cut from 2000 on, a December 2005 storm felled about 175,
  and the 2024 work replaced more with sand scrapes. The 2021 lidar therefore
  holds trees that are gone: drop lidar trees the newest image doesn't show
  (`trees_need_ortho`) and list them; standing default
  `"trees_off_fairways_m": 2`. Leaf-off flight.
- **Water (all red, standing default):** Pleasant Bay along 4 (green on the
  cliff, misses right or long are wet), 6 (green at the water's edge), 7 (tee
  on the beach), 8, 14, 15 (bay steps from the green), 16 and 18 (salt water
  left); Crows Pond on 2's tee shot. Make the bay within about 100 m of the
  shore a red penalty area inside a grown course boundary (Indian Island
  precedent) and beaches outside the boundary `ob_sand` (Highland Links).
  The DEM is hydro-flattened, so the bay is flat.
- **Out of bounds:** the OSM course boundary; neighbours' yards along 11 (a
  tree line marks it). Fox Hill Road is the address (OSM will show whether it
  borders or crosses the course) and the 2017 tour mentions "a small road":
  roads inside the boundary are cart paths (free relief).
- **Special ground:** the 2024 sand scrapes and sandy native areas (in place
  of fescue rough, hiding cart paths, notably near 9 and 14) are surface 18
  `waste` (`"waste_sand": true`), but only where OSM or a post-2024 image shows
  them; don't draw them from descriptions. Tall fescue/bluestem elsewhere plays
  as rough.
- **Greens:** 15 has three tiers (the `tiers` green model, as Highland Links
  9); 4 is now Biarritz-like (a swale through it); 3, 5 and 12 are perched; 1,
  2, 6, 13, 14, 15 and 17 sit in benches or hollows. The 2024 work recovered
  28,000+ sq ft of green, so pre-2024 OSM greens will be small.
- **Renovations after the data:** Franz 2024 (greens, bunkers including a new
  one in 8's fairway, sand scrapes, new back tees on 15 and 18). Card B is the
  post-2024 card: if the 504-yd Blue tee on 18 isn't mapped, hole 18 measures
  about 448 (card A) and fails by 11 %; that stops and asks (section 10).
- **One course on the site;** no `layouts`. Figure-8: front nine north-east of
  the clubhouse (toward the ocean), back nine south-west along the bay; 9 and
  18 finish at the clubhouse; 10's green is benched into a hill south-west of
  it; 13 is the farthest point (use these to check OSM's hole numbers).
- **Wind:** a bay, 2-12 mph (standing default); every reviewer calls it very
  exposed, so 3-14 (open coast, Highland Links) is arguable.
- **Course card hole:** 15: a short par 3 with a three-tiered green pressed
  against Pleasant Bay, ringed by bunkers; for the rotation also 4, 6, 7.
- **Logo idea:** a grey seal's head poking out of Pleasant Bay with a golf
  ball balanced on its nose (Chatham's seals); original, no club emblem.
- **Hard parts:** the 2024 restoration postdates the lidar (and maybe OSM
  and NAIP); two cards and 18's par; water and beach edges all round the
  peninsula.

## Open questions for the developer

1. Which card? — recommendation: card B (current, post-2024), Blue 6,227,
   70.8/137; a photo of the printed card would confirm it.
2. Hole 18 par 4 or 5 (card B prints par 4 at 504 yd from Blue) —
   recommendation: par 4 as printed (par 71).
3. The 2024 restoration isn't in the 2021 lidar — recommendation: build from
   OSM; if the newest NAIP shows the restored greens and sand scrapes, trace
   them from it; otherwise keep the mapped shapes, list them, and supply a
   Google screenshot only if you want the new look.
4. Pleasant Bay and Crows Pond — recommendation: red penalty areas (bay strip
   inside a grown boundary), beaches outside the boundary `ob_sand`.
5. Wind — recommendation: 2-12 mph (bay); 3-14 if you want it as windy as
   Highland Links.
6. Theme — recommendation: `bayside`; `coastal` if you want it to look like
   Highland Links.
7. Logo — recommendation: the seal with a golf ball.

## Kickoff prompt

```
Build Eastward Ho! (`eastward_ho`, Chatham, MA) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/eastward_ho/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `eastward_ho-data`. Use the standing defaults (4.1)
and the scouting's choices unless the data says otherwise. Work on branch
course/eastward_ho. I'm not watching: make the calls you can, write down open
items with recommendations, and stop only for what section 10 lists.
```
