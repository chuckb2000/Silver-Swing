# Bug and playability review (2026-10-20)

Done before sharing the game with friends. Three reviews of the code ran in parallel:

- the play screen and HUD;
- rules, physics and the round engine;
- menus, saving and the shared leaderboard.

Each finding was checked by reading the code, a throwaway unit test or a run of the server under wrangler with a local D1. I then fixed most of them.

**Nothing is merged.** The fixes are on two branches:

| Branch | What is on it |
|---|---|
| `design/overnight` | Your overnight list, plus the two worst bugs (P0 1 and 2) and the server hardening (items 26-28), because the new leaderboard features needed them. |
| `design/bugfixes` | Everything else that is marked fixed below. It is built on `design/overnight`, so merging it brings both. Tests: `game/tests/unit/bugfixes.test.ts` and `online.test.ts`. |

**Priority scale**

- **P0:** the game stops.
- **P1:** a round or a score is lost or wrong, or a screen can't be used.
- **P2:** wrong in normal play, or a likely support question from friends.
- **P3:** polish.

## Ranked list

| # | P | Problem | Status |
|---|---|---|---|
| 1 | P0 | A second round in the same tab freezes the game: the HUD keeps destroyed texts from the first round. This is most likely your "freezes when I load a course" report: picking a course after a round starts a second round in the same tab. | Fixed (overnight) |
| 2 | P0 | A failed course load leaves no course loaded. The next menu screen then crashes the game. | Fixed (overnight) |
| 3 | P1 | A ball in water beyond the boundary (the Anacostia, the Potomac, the Willamette past the strip) is given penalty-area relief instead of out of bounds. | Fixed (bugfixes) |
| 4 | P1 | A punch shot from under trees, hit down a slope, hangs in the air for 45 s and then drifts out of bounds. | Fixed (bugfixes) |
| 5 | P1 | Tapping inside a drop area does nothing; only "drop here" works. | Fixed (bugfixes) |
| 6 | P1 | Opening the menu, map or card mid-swing lets the meter run out and fires a maximum miss behind the dialog. | Fixed (bugfixes) |
| 7 | P1 | A tab closed on the last hole's panel loses the round, and leaves a "continue round" button that does nothing. | Fixed (bugfixes): the button says "finish last round" and posts it |
| 8 | P1 | Opening the card during a shot can leave the relief or hole-complete panel with no buttons. | Fixed (bugfixes) |
| 9 | P1 | A friend on a second device, or after Safari clears site data, is locked out of their own name. | Fixed (bugfixes): "it's mine" button in the name box, which takes the other device's player code; the game also asks the browser to keep its storage |
| 10 | P1 | The friends board usually misses the round just finished: it is read before the upload lands. | Fixed (bugfixes) |
| 11 | P1 | Closing the tab while the ball is in flight or during a relief choice gives a free replay with no stroke. | Fixed (bugfixes): the open relief choice is saved and reopened on resume |
| 12 | P2 | Punch shots from under trees ran out 40-70 m. | Fixed (bugfixes) |
| 13 | P2 | The latency setting was ignored at the turn of the meter. | Fixed (bugfixes) |
| 14 | P2 | A zero-power swing (two taps too close together) gave a NaN ball and an out-of-bounds penalty. | Fixed (bugfixes) |
| 15 | P2 | After an overswing, the green zone is not drawn halved, although it is halved. | Fixed (bugfixes) |
| 16 | P2 | Casual "max 2x par" was not a cap: a penalty or gimme took the score past it. | Fixed (bugfixes) |
| 17 | P2 | A mulligan kept the penalty strokes, putts and stats of the replayed shot. | Fixed (bugfixes) |
| 18 | P2 | 26 of the new pin positions were hidden behind trees in the course view. | Fixed (bugfixes) |
| 19 | P2 | A swing tap that lands on a greyed-out HUD button is lost. | Fixed (bugfixes) |
| 20 | P2 | Two quick Space presses on the last panel saved the round twice; a casual "max" on the last hole could crash. | Fixed (bugfixes) |
| 21 | P2 | The same key press delivered twice (slow machines) gave a 0 % swing. | Fixed (bugfixes) |
| 22 | P2 | Switching tabs or apps mid-swing fired a bad shot on return. | Fixed (bugfixes) |
| 23 | P2 | Dialogs didn't re-lay out on a phone rotation; "next hole" could end up off screen. | Fixed (bugfixes) |
| 24 | P2 | Changing club during the putting-view zoom showed the wrong view. | Fixed (bugfixes) |
| 25 | P2 | The name box: tapping the game submitted a half-typed name, two boxes could open, the iOS keyboard might not come up, and the box could outlive its panel. | Fixed (bugfixes): one box at a time on a dimmer, with ok and cancel buttons; tapping the field brings up the keyboard on iOS; it closes with its screen |
| 26 | P2 | The server did too much database work per request after a deploy, over the free plan's 50 queries. | Fixed (overnight) |
| 27 | P2 | Uploaded rounds were barely checked; one bad round could block all uploads. | Fixed (overnight) |
| 28 | P2 | Recent eagles were ordered by the phone's clock and could be posted without a player key. | Fixed (overnight) |
| 29 | P2 | Leaderboard tabs tapped quickly drew rows on top of each other; a stalled connection left no way back. | Fixed (bugfixes): build counter, back button first, 8 s limit on every request |
| 30 | P2 | The summary showed a rank for a round whose name another device holds (so the round never reached the board). | Fixed (bugfixes): it says so, and the name button opens the name box |
| 31 | P2 | Rounds played before a name was set vanished from this device's board. | Fixed (bugfixes): shown as "(no name)" on this device's board only |
| 32 | P2 | The menu fly-over flew to the previous course's holes after a switch. | Fixed (overnight) |
| 33 | P2 | "Continue round" had no stall watchdog; Esc during its load stranded the game. | Fixed (overnight) |
| 34 | P2 | On a slow connection the large data images (up to 4.7 MB) set off the "stalled" message, and could fail outright. | Fixed (bugfixes): streamed with byte progress; a download is only given up after 20 s with no bytes |
| 35 | P2 | A mistyped player code silently made a new identity; there was no record of the old code. | Fixed (bugfixes): codes are checked with the shared board, the current code is shown, and l/o/0/1 are refused |
| 36 | P2 | The banned-word filter blocked real names (Nigel, Knight, Fukuda), stripped accents (José became "jos") and let common spellings through. | Fixed (bugfixes) |
| 37 | P2 | Text overflow on phones: the summary's call to action, the recent-eagles columns, the summary buttons below 260 texels. | Fixed (bugfixes) |
| 38 | P3 | More narrow-screen overlaps (portrait phones about 240-292 texels wide). | Plan A |
| 39 | P3 | Course art (cards, logos, title maps) shares the loader with the course, so a failed logo fails the course load. | Plan B |
| 40 | P3 | Missing terrain chunks, minimaps or overview images are ignored and show as holes. | Plan B |
| 41 | P3 | A green's art that fails to download is never retried for that hole. | Plan B |
| 42 | P3 | If one save to IndexedDB fails, the next session can read an older copy; two open tabs overwrite each other. | Plan C |
| 43 | P3 | E-5 drop: the reference point for out of bounds inside the boundary (Route 105, ranges) is where the ball stopped, and the area can include a bunker or green. | Plan D (also Indian Island request 1) |
| 44 | P3 | Pin setup takes about 0.2 s at round start on a laptop; slower on phones. | Plan E |
| 45 | P3 | The fairway stat counts another hole's fairway. A hole-in-one on a par 4 counted as a missed fairway; that part is fixed (bugfixes). | Plan E |
| 46 | P3 | "On the recent eagles list!" also shows when offline (the eagle is kept and sent later). | Plan A |
| 47 | P3 | Anyone can claim an unclaimed name; posts from other sites are accepted. | Accepted for a friends game; Plan F if it becomes a problem |
| 48 | P3 | The scores GET checks every row's name on every request; fine now, slow with thousands of rounds. | Plan F |
| 49 | P3 | `window.__autoplay` (a bot that plays and posts a round) was on in production. | Fixed (bugfixes): only with `?autoplay` or in dev |
| 50 | P3 | Dates showed in UTC, so evening rounds showed tomorrow's date. | Fixed (bugfixes) |

## Plans for what is open

### A. Narrow screens (38, 46)

**Overlaps to fix:**

- the player code against "use another" below 268 texels;
- "stroke+dist" and "max 2x par" on 40-wide buttons;
- course-card subtitles wrapping into the next card at 292 or less;
- the leaderboard course line wrapping into the tabs at `pw` ≤ 290;
- the birdies footnote over the bottom buttons;
- "leaderboard: choose a state" at 2× scale;
- the setup screen's course name over the tees row;
- the drop prompt wrapping into its buttons;
- the scorecard header and stats line.

**How:**

1. Add a `fit(text, maxWidth)` helper in `ui/widgets.ts` that measures the bitmap text and shortens or wraps it.
2. Give every free-standing `txt()` a `maxWidth`.
3. Lay rows out from the panel width (as the recent-eagles columns now do).
4. Add a Playwright test that opens each screen at 240×427, 292×633 and 360×640 and checks that no text box crosses the panel edge or a button. The check reads `getBounds()` through `window.__golf`.

**Eagle text (46):** when the shared board is unreachable, say "saved - goes on the recent eagles list when online".

**Effort:** about half a day.

### B. Loading (39, 40, 41)

- **Separate loaders.** Load card art, logos and title maps with a separate `Phaser.Loader.LoaderPlugin`, or ignore failed keys that aren't the course's own, so one bad logo can't fail a course load.
- **Missing files.** In `loadCourse`, throw if any `chunk_`, `overview` or `mini_` key failed. The existing retry then offers a reload, instead of holes in the course.
- **Green art retry.** In `greenView.ts`, delete the failed entry from `loading` so the next shot on that hole tries again.

**Effort:** 1-2 hours.

### C. Storage (42)

- Store `{ savedAt, value }` in both IndexedDB and localStorage, and read whichever copy is newer.
- For two tabs, use a `BroadcastChannel('golf')`. A tab that saves the board or settings tells the others to reload them; a second tab with a round in progress shows "this round is open in another tab".

**Effort:** 2-3 hours, with unit tests on a fake storage.

### D. E-5 reference point (43)

- In `lastInBounds`, also require `!isOB(surface)`, so Route 105 and the ranges count as out.
- Add an `avoid` for bunker and green to the E-5 area.
- Add the spec's "or on the fairway" option: the nearest fairway point no nearer the hole, plus 2 club-lengths.
- Unit test on Indian Island hole 11 (Route 105).

**Effort:** 1-2 hours.

### E. Pins and stats (44, 45)

- **Pin setup speed (44):** cut `pinSheet` from 300 tries to about 60 and use a seeded Fisher-Yates shuffle. The current shuffle (`sort(() => rng - 0.5)`) differs between browsers. That is harmless, because the pins are saved with the round.
- **Fairway stat (45):** have the pipeline write each hole's fairway polygons into course.json (s10), and count a fairway hit only on the hole's own fairway.

**Effort:** 1 hour, plus a course rebuild for the fairway stat.

### F. Leaderboard abuse and cost (47, 48)

Only if it becomes a problem:

- **Abuse (47):**
  - limit name claims per IP per day (a `claims` table keyed by `CF-Connecting-IP`);
  - refuse POSTs whose `Origin` isn't the game's own site;
  - add a delete script for the developer: `wrangler d1 execute <db> --remote --command "DELETE FROM names WHERE name='x'"`, and the same for `rounds` and `eagles`.
- **Cost (48):** remember `boardableName` per distinct name within a request, and keep only the top 200 per board in the GET.

## How to try the fixes

1. On a branch preview, or `make dev` on `design/bugfixes`, play a hole and hit into water. Close the tab with the relief panel showing, reopen it and press continue round. The relief panel is back, with the stroke counted.
2. Finish a round with no name, then enter a name another device holds: the box offers "it's mine".
3. In the browser's dev tools, set the network to "Slow 3G" and load Franklin. The percentage keeps moving, and no "stalled" message appears.
