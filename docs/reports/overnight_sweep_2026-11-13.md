# Overnight sweep, 2026-11-13

Two pull requests: part 1 (play screen, HUD, menus: 47 fixes) and part 2 (rules, physics, saving,
the shared board, live matches: 28 fixes). Each PR lists its fixes; DECISIONS.md has what changes
for a player. This file keeps how the sweep was done and what it found and did not fix.

## How

- Six read-throughs of the code, one per area (play screen and rendering, HUD and widgets, rules /
  round / physics, saving and the leaderboard server, live matches, menus and flows), each asked for
  concrete scenarios with file and line. Every finding was checked against the code before it was
  fixed; a few were reproduced first (the 45-second ball, the unholeable putt, the stored-round
  loss on a database error, the 19-hole match result).
- A robot with a clean swing played every hole of all 62 courses on the default tees, twice
  (2,098 holes), with the game's own club and aim. No crash and no hole it could not finish
  except Highland Links 9 (below).
- A script opened every menu and in-round screen at 1920x1080 with "bigger" pixels, a phone
  upright and on its side (3x) and looked for buttons and text that overlap or leave the screen.
- A scan of every green's heights for slopes over 8 % inside the green.

## Open items: course data (not changed: geometry is never invented)

**Greens with a bank or a step inside them.** 5.6 shapes greens to a 1-3 % tilt; these have
far steeper ground inside the green's own surface, so the lidar under the outline is a bank, a
bunker face or a dune, or the outline is misplaced. Each needs a look at its outline and a
rebuild with the course's pinned pipeline.

| Course | Hole | Steepest | Steep part of the green |
|---|---|---|---|
| bandon_preserve | 4 | 72 % | 3 % |
| bandon_preserve | 7 | 73 % | 5 % |
| highland_links | 9 | 34 % | 34 % |
| langdon | 9 | 9 % | under 1 % |
| langdon | 18 | 16 % | under 1 % |
| langston | 13 | 42 % | 19 % |
| old_macdonald | 5 | 19 % | 1 % |
| old_macdonald | 10 | 20 % | 2 % |
| sheep_ranch | 3 | 65 % | 6 % |
| sheep_ranch | 16 | 64 % | 8 % |
| shortys | 6 | 70 % | 5 % |
| shortys | 9 | 24 % | 5 % |
| shortys | 13 | 24 % | 4 % |
| shortys | 18 | 69 % | 5 % |

Highland Links 9 is the one that hurts play: the green rises 1.1 m in 4 m between the front
and the pin's level, and a 43-foot putt at 60 % rolls up the bank and back to where it started
(the robot putted 14 times). Langston 13 is next (a fifth of the green is over 8 %).

**The developer's calls (2026-11-13):** Highland Links 9 stays as it is. Langston 13's step is
flattened: 1.0 m over 8 m (was 1.37 m over 5 m), about 19 % at its steepest (was 41 %). The
others stay open.

**Holes the robot scored +3 or worse on:** Cypress Point 17 (water, then a tree), Spruce Peak 16
(a par 3: the default tee shot ended in the woods once and out of bounds once),
Wildwood 7 (trees, water). Worth a look when those courses are next open.

## Found and left, with the reason

- **A name dialog closed without a name starts the round.** It is the "skip" the dialog offers.
- **The ambience keeps playing in the menus after a round.** May be meant; one line to stop it.
- **The move clock runs on a match's creator who never saw the other player join** (the joiner's
  game says "ready" on entering). This follows "the clock runs whoever is in the match".
- **One player can use up a match's 400 chat messages**; a replaced offer stays in the offerer's
  list until the next reconnect; a match older than the latest 12 on a device falls back to the
  current player code. Small, and each is a design choice.
- **The daily counts once per player code and day**, not per day and course: a device with an old
  build open could play another course as "today's". The title now follows the day, which closes
  the common way into it.
- **The course board is cut at 2,000 rounds across all lengths.** Far from mattering yet.
- **The new-round screen shows three tee sets at most**, and a club with six round lengths would
  crowd the handicap line. No course has either today.
- **The meter overlaps the club arrows in a near-square window under about 333 texels wide**, and
  a 19-hole summary overlaps its title on a screen under about 285 texels tall. Rare sizes.
- **PR #55 (auto club allows for the ground)** changes `autoClub` too; the tee lay-up added in
  part 2 is a few lines in the same function and will need merging by hand with it.
