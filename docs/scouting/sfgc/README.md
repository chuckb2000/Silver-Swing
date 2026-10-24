# San Francisco Golf Club — scouting (2026-10-24)

A. W. Tillinghast's course at the south-west corner of San Francisco, on rolling,
sandy ground by Lake Merced, with Junipero Serra Boulevard along its east side and
the Olympic Club and Lake Merced GC nearby. Play began in 1918, and it is said to be his only design west of Texas. It is famous for its
sprawling, jagged bunkers (the "Tarantula" on 14/15) and for the 7th, the "Duel
Hole": a drop-shot par 3 in the valley where Senator David Broderick was killed in
1859, the last legal duel in the United States. It is private and rarely seen, a
Golf Digest top-35 course and host of the 1974 Curtis Cup. It would be a California
course for the game alongside Stanford and Cypress Point (other chats, now).

## At a glance
| | |
|---|---|
| Id | `sfgc` |
| Location | San Francisco, City and County of San Francisco, California (1310 Junipero Serra Blvd, 94132); centre used 37.7115, -122.4790 (between OpenGolfAPI/GolfN's 37.7122, -122.4775 and the duel landmark at 37.7082, -122.4842 on the course's south-west side) |
| UTM | zone 10, EPSG:32610 |
| Holes / par | 18 / 71 (36-35; four par 3s, four par 5s), third-party cards |
| Designed | Credited to A. W. Tillinghast (designed c. 1915, opened 22 Feb 1918). GCA research names William Lock as possibly the first planner, with Tillinghast's remodels c. 1920-24 (61 bunkers in 1924, new 7th/8th/11th greens) and letters of 1936-37 (new 1st, 2nd and 12th). William P. Bell's bunker work, 1930. Harold Sampson's 13-15 (c. 1947-50, for a road widening that never came). Tom Doak greens 2001. Doak with Jim Urbina 2006: original 13-15 restored, Tarantula bunker uncovered, hundreds of trees removed. Tree work since (2013, 2024). **No Gil Hanse work found** (Hanse is doing master plans next door at the Olympic Club and Lake Merced GC) |
| Access | private |
| Notable | 1974 Curtis Cup (2-3 Aug); U.S. Open sectional qualifiers; Golf Digest 2025-26 #33 America's 100 Greatest (#5 in California); GOLF 2025-26 #40 World; SCAPS member (with Augusta, Cypress Point, Pine Valley, Seminole); no yardage markers, no rangefinders |
| In video games | none found |
| Default tee (standing defaults) | Blue, 6,808 yd, 73.6/133 (Stymie; GolfPass/Golf Digest 6,828-6,829, 74.1/136) |

## Data status
| Item | Status |
|---|---|
| Scorecard | Third-party only; no official card found online. Stymie's per-hole card for 5 sets is used. GolfPass differs on 5 cells (Blue 14 351/352; White 4 212/207; White 12 370/366; White/Red 4; Green 17 372/340). All rows add up to their totals. Women's stroke index from GolfPass |
| OSM | unknown until the export. The box also holds the Olympic Club, Lake Merced GC and probably part of Harding Park |
| Bare earth | USGS 3DEP best available 1 m (tool link). Project and year unconfirmed: the search budget ran out. Item 2b asks the service; tile `x54y418` |
| Canopy | NOAA Data Access Viewer point cloud. Dataset id unconfirmed; item 3 has the developer pick the newest USGS point cloud for the box. Flight year unknown; compare it with the 2006 tree removal and later tree work |
| Orthophoto | NAIP via the USGS National Map (latest served) |

## Build notes
- **Theme:** the new Northern California theme `norcal` proposed with
  Pasatiempo, shared with Cypress Point and Stanford. Check `course/cypress_point`
  and `course/stanford` first, and reuse their theme if its trees fit. It is
  separate from the `socal` theme proposed for Pelican Hill and Strawberry Farms.
  SFGC sits in the summer fog belt:
  - Turf: cooler, lusher green than Pasatiempo's; quick bentgrass greens (Links).
  - Bunkers: big, jagged sand on sandy soil. Take the colour from the orthophoto;
    probably pale cream-tan dune sand rather than Pasatiempo's white.
  - Trees: Monterey cypress (dark green, flat-topped, wind-shaped; Golf Digest
    reviewers: "cypress trees frame many holes"), pines (Monterey pine; Planet Golf
    and top100 say "pine-covered", "mature pines"), and eucalyptus (blue-grey-green;
    decaying eucalyptus named by the superintendent in 2013).
  - Rough: green, with sandy native areas on bunker surrounds if the photo shows
    them.
- **Trees:** "hardly any trees" in 1918; Tillinghast planted some in 1923; later
  plantings buffer the road along the east side. Hundreds were removed in 2006, with
  clearing on the right slope of 8 in 2013 and tree maintenance in 2024. If the lidar
  is older than the newest orthophoto, drop trees the photo no longer shows (the
  `trees_need_ortho` route) and list them.
- **Water:** none found in any source. Lake Merced lies north-west, outside the
  course; if part of it falls inside the world, it is scenery (`lake_level_max_m` if
  its surface needs flattening).
- **Out of bounds:** the SFGC boundary. The sources put Junipero Serra Blvd on
  the east (the address; Links: the road along the eastern border), Brotherhood Way
  at a corner (Stymie's "Junipero Serra Blvd & Brotherhood"), Lake Merced Blvd by
  the 7th (the duel site), and the Olympic Club and Lake Merced GC as near
  neighbours. Which side each one is on comes from OSM, not from here. Everything
  outside is OB, including the neighbouring courses. Use
  `boundary_name` "San Francisco Golf Club" (or the OSM way id) and drop the other
  clubs' `golf=*` features so s03 doesn't count their holes. The small practice range
  is OB (default).
- **Landmark:** the duel site, California Historical Landmark No. 19 (two granite
  obelisks 10 yards apart, reached by a trail from Lake Merced Blvd), is beside the
  7th tee. It is not in play and needs nothing in the build.
- **Special ground:** none known. Links calls it links-style, with "dune-style
  grass and natural mounding", but no source describes waste sand, ice plant or
  fescue areas. Don't set `waste_sand` unless the orthophoto shows unraked sandy
  ground outside the bunkers.
- **Bunkers:** the course's signature. The Tarantula (between the 14th and 15th
  fairways), the "city of sand" left of 15, and bunkers on nearly every side of the
  7th green. Keep OSM's outlines; if OSM has rounded blobs, the orthophoto shows the
  jagged edges.
- **Terrain:** rolling, with ravines; the front nine is the more dramatic. 2 and 8
  play into a valley to uphill greens. The 7th drops into the duel valley, and 8
  continues down it. The 17th is uphill all the way (dogleg right). The 12th
  doglegs right past an old railroad grade. The 6th plays back toward Lake Merced.
- **One course on the site.** The neighbours are separate courses outside its
  boundary, so no `layouts`.
- **Renovations after the data:** none known after 2006 apart from tree work, so the
  lidar and NAIP should show today's holes, except trees.
- **Wind:** the standing "open coast" band, **3-14 mph**, fits. The course is about
  2 km from the Pacific shore (an estimate, not measured), gusty Pacific sea
  breezes are the norm, and the 14th plays straight into them (Links). Tree clearing "returned wind to play" (Planet Golf). No
  new band needed.
- **Course card hole:** 7, the Duel Hole: a drop-shot par 3 to a two-tiered
  kidney green in a valley, sand on nearly every side; reportedly Tillinghast's
  favourite. Alternative: 15 (the Tarantula and the "city of sand").
- **Logo idea:** two small granite obelisks ten paces apart with a pin flag between
  them (the 1859 duel markers by the 7th tee). Alternative: a wind-bent Monterey
  cypress against a fog bank. Not the club's emblem.
- **Hard parts:** an unofficial scorecard; three other golf clubs in the box (pick
  the right boundary); trees removed since the lidar; the hole lines (if OSM lacks
  them, there's no public routing map: the tracing desk with orthophoto proposals);
  bunkers as the main feature.

## Open questions for the developer
1. **Scorecard.** No official card is online. The two third-party cards differ on
   five cells, by 0.3 % at most on Blue. Recommendation: use Stymie (its ratings
   match its own totals, and its 14th at 351 matches Links). If you know anyone who
   can photograph the printed card or the yardage book, it settles this.
2. **Default tee.** Blue (6,808, 73.6/133) per the standing default; it is the back
   tee, with a 611-yd 9th. White (6,376, 71.3/130) is the set closest to 6,300.
   Recommendation: Blue as default, and build White too, since both are close to the
   game's club distances.
3. **Ratings.** Stymie's 73.6/133 for 6,808 vs 74.1/136 for 6,828 (GolfPass, Golf
   Digest). Recommendation: Stymie, for the reason in 1.
4. **Architects line.** No Hanse: "A. W. Tillinghast (1918; remodels 1920s-30s);
   restored by Tom Doak and Jim Urbina (2001, 2006)". Recommendation: as written.
5. **Neighbours in the world.** The Olympic Club, Lake Merced GC and maybe Harding
   Park border the world. Recommendation: draw them as off-course scenery (OB) from
   OSM, without their golf features, as Norton CC at TPC Boston.
6. **Theme.** Recommendation: the `norcal` theme shared with Pasatiempo, Cypress
   Point and Stanford, with SFGC's turf a touch lusher if a variant is cheap;
   otherwise the shared one.
7. **Logo:** the duel obelisks with a flag? Recommendation: yes.

## Kickoff prompt

```
Build San Francisco Golf Club (`sfgc`, San Francisco, CA) for Silver Swings Golf. Follow
CLAUDE.md, docs/COURSE_BUILD.md and docs/COURSE_LESSONS.md. It has been
scouted: read docs/scouting/sfgc/ first (README.md, DATA_REQUEST.md,
scorecard.csv, scorecard_sources.md, sources.md). Treat the scouting as
unverified notes: check every downloaded file on arrival (COURSE_BUILD.md
5.5) and the scorecard against its sources. The files from DATA_REQUEST.md
are in the GitHub release `sfgc-data`. Use the standing defaults (4.1) and
the scouting's choices unless the data says otherwise. You may design a new theme of its own for this course (`sfgc`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch
course/sfgc. I'm not watching: make the calls you can, write down open items
with recommendations, and stop only for what section 10 lists.
```
