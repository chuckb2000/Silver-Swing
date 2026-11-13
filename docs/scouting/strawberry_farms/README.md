# Strawberry Farms Golf Club — scouting (2026-10-24)

A public course in Irvine, Orange County, California: Jim Lipe's 1997 layout
for former Angels third baseman Doug DeCinces. The front nine is fairly flat
and follows the brush-filled Sand Canyon Wash on county land (Mason Regional
Park). The back nine climbs onto Irvine Ranch Water District land, wraps around
the 35-acre **Sand Canyon Reservoir** (not San Joaquin Reservoir, which is a
different IRWD reservoir in the Newport Coast hills), and runs into the wetlands
of Shady Canyon. The developer asked for this course by name. It would be the
game's first California course (Stanford and Cypress Point are being built by
other chats).

## At a glance
| | |
|---|---|
| Id | `strawberry_farms` |
| Location | Irvine, Orange County, CA; 33.6496, -117.7964 (OpenGolfAPI's OSM-based centre; clubhouse pin 33.6493, -117.7957) |
| UTM | zone 11, EPSG:32611 |
| Holes / par | 18 / 71 (36-35; women's par 72) per every card |
| Designed | Jim Lipe (Golden Bear / Nicklaus associate), opened Nov 1997. Hole 10 tee damaged by land movement in Oct 2023; rebuilding it is part of a ~$5.3 M program agreed in Sept 2024; status unknown |
| Access | public (daily fee) |
| Notable | GolfPass 2024 Top Courses in California #24; Golf Digest readers' "must play" 2000-01; the 630-yd uphill 12th, "Orange County's longest hole" |
| In video games | none found (one search) |
| Default tee (standing defaults) | **Blue**, 6,276 yd (card; SCGA 6,271), 71.0 / 129 (SCGA men's, current) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party, complete: GolfPass, all five tees per hole, rows add up. A second full measurement (Stymie, Blue 6,302) and the SCGA's current totals differ; hole 18 Blue 385 vs 418 is the one over 3 %. Official card not found (scorecard_sources.md) |
| OSM | probably mapped in detail: OpenGolfAPI (built on OSM) counts 53 bunkers and 1 water hazard. Boundary and hole lines unconfirmed until the export |
| Bare earth | USGS 3DEP 1 m, best available (ImageServer link); project and flight year not identified (search budget ran out) |
| Canopy | NOAA DAV clipped LAZ, dataset picked on the map by the developer (DATA_REQUEST 3); id and year unknown |
| Orthophoto | USDA NAIP via the USGS National Map, 1 m; year shows on download |

## Build notes

- **Theme: a new `socal` theme**, shared with Pelican Hill (`docs/scouting/pelican_hill/`).
  None of the existing themes has these trees or this dry-summer colour. Before
  making it, check whether Cypress Point, Stanford or Pasatiempo (other chats)
  have already landed a California theme, and reuse it if its trees fit. Theirs
  will likely be Northern California (Monterey cypress, pines, oaks), so
  `socal` is probably still needed. What it needs:
  - **Grass:** warm-season Bermuda (and kikuyu) fairways, a slightly yellow,
    warm green. The rough is a shade darker and more olive (here ryegrass and
    bluegrass in 1998). Greens are a brighter, cooler bentgrass/poa green. A few
    tan dormant patches in the dither are fine.
  - **Sand:** bright cream-white bunkers (reviewers praise the sand).
  - **Native ground (F0-F2, like `coastal`'s fescue keys):** coastal sage scrub
    in dusty grey-green and sage (about #6f7a5a / #8a9470), dry tan (#b8a77c)
    and rust buckwheat (#8c5a3a) accents. Decomposed-granite tan for bare
    banks, and granite-boulder grey (#9e9a91).
  - **Water:** the reservoir is murky olive-teal (about #3f6b63 / #55837a), not
    PNW blue-grey. Pelican Hill needs a deep Pacific blue-teal as well (W0-W2 can
    carry both; or the course config picks the shade).
  - **Trees:** eucalyptus (tall, ragged, blue-grey-olive crowns on pale peeling
    trunks), California sycamore (broad, pale yellow-green crowns on white
    mottled trunks, along the wash and Shady Canyon) and coast live oak (dark,
    dense, rounded). For the two painters: tall and narrow → eucalyptus, broad
    → sycamore/oak. The species come from the assignment and from "tree-lined"
    canyon descriptions; no source names them, so check the NAIP before choosing
    painters.
  - **Shrub painter** (`c: 3`): a sage-scrub mound (grey-green, a few rust or
    cream flower dots) for the brush.
- **Trees:** lidar. Lines of thick brush and trees left of 6, both sides of 9's
  tee shot, a tree to play around on 18's approach. Standing default
  `trees_off_fairways_m: 2`. The flight year is unknown until the course chat
  sees the DAV dataset.
- **Water and penalty areas (all red by default):**
  - **Sand Canyon Reservoir**: five back-nine holes around it, water left of 10.
  - **Sand Canyon Wash**: a brush-filled channel along many front-nine holes.
  - **Wetlands** on the front nine and in Shady Canyon (four back-nine holes play
    into them).
  - **Hole 18**: a brook ~30 yd short of the green, with a waterfall right of the
    fairway. It's a pumped feature fed from the reservoir that drains back into
    it, so it may be missing from OSM; check the NAIP.
  - **The reservoir's level moves.** IRWD fills it before the irrigation season,
    draws it down every autumn, and drained it completely in autumn 2017. The
    lidar and NAIP may show a part-full lake. Use OSM's outline, or the full
    pool (spillway crest 194 ft local = 196.4 ft NAVD88 ≈ 59.9 m, with
    `lake_level_max_m` or a water polygon), not the lidar's water's edge.
- **Brush and scrub:** whether it's a penalty area is unknown, because the local
  rules weren't found. If the card marks native areas as penalty areas or ESAs
  (common in Orange County), paint them red. Otherwise play them as the `gorse`
  ground (surface 17, penal general area) where they're thick, and as rough at
  their edges. Don't invent stake lines.
- **Out of bounds:** the OSM boundary. University Drive, I-405 and the Turtle
  Rock houses lie outside. Strawberry Farm Road and the dam access road inside the
  boundary are cart paths (standing defaults). The range is out of bounds.
- **Neighbours in the box:** Shady Canyon Golf Club (private, Fazio 2002) to the
  south, and Mason Regional Park to the west. Keep only Strawberry Farms' boundary
  and holes. The neighbours' fairways render as scenery or out of bounds.
- **Several courses on the site?** No. One 18, no `layouts`.
- **Renovations after the data:** hole 10's tee (land movement 2023, rebuild
  agreed 2024; a hole was "torn up" in July 2026). Compare the lidar and NAIP
  with OSM there and ask if they disagree.
- **Wind:** none of the standing bands is for California, so this proposes
  **2-10 mph**. Irvine gets a steady afternoon sea breeze off the ocean, about 8
  km away. Mornings are calm, and the canyon back nine is sheltered. That is
  about the DC tidal-river band, below the bay band (2-12) and the open-coast
  band (3-14).
- **Course card hole: 18.** It's the signature finisher: the approach over the
  brook, with the waterfall and the hillside beside the green. The alternative is
  a reservoir-side green on the back nine (10-14), once OSM shows which one sits
  on the water.
- **Logo idea:** a ripe red strawberry whose leafy green cap doubles as the
  flag on a short pin, after the strawberry fields that named the farm road and
  still edge the course. Alternative: a western pond turtle sunning on a granite
  rock (IRWD monitors the reservoir's turtles). Both are original; the club's own
  emblem is not to be used.
- **Hard parts:**
  - the reservoir level (above);
  - an unconfirmed card (hole 18);
  - scrub classification;
  - the steep canyon back nine. The 1 m DEM is fine, but expect big
    tee-to-green elevation changes (the 10th tee is the high point, and 12 is an
    uphill 630 yd). Check that the green shaping clamps don't fight real slopes.

## Open questions for the developer
1. Hole 18 from the Blue: 385 yd (printed card, GolfPass) or 418 (Stymie)? —
   recommendation: use `scorecard.csv` (GolfPass), let the course chat measure,
   and if 18 fails by more than 8 %, check the other card before asking. A photo of
   the current printed card settles it.
2. Brush and native areas: penalty areas or general area? — recommendation:
   general area played as the `gorse` lie where thick, unless the card's local
   rules call them penalty areas or ESAs. The wash channel, wetlands and
   reservoir are red either way.
3. Hole 10: has the rebuild changed the tee since the lidar and NAIP? —
   recommendation: build what OSM and the imagery show, and note it.
4. The reservoir: draw it full? — recommendation: yes, at OSM's outline (or
   full pool), so it looks like the course's lake, not a mudflat.
5. A new `socal` theme shared with Pelican Hill? — recommendation: yes. Whichever
   California course is built first makes it.

## Kickoff prompt

```
Build Strawberry Farms Golf Club (`strawberry_farms`, Irvine, CA) for Silver
Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md.
It has been scouted: read docs/scouting/strawberry_farms/ first (README.md,
DATA_REQUEST.md, scorecard.csv, scorecard_sources.md, sources.md). Treat the
scouting as unverified notes: check every downloaded file on arrival
(COURSE_BUILD.md 5.5) and the scorecard against its sources. The files from
DATA_REQUEST.md are in the GitHub release `strawberry_farms-data`. Use the
standing defaults (4.1) and the scouting's choices unless the data says
otherwise. You may design a new theme of its own for this course (`strawberry_farms`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/strawberry_farms. I'm not watching: make the
calls you can, write down open items with recommendations, and stop only for
what section 10 lists.
```
