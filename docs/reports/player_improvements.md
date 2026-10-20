# Player improvements (2026-10-20)

This list looks at the game as a friend who opens the link for the first time, and then as one who comes back a week later. It is ordered by how much each change does for those two players against what it costs. Effort assumes the current code.

## Priority list

| # | Improvement | Why it matters to a player | Effort |
|---|---|---|---|
| 1 | Swing coach on the first shots | Nothing in the game explains the three taps, the green line, or that putts work differently. A new player's first drive is usually a shank. | 3-4 h |
| 2 | Share a scorecard picture | The game's social loop is friends comparing rounds; today that means a screenshot. | 2-3 h |
| 3 | Install to the home screen, with course files kept for next time | Phones download 3-10 MB per course on every visit. That is the slowest part of the game, and where the "it froze" reports came from. | 3-4 h |
| 4 | Daily round | One course a day with the same wind and pins for everyone, on its own board. It gives friends one score to beat each day, and a reason to come back. | 4-6 h |
| 5 | Practice range and practice green | Lets players learn the meter and putter speeds without spoiling a counted round (spec M6). | 1-1.5 days |
| 6 | Handicaps and net scores | Friends of different skill can compete. Most courses already carry a rating and slope. | 4-5 h |
| 7 | My stats and course passport | Shows progress over time (average, fairways, GIR, putts per course) and which courses are still to play. | 4-6 h |
| 8 | Friends' activity feed | "Sam shot 78 at Langston, 2 h ago" next to the recent eagles. The data is already on the server. | 2-3 h |
| 9 | Replay a shot | The physics is deterministic, so any shot can be played back exactly. Good for a hole-in-one or a lip-out. | 2-3 h |
| 10 | Pass-and-play for 2-4 players | Plays as a group on one device (spec 10.2). | 1.5-2 days |
| 11 | Milestones | First birdie, first eagle, break 90/80/70 on a course, every course played. | 3-4 h |
| 12 | Feel and comfort | Haptic tap on Android, quiet ambience, a "faster flights" option, a larger-text option, reduced motion. | 3-5 h |

Items 1-3 are what I would do before more people are invited. Item 4 is the best value after that.

**Status (2026-10-20):** items 2, 3, 4, 5, 7, 8, 9 and 11 approved and built on branch `design/player` (DECISIONS.md "Player improvements").

**Item 1 is already written**, on branch `design/coach`, which is built on `design/bugfixes`. It is not merged. It has unit tests in `tests/unit/coach.test.ts`.

## Plans

### 1. Swing coach on the first shots

**What the player sees.** The `showTips` setting already exists but nothing uses it. While it is on:

- **First tee shot:** a short card above the meter says "tap to start the swing". After the first tap, an arrow points along the bar with "tap again to set the power". After the second, it says "tap when the cursor reaches the green line".
- **First putt:** "putts take two taps: start, then power - aim with the line, read the slope arrows".
- **First time in each lie** (rough, bunker, trees): one line explaining the lie, e.g. "rough: -15 %, driver not allowed".
- After three good swings, or when the player turns tips off, the coach stays quiet.

**How.**

1. Add `HudScene.coach(key, text, anchor)`: a small hatched panel with an arrow. Each key is shown once, and the keys shown are kept in `settings.tipsSeen: string[]`.
2. Call it from `PlayScene.beginShot` (first shot, first putt, new lie) and from the meter phase changes in `tap()`.
3. Put the "tips" toggle on the settings screen.
4. Offer an optional slow first swing: the first full swing of a player's first round runs the meter at 1.5× its trip time. Its strike counts normally.
5. Add a Playwright test that starts a round with no `tipsSeen`, checks that the coach texts appear in order, and checks that a second round shows none.

### 2. Share a scorecard picture

**What the player sees.** A "share" button on the round summary and on any leaderboard row. It makes a 1080×1350 PNG with:

- course name and logo;
- date, tees and difficulty;
- the scorecard with birdie circles and bogey squares;
- gross and to-par;
- the friends-board rank, if known.

On phones it opens the share sheet (`navigator.share({ files })`). On desktop it downloads the PNG or copies it to the clipboard.

**How.**

1. Render with an offscreen Phaser `RenderTexture`, or a plain 2D canvas using the bitmap font PNG, at 4× texel scale so it stays pixel-crisp.
2. Reuse `scorecard()` from HudScene in a hidden scene.
3. Fall back to download when `navigator.canShare` is false.

**Test:** a unit test of the layout data (rows and symbols); an e2e test that the button produces a PNG blob over 10 KB.

### 3. Install to the home screen, with course files kept

**What the player sees.** "Add to Home Screen" gives an app icon that opens full-screen. A course played once opens in about a second next time, even offline (scores are sent when back online, which already works).

**How.**

1. Add `public/manifest.webmanifest`: name "Silver Swings Golf", the trophy logo as a 192/512 icon (generated by `assets-src`), `display: fullscreen`, landscape preferred.
2. Add a small service worker (`public/sw.js`, no library):
   - **App files:** cache first, versioned by the build hash that Vite writes into `index.html`.
   - **`courses/<id>/*`:** cache on first fetch, kept until the course's `course.json` changes. The pipeline writes a `version` (hash of the outputs) into `index.json`; the worker drops a course's cache when its version changes.
   - **`/api/*`:** network only.
3. Register it in `main.ts` only on the hosted site (not in dev or the claude.ai artifact).
4. Settings: "free up space" clears the cached courses.

**Risk:** a stale app after a deploy. Mitigation: the worker activates a new version on the next page load, and the title screen shows "updated - tap to reload" when a new worker is waiting.

**Test:** Playwright with `serviceWorkers: 'allow'`: load a course, go offline, reload, load the same course.

### 4. Daily round

**What the player sees.** A "daily round" button on the title screen gives today's course (rotating through the list), 9 holes, Normal difficulty and fixed tees. Wind and pins come from a seed made from the date, so they are the same for everyone. One attempt counts per player per day; replays are practice. The result goes on a "today" board and a weekly board (best 5 of 7).

**How.**

1. **Client:** `dailyConfig(date)` in `flow.ts` builds the `RoundConfig` with `seed = hash(date)` and `daily: date`. It uses the existing pin sheet and wind code; both are seeded already.
2. **Server:**
   - a `daily` column on `rounds`;
   - `GET /api/scores?daily=YYYY-MM-DD`;
   - the server accepts one daily round per owner per date, the first one received.
3. **Leaderboard:** a "daily" tab with today and this week.
4. **Courses:** the rotation skips 9-hole courses on 18-hole weeks, or always plays 9 holes. The developer picks.

**Test:** `dailyConfig` gives the same seed and pins on two runs; the server refuses a second daily round from the same key.

### 5. Practice range and practice green

**What the player sees.** "Practice" on the title screen opens:

- **The range:** a flat synthetic world (the M1 test-hole code) with target flags at 50-250 yd. Any club, endless balls, and the carry, total and miss direction for each shot. A wind switch.
- **The putting green:** a synthetic green with slope settings (flat, 1 %, 2 %, two-tier) and three cups at 5, 15 and 30 ft. It counts holed putts out of 10.

**How.**

1. Build the range and green from `flatTerrain` and the existing physics, in a `PracticeScene` that reuses the HUD meter and the green-view drawing.
2. Nothing is saved, apart from optional session stats (average carry per club).
3. Later, build a real course's own range and practice green from OSM (Oregon Golf Club and Franklin have mapped ranges).

**Test:** an e2e test that hits 3 balls and holes one putt.

### 6. Handicaps and net scores

**What the player sees.** A game handicap appears next to each name after 3 counted rounds, and the leaderboard gets a "net" toggle. The handicap is labelled "game handicap", not an official one.

**How.**

1. Use a simplified World Handicap System: each round's differential is `(113 / slope) × (gross − rating)`. For 9-hole rounds, double the differential against half the rating, or use the 9-hole rating when the course has one.
2. The index is the average of the best 8 of the last 20 (fewer when there are fewer rounds, using the WHS table).
3. Compute it on the server from the `rounds` table per owner key, on request, and cache it in a `handicaps` table.
4. Courses without a rating (East Potomac Red, "not rated") don't count.
5. Show the index on the summary and the boards.

**Test:** unit tests for the differential and index against WHS worked examples.

### 7. My stats and course passport

**What the player sees.** A "my golf" screen from the title:

- rounds played;
- scoring average per course and tees;
- best round per course;
- fairways %, GIR %, putts per round, penalties per round;
- the last 10 rounds as a small sparkline;
- a passport grid of every course card, stamped once played, with the best score on the stamp.

**How.**

1. Build it from this device's `leaderboard` store, which already has per-hole scores.
2. With a player code, also merge that key's rounds from the server: `GET /api/scores?owner=` returns only that key's own rounds, and the key is private.
3. Reuse the course-card art for the stamps.

### 8. Friends' activity feed

**What the player sees.** A "recent" tab next to "recent eagles" lists the last 30 rounds on the shared board: player, course, score, how long ago. Personal bests and course records are marked.

**How.**

1. Add `GET /api/recent?limit=30` (`ORDER BY received DESC`). Use the same name filter as the boards. It takes one query.
2. Compute the "personal best" and "course record" badges on the server, with one indexed query per row or a window query.
3. Cache the result in memory for 30 s.

### 9. Replay a shot

**What the player sees.** A "replay" button on the hole-complete panel replays the last shot, or the holing shot, at normal speed and then in slow motion.

**How.**

1. Keep the last `PlannedShot` (plus the RNG fork seed) in the Round.
2. `simulate()` is deterministic, so the replay re-runs it and plays the samples back through the existing flight drawing.
3. No new physics.
4. Unit test: the replay's end point equals the original's.

### 10. Pass-and-play

**What the player sees.** 2-4 names at setup. Players take turns: the farthest from the hole plays, and a whole hole at a time is an option. A shared scorecard; each player's round goes on the boards under their name.

**How.**

1. Make `Round` per player, and add a `Match` holding the players and turn order.
2. The HUD shows whose turn it is. The camera jumps to that ball.
3. Snapshots save the match.
4. Most work is in PlayScene's assumption of one ball.

This is the largest item; do it after 1-8.

### 11. Milestones

**What the player sees.** Small banners: "first birdie at Langston", "broke 80 at Franklin", "every Oregon course played". A list appears on "my golf".

**How.** Compute milestones from the round entries after each round (pure functions with unit tests), store them in a `milestones` setting, and show them on the summary.

### 12. Feel and comfort

- **Haptics:** `navigator.vibrate(10)` on each swing tap (Android).
- **Ambience:** the spec's quiet wind-and-birds loop, generated with ZzFX, under master volume.
- **Faster flights:** a setting for 1.3× (now) or 2× flight playback.
- **Larger text:** a setting with a 1.25× UI scale for phones (the scale code already supports it).
- **Reduced motion:** honour `prefers-reduced-motion` and shorten camera moves.

Each is small, about 30-60 min.

## Suggested order

1. Swing coach.
2. Install with course caching.
3. Share card. These three before inviting more friends.
4. Daily round.
5. Activity feed.
6. Handicaps.
7. Stats and passport.
8. Practice range and green.
9. The rest as wanted.
