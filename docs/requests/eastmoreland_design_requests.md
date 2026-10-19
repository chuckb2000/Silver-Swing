# Requests to the design chat from the Eastmoreland course build (2026-10-19)

**Status:** request 1 done by the design chat (merged to main 2026-10-19); the course exports the garden bushes as `c: 3` and the flat paint is gone.

None of these block play; Eastmoreland works with the game as it is.

## 1. A flowering-shrub sprite (rhododendrons), `trees.json` `c: 3`

**Need:** the developer wants the Crystal Springs Rhododendron Garden, beside
holes 11-13 and 17, to look pretty and in flower.

**Now (works):** the pipeline paints the bushes flat into the terrain art
(`pipeline/garden.py`, config `garden`): rounded clumps in seven bloom colours
(magenta, pink, pale pink, purple, white, red, coral) with a dark outline and a
short shadow. They are out of bounds, so nothing collides with them. Flat
paint can't stand up in 3/4 view the way the trees do, and the trees drawn on
top hide part of them.

**Smallest change:** a sheet `sprites/shrubs.png/json` with frames
`s_<w>_<h>_<variant>` (a low, wide bush, 1-3 m tall, flowers dotted over a
dark-green leaf mass, lit from the upper left like the trees; variant = bloom
colour, at least pink, magenta, purple, white, red), loaded only when a course's
`trees.json` has `c: 3`, and drawn by `CourseView` like a deciduous tree with
the `s_` key. Physics can treat `c: 3` as a deciduous tree (they are outside the
boundary here). The pipeline would then export the garden bushes as `c: 3`
entries and stop painting them flat; putting views (s09b) would draw the same
painter from `assets-src`.
