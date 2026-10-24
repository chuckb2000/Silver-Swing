# Newport Country Club — scouting (2026-10-24)

Newport Country Club, Newport, Rhode Island: one of the five founding clubs of
the USGA, where the first U.S. Amateur and the first U.S. Open were played in
October 1895. An open, nearly treeless, unirrigated seaside course by William
F. Davis (1894) and A. W. Tillinghast (1921-23), on the hill and fields above
Ocean Drive and Brenton Point, under a Gilded Age clubhouse. On the scouting
list as a third Rhode Island course (after Triggs and Wannamoisett) and a
landmark of American golf.

## At a glance
| | |
|---|---|
| Id | `newport` |
| Location | 280 Harrison Avenue, Newport, Newport County, RI; centre 41.462, -71.347 (Wikipedia; OSM's course point 41.46219, -71.34694) |
| UTM | zone 19, EPSG:32619 |
| Holes / par | 18 / 72 on the card (36-36); 70 for championships (holes 1 and 12 as par 4s) |
| Designed | club founded 1893; nine holes by William F. Davis 1894, 18 by 1897-99 (Davis; the old Donald Ross credit was refuted by a scorecard found in 2013, per Wikipedia); A. W. Tillinghast re-routing 1921-23 with seven new holes on about 49 acres west of Harrison Avenue; Ron Forse restoration of the Tillinghast greens and bunkers from 1995 (USGA: 2005), 500+ yd of new tees in the two decades before 2024; clubhouse by Whitney Warren (1895) |
| Access | private |
| Notable | 1895 U.S. Amateur (C. B. Macdonald) and U.S. Open (Horace Rawlins); 1995 U.S. Amateur (Tiger Woods); 2006 U.S. Women's Open (Annika Sorenstam, playoff); 2020 U.S. Senior Open postponed, played 2024 (Richard Bland, playoff), nines reversed, 7,024 yd par 70; Golf Digest #1 in Rhode Island |
| In video games | no licensed appearance found; a fan recreation "Newport CC LIDAR" for The Golf Club 2019 (2022) |
| Default tee (standing defaults) | Blue by name, but Blue is the forward set (5,506 yd, 67.4/118). Recommended: **White**, 6,204 yd, 70.7/122 (women 76.8/135) — open question 1 |

## Data status
| Item | Status |
|---|---|
| Scorecard | complete third-party per-hole card (GolfPass): seven sets, par, men's and women's stroke index, ratings/slopes. Wikipedia's undated card differs hole by hole (up to 36 yd); the club card is not online (`scorecard_sources.md`) |
| OSM | the course is in OSM (a course point); holes, greens and tees unknown until the export |
| Bare earth | USGS 3DEP 1 m from the 2022 USGS Lidar: RI Statewide (`RI_Statewide_D22`, flown late March 2022, leaf-off), tile x30y460 |
| Canopy | NOAA DAV dataset 9981 (same survey), all classes; no vegetation class, so trees come from class 1 with OSM buildings removed (as at Triggs and Wannamoisett). Flight year 2022 |
| Orthophoto | NAIP (newest the USGS service holds) |

## The holes (club numbering, names from Wikipedia)

1 The First, 2 The Cop, 3 Ocean, 4 Graves Point, 5 Polo Shed, 6 Lookout,
7 Long Meadow, 8 Willows, 9 Orchard, 10 Quarry, 11 Harbour, 12 Valley, 13 Club,
14 Plateau, 15 Brenton Reef, 16 Island, 17 Pond, 18 Home. Par-3s: 4, 8, 13,
14; par-5s on the card: 1, 7, 10, 12.

**Championships reverse the nines** (the 2024 Senior Open's 1st was the
club's 10th, its 18th the club's 9th). Media from 2020-24 use championship
numbers; the card, Wikipedia and Golfer's Journal use the club's. Build in the
club's numbering (the card's); if OSM's `ref`s follow the championship order,
renumber and say so.

## Build notes
- **Theme:** start from `coastal` (Highland Links: golden fescue, sand, sea,
  few trees). Newport has no fairway irrigation (sprinklers on greens and tees
  only): fairways of bent, poa, rye and fescue go tawny in dry summers, the
  rough is native grass with yellowing bent patches, the sand is coarse, and
  the sea is the open Atlantic. A theme of its own (`newport`) with tawny
  fairways and olive-gold rough would suit it; the kickoff allows that.
- **Trees:** few ("often the clubhouse is the only structure in view"); heavy
  bushes on both sides of 7 and 8 (8 is "Willows"), shrubs along a fence left
  of 4, and probably ornamentals by the clubhouse, the roads and the houses
  around the edge. The March 2022 leaf-off lidar sees bare deciduous crowns
  poorly (as at Triggs); low thickets may come out as short trees.
- **Water and penalty areas (all red, standing default):** the ocean beyond
  Ocean Drive (left of 4; near 3); a creek down the far left of 12; a hazard
  down the left of 16 and a "deep, wet burn" in front of its green; a hidden
  water hazard left of 17 ("Pond"). Map what OSM and the lidar show; don't
  draw any from these notes.
- **Out of bounds:** the OSM course boundary (standing default). Reviews put
  OB left of 2, left of 3 (a narrow fairway), left of 11, and right of 16 along
  a brick wall.
- **Roads:** Harrison Avenue splits the course: holes 2-8 west of it (Golfer's
  Journal; SI says six holes, from 3), crossed after the 1st green and between
  8 and 9. Ocean Drive runs along the shore, outside the course. The 10th plays
  over two clubhouse drives. If OSM's boundary leaves Harrison Avenue out, the
  road is OB between the two parts (a ball rarely stops on it); if it is
  inside, it is a cart path (free relief), per 4.1.
- **Buildings:** the clubhouse on the hill above 13 and 14 (14's tee is beside
  it); houses around the edges.
- **Special ground:** native fescue beside the rough (left of 2, right of 3,
  left of 17, both sides of 9): `rough_band_m` as at Highland Links (a mown
  band, then fescue as rough). Shrub thickets right of 2 (one reviewer calls
  them gorse) and on 7 and 8: trees/shrubs from the lidar, not the penal
  `gorse` surface (open question 4). No waste sand. Thin, rocky soil on 10.
  Terrain mostly gentle; a few holes climb or drop steeply (13 straight uphill
  to the clubhouse, 9 uphill and partly blind, 14 over a ravine, 12's false
  front).
- **One course on the site.** No `layouts`. Fairways are wide (35-45 yd).
- **Renovations after the data:** no construction reported after the March
  2022 lidar (for the 2024 Senior Open the USGA only set up tees and greens). New championship tees may be on
  the lidar but not in OSM; they don't matter for White.
- **Wind:** open coast, 3-14 mph (4.1). The prevailing wind is southerly, off
  the water, and stronger in the afternoon.
- **Course card hole:** the 4th, Graves Point (a long par 3 with the ocean along
  the left and long contoured bunkers). Alternative: the 14th, Plateau, under
  the clubhouse.
- **Logo idea:** a hickory-shafted club and a gutty ball over a line of
  Atlantic waves, for the first U.S. Open and Amateur
  (1895). No club crest, no clubhouse drawing.
- **Hard to build:** the two disagreeing cards (build on GolfPass; validation
  will show which fits the ground), the reversed championship numbering in
  every recent article and possibly in OSM, and the low thickets in the
  leaf-off lidar.

## Open questions for the developer
1. **Default tee.** Newport's Blue is its forward set (5,506 yd). —
   recommendation: White (6,204 yd, 70.7/122), the single set closest to
   6,300, as for TPC Boston.
2. **Which card.** GolfPass and Wikipedia disagree hole by hole; neither is
   dated. — recommendation: GolfPass (the only one with every set, both
   indexes and ratings); a photo of the printed card replaces it if one turns
   up (DATA_REQUEST item 5).
3. **Par.** The card says 72; championships play 70 (1 and 12 as par 4s). —
   recommendation: the card's 72, like every other course in the game.
4. **The shrub thickets** (2, 7, 8). — recommendation: shrubs and rough, not
   the penal gorse surface; nothing says they are gorse.
5. **Theme.** — recommendation: a `newport` theme drawn from `coastal`, with
   tawny fairways.
6. **Logo.** — recommendation: the 1895 hickory club and gutty ball over waves.

## Kickoff prompt

```
Build Newport Country Club (`newport`, Newport, RI) for Silver Swings Golf.
Follow CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/newport/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `newport-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`newport`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/newport. I'm not watching: make the calls you can, write down open
items with recommendations, and stop only for what section 10 lists.
```
