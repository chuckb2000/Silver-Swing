# Oswego Lake Country Club

Course id: `oswego_lake` (data folder `data/oswego_lake/`). This file holds the course's facts, scorecard, default tee, open items and build history; it was CLAUDE.md section 11. until 2026-10-20 (one file per course, so course builds never edit a shared file). The developer's calls made during the build are in DECISIONS.md under the course's name.

## Facts, scorecard and open items

### Facts

-   **Location:** Lake Oswego, Clackamas County, Oregon

-   **Original design:** H. Chandler Egan, 1924. Later work by John
    Harbottle III and by Bill and John F. Robinson (1992).

-   **Par:** 71

-   **UTM zone:** 10N (EPSG:32610)

-   **Elevation data:** DOGAMI lidar covers the Portland metro area. Use
    its bare-earth DEM and highest-hit DSM.

-   **Terrain:** expect hilly terrain and dense conifers. The tree
    pipeline (5.4) matters here.

### Scorecard

Source: GolfPass, retrieved 2026-10-18. **Must be verified against the
club\'s official card** (see 11.4).

  --------------------------------------------------------------------------------------------
  **Hole**    **Par**   **HCP (GolfPass)**     **Black**   **Blue**    **White**   **Red**
  ----------- --------- ---------------------- ----------- ----------- ----------- -----------
  1           5         5                      539         533         488         461

  2           4         3                      419         408         351         332

  3           3         13                     183         166         137         107

  4           4         11                     363         354         312         305

  5           5         9                      482         471         455         412

  6           4         1                      436         419         408         402

  7           4         7                      347         338         324         259

  8           3         15                     200         180         166         159

  9           4         17                     399         382         368         331

  **Out**     **36**                           **3,368**   **3,251**   **3,009**   **2,768**

  10          5         16                     447         440         430         379

  11          3         10                     199         190         177         154

  12          4         2                      426         399         390         382

  13          4         8                      381         342         326         276

  14          3         18                     150         137         125         100

  15          4         4                      442         425         410         345

  16          4         14                     417         401         380         337

  17          3         6                      191         175         165         155

  18          5         12                     536         519         498         452

  **In**      **35**                           **3,189**   **3,028**   **2,901**   **2,580**

  **Total**   **71**                           **6,557**   **6,279**   **5,910**   **5,348**
  --------------------------------------------------------------------------------------------

-   **Ratings/slopes (GolfPass):** Black 72.9/134, Blue 71.4/133, White
    69.4/131, Red (women) 72.2/128.

-   **Combo tees** listed by GolfPass: Black/Blue 6,394; Blue/White
    6,036; White/Red 5,598. Build these only if the developer wants
    them.

### Default tee

Blue (6,279 yd) suits the club distances in 7.1.

### Known open items

1.  **Handicap order conflict.** A second source (golfingrecord.com)
    gives a different stroke-index order (e.g. hole 5 = 1, hole 6 = 9)
    and Blue rating/slope 70.4/132. Confirm against the official card.

2.  **Red tee par.** GolfPass lists 73 for the women\'s tees in one
    table and 71 in another. Confirm.

3.  **OSM coverage** for this course is unknown until step 5.3.3 runs.

4.  **Water.** Confirm whether any holes play along Oswego Lake or have
    ponds or creeks, and whether each is red or yellow.
