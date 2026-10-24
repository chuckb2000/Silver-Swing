# Pumpkin Ridge — scorecard sources (read 2026-10-24)

Two courses, two cards. `scorecard.csv` is a copy of
`scorecard_witch_hollow.csv` (the course recommended first);
`scorecard_ghost_creek.csv` is the second layout's card. Both are GolfPass's
cards transcribed as shown (tee columns lowercase, "Blue+" as `blue_plus`
and so on); the handicap column is the men's stroke index. The official site
(pumpkinridge.com) and BlueGolf could not be read (search budget gone;
BlueGolf refuses the sandbox). Nothing was averaged.

## Witch Hollow (private) — `scorecard_witch_hollow.csv`

Used: GolfPass, course 14617,
https://www.golfpass.com/courses/14617-pumpkin-ridge-golf-club-witch-hollow-course/scorecard-and-layout

- Par 4-3-4-5-3-4-5-4-4 (36), 3-5-3-4-5-3-4-4-5 (36) = 72.
- Stroke index, men: 9 17 3 15 13 1 5 11 7 / 16 6 18 2 12 14 10 8 4; women:
  9 17 1 13 15 5 3 11 7 / 16 6 18 2 12 14 8 10 4. Both use 1-18 once.
- Rows, all adding up to the printed Out / In / Total; ratings from the
  same page's tee table:

| Tee (csv column) | Out | In | Total | Men | Women |
|---|---|---|---|---|---|
| Black (`black`) | 3645 | 3370 | 7015 | 74.9 / 142 | — |
| Blue+ (`blue_plus`) | 3456 | 3305 | 6761 | 73.7 / 141 | — |
| **Blue (`blue`)** — default | 3362 | 3144 | **6506** | **72.4 / 140** | 78.8 / 148 |
| White+ (`white_plus`) | 3206 | 3042 | 6248 | 71.3 / 139 | 77.5 / 145 |
| White (`white`) | 3087 | 2913 | 6000 | 69.9 / 132 | 76.0 / 142 |
| Red+ (`red_plus`) | 2888 | 2604 | 5492 | 67.7 / 128 | 73.3 / 136 |
| Red (`red`) | 2762 | 2508 | 5270 | 66.7 / 125 | 71.7 / 131 |

- The tee table prints White Plus as 6,272; its row adds to 6,248 (kept as
  the row).
- Agreeing: GolfPass membership page
  (https://membership.golfpass.com/courses/-3049-witch-hollow-course-details,
  same tee table); wiscogolfaddict.com (2015) Black 7,015 74.9/142, Blue
  6,506 72.4/140, White 6,000 69.9/132, Red 5,270 66.7/125.
- Differing slightly: the same blog's hole list (tips 401 171 414 533 211 453
  623 382 467 / 212 553 143 410 470 175 432 422 545 = 7,017; holes 2, 6, 12
  differ from Black), Wikipedia and foretee.com (7,017, 75.1 / 143 or 144):
  an older Black.
- Tour set-up: ESPN's card for the 2020 WinCo Foods Portland Open
  (https://africa.espn.com/golf/player/scorecards/_/id/4010/tournamentId/401180578):
  par 71 (the 14th a par 4), 7,109 yd. Not used (the game plays the members'
  card).

**Default tee: Blue, 6,506 yd, 72.4 / 140.**

## Ghost Creek (public) — `scorecard_ghost_creek.csv`

Used: GolfPass, course 14616,
https://www.golfpass.com/courses/14616-pumpkin-ridge-golf-club-ghost-creek-course/scorecard-and-layout

- Par 4-4-3-5-3-4-4-5-4 (36), 5-3-4-4-3-5-3-4-4 (35) = 71.
- Stroke index, men: 11 5 13 7 15 9 1 17 3 / 16 14 2 8 10 6 18 12 4; women:
  7 5 17 11 15 1 9 13 3 / 6 14 2 10 16 8 18 12 4.
- Rows, all adding up:

| Tee (csv column) | Out | In | Total | Men | Women |
|---|---|---|---|---|---|
| Black (`black`) | 3635 | 3199 | 6834 | 74.5 / 146 | — |
| Blue+ (`blue_plus`) | 3431 | 3092 | 6523 | 73.2 / 141 | — |
| **Blue (`blue`)** — default | 3339 | 3018 | **6357** | **72.0 / 139** | — |
| White+ (`white_plus`) | 3209 | 2928 | 6137 | 71.0 / 136 | — |
| White (`white`) | 3119 | 2763 | 5882 | 69.6 / 136 | 75.5 / 138 |
| Red+ (`red_plus`) | 2839 | 2570 | 5409 | 67.4 / 133 | 72.3 / 134 |
| Red (`red`) | 2706 | 2405 | 5111 | 66.0 / 128 | 71.0 / 132 |

- The tee table prints Blue Plus as 6,599 and White Plus as 6,132; the rows
  add to 6,523 and 6,137 (kept as the rows).
- Agreeing: hole19golf.com
  (https://www.hole19golf.com/courses/pumpkin-ridge-golf-club-ghost-creek)
  lists the Blue+ tee in metres with the same stroke index; converted, every
  hole matches GolfPass (hole 5: 176 m = 192.5 yd vs 193).

**Default tee: Blue, 6,357 yd, 72.0 / 139.**

### Conflict: an older Ghost Creek card (not used)
greenskeeper.org
(https://greenskeeper.org/oregon/portland_vancouver/pumpkin_ridge_golf_club_ghost_creek/scorecard.cfm)
and golfcoursegurus.com: Black 6,839 74.0/145, Blue 6,451 72.0/138, White
5,956 69.2/131, Red (ladies) 5,111 70.7/128; rows add up (Out/In 3640/3199,
3441/3010, 3193/2763, 2706/2405). Blue per hole 392 391 158 515 205 366 409
562 443 / 474 170 406 356 219 531 125 301 428. Stroke index 9 11 17 1 13 15 7
5 3 / 6 16 8 10 14 2 18 12 4 (differs from GolfPass on most holes). Wikipedia
(6,839, 73.8/139) is the same era. Recommendation: GolfPass's newer card.

## Missing
- The club's own cards (pumpkinridge.com) and BlueGolf's detailed cards, to
  confirm the GolfPass versions: see DATA_REQUEST.md step 5 (optional).
