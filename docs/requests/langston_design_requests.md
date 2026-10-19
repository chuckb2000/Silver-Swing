# Requests to the design chat from the Langston course build (2026-10-19)

None of these block play; Langston works with the game as it is. Each lists
what is needed, why, and the smallest change that would do it.

## 1. A boundary in several parts (optional, later)

**Now:** `course.json` `boundary` is one polygon. Langston's OSM boundary is
two polygons (the mainland and Kingman Island); the pipeline joins them
across Kingman Lake (`join_boundary`), and the lake between them is a red
penalty area, which is what the developer wants for Langston.

**Only if a future course needs two parts with out-of-bounds between them:**
let `boundary` also be a list of polygons (`number[][][]`), inside = inside
any of them, in `src/data/course.ts` and the three `boundary.contains` calls in
`round.ts` / `relief.ts`. Not needed now.

## 2. Many trees

Langston has 12,929 lidar trees (Oswego Lake 7,547, East Potomac 4,177),
most of them in the National Arboretum woods north of the course. The
Playwright run on the test machine (software WebGL) gave about 8 frames a
second on Langston (not compared with the other courses). If a real device feels slow on
Langston, the smallest change is to skip tree sprites more than ~150 m
outside the course boundary, or cap the off-course trees in the pipeline
(a course chat change; say which you prefer).
