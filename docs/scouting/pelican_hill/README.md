# Pelican Hill Golf Club — scouting (2026-10-24, INCOMPLETE)

The Resort at Pelican Hill, on the coast at Newport Coast (Newport Beach),
Orange County, California, has two Tom Fazio courses. **Ocean South** (1991) is
the lower course, with the ocean holes; build it first. **Ocean North** sits on
higher ground, with canyon carries off the tee, and is a later second course on
the same site (`layouts`, COURSE_BUILD.md 3.5). Both are Golf Digest "Best in
State". It's on the list as the coastal half of a Southern California pair with
Strawberry Farms (`docs/scouting/strawberry_farms/`), about 8 km inland.

> **Status: incomplete.** The session's shared web-search budget ran out before
> any Pelican Hill search, so only one page about the courses could be read (Golf
> Digest's panel notes). The box, the download links and the build plan are
> ready. The **box centre is from memory** and is checked by DATA_REQUEST step
> 1. Still missing: **both scorecards and ratings**, the routing (which holes
> are on the bluffs), the local rules, the lidar project and the NOAA id, OSM
> coverage, and video games. Run a follow-up scouting pass for these (the list
> is in sources.md), or have the developer save the resort's cards
> (DATA_REQUEST 5).

## At a glance
| | |
|---|---|
| Id | data `pelican_hill`; courses `pelican_hill_south` (Ocean South), `pelican_hill_north` (Ocean North) — proposed |
| Location | Newport Coast, Orange County, CA; ~33.592, -117.848 (**memory**, unverified) |
| UTM | zone 11, EPSG:32611 |
| Holes / par | 2 x 18; pars not read (memory: South 70, North 71, unverified) |
| Designed | Tom Fazio: Ocean South 1991 (Golf Digest), Ocean North 1993 (memory); Fazio redesign of both around 2007, with the resort (assignment; unverified) |
| Access | resort, open to the public (Golf Digest: public) |
| Notable | Golf Digest Best in State, both courses |
| In video games | not searched |
| Default tee (standing defaults) | unknown: Blue if the card has one, else the set closest to 6,300 yd |

## Data status
| Item | Status |
|---|---|
| Scorecard | **missing** for both courses (scorecard_sources.md) |
| OSM | unknown until the export |
| Bare earth | USGS 3DEP 1 m, best available (ImageServer links, four pieces); project not identified |
| Canopy | NOAA DAV clipped LAZ, dataset picked on the map (DATA_REQUEST 3); id and year unknown |
| Orthophoto | USDA NAIP via the USGS National Map, 1 m; year shows on download |

## Build notes

- **Several courses on the site: use `layouts` from the start.** Data folder
  `pelican_hill`, first layout `pelican_hill_south` (Ocean South, with its own
  `scorecard_ocean_south.csv`). Ocean North joins later as `pelican_hill_north`
  without renaming anything, so leaderboards, logo and card stay put. Check that
  a one-entry `layouts` list works; if it doesn't, build Ocean South as a plain
  course with `scorecard.csv` = Ocean South's card, and plan the rename. The
  world must take in both courses only when Ocean North is added. The download
  box already covers both.
- **Theme: the new `socal` theme**, shared with Strawberry Farms (its README has
  the palette notes). Pelican Hill adds:
  - **Italian stone pines** (umbrella crowns, flat-topped and dark green on bare
    reddish trunks), the resort's signature tree. The broad-crown painter.
  - **Palms** (tall, thin trunks with small heads). The lidar will read them as
    narrow "conifers", and they may need their own painter.
  - **Ice plant** ground: succulent green mats with magenta-red tips (about
    #5f9440 / #b0446a).
  - A **deep Pacific blue-teal** for the ocean.
  - Bright white bunker sand.
- **Trees:** lidar. The resort is landscaped, so expect rows of palms and pines
  along the roads and villas. Standing default `trees_off_fairways_m: 2`.
- **Water and penalty areas:** none known on either course (not searched). The
  ocean is probably outside the boundary, beyond the highway or the state park
  bluffs. All red by default.
- **Canyons of coastal sage scrub:** Ocean North carries over several of them
  (Golf Digest). Coastal Orange County courses often mark native habitat as
  environmentally sensitive areas played as red penalty areas. This needs the
  local rules. If they're unknown, the recommendation is red penalty areas for
  the canyon bottoms and slopes the holes carry over (they're unplayable, like
  water), and the `gorse` lie for scrub at the fairway edges.
- **Ice plant:** general area. Rough, or the `gorse` lie on thick banks (the
  developer's call).
- **Out of bounds:** the OSM boundary. Pacific Coast Highway, the resort's
  villas and the Newport Coast houses lie outside. Resort roads inside the boundary
  are cart paths. A range, if there is one, is out of bounds.
- **Renovations after the data:** none known after the 2007 redesign. Lidar
  after 2008 shows the current courses.
- **Wind:** proposed **3-12 mph**. These are open bluffs facing the Pacific, with a
  steady afternoon sea breeze, but Southern California's coast is gentler than
  Oregon's or New England's (open-coast band 3-14). The odd Santa Ana day blows
  offshore. So it sits between the bays band (2-12) and open coast.
- **Course card hole:** an Ocean South green on the bluff with the Pacific behind
  it. Pick it from the contact sheet once OSM and the imagery show which greens
  sit on the edge.
- **Logo idea:** an Italian stone pine's umbrella crown on a sea bluff, with
  Catalina Island's low outline on the horizon. No pelican, which the resort's
  own marks may use (unverified), and no club emblem.
- **Hard parts:**
  - steep canyons with large elevation changes (forced carries) and tees on
    bluff edges. Check the green shaping and the tee-shot tree clearing against
    the real slopes;
  - lidar datasets that cover only the beach strip (pick a full-coverage one);
  - two courses in one world.

## Open questions for the developer
1. Scorecards: can you save both cards from the resort's site (DATA_REQUEST 5),
   or should a follow-up scouting pass find them? — recommendation: a follow-up
   pass first; it's quick once search is available.
2. Ocean South as a one-course `layouts` from the start (`pelican_hill_south`)?
   — recommendation: yes, so Ocean North can be added later without renaming.
3. Sage-scrub canyons: penalty areas? — recommendation: red where holes carry
   over them, unless the local rules say otherwise.
4. Ice plant: rough or the penal gorse lie? — recommendation: rough, with the
   gorse lie only on thick banks beside greens if the imagery shows them.
5. A new `socal` theme shared with Strawberry Farms? — recommendation: yes.

## Kickoff prompt

```
Build Pelican Hill Golf Club, Ocean South first (`pelican_hill`, Newport
Coast, CA) for Silver Swings Golf. Follow CLAUDE.md, docs/COURSE_BUILD.md and
docs/COURSE_LESSONS.md. It has been scouted, incompletely: read
docs/scouting/pelican_hill/ first (README.md, DATA_REQUEST.md,
scorecard_sources.md, sources.md). The scorecards were not found during
scouting; use the club's cards from the release if they're there, otherwise
find them first (the official card, then SCGA, then GolfPass) and record the
source. Treat the scouting as unverified notes: check every downloaded file on
arrival (COURSE_BUILD.md 5.5) and the scorecard against its sources. The files
from DATA_REQUEST.md are in the GitHub release `pelican_hill-data`. Use the
standing defaults (4.1) and the scouting's choices unless the data says
otherwise; build Ocean South as the first `layouts` course (pelican_hill_south)
so Ocean North can be added later. You may design a new theme of its own for this course (`pelican_hill`, even
where an existing theme would fit; the scouting's theme notes are the
starting point) and draw its logo from the scouting's logo idea, without
asking. Show me both when you're done. Work on branch course/pelican_hill. I'm not
watching: make the calls you can, write down open items with recommendations,
and stop only for what section 10 lists.
```
