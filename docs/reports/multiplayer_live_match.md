# Live match play (multiplayer option 3): design note

Branch `design/multiplayer` (not merged: the developer will decide when, 2026-10-21).
The full write-up for the developer, with screenshots, costs and the issues
found, is the white paper; this note is the technical reference kept with the
code.

## 1. What it is

Two players, each on their own device, play a match against each other on the
same course, tees, wind and pins, taking turns as in real match play: the
honour on the tee, then the ball farther from the hole. Each hole is won,
lost or halved; the match ends when one player leads by more holes than are
left ("3&2"), after the last hole ("1 up"), on an extra hole when it was all
square ("at the 19th"), by concession, or by forfeit (the move clock).
Players can give a putt ("that's good"), give up a hole or the match, leave
and come back later, and offer a rematch. A finished match goes on the
leaderboard's "recent" list ("kevin def. charlie 3&2"); it counts on no board,
handicap or "my golf" (developer, 2026-10-21).

## 2. How it fits together

```
 game (browser)                        Cloudflare
 ----------------------------          -----------------------------------------
 PlayScene / HudScene / MatchScene
        |  shows                        Pages site (silver-swing.pages.dev)
 LiveMatch (match/live.ts)               functions/api/matches.ts      POST create, GET ping
   MatchSession (systems/match)          functions/api/match/[[path]].ts  /api/match/<code>/...
     rules.ts  <-- the same code -->        | MATCH binding (stub.fetch, WebSocket too)
   MatchClient (net/matchClient.ts) ----> match Worker "silver-swings-match" (game/match-worker)
     WebSocket, or HTTP polling             Durable Object MatchRoom, one per match code
     outbox in localStorage                   MatchRoomCore (server/matchRoom.ts)
                                              SQLite storage: one record "m" {state, keys, log, here}
```

- **One Durable Object per match** (named by its 6-character code). It keeps
  the match's log, checks every move with `rules.ts` and sends each new entry
  to every game connected to it. WebSocket Hibernation: the object sleeps
  between moves; keep-alive pings are answered by the platform
  (`setWebSocketAutoResponse`) without waking it.
- **The log decides everything.** `applyEvent(state, event)` is a pure
  function run by the server (to accept or refuse a move) and by both games
  (to show it). Distances are compared squared: no `Math.hypot` or `sqrt`,
  whose last digit can differ between browsers.
- **The striking game's flight is the flight.** A stroke is simulated once,
  on the player's own device; it goes to the server with its result (the hole
  after it) and its flight (`path.ts`: every second sample as float32 in
  base64, about 6 KB). The other game plays that flight back and never
  simulates the stroke again, so a ball on a cup's lip or a branch's edge ends
  the same on both screens.
- **Nothing moves on screen until the server has the move** ("sending..." is
  the backswing). Moves are queued and shown one at a time (`MatchSession`
  queue), so balls never run ahead of the animation.

## 3. The log

| Entry | Made by | Effect |
|---|---|---|
| `created {cfg, player}` | server (POST /api/matches) | the match: course, version, tees, holes, difficulty, seed, pins |
| `joined {player, honour}` | the second player's `join` | the honour drawn by lot (Rule 6.4a) |
| `ready {hole}` | each player | both at the tee: the hole starts |
| `stroke {hole, after, shot, path}` | the player to play | `after`: the hole as the stroke left it (count, ball, relief still open, holed) |
| `relief {hole, after, penalty, label}` | the player | a drop (water, out of bounds, unplayable, free relief), or "as it lies" |
| `concede {what: stroke/hole/match, hole, strokes?}` | either player | a given putt carries the stroke count it was given at |
| `slow {hole, turn}` | the waiting player | a penalty stroke for slow play on the other (2:00 on the clock `turn`) |
| `claim {turn}` | the waiting player | the match won by forfeit (5:00 on the clock `turn`) |
| `rematch {code}` | either player, match over | the new match's code |

Rules (`rules.ts`, tests in `match_rules.test.ts`):
- order of play: a relief still open first; on the tee the honour, then the
  other; then the farther ball (equal: the honour). A ball to be replayed
  from the tee waits (6.4c);
- a hole is decided once the other player can no longer tie, counting the
  penalty a relief still open must cost; holing out first can decide it;
- halved: the honour stays; won: the winner takes it;
- a stroke is refused while a water or out-of-bounds drop is pending; a drop's
  penalty is at least what its relief costs; a given putt is void if a stroke
  of the other player crossed it ("moved");
- extra holes: all square after the last hole, the match goes on with the
  round's holes again (hole index `n`, `n+1`... is card hole `holes[i % n]`,
  pin `pins[i % n]`) until one is won; halved after 36 extra holes, a limit
  nobody reaches (`MAX_EXTRA`);
- the move clock (`CLOCK`, `state.clock = {seq, at, slow}`): every move except a
  penalty stroke starts it again at its server time plus 15 s. `waitingOn(s)`
  says who waits on whom: the player to play (a stroke or a drop), or the one not
  yet at the next tee. `slow` needs 2:00, the waiting player, a shot (not the
  tee), one per clock, and the clock it was meant for (`turn`, else "moved");
  it adds to `p[k].slow`, which counts in the score (`scoreOf`) and in the
  hole's result but not in the player's own count, so a stroke struck as the
  penalty arrives still adds up. `claim` needs 5:00 and the waiting player.

## 4. Messages

HTTP (all JSON, `cache-control: no-store`):

| Path | Use |
|---|---|
| `GET /api/matches?ping=1` | live matches set up here? (503 without the MATCH binding: the title hides "play a friend") |
| `POST /api/matches {cfg, player, key, rules}` | a new match; returns its code |
| `GET /api/match/<code>/info` | anyone: course, players, phase, status line, rules |
| `GET /api/match/<code>/events?since=N` | polling: the log after N (key in the `x-match-key` header, never the address; `x-match-hidden: 1` from a background tab), `more`, `online`, `here`, `now`, `seat` |
| `POST /api/match/<code>/hello {key, rules}` | polling: the seat, who is there, `here`, `now` |
| `POST /api/match/<code>/act {key, cid, action, rules}` | polling: a move |
| `POST /api/match/<code>/report` | a game saw the match end: the Pages Function asks the object for its result (`/result`, not reachable from outside) and puts it on the "recent" list once (D1 table `matches`; settings "merge names", `/api/merge`, renames and moves a player's matches too) |
| `GET /api/match/<code>/ws` | the WebSocket |

WebSocket, game to server: `hello {key, since, rules}`, `sync {since}`,
`act {cid, action}`, `who` (every 30 s), and the keep-alive `{"type":"ping"}`.
Server to game: `welcome {protocol, rules, seat, seq, online, here, now}`,
`events {events, last}` (catch-up in batches of 40), `ack {cid, seq, seat,
now}`, `nack {cid, code, message, seq, now, wait?}` (`wait`: a penalty or
claim made too early, ms to go), `presence {online, here, now}`, `seat
{seat}`, `error {code, message}`, `pong`. `now` is the server's clock (the
games show the move clock from it); `here` is since when each player has been
in the match.

Development only (`scripts/match-dev.sh`, `MATCH_DEBUG=1`): `POST
localhost:8787/debug/<code>/skip?ms=N` moves a match's clock on, for the
two-browser test of the clock.

Close codes (`types.ts` CLOSE): 4004 no such match, 4008 no hello within
10 s, 4010 expired, 4011 opened elsewhere (same player key), 4012 rules
differ.

Versions: `PROTOCOL` (message shapes; in the match config) and `RULES`
(anything `rules.ts` decides). A game and a server whose RULES differ are
refused with what to do: "reload to update" (the game is older) or "the match
Worker needs deploying" (the server is older).

## 5. Reliability

- **Moves are never lost or counted twice.** A move goes into an outbox in
  localStorage before it is sent and leaves it only when answered. Each move
  has an id, kept in the log with it; a move sent twice (an answer lost, a
  reconnect, a reload, the object restarted) is answered with its first result.
- **One write per move.** The match is one stored record (`m`: state, players'
  keys, log, `here`), written once per accepted move; flights are kept for the
  hole being played and the one before, and the record stays under 1.5 MB (the
  storage allows 2 MB a record). The deletion alarm is moved only when it is
  half a day off.
- **Who is here** (the move clock): `here.back[k]`, when player k's current stay
  began, and `here.seen[k]`, when they were last known to be here (written when
  their last line closes, and once a minute for a game asking over HTTP, since
  the object can be evicted between questions). A player back after more than
  5 minutes away starts a new stay. A penalty or claim needs its time counted
  from the later of the clock's start and the waiting player's stay.
- **Catch-up by sequence number.** Every entry has a `seq`; a game asks for
  everything after the last one it has (hello, sync, polling). A gap starts a
  resync. A game that knows the server is further on (`serverSeq`) offers no
  move until it has caught up, and asks again after 3 s.
- **The line.** A connect timeout (10 s without a welcome); keep-alives every
  15 s, the line judged dead when one goes 10 s unanswered (judged from when
  it was sent: a background tab's timers may run once a minute); a quick check
  (4 s) when the page comes back into view or the network returns;
  reconnects with backoff and jitter; HTTP polling after three failed
  WebSockets (six if one has worked: a phone that lost its signal), every
  2 s, 5 s after two minutes with nothing new, 8 s in a background tab, once a
  minute after 5 minutes out of sight and not at all after 30 (until the page is
  looked at again), with WebSockets tried again after 5, 15, 30, 60 s.
- **One line per player.** A second tab or device with the same player key
  takes the match over; the first shows "playing elsewhere" with "play here",
  and a background tab never takes it back on its own.
- **The server makes room**: sockets that never say hello are closed after
  10 s, and quiet ones, before a new socket is refused (12 at most).
- **Out of step** (never expected): a new session is built from the whole log
  behind the one on screen and swapped in; after two failures the game says
  it can't follow the match and offers a reload.
- **Moves rebuilt by the server** from their own fields (`cleanAction`): a
  modified game can't add fields to the log or send a shape the other game
  can't show. Flights are checked when read (`decodePath`).

## 6. Files

| File | What |
|---|---|
| `game/src/systems/match/types.ts` | vocabulary: config, log entries, state, versions, close codes |
| `game/src/systems/match/rules.ts` | match play rules, `applyEvent`, `cleanAction` (server and games) |
| `game/src/systems/match/session.ts` | a game's copy: the state plus a Round per player, the queue |
| `game/src/systems/match/path.ts` | flights to and from text |
| `game/src/server/matchRoom.ts` | the match server (`MatchRoomCore`), written against small interfaces |
| `game/src/server/matchRoutes.ts` | the Pages side: match codes, `toMatch` |
| `game/functions/api/matches.ts`, `game/functions/api/match/[[path]].ts` | Pages Functions |
| `game/match-worker/` | the Worker: `MatchRoom` (Cloudflare adapter), wrangler.toml, package.json |
| `game/src/net/matchClient.ts` | the line: WebSocket, polling, outbox, keep-alives |
| `game/src/match/live.ts` | a match in this browser: client + session, this device's matches, rebuild |
| `game/src/scenes/MatchScene.ts` | "play a friend", invitation, join, continue |
| `game/src/scenes/PlayScene.ts`, `HudScene.ts` | the match on the course: turns, playback, panels, match bar |
| `game/src/ui/matchCard.ts` | the match's scorecard |
| `game/scripts/match-dev.sh` | both servers under wrangler, locally |

## 7. Setting it up

Locally (no Cloudflare account needed):

```
cd game && npm run build && bash scripts/match-dev.sh
# open http://localhost:8788 in two browsers (or a normal and a private window)
```

On Cloudflare (free plan), once, by the developer:

1. `cd game/match-worker && npm install && npx wrangler login && npm run deploy`
   (deploys the Worker `silver-swings-match` with its SQLite-backed Durable
   Object class `MatchRoom`; the free plan only allows SQLite-backed ones).
2. Cloudflare dashboard, Pages project: Settings > Bindings > Add > Durable
   Object: variable name `MATCH`, namespace `MatchRoom` of
   `silver-swings-match`. Save (for production, and preview if wanted).
3. Redeploy the site (bindings take effect on the next deployment).
4. Check: `https://silver-swing.pages.dev/api/matches?ping=1` answers
   `{"ok":true}`; the title shows "play a friend". Play one hole between two
   devices; the HUD's link line should never say "slow connection" (that is
   HTTP polling: it would mean WebSockets through the Pages Function don't
   work in production, which was only verified under wrangler; the game still
   plays, more slowly).

Merging before step 2 is safe: without the binding the ping answers 503 and
the title doesn't offer matches.

Done from the dashboard instead (developer, 2026-10-21, for the branch
preview): the Worker `silver-swings-match` is built by Cloudflare from GitHub
(Workers & Pages > Create > Continue with GitHub; root directory
`game/match-worker`, no build command, deploy command `npx wrangler deploy`,
production branch `design/multiplayer`, preview builds off). A build starts on
a push to that branch; the dashboard's "retry" only rebuilds the same commit.
The binding then goes on the Pages project's Preview environment. When the
branch merges: switch the Worker's production branch to `main` and add the
same binding to Production.

When `rules.ts` changes: bump `RULES`, deploy the Worker, then the site, close
together. Games and matches in progress are told to reload; their logs must
still read the same under the new rules, or those matches can't continue
(keep changes to the rules backwards compatible, or accept that).

## 8. Tests

| Test | What |
|---|---|
| `tests/unit/match_rules.test.ts` | order of play, deciding holes, concessions, results, drops, crossed moves, what the server accepts |
| `tests/unit/match_session.test.ts` | two robots play whole matches with the real physics (wild ones too); both games and a late joiner agree |
| `tests/unit/match_server.test.ts` | server and client over a fake network that drops lines, loses answers, swallows hellos, goes deaf, throttles timers, refuses WebSockets and fails storage |
| `tests/unit/match_live.test.ts` | the real Worker and Pages Functions under wrangler (`MATCH_URL=http://localhost:8788`) |
| `tests/e2e/match.spec.ts` | two browsers through the screens: lost line, reload, give putt, concede, rematch |
| `tests/e2e/match_flows.spec.ts` | water and drop, crossed concession, reload mid-stroke, second tab, pause over the waiting panel, an old server; phone portrait screens |
| `tests/e2e/match_clock.spec.ts` | the move clock (penalty at 2:00, warning at 3:30, claim at 5:00, the result on "recent" with `MATCH_D1=1`); extra holes (the 10th of a nine-hole match) and a claim at the tee |

Run: `npx vitest run` (the live test is skipped without MATCH_URL);
`npm run build && npx playwright test -c playwright.match.config.ts` (starts
the servers if they aren't running; about 12 minutes). The "recent" check runs
when the servers were started with `MATCH_D1=1 bash scripts/match-dev.sh`
(then only one name per browser: run match_clock.spec.ts alone).

## 9. Costs and limits (Workers free plan)

Durable Objects: 100,000 requests a day, 13,000 GB-s, 100,000 rows written
and 5 million read a day, 5 GB stored. Incoming WebSocket messages count
1/20 of a request; outgoing messages and auto-answered keep-alives are free;
an idle object costs no duration, even before it hibernates. An 18-hole match
is about 200 moves: about 210 rows written (one per move, two alarms, the
deletion, a few arrivals and departures), some 30-40 requests, a record of
about 200-400 KB (deleted 3 days after it ends, 14 days after its last move).
So about 450 full matches a day fit the free plan's writes, and the requests
far more. The site's own requests (Pages Functions: 100,000 a day, shared with
the leaderboards) are about 15 per match over WebSockets. Polling costs a
request every 2 s while things happen (about 1,800 an hour per player), less
when they don't: it is the fallback, not the way to play. Over a limit, only
that kind of request fails until midnight UTC: matches can't be made or
played if the Durable Objects' writes run out, but the leaderboards (D1, its
own allowance) and the game itself (static files, free) keep working.

## 10. Known limits

- No anti-cheat: the striking game reports its own stroke (as the
  leaderboards trust their rounds: the developer's choice). A modified game
  could report a better stroke; the server only checks that it is a legal
  move.
- Two players. A third person opening the link is told the match already
  has two players (the server would let them watch; the game has no
  watching screen).
- Matches are on the "recent" list only: not on the course boards, handicaps
  or "my golf" (developer, 2026-10-21).
- The move clock is the waiting player's call: nothing stops a player from
  claiming against a friend whose phone died. They see whether the other
  player's game is open ("offline") before they claim.
- Course versions: a course rebuilt between the two players' loads is
  flagged ("you should both reload"), not prevented.
