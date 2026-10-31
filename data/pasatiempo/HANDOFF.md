# Hand-off: Pasatiempo Golf Club (`pasatiempo`), 2026-10-31

The first chat started this course overnight, then ran out of time. Read this file, then `git log`, `data/pasatiempo/validation_report.md`, `course_config.json` and `edits.json`. The scouting notes are on `origin/scouting/new-courses` under `docs/scouting/pasatiempo/`. Don't redo work that is already finished.

## Done
- **Data:** the OSM export, the USGS 1 m DEM (Santa Cruz 2020), NAIP, the club card and the power lines were fetched. The lidar tiles were being fetched again from rockyweb (the S3 path gave 404). Run `python3 pipeline/remote_fetch.py wait pasatiempo` first.
- **Built without lidar:** `course_config.json` has no `laz` yet.
- **Card:** the club's gentlemen's card. Gold 6,495 (72.7/143) and White 6,093 (70.7/138) are built; default White, since there is no Blue (back set plus the next one forward).
- **Built:** the new theme `pasatiempo`, a logo (a footbridge over a barranca), the tee-14 script `data/pasatiempo/make_tee14.py`, `clip_channels.py` and a draft `checks.json`.
- **Shared pipeline change:** `pipeline/propose_tees.py` has a 2-line change. Check it, keep it small, and list it in the PR.

## Left to do
1. **Lidar:** intake, `laz` in the config, rebuild with `--from s05_trees`. Trees were removed in 2023-24, so consider `trees_need_ortho` against recent NAIP and check what it drops. Power lines cross 6 and 17 (`remove_wires`).
2. **Hole 18 White is +22 %** (177 against 145). The White tee on 18 is probably unmapped. Find it or accept it, and log the call. The other fails are fixed by tee moves.
3. **The rest:** the hand-off checklist below, plus the course card and title view.

## Rules for tonight's overnight build (the developer's calls, 2026-10-30)

- **Tee sets: build two**, the furthest-back tees and Blue. If the card has no Blue, build the back set and the set just forward of it. Both `playable: true`. Default tee: Blue, or the second set when there is no Blue. Other sets stay in `scorecard.csv` and are not built.
- **Stop-and-ask items (COURSE_BUILD.md 10): make the call yourself and log it.** Put the facts, the options and your choice in `validation_report.md` (open items) and in `docs/courses/pasatiempo.md` under "Developer's calls pending". This covers > 8 % holes (accept with a `checks.json` yardage entry and a reason), OSM and card disagreements, and conflicting sources.
- **Logo and theme:** the developer gave full permission. The logo must be original, never the club's own. A new theme is named after the course id. Never change an existing theme, `trees.py`, `shrubs.py` or `logos.py`. Build only your own theme (`build_assets.py --theme <theme>`).
- **Data:** GitHub Actions first (COURSE_BUILD.md 5.0, `pipeline/remote_fetch.py`), including `url` items for public pages and files the sandbox can't reach. Don't route around a WebFetch policy refusal, and never fetch Google or Bing imagery yourself. Proposals from lidar or NAIP may go into `edits.json`, tagged and logged as pending the developer's approval.
- **Base branch:** this branch is based on `origin/design/fetch-actions` (the fetch workflow, not yet merged). The PR diff includes those files until it merges; say so in the PR.

## Known issues (from the courses already handed off: Aberdeen #98, Burlington CC #101, Needham #96)

- The installed Playwright expects Chromium build 1194, but the sandbox has 1243. Run `npm run e2e` with a throwaway config that sets `executablePath` to the installed browser, and don't commit it.
- `npm test`: `player.test.ts` "pasatiempo is in the daily rotation" and `tour.test.ts` "a hole drawn sits out the next rounds of its par" fail for any course not yet in the daily rotation. `make land` clears both; say so in the PR.
- The step cache can skip s05 when lidar arrives. Force it with `ARGS="--from s05_trees"`.
- USGS lidar downloads: rockyweb sometimes returns 429 or times out. The TNM S3 mirror worked for Marovitz, but Pasatiempo got a 404 there. `pipeline/remote_fetch.py` on `course/burlington_cc` (commit df6e2a03) removes duplicate TNM listings (Vermont lists every tile 27 times). Cherry-pick it if a listing repeats.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Open the PR with `gh api repos/chuckb2000/Silver-Swing/pulls --input pr.json`, and don't merge it.

## Hand-off checklist (COURSE_BUILD.md 9 and 11)

1. Yardage triage and `checks.json`, then run `course_play.test.ts -t pasatiempo`.
2. Look at every hole in the game: the tee shot of every hole and a sample of greens.
3. Course card and title view (`course_cards.py`).
4. Write `docs/courses/pasatiempo.md` and the numbered open items in `validation_report.md`.
5. Pin, then a fresh rebuild must leave `git status` clean.
6. Run `npm test` and `npm run e2e`.
7. Push and open the PR.
8. Final message to the developer: the numbered action items, each with a recommendation.
