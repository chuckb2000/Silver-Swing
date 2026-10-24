# Astoria Golf & Country Club — scouting (2026-10-24)

A private, member-owned club on the Clatsop Plains at Warrenton, Clatsop
County, on the north Oregon coast, about 8 km north of Gearhart Golf Links
(already in the game). Founded in 1923 and opened in June 1924, it was laid
out by the club's president Halderman and its first greenkeeper George Junor,
who turned down an east-west plan and ran the holes north-south in the valleys
between parallel dune ridges 30-40 ft high, some of them only about 12 yd
wide. It hosts the Oregon Coast Invitational, an amateur event played since
1910. A second north-coast course with a different character from Gearhart's
open links: tight corridors between dune ridges, small tilted greens, few
bunkers.

## At a glance
| | |
|---|---|
| Id | `astoria` |
| Location | 33445 Sunset Beach Lane, Warrenton (postal Gearhart 97146), Clatsop County, OR; 46.1022, -123.9211 (mean of two course-listing map pins 80 m apart, probably the clubhouse). Between Sunset Lake (west side) and US 101 (east side) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 18 / 72 (current card, Silver; Stymie, GolfPass) |
| Designed | George Junor (first greenkeeper) with club president Halderman, 1923-24; R.C. Asbury's earlier east-west plan rejected. No architect-led renovation found; trees lost in the December 2007 storm; tees moved since the older card (12 now a par 5) |
| Access | private |
| Notable | Oregon Coast Invitational (since 1910; first at Gearhart); 14th in Oregon on top100golfcourses.com; Doak 6 (Confidential Guide vol. 3); "St. Andrews of the Pacific" |
| In video games | none found (two searches) |
| Default tee (standing defaults) | Silver (no Blue; closest to 6,300): 6,321 yd, par 72, 71.2 / 127 men's (77.3 / 134 women's) |

## Data status
| Item | Status |
|---|---|
| Scorecard | third-party, complete per hole: six tee sets (Tournament Black 6,550, Black 6,479, Silver 6,321, Silver/Gold 5,966, Gold 5,753, Green 5,541), men's and women's stroke index, ratings/slopes (Stymie; GolfPass identical on four sets). Conflicts: men's stroke index on 1, 5, 7; par per tee for the non-Silver sets. Club card not seen (`scorecard_sources.md`) |
| OSM | unknown until the export (no OSM page came back from a search) |
| Bare earth | DOGAMI DTM mosaic, 1 m; almost certainly the OLC North Coast lidar (DOGAMI; flown 23 Oct 2008 - 9 Aug 2009, 8.61 points/m², NOAA DAV id 575), the same flight as Gearhart. ODF's 2020 Clatsop lidar covers forest land and stops at about -123.93 (probably not the course). Exports in feet |
| Canopy | DOGAMI CHM mosaic, same flight (2008-09, after the December 2007 storm that took many of the course's trees); 15+ years old, and the club talked of replanting: check every crown on the 2024 photo |
| Orthophoto | OSIP 2024, 1.0 m over the box (ask for a 0.5 m clip of the world later for tracing) |
| Box | 3,001 x 3,991 m, one file per download (was 4 x 6 km in two pieces) |

## Build notes
- **Theme:** start from `gearhart`, made for the Clatsop Plains 8 km south
  (Sitka spruce and wind-sheared shore pine with red alder, cool olive links
  turf, pale grey-white coastal sand, slate grey-teal water). Better than
  `coastal` (Cape Cod pitch pine and scrub oak, a deep blue Atlantic). The
  kickoff lets the course chat make an `astoria` theme of its own; the reason
  to: no source mentions fescue or long grass here (reviews say "firm and
  fast", tree lines along the fairways), while `gearhart` draws all rough in
  straw fescue tones unless `fescue_areas` limits them
  (`pipeline/s09_render.py`, `rough_band_mask`). Decide on the 2024 photo:
  long grass on the ridges → trace it into `fescue_areas`
  (`data/gearhart/make_fescue.py`); none → green rough (`pnw_club`-like).
- **Trees:** scattered, originally in lines along the parallel fairways; many
  lost in the December 2007 storm, with replanting discussed in 2008; "many
  trees" down the left of 9. Species not found in any source (shore pine and
  Sitka spruce are the Clatsop Plains norm: confirm on the photo). From the
  2008-09 CHM, each crown checked against the 2024 photo (as
  `data/gearhart/check_trees.py` did, into `drop_trees`).
- **Water:** a hazard on 5 (461 yd dogleg right); a pond, a narrow creek and
  wetland down the left of 9 (519 yd par 5, played over the marsh); two
  forced carries over water (holes not named; probably 5 and 9). Sunset Lake
  (107 acres, about 2-3 miles long, north-south) runs along the course's west
  side. Any pond or lake inside is red (standing defaults); the marsh on 9 is
  red water where OSM or the photo shows open water, rough otherwise.
- **Terrain:** the dune ridges are the course: three lines of them, the
  clubhouse and the 10th on the first; 3 and 15 in valleys about 12 yd wide;
  14 and 16 share a wider valley from opposite ends; 2, 4, 8 and 17 run the
  other way from the rest. The 1 m DTM shows all this; expect strong
  posterized hillshade, many sidehill lies, and a 10th green on a dune top
  that falls away on three sides. Greens are small (about 25 yd across), most
  tilting back to front, a third away from the player.
- **Out of bounds:** the OSM boundary; US 101 along the east side (9 runs
  beside it). Sunset Beach Lane (the address) and any houses: check on the OSM
  map. The 13-acre practice ground (north of the course) stays out of bounds.
- **Special ground:** none recorded: no waste sand, gorse or broom in any
  source. Surface 17 `gorse` is penal: use it only if the 2024 photo clearly
  shows gorse or broom in play.
- **Tee sets:** six on the card. Par per tee is printed only once (72), and
  the older ratings show the Black set at par 70 (its 15th is 197 yd). Offer
  Silver (default), Tournament Black and Gold with the card's par, and the
  rest only if the club's card confirms their pars.
- **Wind:** open coast, 3-14 mph (standing defaults; about 1-2 km from the
  beach). Reviews: the Pacific breeze hits shots above the ridges, calm in
  the valleys.
- **Course card hole:** the 3rd (the club's signature: tee on a ridge, the
  green at the end of a narrow valley between two parallel dunes); the 10th
  (a volcano green on the dune top) as the alternate.
- **Logo idea:** a Roosevelt elk standing on a dune ridge with a shore pine
  bent by the wind (elk herds graze the Clatsop Plains); not a shipwreck,
  which Gearhart has.
- **Hard parts:** 12 yd fairways between steep ridges (aiming and the camera
  need care; don't widen beyond the 5 m per side of 5.6); the lidar's age
  against the storm and replanting; the per-tee pars; the theme's rough
  colour.

## Still to check at intake
1. The OSM export: the course well inside the box, holes and greens mapped
   or not, Sunset Beach Lane and houses inside the boundary.
2. The club's printed card, if the developer sends it (stroke index on 1, 5,
   7; pars per tee).
3. Tree species and long grass on the 2024 photo.

## Open questions for the developer
1. **Stroke index on holes 1, 5 and 7** (Stymie 9/5/7, GolfPass 7/9/5). —
   recommendation: Stymie's until the club's card is seen.
2. **Pars per tee set** (one par row of 72 on the card; older ratings give
   Black par 70 and Tournament 71). — recommendation: offer Silver (default),
   Tournament Black and Gold at par 72; add Black, Silver/Gold and Green only
   with the club's card.
3. **Box.** The centre comes from two listing pins, not a survey. —
   recommendation: run step 1 of DATA_REQUEST.md first and download the
   rasters only if the course sits well inside the box on the Overpass map.
4. **Theme.** — recommendation: `gearhart` as the start (or an `astoria`
   theme from it) with `fescue_areas` only where the 2024 photo shows long
   grass; green rough otherwise.
5. **Wind.** — recommendation: 3-14 mph (open coast).

## Kickoff prompt
```
Build Astoria Golf & Country Club (`astoria`, Warrenton, OR) for Silver Swings
Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It
has been scouted: read docs/scouting/astoria/ first (README.md,
DATA_REQUEST.md, scorecard_sources.md, sources.md). Treat the scouting
as unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `astoria-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`astoria`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/astoria. I'm not watching: make the calls you can, write down open
items with recommendations, and stop only for what section 10 lists.
```
