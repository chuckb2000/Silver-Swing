# Waverley Country Club — requests to the design chat (2026-10-19)

None. Waverley uses only what the game already supports:

- surfaces, penalty areas (red only) and out of bounds as on every course;
- the new `pnw_club` theme, whose tree sheet (`sprites/trees_pnw_club.*`) is
  built by `make assets` and loaded through the existing per-theme path
  (`registry.ts`); it draws the same trees as `pnw`;
- the steeper 11th green is an ordinary analytic green model (a larger
  `gx`/`gy` in `course.json`, no undulations), read by the existing terrain
  code.

If the developer later wants Black or White tees built, the tee choice on the
new-round screen already handles several sets; nothing new is needed.
