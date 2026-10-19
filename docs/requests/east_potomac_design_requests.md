# Requests to the design chat from the East Potomac course build (2026-10-19)

None of these block play; East Potomac works with the game as it is. Each
lists what is needed, why, and the smallest change that would do it.

## 1. Pick the place, then the course (Blue / White / Red)

**Need:** the developer wants choosing East Potomac to be followed by choosing
which of its three courses to play.

**Now:** the three are separate entries in `courses/index.json`
(`east_potomac_blue`, `_white`, `_red`), so the new-round screen and the state
course cards list them one after another. Each entry carries
`group: "east_potomac"`, `groupName: "East Potomac Golf Links"` and
`layout: "Blue" | "White" | "Red"`.

**Smallest change:** in the course picker, show entries that share a `group`
once (as `groupName`), and add a "course" row (`layout` buttons) under it that
switches between the group's ids with the existing `useCourse`. Leaderboards
and saves stay per id. The three ids share their terrain files through
`../east_potomac/` paths in `course.json`, so switching between them reloads
little.

## 2. A tree kind for flowering trees (`trees.json` `c: 2`)

**Need:** cherry blossoms around the island are the course's signature.

**Now (works, but indirect):** the game picks sprite variant `i % 3`; the
pipeline orders `trees.json` so cherries sit at `i % 3 == 2`, and the potomac
sheet draws deciduous variant 2 as a cherry. `trees.json` also marks cherries
`c: 2` (the game treats anything but 1 as deciduous).

**Smallest change:** in `Obstacles.fromArrays` keep `kind = c[i]`, and in
`CourseView` use key prefix `b_` when `kind === 2` and the sheet has `b_`
frames (falling back to `d_`). The pipeline would then add `b_*` frames to
`trees_potomac` and stop reordering the trees.

## 3. Tee choice on the new-round screen

The Blue course has Blue (6,599 yd) and White (6,226 yd) tees in
`course.json`; the setup screen always plays `defaultTee` (Blue, the
developer's choice for the Blue course). A tee row like the round-length row
would expose the White tees.

## 4. Unrated tees

The Red course (par-3) has no rating; `course.json` carries `rating: 0,
slope: 0` and the setup screen prints "0 / 0". Showing "not rated" when the
rating is 0 would read better.

## 5. Logo for grouped courses

`sprites/logos/east_potomac.png` exists (the domed memorial), but the course
cards look up `sprites/logos/<id>.png` and the three ids are
`east_potomac_blue/_white/_red`, so the cards show the lettered "ep" badge.
Smallest change: in `CourseSelectScene`, fall back to
`sprites/logos/<group>.png` when the entry has a `group` (or have
`logos.py` write the three ids too).
