# Hand-off: Kwiniaska Golf Club (`kwiniaska`), 2026-10-31

The first chat built most of this course overnight, then ran out of time. Read this file, then `git log`, `data/kwiniaska/validation_report.md`, `report_notes.md`, `course_config.json` and `edits.json`. Don't redo work that is already finished.

## Done
- **Data in `raw/`:** the OSM export, the VT_Statewide_A23 1 m DEM and two lidar tiles (N2107E4445 and N2093E4445; A23 tile names are tile centres in VT State Plane metres, 1.4 km tiles). The files come from the release `data-kwiniaska` through `make fetch` / `remote_fetch.py pull`.
- **Card:** the current par-70 card. Black 5,810 (68.1/120) and Gold 5,235 (65.1/113) are built; default Gold (no Blue on the card). The old par-72 Blue 6,848 card is the pre-2020 Caldwell layout and is not built. The sources are written up in the validation report.
- **Built:** the new theme `kwiniaska`, a Holstein logo (review images were in the first chat's sandbox), the course card and title view, and a draft `checks.json`. Wind is 2-10 mph.
- **Pending the developer:** the Munroe Brook penalty area is marked pending approval.

## Left to do
- **Black is short on most holes:** 1 -8.4 %, 2 -8.7 %, 3 -9.1 %, 4 -11.7 %, 6 -8.7 %, 9 -11.9 %, 14 -9.2 %, and others. Black seems to be measured from Gold or shared boxes. Look for unmapped back tee pads (`propose_tees.py --wide`, lidar) or tag the right boxes. Make the call and log it.
- **The rest:** the hand-off checklist below. Not done yet: the course test, the in-game look, the course file, the pin, `npm test`/e2e and the PR.

## Rules for tonight's overnight build (the developer's calls, 2026-10-30)

- **Tee sets: build two**, the furthest-back tees and Blue. If the card has no Blue, build the back set and the set just forward of it. Both `playable: true`. Default tee: Blue, or the second set when there is no Blue. Other sets stay in `scorecard.csv` and are not built.
- **Stop-and-ask items (COURSE_BUILD.md 10): make the call yourself and log it.** Put the facts, the options and your choice in `validation_report.md` (open items) and in `docs/courses/kwiniaska.md` under "Developer's calls pending". This covers > 8 % holes (accept with a `checks.json` yardage entry and a reason), OSM and card disagreements, and conflicting sources.
- **Logo and theme:** the developer gave full permission. The logo must be original, never the club's own. A new theme is named after the course id. Never change an existing theme, `trees.py`, `shrubs.py` or `logos.py`. Build only your own theme (`build_assets.py --theme <theme>`).
- **Data:** GitHub Actions first (COURSE_BUILD.md 5.0, `pipeline/remote_fetch.py`), including `url` items for public pages and files the sandbox can't reach. Don't route around a WebFetch policy refusal, and never fetch Google or Bing imagery yourself. Proposals from lidar or NAIP may go into `edits.json`, tagged and logged as pending the developer's approval.
- **Base branch:** this branch is based on `origin/design/fetch-actions` (the fetch workflow, not yet merged). The PR diff includes those files until it merges; say so in the PR.

## Known issues (from the courses already handed off: Aberdeen #98, Burlington CC #101, Needham #96)

- The installed Playwright expects Chromium build 1194, but the sandbox has 1243. Run `npm run e2e` with a throwaway config that sets `executablePath` to the installed browser, and don't commit it.
- `npm test`: `player.test.ts` "kwiniaska is in the daily rotation" and `tour.test.ts` "a hole drawn sits out the next rounds of its par" fail for any course not yet in the daily rotation. `make land` clears both; say so in the PR.
- The step cache can skip s05 when lidar arrives. Force it with `ARGS="--from s05_trees"`.
- USGS lidar downloads: rockyweb sometimes returns 429 or times out. The TNM S3 mirror worked for Marovitz, but Pasatiempo got a 404 there. `pipeline/remote_fetch.py` on `course/burlington_cc` (commit df6e2a03) removes duplicate TNM listings (Vermont lists every tile 27 times). Cherry-pick it if a listing repeats.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Open the PR with `gh api repos/chuckb2000/Silver-Swing/pulls --input pr.json`, and don't merge it.

## Hand-off checklist (COURSE_BUILD.md 9 and 11)

1. Yardage triage and `checks.json`, then run `course_play.test.ts -t kwiniaska`.
2. Look at every hole in the game: the tee shot of every hole and a sample of greens.
3. Course card and title view (`course_cards.py`).
4. Write `docs/courses/kwiniaska.md` and the numbered open items in `validation_report.md`.
5. Pin, then a fresh rebuild must leave `git status` clean.
6. Run `npm test` and `npm run e2e`.
7. Push and open the PR.
8. Final message to the developer: the numbered action items, each with a recommendation.
