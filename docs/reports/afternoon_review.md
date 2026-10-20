# Afternoon review (2026-10-20)

This is a second review before the game goes to friends. Three reviews ran in parallel on current `main`:

- the play screen and the courses (three real rounds in the browser, on desktop and both phone shapes);
- the menus, saving, the offline copy and the shared leaderboard;
- the rules, the physics and the round engine (robot rounds on all 19 courses).

Each finding was checked with a screenshot, a throwaway test or a close reading of the code. The fixes are on `design/afternoon`, which also has the build fix (`hotfix/build`), the trimmed settings, the rotating course cards and the softer spin.

Priority scale (as this morning):

- **P0:** the game stops.
- **P1:** a round or a score is lost or wrong, or a screen can't be used.
- **P2:** wrong in normal play, or a likely question from friends.
- **P3:** polish.

## Ranked list

| # | P | Problem | Status |
|---|---|---|---|
| 1 | P0 | The live site stopped updating after the daily-course fix. A test imports the generated course list, and `npm run build` type-checked before writing that list, so the Cloudflare build failed on a fresh clone. | Fixed (`hotfix/build`): the build writes the course lists first |
| 2 | P1 | "new round" and "daily" threw away a round in progress without asking. | Fixed: "you have a round in progress ... start a new one and lose it?" before tee off and before the daily |
| 3 | P1 | Today's daily board could mix courses. The live site has shown East Potomac Red since the afternoon merges. | Today stays Stone Creek (developer). The day and week boards also drop rounds on a course other than the day's |
| 4 | P2 | Water beyond the boundary at Gearhart 5-8 and Bandon Trails 7 (red penalty areas by the developer's call) usually gave no drop, only stroke and distance. | Fixed: the reference point is the last dry point inside the boundary. A ball that crossed more than 20 m of out-of-bounds ground first is out of bounds |
| 5 | P2 | Langdon's shared 9/18 green forced "wrong green" relief. | Fixed: touching greens are one putting surface |
| 6 | P2 | The putter stopped at 80 ft. 13-22 % of the greens at Langdon, Chambers Bay and Bandon Trails couldn't be putted from. | Fixed: 120 ft and 160 ft settings, picked automatically |
| 7 | P2 | A ball resting against a tree trunk on a steep slope jittered for up to 26 s. | Fixed: a slow ball that meets a trunk stops there |
| 8 | P2 | On the summary, the name button covered the title (desktop) and the note (phone). | Fixed |
| 9 | P2 | "update - tap to reload" appeared after every deploy, though the page was already new. | Fixed: offered only to a page older than the new copy |
| 10 | P2 | The scorecard's stats line spilled out of its panel, on the share picture too. | Fixed |
| 11 | P2 | Players may not notice that rounds without a name stay off the leaderboard (developer). | Fixed: a "set your name for the leaderboard" button on the title, an orange name row on the new-round screen, one ask before the first round (with "skip"), and an orange name button on the summary |
| 12 | P2 later | Gorse (Bandon Dunes): power was ignored and the yardage shown was wrong. | Fixed: one carry for the strike, the labels and the swing length |
| 13 | P3 | Gorse showed in green like a good lie and kept its topspin. | Fixed: rough, punch, gorse and bunkers show yellow; no spin from gorse |
| 14 | P3 | During a relief choice, the info panel showed the previous shot, and the swing controls showed behind the drop panel. | Fixed |
| 15 | P3 | The bunker unplayable button overflowed: "(2 strokes) (+2)". | Fixed |
| 16 | P3 | The result banner covered the cup in the putting views, and "in the hole!" showed above the hole panel. | Fixed |
| 17 | P3 | A 60-yd chip onto the green was reported in feet. | Fixed: feet for putts only |
| 18 | P3 | "carry 245" had no unit. | Fixed: "carry 245 yd" |
| 19 | P3 | The off-screen ball arrow floated mid-fairway on desktop. On portrait phones, the golfer stood among the bottom controls. | Fixed |
| 20 | P3 | Six centre pins were hidden behind trees in the course view. | Fixed: trees in front of the flag fade |
| 21 | P3 | A back-nine summary showed an empty front nine. | Fixed |
| 22 | P3 | "pitching w". | Now "p wedge" ("pitching wedge" filled the panel edge to edge and overflowed the rewatch buttons) |
| 23 | P3 | The daily round never asked for a name. | Fixed (with 11) |
| 24 | P3 | The empty daily board had no way to start the round. "no eagles yet" sat above the column headers. There was a gap on the portrait title. | Fixed: a "play today's round" button; the message moved below the headers; the gap closed |
| 25 | P3 | Desktop course select showed three cards a page. | Fixed: two rows |
| 26 | P3 | Lateral drops were sometimes impossible at ordinary ponds (Stone Creek 4). | Fixed |
| 27 | P3 | The meter readout overstated an overswing (a driver about 5 yd). | Fixed |
| 28 | P3 | In a casual round, a mulligan after resuming kept the penalty stroke. | Fixed: the pre-shot state is saved |
| 29 | P3 | The automatic aim's safety check ignored the wind. | Partly fixed: it flies the line in the hole's steady wind and avoids wrong greens. On Eastmoreland 14, in some winds, no driver line clears the creek |
| 30 | P3 | The default club overshoots downhill par 3s (Eastmoreland 5, OGC 12). | Left as it is: the player reads the slope |

## Also on the branch (developer requests)

- **Settings:** units, input latency and the OB rule are removed. Yards, no latency offset and stroke-and-distance OB are fixed.
- **Course cards:** each card rotates up to four greens instead of one water hole. The details are in DECISIONS.md.
- **Hide me:** settings "leaderboards: show me / hide me" keeps a player off every shared list (their rounds are kept and come back on "show me").
- **Spin:** halved from a clean lie, a twentieth from rough, under trees or a bunker, and none from gorse. A wedge spins back at most 1 m.

## Checked and fine

- Full rounds on Gearhart, Bandon Trails and Chambers Bay ran with no page errors.
- Every pin is on its green and within 3 % slope, and short putts to every pin drop.
- No default tee shot on the three new courses hits a tree, water or out of bounds.
- Rewatch replays every shot to the same spot.
- The server's validation and the time-zone handling of the daily round hold.
- The offline copy picks up new courses after a deploy.
