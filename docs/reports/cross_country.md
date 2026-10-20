# Cross-country golf: a bonus mode

Developer, 2026-10-20: "a cross country golf game mode, where you have to use
each tee and each green at least once but you can choose which green to hit to
from which tee." This report is the design for that mode. It sets out the
rules, the choices that need the developer, how the mode fits the engine we
have, and a plan to build it. Nothing here is built yet.

## 1. The idea in one paragraph

A round is a set of **legs**. Each leg starts on one of the course's tees and
ends with the ball in the hole on one of its greens, which the player chooses.
Over the round, every tee is used and every green is used. With N holes the
round is N legs: each tee is used once and each green is used once, so the
player's choices pair the tees with the greens (in maths terms, a
permutation). Par for each leg comes from its length, so a long leg across
three fairways is a par 5 and a short one over a pond is a par 3. The score
is to par. The fun is in two places: the routing puzzle (which pairs you
pick) and the shots (lines no normal round asks for, such as over a tree line
onto the 12th green from the 4th tee).

## 2. Rules

### 2.1 The round

- **Legs:** N, one per hole on the course (18, or 9 for a 9-hole course). Each
  tee starts exactly one leg, and each green ends exactly one leg.
  - "At least once" in the request then means "exactly once", because any
    extra leg would have to reuse a tee or a green. I recommend a fixed N
    legs, so rounds on a course compare fairly (question Q1).
- **Order:** free. The first leg starts on any tee. After holing out, the
  player picks the next leg's tee from the unused tees. (In real golf you
  walk; here the ball is placed on the chosen tee.)
- **Choosing a green:** any unused green, with two conditions:
  - **Minimum length (tune; I suggest 120 yd).** Every tee sits a few steps
    from the previous hole's green, so without this rule the best routing is
    18 chip shots.
  - **Still completable.** The choice must leave a way to pair every
    remaining tee with a remaining green under the same length rule. The game
    checks this before allowing a choice, so the player can never get stuck
    (see 4.3).
- **Tee set:** the round's tee set (the default tees, as now). Each hole's tee
  for that set is the leg's starting point. Teed up, as on a normal tee shot.
- **Pins:** the round's pin sheet (`pins.ts`), one pin per green, fixed at the
  start, as now.

### 2.2 Par of a leg

Par comes from the straight-line distance from the tee to the pin, using the
USGA's yardage guide for men, extended for long legs:

| Distance | Par |
|---|---|
| up to 250 yd | 3 |
| 251-470 yd | 4 |
| 471-690 yd | 5 |
| each further 220 yd | +1 |

A maximum leg length of about 700 yd (par 6) keeps rounds from turning into
marathons (question Q2).

### 2.3 Rules of play (the same as now, apart from these)

- **Out of bounds:** the course boundary, as now. A leg's line may cross OB,
  but the ball may not stop there.
- **Penalty areas, relief, unplayable, cart paths:** unchanged.
- **Wrong green (Rule 13.1f):** still required relief. Every green except the
  leg's target is a wrong green, including the green of the tee's own hole.
  This keeps players from putting across greens that other legs need.
- **Other holes' tees and fairways:** play as they lie. A tee box off its own
  tee shot counts as fairway, which is how the surface map already reads it.
- **Casual settings** (gimmes, double-par max, mulligans) work as they do now.
  Double par uses the leg's par.

### 2.4 Scoring and the board

- **Scorecard:** one column per leg, in the order played, under the label
  "tee 4 → green 12", with the leg's par and yards.
- **Ranking:** by score to par, then by the lower gross, then the earlier date
  (question Q3). A gross-only ranking would favour routings of short legs.
  To-par rewards picking legs that are easy for their par, which is the
  intended puzzle.
- **Its own boards:** one board per course and tee set, kept apart from
  stroke play: round length `xc`, with each leg's tee and green saved in the
  entry. Eagles count for the eagles list on the green's hole.
- **Not in** the stroke-play stats averages or the "broke 80" milestones.
  It can have its own milestones, such as "first cross-country round" or
  "under par cross-country".

## 3. What the player sees

1. **New round:** a "cross-country" button next to the round lengths on the
   setup screen (or a separate title entry; question Q4).
2. **Plan a leg:** the course overview map fills the screen.
   - Unused tees and unused greens are shown as markers. Used ones are
     dimmed, and legs already played are drawn as lines.
   - Tap a tee, then a green. A line joins them with the yards and the par.
   - Greens that can't be chosen are greyed out, with the reason ("too short",
     "can't finish the round").
   - Buttons: "play this leg", "change".
   - A small counter: "legs 7 / 18 · to par +2".
3. **The leg** plays like a normal hole: intro panel ("tee 4 → green 12 ·
   par 5 · 512 yd"), aim, swing, putting views, holing out.
   - The minimap shows a crop of the course overview around the leg, because
     the per-hole minimaps don't cover cross-course legs.
4. **After holing out:** the hole-complete panel, then the planner for the
   next leg.
5. **Summary:** the leg card, and the whole route drawn on the overview map.
   It can be shared, like a normal round.

## 4. How it fits the engine

The engine already plays a hole as "a tee, a green, a pin, a centre line". A
leg is a **virtual hole** made at the moment it is chosen. Most systems don't
need to know the difference.

### 4.1 Round (`src/systems/game/round.ts`)

- Add `RoundConfig.mode: 'stroke' | 'xc'`. In `xc` the round holds
  `legs: { tee: number; green: number }[]` (course hole numbers). The list
  grows as legs are chosen, and is saved in the snapshot, so a closed tab
  resumes mid-plan.
- The `hole` getter returns the leg's virtual `HoleJson`:
  - `number` is the leg index;
  - par comes from 2.2;
  - the tee is the start hole's tee for the round's tee set;
  - the centre line runs straight from the tee to the pin;
  - `greenId` and `greenCenter` are the target hole's;
  - the pin is the round's pin for that green.
- `holeGreen` already follows `greenId`, so holing out, the fringe and
  wrong-green relief work unchanged.
- `defaultAim` / `lineAim` aim along the centre line and step around trees as
  now. A leg's centre line is straight, so the existing tree check does the
  work.
- Winds: as now, one per leg index.

### 4.2 Putting views, minimap, intro

- **Putting views** (`greenView.ts`) are looked up by hole number. In `xc`
  they should be looked up by the **target green's own hole** (a new
  `Round.viewHole`), because the views are drawn around each green.
  `PlayScene` uses `courseHole` for this in a few places; those switch to
  `viewHole`.
- **Minimap:** use `maps/overview_2m.png`, cropped to the leg's box with a
  margin. No new pipeline art is needed.
- **Hole intro and fly-over:** the fly-over follows the centre line, so it
  works with the straight leg line.

### 4.3 The "still completable" check

This is a bipartite matching. Remaining tees sit on one side, remaining
greens on the other, and an edge joins a tee and a green when the distance
between them is between the minimum and maximum leg length. A choice (tee t,
green g) is allowed only if the remaining tees and greens, minus t and g,
still have a perfect matching. For 18 holes, a simple augmenting-path
matching (Kuhn's algorithm) takes well under a millisecond. Running it for
every candidate green is about 18 × 18 checks per choice, which is still
instant. A pure function in `src/systems/game/crossCountry.ts`, unit-tested.

Courses where the length rules make a full routing impossible can't offer the
mode. The same check finds those (for example, a par-3 course where every
green is within 120 yd of some tee but the tees cluster in one place).

### 4.4 Boards and server

- `RoundLength` gains `'xc'`. `LeaderboardEntry` gains
  `legs?: [number, number][]`. Each score's `hole` is the leg index, and the
  eagle's hole is the green's hole.
- `compareRounds` gets a cross-country variant (to par first).
- The server checks:
  - the shape: the legs list is a pairing, with every tee once and every
    green once;
  - each leg's par against the course data it doesn't have. So the server
    trusts par the way it trusts gross today (there is no anti-cheat, by the
    developer's choice).

### 4.5 What doesn't change

Physics, the swing, relief, the course data and the pipeline don't change.
No course needs rebuilding.

### 4.6 The rules on today's courses (checked 2026-10-20)

With the default tees and the centre pins, a 120-700 yd leg rule:

| Course | Holes | Full routing possible | Median yards from green k to tee k+1 | Allowed greens per tee (mean) |
|---|---|---|---|---|
| East Potomac Blue | 18 | yes | 50 | 9.5 |
| East Potomac White | 9 | yes | 69 | 7.4 |
| East Potomac Red | 9 | yes | 40 | 6.3 |
| Eastmoreland | 18 | yes | 57 | 7.8 |
| Franklin | 18 | yes | 108 | 7.9 |
| Highland Links | 9 | yes | 48 | 7.1 |
| Indian Island | 18 | yes | 65 | 10.3 |
| Langdon Farms | 18 | yes | 72 | 9.1 |
| Langston | 18 | yes | 60 | 9.6 |
| Oregon Golf Club | 18 | yes | 94 | 7.3 |
| Oswego Lake | 18 | yes | 73 | 12.2 |
| Stone Creek | 18 | yes | 77 | 13.8 |
| Tualatin | 18 | yes | 55 | 13.1 |
| Wannamoisett | 18 | yes | 41 | 14.2 |
| Waverley | 18 | yes | 70 | 12.9 |
| Willamette Valley | 18 | yes | 59 | 10.7 |

Every course allows a full routing, with 6 to 14 greens open from a typical
tee, which is plenty of choice. The median gap from one green to the next
tee (40-108 yd) shows why the minimum leg length is needed. Without it, the
cheapest routing would be a string of short chips and putts.

## 5. Plan and effort

| Step | Work | Size |
|---|---|---|
| 1 | `crossCountry.ts`: leg par, length rules, matching check, virtual hole; unit tests (feasibility on every course, a robot cross-country round on Oswego Lake) | half a day |
| 2 | Round `xc` mode, snapshot, `viewHole`; flow start/finish; board length `xc` | half a day |
| 3 | Leg planner screen on the overview map (tap tee, tap green, greyed choices, route so far) | half a day |
| 4 | HUD: intro text, leg minimap crop, leg scorecard, summary route map, share card | half a day |
| 5 | Boards, server checks, milestones; Playwright test playing two legs | a few hours |

About two and a half days of design-chat work. A smaller first version
(steps 1, 2 and a plain list instead of the map planner) is about one day.

## 6. Questions for the developer

- **Q1. Exactly one leg per tee and green (N legs), or any number of legs
  until all are used?** I recommend exactly N, so rounds compare.
- **Q2. Leg lengths:** at least 120 yd and at most about 700 yd? A shorter
  minimum makes it easier; a longer maximum makes marathons possible.
- **Q3. Ranking:** by score to par (recommended) or by gross strokes?
- **Q4. Where it lives:** a round length on the setup screen ("cross-country"),
  or its own button on the title screen next to "daily" and "practice"?
- **Q5. A daily cross-country:** the same course and the same required first
  leg for everyone on a given day? Optional, later.

## 7. Variants worth keeping in mind

- **Fixed routes:** a course chat (or the developer) designs one memorable
  cross-country routing per course, played like a normal round with its own
  board. No planner is needed, and it's easy to add after the free mode.
- **Shortest-route challenge:** the same rules, ranked by total yards walked
  plus strokes.
- **Pass-and-play:** a natural fit when local multiplayer arrives. Each
  player picks the next leg in turn.
