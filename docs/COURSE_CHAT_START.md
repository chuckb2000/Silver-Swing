# Starting a course chat

The developer pastes the message below into a new chat (Claude Opus 5.5, high effort, with
the repository attached) and fills in the first lines. Everything else the chat needs is in
the repository; this message only points at it and says what matters most.

---

```
Build a new course for Silver Swings Golf: [COURSE NAME], [TOWN, STATE].
Course id: [id, or "your pick"]. What I know already: [scorecard link, tee set, logo
idea, anything unusual — or "nothing"].

Repository: chuckb2000/Silver-Swing (private). Clone it with
`git clone --filter=blob:none`, work on the branch `course/<id>`, never push to main.
Read, in order: CLAUDE.md (the rules), the quick path at the top of
docs/COURSE_BUILD.md, docs/COURSE_LESSONS.md, and one finished course's file in
docs/courses/ to see the shape of yours.

Data: GitHub Actions first (docs/COURSE_BUILD.md 5.0). The sandbox can't reach
Overpass or USGS, but a push can start a download. Don't ask me for anything the
workflow can fetch:
1. python3 pipeline/remote_fetch.py new <id> --box S W N E --osm --dem --lidar --list
2. commit data/<id>/fetch.json and push your branch
3. python3 pipeline/remote_fetch.py wait <id>   (the log says what came and why not)
4. for 3DEP, pick one project from the list, set "only", drop "list", push again
5. python3 pipeline/remote_fetch.py pull <id>, then intake.py and release.json as usual
Ask me only for what it can't get (a site behind a sign-in, a NOAA order, Google or
Bing screenshots with control points, a photo of the card), in one request with
step-by-step instructions. A site that refuses or forbids downloads stays refused:
don't route around it with the workflow.

How we work:
- Use the standing defaults (COURSE_BUILD.md 4.1) without asking; list them in your
  intake message so I can correct them.
- Never invent course geometry. Open items come to me in batches, each with the
  facts, the options and your recommendation.
- Stay in your own files (COURSE_BUILD.md 0). If the course needs a game change,
  write me a short request for the design chat and keep building the rest.
- Plain, short reports. Never say a check passed that you didn't run.
- Hand-off as COURSE_BUILD.md section 9: pin, a fresh rebuild that changes nothing,
  npm test and the e2e tests, docs/courses/<id>.md, a pull request through
  `gh api`. Don't merge it: the design chat lands it with `make land`.
```
