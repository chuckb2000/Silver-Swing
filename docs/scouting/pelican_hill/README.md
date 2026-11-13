# Pelican Hill Golf Club — scouting (2026-10-24)

The Resort at Pelican Hill, in the hills above Pacific Coast Highway at Newport
Coast (Newport Beach), Orange County, California, has two Tom Fazio courses.
**Ocean South** (1991) is the course nearer the sea, with holes 12 and 13 along
the ocean; build it first. **Ocean North** (1993) sits on higher ground, with
canyon carries, and is a second course on the same site (`layouts`,
COURSE_BUILD.md 3.5). Both were reworked by Fazio in 2005-07 and are Golf Digest
"Best in State". It's on the list as the coastal half of a Southern California
pair with Strawberry Farms (`docs/scouting/strawberry_farms/`), about 8 km
inland.

## At a glance
| | |
|---|---|
| Id | data `pelican_hill`; courses `pelican_hill_south` (Ocean South), `pelican_hill_north` (Ocean North) — proposed |
| Location | Newport Coast, Orange County, CA; golf club 33.5849, -117.8419 (OpenGolfAPI from OSM; Wander Golf 33.5853, -117.8416), 22800 Pelican Hill Rd S; resort 22701 Pelican Hill Rd S (33.5938, -117.8525, geocoded) |
| UTM | zone 11, EPSG:32611 |
| Holes / par | 2 x 18; Ocean South par 70 (35/35), Ocean North par 71 (36/35) (GolfPass, the resort, SCGA) |
| Designed | Tom Fazio: Ocean South 1991, Ocean North 1993; Fazio rework of both, closed 2005-07, reopened November 2007; Brian Curley restoration 2025-26 (South reopened May 2026, North reopens November 2026; routing unchanged) |
| Access | resort, open to the public |
| Notable | Golf Digest Best in State (both); Top 100 Golf Courses: North 43rd, South 45th in California |
| In video games | Links 2003 (Microsoft): "Pelican Hill Golf Club" (Links Corner), course not stated, pre-2005 |
| Default tee (standing defaults) | **Blue**: Ocean South 6,323 yd, 70.6 / 130; Ocean North 6,563 yd, 71.6 / 132 |

## Data status
| Item | Status |
|---|---|
| Scorecard | **complete, third-party**, both courses: GolfPass per hole, five tees (Black, Blue, White, Red, Yellow), every row adds up; Black = the resort's own hole pages; ratings/slopes = SCGA. SCGA's yardages differ by 0.3-1.5 % (scorecard_sources.md). The resort's June 2022 PDFs weren't opened (DATA_REQUEST 5) |
| OSM | at least a golf-course feature (OpenGolfAPI's OSM point); holes and greens unknown until the export |
| Bare earth | USGS 3DEP 1 m best available, one ImageServer file; 1 m project not named (2b lists it). The county's own DEM is the 2011 lidar |
| Canopy | NOAA DAV **4793**, "2011 USGS Lidar: Orange County (CA)", flown Dec 2011-Feb 2012, 1.76 pts/m², classes 1 + 2 (no vegetation class); a newer USGS set (2023 "California Gaps"?) used instead if the DAV shows it covering the box |
| Orthophoto | USDA NAIP via the USGS National Map, 1 m (year shows on download) |

The box is **4.0 x 4.0 km** (one file per item), centred between the golf club
and the resort hotel and reaching 1.3-2.7 km beyond each. The property is 504
acres (the resort's figure; the golf club was 400 acres, 200 of turf, in 1997),
so both courses fit with room to spare, but no course map with coordinates
could be read: DATA_REQUEST step 1 checks the box on the Overpass map.

## Build notes

- **Two courses on the site: `layouts`.** Data folder `pelican_hill`, layouts
  `pelican_hill_south` (Ocean South, `scorecard_ocean_south.csv`; listed first)
  and `pelican_hill_north` (Ocean North, `scorecard_ocean_north.csv`).
  `scorecard.csv` is a copy of Ocean South's card, for a plain one-course build.
  Both cards are in hand and the box covers both, so if OSM maps Ocean North's
  holes, build both in one pass (one world, one lidar run); otherwise ship Ocean
  South and add Ocean North later without renaming anything. The two courses
  may share **one** `leisure=golf_course` polygon (OpenGolfAPI shows one point
  for both); then separate the holes with `layout=<id>` tags (COURSE_BUILD 3.5),
  since both have holes 1-18.
- **Theme: `socal` palette notes** (Strawberry Farms' README) as the starting
  point; the kickoff lets the course chat make its own `pelican_hill` theme.
  Pelican Hill adds:
  - **Canary Island date palms** (45 ft, the resort's) and **olive trees**
    (century-old groves, the resort's). The lidar reads palms as narrow
    "conifers"; they may need their own painter.
  - **Eucalyptus** (the resort's golf page) and "coastal pines" (FirstCallGolf)
    on the courses. The Italian stone pines remembered in the first pass were
    not confirmed by any source; check the NAIP before drawing them.
  - **Coastal sage scrub** (dusty grey-green, sage, rust buckwheat; the
    Strawberry Farms notes) in the canyons.
  - A **deep Pacific blue-teal** for the ocean and the ponds.
  - Bright white bunker sand; warm-green hybrid Bermuda fairways (since 2007),
    a darker fescue/rye rough, Poa greens.
- **Trees:** lidar, 2011-12. Since then: a new row on North 1 (resort page),
  trees replanted in 2025-26 and vegetation cleared on Ocean South to reopen ocean
  views (2026). The NAIP shows the trees nearer to now; where it and the lidar
  disagree, list it. Standing default `trees_off_fairways_m: 2`.
- **Water and penalty areas (all red by default):** water on the right of
  **South 7** and **North 17** (resort hole notes; probably ponds or a stream:
  check OSM and the NAIP); a "hazard" on South 5's aggressive line (type
  unknown). The Pacific is beyond Pacific Coast Highway and Crystal Cove State
  Park (South 12 has the state beach on its left), so it's probably outside the
  boundary; if the boundary reaches a bluff edge, the drop beyond is out of
  bounds.
- **Canyons of coastal sage scrub:** carries on **South 18** (a canyon crossed
  twice), **North 6** (tee shot), **North 17** (before the green), **North 18**
  (the approach); a canyon right of North 5's green, a barranca right on North 3;
  scrub beside South 15 and 18 and North 7, 9, 17 and 18. The scrub is
  California gnatcatcher habitat (the original permit required 13.7 acres), and
  coastal Orange County courses usually mark such areas as environmentally
  sensitive areas played as red penalty areas. The local rules weren't found.
  Recommendation: red penalty areas for the canyon bottoms and slopes the holes
  carry, and for mapped `natural=scrub` inside the boundary; the `gorse` lie
  only for narrow scrub strips at fairway edges. Don't invent stake lines.
- **Waste ground (2026, after the data):** a fescued sand area on **South 7**
  and sandy scrub carried to **South 11**'s tee (Curley). They're in no dataset
  unless OSM was edited after May 2026; list them as open items. If they're
  mapped, use `waste` (surface 18, `"waste_sand": true`).
- **Ice plant:** no source read this pass mentions it. If the NAIP shows thick
  banks (green mats with magenta-red tips, about #5f9440 / #b0446a), play them
  as rough, or the gorse lie beside greens (developer's call).
- **South 13 has two greens** (left and right, the resort's hole notes). The
  game plays one green per hole: use the one the OSM hole line ends on (and the
  card's 131 / 125 yd fits); the other is a wrong green (relief required).
- **Out of bounds:** the OSM boundary. Pacific Coast Highway, the resort's
  hotel and villas, and the Newport Coast houses lie outside. Resort roads and
  the bridge on the way to South 1 are cart paths inside the boundary. The
  driving range (new in 2007) is out of bounds.
- **Renovations after the data:** the 2025-26 Curley restoration (bunkers
  rebuilt and realigned, tees enlarged, green surrounds, greens back to their
  original shapes, ~1 mile of cart paths). Routing is unchanged, so the cards
  still fit. Bunker shapes follow OSM / NAIP as of their dates; note the dates.
  The 2011 lidar is after the 2005-07 rework, so its ground is the current
  routing.
- **Wind:** proposed **3-12 mph**. Open bluffs facing the Pacific with a steady
  afternoon sea breeze, but gentler than the Oregon or New England coast
  (open-coast band 3-14); between the bays band (2-12) and open coast.
- **Course card hole: Ocean South 13**, the short par 3 with the ocean on its
  left (12 parallels the Pacific; 16's green has an "infinity edge"). Pick
  whichever of 12, 13 and 16 shows the coast in the contact sheet.
- **Logo idea:** a tall Canary Island date palm on a sea bluff, with Catalina
  Island's low outline on the horizon behind it. No pelican (the resort's own
  marks may use one) and no club emblem. Alternative: a California gnatcatcher
  on a sprig of coastal sage.
- **Hard parts:**
  - steep canyons with forced carries and tees on bluff edges: check the green
    shaping and the tee-shot tree clearing against the real slopes;
  - two courses with the same hole numbers in one world (and maybe one OSM
    polygon);
  - 2026 changes newer than every dataset;
  - palms that the lidar reads as conifers.

## Open questions for the developer
1. Build Ocean North in the same pass as Ocean South? — recommendation: yes, if
   OSM maps its holes (both cards are in hand and the world is built once);
   otherwise Ocean South alone first.
2. Sage-scrub canyons: penalty areas? — recommendation: red penalty areas where
   holes carry them and for mapped scrub (likely ESAs, gnatcatcher habitat),
   unless the printed card's local rules say otherwise.
3. South 13's two greens: which one? — recommendation: the one the OSM hole line
   ends on; the other plays as a wrong green.
4. The 2026 restoration (both courses) is newer than the lidar and probably the
   NAIP: build from the data as is? — recommendation: yes; list the known changes
   (South 7 fescued sand, South 11 scrub, bunkers) as open items, and use 2026
   imagery if you can supply it.
5. Scorecard: GolfPass (= the resort's back-tee yardages) over SCGA's slightly
   different yardages? — recommendation: yes; save the resort's June 2022 PDFs
   (DATA_REQUEST 5) to confirm the forward tees.
6. Ice plant, if the imagery shows it: rough or the penal gorse lie? —
   recommendation: rough, with the gorse lie only on thick banks beside greens.
7. A `socal` theme shared with Strawberry Farms, or Pelican Hill's own? —
   recommendation: start from `socal`; the kickoff allows a `pelican_hill` theme
   (palms, olives, Pacific blue).

## Kickoff prompt

```
Build Pelican Hill Golf Club, Ocean South first (`pelican_hill`, Newport
Coast, CA) for Silver Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted: read
docs/scouting/pelican_hill/ first (README.md, DATA_REQUEST.md,
scorecard_sources.md, sources.md). Treat the scouting as unverified notes:
check every downloaded file on arrival (COURSE_BUILD.md 5.5) and the scorecard
against its sources. The files from DATA_REQUEST.md are in the GitHub release
`pelican_hill-data`. Use the standing defaults (4.1) and the scouting's choices
unless the data says otherwise; build Ocean South as the first `layouts` course
(pelican_hill_south) so Ocean North can be added later. You may design a new theme of its own for this course (`pelican_hill`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/pelican_hill. I'm not
watching: make the calls you can, write down open items with recommendations,
and stop only for what section 10 lists.
```
